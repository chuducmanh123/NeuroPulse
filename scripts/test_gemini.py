import os
import json
import socket
import ssl
import time
import urllib.request
import urllib.error

# 1. Ép buộc dùng IPv4 (AF_INET) để khắc phục triệt để lỗi "The read operation timed out"
_orig_getaddrinfo = socket.getaddrinfo
def _ipv4_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
    return _orig_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
socket.getaddrinfo = _ipv4_getaddrinfo

# 2. Tự động đọc GEMINI_API_KEY từ file .env
def load_env_key() -> str:
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("GEMINI_API_KEY="):
                    val = line.split("=", 1)[1].strip().strip('"').strip("'")
                    if val:
                        return val
    return os.environ.get("GEMINI_API_KEY", "").strip().strip('"').strip("'")

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

api_key = load_env_key()

print("=" * 68)
print("KIỂM TRA KẾT NỐI GEMINI AI (ƯU TIÊN GEMINI-FLASH-LITE-LATEST)")
print("=" * 68)

if not api_key:
    print("[!] Chưa tìm thấy GEMINI_API_KEY trong file .env hoặc biến môi trường.")
    exit(1)

print(f"-> Đang sử dụng API Key: {api_key[:10]}...{api_key[-4:]}")

# Ưu tiên gemini-flash-lite-latest đầu tiên vì phản hồi tức thì và hạn mức Free Tier rộng nhất
candidate_models = ["gemini-flash-lite-latest", "gemini-3.5-flash-lite", "gemini-3.8-flash"]

payload = {
    "contents": [{"parts": [{"text": "Reply with exact phrase: OK READY FOR NEUROLOGY"}]}],
    "generationConfig": {
        "temperature": 0.1,
        "maxOutputTokens": 128
    }
}

success = False
for model_name in candidate_models:
    if success:
        break
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
    for attempt in range(1, 3):
        print(f"-> Thử kết nối [{model_name}] (lần {attempt}/2)...")
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        try:
            with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
                ans = "".join(p.get("text", "") for p in parts if "text" in p and not p.get("thought")).strip()
                print(f"\n[THÀNH CÔNG] Phản hồi từ '{model_name}': '{ans}'")
                print("==> Khóa API và kết nối Gemini AI hoạt động chính xác 100%!")
                success = True
                break
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504):
                print(f"   [!] Máy chủ '{model_name}' đang bận (HTTP {e.code}), thử lại...")
                time.sleep(2)
            else:
                print(f"   [!] Mô hình '{model_name}' báo HTTP {e.code}, chuyển sang mô hình dự phòng...")
                break
        except Exception as e:
            print(f"   [!] Lỗi mạng tạm thời ({e}), thử lại...")
            time.sleep(1)

if not success:
    print("[!] Không thể kết nối. Vui lòng thử lại sau ít phút.")
print("=" * 68)
