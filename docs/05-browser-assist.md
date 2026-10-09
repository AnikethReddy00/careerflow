# Section 5: Browser Assist & Form Autofill

**Menu Item:** Browser Assist  
**Routes:** `/browser`, `/demo-application`  
**Category:** Tools & Automation

---

## 1. Overview & Purpose

The **Browser Assist** section provides an autonomous browser automation system powered by **Playwright**. It navigates to live job application pages, inspects the DOM, maps input fields to the candidate's profile data, and fills out the form automatically.

### Two-Phase Intelligent Workflow:
1. **Phase 1: Form Inspection & Field Detection**:
   - Launches a headless browser instance.
   - Navigates to the target job application URL.
   - Scans DOM input elements (`input`, `select`, `textarea`, `radio`, `checkbox`).
   - Identifies field semantics (First Name, Email, Phone, LinkedIn URL, Experience, Salary, Visa Status, Resume Upload).
   - Generates confidence scores and field preview mappings.
2. **Phase 2: Autonomous Form Autofill & Verification**:
   - Matches candidate profile fields with detected form inputs.
   - Types values with realistic human keystroke intervals.
   - Captures real-time screenshots of the filled form for candidate review before final submission.

---

## 2. Code File Structure

| File Path | Role / Layer | Description |
|-----------|--------------|-------------|
| [`src/app/browser/page.js`](file:///Users/anikethreddy/Documents/FSD-project/careerflow/src/app/browser/page.js) | Frontend View (Client) | URL input form, Phase 1 Field Detection summary, Phase 2 Autofill execution button, live progress indicators, and screenshot visualizer. |
| [`src/app/demo-application/page.js`](file:///Users/anikethreddy/Documents/FSD-project/careerflow/src/app/demo-application/page.js) | Sandbox Test Form | Comprehensive mock job application form with standard recruiter fields for risk-free local testing of the autofill engine. |
| [`src/app/api/browser/route.js`](file:///Users/anikethreddy/Documents/FSD-project/careerflow/src/app/api/browser/route.js) | Backend API (REST) | `POST`: Orchestrates Playwright browser tasks (`inspect`, `autofill`, `screenshot`). |
| [`src/app/api/extract/job/route.js`](file:///Users/anikethreddy/Documents/FSD-project/careerflow/src/app/api/extract/job/route.js) | Backend API (REST) | `POST`: Scrapes job postings from raw URLs and structures role details with Groq LLM. |
| [`src/lib/browser/autofill.js`](file:///Users/anikethreddy/Documents/FSD-project/careerflow/src/lib/browser/autofill.js) | Automation Core | Playwright controller containing DOM selectors, field taxonomy heuristics, typing simulations, and screenshot encoders. |
| [`src/lib/browser/manager.js`](file:///Users/anikethreddy/Documents/FSD-project/careerflow/src/lib/browser/manager.js) | Browser Lifecycle | Manages Chromium browser contexts, concurrency limits, page timeouts, and resource cleanup. |
| [`src/lib/llm/jobExtraction.js`](file:///Users/anikethreddy/Documents/FSD-project/careerflow/src/lib/llm/jobExtraction.js) | LLM Parser | Parses unstructured job posting HTML into clean JSON format. |

---

## 3. Supported Form Fields & Heuristic Matchers

| Field Type | Candidate Profile Source | Heuristic Selectors / Attributes |
|------------|--------------------------|----------------------------------|
| **Full Name / First / Last** | `personal.firstName`, `lastName` | `name*="first"`, `name*="last"`, `autocomplete="given-name"` |
| **Email Address** | `personal.email` | `type="email"`, `name*="email"`, `autocomplete="email"` |
| **Phone Number** | `personal.phone` | `type="tel"`, `name*="phone"`, `autocomplete="tel"` |
| **Location / City** | `personal.location` | `name*="city"`, `name*="location"`, `placeholder*="city"` |
| **LinkedIn URL** | `links.linkedin` | `name*="linkedin"`, `placeholder*="linkedin.com"` |
| **GitHub / Portfolio** | `links.github`, `links.portfolio` | `name*="github"`, `name*="portfolio"`, `name*="website"` |
| **Work Authorization / Visa** | `workAuthorization.status` | `name*="authorized"`, `name*="sponsorship"`, `select[name*="visa"]` |
| **Current / Desired Salary** | `preferences.salaryRange` | `name*="salary"`, `name*="compensation"`, `name*="ctc"` |
| **Years of Experience** | `experience.length` | `name*="experience"`, `name*="years"` |

---

## 4. Browser Automation Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Candidate
    participant UI as /browser UI
    participant API as /api/browser
    participant Manager as Playwright Manager
    participant Target as External Job Application Page

    User->>UI: Enters Target URL & clicks "Scan Form (Phase 1)"
    UI->>API: POST /api/browser { action: "inspect", url: "..." }
    API->>Manager: Launch Chromium & Page
    Manager->>Target: page.goto(url)
    Manager->>Target: Evaluate DOM & detect input fields
    Target-->>Manager: List of input fields & types
    Manager-->>API: { detectedFields: [...], confidence: 92% }
    API-->>UI: Renders detected form fields for review

    User->>UI: Reviews mapping & clicks "Autofill Form (Phase 2)"
    UI->>API: POST /api/browser { action: "autofill", url: "...", profileData }
    API->>Manager: Execute keystroke typing & selections
    Manager->>Target: type(field, profileValue, { delay: 30 })
    Manager->>Target: page.screenshot({ fullPage: true })
    Target-->>Manager: Base64 Screenshot Image
    Manager-->>API: { success: true, filledCount: 8, screenshot: "data:image/png;base64,..." }
    API-->>UI: Displays success confirmation + visual screenshot proof
```
