import type { WakeEvent } from "@/lib/bot-wake";

export async function requestBotWake(event: WakeEvent): Promise<boolean> {
  try {
    const response = await fetch("/api/bot/wake", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ event }),
    });
    if (!response.ok) return false;
    const body: unknown = await response.json();
    return body != null && typeof body === "object" && "posted" in body && body.posted === true;
  } catch {
    return false;
  }
}

export async function fetchBotWakeConfigured(): Promise<boolean> {
  try {
    const response = await fetch("/api/bot/wake", { credentials: "same-origin" });
    if (!response.ok) return false;
    const body: unknown = await response.json();
    return body != null && typeof body === "object" && "configured" in body && body.configured === true;
  } catch {
    return false;
  }
}

export async function saveBotWakeSettings(input: {
  url: string;
  key: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const response = await fetch("/api/bot/wake", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        url: input.url,
        ...(input.key.trim() ? { key: input.key } : {}),
      }),
    });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        body != null && typeof body === "object" && "error" in body && typeof body.error === "string"
          ? body.error
          : "Could not save that webhook.";
      return { ok: false, message };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "Could not save that webhook." };
  }
}
