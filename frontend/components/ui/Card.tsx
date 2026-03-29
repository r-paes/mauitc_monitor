import { clsx } from "clsx";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddings = {
  none: "",
  sm:   "p-3",
  md:   "p-5",
  lg:   "p-6",
};

export function Card({ children, className, padding = "md" }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-[var(--radius-md)] border border-[var(--color-border)]",
        "bg-[var(--color-surface)] shadow-[var(--shadow-sm)]",
        paddings[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function CardHeader({ title, subtitle, actions }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h2 className="text-sm font-semibold text-[var(--color-text)]">{title}</h2>
        {subtitle && (
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaOk?: boolean;
  icon?: React.ReactNode;
  detail?: React.ReactNode;
}

export function StatCard({ label, value, delta, deltaOk, icon, detail }: StatCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wide">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold text-[var(--color-text)] tabular-nums">
            {value}
          </p>
          {delta && (
            <p
              className={clsx(
                "mt-1 text-xs font-medium",
                deltaOk ? "text-[var(--color-ok)]" : "text-[var(--color-warning)]"
              )}
            >
              {delta}
            </p>
          )}
          {detail && <div className="mt-2">{detail}</div>}
        </div>
        {icon && (
          <div className="p-2 rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] text-[var(--color-primary)] shrink-0">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
