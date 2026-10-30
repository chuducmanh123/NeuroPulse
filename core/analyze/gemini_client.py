import os
import json
import socket
import ssl
import time
from pathlib import Path
from typing import Dict, Any, List, Optional
import requests
import certifi
from core.common.contracts import CoreException


def _ensure_ipv4():
    """Ép buộc socket dùng IPv4 để tránh nghẽn DNS/timeout trên Windows."""
    try:
        orig_getaddrinfo = socket.getaddrinfo

        def ipv4_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
            return orig_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)

        socket.getaddrinfo = ipv4_getaddrinfo
    except Exception:
        pass


class GeminiClient:
    """
    Client gọi Google Gemini REST API chuyên dụng cho trích xuất dữ liệu học thuật.
    Tự động quản lý API Key từ .env và cơ chế Waterfall Models.
    """

    def __init__(self, api_key: Optional[str] = None):
        _ensure_ipv4()
        self.api_key = api_key or self._load_api_key()
        if not self.api_key:
            raise CoreException(
                code="GEMINI_API_KEY_MISSING",
                message="Không tìm thấy GEMINI_API_KEY trong file .env hoặc biến môi trường hệ thống.",
                retryable=False,
            )

        # Danh sách mô hình theo chiến lược thác nước (Waterfall Strategy)
        self.models_priority = [
            "gemini-flash-lite-latest",
            "gemini-2.5-flash-lite",
            "gemini-2.5-flash",
            "gemini-1.5-flash",
        ]

    def _load_api_key(self) -> str:
        # 1. Thử lấy từ biến môi trường
        env_key = os.environ.get("GEMINI_API_KEY", "").strip().strip('"').strip("'")
        if env_key:
            return env_key

        # 2. Tìm kiếm trong các file .env ở thư mục hiện tại hoặc thư mục cha
        search_paths = [
            Path(".env"),
            Path(__file__).resolve().parent.parent.parent / ".env",
        ]
        for p in search_paths:
            if p.exists():
                try:
                    for line in p.read_text(encoding="utf-8").splitlines():
                        line = line.strip()
                        if line.startswith("GEMINI_API_KEY="):
                            val = line.split("=", 1)[1].strip().strip('"').strip("'")
                            if val:
                                return val
                except Exception:
                    pass
        return ""

    def generate_json(self, prompt: str, system_instruction: Optional[str] = None) -> Dict[str, Any]:
        """
        Gửi prompt đến Gemini và nhận lại JSON object.
        Tự động fallback qua các model trong danh sách ưu tiên nếu gặp lỗi quota hoặc tạm thời.
        Trả về: { "data": dict/list, "model": str, "tokens_used": int }
        """
        payload: Dict[str, Any] = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.1,
            },
        }

        if system_instruction:
            payload["systemInstruction"] = {
                "parts": [{"text": system_instruction}]
            }

        last_error = ""
        clean_headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": self.api_key,
        }

        for model_name in self.models_priority:
            # Dùng header x-goog-api-key thay vì truyền qua query string để bảo mật tuyệt đối,
            # tránh lộ API key vào log mạng, URL lỗi hoặc jobs.json khi gặp sự cố kết nối.
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
            try:
                # Ưu tiên dùng certifi CA bundle
                try:
                    response = requests.post(
                        url,
                        headers=clean_headers,
                        json=payload,
                        timeout=60,
                        verify=certifi.where(),
                    )
                except requests.exceptions.SSLError:
                    # Fallback an toàn nếu Windows chạy sau mạng proxy kiểm tra SSL
                    import urllib3
                    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
                    response = requests.post(
                        url,
                        headers=clean_headers,
                        json=payload,
                        timeout=60,
                        verify=False,
                    )

                if response.status_code == 200:
                    resp_json = response.json()
                    candidates = resp_json.get("candidates", [])
                    if not candidates:
                        continue

                    parts = candidates[0].get("content", {}).get("parts", [])
                    if not parts:
                        continue

                    raw_text = parts[0].get("text", "").strip()
                    parsed_data = json.loads(raw_text)

                    # Đọc token usage nếu có
                    usage = resp_json.get("usageMetadata", {})
                    tokens_used = usage.get("promptTokenCount", 0) + usage.get("candidatesTokenCount", 0)

                    return {
                        "data": parsed_data,
                        "model": model_name,
                        "tokens_used": tokens_used,
                    }

                elif response.status_code in (429, 503, 500):
                    last_error = f"HTTP {response.status_code} từ {model_name}"
                    time.sleep(1)
                    continue
                else:
                    last_error = f"HTTP {response.status_code}: {response.text[:200]}"
                    continue

            except Exception as e:
                err_msg = str(e)
                # Tẩy sạch API key khỏi chuỗi exception nếu có
                err_msg = re.sub(r"AIza[0-9A-Za-z-_]{35}", "[REDACTED_KEY]", err_msg)
                err_msg = re.sub(r"key=[0-9A-Za-z-_]+", "key=[REDACTED]", err_msg)
                last_error = f"Lỗi kết nối tới {model_name}: {err_msg}"
                continue

        safe_error = re.sub(r"AIza[0-9A-Za-z-_]{35}", "[REDACTED_KEY]", last_error)
        safe_error = re.sub(r"key=[0-9A-Za-z-_]+", "key=[REDACTED]", safe_error)

        raise CoreException(
            code="GEMINI_ALL_MODELS_FAILED",
            message=f"Tất cả các model Gemini đều không phản hồi: {safe_error}",
            retryable=True,
            details={"last_error": safe_error},
        )
