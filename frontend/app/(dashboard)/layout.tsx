"use client";

import { SidebarContext, useSidebarState } from "@/lib/hooks/useSidebar";
import { Sidebar } from "@/components/layout/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebar = useSidebarState();

  return (
    <SidebarContext.Provider value={sidebar}>
      <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
        <Sidebar />
        <main
          className="sidebar-offset min-h-screen transition-all duration-300"
          style={{ paddingTop: "var(--topnav-height)" }}
        >
          {children}
        </main>
      </div>
    </SidebarContext.Provider>
  );
}
