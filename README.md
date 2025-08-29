# JustBreathe

A tiny FastAPI app that guides breathing patterns with two visual modes:

- Box (4-phase: inhale → hold → exhale → hold) as a square with a moving dot
- Circle (2/3-phase: inhale → [hold] → exhale) as a pulsing circle

Config lives in the backend. You pick a pattern on the selection page and the server renders the right view (box for 4-phase, circle for two/three).

## Quick start

```sh
# macOS / zsh
python3 -m venv .venv
source .venv/bin/activate
pip install -r fastapi_app/requirements.txt
uvicorn fastapi_app.main:app --reload
```

Open http://127.0.0.1:8000/select to choose a pattern and durations. You’ll be redirected to /box (4-phase) or /circle (2/3-phase).

## Features

- Selection page to set pattern (box/three/two) and durations
- Backend decides the view and persists config in memory
- Box view starts at inhale, shows non-overlapping phase labels
- Circle view grows/shrinks with labels (Inhale/Hold/Exhale)
- Theme consistent across pages (slate background, soft panels)

## Pages

- /select — choose pattern and set durations
- /box — square animation with moving dot and labels
- /circle — circular animation with labels (no dot)

## API

- GET /api/config — current config (including active variant)
- POST /api/config — update top-level config (e.g., box_scale)
- POST /api/patterns/box — { inhale, hold1, exhale, hold2 }
- POST /api/patterns/three — { inhale, hold, exhale }
- POST /api/patterns/two — { inhale, exhale }

## Credits

Inspired by the box-breathing widget idea (originally popularized in community examples). This project packages the concept into a minimal FastAPI app with a clean theme and simple APIs.

## License

MIT © 2025 Ayush Paudel
