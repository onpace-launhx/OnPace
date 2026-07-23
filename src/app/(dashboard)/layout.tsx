"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // Pages that should occupy full screen without standard sidebar
  const isFullscreenPage = pathname === "/onboarding";

  if (isFullscreenPage) {
    return <div className="min-h-screen bg-surface-secondary">{children}</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface-secondary">
      <Sidebar />
      <div className="flex-1 h-full overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
