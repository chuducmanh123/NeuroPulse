import argparse
import sys
from pathlib import Path

from core.extract.core import ExtractCore, ExtractInput
from core.analyze.core import AnalyzeCore, AnalyzeInput
from core.verify.core import VerifyCore, VerifyInput
from core.common.contracts import CandidatePage, AnalyzedRecommendation


def main():
    parser = argparse.ArgumentParser(description="NeuroGuide End-to-End Pipeline: Extract -> Analyze -> Verify")
    parser.add_argument("--path", type=str, required=True, help="Đường dẫn file PDF guideline")
    parser.add_argument("--society", type=str, default="AHA", help="Hiệp hội y khoa (AHA, ESO, AAN...)")

    args = parser.parse_args()
    pdf_path = Path(args.path)
    if not pdf_path.exists():
        print(f"[LỖI] Không tìm thấy file: {pdf_path}", file=sys.stderr)
        sys.exit(1)

    file_id = pdf_path.stem

    # BƯỚC 1: EXTRACT
    print(f"[*] BƯỚC 1: Bóc tách layout và lọc candidate pages...")
    extract_core = ExtractCore()
    ext_res = extract_core.run(
        ExtractInput(file_id=file_id, storage_path=str(pdf_path), society_hint=args.society)
    )
    if not ext_res.ok:
        print(f"[LỖI EXTRACT] {ext_res.error}", file=sys.stderr)
        sys.exit(2)

    cand_pages = [CandidatePage(**p) for p in ext_res.data.get("candidate_pages", [])]
    print(f"[+] Đã lọc được {len(cand_pages)} trang chứa khuyến cáo.")

    # BƯỚC 2: ANALYZE (GEMINI AI)
    print(f"[*] BƯỚC 2: Gọi Gemini AI trích xuất các khuyến cáo lâm sàng...")
    analyze_core = AnalyzeCore()
    ana_res = analyze_core.run(
        AnalyzeInput(file_id=file_id, candidate_pages=cand_pages, society_hint=args.society)
    )
    if not ana_res.ok:
        print(f"[LỖI ANALYZE] {ana_res.error}", file=sys.stderr)
        sys.exit(3)

    analyzed_recs = [AnalyzedRecommendation(**r) for r in ana_res.data.get("recommendations", [])]
    print(f"[+] Gemini đã trích xuất được {len(analyzed_recs)} khuyến cáo.")

    # BƯỚC 3: VERIFY (RULE-BASED LOGIC)
    print(f"[*] BƯỚC 3: Kiểm chứng độc lập bằng code logic (Grounding, Schema, Numbers)...")
    verify_core = VerifyCore()
    ver_res = verify_core.run(
        VerifyInput(file_id=file_id, recommendations=analyzed_recs, candidate_pages=cand_pages)
    )
    if not ver_res.ok:
        print(f"[LỖI VERIFY] {ver_res.error}", file=sys.stderr)
        sys.exit(4)

    v_data = ver_res.data
    print("\n========== BÁO CÁO KIỂM CHỨNG LÂM SÀNG (VERIFICATION REPORT) ==========")
    print(f"Tổng số khuyến cáo kiểm tra: {v_data['total_verified']}")
    print(f"  - Đạt chuẩn (PASSED): {v_data['passed_count']}")
    print(f"  - Cần xem xét (WARNING): {v_data['warning_count']}")
    print(f"  - Thất bại (FAILED): {v_data['failed_count']}\n")

    for rec in v_data["verified_recommendations"]:
        v_det = rec["verification_detail"]
        status_tag = f"[{v_det['status']}]"
        print(f"{status_tag} Rec ID: {rec['rec_id']} (Trang {rec['page_num']})")
        print(f"  - Nội dung: {rec['statement'][:100]}...")
        print(f"  - Độ trùng khớp văn bản gốc (Grounding): {v_det['grounding_score']*100:.0f}%")
        print(f"  - Tính hợp lệ phân loại: {v_det['classification_valid']}")
        print(f"  - Số liệu được kiểm chứng: {v_det['numbers_verified']}")
        if v_det["issues"]:
            print(f"  - Vấn đề ghi nhận:")
            for iss in v_det["issues"]:
                print(f"      * {iss}")
        print()


if __name__ == "__main__":
    main()
