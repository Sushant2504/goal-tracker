"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function TopLoadingBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPathRef = useRef(pathname);
  const prevSearchRef = useRef(searchParams.toString());

  useEffect(() => {
    const currentPath = pathname;
    const currentSearch = searchParams.toString();

    // Only trigger on actual navigation changes
    if (
      currentPath === prevPathRef.current &&
      currentSearch === prevSearchRef.current
    ) {
      return;
    }

    prevPathRef.current = currentPath;
    prevSearchRef.current = currentSearch;

    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Start the loading animation
    setVisible(true);
    setProgress(0);

    // Quickly animate to ~80%
    requestAnimationFrame(() => {
      setProgress(80);
    });

    // Complete the animation after a short delay
    timerRef.current = setTimeout(() => {
      setProgress(100);

      // Fade out after reaching 100%
      timerRef.current = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
    }, 400);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [pathname, searchParams]);

  if (!visible && progress === 0) {
    return null;
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] h-[2px] pointer-events-none"
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full bg-blue-600 transition-all duration-300 ease-in-out"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transition:
            progress === 0
              ? "none"
              : progress === 100
                ? "width 200ms ease-in-out, opacity 300ms ease-in-out"
                : "width 300ms ease-in-out",
        }}
      />
    </div>
  );
}
