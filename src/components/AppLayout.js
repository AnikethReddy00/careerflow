"use client";

import { useSidebar } from "./SidebarContext";
import AppSidebar from "./AppSidebar";

export default function AppLayout({ children, user }) {
  const { isOpen } = useSidebar();

  return (
    <div className="relative min-h-screen bg-[#F8FAFC] text-[#0F172A] dark:bg-[#0B0F19] dark:text-[#F8FAFC] font-sans antialiased">
      {/* Push Sidebar */}
      <AppSidebar user={user} />

      {/* Main Content Area — Smoothly slides right when sidebar opens and expands left when closed */}
      <div
        className={`flex min-h-screen flex-1 flex-col transition-all duration-300 ease-in-out ${
          isOpen ? "md:pl-64" : "md:pl-0"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
