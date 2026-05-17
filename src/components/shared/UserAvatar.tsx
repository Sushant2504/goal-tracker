import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function UserAvatar({
  name,
  size = "sm",
  className,
}: {
  name: string;
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  const sizeClasses = {
    xs: "h-6 w-6 text-[10px]",
    sm: "h-8 w-8 text-xs",
    md: "h-9 w-9 text-sm",
  };

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarFallback className="bg-indigo-100 text-indigo-700 font-semibold">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
