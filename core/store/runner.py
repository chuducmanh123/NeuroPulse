import argparse
import json
import sys
from core.store.manager import GuidelineStoreManager
from core.common.contracts import ApprovalStatus


def main():
    parser = argparse.ArgumentParser(description="NeuroGuide Store & Review Manager CLI")
    parser.add_argument(
        "--action",
        type=str,
        choices=["queue", "list", "approve", "reject"],
        default="queue",
        help="Thao tác: queue (xem hàng đợi), list (xem catalog), approve (duyệt), reject (từ chối)",
    )
    parser.add_argument("--file-id", type=str, help="ID của tài liệu guideline")
    parser.add_argument("--rec-id", type=str, help="ID khuyến cáo cần duyệt")
    parser.add_argument("--reviewer", type=str, default="Dr. Specialist", help="Tên hoặc ID bác sĩ duyệt")
    parser.add_argument("--notes", type=str, help="Ghi chú lâm sàng của bác sĩ")

    args = parser.parse_args()
    manager = GuidelineStoreManager()

    if args.action == "queue":
        queue = manager.get_review_queue()
        print(f"\n========== HÀNG ĐỢI CHỜ DUYỆT (REVIEW QUEUE: {len(queue)} MỤC) ==========")
        if not queue:
            print("[+] Không có khuyến cáo nào đang chờ duyệt.")
        for idx, item in enumerate(queue):
            print(f"[{idx+1}] ID: {item.rec_id} | Guideline: {item.guideline_id} (Trang {item.page_num})")
            print(f"    Hệ thống: {item.grading_system}")
            if item.cor:
                print(f"    Mức độ: COR {item.cor} ({item.cor_label}) | LOE {item.loe}")
            if item.quality_of_evidence:
                print(f"    GRADE: {item.quality_of_evidence} | Cường độ: {item.strength_of_recommendation} | Voting: {item.voting}")
            print(f"    Nội dung: {item.statement}")
            print(f"    Trạng thái kiểm chứng: {item.verification_detail.status}")
            print("-" * 60)

    elif args.action == "list":
        if manager.catalog_path.exists():
            catalog = json.loads(manager.catalog_path.read_text(encoding="utf-8"))
            print(f"\n========== DANH MỤC GUIDELINES TRONG KHO ({len(catalog)}) ==========")
            print(json.dumps(catalog, indent=2, ensure_ascii=False))
        else:
            print("[!] Chưa có tài liệu nào trong kho lưu trữ.")

    elif args.action == "approve":
        if not args.file_id or not args.rec_id:
            print("[LỖI] Cần cung cấp cả --file-id và --rec-id để phê duyệt.", file=sys.stderr)
            sys.exit(1)
        res = manager.review_recommendation(
            file_id=args.file_id,
            rec_id=args.rec_id,
            new_status=ApprovalStatus.APPROVED,
            reviewer_id=args.reviewer,
            notes=args.notes,
        )
        if res:
            print(f"[THÀNH CÔNG] Khuyến cáo {args.rec_id} đã được Bác sĩ {args.reviewer} DUYỆT (APPROVED)!")
        else:
            print(f"[THẤT BẠI] Không tìm thấy khuyến cáo {args.rec_id} trong {args.file_id}.", file=sys.stderr)
            sys.exit(2)

    elif args.action == "reject":
        if not args.file_id or not args.rec_id:
            print("[LỖI] Cần cung cấp cả --file-id và --rec-id để từ chối.", file=sys.stderr)
            sys.exit(1)
        res = manager.review_recommendation(
            file_id=args.file_id,
            rec_id=args.rec_id,
            new_status=ApprovalStatus.REJECTED,
            reviewer_id=args.reviewer,
            notes=args.notes,
        )
        if res:
            print(f"[THÀNH CÔNG] Khuyến cáo {args.rec_id} đã được đánh dấu TỪ CHỐI (REJECTED)!")
        else:
            print(f"[THẤT BẠI] Không tìm thấy khuyến cáo {args.rec_id}.", file=sys.stderr)
            sys.exit(2)


if __name__ == "__main__":
    main()
