import { useState } from "react";
import { CheckCircle, Pencil, RefreshCw } from "lucide-react";
import FlipSaveButton from "../../../components/FlipSaveButton";
import {
  getLidarrMetadataProfiles,
  getLidarrProfiles,
  testLidarrConnection,
  testPlexConnection,
  testTautulliConnection,
} from "../../../utils/api";

export function SettingsIntegrationsTab({
  settings,
  updateSettings,
  health,
  lidarrProfiles,
  loadingLidarrProfiles,
  setLoadingLidarrProfiles,
  setLidarrProfiles,
  lidarrMetadataProfiles,
  loadingLidarrMetadataProfiles,
  setLoadingLidarrMetadataProfiles,
  setLidarrMetadataProfiles,
  testingLidarr,
  setTestingLidarr,
  applyingCommunityGuide,
  setShowCommunityGuideModal,
  hasUnsavedChanges,
  saving,
  handleSaveSettings,
  showSuccess,
  showError,
  showInfo,
}) {
  const [lidarrEditing, setLidarrEditing] = useState(false);
  const [navidromeEditing, setNavidromeEditing] = useState(false);
  const [plexEditing, setPlexEditing] = useState(false);
  const [tautulliEditing, setTautulliEditing] = useState(false);
  const [testingPlex, setTestingPlex] = useState(false);
  const [testingTautulli, setTestingTautulli] = useState(false);
  const [lidarrTestLatencyMs, setLidarrTestLatencyMs] = useState(null);
  const safeLidarrProfiles = Array.isArray(lidarrProfiles)
    ? lidarrProfiles
    : [];
  const safeLidarrMetadataProfiles = Array.isArray(lidarrMetadataProfiles)
    ? lidarrMetadataProfiles
    : [];

  const handleTestLidarr = async () => {
    const url = settings.integrations?.lidarr?.url;
    const apiKey = settings.integrations?.lidarr?.apiKey;
    if (!url || !apiKey) {
      showError("Please enter both URL and API key");
      return;
    }
    setTestingLidarr(true);
    setLidarrTestLatencyMs(null);
    const startTime = performance.now();
    try {
      const result = await testLidarrConnection(url, apiKey);
      setLidarrTestLatencyMs(Math.round(performance.now() - startTime));
      if (result.success) {
        showSuccess(
          `Lidarr connection successful! (${result.instanceName || "Lidarr"})`
        );
        setLoadingLidarrProfiles(true);
        setLoadingLidarrMetadataProfiles(true);
        try {
          const [profiles, metadataProfiles] = await Promise.all([
            getLidarrProfiles(url, apiKey),
            getLidarrMetadataProfiles(url, apiKey),
          ]);
          const nextProfiles = Array.isArray(profiles) ? profiles : [];
          const nextMetadataProfiles = Array.isArray(metadataProfiles)
            ? metadataProfiles
            : [];
          setLidarrProfiles(nextProfiles);
          setLidarrMetadataProfiles(nextMetadataProfiles);
          if (nextProfiles.length > 0) {
            showInfo(`Loaded ${nextProfiles.length} quality profile(s)`);
          }
          if (nextMetadataProfiles.length > 0) {
            showInfo(
              `Loaded ${nextMetadataProfiles.length} metadata profile(s)`
            );
          }
        } catch {
        } finally {
          setLoadingLidarrProfiles(false);
          setLoadingLidarrMetadataProfiles(false);
        }
      } else {
        showError(
          `Connection failed: ${result.message || result.error}${result.details ? `\n${result.details}` : ""}`
        );
      }
    } catch (err) {
      setLidarrTestLatencyMs(Math.round(performance.now() - startTime));
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message;
      showError(`Connection failed: ${errorMsg}`);
    } finally {
      setTestingLidarr(false);
    }
  };

  const handleRefreshProfiles = async () => {
    const url = settings.integrations?.lidarr?.url;
    const apiKey = settings.integrations?.lidarr?.apiKey;
    if (!url || !apiKey) {
      showError("Please enter Lidarr URL and API key first");
      return;
    }
    setLoadingLidarrProfiles(true);
    try {
      const profiles = await getLidarrProfiles(url, apiKey);
      const nextProfiles = Array.isArray(profiles) ? profiles : [];
      setLidarrProfiles(nextProfiles);
      if (nextProfiles.length > 0) {
        showSuccess(`Loaded ${nextProfiles.length} quality profile(s)`);
      } else {
        showInfo("No quality profiles found in Lidarr");
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message;
      showError(`Failed to load profiles: ${errorMsg}`);
    } finally {
      setLoadingLidarrProfiles(false);
    }
  };

  const handleRefreshMetadataProfiles = async () => {
    const url = settings.integrations?.lidarr?.url;
    const apiKey = settings.integrations?.lidarr?.apiKey;
    if (!url || !apiKey) {
      showError("Please enter Lidarr URL and API key first");
      return;
    }
    setLoadingLidarrMetadataProfiles(true);
    try {
      const profiles = await getLidarrMetadataProfiles(url, apiKey);
      const nextProfiles = Array.isArray(profiles) ? profiles : [];
      setLidarrMetadataProfiles(nextProfiles);
      if (nextProfiles.length > 0) {
        showSuccess(`Loaded ${nextProfiles.length} metadata profile(s)`);
      } else {
        showInfo("No metadata profiles found in Lidarr");
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message;
      showError(`Failed to load metadata profiles: ${errorMsg}`);
    } finally {
      setLoadingLidarrMetadataProfiles(false);
    }
  };

  return (
    <div className="card animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2
          className="text-2xl font-bold flex items-center"
          style={{ color: "#fff" }}
        >
          Integrations
        </h2>
        <FlipSaveButton
          saving={saving}
          disabled={!hasUnsavedChanges}
          onClick={handleSaveSettings}
        />
      </div>
      <form
        onSubmit={handleSaveSettings}
        className="space-y-6"
        autoComplete="off"
      >
        <div
          className="p-6 rounded-lg space-y-4"
          style={{
            backgroundColor: "#1a1a1e",
            border: "1px solid #2a2a2e",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <h3
              className="text-lg font-medium flex items-center"
              style={{ color: "#fff" }}
            >
              Lidarr
            </h3>
            <div className="flex items-center gap-2">
              {health?.lidarrConfigured && (
                <span className="flex items-center text-sm text-green-400">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Connected
                </span>
              )}
              <button
                type="button"
                className={`btn ${
                  lidarrEditing ? "btn-primary" : "btn-secondary"
                } px-2 py-1`}
                onClick={() => setLidarrEditing((value) => !value)}
                aria-label={
                  lidarrEditing ? "Lock Lidarr settings" : "Edit Lidarr settings"
                }
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          </div>
          <fieldset
            disabled={!lidarrEditing}
            className={`grid grid-cols-1 gap-4 ${
              lidarrEditing ? "" : "opacity-60"
            }`}
          >
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "#fff" }}
              >
                Server URL
              </label>
              <input
                type="url"
                className="input"
                placeholder="http://lidarr:8686"
                autoComplete="off"
                value={settings.integrations?.lidarr?.url || ""}
                onChange={(e) => {
                  setLidarrTestLatencyMs(null);
                  updateSettings({
                    ...settings,
                    integrations: {
                      ...settings.integrations,
                      lidarr: {
                        ...(settings.integrations?.lidarr || {}),
                        url: e.target.value,
                      },
                    },
                  });
                }}
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "#fff" }}
              >
                API Key
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  className="input flex-1"
                  placeholder="Enter Lidarr API Key"
                  autoComplete="off"
                  value={settings.integrations?.lidarr?.apiKey || ""}
                  onChange={(e) => {
                    setLidarrTestLatencyMs(null);
                    updateSettings({
                      ...settings,
                      integrations: {
                        ...settings.integrations,
                        lidarr: {
                          ...(settings.integrations?.lidarr || {}),
                          apiKey: e.target.value,
                        },
                      },
                    });
                  }}
                />
                <button
                  type="button"
                  onClick={handleTestLidarr}
                  disabled={
                    testingLidarr ||
                    !settings.integrations?.lidarr?.url ||
                    !settings.integrations?.lidarr?.apiKey
                  }
                  className="btn btn-secondary"
                >
                  {testingLidarr ? "Testing..." : "Test"}
                </button>
              </div>
              <p className="mt-1 text-xs" style={{ color: "#c1c1c3" }}>
                Found in Settings &rarr; General &rarr; Security.
              </p>
              {lidarrTestLatencyMs !== null && (
                <p className="mt-1 text-xs" style={{ color: "#c1c1c3" }}>
                  Last test response time: {lidarrTestLatencyMs} ms
                </p>
              )}
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "#fff" }}
              >
                Default Quality Profile
              </label>
              <div className="flex gap-2">
                <select
                  className="input flex-1"
                  value={
                    settings.integrations?.lidarr?.qualityProfileId
                      ? String(settings.integrations.lidarr.qualityProfileId)
                      : ""
                  }
                  onChange={(e) =>
                    updateSettings({
                      ...settings,
                      integrations: {
                        ...settings.integrations,
                        lidarr: {
                          ...(settings.integrations?.lidarr || {}),
                          qualityProfileId: e.target.value
                            ? parseInt(e.target.value)
                            : null,
                        },
                      },
                    })
                  }
                  disabled={loadingLidarrProfiles}
                >
                  <option value="">
                    {loadingLidarrProfiles
                      ? "Loading profiles..."
                      : safeLidarrProfiles.length === 0
                      ? "No profiles available (test connection first)"
                      : "Select a profile"}
                  </option>
                  {safeLidarrProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleRefreshProfiles}
                  disabled={
                    loadingLidarrProfiles ||
                    !settings.integrations?.lidarr?.url ||
                    !settings.integrations?.lidarr?.apiKey
                  }
                  className="btn btn-secondary"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${
                      loadingLidarrProfiles ? "animate-spin" : ""
                    }`}
                  />
                </button>
              </div>
              <p className="mt-1 text-xs" style={{ color: "#c1c1c3" }}>
                Quality profile used when adding artists and albums to Lidarr.
              </p>
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "#fff" }}
              >
                Default Metadata Profile
              </label>
              <div className="flex gap-2">
                <select
                  className="input flex-1"
                  value={
                    settings.integrations?.lidarr?.metadataProfileId
                      ? String(settings.integrations.lidarr.metadataProfileId)
                      : ""
                  }
                  onChange={(e) =>
                    updateSettings({
                      ...settings,
                      integrations: {
                        ...settings.integrations,
                        lidarr: {
                          ...(settings.integrations?.lidarr || {}),
                          metadataProfileId: e.target.value
                            ? parseInt(e.target.value)
                            : null,
                        },
                      },
                    })
                  }
                  disabled={loadingLidarrMetadataProfiles}
                >
                  <option value="">
                    {loadingLidarrMetadataProfiles
                      ? "Loading profiles..."
                      : safeLidarrMetadataProfiles.length === 0
                      ? "No profiles available (test connection first)"
                      : "Select a profile"}
                  </option>
                  {safeLidarrMetadataProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleRefreshMetadataProfiles}
                  disabled={
                    loadingLidarrMetadataProfiles ||
                    !settings.integrations?.lidarr?.url ||
                    !settings.integrations?.lidarr?.apiKey
                  }
                  className="btn btn-secondary"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${
                      loadingLidarrMetadataProfiles ? "animate-spin" : ""
                    }`}
                  />
                </button>
              </div>
              <p className="mt-1 text-xs" style={{ color: "#c1c1c3" }}>
                Metadata profile used when adding artists to Lidarr.
              </p>
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "#fff" }}
              >
                Default Monitoring Option
              </label>
              <select
                className="input"
                value={
                  settings.integrations?.lidarr?.defaultMonitorOption || "none"
                }
                onChange={(e) =>
                  updateSettings({
                    ...settings,
                    integrations: {
                      ...settings.integrations,
                      lidarr: {
                        ...(settings.integrations?.lidarr || {}),
                        defaultMonitorOption: e.target.value,
                      },
                    },
                  })
                }
              >
                <option value="none">None (Artist Only)</option>
                <option value="all">All Albums</option>
                <option value="future">Future Albums</option>
                <option value="missing">Missing Albums</option>
                <option value="latest">Latest Album</option>
                <option value="first">First Album</option>
              </select>
              <p className="mt-1 text-xs" style={{ color: "#c1c1c3" }}>
                Default monitoring used when adding new artists.
              </p>
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={
                    settings.integrations?.lidarr?.searchOnAdd || false
                  }
                  onChange={(e) =>
                    updateSettings({
                      ...settings,
                      integrations: {
                        ...settings.integrations,
                        lidarr: {
                          ...(settings.integrations?.lidarr || {}),
                          searchOnAdd: e.target.checked,
                        },
                      },
                    })
                  }
                />
                <span
                  className="text-sm font-medium"
                  style={{ color: "#fff" }}
                >
                  Search on Add
                </span>
              </label>
              <p
                className="mt-1 text-xs ml-6"
                style={{ color: "#c1c1c3" }}
              >
                Automatically search for albums when adding them to library
              </p>
            </div>
            <div
              className="pt-4 border-t"
              style={{ borderColor: "#2a2a2e" }}
            >
              <button
                type="button"
                onClick={() => {
                  if (
                    !settings.integrations?.lidarr?.url ||
                    !settings.integrations?.lidarr?.apiKey
                  ) {
                    showError(
                      "Please configure Lidarr URL and API key first"
                    );
                    return;
                  }
                  setShowCommunityGuideModal(true);
                }}
                disabled={
                  applyingCommunityGuide || !health?.lidarrConfigured
                }
                className="btn btn-primary w-full"
              >
                {applyingCommunityGuide
                  ? "Applying..."
                  : "Apply Davo's Recommended Settings"}
              </button>
              <p className="mt-2 text-xs" style={{ color: "#c1c1c3" }}>
                Creates quality profile, updates quality definitions, adds
                custom formats, and updates naming scheme.{" "}
                <a
                  href="https://wiki.servarr.com/lidarr/community-guide"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                  style={{ color: "#60a5fa" }}
                >
                  Read more
                </a>
              </p>
            </div>
          </fieldset>
        </div>
        <div
          className="p-6 rounded-lg space-y-4"
          style={{
            backgroundColor: "#1a1a1e",
            border: "1px solid #2a2a2e",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <h3
              className="text-lg font-medium flex items-center"
              style={{ color: "#fff" }}
            >
              Subsonic / Navidrome
            </h3>
            <div className="flex items-center gap-2">
              {settings.integrations?.navidrome?.url && (
                <span className="flex items-center text-sm text-green-400">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Configured
                </span>
              )}
              <button
                type="button"
                className={`btn ${
                  navidromeEditing ? "btn-primary" : "btn-secondary"
                } px-2 py-1`}
                onClick={() => setNavidromeEditing((value) => !value)}
                aria-label={
                  navidromeEditing
                    ? "Lock Subsonic / Navidrome settings"
                    : "Edit Subsonic / Navidrome settings"
                }
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          </div>
          <fieldset
            disabled={!navidromeEditing}
            className={`${navidromeEditing ? "" : "opacity-60"}`}
          >
            <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "#fff" }}
            >
              Server URL
            </label>
            <input
              type="url"
              className="input"
              placeholder="https://music.example.com"
              autoComplete="off"
              value={settings.integrations?.navidrome?.url || ""}
              onChange={(e) =>
                updateSettings({
                  ...settings,
                  integrations: {
                    ...settings.integrations,
                    navidrome: {
                      ...(settings.integrations?.navidrome || {}),
                      url: e.target.value,
                    },
                  },
                })
              }
            />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "#fff" }}
              >
                Username
              </label>
              <input
                type="text"
                className="input"
                autoComplete="off"
                value={settings.integrations?.navidrome?.username || ""}
                onChange={(e) =>
                  updateSettings({
                    ...settings,
                    integrations: {
                      ...settings.integrations,
                      navidrome: {
                        ...(settings.integrations?.navidrome || {}),
                        username: e.target.value,
                      },
                    },
                  })
                }
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "#fff" }}
              >
                Password
              </label>
              <input
                type="password"
                className="input"
                autoComplete="off"
                value={settings.integrations?.navidrome?.password || ""}
                onChange={(e) =>
                  updateSettings({
                    ...settings,
                    integrations: {
                      ...settings.integrations,
                      navidrome: {
                        ...(settings.integrations?.navidrome || {}),
                        password: e.target.value,
                      },
                    },
                  })
                }
              />
            </div>
            </div>
            <p className="mt-3 text-xs" style={{ color: "#8a8a8e" }}>
              When using Weekly Flow: set Navidrome&apos;s{" "}
              <code>Scanner.PurgeMissing</code> to <code>always</code> or{" "}
              <code>full</code> (e.g.{" "}
              <code>ND_SCANNER_PURGEMISSING=always</code>) so turning off a flow
              removes those tracks from the library.
            </p>
          </fieldset>
        </div>

        {/* Plex */}
        <div
          className="p-6 rounded-lg space-y-4"
          style={{
            backgroundColor: "#1a1a1e",
            border: "1px solid #2a2a2e",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <h3
              className="text-lg font-medium flex items-center"
              style={{ color: "#fff" }}
            >
              Plex
            </h3>
            <div className="flex items-center gap-2">
              {settings.integrations?.plex?.url && (
                <span className="flex items-center text-sm text-green-400">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Configured
                </span>
              )}
              <button
                type="button"
                className={`btn ${
                  plexEditing ? "btn-primary" : "btn-secondary"
                } px-2 py-1`}
                onClick={() => setPlexEditing((v) => !v)}
                aria-label={plexEditing ? "Lock Plex settings" : "Edit Plex settings"}
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          </div>
          <fieldset
            disabled={!plexEditing}
            className={`space-y-4 ${plexEditing ? "" : "opacity-60"}`}
          >
            <p className="text-xs rounded p-2" style={{ color: "#c1c1c3", backgroundColor: "#111115", border: "1px solid #2a2a2e" }}>
              All connections to Plex are made from the <strong>Aurral server</strong>, not your browser — no CORS or browser network restrictions apply. Use the address your Aurral server can reach (LAN IP, hostname, or Docker service name).
            </p>
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "#fff" }}
              >
                Server URL
              </label>
              <input
                type="url"
                className="input"
                placeholder="http://plex.local:32400"
                autoComplete="off"
                value={settings.integrations?.plex?.url || ""}
                onChange={(e) =>
                  updateSettings({
                    ...settings,
                    integrations: {
                      ...settings.integrations,
                      plex: {
                        ...(settings.integrations?.plex || {}),
                        url: e.target.value,
                      },
                    },
                  })
                }
              />
              <p className="mt-1 text-xs" style={{ color: "#8a8a8e" }}>
                The URL of your Plex Media Server as seen from Aurral&apos;s
                server (not your browser). Use the server&apos;s LAN IP or
                hostname, e.g.{" "}
                <code>http://192.168.1.10:32400</code> or{" "}
                <code>http://plex.local:32400</code>. If Plex is running in the
                same Docker network, use its container name.
              </p>
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "#fff" }}
              >
                Plex Token
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  className="input flex-1"
                  placeholder="Enter Plex Token"
                  autoComplete="off"
                  value={settings.integrations?.plex?.token || ""}
                  onChange={(e) =>
                    updateSettings({
                      ...settings,
                      integrations: {
                        ...settings.integrations,
                        plex: {
                          ...(settings.integrations?.plex || {}),
                          token: e.target.value,
                        },
                      },
                    })
                  }
                />
                <button
                  type="button"
                  disabled={
                    testingPlex ||
                    !settings.integrations?.plex?.url ||
                    !settings.integrations?.plex?.token
                  }
                  className="btn btn-secondary"
                  onClick={async () => {
                    setTestingPlex(true);
                    try {
                      const result = await testPlexConnection(
                        settings.integrations.plex.url,
                        settings.integrations.plex.token,
                      );
                      if (result.success) showSuccess(result.message);
                      else showError(result.error || "Connection failed");
                    } catch (err) {
                      showError(
                        err.response?.data?.message ||
                          err.response?.data?.error ||
                          err.message,
                      );
                    } finally {
                      setTestingPlex(false);
                    }
                  }}
                >
                  {testingPlex ? "Testing..." : "Test"}
                </button>
              </div>
              <p className="mt-1 text-xs" style={{ color: "#c1c1c3" }}>
                <strong>How to find your Plex token:</strong> See Plex&apos;s
                official guide:{" "}
                <a
                  href="https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                  style={{ color: "#60a5fa" }}
                >
                  Finding an authentication token
                </a>.
              </p>
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "#fff" }}
              >
                Music Library Section ID
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. 3"
                autoComplete="off"
                value={settings.integrations?.plex?.musicSectionId || ""}
                onChange={(e) =>
                  updateSettings({
                    ...settings,
                    integrations: {
                      ...settings.integrations,
                      plex: {
                        ...(settings.integrations?.plex || {}),
                        musicSectionId: e.target.value,
                      },
                    },
                  })
                }
              />
              <p className="mt-1 text-xs" style={{ color: "#c1c1c3" }}>
                The numeric ID of your main Plex music library.{" "}
                {settings.integrations?.plex?.url &&
                settings.integrations?.plex?.token ? (
                  <>
                    Open{" "}
                    <a
                      href={`${settings.integrations.plex.url}/library/sections?X-Plex-Token=${settings.integrations.plex.token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                      style={{ color: "#60a5fa" }}
                    >
                      your Plex sections list
                    </a>{" "}
                    and find the <code>key</code> attribute for your music library.
                  </>
                ) : (
                  <>
                    Save your URL and token first, then a direct link will appear
                    here. The URL format is{" "}
                    <code>[plex-url]/library/sections?X-Plex-Token=[token]</code>.
                  </>
                )}
                {" "}Reserved for future use (search within main library).
              </p>
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "#fff" }}
              >
                Weekly Flow Section ID
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. 5"
                autoComplete="off"
                value={settings.integrations?.plex?.weeklyFlowSectionId || ""}
                onChange={(e) =>
                  updateSettings({
                    ...settings,
                    integrations: {
                      ...settings.integrations,
                      plex: {
                        ...(settings.integrations?.plex || {}),
                        weeklyFlowSectionId: e.target.value,
                      },
                    },
                  })
                }
              />
              <p className="mt-1 text-xs" style={{ color: "#c1c1c3" }}>
                The numeric ID of a <strong>separate</strong> Plex music library
                pointing at your Weekly Flow download folder — the same folder
                path your Navidrome Weekly Flow library uses (configured via{" "}
                <code>DOWNLOAD_FOLDER</code> env var, e.g.{" "}
                <code>/data/downloads/tmp/aurral-weekly-flow</code>).{" "}
                Add this folder as a new Music library in Plex once, then{" "}
                {settings.integrations?.plex?.url &&
                settings.integrations?.plex?.token ? (
                  <>
                    check{" "}
                    <a
                      href={`${settings.integrations.plex.url}/library/sections?X-Plex-Token=${settings.integrations.plex.token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                      style={{ color: "#60a5fa" }}
                    >
                      your Plex sections list
                    </a>{" "}
                    for its <code>key</code> value.
                  </>
                ) : (
                  <>find its key in <code>[plex-url]/library/sections?X-Plex-Token=[token]</code>.</>
                )}{" "}
                Required for Weekly Flow playlist sync in Plexamp.
              </p>
            </div>
          </fieldset>
        </div>

        {/* Tautulli */}
        <div
          className="p-6 rounded-lg space-y-4"
          style={{
            backgroundColor: "#1a1a1e",
            border: "1px solid #2a2a2e",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <h3
              className="text-lg font-medium flex items-center"
              style={{ color: "#fff" }}
            >
              Tautulli
            </h3>
            <div className="flex items-center gap-2">
              {settings.integrations?.tautulli?.url && (
                <span className="flex items-center text-sm text-green-400">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Configured
                </span>
              )}
              <button
                type="button"
                className={`btn ${
                  tautulliEditing ? "btn-primary" : "btn-secondary"
                } px-2 py-1`}
                onClick={() => setTautulliEditing((v) => !v)}
                aria-label={
                  tautulliEditing
                    ? "Lock Tautulli settings"
                    : "Edit Tautulli settings"
                }
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          </div>
          <fieldset
            disabled={!tautulliEditing}
            className={`space-y-4 ${tautulliEditing ? "" : "opacity-60"}`}
          >
            <p className="text-xs rounded p-2" style={{ color: "#c1c1c3", backgroundColor: "#111115", border: "1px solid #2a2a2e" }}>
              All connections to Tautulli are made from the <strong>Aurral server</strong>. Use the address your Aurral server can reach. Tautulli must be monitoring the same Plex server you configured above.
            </p>
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "#fff" }}
              >
                Server URL
              </label>
              <input
                type="url"
                className="input"
                placeholder="http://tautulli.local:8181"
                autoComplete="off"
                value={settings.integrations?.tautulli?.url || ""}
                onChange={(e) =>
                  updateSettings({
                    ...settings,
                    integrations: {
                      ...settings.integrations,
                      tautulli: {
                        ...(settings.integrations?.tautulli || {}),
                        url: e.target.value,
                      },
                    },
                  })
                }
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "#fff" }}
              >
                API Key
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  className="input flex-1"
                  placeholder="Enter Tautulli API Key"
                  autoComplete="off"
                  value={settings.integrations?.tautulli?.apiKey || ""}
                  onChange={(e) =>
                    updateSettings({
                      ...settings,
                      integrations: {
                        ...settings.integrations,
                        tautulli: {
                          ...(settings.integrations?.tautulli || {}),
                          apiKey: e.target.value,
                        },
                      },
                    })
                  }
                />
                <button
                  type="button"
                  disabled={
                    testingTautulli ||
                    !settings.integrations?.tautulli?.url ||
                    !settings.integrations?.tautulli?.apiKey
                  }
                  className="btn btn-secondary"
                  onClick={async () => {
                    setTestingTautulli(true);
                    try {
                      const result = await testTautulliConnection(
                        settings.integrations.tautulli.url,
                        settings.integrations.tautulli.apiKey,
                      );
                      if (result.success) showSuccess(result.message);
                      else showError(result.error || "Connection failed");
                    } catch (err) {
                      showError(
                        err.response?.data?.message ||
                          err.response?.data?.error ||
                          err.message,
                      );
                    } finally {
                      setTestingTautulli(false);
                    }
                  }}
                >
                  {testingTautulli ? "Testing..." : "Test"}
                </button>
              </div>
              <p className="mt-1 text-xs" style={{ color: "#c1c1c3" }}>
                Found in Tautulli &rarr; Settings &rarr; Web Interface &rarr; API Key.
              </p>
            </div>
            <p className="mt-1 text-xs" style={{ color: "#8a8a8e" }}>
              When configured, Aurral pulls your Plex listening history from
              Tautulli and filters it to <strong>Plexamp plays only</strong>,
              using it as an additional seed source for discovery alongside
              or instead of Last.fm listening data.
            </p>
          </fieldset>
        </div>
      </form>
    </div>
  );
}
