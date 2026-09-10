"use client";

import { useState } from "react";

export default function DemoApplicationForm() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({});

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-12 px-6 font-sans">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="border-b border-slate-100 pb-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-[#0052CC]">
            🏢 Stripe / Tech Corp — Job Application
          </div>
          <h1 className="mt-3 text-2xl font-extrabold text-[#0F172A]">
            Senior Full Stack Engineer
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Interactive Demo Application Form for testing CareerFlow Browser Autofill.
          </p>
        </div>

        {submitted ? (
          <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
            <h2 className="text-lg font-bold text-emerald-800">Application Submitted! 🎉</h2>
            <p className="mt-2 text-sm text-emerald-700">
              Form data successfully received and validated.
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="mt-4 rounded-xl bg-[#0052CC] px-4 py-2 text-xs font-semibold text-white"
            >
              Reset Form
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {/* Personal Details */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="first_name" className="block text-xs font-bold text-slate-700">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="first_name"
                  name="firstName"
                  type="text"
                  required
                  placeholder="e.g. Aniketh"
                  onChange={handleChange}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-[#0052CC] focus:outline-none focus:ring-1 focus:ring-[#0052CC]"
                />
              </div>
              <div>
                <label htmlFor="last_name" className="block text-xs font-bold text-slate-700">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="last_name"
                  name="lastName"
                  type="text"
                  required
                  placeholder="e.g. Reddy"
                  onChange={handleChange}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-[#0052CC] focus:outline-none focus:ring-1 focus:ring-[#0052CC]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="email" className="block text-xs font-bold text-slate-700">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  onChange={handleChange}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-[#0052CC] focus:outline-none focus:ring-1 focus:ring-[#0052CC]"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-xs font-bold text-slate-700">
                  Phone Number
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  onChange={handleChange}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-[#0052CC] focus:outline-none focus:ring-1 focus:ring-[#0052CC]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="location" className="block text-xs font-bold text-slate-700">
                Current Location / City
              </label>
              <input
                id="location"
                name="location"
                type="text"
                placeholder="City, State, Country"
                onChange={handleChange}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-[#0052CC] focus:outline-none focus:ring-1 focus:ring-[#0052CC]"
              />
            </div>

            {/* Links */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="linkedin_url" className="block text-xs font-bold text-slate-700">
                  LinkedIn URL
                </label>
                <input
                  id="linkedin_url"
                  name="linkedin"
                  type="url"
                  placeholder="https://linkedin.com/in/..."
                  onChange={handleChange}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-[#0052CC] focus:outline-none focus:ring-1 focus:ring-[#0052CC]"
                />
              </div>
              <div>
                <label htmlFor="github_url" className="block text-xs font-bold text-slate-700">
                  GitHub Profile URL
                </label>
                <input
                  id="github_url"
                  name="github"
                  type="url"
                  placeholder="https://github.com/..."
                  onChange={handleChange}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-[#0052CC] focus:outline-none focus:ring-1 focus:ring-[#0052CC]"
                />
              </div>
            </div>

            {/* Education & Experience */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="university" className="block text-xs font-bold text-slate-700">
                  University / College
                </label>
                <input
                  id="university"
                  name="university"
                  type="text"
                  placeholder="Institution name"
                  onChange={handleChange}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-[#0052CC] focus:outline-none focus:ring-1 focus:ring-[#0052CC]"
                />
              </div>
              <div>
                <label htmlFor="degree" className="block text-xs font-bold text-slate-700">
                  Degree / Major
                </label>
                <input
                  id="degree"
                  name="degree"
                  type="text"
                  placeholder="e.g. B.Tech Computer Science"
                  onChange={handleChange}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-[#0052CC] focus:outline-none focus:ring-1 focus:ring-[#0052CC]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="current_company" className="block text-xs font-bold text-slate-700">
                  Current / Most Recent Company
                </label>
                <input
                  id="current_company"
                  name="company"
                  type="text"
                  placeholder="e.g. BNY Mellon"
                  onChange={handleChange}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-[#0052CC] focus:outline-none focus:ring-1 focus:ring-[#0052CC]"
                />
              </div>
              <div>
                <label htmlFor="job_title" className="block text-xs font-bold text-slate-700">
                  Current Job Title
                </label>
                <input
                  id="job_title"
                  name="title"
                  type="text"
                  placeholder="e.g. Software Engineer Intern"
                  onChange={handleChange}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-[#0052CC] focus:outline-none focus:ring-1 focus:ring-[#0052CC]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="skills" className="block text-xs font-bold text-slate-700">
                Key Technical Skills
              </label>
              <input
                id="skills"
                name="skills"
                type="text"
                placeholder="React, Next.js, Node.js, Python, MongoDB"
                onChange={handleChange}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-[#0052CC] focus:outline-none focus:ring-1 focus:ring-[#0052CC]"
              />
            </div>

            {/* Work Auth */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="work_auth" className="block text-xs font-bold text-slate-700">
                  Are you legally authorized to work?
                </label>
                <select
                  id="work_auth"
                  name="workAuth"
                  onChange={handleChange}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-[#0052CC] focus:outline-none focus:ring-1 focus:ring-[#0052CC]"
                >
                  <option value="">Select option</option>
                  <option value="Yes">Yes, I am legally authorized</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div>
                <label htmlFor="sponsorship" className="block text-xs font-bold text-slate-700">
                  Will you require visa sponsorship?
                </label>
                <select
                  id="sponsorship"
                  name="sponsorship"
                  onChange={handleChange}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-[#0052CC] focus:outline-none focus:ring-1 focus:ring-[#0052CC]"
                >
                  <option value="">Select option</option>
                  <option value="No">No, I do not require sponsorship</option>
                  <option value="Yes">Yes, I will require sponsorship</option>
                </select>
              </div>
            </div>

            {/* Cover Letter */}
            <div>
              <label htmlFor="cover_letter" className="block text-xs font-bold text-slate-700">
                Cover Letter / Additional Note
              </label>
              <textarea
                id="cover_letter"
                name="coverLetter"
                rows={4}
                placeholder="Introduce yourself or share why you're a great fit..."
                onChange={handleChange}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-[#0052CC] focus:outline-none focus:ring-1 focus:ring-[#0052CC]"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-[#0052CC] py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0043A4]"
            >
              Submit Application →
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
