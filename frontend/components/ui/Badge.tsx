import { clsx } from "clsx";

type Variant = "ok" | "warning" | "critical" | "info" | "neutral" | "muted";

interface BadgeProps {
  variant?: Variant;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

const variants: Record<Variant, string> = {
  ok:       "bg-green-100  text-green-800  dark:bg-green-900/30  dark:text-green-400",
  warning:  "bg-amber-100  text-amber-800  dark:bg-amber-900/30  dark:text-amber-400",
  critical: "bg-red-100    text-red-800    dark:bg-red-900/30    dark:text-red-400",
  info:     "bg-blue-100   text-blue-800   dark:bg-blue-900/30   dark:text-blue-400",
  neutral:  "bg-gray-100   text-gray-700   dark:bg-gray-800      dark:text-gray-300",
  muted:    "bg-transparent text-[var(--color-text-muted)] border border-[var(--color-border)]",
};

const dotColors: Record<Variant, string> = {
  ok:       "bg-green-500",
  warning:  "bg-amber-500",
  critical: "bg-red-500",
  info:     "bg-blue-500",
  neutral:  "bg-gray-400",
  muted:    "bg-gray-400",
};

export function Badge({ variant = "neutral", dot = false, children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold",
        variants[variant],
        className
      )}
    >
      {dot && (
        <span
          className={clsx("w-1.5 h-1.5 rounded-full shrink-0", dotColors[variant])}
        />
      )}
      {children}
    </span>
  );
}

/** Converte string de status do backend → variante do Badge */
export function statusVariant(status: string): Variant {
  switch (status?.toLowerCase()) {
    case "online":
    case "ok":
    case "success":
    case "sent":
      return "ok";
    case "degraded":
    case "warning":
      return "warning";
    case "down":
    case "offline":
    case "critical":
    case "error":
      return "critical";
    case "pending":
    case "generating":
    case "info":
      return "info";
    default:
      return "neutral";
  }
}
