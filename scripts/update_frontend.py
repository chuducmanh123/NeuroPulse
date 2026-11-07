import re
from pathlib import Path

WORKSPACE = Path(__file__).resolve().parent.parent

# 1. Update ViewerToolbar.tsx
tb_path = WORKSPACE / "src" / "components" / "neurovision" / "ViewerToolbar.tsx"
tb_text = tb_path.read_text(encoding="utf-8")

old_line = '{ id: "venous", label: "Xoang Tĩnh mạch (VENAT 7T QSM) (7T)" },'
new_lines = """{ id: "venous_territories", label: "Lãnh thổ Tĩnh mạch (Venous Territories - 100%)" },
  { id: "venous", label: "Xoang & Tĩnh mạch (Vessel Lumen 7T)" },"""

if old_line in tb_text:
    tb_text = tb_text.replace(old_line, new_lines)
    tb_path.write_text(tb_text, encoding="utf-8")
    print("ViewerToolbar.tsx updated successfully!")
else:
    # Try regex in case of slight string variations
    print("Trying regex for ViewerToolbar...")
    tb_text = re.sub(
        r'\{\s*id:\s*"venous"[^}]+\},',
        new_lines,
        tb_text
    )
    tb_path.write_text(tb_text, encoding="utf-8")
    print("ViewerToolbar.tsx regex updated!")

# 2. Update NeuroViewerCanvas.tsx cache busting
nvc_path = WORKSPACE / "src" / "components" / "neurovision" / "NeuroViewerCanvas.tsx"
nvc_text = nvc_path.read_text(encoding="utf-8")
nvc_text = re.sub(
    r'/neurovision/data/colormaps/\$\{activeOverlay\}\.json\?v=[^`"]+',
    r'/neurovision/data/colormaps/${activeOverlay}.json?v=2026.11.7_venous_v2',
    nvc_text
)
nvc_path.write_text(nvc_text, encoding="utf-8")
print("NeuroViewerCanvas.tsx cache busting updated!")

# 3. Update page.tsx validation figures
page_path = WORKSPACE / "src" / "app" / "neurovision" / "page.tsx"
page_text = page_path.read_text(encoding="utf-8")
if "venous_territories_8slices.png" not in page_text:
    old_fig = '{ file: "overlay_venous.png", title: "Mật độ Tĩnh mạch 7T QSM (VENAT) trên T1" },'
    new_figs = """{ file: "venous_territories_8slices.png", title: "Phân vùng Lãnh thổ Dẫn lưu Tĩnh mạch (Venous Territories - Radiopaedia 8 lát cắt)" },
  { file: "overlay_venous.png", title: "Mật độ Tĩnh mạch 7T QSM (VENAT) trên T1" },"""
    page_text = page_text.replace(old_fig, new_figs)
    page_path.write_text(page_text, encoding="utf-8")
    print("page.tsx validation figure updated!")
