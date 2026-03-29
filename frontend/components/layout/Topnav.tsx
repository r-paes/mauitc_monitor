"use client";

import { Bell, Sun, Moon, Menu } from "lucide-react";
import { useTheme } from "@/components/layout/Providers";
import { useSidebar } from "@/lib/hooks/useSidebar";

interface TopnavProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  tabs?: React.ReactNode;
}

export function Topnav({ title, subtitle, actions, tabs }: TopnavProps) {
  const { theme, toggle } = useTheme();
  const { toggle: toggleSidebar } = useSidebar();

  return (
    <header
      className="fixed top-0 right-0 z-20 flex flex-col"
      style={{
        left: 0,
        background: "var(--color-topnav-bg)",
        borderBottom: "1px solid var(--color-nav-border)",
      }}
    >
      <div
        className="flex items-center gap-3 px-4 md:px-6"
        style={{
          height: "var(--topnav-height)",
          // Em desktop, recua o topnav para não sobrepor a sidebar
          marginLeft: "var(--sidebar-width)",
        }}
      >
        {/* Hamburger — só mobile */}
        <button
          onClick={toggleSidebar}
          className="md:hidden p-1.5 rounded-md text-[var(--color-sidebar-muted)] hover:text-[var(--color-sidebar-text)] transition-colors"
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>

        {/* Título */}
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-[var(--color-sidebar-text)] truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="hidden sm:block text-[11px] text-[var(--color-sidebar-muted)] truncate">
              {subtitle}
            </p>
          )}
        </div>

        {/* Ações */}
        {actions && (
          <div className="flex items-center gap-2">{actions}</div>
        )}

        {/* Notificações */}
        <button
          className="p-1.5 rounded-md text-[var(--color-sidebar-muted)] hover:text-[var(--color-sidebar-text)] transition-colors"
          aria-label="Notificações"
        >
          <Bell size={18} strokeWidth={1.75} />
        </button>

        {/* Toggle tema */}
        <button
          onClick={toggle}
          className="p-1.5 rounded-md text-[var(--color-sidebar-muted)] hover:text-[var(--color-sidebar-text)] transition-colors"
          aria-label="Alternar tema"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      {/* Tabs secundárias */}
      {tabs && (
        <div
          className="px-4 md:px-6 flex items-center gap-1 border-t border-[var(--color-nav-border)] h-9 overflow-x-auto"
          style={{ marginLeft: "var(--sidebar-width)" }}
        >
          {tabs}
        </div>
      )}
    </header>
  );
}
