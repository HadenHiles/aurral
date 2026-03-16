import axios from "axios";

export class PlexClient {
    constructor(url, token, musicSectionId, weeklyFlowSectionId) {
        this.url = url ? url.replace(/\/+$/, "") : null;
        this.token = token || null;
        this.musicSectionId = musicSectionId || null;
        this.weeklyFlowSectionId = weeklyFlowSectionId || null;
        this._machineIdentifierCache = null;
    }

    isConfigured() {
        return !!(this.url && this.token);
    }

    _headers() {
        return {
            "X-Plex-Token": this.token,
            Accept: "application/json",
        };
    }

    async _request(method, path, params = {}, data = null) {
        if (!this.isConfigured()) throw new Error("Plex not configured");
        const url = path.startsWith("http") ? path : `${this.url}${path}`;
        const response = await axios({
            method,
            url,
            headers: this._headers(),
            params,
            data: data || undefined,
            timeout: 15000,
        });
        return response.data;
    }

    async ping() {
        return this._request("GET", "/identity");
    }

    async getMachineIdentifier() {
        if (this._machineIdentifierCache) return this._machineIdentifierCache;
        const data = await this._request("GET", "/identity");
        const id = data?.MediaContainer?.machineIdentifier;
        if (!id) throw new Error("Could not get Plex machine identifier");
        this._machineIdentifierCache = id;
        return id;
    }

    /**
     * Search for a track by title (and optionally artist) within a library section.
     * Uses weeklyFlowSectionId by default (for playlist sync), falls back to musicSectionId.
     * Returns the ratingKey string if found, null otherwise.
     */
    async searchTrack(title, artist, sectionId = null) {
        const section = sectionId || this.weeklyFlowSectionId || this.musicSectionId;
        if (!this.isConfigured() || !section) return null;
        try {
            const data = await this._request(
                "GET",
                `/library/sections/${section}/search`,
                { type: 10, query: artist ? `${artist} ${title}` : title },
            );
            const tracks = data?.MediaContainer?.Metadata || [];
            if (tracks.length === 0) return null;

            // Prefer exact title + exact artist match
            const titleLower = title.toLowerCase();
            const artistLower = artist ? artist.toLowerCase() : null;

            const exact = tracks.find(
                (t) =>
                    t.title?.toLowerCase() === titleLower &&
                    (!artistLower ||
                        t.grandparentTitle?.toLowerCase() === artistLower ||
                        t.originalTitle?.toLowerCase() === artistLower),
            );
            if (exact) return exact.ratingKey;

            // Fallback: title match only
            const byTitle = tracks.find(
                (t) => t.title?.toLowerCase() === titleLower,
            );
            return byTitle?.ratingKey || null;
        } catch (err) {
            console.warn(
                `[PlexClient] searchTrack failed for "${title}" / "${artist}":`,
                err?.message,
            );
            return null;
        }
    }

    async getPlaylists() {
        const data = await this._request("GET", "/playlists", {
            playlistType: "audio",
        });
        return data?.MediaContainer?.Metadata || [];
    }

    async findPlaylistByTitle(title) {
        const playlists = await this.getPlaylists();
        return playlists.find((p) => p.title === title) || null;
    }

    /**
     * Create a new audio playlist from an array of ratingKey strings.
     * Requires the server's machineIdentifier, fetched automatically.
     * Creates the playlist with the first item, then adds the remaining items
     * one-by-one via PUT — the POST endpoint only reliably seeds a single item.
     */
    async createPlaylist(title, ratingKeys) {
        if (!ratingKeys || ratingKeys.length === 0) return null;
        const machineId = await this.getMachineIdentifier();
        const firstUri = `server://${machineId}/com.plexapp.plugins.library/library/metadata/${ratingKeys[0]}`;
        const data = await this._request("POST", "/playlists", {
            title,
            type: "audio",
            smart: 0,
            uri: firstUri,
        });
        const playlist = data?.MediaContainer?.Metadata?.[0] || null;
        if (!playlist) return null;

        // Add remaining tracks individually
        for (const key of ratingKeys.slice(1)) {
            const itemUri = `server://${machineId}/com.plexapp.plugins.library/library/metadata/${key}`;
            await this._request("PUT", `/playlists/${playlist.ratingKey}/items`, { uri: itemUri }).catch((err) =>
                console.warn(`[PlexClient] Failed to add item ${key} to playlist "${title}":`, err?.message)
            );
        }

        return playlist;
    }

    async deletePlaylist(ratingKey) {
        await this._request("DELETE", `/playlists/${ratingKey}`);
        return true;
    }

    /**
     * Create or replace a playlist with the given title and ratingKeys.
     * Deletes the existing playlist first if one with the same title is found.
     */
    async replacePlaylist(title, ratingKeys) {
        try {
            const existing = await this.findPlaylistByTitle(title);
            if (existing) {
                await this.deletePlaylist(existing.ratingKey);
            }
        } catch (err) {
            console.warn(
                `[PlexClient] Could not clean up existing playlist "${title}":`,
                err?.message,
            );
        }
        if (!ratingKeys || ratingKeys.length === 0) return null;
        return this.createPlaylist(title, ratingKeys);
    }

    /**
     * Trigger a library scan. Prefers weeklyFlowSectionId if set, otherwise musicSectionId.
     * Pass an explicit sectionId to override.
     */
    async triggerLibraryScan(sectionId = null) {
        const section = sectionId || this.weeklyFlowSectionId || this.musicSectionId;
        if (!this.isConfigured() || !section) return null;
        try {
            await this._request(
                "GET",
                `/library/sections/${section}/refresh`,
            );
            return true;
        } catch (err) {
            console.warn(
                "[PlexClient] Library scan trigger failed:",
                err?.message,
            );
            return null;
        }
    }
}
