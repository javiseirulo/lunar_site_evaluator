#!/usr/bin/env python3
"""Gemini TTS voice test for the Moonfall voice-over. Stdlib only.

  python3 voices.py list [search]          list male/low English voices (+ search term, e.g. gero)
  python3 voices.py full NAME_OR_ID ...    whole script in ONE request per voice -> vo/full/<voice>.wav
  python3 voices.py render NAME_OR_ID ...  render all lines in vo_lines.json for each voice -> vo/<voice>/<line>.wav

Key: GEMINI_API_KEY from the environment or from ./.env (never printed).
"""
import base64, json, os, re, sys, time, urllib.parse, urllib.request
from pathlib import Path

HERE = Path(__file__).parent
BASE = "https://generativelanguage.googleapis.com/v1beta"
MODEL = "gemini-3.8-flash-tts"  # per current docs; change here if the model name moves
PREBUILT_FALLBACKS = ["Charon", "Algenib", "Alnilam", "Orus", "Gacrux"]  # low / firm / gravelly / informative

def key():
    k = os.environ.get("GEMINI_API_KEY")
    env = HERE / ".env"
    if not k and env.exists():
        for line in env.read_text().splitlines():
            if line.startswith("GEMINI_API_KEY="):
                k = line.split("=", 1)[1].strip().strip('"\'')
    if not k:
        sys.exit("Missing GEMINI_API_KEY (env var or moonfall_video/.env)")
    return k

def call(url, body=None):
    req = urllib.request.Request(url, headers={"x-goog-api-key": key(), "Content-Type": "application/json"},
                                 data=None if body is None else json.dumps(body).encode())
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            msg = e.read().decode()
            m = re.search(r"retry in (?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?", msg)
            secs = (int(m.group(1) or 0) * 3600 + int(m.group(2) or 0) * 60 + int(m.group(3) or 0)) if m else 0
            if e.code == 429 and attempt < 5 and 0 < secs <= 120:  # per-minute limit only
                time.sleep(secs + 3)
                continue
            sys.exit(f"HTTP {e.code}: {msg[:500]}")

def list_voices(search=None):
    q = [("language_code", "en-US"), ("language_code", "en-GB"), ("gender", "male"), ("pitch", "low"), ("page_size", "200")]
    if search:
        q = [("search", search), ("page_size", "200")]
    return call(f"{BASE}/voices?{urllib.parse.urlencode(q)}").get("voices", [])

def audio_b64(resp):
    if resp.get("output_audio", {}).get("data"):
        return resp["output_audio"]["data"]
    for step in reversed(resp.get("steps", [])):
        for c in step.get("content", []):
            if c.get("type") == "audio":
                return c["data"]
    sys.exit("No audio in response: " + json.dumps(resp)[:300])

def resolve(name):
    if name in PREBUILT_FALLBACKS or name.startswith("voice_"):
        return name, name
    for v in list_voices(name):
        if v.get("display_name", "").lower().startswith(name.lower()) or v.get("id") == name:
            return v["id"], v["display_name"].replace(" ", "_").replace(":", "")
    sys.exit(f"Voice not found: {name}")

def render(name):
    vid, label = resolve(name)
    out = HERE / "vo" / label
    out.mkdir(parents=True, exist_ok=True)
    for ln in json.loads((HERE / "vo_lines.json").read_text()):
        target = out / f"{ln['id']}.wav"
        if target.exists():
            continue
        body = {"model": MODEL,
                "input": [{"type": "user_input", "content": [{"type": "text", "text": ln["text"],
                           "annotations": [{"type": "speech_metadata", "style": ln["style"]}]}]}],
                "response_format": {"type": "audio"},
                "generation_config": {"speech_config": [{"voice": vid}]}}
        target.write_bytes(base64.b64decode(audio_b64(call(f"{BASE}/interactions", body))))
        time.sleep(21)  # stay under 3 requests/min
        print("ok", label, ln["id"])

def render_full(name):
    """One request per voice: the whole script, each line with its own style annotation."""
    vid, label = resolve(name)
    out = HERE / "vo" / "full"
    out.mkdir(parents=True, exist_ok=True)
    content = [{"type": "text", "text": ln["text"],
                "annotations": [{"type": "speech_metadata", "style": ln["style"]}]}
               for ln in json.loads((HERE / "vo_lines.json").read_text())]
    body = {"model": MODEL, "input": [{"type": "user_input", "content": content}],
            "response_format": {"type": "audio"},
            "generation_config": {"speech_config": [{"voice": vid}]}}
    (out / f"{label}.wav").write_bytes(base64.b64decode(audio_b64(call(f"{BASE}/interactions", body))))
    print("ok full", label)

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "list":
        for v in list_voices(sys.argv[2] if len(sys.argv) > 2 else None):
            print(f"{v.get('id')} | {v.get('display_name')} ({v.get('language_code')}, {v.get('accent')}, {v.get('gender')}, {v.get('pitch')}): {v.get('description')}")
    elif cmd == "full" and len(sys.argv) > 2:
        for n in sys.argv[2:]:
            render_full(n)
    elif cmd == "render" and len(sys.argv) > 2:
        for n in sys.argv[2:]:
            render(n)
    else:
        sys.exit(__doc__)
