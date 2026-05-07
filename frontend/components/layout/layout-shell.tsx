"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { FloatingActionMenu } from "@/components/ui/floating-action-menu";
import { SmokeBackground } from "@/components/ui/spooky-smoke-animation";
import { Providers } from "@/app/providers";

// ─────────────────────────────────────────────────────────────────────────────
// SMOKE_ENABLED — set to false to remove the smoke background from all pages
// ─────────────────────────────────────────────────────────────────────────────
const SMOKE_ENABLED = true;

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <Providers>
      {/* Smoke background — fixed behind everything, pointer-events off */}
      {SMOKE_ENABLED && (
        <div className="fixed inset-0 z-0 pointer-events-none opacity-30">
          <SmokeBackground smokeColor="#00C2FF" />
        </div>
      )}

      {isLanding ? (
        <div className="relative z-10">{children}</div>
      ) : (
        <div className="relative z-10 flex h-screen overflow-hidden">
          <AppSidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
          <FloatingActionMenu />
        </div>
      )}
    </Providers>
  );
}
