// lib/scoring.ts
// Real rule-based ATS scoring engine. No AI calls — deterministic, fast, free to run.

export interface ScoreBreakdown {
  contactInfo: number;      // /15
  structure: number;        // /25
  contentQuality: number;   // /30
  formatting: number;       // /20
  keywords: number;         // /10
}

export interface AnalysisResult {
  total: number; // /100
  label: "Weak" | "Fair" | "Strong" | "Excellent";
  breakdown: ScoreBreakdown;
  issues: string[];
  suggestions: string[];
  wordCount: number;
  metricsFound: number;
  domainScores: { name: string; pct: number }[];
  recommendedRoles: { title: string; category: string; tags: string[] }[];
}

const SECTION_HEADERS = [
  "experience", "work experience", "education", "projects", "skills",
  "certifications", "summary", "objective", "achievements",
];

const IMPACT_VERBS = [
  "achieved", "built", "led", "managed", "designed", "developed",
  "improved", "increased", "decreased", "reduced", "created", "launched",
  "automated", "analyzed", "optimized", "implemented", "collaborated",
  "coordinated", "delivered", "streamlined", "spearheaded",
];

const DATA_KEYWORDS = [
  "sql", "python", "power bi", "powerbi", "excel", "tableau", "pandas",
  "numpy", "scikit-learn", "machine learning", "etl", "snowflake",
  "postgresql", "mysql", "data visualization", "dashboard", "regression",
  "statistics", "aws", "azure", "gcp", "airflow", "spark", "r studio",
  "matplotlib", "seaborn", "looker", "dax", "vba", "a/b testing",
];

function countMetrics(text: string): number {
  // numbers followed by %, or preceded by $, or standalone stats like "20%", "$5,000", "3x"
  const matches = text.match(/(\$?\d[\d,]*\.?\d*\s?(%|percent|x\b|k\b|million|billion|hrs|hours|users|clients|records|rows))/gi);
  return matches ? matches.length : 0;
}

function countBullets(rawText: string): number {
  const bulletChars = ["•", "◦", "▪", "‣", "●", "-", "*"];
  const lines = rawText.split("\n");
  let count = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (bulletChars.some((b) => trimmed.startsWith(b))) count++;
  }
  return count;
}

