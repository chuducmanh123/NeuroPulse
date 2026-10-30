# Implementation Plan: Thiết lập Lõi Điều phối Xử lý Học thuật NeuroGuide (Bước 0 & 1)

## 1. Overview
Thiết lập hệ thống các lõi độc lập (Modular Core Pipeline) xử lý tài liệu hướng dẫn lâm sàng (Guidelines):
- **Bước 0 (`core-common`)**: Chuẩn hóa Data Contract, Máy trạng thái vòng đời tài liệu, Interface dùng chung `BaseCore`, và mô hình `CoreResult` / `CoreError`.
- **Bước 1 (`core-fetch`)**: Lõi thu nạp tài liệu chuyên sâu bằng `pymupdf` & `pdfplumber`, kiểm tra magic bytes, hash SHA-256 chống trùng lặp, tính số trang và lưu trữ qua Local Storage Adapter.

---

## 2. Architecture & Components

```
d:\NeuroPulse\
├── core\
│   ├── common\
│   │   ├── base.py            # BaseCore Protocol & Abstract Class
│   │   ├── contracts.py       # Pydantic schemas: CoreResult, CoreError, State
│   │   └── storage.py         # Abstract Storage Adapter
│   └── fetch\
│       ├── core.py            # FetchCore implementation
│       ├── storage_adapter.py # LocalFileStorage implementation
│       └── runner.py          # CLI Runner (python -m core.fetch.runner)
├── data\
│   └── guidelines_raw\        # Lưu trữ PDF gốc theo {sha256}.pdf
└── tests\
    └── core\
        ├── test_common.py
        └── test_fetch.py
```

---

## 3. Implementation Order
1. **Task 1: Cài đặt Dependencies**: Cài đặt các gói chuyên sâu `pymupdf`, `pdfplumber`, `pydantic`, `requests`, `pytest`.
2. **Task 2: Xây dựng Module `core/common`**:
   - `contracts.py`: `DocumentLifecycleState`, `CoreError`, `CoreResult`, `GuidelineMetadata`.
   - `base.py`: Lớp trừu tượng `BaseCore` định nghĩa hợp đồng gọi `run(input: BaseModel) -> CoreResult`.
   - `storage.py`: Giao diện trừu tượng `StorageAdapter` (`save`, `get`, `exists`, `get_path`).
3. **Task 3: Xây dựng Module `core/fetch`**:
   - `storage_adapter.py`: `LocalStorageAdapter` lưu trữ tại `data/guidelines_raw/`.
   - `core.py`: `FetchCore` nhận `FetchInput` (URL hoặc file local), kiểm tra `%PDF-`, tính SHA-256, mở bằng `pymupdf`/`pdfplumber` để kiểm tra độ nguyên vẹn và số trang.
   - `runner.py`: CLI chạy độc lập từ terminal.
4. **Task 4: Viết Test Suite & Kiểm thử**:
   - `tests/core/test_common.py`: Kiểm tra schema, serialization, error structure.
   - `tests/core/test_fetch.py`: Kiểm tra tải PDF, phát hiện trùng lặp hash (idempotency), phát hiện file giả mạo/hỏng.
