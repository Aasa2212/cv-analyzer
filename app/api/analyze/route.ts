import { NextRequest, NextResponse } from "next/server";
import { extractText } from "@/lib/parseResume";
import { scoreResume } from "@/lib/scoring";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const text = await extractText(buffer, file.name);
    if (!text || text.trim().length < 30) {
      return NextResponse.json(
        { error: "Couldn't extract readable text from this file. Try a different export (avoid scanned/image PDFs)." },
        { status: 422 }
      );
    }

    const result = scoreResume(text);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Failed to analyze resume" }, { status: 500 });
  }
}
