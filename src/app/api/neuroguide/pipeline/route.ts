import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { registerCandidateGuideline } from "@/lib/neuroguide/storeAdapter";
import { searchPubMedGuidelines } from "@/lib/neuroguide/pubmedDiscovery";
import {
  extractGuidelineFromPdfBuffer,
  extractGuidelineFromUrlOrDoi,
} from "@/lib/neuroguide/geminiGuidelineExtractor";

const execFileAsync = promisify(execFile);
export const dynamic = "force-dynamic";

const STORE_DIR = path.join(process.cwd(), "data", "guidelines_store");
const PYTHON_PATH =
  process.env.PYTHON_PATH ||
  "C:\\Users\\Manh\\AppData\\Local\\Programs\\Python\\Python315\\python.exe";

export async function GET() {
  try {
    const jobsFile = path.join(STORE_DIR, "jobs.json");
    if (!fs.existsSync(jobsFile)) {
      return NextResponse.json({ ok: true, jobs: [] });
    }
    const jobs = JSON.parse(fs.readFileSync(jobsFile, "utf-8"));
    return NextResponse.json({ ok: true, jobs: Object.values(jobs) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error reading jobs list";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    let url: string | undefined;
    let local_path: string | undefined;
    let society: string = "AHA";
    let title: string | undefined;
    let year: number | undefined;
    let discover: boolean = false;
    let uploadedBuffer: Buffer | null = null;
    let uploadedFileName: string = "guideline.pdf";

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      society = (formData.get("society") as string) || "AHA";
      discover = formData.get("discover") === "true";
      url = (formData.get("url") as string) || undefined;
      title = (formData.get("title") as string) || undefined;
      const yearStr = formData.get("year") as string;
      if (yearStr) year = parseInt(yearStr, 10);

      const file = formData.get("file") as File | null;
      if (file && file.size > 0) {
        uploadedFileName = file.name;
        uploadedBuffer = Buffer.from(await file.arrayBuffer());

        // Save locally if filesystem writable
        try {
          const uploadDir = path.join(process.cwd(), "data", "guidelines_raw");
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
          const targetPath = path.join(uploadDir, safeName);
          fs.writeFileSync(targetPath, uploadedBuffer);
          local_path = targetPath;
        } catch {
          // Read-only filesystem in serverless environments
        }
      } else {
        const localPathField = formData.get("local_path") as string;
        if (localPathField) local_path = localPathField;
      }
    } else {
      const body = await request.json();
      url = body.url;
      local_path = body.local_path;
      society = body.society || "AHA";
      title = body.title;
      year = body.year;
      discover = body.discover;
    }

    const isVercelServerless = Boolean(
      process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || !fs.existsSync(PYTHON_PATH)
    );

    // =========================================================================
    // BRANCH A: VERCEL SERVERLESS & CLOUD RUNTIME (NATIVE TS PIPELINE)
    // =========================================================================
    if (isVercelServerless) {
      if (discover) {
        const syncResult = await searchPubMedGuidelines({
          society: society && society !== "ALL" ? society : undefined,
          retmax: 15,
        });

        for (const doc of syncResult.guidelines) {
          await registerCandidateGuideline(doc);
        }

        return NextResponse.json({
          ok: true,
          data: {
            total_discovered: syncResult.totalFound,
            new_discovered_count: syncResult.guidelines.length,
            societies: [society],
          },
        });
      }

      // Manual extraction (PDF buffer or URL/DOI)
      if (uploadedBuffer) {
        const doc = await extractGuidelineFromPdfBuffer({
          buffer: uploadedBuffer,
          fileName: uploadedFileName,
          society,
          title,
          year,
        });
        await registerCandidateGuideline(doc);
        return NextResponse.json({
          ok: true,
          data: {
            file_id: doc.id,
            total_recommendations: doc.allPracticeChanges?.length || 0,
            pending_review_count: doc.allPracticeChanges?.length || 0,
            title: doc.title,
            state: "PENDING_REVIEW",
          },
        });
      }

      if (url) {
        const doc = await extractGuidelineFromUrlOrDoi({
          url,
          society,
          title,
          year,
        });
        await registerCandidateGuideline(doc);
        return NextResponse.json({
          ok: true,
          data: {
            file_id: doc.id,
            total_recommendations: doc.allPracticeChanges?.length || 0,
            pending_review_count: doc.allPracticeChanges?.length || 0,
            title: doc.title,
            state: "PENDING_REVIEW",
          },
        });
      }

      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "MISSING_INPUT",
            message: "Please provide either a PDF document or a direct URL.",
          },
        },
        { status: 400 }
      );
    }

    // =========================================================================
    // BRANCH B: LOCAL ENVIRONMENT (PYTHON 5-CORE ORCHESTRATOR)
    // =========================================================================
    const args = ["-m", "core.orchestrator.runner"];

    if (discover) {
      args.push("--discover");
      if (society && society !== "ALL") {
        args.push("--societies-filter", society);
      }
    } else {
      if (url) args.push("--url", url);
      if (local_path) args.push("--file", local_path);
      if (society) args.push("--society", society);
      if (title) args.push("--title", title);
      if (year) args.push("--year", String(year));
    }

    try {
      const { stdout, stderr } = await execFileAsync(PYTHON_PATH, args, {
        cwd: process.cwd(),
        timeout: 180000,
        env: {
          ...process.env,
          PYTHONIOENCODING: "utf-8",
        },
      });

      try {
        const parsed = JSON.parse(stdout.trim());
        return NextResponse.json(parsed);
      } catch {
        return NextResponse.json({
          ok: true,
          raw_output: stdout,
          stderr: stderr || null,
        });
      }
    } catch (execError: unknown) {
      const errorObj = execError as { stdout?: string; stderr?: string; message?: string };
      if (errorObj?.stdout && typeof errorObj.stdout === "string" && errorObj.stdout.trim().length > 0) {
        try {
          const parsed = JSON.parse(errorObj.stdout.trim());
          return NextResponse.json(parsed, { status: 200 });
        } catch {
          // not json
        }
      }

      // If local Python run failed and we have URL or buffer, seamlessly fallback to TS pipeline
      if (uploadedBuffer) {
        const doc = await extractGuidelineFromPdfBuffer({
          buffer: uploadedBuffer,
          fileName: uploadedFileName,
          society,
          title,
          year,
        });
        await registerCandidateGuideline(doc);
        return NextResponse.json({
          ok: true,
          data: {
            file_id: doc.id,
            total_recommendations: doc.allPracticeChanges?.length || 0,
            pending_review_count: doc.allPracticeChanges?.length || 0,
            title: doc.title,
            state: "PENDING_REVIEW",
          },
        });
      }

      if (url) {
        const doc = await extractGuidelineFromUrlOrDoi({
          url,
          society,
          title,
          year,
        });
        await registerCandidateGuideline(doc);
        return NextResponse.json({
          ok: true,
          data: {
            file_id: doc.id,
            total_recommendations: doc.allPracticeChanges?.length || 0,
            pending_review_count: doc.allPracticeChanges?.length || 0,
            title: doc.title,
            state: "PENDING_REVIEW",
          },
        });
      }

      const message = execError instanceof Error ? execError.message : "Error executing Orchestrator";
      return NextResponse.json({ ok: false, error: { message } }, { status: 500 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error processing pipeline request";
    return NextResponse.json({ ok: false, error: { message } }, { status: 500 });
  }
}
