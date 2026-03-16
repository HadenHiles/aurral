import { useState } from "react";
import { ChevronRight, ChevronLeft, CheckCircle2 } from "lucide-react";
import {
  completeOnboarding,
  testLidarrOnboarding,
  testNavidromeOnboarding,
  testPlexOnboarding,
  testTautulliOnboarding,
} from "../utils/api";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";

const inputClass =
  "block w-full px-3 py-2.5 rounded sm:text-sm focus:outline-none focus:ring-2 focus:ring-offset-0";
const inputStyle = {
  backgroundColor: "#2a2a30",
  color: "#fff",
  border: "1px solid #4a4a52",
};

const STEPS = [
  "welcome",
  "admin",
  "lidarr",
  "musicbrainz",
  "navidrome",
  "plex",
  "tautulli",
  "lastfm",
  "done",
];

function Onboarding() {
  const [step, setStep] = useState(0);
  const [authUser, setAuthUser] = useState("admin");
  const [authPassword, setAuthPassword] = useState("");
  const [authPasswordConfirm, setAuthPasswordConfirm] = useState("");
  const [lidarrUrl, setLidarrUrl] = useState("");
  const [lidarrApiKey, setLidarrApiKey] = useState("");
  const [musicbrainzEmail, setMusicbrainzEmail] = useState("");
  const [navidromeUrl, setNavidromeUrl] = useState("");
  const [navidromeUsername, setNavidromeUsername] = useState("");
  const [navidromePassword, setNavidromePassword] = useState("");
  const [plexUrl, setPlexUrl] = useState("");
  const [plexToken, setPlexToken] = useState("");
  const [tautulliUrl, setTautulliUrl] = useState("");
  const [tautulliApiKey, setTautulliApiKey] = useState("");
  const [lastfmUsername, setLastfmUsername] = useState("");
  const [lastfmApiKey, setLastfmApiKey] = useState("");
  const [lidarrTestSuccess, setLidarrTestSuccess] = useState(false);
  const [testingLidarr, setTestingLidarr] = useState(false);
  const [navidromeTestSuccess, setNavidromeTestSuccess] = useState(false);
  const [testingNavidrome, setTestingNavidrome] = useState(false);
  const [plexTestSuccess, setPlexTestSuccess] = useState(false);
  const [testingPlex, setTestingPlex] = useState(false);
  const [tautulliTestSuccess, setTautulliTestSuccess] = useState(false);
  const [testingTautulli, setTestingTautulli] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { refreshAuth } = useAuth();
  const { showSuccess } = useToast();

  const currentStep = STEPS[step];
  const hasNavidrome =
    navidromeUrl.trim() && navidromeUsername.trim() && navidromePassword;
  const hasPlex = !!(plexUrl.trim() && plexToken.trim());
  const hasTautulli = !!(tautulliUrl.trim() && tautulliApiKey.trim());
  const hasLastfm =
    !!lastfmUsername.trim() && !!lastfmApiKey.trim();
  const adminComplete =
    authUser.trim() && authPassword && authPassword === authPasswordConfirm;
  const canNext =
    currentStep === "welcome" ||
    currentStep === "done" ||
    (currentStep === "admin" && adminComplete) ||
    (currentStep === "lidarr" && lidarrTestSuccess) ||
    (currentStep === "musicbrainz" && musicbrainzEmail.trim()) ||
    (currentStep === "navidrome" && (!hasNavidrome || navidromeTestSuccess)) ||
    (currentStep === "plex" && (!hasPlex || plexTestSuccess)) ||
    (currentStep === "tautulli" && (!hasTautulli || tautulliTestSuccess)) ||
    currentStep === "lastfm";
  const isPrimaryDisabled =
    currentStep === "done"
      ? submitting
      : currentStep === "lidarr"
        ? !lidarrTestSuccess &&
          (!lidarrUrl.trim() || !lidarrApiKey.trim() || testingLidarr)
        : currentStep === "navidrome"
          ? testingNavidrome
          : currentStep === "plex"
            ? testingPlex
            : currentStep === "tautulli"
              ? testingTautulli
              : currentStep === "admin"
            ? !adminComplete
            : currentStep !== "welcome" && currentStep !== "lastfm" && !canNext;

  const handleNext = () => {
    setError("");
    if (currentStep === "done") return;
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const handleLidarrStepAction = async () => {
    if (lidarrTestSuccess) {
      handleNext();
      return;
    }
    await handleTestLidarr();
  };

  const handleNavidromeStepAction = async () => {
    if (!hasNavidrome) {
      handleNext();
      return;
    }
    if (navidromeTestSuccess) {
      handleNext();
      return;
    }
    await handleTestNavidrome();
  };

  const handlePlexStepAction = async () => {
    if (!hasPlex) {
      handleNext();
      return;
    }
    if (plexTestSuccess) {
      handleNext();
      return;
    }
    setTestingPlex(true);
    setError("");
    try {
      const result = await testPlexOnboarding(plexUrl.trim(), plexToken.trim());
      setPlexTestSuccess(true);
      showSuccess(result.message || "Plex connection successful");
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Connection failed");
    } finally {
      setTestingPlex(false);
    }
  };

  const handleTautulliStepAction = async () => {
    if (!hasTautulli) {
      handleNext();
      return;
    }
    if (tautulliTestSuccess) {
      handleNext();
      return;
    }
    setTestingTautulli(true);
    setError("");
    try {
      const result = await testTautulliOnboarding(
        tautulliUrl.trim(),
        tautulliApiKey.trim(),
      );
      setTautulliTestSuccess(true);
      showSuccess(result.message || "Tautulli connection successful");
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Connection failed");
    } finally {
      setTestingTautulli(false);
    }
  };

  const handleTestNavidrome = async () => {
    if (!hasNavidrome) return;
    setTestingNavidrome(true);
    setError("");
    try {
      await testNavidromeOnboarding(
        navidromeUrl.trim(),
        navidromeUsername.trim(),
        navidromePassword,
      );
      setNavidromeTestSuccess(true);
      showSuccess("Navidrome connection successful");
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Connection failed");
    } finally {
      setTestingNavidrome(false);
    }
  };

  const handleBack = () => {
    setError("");
    if (step > 0) setStep(step - 1);
  };

  const handleTestLidarr = async () => {
    if (!lidarrUrl.trim() || !lidarrApiKey.trim()) {
      setError("Enter Lidarr URL and API key first");
      return;
    }
    setTestingLidarr(true);
    setError("");
    try {
      await testLidarrOnboarding(lidarrUrl.trim(), lidarrApiKey.trim());
      setLidarrTestSuccess(true);
      showSuccess("Lidarr connection successful");
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Connection failed");
    } finally {
      setTestingLidarr(false);
    }
  };

  const handleFinish = async () => {
    setSubmitting(true);
    setError("");
    try {
      await completeOnboarding({
        authUser: authUser.trim() || "admin",
        authPassword: authPassword || undefined,
        lidarr:
          lidarrUrl.trim() && lidarrApiKey.trim()
            ? {
                url: lidarrUrl.trim().replace(/\/+$/, ""),
                apiKey: lidarrApiKey.trim(),
              }
            : undefined,
        musicbrainz: musicbrainzEmail.trim()
          ? { email: musicbrainzEmail.trim() }
          : undefined,
        navidrome:
          navidromeUrl.trim() && navidromeUsername.trim() && navidromePassword
            ? {
                url: navidromeUrl.trim().replace(/\/+$/, ""),
                username: navidromeUsername.trim(),
                password: navidromePassword,
              }
            : undefined,
        plex:
          plexUrl.trim() && plexToken.trim()
            ? {
                url: plexUrl.trim().replace(/\/+$/, ""),
                token: plexToken.trim(),
              }
            : undefined,
        tautulli:
          tautulliUrl.trim() && tautulliApiKey.trim()
            ? {
                url: tautulliUrl.trim().replace(/\/+$/, ""),
                apiKey: tautulliApiKey.trim(),
              }
            : undefined,
        lastfm:
          lastfmUsername.trim() && lastfmApiKey.trim()
            ? {
                username: lastfmUsername.trim(),
                apiKey: lastfmApiKey.trim(),
              }
            : undefined,
      });
      await refreshAuth();
      showSuccess("Setup complete. Sign in with your admin account.");
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <form
        autoComplete="off"
        onSubmit={(e) => e.preventDefault()}
        className="max-w-lg w-full space-y-6 p-8 shadow-lg"
        style={{ backgroundColor: "#211f27" }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-1">
            {STEPS.slice(0, -1).map((s, i) => (
              <div
                key={s}
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: i <= step ? "#707e61" : "#3d3d44",
                }}
              />
            ))}
          </div>
          <span className="text-xs" style={{ color: "#c1c1c3" }}>
            {step + 1} / {STEPS.length}
          </span>
        </div>

        {currentStep === "welcome" && (
          <>
            <div className="text-center">
              <img
                src="/arralogo.svg"
                alt="Aurral Logo"
                className="mx-auto w-14 h-14 mb-4 transition-transform"
                style={{
                  filter:
                    "brightness(0) saturate(100%) invert(45%) sepia(8%) saturate(800%) hue-rotate(60deg) brightness(95%) contrast(85%)",
                }}
              />
              <h2 className="text-2xl font-bold mb-2" style={{ color: "#fff" }}>
                Welcome to Aurral
              </h2>
              <p className="text-sm" style={{ color: "#c1c1c3" }}>
                Set up your admin account, connect Lidarr, and add your
                MusicBrainz email. Navidrome, Plex, Tautulli, and Last.fm are
                optional but recommended.
              </p>
            </div>
          </>
        )}

        {currentStep === "admin" && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-bold" style={{ color: "#fff" }}>
                Admin account
              </h2>
            </div>
            <p className="text-sm mb-4" style={{ color: "#c1c1c3" }}>
              Create a local account to sign in to Aurral.
            </p>
            <div className="space-y-3">
              <input
                type="text"
                autoComplete="off"
                className={inputClass}
                style={inputStyle}
                placeholder="Username"
                value={authUser}
                onChange={(e) => setAuthUser(e.target.value)}
              />
              <input
                type="password"
                autoComplete="new-password"
                className={inputClass}
                style={inputStyle}
                placeholder="Password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
              />
              <input
                type="password"
                autoComplete="new-password"
                className={inputClass}
                style={inputStyle}
                placeholder="Confirm password"
                value={authPasswordConfirm}
                onChange={(e) => setAuthPasswordConfirm(e.target.value)}
              />
            </div>
          </>
        )}

        {currentStep === "lidarr" && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-bold" style={{ color: "#fff" }}>
                Connect Lidarr
              </h2>
            </div>
            <p className="text-sm mb-4" style={{ color: "#c1c1c3" }}>
              Aurral uses Lidarr to manage your music library and downloads.
            </p>
            <div className="space-y-3">
              <input
                type="url"
                autoComplete="off"
                className={inputClass}
                style={inputStyle}
                placeholder="Lidarr URL (e.g. http://localhost:8686)"
                value={lidarrUrl}
                onChange={(e) => {
                  setLidarrUrl(e.target.value);
                  setLidarrTestSuccess(false);
                }}
              />
              <input
                type="password"
                autoComplete="off"
                className={inputClass}
                style={inputStyle}
                placeholder="API key"
                value={lidarrApiKey}
                onChange={(e) => {
                  setLidarrApiKey(e.target.value);
                  setLidarrTestSuccess(false);
                }}
              />
            </div>
          </>
        )}

        {currentStep === "musicbrainz" && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-bold" style={{ color: "#fff" }}>
                MusicBrainz email
              </h2>
            </div>
            <p className="text-sm mb-4" style={{ color: "#c1c1c3" }}>
              Used for API etiquette when fetching metadata. Not shared.
            </p>
            <input
              type="email"
              autoComplete="off"
              className={inputClass}
              style={inputStyle}
              placeholder="your@email.com"
              value={musicbrainzEmail}
              onChange={(e) => setMusicbrainzEmail(e.target.value)}
            />
          </>
        )}

        {currentStep === "navidrome" && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-bold" style={{ color: "#fff" }}>
                Navidrome (optional)
              </h2>
            </div>
            <p className="text-sm mb-4" style={{ color: "#c1c1c3" }}>
              Recommended for streaming and playlists. Leave blank to skip and
              add later in settings.
            </p>
            <div className="space-y-3">
              <input
                type="url"
                autoComplete="off"
                className={inputClass}
                style={inputStyle}
                placeholder="Navidrome URL"
                value={navidromeUrl}
                onChange={(e) => {
                  setNavidromeUrl(e.target.value);
                  setNavidromeTestSuccess(false);
                }}
              />
              <input
                type="text"
                autoComplete="off"
                className={inputClass}
                style={inputStyle}
                placeholder="Username"
                value={navidromeUsername}
                onChange={(e) => {
                  setNavidromeUsername(e.target.value);
                  setNavidromeTestSuccess(false);
                }}
              />
              <input
                type="password"
                autoComplete="off"
                className={inputClass}
                style={inputStyle}
                placeholder="Password"
                value={navidromePassword}
                onChange={(e) => {
                  setNavidromePassword(e.target.value);
                  setNavidromeTestSuccess(false);
                }}
              />
            </div>
          </>
        )}

        {currentStep === "plex" && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-bold" style={{ color: "#fff" }}>
                Plex (optional)
              </h2>
            </div>
            <p className="text-sm mb-2" style={{ color: "#c1c1c3" }}>
              Connect Plex for Weekly Flow playlist sync in Plexamp. Leave
              blank to skip and add later in Settings &rarr; Integrations.
            </p>
            <p className="text-xs mb-4 rounded p-2" style={{ color: "#c1c1c3", backgroundColor: "#1a1a1e", border: "1px solid #3a3a42" }}>
              Use the address Aurral&apos;s server can reach, not your browser
              address. Section IDs for library sync can be configured later in
              Settings.
            </p>
            <div className="space-y-3">
              <input
                type="url"
                autoComplete="off"
                className={inputClass}
                style={inputStyle}
                placeholder="Plex URL (e.g. http://plex.local:32400)"
                value={plexUrl}
                onChange={(e) => {
                  setPlexUrl(e.target.value);
                  setPlexTestSuccess(false);
                }}
              />
              <input
                type="password"
                autoComplete="off"
                className={inputClass}
                style={inputStyle}
                placeholder="Plex Token"
                value={plexToken}
                onChange={(e) => {
                  setPlexToken(e.target.value);
                  setPlexTestSuccess(false);
                }}
              />
              <p className="text-xs" style={{ color: "#8a8a8e" }}>
                See Plex&apos;s official guide on{" "}
                <a
                  href="https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#60a5fa", textDecoration: "underline" }}
                >
                  Finding an authentication token
                </a>
                {" "}for step-by-step instructions.
              </p>
            </div>
          </>
        )}

        {currentStep === "tautulli" && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-bold" style={{ color: "#fff" }}>
                Tautulli (optional)
              </h2>
            </div>
            <p className="text-sm mb-2" style={{ color: "#c1c1c3" }}>
              Used to seed discovery recommendations from your Plexamp listening
              history. Leave blank to skip and add later in Settings &rarr;
              Integrations.
            </p>
            <p className="text-xs mb-4 rounded p-2" style={{ color: "#c1c1c3", backgroundColor: "#1a1a1e", border: "1px solid #3a3a42" }}>
              Tautulli must be monitoring the same Plex server you configured
              in the previous step. Use the address Aurral&apos;s server can
              reach.
            </p>
            <div className="space-y-3">
              <input
                type="url"
                autoComplete="off"
                className={inputClass}
                style={inputStyle}
                placeholder="Tautulli URL (e.g. http://tautulli.local:8181)"
                value={tautulliUrl}
                onChange={(e) => {
                  setTautulliUrl(e.target.value);
                  setTautulliTestSuccess(false);
                }}
              />
              <input
                type="password"
                autoComplete="off"
                className={inputClass}
                style={inputStyle}
                placeholder="Tautulli API Key"
                value={tautulliApiKey}
                onChange={(e) => {
                  setTautulliApiKey(e.target.value);
                  setTautulliTestSuccess(false);
                }}
              />
              <p className="text-xs" style={{ color: "#8a8a8e" }}>
                API key found in Tautulli &rarr; Settings &rarr; Web Interface
                &rarr; API Key.
              </p>
            </div>
          </>
        )}

        {currentStep === "lastfm" && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-bold" style={{ color: "#fff" }}>
                Last.fm (optional)
              </h2>
            </div>
            <p className="text-sm mb-4" style={{ color: "#c1c1c3" }}>
              Recommended for discovery and recommendations based on your
              scrobbles. Leave blank to skip and add later in settings.
            </p>
            <div className="space-y-3">
              <input
                type="text"
                autoComplete="off"
                className={inputClass}
                style={inputStyle}
                placeholder="Last.fm username"
                value={lastfmUsername}
                onChange={(e) => setLastfmUsername(e.target.value)}
              />
              <input
                type="password"
                autoComplete="off"
                className={inputClass}
                style={inputStyle}
                placeholder="Last.fm API key"
                value={lastfmApiKey}
                onChange={(e) => setLastfmApiKey(e.target.value)}
              />
            </div>
          </>
        )}

        {currentStep === "done" && (
          <div className="text-center py-4">
            <CheckCircle2
              className="mx-auto h-12 w-12 mb-4"
              style={{ color: "#707e61" }}
            />
            <h2 className="text-xl font-bold mb-2" style={{ color: "#fff" }}>
              You&apos;re all set
            </h2>
            <p className="text-sm" style={{ color: "#c1c1c3" }}>
              Sign in with your admin account to start using Aurral.
            </p>
          </div>
        )}

        {error && (
          <p className="text-sm text-center" style={{ color: "#ff6b6b" }}>
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-4">
          {step > 0 && currentStep !== "done" && (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-1 py-2 px-4 text-sm border rounded transition-colors"
              style={{
                ...inputStyle,
                borderColor: "#3d3d44",
                color: "#c1c1c3",
              }}
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}
          <button
            type="button"
            onClick={
              currentStep === "done"
                ? handleFinish
                : currentStep === "lidarr"
                  ? handleLidarrStepAction
                  : currentStep === "navidrome"
                    ? handleNavidromeStepAction
                    : currentStep === "plex"
                      ? handlePlexStepAction
                      : currentStep === "tautulli"
                        ? handleTautulliStepAction
                        : handleNext
            }
            disabled={isPrimaryDisabled}
            className="flex-1 flex items-center justify-center gap-1 py-2 px-4 text-sm font-medium rounded transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              backgroundColor: isPrimaryDisabled ? "#3d3d44" : "#707e61",
              color: "#fff",
            }}
          >
            {currentStep === "done" ? (
              submitting ? (
                "Saving…"
              ) : (
                "Go to Aurral"
              )
            ) : currentStep === "lidarr" ? (
              lidarrTestSuccess ? (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              ) : testingLidarr ? (
                "Testing…"
              ) : (
                "Test"
              )
            ) : currentStep === "navidrome" ? (
              !hasNavidrome ? (
                "Skip"
              ) : navidromeTestSuccess ? (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              ) : testingNavidrome ? (
                "Testing…"
              ) : (
                "Test"
              )
            ) : currentStep === "plex" ? (
              !hasPlex ? (
                "Skip"
              ) : plexTestSuccess ? (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              ) : testingPlex ? (
                "Testing…"
              ) : (
                "Test"
              )
            ) : currentStep === "tautulli" ? (
              !hasTautulli ? (
                "Skip"
              ) : tautulliTestSuccess ? (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              ) : testingTautulli ? (
                "Testing…"
              ) : (
                "Test"
              )
            ) : currentStep === "lastfm" ? (
              hasLastfm ? (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              ) : (
                "Skip"
              )
            ) : currentStep === "welcome" ? (
              "Get started"
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Onboarding;
