# Speedrun Timer Generator

Generates MP4 videos of a speedrun timer counting from 0 to a chosen final
time, with frame-accurate display at a configurable FPS. 100% client-side.

Encoding uses hardware-accelerated WebCodecs H.264 with MP4 muxing by
[Mediabunny](https://github.com/Vanilagy/mediabunny) (MPL-2.0, vendored
under `vendor/mediabunny/` — no CDN, no network needed at runtime). Your
browser must support WebCodecs H.264 encoding (Chrome/Edge/Safari current;
the app shows a clear error otherwise).

## Run

Any static server works, e.g.:

```bash
node server.mjs        # serves on http://127.0.0.1:8899
# or: python3 -m http.server 8899
```

Open http://127.0.0.1:8899/, configure FPS / final time / resolution /
background / font / format, click **Generate Video**. Video generation
works offline after the first page load.

## Tests

Node (fast, no browser):

```bash
for f in tests/test-*.html; do node tests/run-test.js "$f"; done
```

Plus real-browser assertion pages under `tests/` (open them in a browser
and check the console) and `tools/` for the container's MCP browser setup.
