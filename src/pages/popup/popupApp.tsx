import React, { useEffect, useMemo, useState } from "react";
import type {
  AtsReport,
  HistoryEntry,
  JobCaptureResult,
  TailorResult
} from "../../shared/types";
import {
  DEFAULT_SETTINGS,
  type Settings,
  getSettings
} from "../../shared/storage";
import { runtimeSend } from "../utils/runtime";

type Status = { kind: "idle" } | { kind: "busy"; label: string } | { kind: "error"; message: string };
type TailorResponse = { tailored: TailorResult; ats: AtsReport };

export function PopupApp() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const [job, setJob] = useState<JobCaptureResult | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [resumeText, setResumeText] = useState("");

  const [tailored, setTailored] = useState<TailorResult | null>(null);
  const [ats, setAts] = useState<AtsReport | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    void (async () => {
      const s = await getSettings();
      setSettings(s);

      const h = await runtimeSend<HistoryEntry[]>({ type: "GET_HISTORY" });
      if (h.ok) setHistory(h.data);
    })();
  }, []);

  const hasApiConfigured = useMemo(() => {
    return Boolean(settings.llm?.apiKey?.trim()) && Boolean(settings.llm?.baseUrl?.trim());
  }, [settings.llm?.apiKey, settings.llm?.baseUrl]);

  async function captureJob() {
    setStatus({ kind: "busy", label: "Capturing job description…" });
    setTailored(null);
    setAts(null);
    try {
      const res = await runtimeSend<JobCaptureResult>({ type: "CAPTURE_JD_FROM_ACTIVE_TAB" });
      if (!res.ok) throw new Error(res.error ?? "Capture failed");
      setJob(res.data);
      setJobDescription(res.data.jobDescriptionText ?? "");
      setStatus({ kind: "idle" });
    } catch (e) {
      setStatus({ kind: "error", message: e instanceof Error ? e.message : "Capture failed" });
    }
  }

  async function tailor() {
    setStatus({ kind: "busy", label: "Tailoring resume (ATS optimized)…" });
    setTailored(null);
    setAts(null);
    try {
      const res = await runtimeSend<TailorResponse>({
        type: "TAILOR_RESUME",
        payload: {
          resumeText,
          jobDescription
        }
      });
      if (!res.ok) throw new Error(res.error ?? "Tailor failed");
      setTailored(res.data.tailored);
      setAts(res.data.ats);
      const h = await runtimeSend<HistoryEntry[]>({ type: "GET_HISTORY" });
      if (h.ok) setHistory(h.data);
      setStatus({ kind: "idle" });
    } catch (e) {
      setStatus({ kind: "error", message: e instanceof Error ? e.message : "Tailor failed" });
    }
  }

  const scorePill = useMemo(() => {
    if (!ats) return null;
    const pct = Math.round(ats.matchPercent);
    return (
      <span className="pill">
        <strong>{pct}%</strong> match
      </span>
    );
  }, [ats]);

  return (
    <div className="app" style={{ width: 420 }}>
      <div className="title">
        <h1>AI Resume Helper</h1>
        <span className="badge">MV3</span>
      </div>

      <div className="grid">
        <div className="panel">
          <h2>Job Description</h2>
          <div className="row" style={{ marginBottom: 8 }}>
            <button className="btn primary" onClick={captureJob} disabled={status.kind === "busy"}>
              Auto-capture from tab
            </button>
            <button
              className="btn"
              onClick={() => chrome.runtime.openOptionsPage()}
              disabled={status.kind === "busy"}
            >
              Settings
            </button>
          </div>

          <div className="meta" style={{ marginBottom: 8 }}>
            {job?.source ? (
              <>
                Captured from <span className="mono">{job.source}</span>
                {job.jobTitle ? <> • {job.jobTitle}</> : null}
                {job.company ? <> • {job.company}</> : null}
              </>
            ) : (
              <>Paste a JD or capture from a job tab.</>
            )}
          </div>

          <div className="field">
            <label>Job description text</label>
            <textarea
              className="textarea"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste Job Description here (or click Auto-capture)."
            />
          </div>
        </div>

        <div className="panel">
          <h2>Candidate Resume</h2>
          <div className="field">
            <label>Resume text</label>
            <textarea
              className="textarea"
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste your current resume text here."
            />
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <button
              className="btn good"
              onClick={tailor}
              disabled={
                status.kind === "busy" ||
                !resumeText.trim() ||
                !jobDescription.trim() ||
                !hasApiConfigured
              }
              title={hasApiConfigured ? "" : "Configure your LLM API in Settings"}
            >
              Generate ATS-optimized resume
            </button>
            <button
              className="btn"
              onClick={() => {
                setResumeText("");
                setTailored(null);
                setAts(null);
              }}
              disabled={status.kind === "busy"}
            >
              Clear
            </button>
          </div>
          {!hasApiConfigured ? (
            <div className="toast">
              Add your API key + endpoint in <span className="mono">Settings</span> to enable tailoring.
            </div>
          ) : null}
        </div>

        <div className="panel">
          <h2>ATS Keyword Match</h2>
          <div className="kv">
            <div className="meta">Estimated match score</div>
            <div>{scorePill ?? <span className="small">Run tailoring to compute.</span>}</div>
          </div>
          <div className="hr" />
          <div className="meta" style={{ marginBottom: 6 }}>
            Missing keywords
          </div>
          <div className="small mono">
            {ats?.missingKeywords?.length ? ats.missingKeywords.slice(0, 40).join(", ") : "—"}
          </div>
        </div>

        <div className="panel">
          <h2>Tailored Resume (Output)</h2>
          <div className="row" style={{ marginBottom: 8 }}>
            <button
              className="btn"
              disabled={!tailored?.resumeMarkdown}
              onClick={() => {
                if (!tailored?.resumeMarkdown) return;
                void navigator.clipboard.writeText(tailored.resumeMarkdown);
              }}
            >
              Copy
            </button>
            <button
              className="btn"
              disabled={!tailored?.resumeMarkdown}
              onClick={() => {
                if (!tailored?.resumeMarkdown) return;
                void (async () => {
                  const { exportResumeAsPdf } = await import("../utils/export");
                  await exportResumeAsPdf(tailored.resumeMarkdown, job?.jobTitle ?? "Tailored Resume");
                })();
              }}
            >
              Download PDF
            </button>
            <button
              className="btn"
              disabled={!tailored?.resumeMarkdown}
              onClick={() => {
                if (!tailored?.resumeMarkdown) return;
                void (async () => {
                  const { exportResumeAsDocx } = await import("../utils/export");
                  await exportResumeAsDocx(tailored.resumeMarkdown, job?.jobTitle ?? "Tailored Resume");
                })();
              }}
            >
              Download DOCX
            </button>
          </div>
          <textarea
            className="textarea"
            value={tailored?.resumeMarkdown ?? ""}
            readOnly
            placeholder="Your tailored resume will appear here in the required format."
          />
        </div>

        <div className="panel">
          <h2>Saved Versions</h2>
          <div className="row" style={{ marginBottom: 8 }}>
            <button
              className="btn"
              onClick={async () => {
                const h = await runtimeSend<HistoryEntry[]>({ type: "GET_HISTORY" });
                if (h.ok) setHistory(h.data);
              }}
              disabled={status.kind === "busy"}
            >
              Refresh
            </button>
            <button
              className="btn danger"
              onClick={async () => {
                await runtimeSend<{ cleared: true }>({ type: "CLEAR_HISTORY" });
                const h = await runtimeSend<HistoryEntry[]>({ type: "GET_HISTORY" });
                if (h.ok) setHistory(h.data);
              }}
              disabled={status.kind === "busy"}
            >
              Clear history
            </button>
          </div>

          {history.length ? (
            <div style={{ display: "grid", gap: 8 }}>
              {history.slice(0, 8).map((e) => (
                <div key={e.id} className="panel" style={{ padding: 10, background: "rgba(0,0,0,0.18)" }}>
                  <div className="meta" style={{ marginBottom: 6 }}>
                    <span className="mono">
                      {(e.job.jobTitle || "Job") + (e.job.company ? ` • ${e.job.company}` : "")}
                    </span>
                    {" • "}
                    {new Date(e.createdAt).toLocaleString()}
                    {" • "}
                    <span className="mono">{Math.round(e.ats.matchPercent)}%</span>
                  </div>
                  <div className="row">
                    <button
                      className="btn"
                      onClick={() => {
                        setJob({
                          source: e.job.source,
                          url: e.job.url,
                          jobTitle: e.job.jobTitle,
                          company: e.job.company,
                          location: e.job.location,
                          jobDescriptionText: e.jobDescriptionText,
                          capturedAt: e.job.capturedAt
                        });
                        setJobDescription(e.jobDescriptionText);
                        setResumeText(e.originalResumeText);
                        setTailored(e.tailored);
                        setAts(e.ats);
                      }}
                    >
                      Load
                    </button>
                  </div>
                </div>
              ))}
              <div className="small">Showing latest 8 entries.</div>
            </div>
          ) : (
            <div className="small">No saved versions yet.</div>
          )}
        </div>

        {status.kind === "busy" ? (
          <div className="toast">{status.label}</div>
        ) : status.kind === "error" ? (
          <div className="toast" style={{ borderColor: "rgba(239, 68, 68, 0.6)" }}>
            {status.message}
          </div>
        ) : null}

        <div className="small">
          Privacy mode is controlled in Settings. When enabled, job/resume history is kept only for this
          browser session.
        </div>
      </div>
    </div>
  );
}

