"use client";

// The consent popup shown on the home page.
const PERMISSIONS = [
  {
    title: "Read your Gmail",
    body: "Detect recruiter replies — interview invites, assessments, rejections, and offers — and update each application automatically.",
    icon: "inbox",
  },
  {
    title: "Send email on your behalf",
    body: "Draft and send follow-ups for applications that have gone quiet. You choose whether these send automatically or wait for your approval.",
    icon: "send",
  },
];

function Icon({ name }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  if (name === "inbox") {
    return (
      <svg {...common} aria-hidden="true">
        <path d="M22 12h-6l-2 3h-4l-2-3H2" />
        <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
      </svg>
    );
  }
  if (name === "send") {
    return (
      <svg {...common} aria-hidden="true">
        <path d="m22 2-7 20-4-9-9-4 20-7z" />
        <path d="M22 2 11 13" />
      </svg>
    );
  }
  return null;
}

export default function PermissionsModal({ open, onGrant, onDismiss }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans"
      role="dialog"
      aria-modal="true"
      aria-labelledby="permissions-title"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={onDismiss}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />

      {/* Card */}
      <div className="relative w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl border border-slate-200">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200 px-3 py-0.5 text-xs font-semibold text-[#0052CC]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#0052CC]" />
          Connect your inbox
        </div>

        <h2
          id="permissions-title"
          className="text-xl font-extrabold tracking-tight text-[#0F172A]"
        >
          CareerFlow needs two permissions
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-[#64748B]">
          The agent works by watching your inbox and acting on what it finds.
          Here&apos;s exactly what it will do.
        </p>

        <ul className="mt-5 space-y-3">
          {PERMISSIONS.map((p) => (
            <li
              key={p.title}
              className="flex gap-3.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#0052CC] border border-blue-200/60 shadow-sm">
                <Icon name={p.icon} />
              </span>
              <span>
                <span className="block text-xs font-bold text-[#0F172A]">
                  {p.title}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-[#64748B]">
                  {p.body}
                </span>
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-4 rounded-xl bg-amber-50 border border-amber-200/80 px-3.5 py-2.5 text-xs leading-relaxed text-amber-900 font-medium">
          Nothing is sent without your say-so. New accounts start in
          approval-required mode — the agent drafts, you approve.
        </p>

        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={onGrant}
            className="rounded-xl bg-[#0052CC] px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-[#0052CC]/25 transition hover:bg-[#0043A4]"
          >
            Grant access →
          </button>
        </div>
      </div>
    </div>
  );
}

