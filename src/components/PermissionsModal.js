"use client";

// The consent popup shown on the home page. For now this is UI only — clicking
// "Grant access" just reports back to the parent. Real Google/Gmail OAuth gets
// wired to this button in a later stage; the copy already describes exactly the
// scopes we'll request so the real flow is a drop-in replacement.

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
    strokeWidth: 1.8,
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="permissions-title"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={onDismiss}
        className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm"
      />

      {/* Card */}
      <div className="relative w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl ring-1 ring-zinc-900/5">
        <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
          Connect your inbox
        </div>

        <h2
          id="permissions-title"
          className="mt-3 text-xl font-semibold tracking-tight text-zinc-900"
        >
          CareerFlow needs two permissions
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
          The agent works by watching your inbox and acting on what it finds.
          Here&apos;s exactly what it will do.
        </p>

        <ul className="mt-5 space-y-3">
          {PERMISSIONS.map((p) => (
            <li
              key={p.title}
              className="flex gap-3 rounded-xl border border-zinc-100 bg-zinc-50/60 p-3.5"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600 ring-1 ring-zinc-900/5">
                <Icon name={p.icon} />
              </span>
              <span>
                <span className="block text-sm font-medium text-zinc-900">
                  {p.title}
                </span>
                <span className="mt-0.5 block text-[13px] leading-relaxed text-zinc-500">
                  {p.body}
                </span>
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] leading-relaxed text-amber-800">
          Nothing is sent without your say-so. New accounts start in
          approval-required mode — the agent drafts, you approve.
        </p>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={onGrant}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Grant access
          </button>
        </div>
      </div>
    </div>
  );
}
