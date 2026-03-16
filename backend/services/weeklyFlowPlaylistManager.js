import path from "path";
import fs from "fs/promises";
import { dbOps } from "../config/db-helpers.js";
import { NavidromeClient } from "./navidrome.js";
import { PlexClient } from "./plexClient.js";
import { flowPlaylistConfig } from "./weeklyFlowPlaylistConfig.js";
import { downloadTracker } from "./weeklyFlowDownloadTracker.js";

export class WeeklyFlowPlaylistManager {
  constructor(
    weeklyFlowRoot = process.env.WEEKLY_FLOW_FOLDER || "/app/downloads"
  ) {
    this.weeklyFlowRoot = path.isAbsolute(weeklyFlowRoot)
      ? weeklyFlowRoot
      : path.resolve(process.cwd(), weeklyFlowRoot);
    this.libraryRoot = path.join(this.weeklyFlowRoot, "aurral-weekly-flow");
    this.navidromeClient = null;
    this.plexClient = null;
    this.updateConfig();
  }

  updateConfig(triggerEnsurePlaylists = true) {
    const settings = dbOps.getSettings();
    const navidromeConfig = settings.integrations?.navidrome || {};

    if (
      navidromeConfig.url &&
      navidromeConfig.username &&
      navidromeConfig.password
    ) {
      this.navidromeClient = new NavidromeClient(
        navidromeConfig.url,
        navidromeConfig.username,
        navidromeConfig.password
      );
    } else {
      this.navidromeClient = null;
    }

    const plexConfig = settings.integrations?.plex || {};
    if (plexConfig.url && plexConfig.token) {
      this.plexClient = new PlexClient(
        plexConfig.url,
        plexConfig.token,
        plexConfig.musicSectionId || null,
        plexConfig.weeklyFlowSectionId || null,
      );
    } else {
      this.plexClient = null;
    }

    if (triggerEnsurePlaylists) {
      this.ensureSmartPlaylists().catch((err) =>
        console.warn(
          "[WeeklyFlowPlaylistManager] ensureSmartPlaylists on config:",
          err?.message
        )
      );
    }
  }

