# CareerFlow AI — Architecture & Code Documentation

CareerFlow AI is an end-to-end intelligent career OS and job search automation platform built with **Next.js (App Router)**, **MongoDB / Mongoose**, **Groq / Ollama LLM integration**, and **Playwright browser automation**.

This documentation suite breaks down the entire codebase across the **6 primary application sections** found in the Navigation Menu (Hamburger menu).

---

## 🧭 The 6 Application Sections

| # | Section Name | Route | Primary Purpose | Key Technologies |
|---|--------------|-------|-----------------|------------------|
| **1** | [**Dashboard & Pipeline**](./01-dashboard-pipeline.md) | `/dashboard` | Complete Kanban pipeline tracker, stage transitions, analytics cards, outreach approval queue, and detailed per-application tracking. | React, Next.js, Mongoose, REST APIs |
| **2** | [**Recommended Jobs**](./02-recommended-jobs.md) | `/jobs` | AI-matched tech opportunities across Tier-1, Tier-2, Startups with country/salary filters and direct official job portal links. | Custom Recommendation Engine, Live Job Fetcher |
| **3** | [**Intelligence Assistant**](./03-intelligence-assistant.md) | `/intelligence` | Real-time conversational analytics and decision engine grounded strictly in deterministic database records. | Groq LLM, Analytics Engine, FormattedMarkdown |
| **4** | [**Candidate Profile & Gap Coach**](./04-candidate-profile.md) | `/profile` | Master candidate profile, PDF resume extraction (`unpdf`), and AI Resume vs JD Gap Analyzer & Coach. | `unpdf` Parser, Multi-modal LLM Gap Analysis |
| **5** | [**Browser Assist & Form Autofill**](./05-browser-assist.md) | `/browser` | Playwright-powered autonomous form scanner and autofill assistant with interactive sandbox testing. | Playwright, Heuristic DOM Field Matcher |
| **6** | [**Agent Reasoner Logs & Gmail Sync**](./06-agent-reasoner-logs.md) | `/agent` | Autonomous background agent loop, Google OAuth Gmail sync, AI recruiter email classification, and decision audit logs. | Google OAuth2, Gmail API, Agent Reasoner Loop |

---

## 📁 Repository Structure Overview

```text
careerflow/
├── docs/                           # Comprehensive code documentation for each section
│   ├── README.md                   # This index file
│   ├── 01-dashboard-pipeline.md    # Section 1: Dashboard & Pipeline
│   ├── 02-recommended-jobs.md      # Section 2: Recommended Jobs
│   ├── 03-intelligence-assistant.md# Section 3: Intelligence Assistant
│   ├── 04-candidate-profile.md     # Section 4: Candidate Profile & Gap Coach
│   ├── 05-browser-assist.md        # Section 5: Browser Assist
│   └── 06-agent-reasoner-logs.md   # Section 6: Agent Reasoner Logs
├── src/
│   ├── app/                        # Next.js App Router pages and API routes
│   │   ├── (auth)/login            # Authentication (JWT cookies)
│   │   ├── dashboard/              # Section 1: Pipeline & Detail views
│   │   ├── jobs/                   # Section 2: Job Recommendations
│   │   ├── intelligence/           # Section 3: Conversational Intelligence Chat
│   │   ├── profile/                # Section 4: Candidate Profile & Gap Analyzer
│   │   ├── browser/                # Section 5: Browser Autofill UI
│   │   ├── demo-application/       # Section 5: Sandbox Test Form
│   │   ├── agent/                  # Section 6: Agent Reasoner & Gmail Sync
│   │   └── api/                    # 30+ REST API endpoints
│   ├── components/                 # Reusable UI components & layouts
│   │   ├── AppLayout.js            # Standard layout with collapsible navigation
│   │   ├── AppSidebar.js           # Hamburger menu navigation drawer
│   │   ├── FormattedMarkdown.js    # Markdown renderer with code blocks & syntax highlighting
│   │   ├── NavigationSheet.js      # Hamburger menu toggle button
│   │   └── ThemeProvider.js        # Light / Dark theme system
│   ├── lib/                        # Core business logic, LLM engines, parsers
│   │   ├── agent/                  # Autonomous reasoner cycle & decisions
│   │   ├── browser/                # Playwright automation & autofill logic
│   │   ├── google/                 # OAuth2 and Gmail API clients
│   │   ├── intelligence/           # Deterministic analytics engine & Groq chatbot
│   │   ├── jobs/                   # Live job fetcher & recommendation directory
│   │   ├── llm/                    # Groq, Ollama, OpenRouter JSON generations
│   │   ├── mongodb.js              # Mongoose database connection pool
│   │   ├── pdfParser.js            # In-memory PDF text extraction (`unpdf`)
│   │   └── session.js              # Jose-based stateless JWT session handler
│   └── models/                     # Mongoose database schemas
│       ├── Application.js          # Job Application schema
│       ├── CandidateProfile.js     # User candidate profile schema
│       ├── OutreachLog.js          # Recruiter outreach & follow-up drafts
│       ├── AgentActionLog.js       # Audit logs for autonomous decisions
│       └── User.js                 # User auth and OAuth token storage
```
