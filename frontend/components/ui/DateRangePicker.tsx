"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { CalendarDays } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface DateRange {
  start: Date;
  end: Date;
}

interface Preset {
  label: string;
  range: () => DateRange;
}

const PRESETS: Preset[] = [
  {
    label: "Hoje",
    range: () => ({ start: startOfDay(new Date()), end: new Date() }),
  },
  {
    label: "Últimas 24h",
    range: () => ({ start: subDays(new Date(), 1), end: new Date() }),
  },
  {
    label: "Últimos 7 dias",
    range: () => ({ start: subDays(new Date(), 7), end: new Date() }),
  },
  {
    label: "Últimos 30 dias",
    range: () => ({ start: subDays(new Date(), 30), end: new Date() }),
  },
];

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);

  const label = `${format(value.start, "dd/MM/yy", { locale: ptBR })} — ${format(value.end, "dd/MM/yy", { locale: ptBR })}`;

  return (
    <div className={clsx("relative", className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "inline-flex items-center gap-2 h-9 px-3 text-sm rounded-[var(--radius-sm)]",
          "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]",
          "hover:bg-[var(--color-surface-2)] transition-colors"
        )}
      >
        <CalendarDays size={14} className="text-[var(--color-text-muted)]" />
        {label}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className={clsx(
              "absolute right-0 top-full mt-1 z-50 w-48",
              "bg-[var(--color-surface)] border border-[var(--color-border)]",
              "rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] py-1"
            )}
          >
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => {
                  onChange(preset.range());
                  setOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition-colors"
              >
                {preset.label}
              </button>
            ))}
            <div className="border-t border-[var(--color-border)] mt-1 pt-1 px-4 pb-2">
              <p className="text-[10px] text-[var(--color-text-muted)] font-medium mb-1">
                Personalizado
              </p>
              <input
                type="date"
                defaultValue={format(value.start, "yyyy-MM-dd")}
                onChange={(e) =>
                  onChange({ ...value, start: startOfDay(new Date(e.target.value)) })
                }
                className="w-full text-xs border border-[var(--color-border)] rounded px-2 py-1 mb-1 bg-[var(--color-surface)] text-[var(--color-text)]"
              />
              <input
                type="date"
                defaultValue={format(value.end, "yyyy-MM-dd")}
                onChange={(e) =>
                  onChange({ ...value, end: endOfDay(new Date(e.target.value)) })
                }
                className="w-full text-xs border border-[var(--color-border)] rounded px-2 py-1 bg-[var(--color-surface)] text-[var(--color-text)]"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
