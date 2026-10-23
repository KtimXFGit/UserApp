#!/usr/bin/env python3
"""TPD-03 Web APP demo server.
- Serves the simulator UI on port 8081.
- Receives TPD-03 dose POSTs on /api/PersonalDev/GetHttpData.
- Handles time-sync POST on /.
- Exposes /api/latest for the browser UI.
No third-party Python packages are required.
"""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import unquote_plus
from datetime import datetime
import json, re, threading, os

ROOT = Path(__file__).resolve().parent.parent
STATE_LOCK = threading.Lock()
STATE = {
    "deviceId": "PR-20260703-002",
    "latest": None,
    "records": [],
    "receivedAt": None,
    "recordCount": 0,
}

RECORD_RE = re.compile(
    r"Time=([^&]+)&RD=([^&]+)(?:&Am=[^&]*)?(?:&Av=[^&]*)?(?:&Ac=[^&]*)?"
    r"(?:&DP=[^&]*)?&AcDo=([^&]+)", re.I
)


def parse_dose_body(body: str):
    text = unquote_plus(body.strip())
    first_amp = text.find("&")
    device_id = text[:first_amp] if first_amp > 0 else "UNKNOWN"
    if device_id.lower().startswith("id="):
        device_id = device_id[3:]
    records = []
    for m in RECORD_RE.finditer(text):
        try:
            records.append({
                "time": m.group(1),
                "rd": float(m.group(2)),
                "acDo": float(m.group(3)),
            })
        except ValueError:
            continue
    return device_id, records


class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        raw = path.split("?", 1)[0].split("#", 1)[0]
        if raw == "/": raw = "/index.html"
        return str(ROOT / raw.lstrip("/"))

    def log_message(self, fmt, *args):
        print("[%s] %s" % (self.log_date_time_string(), fmt % args))

    def _json(self, obj, code=200):
        data = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path.startswith("/api/latest"):
            with STATE_LOCK:
                self._json(dict(STATE))
            return
        return super().do_GET()

    def do_POST(self):
        length = int(self.headers.get("Content-Length", "0") or 0)
        body = self.rfile.read(length).decode("utf-8", errors="replace")

        if self.path.startswith("/api/PersonalDev/GetHttpData"):
            device_id, records = parse_dose_body(body)
            with STATE_LOCK:
                if records:
                    STATE["deviceId"] = device_id
                    STATE["latest"] = records[-1]
                    STATE["records"] = records[-60:]
                    STATE["recordCount"] = len(records)
                    STATE["receivedAt"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            data = b"Success"
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return

        if self.path == "/" or self.path.startswith("/?"):
            m = re.search(r"Id=([^&]+)", body, re.I)
            device_id = m.group(1) if m else STATE.get("deviceId", "UNKNOWN")
            reply = f"ID={device_id.upper()}&TIME={datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
            data = reply.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/x-www-form-urlencoded")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return

        self.send_error(404)


def main():
    os.chdir(ROOT)
    port = int(os.environ.get("TPD03_PORT", "8081"))
    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"TPD-03 Web APP server: http://0.0.0.0:{port}")
    print(f"Dose POST endpoint: http://<PC-IP>:{port}/api/PersonalDev/GetHttpData")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

if __name__ == "__main__":
    main()
