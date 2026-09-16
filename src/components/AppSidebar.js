"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSidebar } from "./SidebarContext";
import { useTheme } from "./ThemeProvider";
import {
  FiLayout,
  FiBriefcase,
  FiCpu,
  FiUser,
  FiGlobe,
  FiActivity,
  FiLogOut,
  FiSun,
  FiMoon,
  FiChevronLeft,
  FiZap,
} from "react-icons/fi";

const NAV_GROUPS = [
  {
    category: "Pipelines & Match",
    items: [
      {
        name: "Dashboard & Pipeline",
        href: "/dashboard",
        icon: FiLayout,
        description: "Application tracker & status",
      },
      {
        name: "Recommended Jobs",
        href: "/jobs",
        icon: FiBriefcase,
        description: "AI-matched tech opportunities",
      },
      {
        name: "Intelligence Assistant",
        href: "/intelligence",
        icon: FiCpu,
        description: "Application analytics & chat",
      },
    ],
  },
  {
    category: "Tools & Automation",
    items: [
      {
        name: "Candidate Profile",
        href: "/profile",
        icon: FiUser,
        description: "Skills, experiences & resume",
      },
      {
        name: "Browser Assist",
        href: "/browser",
        icon: FiGlobe,
        description: "Live 2-phase form scanner",
      },
      {
        name: "Agent Reasoner Logs",
        href: "/agent",
        icon: FiActivity,
        description: "Autonomous reasoning audit",
      },
    ],
  },
];

export default function AppSidebar({ user }) {
  const { isOpen, closeSidebar } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <>
      {/* Mobile Backdrop Overlay (only on mobile viewports) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 md:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Push Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex h-full w-64 flex-col justify-between border-r border-slate-200 bg-white p-4 shadow-xl transition-transform duration-300 ease-in-out dark:border-slate-800 dark:bg-[#0B0F19] ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          backgroundColor: theme === "dark" ? "#0B0F19" : "#FFFFFF",
        }}
      >
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Sidebar Top Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0052CC] text-white shadow-sm shadow-[#0052CC]/30">
                <FiZap className="h-4 w-4" />
              </span>
              <span className="text-base font-bold tracking-tight text-[#0F172A] dark:text-white">
                CareerFlow<span className="text-[#0052CC] dark:text-[#2684FF]"> AI</span>
              </span>
            </Link>

            <button
              type="button"
              onClick={closeSidebar}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
              title="Collapse sidebar (⌘B)"
              aria-label="Collapse sidebar"
            >
              <FiChevronLeft className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Items List */}
          <nav className="mt-4 flex-1 space-y-5 overflow-y-auto pr-1">
            {NAV_GROUPS.map((group) => (
              <div key={group.category} className="space-y-1.5">
                <div className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {group.category}
                </div>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`group flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition ${
                          isActive
                            ? "bg-blue-50 text-[#0052CC] font-semibold dark:bg-blue-950/70 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/60 shadow-xs"
                            : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${
                            isActive
                              ? "bg-[#0052CC] text-white"
                              : "bg-slate-100 text-slate-600 group-hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-slate-700 dark:group-hover:text-white"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="truncate">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer with Theme Toggle & User Info */}
        <div className="border-t border-slate-100 pt-3 dark:border-slate-800/80 space-y-2.5">
          {/* Theme Switcher */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
              {theme === "dark" ? (
                <FiMoon className="h-3.5 w-3.5 text-blue-400" />
              ) : (
                <FiSun className="h-3.5 w-3.5 text-amber-500" />
              )}
              <span>{theme === "dark" ? "Dark Theme" : "Light Theme"}</span>
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition"
            >
              Switch
            </button>
          </div>

          {/* User Profile Card */}
          <div
            className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 dark:bg-[#111827] border border-slate-200/60 dark:border-slate-800"
            style={{
              backgroundColor: theme === "dark" ? "#111827" : "#F8FAFC",
            }}
          >
            <div className="min-w-0 pr-2">
              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {user?.name || "Candidate"}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {user?.email || "candidate@careerflow.ai"}
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1 rounded-lg p-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50 transition"
              title="Log out"
            >
              <FiLogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
