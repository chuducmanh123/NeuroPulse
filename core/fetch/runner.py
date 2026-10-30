import argparse
import json
import sys
from core.fetch.core import FetchCore, FetchInput


def main():
    parser = argparse.ArgumentParser(description="NeuroGuide FetchCore CLI Runner")
    parser.add_argument("--url", type=str, help="URL trực tiếp của guideline PDF")
    parser.add_argument("--file", type=str, help="Đường dẫn file PDF cục bộ")
    parser.add_argument("--society", type=str, default="AHA", help="Tên hiệp hội y khoa (AHA, ESO, AAN...)")
    parser.add_argument("--title", type=str, help="Gợi ý tiêu đề bài báo")
    parser.add_argument("--year", type=int, help="Năm xuất bản")

    args = parser.parse_args()

    if not args.url and not args.file:
        print("[LỖI] Cần cung cấp ít nhất --url hoặc --file.", file=sys.stderr)
        parser.print_help()
        sys.exit(1)

    fetch_core = FetchCore()
    input_payload = FetchInput(
        source_url=args.url,
        local_path=args.file,
        society=args.society,
        title_hint=args.title,
        year_hint=args.year,
    )

    print(f"[*] Đang chạy FetchCore: {args.url or args.file}...")
    result = fetch_core.run(input_payload)

    print("\n========== KẾT QUẢ THỰC THI CORE RESULT ==========")
    print(json.dumps(result.model_dump(), indent=2, ensure_ascii=False))

    if not result.ok:
        sys.exit(2)


if __name__ == "__main__":
    main()
