"use client";

import { useSidebar } from "./SidebarContext";
import { FiMenu } from "react-icons/fi";

export default function NavigationSheet({ className = "" }) {
  const { toggleSidebar, isOpen } = useSidebar();

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-xs transition duration-150 hover:bg-slate-100 hover:text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#0052CC]/30 dark:border-slate-800 dark:bg-[#111827] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white ${className}`}
      title={isOpen ? "Collapse menu (⌘B)" : "Expand menu (⌘B)"}
      aria-label="Toggle navigation menu"
    >
      <FiMenu className="h-4.5 w-4.5" />
    </button>
  );
}
