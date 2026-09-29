# Speedrun Timer Generator

Generates MP4 videos of a speedrun timer counting from 0 to a chosen final
time, with frame-accurate display at a configurable FPS. 100% client-side.

## Run

```bash
node server.mjs        # serves on http://127.0.0.1:8899 (with COOP/COEP headers)
```

Open http://127.0.0.1:8899/, configure FPS / final time / resolution /
background / font / format, click **Generate Video**.

> The COOP/COEP headers are required: ffmpeg.wasm needs SharedArrayBuffer.
> Plain static servers (e.g. `python3 -m http.server`) will fail generation
> with a clear error message.

## Tests

Node (fast, no browser):

```bash
for f in tests/test-*.html; do node tests/run-test.js "$f"; done
```

Plus real-browser assertion pages under `tests/` (open them in a browser
and check the console) and `tools/` for the container's MCP browser setup.
