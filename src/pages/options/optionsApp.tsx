import React, { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_SETTINGS,
  type Settings,
  getSettings,
  setSettings
} from "../../shared/storage";

function originPatternFromBaseUrl(baseUrl: string) {
  try {
    const u = new URL(baseUrl);
    return `${u.origin}/*`;
  } catch {
    return null;
  }
}

export function OptionsApp() {
  const [settings, setLocalSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hostAccess, setHostAccess] = useState<"unknown" | "granted" | "missing">("unknown");

  useEffect(() => {
    void (async () => {
      const s = await getSettings();
      setLocalSettings(s);
    })();
  }, []);

  useEffect(() => {
    const pattern = originPatternFromBaseUrl(settings.llm.baseUrl);
    if (!pattern) return setHostAccess("unknown");
    chrome.permissions.contains({ origins: [pattern] }, (ok) => {
      const err = chrome.runtime.lastError;
      if (err) return setHostAccess("unknown");
      setHostAccess(ok ? "granted" : "missing");
    });
  }, [settings.llm.baseUrl]);

  const apiConfigured = useMemo(() => {
    const apiKey = settings.llm?.apiKey ?? "";
    const baseUrl = settings.llm?.baseUrl ?? "";
    return Boolean(apiKey.trim()) && Boolean(baseUrl.trim());
  }, [settings.llm?.apiKey, settings.llm?.baseUrl]);

  async function save() {
    setError(null);
    try {
      await setSettings(settings);
      const pattern = originPatternFromBaseUrl(settings.llm.baseUrl);
      if (pattern) {
        await new Promise<void>((resolve) => {
          chrome.permissions.request({ origins: [pattern] }, () => resolve());
        });
      }
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save settings");
    }
  }

  return (
    <div className="app" style={{ maxWidth: 900, margin: "0 auto", padding: 18 }}>
      <div className="title">
        <h1>AI Resume Helper — Settings</h1>
        <span className="badge">{apiConfigured ? "LLM ready" : "LLM not configured"}</span>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", alignItems: "start" }}>
        <div className="panel">
          <h2>LLM Provider (OpenAI compatible)</h2>
          <div className="field" style={{ marginBottom: 10 }}>
            <label>Base URL</label>
            <input
              className="input mono"
              value={settings.llm.baseUrl}
              onChange={(e) =>
                setLocalSettings((s) => ({ ...s, llm: { ...s.llm, baseUrl: e.target.value } }))
              }
              placeholder="https://api.openai.com"
            />
            <div className="small" style={{ marginTop: 6 }}>
              Must support <span className="mono">/v1/chat/completions</span>.
            </div>
            <div className="small" style={{ marginTop: 6 }}>
              Host access:{" "}
              <span className="mono">
                {hostAccess === "granted"
                  ? "granted"
                  : hostAccess === "missing"
                    ? "not granted (will prompt on Save)"
                    : "unknown"}
              </span>
            </div>
          </div>

          <div className="field" style={{ marginBottom: 10 }}>
            <label>API Key</label>
            <input
              className="input mono"
              value={settings.llm.apiKey}
              onChange={(e) =>
                setLocalSettings((s) => ({ ...s, llm: { ...s.llm, apiKey: e.target.value } }))
              }
              placeholder="sk-…"
              type="password"
            />
            <div className="small" style={{ marginTop: 6 }}>
              Stored in <span className="mono">chrome.storage.local</span> (Chrome extensions can’t
              fully hide secrets).
            </div>
          </div>

          <div className="field" style={{ marginBottom: 10 }}>
            <label>Model</label>
            <input
              className="input mono"
              value={settings.llm.model}
              onChange={(e) =>
                setLocalSettings((s) => ({ ...s, llm: { ...s.llm, model: e.target.value } }))
              }
              placeholder="gpt-4.1-mini"
            />
          </div>

          <div className="field" style={{ marginBottom: 10 }}>
            <label>Temperature</label>
            <input
              className="input mono"
              value={String(settings.llm.temperature)}
              onChange={(e) =>
                setLocalSettings((s) => ({
                  ...s,
                  llm: { ...s.llm, temperature: Number(e.target.value) || 0 }
                }))
              }
              placeholder="0.2"
            />
          </div>
        </div>

        <div className="panel">
          <h2>Privacy & History</h2>
          <div className="row" style={{ marginBottom: 10 }}>
            <label className="pill" style={{ cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={settings.privacyMode}
                onChange={(e) =>
                  setLocalSettings((s) => ({ ...s, privacyMode: e.target.checked }))
                }
                style={{ marginRight: 8 }}
              />
              <strong>Privacy mode</strong> (session-only)
            </label>
          </div>

          <div className="field" style={{ marginBottom: 10 }}>
            <label>History limit (when privacy mode is off)</label>
            <input
              className="input mono"
              value={String(settings.history.maxEntries)}
              onChange={(e) =>
                setLocalSettings((s) => ({
                  ...s,
                  history: { ...s.history, maxEntries: Math.max(1, Number(e.target.value) || 20) }
                }))
              }
            />
          </div>

          <div className="field" style={{ marginBottom: 10 }}>
            <label>Retention days (when privacy mode is off)</label>
            <input
              className="input mono"
              value={String(settings.history.retentionDays)}
              onChange={(e) =>
                setLocalSettings((s) => ({
                  ...s,
                  history: {
                    ...s.history,
                    retentionDays: Math.max(1, Number(e.target.value) || 30)
                  }
                }))
              }
            />
          </div>

          <div className="row">
            <button className="btn primary" onClick={() => void save()}>
              Save settings
            </button>
            <button className="btn" onClick={() => setLocalSettings(DEFAULT_SETTINGS)}>
              Reset
            </button>
          </div>

          {savedAt ? <div className="toast">Saved {new Date(savedAt).toLocaleString()}.</div> : null}
          {error ? (
            <div className="toast" style={{ borderColor: "rgba(239, 68, 68, 0.6)" }}>
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

