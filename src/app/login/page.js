"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);

  // If already signed in, skip the form and go straight to the dashboard.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!cancelled && res.ok) {
          router.replace("/dashboard");
          return;
        }
      } catch {
        /* not signed in — stay on the login form */
      }
      if (!cancelled) setCheckingSession(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function switchMode(next) {
    setMode(next);
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const endpoint =
        mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        mode === "login"
          ? { email: form.email, password: form.password }
          : { name: form.name, email: form.email, password: form.password };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      router.push("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 transition focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
  const labelClass = "mb-1 block text-xs font-medium text-zinc-600";

  if (checkingSession) {
    return (
      <div className="flex flex-1 items-center justify-center bg-white text-sm text-zinc-400">
        Loading…
      </div>
    );
  }

  const isLogin = mode === "login";

  return (
    <div className="flex flex-1 flex-col bg-white text-zinc-900">
      <header className="mx-auto w-full max-w-5xl px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            C
          </span>
          <span className="text-[15px] font-semibold tracking-tight">
            CareerFlow<span className="text-indigo-600"> AI</span>
          </span>
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 pb-24">
        <h1 className="text-2xl font-semibold tracking-tight">
          {isLogin ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {isLogin
            ? "Sign in to your applications and agent."
            : "Start tracking applications in a minute."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {!isLogin && (
            <div>
              <label className={labelClass} htmlFor="name">
                Name
              </label>
              <input
                id="name"
                className={inputClass}
                placeholder="Your name"
                value={form.name}
                onChange={update("name")}
                autoComplete="name"
              />
            </div>
          )}
          <div>
            <label className={labelClass} htmlFor="email">
              Email <span className="text-rose-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              className={inputClass}
              placeholder="you@example.com"
              value={form.email}
              onChange={update("email")}
              autoComplete="email"
              required
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="password">
              Password <span className="text-rose-500">*</span>
            </label>
            <input
              id="password"
              type="password"
              className={inputClass}
              placeholder={isLogin ? "Your password" : "At least 8 characters"}
              value={form.password}
              onChange={update("password")}
              autoComplete={isLogin ? "current-password" : "new-password"}
              required
            />
          </div>

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60"
          >
            {submitting
              ? isLogin
                ? "Signing in…"
                : "Creating account…"
              : isLogin
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          {isLogin ? "New here? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => switchMode(isLogin ? "register" : "login")}
            className="font-medium text-indigo-600 hover:underline"
          >
            {isLogin ? "Create an account" : "Sign in"}
          </button>
        </p>
      </main>
    </div>
  );
}
