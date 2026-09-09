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
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#0F172A] placeholder-slate-400 transition focus:border-[#0052CC] focus:outline-none focus:ring-2 focus:ring-[#0052CC]/15";
  const labelClass = "mb-1.5 block text-xs font-semibold text-slate-700";

  if (checkingSession) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#F8FAFC] text-sm text-slate-400 font-sans">
        Loading…
      </div>
    );
  }

  const isLogin = mode === "login";

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] text-[#0F172A] font-sans">
      <header className="border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0052CC] text-sm font-bold text-white shadow-sm shadow-[#0052CC]/25">
              C
            </span>
            <span className="text-base font-bold tracking-tight text-[#0F172A]">
              CareerFlow<span className="text-[#0052CC]"> AI</span>
            </span>
          </Link>
          <Link
            href="/"
            className="text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            ← Back to Home
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50/80 px-3 py-0.5 text-xs font-semibold text-[#0052CC] mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0052CC]" />
            CareerFlow Portal
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0F172A]">
            {isLogin ? "Welcome Back" : "Create Your Account"}
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-[#64748B]">
            {isLogin
              ? "Sign in to access your applications and autonomous agent."
              : "Start tracking job applications autonomously in seconds."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {!isLogin && (
              <div>
                <label className={labelClass} htmlFor="name">
                  Full Name
                </label>
                <input
                  id="name"
                  className={inputClass}
                  placeholder="Your Name"
                  value={form.name}
                  onChange={update("name")}
                  autoComplete="name"
                />
              </div>
            )}
            <div>
              <label className={labelClass} htmlFor="email">
                Email Address <span className="text-rose-500">*</span>
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
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-800">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-[#0052CC] px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-[#0052CC]/25 transition hover:bg-[#0043A4] hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#0052CC]/30 disabled:opacity-60"
            >
              {submitting
                ? isLogin
                  ? "Signing in…"
                  : "Creating account…"
                : isLogin
                  ? "Sign in to Account →"
                  : "Create Free Account →"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs sm:text-sm text-[#64748B]">
            {isLogin ? "New to CareerFlow? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => switchMode(isLogin ? "register" : "login")}
              className="font-bold text-[#0052CC] hover:underline"
            >
              {isLogin ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}

