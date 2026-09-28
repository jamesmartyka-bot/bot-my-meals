"use client";

import { useEffect, useState } from "react";
import { fetchBotWakeConfigured } from "@/lib/bot-wake-client";

export const BOT_WAKE_CONFIGURED_EVENT = "bot-wake-configured";

export function useBotWakeConfigured(override?: boolean): boolean {
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    if (override !== undefined) return;
    let cancelled = false;
    void fetchBotWakeConfigured().then((value) => {
      if (!cancelled) setConfigured(value);
    });
    const onSaved = () => setConfigured(true);
    window.addEventListener(BOT_WAKE_CONFIGURED_EVENT, onSaved);
    return () => {
      cancelled = true;
      window.removeEventListener(BOT_WAKE_CONFIGURED_EVENT, onSaved);
    };
  }, [override]);

  return override ?? configured;
}

export function markBotWakeConfigured(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(BOT_WAKE_CONFIGURED_EVENT));
}
