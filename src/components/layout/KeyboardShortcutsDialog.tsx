"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type ShortcutEntry = {
  keys: string[];
  description: string;
};

type ShortcutSection = {
  title: string;
  shortcuts: ShortcutEntry[];
};

const SHORTCUT_SECTIONS: ShortcutSection[] = [
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["D"], description: "Dashboard" },
      { keys: ["B"], description: "Board" },
    ],
  },
  {
    title: "Actions",
    shortcuts: [
      { keys: ["?"], description: "Show shortcuts" },
      { keys: ["⌘", "K"], description: "Command palette" },
    ],
  },
  {
    title: "List Navigation",
    shortcuts: [
      { keys: ["J"], description: "Next item" },
      { keys: ["K"], description: "Previous item" },
      { keys: ["↵"], description: "Open item" },
    ],
  },
  {
    title: "Panels",
    shortcuts: [
      { keys: ["Esc"], description: "Close panel/dialog" },
    ],
  },
];

export function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false);

  // Listen for "?" keydown
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target;
        if (
          target instanceof HTMLElement &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.tagName === "SELECT" ||
            target.isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Listen for custom event
  useEffect(() => {
    function handleCustomOpen() {
      setOpen(true);
    }
    window.addEventListener("open-shortcuts", handleCustomOpen);
    return () => window.removeEventListener("open-shortcuts", handleCustomOpen);
  }, []);

  return (
    <Dialog open={open} onOpenChange={(value) => setOpen(value)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Navigate quickly using these keyboard shortcuts.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          {SHORTCUT_SECTIONS.map((section) => (
            <div key={section.title}>
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                {section.title}
              </h4>
              <div className="space-y-1.5">
                {section.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.description}
                    className="flex items-center justify-between"
                  >
                    <span className="text-[13px] text-gray-600 dark:text-gray-300">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {shortcut.keys.map((key, i) => (
                        <kbd
                          key={i}
                          className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-gray-200 bg-gray-50 px-1.5 text-[10px] font-medium text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
