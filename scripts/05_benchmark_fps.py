"""
Benchmark actual NiiVue WebGL render FPS on host machine.
Runs headless Chrome/Edge, loads T1.nii.gz and aspects.nii.gz, performs continuous drawScene
and slice translation cycles, and reports exact FPS via POST callback.
"""

import http.server
import json
import os
import socketserver
import subprocess
import sys
import threading
import time

PORT = 9877
WORKSPACE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
benchmark_result = None

BENCHMARK_HTML = """<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>NiiVue FPS Benchmark</title>
  <script src="/node_modules/@niivue/niivue/dist/niivue.umd.js"></script>
</head>
<body style="margin:0; background:#000;">
  <canvas id="gl-canvas" width="800" height="600" style="width:800px; height:600px;"></canvas>
  <script>
    async function runBenchmark() {
      try {
        const nv = new niivue.Niivue({
          backColor: [0.08, 0.09, 0.12, 1],
          show3Dcrosshair: true,
          loadingText: 'Loading benchmark...'
        });
        nv.attachToCanvas(document.getElementById('gl-canvas'));

        await nv.loadVolumes([
          { url: '/public/neurovision/volumes/T1.nii.gz', name: 'T1.nii.gz', opacity: 1.0 },
          { url: '/public/neurovision/atlases/aspects.nii.gz', name: 'aspects.nii.gz', opacity: 0.7 }
        ]);

        const cmRes = await fetch('/public/neurovision/data/colormaps/aspects.json');
        const cm = await cmRes.json();
        nv.volumes[1].setColormapLabel(cm);
        nv.updateGLVolume();

        const N_FRAMES = 120;
        const tStart = performance.now();

        for (let i = 0; i < N_FRAMES; i++) {
          const fracZ = (i % 60) / 60.0;
          nv.scene.crosshairPos = [0.5, 0.5, fracZ];
          nv.drawScene();
        }

        const tEnd = performance.now();
        const totalMs = tEnd - tStart;
        const avgMsPerFrame = totalMs / N_FRAMES;
        const measuredFps = (1000.0 / avgMsPerFrame);

        const payload = {
          frames: N_FRAMES,
          totalTimeMs: totalMs.toFixed(2),
          avgFrameMs: avgMsPerFrame.toFixed(2),
          fps: measuredFps.toFixed(1)
        };

        await fetch('/report_fps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        await fetch('/report_fps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: String(err) })
        });
      }
    }

    window.addEventListener('DOMContentLoaded', runBenchmark);
  </script>
</body>
</html>
"""

class BenchmarkHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WORKSPACE_DIR, **kwargs)

    def do_POST(self):
        global benchmark_result
        if self.path == '/report_fps':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            benchmark_result = json.loads(post_data.decode('utf-8'))
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b"OK")
        else:
            self.send_error(404)

    def log_message(self, format, *args):
        pass

def main():
    bench_file = os.path.join(WORKSPACE_DIR, "public", "benchmark_runner.html")
    with open(bench_file, "w", encoding="utf-8") as f:
        f.write(BENCHMARK_HTML)

    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(("", PORT), BenchmarkHandler)
    server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    server_thread.start()

    browser_candidates = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    ]
    browser = next((b for b in browser_candidates if os.path.exists(b)), None)
    if not browser:
        print("ERROR: No Chrome or Edge found")
        sys.exit(1)

    url = f"http://127.0.0.1:{PORT}/public/benchmark_runner.html"

    cmd = [
        browser,
        "--headless=new",
        "--disable-gpu-sandbox",
        "--enable-webgl",
        "--use-gl=angle",
        url
    ]

    proc = subprocess.Popen(cmd)

    start = time.time()
    while time.time() - start < 15:
        if benchmark_result is not None:
            break
        time.sleep(0.3)

    proc.terminate()
    try:
        proc.wait(timeout=2)
    except:
        proc.kill()
    httpd.shutdown()

    if os.path.exists(bench_file):
        os.remove(bench_file)

    if benchmark_result and 'fps' in benchmark_result:
        print("\n" + "="*55)
        print("   NIIVUE WEBGL EMPIRICAL PERFORMANCE BENCHMARK")
        print("="*55)
        print(f"   Frames Rendered  : {benchmark_result['frames']} frames")
        print(f"   Total Duration   : {benchmark_result['totalTimeMs']} ms")
        print(f"   Avg Frame Time   : {benchmark_result['avgFrameMs']} ms/frame")
        print(f"   Measured Real FPS: {benchmark_result['fps']} FPS")
        print("="*55)
    else:
        print("Benchmark result:", benchmark_result)

if __name__ == "__main__":
    main()
