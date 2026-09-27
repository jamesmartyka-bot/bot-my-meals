"use client";

import { useRef, useState } from "react";

/**
 * Show `next` immediately, persist it, and fall back to the committed value
 * if that save fails. A newer commit wins over an older in-flight save.
 */
export function useOptimisticValue<T>(
  committed: T,
  persist: (next: T) => Promise<void>,
): { value: T; pending: boolean; commit: (next: T) => void } {
  const [override, setOverride] = useState<{ id: number; value: T } | null>(null);
  const generation = useRef(0);
  const matchesCommitted = override !== null && Object.is(committed, override.value);

  if (matchesCommitted) setOverride(null);

  const commit = (next: T) => {
    const id = ++generation.current;
    setOverride({ id, value: next });
    void persist(next).catch(() => {
      if (generation.current === id) setOverride(null);
    });
  };

  return {
    value: matchesCommitted || override === null ? committed : override.value,
    pending: override !== null && !matchesCommitted,
    commit,
  };
}
