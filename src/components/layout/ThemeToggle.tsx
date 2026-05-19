"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

const themeLabels: Record<string, string> = {
  light: "Light mode",
  dark: "Dark mode",
};

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const Icon = resolvedTheme === "dark" ? Moon : Sun;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
            aria-label={`Theme: ${themeLabels[resolvedTheme || "light"]}`}
          />
        }
      >
        <Icon className="h-4 w-4" />
      </TooltipTrigger>
      <TooltipContent side="bottom">{themeLabels[resolvedTheme || "light"]}</TooltipContent>
    </Tooltip>
  );
}