  _sanitize(str) {
    return String(str || "")
      .replace(/[<>:"/\\|?*]/g, "_")
      .trim();
  }

  _getWeeklyFlowLibraryHostPath() {
    const base = process.env.DOWNLOAD_FOLDER || "/data/downloads/tmp";
    return `${base.replace(/\\/g, "/").replace(/\/+$/, "")}/aurral-weekly-flow`;
  }

  async ensureSmartPlaylists() {
    const flows = flowPlaylistConfig.getFlows();
    let libraryId = null;
    let playlists = null;
    if (this.navidromeClient?.isConfigured()) {
      try {
        const hostPath = this._getWeeklyFlowLibraryHostPath();
        const library =
          await this.navidromeClient.ensureWeeklyFlowLibrary(hostPath);
        if (library != null && (library.id !== undefined && library.id !== null)) {
          libraryId = library.id;
        } else if (library != null) {
          console.warn(
            "[WeeklyFlowPlaylistManager] Aurral library has no id; smart playlists will not be scoped by library."
          );
        }
      } catch (err) {
        console.warn(
          "[WeeklyFlowPlaylistManager] ensureWeeklyFlowLibrary failed:",
          err?.message
        );
      }
      try {
        const raw = await this.navidromeClient.getPlaylists();
        playlists = Array.isArray(raw) ? raw : raw ? [raw] : [];
      } catch (err) {
        console.warn(
          "[WeeklyFlowPlaylistManager] getPlaylists failed:",
          err?.message
        );
      }
    }

    try {
      await fs.mkdir(this.libraryRoot, { recursive: true });
      const existingFiles = await fs.readdir(this.libraryRoot).catch(() => []);
      const expectedFiles = new Set();
      for (const flow of flows) {
        const playlistName = `Aurral ${flow.name}`;
        const fileName = `${this._sanitize(playlistName)}.nsp`;
        const nspPath = path.join(this.libraryRoot, fileName);
        expectedFiles.add(fileName);
        if (flow.enabled) {
          const pathCondition = { contains: { filepath: flow.id } };
          const all =
            libraryId != null
              ? [{ is: { library_id: libraryId } }, pathCondition]
              : [pathCondition];
          const payload = {
            all,
            sort: "random",
            limit: 1000,
          };
          await fs.writeFile(nspPath, JSON.stringify(payload), "utf8");
        } else {
          if (playlists?.length) {
            const existing = playlists.find((p) => p.name === playlistName);
            if (existing) {
              try {
                await this.navidromeClient.deletePlaylist(existing.id);
              } catch (err) {
                console.warn(
                  `[WeeklyFlowPlaylistManager] Failed to delete playlist "${playlistName}" from Navidrome:`,
                  err?.message
                );
              }
            }
          }
          try {
            await fs.unlink(nspPath);
          } catch { }
        }
      }
      const toRemove = existingFiles.filter(
        (file) => file.endsWith(".nsp") && !expectedFiles.has(file),
      );
      for (const file of toRemove) {
        try {
          await fs.unlink(path.join(this.libraryRoot, file));
        } catch { }
      }
    } catch (err) {
      console.warn(
        "[WeeklyFlowPlaylistManager] Failed to write smart playlists:",
        err?.message
      );
    }
  }

  async scanLibrary() {
    if (this.navidromeClient?.isConfigured()) {
      await this.navidromeClient.scanLibrary().catch((err) =>
        console.warn("[WeeklyFlowPlaylistManager] Navidrome scan failed:", err?.message)
      );
    }
    if (this.plexClient?.isConfigured()) {
      await this.plexClient.triggerLibraryScan().catch((err) =>
        console.warn("[WeeklyFlowPlaylistManager] Plex scan trigger failed:", err?.message)
      );
      // Delay Plex playlist sync to allow the library scan to index new tracks
      const PLEX_SYNC_DELAY_MS = 180000;
      setTimeout(() => {
        this.syncPlexPlaylists().catch((err) =>
          console.warn("[WeeklyFlowPlaylistManager] Plex playlist sync failed:", err?.message)
        );
      }, PLEX_SYNC_DELAY_MS);
    }
  }

  /**
   * Build or replace Plex playlists based on completed Weekly Flow download jobs.
   * For each enabled flow, searches the configured Plex music section for each
   * completed track and creates a playlist from the matched ratingKeys.
   */
  async syncPlexPlaylists() {
    if (!this.plexClient?.isConfigured()) return;
    const flows = flowPlaylistConfig.getFlows();
    console.log("[WeeklyFlowPlaylistManager] Syncing Plex playlists...");

    for (const flow of flows) {
      const playlistTitle = this.getPlaylistName(flow.id);
      if (!flow.enabled) {
        // Remove the playlist from Plex if flow is disabled
        try {
          const existing = await this.plexClient.findPlaylistByTitle(playlistTitle);
          if (existing) {
            await this.plexClient.deletePlaylist(existing.ratingKey);
            console.log(
              `[WeeklyFlowPlaylistManager] Deleted Plex playlist "${playlistTitle}" (flow disabled)`
            );
          }
        } catch (err) {
          console.warn(
            `[WeeklyFlowPlaylistManager] Could not delete Plex playlist "${playlistTitle}":`,
            err?.message
          );
        }
        continue;
      }

      const jobs = downloadTracker
        .getByPlaylistType(flow.id)
        .filter((j) => j.status === "done");

      if (jobs.length === 0) {
        console.log(
          `[WeeklyFlowPlaylistManager] No completed jobs for flow "${flow.id}", skipping Plex playlist.`
        );
        continue;
      }

      const ratingKeys = [];
      for (const job of jobs) {
        const ratingKey = await this.plexClient
          .searchTrack(job.trackName, job.artistName)
          .catch(() => null);
        if (ratingKey) {
          ratingKeys.push(ratingKey);
        } else {
          console.warn(
            `[WeeklyFlowPlaylistManager] Plex: no match for "${job.artistName} – ${job.trackName}"`
          );
        }
      }

      if (ratingKeys.length === 0) {
        console.log(
          `[WeeklyFlowPlaylistManager] No Plex matches for flow "${flow.id}" — playlist not created.`
        );
        continue;
      }

      try {
        await this.plexClient.replacePlaylist(playlistTitle, ratingKeys);
        console.log(
          `[WeeklyFlowPlaylistManager] Plex playlist "${playlistTitle}" synced with ${ratingKeys.length} tracks.`
        );
      } catch (err) {
        console.warn(
          `[WeeklyFlowPlaylistManager] Failed to sync Plex playlist "${playlistTitle}":`,
          err?.message
        );
      }
    }
  }

  async weeklyReset(playlistTypes = null) {
    const targets =
      playlistTypes && playlistTypes.length
        ? playlistTypes
        : flowPlaylistConfig.getFlows().map((flow) => flow.id);
    const fallbackDir = path.join(this.weeklyFlowRoot, "_fallback");
    try {
      await fs.rm(fallbackDir, { recursive: true, force: true });
    } catch { }

    // Clean up Plex playlists for the flows being reset
    if (this.plexClient?.isConfigured()) {
      for (const playlistType of targets) {
        const playlistTitle = this.getPlaylistName(playlistType);
        try {
          const existing = await this.plexClient.findPlaylistByTitle(playlistTitle);
          if (existing) {
            await this.plexClient.deletePlaylist(existing.ratingKey);
            console.log(
              `[WeeklyFlowPlaylistManager] Deleted Plex playlist "${playlistTitle}" on reset`
            );
          }
        } catch (err) {
          console.warn(
            `[WeeklyFlowPlaylistManager] Could not delete Plex playlist "${playlistTitle}" on reset:`,
            err?.message
          );
        }
      }
    }
    for (const playlistType of targets) {
      const jobs = downloadTracker.getByPlaylistType(playlistType);
      for (const job of jobs) {
        const stagingDir = path.join(this.weeklyFlowRoot, "_staging", job.id);
        try {
          await fs.rm(stagingDir, { recursive: true, force: true });
        } catch { }
      }
      const playlistDir = path.join(this.libraryRoot, playlistType);
      try {
        await fs.rm(playlistDir, { recursive: true, force: true });
        console.log(
          `[WeeklyFlowPlaylistManager] Deleted files for ${playlistType}`
        );
      } catch (error) {
        console.warn(
          `[WeeklyFlowPlaylistManager] Failed to delete files for ${playlistType}:`,
          error.message
        );
      }
      downloadTracker.clearByPlaylistType(playlistType);
    }
  }

  getPlaylistName(playlistType) {
    const flow = flowPlaylistConfig.getFlow(playlistType);
    if (flow) return `Aurral ${flow.name}`;
    return `Aurral ${playlistType}`;
  }
}

export const playlistManager = new WeeklyFlowPlaylistManager();
