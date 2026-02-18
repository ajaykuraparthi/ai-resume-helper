import type { RuntimeRequest, RuntimeResponse } from "../../shared/types";

export function runtimeSend<T>(req: RuntimeRequest): Promise<RuntimeResponse<T>> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(req, (resp: RuntimeResponse<T>) => {
      const err = chrome.runtime.lastError;
      if (err) return resolve({ ok: false, error: err.message || "Unknown runtime error" });
      resolve(resp);
    });
  });
}

