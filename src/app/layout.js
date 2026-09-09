import "./globals.css";

export const metadata = {
  title: "CareerFlow AI — Autonomous Job Application Intelligence",
  description:
    "An autonomous AI agent that tracks every job application, watches your inbox for recruiter replies, and drafts follow-ups — so your only job is to apply.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased font-sans">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#F8FAFC] text-[#0F172A] font-sans selection:bg-[#0052CC] selection:text-white">
        {children}
      </body>
    </html>
  );
}


