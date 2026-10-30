import argparse
import json
import sys
from core.discovery.core import DiscoveryCore
from core.common.contracts import DiscoveryInput


def main():
    parser = argparse.ArgumentParser(description="NeuroGuide DiscoveryCore CLI Runner")
    parser.add_argument(
        "--society",
        type=str,
        help="Mã nguồn cần quét (ví dụ: ESO, ILAE_REP, AES, ALZ_WILEY, PNS, AHS...). Mặc định quét tất cả.",
    )
    parser.add_argument("--limit", type=int, default=5, help="Giới hạn số lượng bài mỗi nguồn (mặc định 5)")
    parser.add_argument("--year-min", type=int, default=2019, help="Năm xuất bản tối thiểu (mặc định 2019)")

    args = parser.parse_args()
    societies = [s.strip() for s in args.society.split(",")] if args.society else None

    print(f"[*] Đang chạy DiscoveryCore (Nguồn: {societies or 'TẤT CẢ'}, Limit/nguồn: {args.limit}, Từ năm: {args.year_min})...")
    core = DiscoveryCore()
    res = core.run(DiscoveryInput(societies=societies, limit_per_source=args.limit, year_min=args.year_min))

    print("\n========== KẾT QUẢ PHÁT HIỆN GUIDELINES (DISCOVERY REPORT) ==========")
    if res.ok:
        data = res.data
        print(f"[+] Tổng số guidelines phát hiện: {data['total_discovered']}")
        print(f"[+] Số guidelines MỚI CHƯA CÓ TRONG KHO: {data['new_discovered_count']}\n")

        for idx, item in enumerate(data["items"]):
            new_tag = "[MỚI]" if item["is_new"] else "[ĐÃ CÓ TRONG KHO]"
            year_str = f"({item['year']})" if item.get("year") else ""
            print(f"{new_tag} #{idx+1} [{item['category']}] {item['society']} {year_str}")
            print(f"       Tiêu đề: {item['title']}")
            print(f"       Nguồn URL: {item['source_url']}")
            if item.get("doi"):
                print(f"       DOI: {item['doi']}")
            print("-" * 65)
    else:
        print(json.dumps(res.model_dump(), indent=2, ensure_ascii=False))
        sys.exit(1)


if __name__ == "__main__":
    main()
