import { Loader2 } from "lucide-react";
import { clsx } from "clsx";

interface SpinnerProps {
  size?: number;
  className?: string;
}

export function Spinner({ size = 20, className }: SpinnerProps) {
  return (
    <Loader2
      size={size}
      className={clsx("animate-spin text-[var(--color-primary)]", className)}
    />
  );
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <Spinner size={32} />
    </div>
  );
}

export function InlineSpinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
      <Spinner size={14} />
      {label ?? "Carregando..."}
    </span>
  );
}
