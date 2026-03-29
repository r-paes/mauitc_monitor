import { clsx } from "clsx";
import type { SelectHTMLAttributes } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  error?: string;
}

export function Select({
  options,
  placeholder,
  label,
  error,
  className,
  ...props
}: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-medium text-[var(--color-text-muted)]">
          {label}
        </label>
      )}
      <select
        {...props}
        className={clsx(
          "h-9 px-3 pr-8 text-sm rounded-[var(--radius-sm)] border border-[var(--color-border)]",
          "bg-[var(--color-surface)] text-[var(--color-text)]",
          "focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          error && "border-[var(--color-critical)]",
          className
        )}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-xs text-[var(--color-critical)]">{error}</p>
      )}
    </div>
  );
}
