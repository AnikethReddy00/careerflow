"use client";

// Client-side auth gate. Any protected page calls this hook: while it checks the
// session it returns { checking: true }; if the user isn't signed in it redirects
// to /login; otherwise it returns the current user. The API routes enforce auth
// on their own too — this is just for a clean UX (no flash of protected content).

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function useRequireAuth() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      const data = await res.json();
      setUser(data.user || null);
    } catch {
      router.replace("/login");
    } finally {
      setChecking(false);
    }
  }, [router]);

  useEffect(() => {
    (async () => {
      await check();
    })();
  }, [check]);

  return { user, checking };
}
