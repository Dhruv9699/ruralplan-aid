import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}) {
  const toneClass = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
    info: "text-info",
  }[tone];

  return (
    <div className="surface-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <p className={cn("mt-2 font-display text-2xl font-semibold sm:text-3xl", toneClass)}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function StatusPill({
  level,
  children,
}: {
  level: "green" | "yellow" | "red" | "blue" | "weather";
  children: ReactNode;
}) {
  const map = {
    green: "bg-success/15 text-success",
    yellow: "bg-warning/20 text-warning-foreground",
    red: "bg-destructive/15 text-destructive",
    blue: "bg-info/15 text-info",
    weather: "bg-accent/25 text-accent-foreground",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        map[level],
      )}
    >
      {children}
    </span>
  );
}
