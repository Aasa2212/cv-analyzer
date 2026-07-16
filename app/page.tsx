"use client";

import { useState, useRef } from "react";
import type { AnalysisResult } from "@/lib/scoring";

type Job = {
  id: string;
  source: string;
  title: string;
  company: string;
  location: string;
  salary: string | null;
  url: string;
  description: string;
};

const COUNTRIES = [
  { code: "IN", label: "India" },
  { code: "US", label: "USA" },
  { code: "GB", label: "UK" },
  { code: "EU", label: "Europe" },
  { code: "AU", label: "Australia" },
];

function scoreColor(total: number) {
  if (total >= 85) return "#000000";
  if (total >= 70) return "#262626";
  if (total >= 50) return "#525252";
  return "#a3a3a3";
}

export default function Home() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const [jobQuery, setJobQuery] = useState("data analyst");
  const [country, setCountry] = useState("IN");
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [jobsLoading, setJobsLoading] = useState(false);

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
    setFileName(file.name);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/analyze", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setResult(data);
      if (data.recommendedRoles?.[0]) {
        setJobQuery(data.recommendedRoles[0].title.toLowerCase());
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function searchJobs() {
    setJobsLoading(true);
    setJobsError(null);
    try {
      const params = new URLSearchParams({ q: jobQuery, country });
      const res = await fetch(`/api/jobs?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Job search failed");
      setJobs(data.jobs);
    } catch (e: any) {
      setJobsError(e.message);
      setJobs(null);
    } finally {
      setJobsLoading(false);
    }
  }

  const circumference = 2 * Math.PI * 70;

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-black flex items-center justify-center text-white font-bold">
              CV
            </div>
            <span className="font-semibold text-gray-900 text-lg">
              CV Analyzer &amp; Job Finder <span className="text-gray-400 font-normal text-sm">(by Aasa)</span>
            </span>
          </div>
          <span className="text-sm text-gray-500 hidden sm:block">ATS scoring · Real parsing · Live job search</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {!result && !loading && (
          <div className="animate-fade-in bg-white rounded-2xl border border-gray-200 p-12 text-center max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Will your resume make it past the bots?</h1>
            <p className="text-gray-500 mb-6">
              Upload your resume — get a real ATS score, section-by-section breakdown, and matching jobs.
            </p>
            <input
              ref={fileInput}
              type="file"
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <button
              onClick={() => fileInput.current?.click()}
              className="bg-black hover:bg-gray-800 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
            >
              Upload Resume (PDF, DOCX, TXT)
            </button>
            {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
          </div>
        )}

        {loading && (
          <div className="animate-fade-in bg-white rounded-2xl border border-gray-200 p-12 text-center max-w-2xl mx-auto">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Analyzing {fileName}…</p>
          </div>
        )}

        {result && (
          <>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-xl font-semibold text-gray-900">Results for {fileName}</h1>
              <button
                onClick={() => fileInput.current?.click()}
                className="text-sm text-black font-medium hover:underline"
              >
                Analyze another CV
              </button>
              <input
                ref={fileInput}
                type="file"
                accept=".pdf,.docx,.txt"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Score gauge */}
              <div className="animate-fade-in bg-white rounded-2xl border border-gray-200 p-8 flex flex-col items-center justify-center">
                <svg width="180" height="180" viewBox="0 0 180 180">
                  <circle cx="90" cy="90" r="70" fill="none" stroke="#e5e7eb" strokeWidth="14" />
                  <circle
                    className="animate-ring"
                    cx="90"
                    cy="90"
                    r="70"
                    fill="none"
                    stroke={scoreColor(result.total)}
                    strokeWidth="14"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - result.total / 100)}
                    strokeLinecap="round"
                    transform="rotate(-90 90 90)"
                    style={{ transition: "stroke-dashoffset 1s ease-out" }}
                  />
                  <text x="90" y="85" textAnchor="middle" fontSize="36" fontWeight="700" fill="#111827">
                    {result.total}
                  </text>
                  <text x="90" y="108" textAnchor="middle" fontSize="13" fill="#9ca3af">
                    /100
                  </text>
                </svg>
                <p className="text-sm text-gray-500 mt-2 uppercase tracking-wide font-medium">ATS Score</p>
                <span
                  className="mt-2 px-3 py-1 rounded-full text-sm font-semibold"
                  style={{ background: `${scoreColor(result.total)}20`, color: scoreColor(result.total) }}
                >
                  {result.label}
                </span>
              </div>

              {/* Breakdown */}
              <div className="animate-fade-in bg-white rounded-2xl border border-gray-200 p-8" style={{ animationDelay: "0.1s" }}>
                <h2 className="text-xs font-bold tracking-wide text-gray-400 mb-4">CV SUMMARY</h2>
                {[
                  { label: "Contact Info", val: result.breakdown.contactInfo, max: 15 },
                  { label: "Structure", val: result.breakdown.structure, max: 25 },
                  { label: "Content Quality", val: result.breakdown.contentQuality, max: 30 },
                  { label: "Formatting", val: result.breakdown.formatting, max: 20 },
                  { label: "Keywords", val: result.breakdown.keywords, max: 10 },
                ].map((row, i) => (
                  <div key={row.label} className="mb-4 last:mb-0">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-800">{row.label}</span>
                      <span className="font-semibold text-gray-700">
                        {row.val}/{row.max}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="animate-bar h-full rounded-full bg-black"
                        style={{ width: `${(row.val / row.max) * 100}%`, animationDelay: `${0.15 + i * 0.08}s` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="animate-fade-in bg-white rounded-2xl border border-gray-200 p-8" style={{ animationDelay: "0.2s" }}>
                <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">⚠ ISSUES FOUND</h2>
                {result.issues.length === 0 && <p className="text-sm text-gray-400">No major issues found. Nice work.</p>}
                <ul className="space-y-2">
                  {result.issues.map((issue, i) => (
                    <li key={i} className="text-sm text-gray-700 flex gap-2">
                      <span className="text-red-500">✕</span>
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="animate-fade-in bg-white rounded-2xl border border-gray-200 p-8" style={{ animationDelay: "0.25s" }}>
                <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">⚡ SUGGESTIONS</h2>
                <ul className="space-y-2">
                  {result.suggestions.map((s, i) => (
                    <li key={i} className="text-sm text-gray-700 flex gap-2">
                      <span className="text-gray-500">✓</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* CV Intelligence */}
            <div className="animate-fade-in bg-white rounded-2xl border border-gray-200 p-8 mb-6" style={{ animationDelay: "0.3s" }}>
              <h2 className="text-sm font-bold text-gray-800 mb-4">CV Intelligence</h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xs font-bold tracking-wide text-gray-400 mb-3">DOMAIN STRENGTHS</h3>
                  {result.domainScores.map((d) => (
                    <div key={d.name} className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{d.name}</span>
                        <span className="text-gray-500">{d.pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full bg-gray-500" style={{ width: `${d.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <h3 className="text-xs font-bold tracking-wide text-gray-400 mb-3">RECOMMENDED ROLES</h3>
                  {result.recommendedRoles.map((r) => (
                    <div
                      key={r.title}
                      className="border border-gray-300 bg-gray-50 rounded-xl p-4 cursor-pointer hover:border-gray-400 transition"
                      onClick={() => setJobQuery(r.title.toLowerCase())}
                    >
                      <p className="font-semibold text-gray-900">{r.title}</p>
                      <p className="text-xs text-gray-500 mb-2">{r.category}</p>
                      <div className="flex flex-wrap gap-1">
                        {r.tags.map((t) => (
                          <span key={t} className="text-xs bg-white border border-gray-300 text-black px-2 py-0.5 rounded-full">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Find jobs */}
            <div className="animate-fade-in bg-white rounded-2xl border border-gray-200 p-8" style={{ animationDelay: "0.35s" }}>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Find Jobs</h2>
              <p className="text-sm text-gray-500 mb-4">Live listings pulled from Adzuna, filtered to your profile</p>
              <div className="flex gap-2 mb-4 flex-wrap">
                {COUNTRIES.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => setCountry(c.code)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                      country === c.code
                        ? "bg-black text-white border-black"
                        : "bg-white text-gray-600 border-gray-200"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mb-4 flex-wrap items-center">
                <span className="text-xs text-gray-400 mr-1">Also search directly on:</span>
                <a
                  href={`https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(jobQuery)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-black"
                >
                  LinkedIn ↗
                </a>
                <a
                  href={`https://www.naukri.com/${encodeURIComponent(jobQuery.replace(/\s+/g, "-"))}-jobs`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-black"
                >
                  Naukri ↗
                </a>
                <a
                  href={`https://www.indeed.com/jobs?q=${encodeURIComponent(jobQuery)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-black"
                >
                  Indeed ↗
                </a>
              </div>

              <div className="flex gap-2 mb-6">
                <input
                  value={jobQuery}
                  onChange={(e) => setJobQuery(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm"
                  placeholder="e.g. data analyst trainee"
                />
                <button
                  onClick={searchJobs}
                  disabled={jobsLoading}
                  className="bg-black hover:bg-gray-800 text-white font-semibold px-5 py-2.5 rounded-xl text-sm disabled:opacity-60"
                >
                  {jobsLoading ? "Searching…" : "Search"}
                </button>
              </div>

              {jobsError && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">{jobsError}</p>
              )}

              {jobs && (
                <div className="space-y-3">
                  {jobs.length === 0 && <p className="text-sm text-gray-400">No jobs found — try a broader search term.</p>}
                  {jobs.map((j) => (
                    <a
                      key={j.id}
                      href={j.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block border border-gray-200 rounded-xl p-4 transition-all duration-200 hover:border-black hover:-translate-y-0.5 hover:shadow-sm"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">{j.title}</p>
                          <p className="text-sm text-gray-500">
                            {j.company} · {j.location}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] uppercase tracking-wide text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
                            {j.source}
                          </span>
                          {j.salary && <span className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full">₹{j.salary}</span>}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">{j.description}</p>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
