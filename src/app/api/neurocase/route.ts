import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { ClinicalCase } from "@/types/clinicalCase";

const CASES_FILE_PATH = path.join(process.cwd(), "public", "data", "cases.json");

/**
 * GET /api/neurocase
 * Returns the current case bank directly from public/data/cases.json
 * with cache-busting headers so all network devices receive fresh data.
 */
export async function GET() {
  try {
    const raw = await fs.readFile(CASES_FILE_PATH, "utf-8");
    const cases: ClinicalCase[] = JSON.parse(raw);
    return NextResponse.json(cases, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("Error reading cases.json in GET /api/neurocase:", error);
    return NextResponse.json(
      { error: "Failed to load clinical cases from server" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/neurocase
 * Persists updated cases, new submissions, and admin approvals/edits
 * directly to public/data/cases.json on the server disk.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    let updatedCases: ClinicalCase[] = [];

    if (Array.isArray(body)) {
      updatedCases = body;
    } else if (Array.isArray(body.cases)) {
      updatedCases = body.cases;
    } else if (body.newCase) {
      // Single case submission append
      const raw = await fs.readFile(CASES_FILE_PATH, "utf-8");
      const currentList: ClinicalCase[] = JSON.parse(raw);
      updatedCases = [body.newCase, ...currentList.filter((c) => c.id !== body.newCase.id)];
    } else {
      return NextResponse.json(
        { error: "Invalid payload format. Expected { cases: ClinicalCase[] }" },
        { status: 400 }
      );
    }

    // Atomic write to public/data/cases.json with pretty indentation
    await fs.writeFile(CASES_FILE_PATH, JSON.stringify(updatedCases, null, 2), "utf-8");

    return NextResponse.json(
      {
        success: true,
        count: updatedCases.length,
        savedAt: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Error writing cases.json in POST /api/neurocase:", error);
    return NextResponse.json(
      { error: "Failed to persist clinical cases to server disk" },
      { status: 500 }
    );
  }
}
