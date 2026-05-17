"use client";

import { useEffect } from "react";

type ShortcutMap = Record<string, (e: KeyboardEvent) => void>;

function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  if (tagName === "input" || tagName === "textarea" || tagName === "select") {
    return true;
  }
  if (target.isContentEditable) return true;
  return false;
}

function parseCombo(combo: string): {
  key: string;
  mod: boolean;
  shift: boolean;
  alt: boolean;
} {
  const parts = combo.toLowerCase().split("+");
  const key = parts[parts.length - 1];
  const mod = parts.includes("mod");
  const shift = parts.includes("shift");
  const alt = parts.includes("alt");
  return { key, mod, shift, alt };
}

function matchesCombo(
  e: KeyboardEvent,
  combo: { key: string; mod: boolean; shift: boolean; alt: boolean }
): boolean {
  const isMac =
    typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
  const modPressed = isMac ? e.metaKey : e.ctrlKey;

  if (combo.mod && !modPressed) return false;
  if (!combo.mod && modPressed) return false;
  if (combo.shift && !e.shiftKey) return false;
  if (!combo.shift && e.shiftKey) return false;
  if (combo.alt && !e.altKey) return false;
  if (!combo.alt && e.altKey) return false;

  return e.key.toLowerCase() === combo.key;
}

export function useKeyboardShortcuts(shortcuts: ShortcutMap): void {
  useEffect(() => {
    const parsed = Object.entries(shortcuts).map(([combo, callback]) => ({
      combo: parseCombo(combo),
      callback,
    }));

    function handler(e: KeyboardEvent) {
      for (const { combo, callback } of parsed) {
        // Allow mod+key shortcuts even when focused on inputs
        if (!combo.mod && isInputElement(e.target)) continue;

        if (matchesCombo(e, combo)) {
          e.preventDefault();
          callback(e);
          return;
        }
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shortcuts]);
}
