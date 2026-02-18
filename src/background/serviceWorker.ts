import type { RuntimeRequest, RuntimeResponse, JobCaptureResult, HistoryEntry } from "../shared/types";
import { buildAtsReport } from "../shared/ats";
import { getSettings, appendHistory, loadHistory, clearHistoryEverywhere } from "../shared/storage";
import { tailorResumeWithLLM } from "../shared/llm";

type CaptureMessage = { type: "CAPTURE_JD" };

chrome.runtime.onMessage.addListener((req: RuntimeRequest, _sender, sendResponse) => {
  void (async () => {
    try {
      if (req.type === "CAPTURE_JD_FROM_ACTIVE_TAB") {
        const data = await captureFromActiveTab();
        if (!data) throw new Error("Could not capture job description from the active tab.");
        sendResponse({ ok: true, data } satisfies RuntimeResponse<JobCaptureResult>);
        return;
      }

      if (req.type === "TAILOR_RESUME") {
        const settings = await getSettings();
        if (!settings.llm.apiKey.trim() || !settings.llm.baseUrl.trim()) {
          sendResponse({ ok: false, error: "Configure LLM Base URL + API key in Settings." });
          return;
        }
        const tailored = await tailorResumeWithLLM(
          settings,
          req.payload.resumeText,
          req.payload.jobDescription
        );

        const ats = buildAtsReport(req.payload.jobDescription, tailored.resumeMarkdown);

        const job = await captureFromActiveTab({ allowGeneric: true, allowFailure: true });
        const entry: HistoryEntry = {
          id: crypto.randomUUID(),
          createdAt: Date.now(),
          job: {
            source: job?.source ?? "unknown",
            url: job?.url ?? "",
            jobTitle: job?.jobTitle,
            company: job?.company,
            location: job?.location,
            capturedAt: job?.capturedAt ?? Date.now()
          },
          jobDescriptionText: req.payload.jobDescription,
          originalResumeText: req.payload.resumeText,
          tailored,
          ats
        };
        await appendHistory(entry, settings);

        sendResponse({ ok: true, data: { tailored, ats } });
        return;
      }

      if (req.type === "GET_HISTORY") {
        const settings = await getSettings();
        const entries = await loadHistory(settings);
        sendResponse({ ok: true, data: entries });
        return;
      }

      if (req.type === "CLEAR_HISTORY") {
        await clearHistoryEverywhere();
        sendResponse({ ok: true, data: { cleared: true } });
        return;
      }

      sendResponse({ ok: false, error: "Unknown request" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unexpected error";
      sendResponse({ ok: false, error: msg });
    }
  })();

  return true;
});

async function captureFromActiveTab(opts?: { allowGeneric?: boolean; allowFailure?: boolean }) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) {
    if (opts?.allowFailure) return null;
    throw new Error("No active tab found.");
  }

  const url = tab.url;

  // Try content script first (LinkedIn / Naukri where it is injected).
  try {
    const viaMessage = await new Promise<JobCaptureResult>((resolve, reject) => {
      chrome.tabs.sendMessage(tab.id!, { type: "CAPTURE_JD" } satisfies CaptureMessage, (resp) => {
        const err = chrome.runtime.lastError;
        if (err) return reject(err);
        resolve(resp as JobCaptureResult);
      });
    });
    if (viaMessage?.jobDescriptionText?.trim()) return viaMessage;
  } catch {
    // ignore and fallback
  }

  if (!opts?.allowGeneric) {
    if (opts?.allowFailure) return null;
    throw new Error("This page is not supported for auto-capture. Paste the JD text instead.");
  }

  // Generic capture using activeTab scripting (user-initiated from popup).
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: captureGenericInPage
  });
  if (!result?.jobDescriptionText?.trim()) {
    if (opts?.allowFailure) return null;
    throw new Error("Could not detect a job description on this page.");
  }
  return { ...result, url };
}

function captureGenericInPage(): JobCaptureResult {
  const url = location.href;

  function textOf(el: Element | null | undefined) {
    if (!el) return "";
    return (el as HTMLElement).innerText || el.textContent || "";
  }

  const isLinkedIn = /linkedin\.com/i.test(url);
  const isNaukri = /naukri\.com/i.test(url);

  const source: JobCaptureResult["source"] = isLinkedIn ? "linkedin" : isNaukri ? "naukri" : "unknown";

  const candidates: Element[] = [];
  const selectors = [
    // LinkedIn
    ".jobs-description__content",
    ".jobs-box__html-content",
    ".show-more-less-html__markup",
    // Naukri
    "section.job-desc",
    "[class*='JDC']",
    "[class*='dang-inner-html']",
    "#jobDescriptionText",
    // Generic
    "main",
    "article"
  ];

  for (const sel of selectors) {
    document.querySelectorAll(sel).forEach((el) => candidates.push(el));
  }

  let best = "";
  for (const el of candidates) {
    const t = textOf(el).replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    if (t.length > best.length) best = t;
  }

  // Last-resort fallback.
  if (best.length < 300) {
    const t = document.body?.innerText?.trim() ?? "";
    best = t.slice(0, 12000);
  }

  const title =
    (document.querySelector("h1")?.textContent ?? "").trim() ||
    (document.title ?? "").trim();

  const company =
    (document.querySelector("[data-company-name]")?.textContent ?? "").trim() ||
    (document.querySelector("[class*='company']")?.textContent ?? "").trim();

  const jobLocation =
    (document.querySelector("[data-job-location]")?.textContent ?? "").trim() ||
    (document.querySelector("[class*='location']")?.textContent ?? "").trim();

  return {
    source,
    url,
    jobTitle: title || undefined,
    company: company || undefined,
    location: jobLocation || undefined,
    jobDescriptionText: best,
    capturedAt: Date.now()
  };
}

