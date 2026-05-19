import { cn } from "@/lib/utils";

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconClassName,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ElementType;
  iconClassName?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-800 px-4 py-3 card-hover">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-medium text-gray-500 uppercase tracking-wide">
          {title}
        </p>
        {Icon && (
          <div
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md",
              iconClassName || "bg-gray-100"
            )}
          >
            <Icon className="h-3.5 w-3.5 text-gray-600" />
          </div>
        )}
      </div>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {subtitle && (
        <p className="mt-0.5 text-[11px] text-gray-400">{subtitle}</p>
      )}
    </div>
  );
}
