import argparse
import json
import sys
from core.orchestrator.pipeline import GuidelineOrchestrator


def main():
    parser = argparse.ArgumentParser(description="NeuroGuide Full Pipeline Orchestrator CLI")
    parser.add_argument("--url", type=str, help="URL trực tiếp của guideline PDF")
    parser.add_argument("--file", type=str, help="Đường dẫn file PDF cục bộ")
    parser.add_argument("--society", type=str, default="AHA", help="Hiệp hội (AHA, ESO, ILAE...)")
    parser.add_argument("--title", type=str, help="Tựa đề hướng dẫn lâm sàng")
    parser.add_argument("--year", type=int, help="Năm ban hành")
    parser.add_argument("--discover", action="store_true", help="Chạy quét phát hiện guideline mới")
    parser.add_argument("--societies-filter", type=str, help="Danh sách hội cách nhau dấu phẩy khi quét discovery")

    args = parser.parse_args()
    orchestrator = GuidelineOrchestrator()

    if args.discover:
        soc_list = [s.strip() for s in args.societies_filter.split(",")] if args.societies_filter else None
        res = orchestrator.run_discovery_scan(societies=soc_list)
        print(json.dumps(res.model_dump(), indent=2, ensure_ascii=False))
        if not res.ok:
            sys.exit(1)
        return

    if not args.url and not args.file:
        print(json.dumps({
            "ok": False,
            "error": {"code": "MISSING_INPUT", "message": "Cần cung cấp ít nhất --url hoặc --file hoặc cờ --discover"}
        }, indent=2, ensure_ascii=False))
        sys.exit(2)

    res = orchestrator.process_single_guideline(
        source_url=args.url,
        local_path=args.file,
        society=args.society,
        title=args.title,
        year=args.year,
    )

    print(json.dumps(res.model_dump(), indent=2, ensure_ascii=False))
    if not res.ok:
        sys.exit(3)


if __name__ == "__main__":
    main()
