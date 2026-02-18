import { z } from "zod";
import type { HistoryEntry } from "./types";

const SettingsSchema = z.object({
  llm: z
    .object({
      baseUrl: z.string().default("https://api.openai.com"),
      apiKey: z.string().default(""),
      model: z.string().default("gpt-4.1-mini"),
      temperature: z.number().min(0).max(2).default(0.2)
    })
    .default({}),
  privacyMode: z.boolean().default(true),
  history: z
    .object({
      maxEntries: z.number().int().min(1).max(200).default(20),
      retentionDays: z.number().int().min(1).max(365).default(30)
    })
    .default({})
});

export type Settings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS: Settings = SettingsSchema.parse({});

const SETTINGS_KEY = "settings";
const HISTORY_KEY = "historyEntries";

function chromeGetLocal<T>(key: string): Promise<T | undefined> {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (res) => resolve(res[key] as T | undefined));
  });
}

function chromeSetLocal(key: string, value: unknown): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, () => resolve());
  });
}

function chromeGetSession<T>(key: string): Promise<T | undefined> {
  return new Promise((resolve) => {
    if (!chrome.storage.session) return resolve(undefined);
    chrome.storage.session.get([key], (res) => resolve(res[key] as T | undefined));
  });
}

function chromeSetSession(key: string, value: unknown): Promise<void> {
  return new Promise((resolve) => {
    if (!chrome.storage.session) return resolve();
    chrome.storage.session.set({ [key]: value }, () => resolve());
  });
}

function chromeRemoveLocal(key: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove([key], () => resolve());
  });
}

function chromeRemoveSession(key: string): Promise<void> {
  return new Promise((resolve) => {
    if (!chrome.storage.session) return resolve();
    chrome.storage.session.remove([key], () => resolve());
  });
}

export async function getSettings(): Promise<Settings> {
  const raw = await chromeGetLocal<unknown>(SETTINGS_KEY);
  const parsed = SettingsSchema.safeParse(raw ?? {});
  if (parsed.success) return parsed.data;
  return DEFAULT_SETTINGS;
}

export async function setSettings(settings: Settings): Promise<void> {
  const parsed = SettingsSchema.parse(settings);
  await chromeSetLocal(SETTINGS_KEY, parsed);
}

export async function loadHistory(settings: Settings): Promise<HistoryEntry[]> {
  const raw = settings.privacyMode
    ? await chromeGetSession<unknown>(HISTORY_KEY)
    : await chromeGetLocal<unknown>(HISTORY_KEY);
  const entries = Array.isArray(raw) ? (raw as HistoryEntry[]) : [];
  return cleanupHistory(entries, settings);
}

export async function saveHistory(entries: HistoryEntry[], settings: Settings): Promise<void> {
  const cleaned = cleanupHistory(entries, settings);
  if (settings.privacyMode) {
    await chromeSetSession(HISTORY_KEY, cleaned);
  } else {
    await chromeSetLocal(HISTORY_KEY, cleaned);
  }
}

export async function appendHistory(entry: HistoryEntry, settings: Settings): Promise<void> {
  const current = await loadHistory(settings);
  const next = [entry, ...current].slice(0, settings.history.maxEntries);
  await saveHistory(next, settings);
}

export async function clearHistoryEverywhere(): Promise<void> {
  await chromeRemoveLocal(HISTORY_KEY);
  await chromeRemoveSession(HISTORY_KEY);
}

function cleanupHistory(entries: HistoryEntry[], settings: Settings): HistoryEntry[] {
  const retentionMs = settings.history.retentionDays * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - retentionMs;
  const filtered = entries
    .filter((e) => e && typeof e.createdAt === "number" && e.createdAt >= cutoff)
    .sort((a, b) => b.createdAt - a.createdAt);
  return filtered.slice(0, settings.history.maxEntries);
}

