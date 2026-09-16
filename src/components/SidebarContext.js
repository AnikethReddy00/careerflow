"use client";

import { createContext, useContext, useEffect, useState } from "react";

const SidebarContext = createContext({
  isOpen: true,
  toggleSidebar: () => {},
  openSidebar: () => {},
  closeSidebar: () => {},
});

export function SidebarProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("careerflow-sidebar-open");
      if (stored !== null) {
        setIsOpen(stored === "true");
      } else {
        // Default to open on desktop screens
        setIsOpen(window.innerWidth >= 1024);
      }
    } catch {
      setIsOpen(true);
    }
    setMounted(true);
  }, []);

  // Keyboard shortcut: Cmd+B or Ctrl+B
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleSidebar();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  function toggleSidebar() {
    setIsOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("careerflow-sidebar-open", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  function openSidebar() {
    setIsOpen(true);
    try {
      localStorage.setItem("careerflow-sidebar-open", "true");
    } catch {
      // ignore
    }
  }

  function closeSidebar() {
    setIsOpen(false);
    try {
      localStorage.setItem("careerflow-sidebar-open", "false");
    } catch {
      // ignore
    }
  }

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        toggleSidebar,
        openSidebar,
        closeSidebar,
        mounted,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
