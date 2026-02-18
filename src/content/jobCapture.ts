import type { JobCaptureResult } from "../shared/types";

type CaptureMessage = { type: "CAPTURE_JD" };

chrome.runtime.onMessage.addListener((msg: CaptureMessage, _sender, sendResponse) => {
  if (!msg || msg.type !== "CAPTURE_JD") return;
  const res = captureOnKnownSites();
  sendResponse(res);
});

function captureOnKnownSites(): JobCaptureResult {
  const url = location.href;
  const isLinkedIn = /linkedin\.com/i.test(url);
  const isNaukri = /naukri\.com/i.test(url);

  const source: JobCaptureResult["source"] = isLinkedIn ? "linkedin" : isNaukri ? "naukri" : "unknown";

  const selectors = isLinkedIn
    ? [
        ".jobs-description__content",
        ".jobs-box__html-content",
        ".show-more-less-html__markup",
        "#job-details"
      ]
    : isNaukri
      ? ["section.job-desc", "[class*='JDC']", "[class*='dang-inner-html']", "#jobDescriptionText"]
      : ["main", "article"];

  const candidates: Element[] = [];
  for (const sel of selectors) document.querySelectorAll(sel).forEach((el) => candidates.push(el));

  const textOf = (el: Element | null | undefined) =>
    ((el as HTMLElement | null)?.innerText || el?.textContent || "").trim();

  let best = "";
  for (const el of candidates) {
    const t = textOf(el).replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    if (t.length > best.length) best = t;
  }

  if (best.length < 300) {
    const t = document.body?.innerText?.trim() ?? "";
    best = t.slice(0, 12000);
  }

  const jobTitle =
    (document.querySelector("h1")?.textContent ?? "").trim() ||
    (document.title ?? "").trim() ||
    undefined;

  const company =
    (document.querySelector("[data-company-name]")?.textContent ?? "").trim() ||
    (document.querySelector("[class*='company']")?.textContent ?? "").trim() ||
    undefined;

  const jobLocation =
    (document.querySelector("[data-job-location]")?.textContent ?? "").trim() ||
    (document.querySelector("[class*='location']")?.textContent ?? "").trim() ||
    undefined;

  return {
    source,
    url,
    jobTitle,
    company,
    location: jobLocation,
    jobDescriptionText: best,
    capturedAt: Date.now()
  };
}

