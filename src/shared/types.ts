export type JobSource = "linkedin" | "naukri" | "unknown";

export type JobCaptureResult = {
  source: JobSource;
  url: string;
  jobTitle?: string;
  company?: string;
  location?: string;
  jobDescriptionText: string;
  capturedAt: number;
};

export type TailorResult = {
  resumeMarkdown: string;
  model?: string;
};

export type AtsReport = {
  matchPercent: number; // 0..100
  missingKeywords: string[];
  extractedKeywords: string[];
};

export type HistoryEntry = {
  id: string;
  createdAt: number;
  job: Pick<JobCaptureResult, "source" | "url" | "jobTitle" | "company" | "location" | "capturedAt">;
  jobDescriptionText: string;
  originalResumeText: string;
  tailored: TailorResult;
  ats: AtsReport;
};

export type RuntimeRequest =
  | { type: "CAPTURE_JD_FROM_ACTIVE_TAB" }
  | { type: "TAILOR_RESUME"; payload: { resumeText: string; jobDescription: string } }
  | { type: "GET_HISTORY" }
  | { type: "CLEAR_HISTORY" };

export type RuntimeResponse<T> = { ok: true; data: T } | { ok: false; error: string };

