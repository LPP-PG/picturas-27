"""Measures how long PictuRAS takes to process a video pipeline, end to end.

It drives the public API like the frontend does: it creates a project, uploads
a sample video, adds the tools, presses Apply and waits until the results are
committed. The time runs from the Apply request until the results are visible.

Run it against the running stack (base commit or fase-2) with the same options:

    python medicoes/medir-tempo-video.py --label fase-2 --reps 5

Only the Python standard library is used. Results go to medicoes/resultados/.
"""
import argparse
import csv
import datetime
import json
import os
import ssl
import statistics
import sys
import time
import urllib.error
import urllib.request
import uuid

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAMPLES = os.path.join(ROOT, "samples", "video")

# No crop in the scenarios: the base commit treats crop margins as coordinates
# and fails, which would make the comparison meaningless.
SCENARIOS = {
    "A": {
        "description": "editing only (one FFmpeg pass in both versions)",
        "video": "sample_10s_720p.mp4",
        "tools": [
            {"procedure": "brightness", "params": {"brightness": 1.3}},
            {"procedure": "contrast", "params": {"contrastFactor": 1.2}},
            {"procedure": "rotate", "params": {"degrees": 90}},
            {"procedure": "resize", "params": {"width": 640, "height": 360}},
        ],
        "timeout": 600,
    },
    "B": {
        "description": "editing + subtitles + frame extraction (three stages after the split)",
        "video": "speech_mandela_177s_1080p.webm",
        # Trim keeps each run to the first 30 s of speech; it is part of the editing stage
        "tools": [
            {"procedure": "trim", "params": {"start": 0, "end": 30, "imgId": "{video}"}},
            {"procedure": "brightness", "params": {"brightness": 1.2}},
            {"procedure": "subtitles", "params": {}},
            {"procedure": "extract_frames",
             "params": {"mode": "count", "count": 4, "interval": 1, "format": "png"}},
        ],
        "timeout": 3600,
    },
}

# The stack uses a self-signed certificate on localhost
TLS = ssl.create_default_context()
TLS.check_hostname = False
TLS.verify_mode = ssl.CERT_NONE


class Api:
    def __init__(self, base):
        self.base = base.rstrip("/")
        self.token = None

    def call(self, method, path, body=None, headers=None, raw=None, content_type=None):
        data, hdrs = None, dict(headers or {})
        if raw is not None:
            data = raw
            hdrs["Content-Type"] = content_type
        elif body is not None:
            data = json.dumps(body).encode()
            hdrs["Content-Type"] = "application/json"
        if self.token:
            hdrs["Authorization"] = f"Bearer {self.token}"
        # Reads are safe to repeat after a dropped connection; writes are not
        attempts = 5 if method == "GET" else 1
        for attempt in range(1, attempts + 1):
            req = urllib.request.Request(self.base + path, data=data, headers=hdrs, method=method)
            try:
                with urllib.request.urlopen(req, context=TLS, timeout=600) as resp:
                    text = resp.read().decode(errors="replace")
                    is_json = text[:1] in ("{", "[")
                    return resp.status, resp.headers, (json.loads(text) if is_json else text)
            except urllib.error.HTTPError as err:
                raise RuntimeError(f"{method} {path} -> {err.code}: {err.read()[:300]!r}") from None
            except (urllib.error.URLError, ConnectionError):
                if attempt == attempts:
                    raise
                time.sleep(1)


def multipart(field, path):
    boundary = uuid.uuid4().hex
    name = os.path.basename(path)
    with open(path, "rb") as f:
        payload = f.read()
    body = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"{field}\"; "
            f"filename=\"{name}\"\r\nContent-Type: application/octet-stream\r\n\r\n").encode()
    body += payload + f"\r\n--{boundary}--\r\n".encode()
    return body, f"multipart/form-data; boundary={boundary}"


def version_from(headers, current):
    value = headers.get("X-Project-Version")
    return int(value) if value else current


def register(api):
    email = f"medicao-{uuid.uuid4().hex[:10]}@example.test"
    _, _, data = api.call("POST", "/users/", {
        "name": "Medicao", "email": email,
        "password": uuid.uuid4().hex, "type": "premium",
    })
    api.token = data["jwt"]
    return data["user"]["_id"]


def run_once(api, uid, scenario):
    _, _, project = api.call("POST", f"/projects/{uid}", {"name": f"medicao-{uuid.uuid4().hex[:6]}"})
    pid = project["_id"]
    version = int(project.get("version") or 0)
    try:
        body, ctype = multipart("video", os.path.join(SAMPLES, scenario["video"]))
        _, headers, _ = api.call("POST", f"/projects/{uid}/{pid}/video", raw=body,
                                 content_type=ctype, headers={"X-Project-Version": str(version)})
        version = version_from(headers, version)
        _, _, current = api.call("GET", f"/projects/{uid}/{pid}")
        video_id = current["imgs"][0]["_id"]
        for tool in scenario["tools"]:
            params = {k: (video_id if v == "{video}" else v) for k, v in tool["params"].items()}
            tool = {"procedure": tool["procedure"], "params": params}
            _, headers, _ = api.call("POST", f"/projects/{uid}/{pid}/tool", tool, headers={
                "X-Project-Version": str(version), "X-Op-Id": str(uuid.uuid4())})
            version = version_from(headers, version)

        started = time.perf_counter()
        api.call("POST", f"/projects/{uid}/{pid}/process", {"runnerUserId": uid},
                 headers={"X-Project-Version": str(version)})
        while True:
            _, _, results = api.call("GET", f"/projects/{uid}/{pid}/process/url")
            if results.get("imgs"):
                return time.perf_counter() - started, len(results["imgs"])
            if time.perf_counter() - started > scenario["timeout"]:
                raise RuntimeError(f"no results after {scenario['timeout']} s")
            time.sleep(0.25)
    finally:
        try:
            _, _, current = api.call("GET", f"/projects/{uid}/{pid}")
            api.call("DELETE", f"/projects/{uid}/{pid}",
                     headers={"X-Project-Version": str(current.get("version") or 0)})
        except RuntimeError as err:
            print(f"  (could not delete project {pid}: {err})", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--label", required=True, help="version being measured, e.g. base or fase-2")
    parser.add_argument("--reps", type=int, default=5)
    parser.add_argument("--scenarios", default="A,B")
    parser.add_argument("--no-warmup", action="store_true")
    parser.add_argument("--url", default="https://localhost:8080/api-gateway")
    args = parser.parse_args()

    api = Api(args.url)
    uid = register(api)
    out_dir = os.path.join(ROOT, "medicoes", "resultados")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, f"tempo-video-{args.label}.csv")

    rows = []
    for key in args.scenarios.split(","):
        scenario = SCENARIOS[key]
        print(f"Scenario {key}: {scenario['description']}")
        if not args.no_warmup:
            # The first run downloads the Whisper model and warms caches
            seconds, _ = run_once(api, uid, scenario)
            print(f"  warm-up: {seconds:.2f} s (not counted)")
        times = []
        for rep in range(1, args.reps + 1):
            when = datetime.datetime.now().isoformat(timespec="seconds")
            seconds, outputs = run_once(api, uid, scenario)
            times.append(seconds)
            rows.append({"label": args.label, "scenario": key, "rep": rep, "started": when,
                         "seconds": f"{seconds:.3f}", "outputs": outputs})
            print(f"  run {rep}: {seconds:.2f} s ({outputs} result(s))")
        print(f"  median {statistics.median(times):.2f} s | min {min(times):.2f} | max {max(times):.2f}")

    with open(out_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    print(f"Saved {out_path}")


if __name__ == "__main__":
    main()
