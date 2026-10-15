'use client';

import { useCallback, useSyncExternalStore } from 'react';

// Setters announce changes to this tab only. Other tabs pick a choice up on their
// next load rather than live, so turning the softphone off in one tab can't drop
// a call in another, and turning it on doesn't connect every open tab.
const CHANGE_EVENT = 'spineline:stored-choice';

// Where a choice lives when localStorage won't take it: it still applies, until reload.
const memory = new Map<string, string>();

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

/**
 * A UI choice remembered per browser in localStorage. The server render (and
 * hydration) uses `fallback`, then the stored value takes over, so a remembered
 * choice can't cause a hydration mismatch.
 */
export function useStoredChoice<T extends string>(
  key: string,
  fallback: T,
  allowed: readonly T[]
): [T, (next: T) => void] {
  const read = () => {
    // Memory first: it holds the choice whenever a write failed, even if reads work.
    let stored = memory.get(key);
    if (stored === undefined) {
      try {
        stored = localStorage.getItem(key) ?? undefined;
      } catch {
        // Unreadable storage: fall back below.
      }
    }
    return allowed.find((v) => v === stored) ?? fallback;
  };
  const value = useSyncExternalStore(subscribe, read, () => fallback);
  const set = useCallback(
    (next: T) => {
      try {
        localStorage.setItem(key, next);
        memory.delete(key);
      } catch {
        memory.set(key, next);
      }
      window.dispatchEvent(new Event(CHANGE_EVENT));
    },
    [key]
  );
  return [value, set];
}
