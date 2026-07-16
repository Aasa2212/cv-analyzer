import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Country codes Adzuna supports that map to the flags in the UI
const ADZUNA_COUNTRY_MAP: Record<string, string> = {
  IN: "in",
  US: "us",
  GB: "gb",
  EU: "de", // Adzuna has no single "EU" endpoint; default to Germany
  AU: "au",
};

// Jooble country -> ISO domain hint (Jooble uses one global endpoint but accepts a location string)
const JOOBLE_LOCATION_MAP: Record<string, string> = {
  IN: "India",
  US: "United States",
  GB: "United Kingdom",
  EU: "Germany",
  AU: "Australia",
};

type Job = {
  id: string;
  source: "Adzuna" | "Jooble";
  title: string;
  company: string;
  location: string;
  salary: string | null;
  url: string;
  created?: string;
  description: string;
};

async function fetchAdzuna(query: string, country: string, page: string, remote: boolean): Promise<Job[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return [];

  const adzunaCountry = ADZUNA_COUNTRY_MAP[country] ?? "in";
  const url = new URL(`https://api.adzuna.com/v1/api/jobs/${adzunaCountry}/search/${page}`);
  url.searchParams.set("app_id", appId);
  url.searchParams.set("app_key", appKey);
  url.searchParams.set("results_per_page", "10");
  url.searchParams.set("what", query);
  if (remote) url.searchParams.set("where", "remote");
  url.searchParams.set("content-type", "application/json");

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results ?? []).map((j: any) => ({
      id: `adzuna-${j.id}`,
      source: "Adzuna" as const,
      title: j.title,
      company: j.company?.display_name ?? "Unknown",
      location: j.location?.display_name ?? "—",
      salary: j.salary_min && j.salary_max ? `${Math.round(j.salary_min)} - ${Math.round(j.salary_max)}` : null,
      url: j.redirect_url,
      created: j.created,
      description: stripHtml(j.description ?? "").slice(0, 220) + "…",
    }));
  } catch {
    return [];
  }
}

async function fetchJooble(query: string, country: string, page: string): Promise<Job[]> {
  const apiKey = process.env.JOOBLE_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch(`https://jooble.org/api/${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keywords: query,
        location: JOOBLE_LOCATION_MAP[country] ?? "India",
        page,
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.jobs ?? []).map((j: any, i: number) => ({
      id: `jooble-${j.id ?? i}-${page}`,
      source: "Jooble" as const,
      title: j.title,
      company: j.company || "Unknown",
      location: j.location || "—",
      salary: j.salary || null,
      url: j.link,
      created: j.updated,
      description: stripHtml(j.snippet ?? "").slice(0, 220) + "…",
    }));
  } catch {
    return [];
  }
}

function stripHtml(s: string) {
  return s.replace(/<[^>]*>/g, "");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") ?? "data analyst";
  const country = searchParams.get("country") ?? "IN";
  const remote = searchParams.get("remote") === "true";
  const page = searchParams.get("page") ?? "1";

  const hasAdzuna = !!(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY);
  const hasJooble = !!process.env.JOOBLE_API_KEY;

  if (!hasAdzuna && !hasJooble) {
    return NextResponse.json(
      {
        error:
          "Job search isn't configured yet. Add ADZUNA_APP_ID/ADZUNA_APP_KEY (developer.adzuna.com) and/or JOOBLE_API_KEY (jooble.org/api/about) to your environment.",
      },
      { status: 501 }
    );
  }

  const [adzunaJobs, joobleJobs] = await Promise.all([
    fetchAdzuna(query, country, page, remote),
    fetchJooble(query, country, page),
  ]);

  // Interleave the two sources so neither dominates the list
  const jobs: Job[] = [];
  const max = Math.max(adzunaJobs.length, joobleJobs.length);
  for (let i = 0; i < max; i++) {
    if (adzunaJobs[i]) jobs.push(adzunaJobs[i]);
    if (joobleJobs[i]) jobs.push(joobleJobs[i]);
  }

  return NextResponse.json({
    jobs,
    count: jobs.length,
    sources: { adzuna: hasAdzuna, jooble: hasJooble },
  });
}
