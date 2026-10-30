import argparse
import json
import sys
from pathlib import Path

from core.extract.core import ExtractCore, ExtractInput
from core.analyze.core import AnalyzeCore, AnalyzeInput
from core.common.contracts import CandidatePage


def main():
    parser = argparse.ArgumentParser(description="NeuroGuide AnalyzeCore CLI Runner (Gemini AI)")
    parser.add_argument("--path", type=str, required=True, help="Đường dẫn file PDF guideline")
    parser.add_argument("--society", type=str, default="AHA", help="Gợi ý hiệp hội (AHA, ESO, AAN...)")

    args = parser.parse_args()
    pdf_path = Path(args.path)
    if not pdf_path.exists():
        print(f"[LỖI] File không tồn tại: {pdf_path}", file=sys.stderr)
        sys.exit(1)

    file_id = pdf_path.stem

    # 1. Chạy Lõi Extract trước để lấy các Candidate Pages
    print(f"[*] BƯỚC 1: Đang bóc tách layout & lọc candidate pages từ {pdf_path.name}...")
    extract_core = ExtractCore()
    extract_res = extract_core.run(
        ExtractInput(file_id=file_id, storage_path=str(pdf_path), society_hint=args.society)
    )

    if not extract_res.ok:
        print(f"[LỖI EXTRACT] {extract_res.error}", file=sys.stderr)
        sys.exit(2)

    cand_pages_raw = extract_res.data.get("candidate_pages", [])
    print(f"[+] Tìm thấy {len(cand_pages_raw)} trang chứa khuyến cáo lâm sàng.")

    if not cand_pages_raw:
        print("[!] Không tìm thấy trang khuyến cáo nào trong tài liệu.")
        sys.exit(0)

    candidate_pages = [CandidatePage(**p) for p in cand_pages_raw]

    # 2. Chạy Lõi Analyze với Gemini AI
    print(f"[*] BƯỚC 2: Đang gọi Gemini AI để trích xuất khuyến cáo chi tiết...")
    analyze_core = AnalyzeCore()
    analyze_res = analyze_core.run(
        AnalyzeInput(file_id=file_id, candidate_pages=candidate_pages, society_hint=args.society)
    )

    print("\n========== KẾT QUẢ PHÂN TÍCH (ANALYZE RESULT) ==========")
    if analyze_res.ok:
        data = analyze_res.data
        print(f"[+] Model đã sử dụng: {data['model_used']}")
        print(f"[+] Tổng tokens tiêu thụ: {data['total_tokens_used']}")
        print(f"[+] Tổng số khuyến cáo bóc tách: {data['total_recommendations']}\n")

        for idx, rec in enumerate(data["recommendations"]):
            print(f"--- [Khuyến cáo #{idx+1}] ID: {rec['rec_id']} (Trang {rec['page_num']}) ---")
            print(f"Hệ thống: {rec['grading_system']}")
            if rec.get("pico_id"):
                print(f"Câu hỏi: {rec['pico_id']}")
            if rec.get("cor"):
                print(f"Mức khuyến cáo: COR {rec['cor']} ({rec.get('cor_label')}) | LOE: {rec.get('loe')}")
            if rec.get("quality_of_evidence"):
                print(f"Chất lượng bằng chứng: {rec['quality_of_evidence']}")
                print(f"Cường độ khuyến cáo: {rec.get('strength_of_recommendation')}")
            if rec.get("voting"):
                print(f"Bỏ phiếu: {rec['voting']}")
            print(f"Nội dung: {rec['statement']}")
            if rec.get("driving_trials"):
                print(f"Thử nghiệm lâm sàng: {rec['driving_trials']}")
            print()
    else:
        print(json.dumps(analyze_res.model_dump(), indent=2, ensure_ascii=False))
        sys.exit(3)


if __name__ == "__main__":
    main()
