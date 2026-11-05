import { NextRequest, NextResponse } from "next/server";
import { loadMergedNeuroGuideData, saveNeuroGuideToActiveStorage } from "@/lib/neuroguide/guidelineStorage";
import { verifyAdminToken } from "@/utils/security";
import type { ClinicalScenario, RecommendationAtom } from "@/types/neuroguide";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const data = await loadMergedNeuroGuideData();
    return NextResponse.json({
      ok: true,
      scenarios: data.scenarios,
      recommendationAtoms: data.recommendationAtoms,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminToken =
      request.headers.get("x-admin-token") ||
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    if (!verifyAdminToken(adminToken)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Yêu cầu quyền Quản trị viên (Admin). Vui lòng đăng nhập Admin để cập nhật kịch bản lâm sàng.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { scenario, recommendations, action } = body as {
      scenario?: ClinicalScenario;
      recommendations?: RecommendationAtom[];
      action?: string;
    };

    if (!scenario || !scenario.id || !scenario.title) {
      return NextResponse.json(
        { ok: false, error: "Thiếu thông tin kịch bản lâm sàng bắt buộc (id, title)." },
        { status: 400 }
      );
    }

    const activeData = await loadMergedNeuroGuideData();
    const scenarioList = [...activeData.scenarios];
    const recList = [...activeData.recommendationAtoms];

    const targetId = scenario.id.toLowerCase().trim();
    const existingIndex = scenarioList.findIndex((s) => s.id.toLowerCase().trim() === targetId);

    if (existingIndex >= 0) {
      scenarioList[existingIndex] = scenario;
    } else {
      scenarioList.unshift(scenario);
    }

    let finalRecList = recList;
    if (Array.isArray(recommendations)) {
      finalRecList = recList.filter((r) => r.scenarioId.toLowerCase().trim() !== targetId);
      finalRecList.push(...recommendations);
    }

    const saveResult = await saveNeuroGuideToActiveStorage({
      guidelines: activeData.guidelines,
      conferences: activeData.conferences,
      scenarios: scenarioList,
      recommendationAtoms: finalRecList,
      deletedGuidelineIds: activeData.deletedGuidelineIds,
    });

    if (!saveResult.success) {
      return NextResponse.json(
        { ok: false, error: saveResult.error || "Không thể lưu kịch bản lâm sàng vào hệ thống lưu trữ." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: `Đã cập nhật kịch bản lâm sàng "${scenario.title}" thành công.`,
      scenario,
      recommendations: finalRecList.filter((r) => r.scenarioId.toLowerCase().trim() === targetId),
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }
}

export const PUT = POST;
