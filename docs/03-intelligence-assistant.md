# Section 3: Intelligence Assistant

**Menu Item:** Intelligence Assistant  
**Route:** `/intelligence`  
**Category:** Pipelines & Match

---

## 1. Overview & Purpose

The **Intelligence Assistant** is a dedicated AI analytics and decision-support conversational partner. Unlike generic LLMs that hallucinate statistics, this assistant operates under **strict ground-truth determinism**:
- Every conversion rate, stage count, bottleneck metric, and company reference is computed directly from the candidate's MongoDB records by the deterministic **Analytics Engine**.
- The LLM's role is strictly to synthesize, explain, and strategize based on verifiable facts.

---

## 2. Code File Structure

| File Path | Role / Layer | Description |
|-----------|--------------|-------------|
| [`src/app/intelligence/page.js`](file:///Users/anikethreddy/Documents/FSD-project/careerflow/src/app/intelligence/page.js) | Frontend View (Client) | Full-featured conversational interface with funnel KPI overview, mode filter pills, starter query chips, matching application cards, suggested follow-ups, and rich markdown formatting. |
| [`src/app/api/intelligence/snapshot/route.js`](file:///Users/anikethreddy/Documents/FSD-project/careerflow/src/app/api/intelligence/snapshot/route.js) | Backend API (REST) | `GET`: Returns real-time deterministic analytics snapshot (funnel stages, conversion rates, role performances, source channels, stale applications). |
| [`src/app/api/intelligence/chat/route.js`](file:///Users/anikethreddy/Documents/FSD-project/careerflow/src/app/api/intelligence/chat/route.js) | Backend API (REST) | `POST`: Receives query message & history, queries the analytics engine, sends ground-truth context to Groq LLM, and returns structured response. |
| [`src/lib/intelligence/analyticsEngine.js`](file:///Users/anikethreddy/Documents/FSD-project/careerflow/src/lib/intelligence/analyticsEngine.js) | Analytics Engine | Pure deterministic mathematical computation of: <br>• Stage conversion percentages<br>• Average days in each stage<br>• Role-by-role interview rates<br>• Source platform effectiveness (LinkedIn vs Referrals vs Portals)<br>• Stale application detector (>14 days without recruiter update) |
| [`src/lib/intelligence/chatbotEngine.js`](file:///Users/anikethreddy/Documents/FSD-project/careerflow/src/lib/intelligence/chatbotEngine.js) | LLM Orchestrator | Assembles prompt with strict system instructions, attaches deterministic snapshot, invokes Groq JSON mode, and extracts formatted reply + suggested follow-ups. |
| [`src/components/FormattedMarkdown.js`](file:///Users/anikethreddy/Documents/FSD-project/careerflow/src/components/FormattedMarkdown.js) | UI Component | Rich markdown parser & renderer supporting headers, bold text, bullet points, numbered steps, copyable code blocks, and tables. |

---

## 3. Key Capabilities & Modes

### 3.1 Mode Filters
1. **Query Data (`query`)**: Directly queries active applications, status changes, stale jobs, or specific platforms (e.g. *"Show my active Full Stack jobs on LinkedIn"*).
2. **Analyze Funnel (`analyze`)**: Computes drop-offs between Applied $\rightarrow$ Assessment $\rightarrow$ Interview $\rightarrow$ Offer.
3. **Strategic Advice (`decide`)**: Generates prioritized action plans based on candidate's strongest converting channels and roles.

### 3.2 Weekly Job Search Report
When requested, the assistant automatically compiles a structured executive briefing:
- Summary of applications submitted & active
- Stage transition velocity
- Highlighting stale applications requiring outreach
- Strategic recommendations for the upcoming week

---

## 4. Architecture & Ground-Truth Enforcement

```mermaid
graph TD
    A[User Prompt in /intelligence] --> B[/api/intelligence/chat API]
    B --> C[analyticsEngine.js]
    C -->|Query Applications & Status| D[(MongoDB Database)]
    D -->|Raw Records| C
    C -->|Deterministic Snapshot & Facts| E[chatbotEngine.js]
    E -->|Ground Truth Context + History| F[Groq LLM / Llama 3]
    F -->|Structured JSON Response| E
    E -->|Reply + Follow-Ups + App Results| B
    B -->|JSON Response| A
    A --> G[FormattedMarkdown Component]
    G --> H[Rendered Rich UI with Cards & Follow-Up Pills]
```
