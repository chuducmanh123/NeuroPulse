import argparse
import json
import sys
from pathlib import Path
from core.extract.core import ExtractCore, ExtractInput


def main():
    parser = argparse.ArgumentParser(description="NeuroGuide ExtractCore CLI Runner")
    parser.add_argument("--file-id", type=str, help="Mã SHA-256 của file đã lưu trong kho")
    parser.add_argument("--path", type=str, help="Đường dẫn trực tiếp tới file PDF")
    parser.add_argument("--society", type=str, help="Gợi ý hiệp hội (AHA, ESO, AAN...)")

    args = parser.parse_args()

    if not args.file_id and not args.path:
        print("[LỖI] Cần cung cấp ít nhất --file-id hoặc --path.", file=sys.stderr)
        parser.print_help()
        sys.exit(1)

    file_id = args.file_id or Path(args.path).stem
    input_payload = ExtractInput(
        file_id=file_id,
        storage_path=args.path,
        society_hint=args.society,
    )

    core = ExtractCore()
    print(f"[*] Đang chạy ExtractCore: {args.path or args.file_id}...")
    result = core.run(input_payload)

    print("\n========== KẾT QUẢ BÓC TÁCH (EXTRACT RESULT) ==========")
    if result.ok:
        data = result.data
        print(f"[+] Tổng số trang: {data['total_pages']}")
        print(f"[+] Số trang chứa khuyến cáo (Candidate Pages): {data['candidate_page_count']}")
        print(f"[+] Hệ thống phân loại phát hiện: {data['detected_grading_systems']}")
        for cp in data["candidate_pages"]:
            print(f"   - Trang {cp['page_num']}: [{cp['grading_system']}] Tín hiệu: {cp['matched_signals']}")
            print(f"     Số bảng trích xuất: {len(cp['extracted_tables'])}")
            for t in cp["extracted_tables"]:
                print(f"       * Bảng #{t['table_index']} ({len(t['rows'])} dòng): {t['headers']}")
    else:
        print(json.dumps(result.model_dump(), indent=2, ensure_ascii=False))
        sys.exit(2)


if __name__ == "__main__":
    main()
