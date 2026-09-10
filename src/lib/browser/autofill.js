import { generateJSON } from "../llm/index.js";

function normalize(str) {
  return String(str || "")
    .replace(/[^\x00-\x7F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Builds candidate profile summary for the LLM.
 */
export function buildCandidateSummary(profile = {}, user = {}) {
  const personal = profile.personal || {};
  const links = profile.links || {};
  const workAuth = profile.workAuthorization || {};
  const preferences = profile.preferences || {};
  const education = (profile.education && profile.education[0]) || {};
  const experience = (profile.experience && profile.experience[0]) || {};
  const skills = Array.isArray(profile.skills) ? profile.skills : [];

  const firstName = personal.firstName || (user.name ? user.name.split(" ")[0] : "Aniketh");
  const lastName = personal.lastName || (user.name && user.name.split(" ").length > 1 ? user.name.split(" ").slice(1).join(" ") : "Reddy");
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || user.name || "Aniketh Reddy";
  const email = personal.email || user.email || "anikethreddy0987@gmail.com";
  const phone = personal.phone || "+91 8143532870";
  const location = personal.location || "Hyderabad, India";
  const linkedin = links.linkedin || "https://linkedin.com/in/jakka-aniketh-reddy";
  const github = links.github || "https://github.com/AnikethReddy00";
  const portfolio = links.portfolio || links.other?.[0] || "https://github.com/AnikethReddy00";

  const university = education.institution || "Amrita Vishwa Vidyapeetham";
  const degree = education.degree || "B.Tech";
  const field = education.field || "Computer Science and Engineering";
  const gradYear = education.endDate ? new Date(education.endDate).getFullYear().toString() : "2027";
  const gpa = education.description?.match(/cgpa[:\s]+([\d.]+)/i)?.[1] || "8.49/10";

  const currentCompany = experience.company || "BNY Mellon";
  const currentTitle = experience.title || "Software Development Engineer Intern";
  const skillsString = skills.length ? skills.join(", ") : "JavaScript, TypeScript, React, Next.js, Node.js, Express.js, MongoDB, Python, SQL";

  const websitesCombined = [github, linkedin].filter(Boolean).join(", ");

  return {
    firstName,
    lastName,
    fullName,
    email,
    phone,
    location,
    city: location.split(",")[0]?.trim() || location,
    address: location,
    linkedin,
    github,
    portfolio,
    websites: websitesCombined,
    university,
    degree,
    major: field,
    gradYear,
    gpa,
    currentCompany,
    currentTitle,
    skills: skillsString,
    workAuthorizationStatus: workAuth.status || "Citizen",
    sponsorshipRequired: workAuth.sponsorshipRequired === true ? "Yes" : "No",
    gender: "Male",
    privacyConsent: "YES",
    referralName: "NA",
    relocation: "YES",
    interviewLanguage: "English",
    englishLevel: "Fluent / Professional",
    japaneseLevel: "None / Basic",
    medicalMentalHealth: "NO",
    disabilities: "NO",
    generalNA: "NA",
    coverLetter: `Dear Hiring Team,\n\nI am excited to apply for this role. With a strong foundation in software engineering (${skillsString.slice(0, 60)}) and practical internship experience building robust applications at ${currentCompany}, I look forward to contributing effectively to your team.\n\nBest regards,\n${fullName}`,
  };
}

/**
 * Stage 1: Extract all DOM form controls across page & child frames.
 */
export async function extractFormControls(page) {
  const frames = [page.mainFrame(), ...page.frames().filter((f) => f !== page.mainFrame())];
  const allControls = [];

  for (let fIdx = 0; fIdx < frames.length; fIdx++) {
    const frame = frames[fIdx];
    try {
      const controls = await frame.evaluate((frameIndex) => {
        const cleanStr = (value) => String(value || "").replace(/\s+/g, " ").trim();
        const isVisible = (el) => {
          if (!el) return false;
          const s = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          return s.display !== "none" && s.visibility !== "hidden" && r.width > 0 && r.height > 0;
        };

        const getContextText = (el) => {
          const parts = [];
          if (el.id) {
            const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
            if (lbl) parts.push(cleanStr(lbl.textContent));
          }
          const wrapLabel = el.closest("label");
          if (wrapLabel) parts.push(cleanStr(wrapLabel.textContent));

          const fieldContainer = el.closest(".field, .form-group, .form-field, fieldset, div[class*='field'], div[class*='group'], div[class*='question'], tr, li");
          if (fieldContainer) {
            const heading = fieldContainer.querySelector("label, legend, h3, h4, h5, .label, [class*='label'], [class*='title'], [class*='heading']");
            if (heading) parts.push(cleanStr(heading.textContent));
            else parts.push(cleanStr(fieldContainer.textContent).slice(0, 150));
          }

          const prev = el.previousElementSibling;
          if (prev) parts.push(cleanStr(prev.textContent));

          return parts.filter(Boolean).join(" | ");
        };

        const elements = Array.from(
          document.querySelectorAll("input:not([type='hidden']), select, textarea, [role='combobox'], [contenteditable='true']")
        ).filter(isVisible);

        return elements.map((el, index) => {
          const type = (el.type || el.tagName).toLowerCase();
          const options = el.tagName === "SELECT"
            ? Array.from(el.options).map((o) => ({ label: cleanStr(o.textContent), value: o.value }))
            : [];

          let labelName = el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent : "";
          if (!labelName) labelName = el.closest("label")?.textContent;
          if (!labelName) labelName = el.getAttribute("aria-label") || el.placeholder || el.name || `Field #${index + 1}`;

          return {
            frameIndex,
            index,
            tagName: el.tagName.toLowerCase(),
            type,
            id: el.id || "",
            name: el.name || "",
            label: cleanStr(labelName).slice(0, 80),
            placeholder: el.placeholder || "",
            ariaLabel: el.getAttribute("aria-label") || "",
            autocomplete: el.getAttribute("autocomplete") || "",
            contextText: getContextText(el),
            currentValue: el.value || "",
            options,
            required: !!el.required,
          };
        });
      }, fIdx);

      if (controls && controls.length) {
        allControls.push(...controls);
      }
    } catch {
      // frame might be detached or cross-origin restricted
    }
  }

  return allControls;
}

/**
 * Stage 2: Deep LLM Reasoning & Planning
 */
export async function planFormAutofillWithLLM(fields, candidate) {
  const actionableFields = fields.filter(
    (f) => !["submit", "button", "reset", "file"].includes(f.type)
  );

  const system = `You are an expert AI Form Autofill Agent for Job Applications.
Analyze each form question on the page and determine the EXACT value and action to fill for the candidate.

RULES:
- For name fields: "First name" -> candidate.firstName ("Aniketh"), "Last name" -> candidate.lastName ("Reddy"), "Full name" -> candidate.fullName ("Aniketh Reddy").
- For contact: "Email" -> candidate.email, "Phone" -> candidate.phone, "Address" / "Location" -> candidate.location.
- For links: "LinkedIn" -> candidate.linkedin, "GitHub" -> candidate.github, "Websites / social media / portfolio" -> candidate.websites.
- For education/experience: "University" -> candidate.university, "Degree" -> candidate.degree, "Current company" -> candidate.currentCompany, "Job title" -> candidate.currentTitle, "Skills" -> candidate.skills.
- For custom screening questions (even bilingual Japanese/English):
  - "Gender" -> "Male"
  - "Privacy policy / terms agreement" -> "YES"
  - "Employment history with company" -> "No"
  - "Applied before" -> "No"
  - "Referral name (or NA)" -> "NA"
  - "Residence status / visa support" -> "Need visa support"
  - "Values / culture review" -> "YES"
  - "Interview language" -> "English"
  - "English ability" -> "Fluent"
  - "Japanese ability" -> "None"
  - "Mental health medical history" -> "NO"
  - "Previous question follow-up" -> "NA"
  - "Disabilities" -> "NO"
  - "Relocation to Japan / country" -> "YES"
  - "Legally authorized" -> "Yes"
  - "Require visa sponsorship" -> candidate.sponsorshipRequired

Return JSON with an array of mappings:
{
  "mappings": [
    {
      "index": 0,
      "fieldLabel": "First name",
      "matchedField": "First Name",
      "value": "Aniketh",
      "action": "type", // "type" | "select" | "check"
      "rationale": "Matched candidate first name"
    }
  ]
}`;

  const prompt = `CANDIDATE DETAILS:
${JSON.stringify(candidate, null, 2)}

FORM FIELDS FOUND ON PAGE:
${JSON.stringify(actionableFields, null, 2)}`;

  try {
    const res = await generateJSON({
      system,
      user: prompt,
      schema: {
        type: "object",
        properties: {
          mappings: {
            type: "array",
            items: {
              type: "object",
              properties: {
                index: { type: "number" },
                fieldLabel: { type: "string" },
                matchedField: { type: "string" },
                value: { type: "string" },
                action: { type: "string" },
                rationale: { type: "string" },
              },
              required: ["index", "matchedField", "value"],
            },
          },
        },
        required: ["mappings"],
      },
    });

    return res?.mappings || [];
  } catch (err) {
    console.warn("LLM form planning fallback:", err.message);
    return null;
  }
}

/**
 * Scans page, runs LLM analysis, and returns the full inspection plan for UI clarity.
 */
export async function scanAndPlanForm({ session, profile, user }) {
  const page = session.page;
  if (!page) throw new Error("No active browser page found.");

  const candidate = buildCandidateSummary(profile, user);
  const fields = await extractFormControls(page);
  const mappings = await planFormAutofillWithLLM(fields, candidate);

  const mappedFieldMap = new Map();
  if (Array.isArray(mappings)) {
    for (const m of mappings) {
      if (typeof m.index === "number") mappedFieldMap.set(m.index, m);
    }
  }

  const items = fields.map((f) => {
    const plan = mappedFieldMap.get(f.index);
    return {
      index: f.index,
      label: f.label || f.name || `Field #${f.index + 1}`,
      type: f.type,
      context: f.contextText?.slice(0, 100),
      currentValue: f.currentValue,
      plannedValue: plan ? plan.value : null,
      matchedField: plan ? plan.matchedField : "Unmatched / Manual",
      action: plan ? plan.action : "none",
      rationale: plan ? plan.rationale : "No automatic candidate match",
      required: f.required,
      status: plan ? "ready_to_fill" : (f.type === "file" ? "file_upload_required" : "manual_review"),
    };
  });

  return {
    pageTitle: await page.title().catch(() => ""),
    pageUrl: page.url(),
    candidateName: candidate.fullName,
    totalFields: fields.length,
    autoFillableCount: items.filter((i) => i.status === "ready_to_fill").length,
    manualReviewCount: items.filter((i) => i.status !== "ready_to_fill").length,
    fields: items,
  };
}

/**
 * Stage 3: 2nd-Check DOM Execution & Value Verification
 */
export async function autofillPage({ session, profile, user, customPlan = null }) {
  const page = session.page;
  if (!page) throw new Error("No active browser page found.");

  const candidate = buildCandidateSummary(profile, user);
  const frames = [page.mainFrame(), ...page.frames().filter((f) => f !== page.mainFrame())];

  const fields = await extractFormControls(page);
  const mappings = customPlan || (await planFormAutofillWithLLM(fields, candidate));

  const mappingMap = new Map();
  if (Array.isArray(mappings)) {
    for (const m of mappings) {
      if (typeof m.index === "number") mappingMap.set(m.index, m);
    }
  }

  const auditLog = [];
  const filled = [];
  const skipped = [];

  for (const field of fields) {
    if (["submit", "button", "reset", "file"].includes(field.type)) {
      continue;
    }

    const plan = mappingMap.get(field.index);
    if (!plan || !plan.value) {
      skipped.push({
        index: field.index,
        label: field.label,
        reason: "No planned value from LLM scan",
      });
      auditLog.push(`[Skip #${field.index + 1}] ${field.label}: Skipped (manual input required)`);
      continue;
    }

    const frame = frames[field.frameIndex] || page.mainFrame();

    try {
      // 2nd check: Inject and verify in live DOM
      const verification = await frame.evaluate(
        ({ index, val, type, tagName }) => {
          const isVis = (el) => {
            if (!el) return false;
            const s = getComputedStyle(el);
            const r = el.getBoundingClientRect();
            return s.display !== "none" && s.visibility !== "hidden" && r.width > 0 && r.height > 0;
          };

          const allControls = Array.from(
            document.querySelectorAll("input:not([type='hidden']), select, textarea, [role='combobox'], [contenteditable='true']")
          ).filter(isVis);

          const el = allControls[index];
          if (!el) return { success: false, error: "Element not found at index" };

          el.scrollIntoView({ behavior: "instant", block: "center" });

          // Controlled React setter
          const setReactValue = (element, nextValue) => {
            const isTextArea = element instanceof HTMLTextAreaElement;
            const proto = isTextArea ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
            const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
            if (descriptor && descriptor.set) {
              descriptor.set.call(element, nextValue);
            } else {
              element.value = nextValue;
            }
            element.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
            element.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
            element.dispatchEvent(new Event("blur", { bubbles: true, composed: true }));
          };

          // Handle Select dropdowns
          if (tagName === "select") {
            const targetStr = String(val).toLowerCase().trim();
            let matchedOpt = Array.from(el.options).find(
              (o) => o.value.toLowerCase() === targetStr || o.textContent.toLowerCase().trim() === targetStr
            );
            if (!matchedOpt) {
              matchedOpt = Array.from(el.options).find(
                (o) => o.textContent.toLowerCase().includes(targetStr) || targetStr.includes(o.textContent.toLowerCase().trim())
              );
            }
            if (!matchedOpt && /yes|authorized|fluent|agree/i.test(targetStr)) {
              matchedOpt = Array.from(el.options).find((o) => /yes|true|auth|fluent|native|agree|c2|c1|professional/i.test(o.textContent));
            }
            if (!matchedOpt && /no|none|na/i.test(targetStr)) {
              matchedOpt = Array.from(el.options).find((o) => /no|none|na|false|beginner|not applicable|outside/i.test(o.textContent));
            }
            if (!matchedOpt && /need visa|support/i.test(targetStr)) {
              matchedOpt = Array.from(el.options).find((o) => /need|support|require|outside|do not have/i.test(o.textContent));
            }
            if (!matchedOpt && /english/i.test(targetStr)) {
              matchedOpt = Array.from(el.options).find((o) => /english/i.test(o.textContent));
            }
            if (!matchedOpt && /male/i.test(targetStr)) {
              matchedOpt = Array.from(el.options).find((o) => /male|prefer not/i.test(o.textContent));
            }

            if (matchedOpt) {
              el.value = matchedOpt.value;
              el.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
              el.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
              return { success: true, verifiedValue: el.options[el.selectedIndex]?.textContent || el.value };
            }
            return { success: false, error: "Matching option not found" };
          }

          // Handle Radios
          if (type === "radio") {
            const targetStr = String(val).toLowerCase();
            const container = el.closest(".field, .form-group, fieldset, div[class*='field'], tr, li") || el.parentElement;
            const siblings = container ? Array.from(container.querySelectorAll("input[type='radio']")) : [el];

            let targetRadio = siblings.find((r) => {
              const label = r.closest("label") || r.nextElementSibling || r.parentElement;
              const text = label ? label.textContent.toLowerCase() : "";
              return text.includes(targetStr) || r.value.toLowerCase() === targetStr;
            });

            if (!targetRadio && /yes|agree/i.test(targetStr)) {
              targetRadio = siblings.find((r) => {
                const txt = (r.closest("label")?.textContent || r.parentElement?.textContent || "").toLowerCase();
                return /yes|agree|true/i.test(txt);
              });
            }
            if (!targetRadio && /no/i.test(targetStr)) {
              targetRadio = siblings.find((r) => {
                const txt = (r.closest("label")?.textContent || r.parentElement?.textContent || "").toLowerCase();
                return /no|false/i.test(txt);
              });
            }

            const radioToClick = targetRadio || el;
            radioToClick.checked = true;
            radioToClick.click();
            radioToClick.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
            return { success: true, verifiedValue: radioToClick.value || "Checked" };
          }

          // Handle Checkboxes
          if (type === "checkbox") {
            const shouldCheck = /yes|true|agree/i.test(String(val));
            el.checked = shouldCheck;
            if (!el.checked && shouldCheck) el.click();
            el.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
            return { success: true, verifiedValue: el.checked ? "Checked (YES)" : "Unchecked" };
          }

          // Text / Tel / Email / Textareas
          el.focus();
          setReactValue(el, String(val));
          return { success: true, verifiedValue: el.value };
        },
        {
          index: field.index,
          val: plan.value,
          type: field.type,
          tagName: field.tagName,
        }
      );

      if (verification.success) {
        filled.push({
          index: field.index,
          label: field.label,
          matchedField: plan.matchedField,
          value: plan.value,
          verifiedValue: verification.verifiedValue,
          controlType: field.type || field.tagName,
          verified: true,
        });
        auditLog.push(`[Fill #${field.index + 1}] ✓ Verified "${field.label}" filled with "${typeof plan.value === 'string' && plan.value.length > 35 ? plan.value.slice(0, 32) + '…' : plan.value}"`);
      } else {
        skipped.push({
          index: field.index,
          label: field.label,
          reason: verification.error || "DOM injection failed",
        });
        auditLog.push(`[Warn #${field.index + 1}] ⚠️ Could not apply to "${field.label}": ${verification.error}`);
      }
    } catch (err) {
      skipped.push({
        index: field.index,
        label: field.label,
        reason: err.message,
      });
      auditLog.push(`[Error #${field.index + 1}] ❌ Error on "${field.label}": ${err.message}`);
    }
  }

  return {
    totalFieldsFound: fields.length,
    filledCount: filled.length,
    skippedCount: skipped.length,
    filled,
    skipped,
    auditLog,
  };
}
