import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Country codes Adzuna supports that map to the flags in the UI
const COUNTRY_MAP: Record<string, string> = {
  IN: "in",
  US: "us",
  GB: "gb",
  EU: "de", // Adzuna has no single "EU" endpoint; default to Germany, swap as needed
  AU: "au",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") ?? "data analyst";
  const country = COUNTRY_MAP[searchParams.get("country") ?? "IN"] ?? "in";
  const remote = searchParams.get("remote") === "true";
  const page = searchParams.get("page") ?? "1";

  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    return NextResponse.json(
      {
        error:
          "Job search isn't configured yet. Add ADZUNA_APP_ID and ADZUNA_APP_KEY to your environment (free signup at developer.adzuna.com).",
      },
      { status: 501 }
    );
  }

  const url = new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/${page}`);
  url.searchParams.set("app_id", appId);
  url.searchParams.set("app_key", appKey);
  url.searchParams.set("results_per_page", "10");
  url.searchParams.set("what", query);
  if (remote) url.searchParams.set("where", "remote");
  url.searchParams.set("content-type", "application/json");

  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json({ error: `Adzuna API error: ${body}` }, { status: res.status });
    }
    const data = await res.json();
    const jobs = (data.results ?? []).map((j: any) => ({
      id: j.id,
      title: j.title,
      company: j.company?.display_name ?? "Unknown",
      location: j.location?.display_name ?? "—",
      salary: j.salary_min && j.salary_max ? `${Math.round(j.salary_min)} - ${Math.round(j.salary_max)}` : null,
      url: j.redirect_url,
      created: j.created,
      description: (j.description ?? "").slice(0, 220) + "…",
    }));
    return NextResponse.json({ jobs, count: data.count ?? jobs.length });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Job search failed" }, { status: 500 });
  }
}
