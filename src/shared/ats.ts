import type { AtsReport } from "./types";

const STOPWORDS = new Set(
  [
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "has",
    "have",
    "in",
    "is",
    "it",
    "its",
    "of",
    "on",
    "or",
    "that",
    "the",
    "their",
    "this",
    "to",
    "was",
    "were",
    "will",
    "with",
    "you",
    "your",
    "we",
    "they",
    "our",
    "us",
    "role",
    "roles",
    "responsibilities",
    "responsibility",
    "requirements",
    "required",
    "preferred",
    "experience",
    "skills",
    "ability",
    "strong",
    "good",
    "must",
    "should"
  ].sort()
);

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[\u2019']/g, "'")
    .replace(/[^a-z0-9+.#/\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueKeepOrder(items: string[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    const k = it.toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}

function extractAcronymsAndTechTokens(original: string): string[] {
  const tokens = original.match(/\b[A-Z][A-Za-z0-9.+/#-]{1,}\b/g) ?? [];
  const filtered = tokens
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && t.length <= 24)
    .filter((t) => !STOPWORDS.has(t.toLowerCase()));
  return filtered;
}

function extractTopTerms(text: string, limit = 40): string[] {
  const n = normalize(text);
  const words = n.split(" ").filter((w) => w.length >= 3 && w.length <= 28);
  const freq = new Map<string, number>();
  for (const w of words) {
    if (STOPWORDS.has(w)) continue;
    if (/^\d+$/.test(w)) continue;
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
  return sorted.slice(0, limit).map(([w]) => w);
}

function extractPhraseKeywords(text: string): string[] {
  const phrases: string[] = [];
  const n = normalize(text);
  const patterns: Array<[RegExp, string]> = [
    [/\brest api(s)?\b/g, "REST APIs"],
    [/\bapi design\b/g, "API design"],
    [/\bsystem design\b/g, "System design"],
    [/\bunit testing\b/g, "Unit testing"],
    [/\bintegration testing\b/g, "Integration testing"],
    [/\btest automation\b/g, "Test automation"],
    [/\bcontinuous integration\b/g, "Continuous integration"],
    [/\bcontinuous delivery\b/g, "Continuous delivery"],
    [/\bcode review(s)?\b/g, "Code reviews"],
    [/\bagile\b/g, "Agile"],
    [/\bscrum\b/g, "Scrum"],
    [/\bstakeholder management\b/g, "Stakeholder management"],
    [/\bcross functional\b/g, "Cross-functional collaboration"],
    [/\bperformance optimization\b/g, "Performance optimization"],
    [/\bdata structures\b/g, "Data structures"],
    [/\balgorithm(s)?\b/g, "Algorithms"]
  ];
  for (const [re, label] of patterns) {
    if (re.test(n)) phrases.push(label);
  }
  return phrases;
}

export function buildAtsReport(jobDescription: string, resume: string): AtsReport {
  const jd = jobDescription ?? "";
  const res = resume ?? "";
  const jdOriginal = jd;

  const extracted = uniqueKeepOrder([
    ...extractPhraseKeywords(jdOriginal),
    ...extractAcronymsAndTechTokens(jdOriginal),
    ...extractTopTerms(jdOriginal, 60)
  ]).slice(0, 80);

  const resumeNorm = normalize(res);
  const extractedNorm = extracted.map((k) => normalize(k));

  const matchedIdx = extractedNorm
    .map((k, i) => ({ k, i }))
    .filter(({ k }) => k && resumeNorm.includes(k))
    .map(({ i }) => i);

  const matchedCount = matchedIdx.length;
  const total = extracted.length || 1;
  const matchPercent = Math.max(0, Math.min(100, (matchedCount / total) * 100));

  const missingKeywords = extracted.filter((_, i) => !matchedIdx.includes(i));

  return {
    matchPercent,
    missingKeywords: missingKeywords.slice(0, 80),
    extractedKeywords: extracted
  };
}

