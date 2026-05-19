"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

export function HoverPreviewCard({
  children,
  title,
  subtitle,
  stats,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  stats?: { label: string; value: string | number }[];
}) {
  return (
    <TooltipProvider delay={300}>
      <Tooltip>
        <TooltipTrigger
          render={<span className="cursor-default" />}
        >
          {children}
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          align="start"
          sideOffset={6}
          className="w-56 p-0 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
        >
          <div className="p-2.5">
            <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 truncate">
              {title}
            </p>
            {subtitle && (
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                {subtitle}
              </p>
            )}
            {stats && stats.length > 0 && (
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                {stats.map((stat) => (
                  <div key={stat.label}>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">
                      {stat.label}
                    </p>
                    <p className="text-[12px] font-medium text-gray-700 dark:text-gray-300">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
