# WebCodecs-only MP4 engine (Mediabunny) — Design

Date: 2026-09-29. Status: approved sections 1–6, awaiting spec review.

## Intent (agreed)

Replace the ffmpeg.wasm software-encode pipeline with a hardware-accelerated
WebCodecs pipeline, keeping MP4 output, exact configurable FPS, and
frame-accurate millisecond rounding. Decisions: engine = WebCodecs **only**
(no ffmpeg fallback); MP4 muxing = **Mediabunny vendored locally** (no CDN at
runtime, works offline). Success = same pixels as today, exact frame count /
duration / FPS, MP4 downloads, verified in a real browser.

## 1. Architecture

- `js/generator.js` is rewritten internally, keeping the class name and
  signatures: `generate(config, onProgress, onPhase)`, `estimate`,
  `frameTimes`, `cancel`, `effectiveBackground`. `app.js` / `config.js` stay
  nearly untouched.
- Inside: `CanvasSource(canvas, { codec: 'avc', quality })` +
  `Mp4OutputFormat` + `BufferTarget` (Mediabunny `Output`).
- The loop draws each frame with the existing `TimerDisplay`
  frame painter, then calls `source.add(timestampSec, durationSec)` with
  exact timestamps (`i / fps`, `1 / fps`; final frame ends exactly at
  `finalTimeMs`).
- No PNG roundtrip, no MEMFS: `VideoFrame` comes straight from the canvas.
- `js/ffmpeg-loader.js` is deleted.

## 2. Vendoring + loading

- Pinned Mediabunny ESM bundle vendored under `vendor/mediabunny/` with its
  LICENSE; version recorded in the spec/plan and in a README note.
- `index.html` keeps classic scripts only; the generator loads Mediabunny
  via same-origin dynamic `import()` (available in every browser that has
  WebCodecs).
- No CDN at runtime. `server.mjs` drops COOP/COEP headers (no
  SharedArrayBuffer anymore) and becomes a plain static server.

## 3. Quality + frame accuracy

- Bitrate generous, scaled by resolution (~0.25 bits/pixel at 30fps,
  scaled up with fps so per-frame quality holds at high frame rates;
  1080p30 ≈ 15 Mbps, 4K ≈ 60 Mbps). Flat timer graphics (solid background + text)
  are visually lossless at these rates on hardware H.264.
- Frame accuracy holds by construction: pixels are rendered on the canvas
  with the unchanged `roundMs` / `frameTimes` logic before capture, so
  muxer timestamp handling cannot alter displayed text.
- `frameRate` track metadata is passed only for integer FPS or exact
  standard fractional rates (29.97 / 59.94 as exact fractions); otherwise
  exact per-frame durations rule.
- E2E verification decodes the MP4 in-browser (`VideoDecoder`), compares
  frames against the canvas (MSE tolerance; concrete threshold set during
  implementation and recorded in the commit), and asserts exact frame
  count, duration, and FPS.

## 4. Errors, compatibility, cancellation

- Runtime gate: missing `VideoEncoder` or negative
  `VideoEncoder.isConfigSupported({ codec: 'avc1.640034', width, height })`
  routes to the existing error panel (`role="alert"` + retry) with a clear
  message naming the missing capability — never a silent failure.
- No ffmpeg fallback (explicit decision). Unsupported browsers cannot
  generate; the message says so.
- Cancel maps to Mediabunny `output.cancel()` (frees encoders/writer).
- Transparent background keeps current behavior (exports as black; the UI
  label already warns, since H.264 has no alpha channel).

## 5. Tests (TDD)

- Node: bitrate-by-resolution table, exact per-frame timestamps/durations,
  support gate with mocked `VideoEncoder`, throttled progress. The
  `test-ffmpeg-loader.html` / `test-loader-*.html` pages are removed with
  the code they cover.
- Real browser (headless Chromium, as before): assertion pages plus an E2E
  that generates a real MP4, decodes it, pixel-compares against the canvas,
  and asserts frame count / duration / FPS.

## 6. Removal + docs

- Deleted: `js/ffmpeg-loader.js`, `tests/test-ffmpeg-loader.html`,
  `tests/test-loader-*.html`, ffmpeg references in `index.html` / `app.js`.
- `README.md` updated (no COOP/COEP, no CDN, offline usage).
- This spec committed before any product code.