export function scoreResume(rawText: string): AnalysisResult {
  const text = rawText.toLowerCase();
  const words = rawText.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const issues: string[] = [];
  const suggestions: string[] = [];

  // --- Contact Info (15) ---
  let contactInfo = 0;
  const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(rawText);
  const hasPhone = /(\+?\d{1,3}[\s.-]?)?\(?\d{3,5}\)?[\s.-]?\d{3,5}[\s.-]?\d{2,5}/.test(rawText);
  const hasLinkedIn = /linkedin\.com/i.test(rawText);
  const hasLocation = /(delhi|mumbai|bangalore|bengaluru|gurgaon|gurugram|hyderabad|pune|chennai|noida|india|remote|[A-Z][a-z]+,\s?[A-Z]{2})/i.test(rawText);
  if (hasEmail) contactInfo += 5; else issues.push("No email address detected");
  if (hasPhone) contactInfo += 4; else issues.push("No phone number detected");
  if (hasLinkedIn) contactInfo += 3; else suggestions.push("Add your LinkedIn URL near the top of the resume");
  if (hasLocation) contactInfo += 3; else suggestions.push("Add a city/location so recruiters can gauge proximity");

  // --- Structure (25) ---
  let structure = 0;
  const headersFound = SECTION_HEADERS.filter((h) => text.includes(h));
  structure += Math.min(headersFound.length * 4, 20);
  if (headersFound.length < 4) issues.push("Fewer than 4 standard sections detected — add clearly labeled headers");
  const hasClearSections = /education|experience/.test(text);
  if (hasClearSections) structure += 5;
  structure = Math.min(structure, 25);

  // --- Content Quality (30) ---
  let contentQuality = 0;
  const metricsFound = countMetrics(rawText);
  contentQuality += Math.min(metricsFound * 4, 16);
  if (metricsFound < 5) {
    issues.push(`Only ${metricsFound} measurable metric(s) found — aim for at least 5 quantified achievements`);
    suggestions.push("Use the XYZ formula: 'Accomplished [X] as measured by [Y], by doing [Z]'");
  }
  const verbHits = IMPACT_VERBS.filter((v) => text.includes(v));
  contentQuality += Math.min(verbHits.length * 1.5, 9);
  if (verbHits.length < 6) {
    suggestions.push(`Add more impact verbs: try ${IMPACT_VERBS.slice(0, 3).join(", ")}`);
  }
  if (wordCount >= 400 && wordCount <= 650) contentQuality += 5;
  else if (wordCount < 400) issues.push(`CV is too short (${wordCount} words) — sweet spot is 475–600 words`);
  else issues.push(`CV is too long (${wordCount} words) — trim to 475–600 words for a one-page fit`);
  contentQuality = Math.min(Math.round(contentQuality), 30);

  // --- Formatting (20) ---
  let formatting = 0;
  const bulletCount = countBullets(rawText);
  if (bulletCount >= 4) formatting += 10;
  else {
    issues.push("No bullet points detected");
    suggestions.push("Use bullet points — recruiters scan in 7 seconds and need structured lists");
  }
  const hasWeirdChars = /[^\x00-\x7F]{3,}/.test(rawText); // heavy non-ascii runs, often broken tables/icons
  if (!hasWeirdChars) formatting += 5; else issues.push("Unusual characters detected — may break on ATS parsers");
  const lineLengths = rawText.split("\n").map((l) => l.length).filter((l) => l > 0);
  const avgLineLen = lineLengths.reduce((a, b) => a + b, 0) / (lineLengths.length || 1);
  if (avgLineLen < 120) formatting += 5; // not one giant paragraph blob
  formatting = Math.min(formatting, 20);

  // --- Keywords (10) ---
  let keywords = 0;
  const kwHits = DATA_KEYWORDS.filter((k) => text.includes(k));
  keywords = Math.min(kwHits.length, 10);
  if (kwHits.length < 5) {
    issues.push("Few technical/domain keywords — likely to be filtered by ATS before a human sees it");
  }

  const total = Math.round(contactInfo + structure + contentQuality + formatting + keywords);
  let label: AnalysisResult["label"] = "Weak";
  if (total >= 85) label = "Excellent";
  else if (total >= 70) label = "Strong";
  else if (total >= 50) label = "Fair";

  // --- Domain strengths ---
  const domains = [
    { name: "Data Analytics", keys: ["sql", "excel", "power bi", "powerbi", "tableau", "dashboard", "dax"] },
    { name: "Data Science / AI-ML", keys: ["python", "machine learning", "scikit-learn", "pandas", "numpy", "regression"] },
    { name: "Software Engineering", keys: ["java", "react", "node", "api", "git", "docker"] },
    { name: "Cloud / DevOps", keys: ["aws", "azure", "gcp", "kubernetes", "ci/cd", "airflow"] },
  ];
  const domainScores = domains
    .map((d) => {
      const hits = d.keys.filter((k) => text.includes(k)).length;
      return { name: d.name, pct: Math.round((hits / d.keys.length) * 100) };
    })
    .filter((d) => d.pct > 0)
    .sort((a, b) => b.pct - a.pct);

  const topDomain = domainScores[0]?.name ?? "Data Analytics";
  const roleMap: Record<string, { title: string; tags: string[] }[]> = {
    "Data Analytics": [
      { title: "Data Analyst Trainee", tags: ["Data Analyst Trainee", "Junior Data Analyst", "Business Analyst Fresher"] },
    ],
    "Data Science / AI-ML": [
      { title: "Data Science Associate", tags: ["Data Science Associate", "Junior Data Scientist", "ML Intern"] },
    ],
    "Software Engineering": [
      { title: "Software Engineer Trainee", tags: ["SDE 1", "Junior Developer", "Backend Intern"] },
    ],
    "Cloud / DevOps": [
      { title: "Cloud Support Associate", tags: ["DevOps Intern", "Cloud Engineer Trainee"] },
    ],
  };
  const recommendedRoles = (roleMap[topDomain] ?? roleMap["Data Analytics"]).map((r) => ({
    ...r,
    category: topDomain,
  }));

  return {
    total,
    label,
    breakdown: { contactInfo, structure, contentQuality, formatting, keywords },
    issues,
    suggestions,
    wordCount,
    metricsFound,
    domainScores: domainScores.length ? domainScores : [{ name: "Data Analytics", pct: 0 }],
    recommendedRoles,
  };
}
