# WebCodecs MP4 Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the ffmpeg.wasm pipeline with a WebCodecs + vendored Mediabunny pipeline producing identical MP4 output.

**Architecture:** `js/generator.js` keeps its class name and public signatures; internals switch from PNG-files-in-MEMFS to `CanvasSource.add()` with exact per-frame timestamps. Mediabunny is vendored and loaded via same-origin dynamic `import()`.

**Tech Stack:** Vanilla JS (classic scripts + one dynamic ESM import), WebCodecs `VideoEncoder` (avc), Mediabunny `Output`/`CanvasSource`/`Mp4OutputFormat`/`BufferTarget` (pinned, vendored).

**Spec:** `docs/superpowers/specs/2026-09-29-webcodecs-design.md`

## Global Constraints

- MP4 output only; exact configurable FPS 1–240 including fractional; video FPS = timer FPS.
- Last frame time equals final time exactly (`frameTimes` semantics unchanged).
- `crf`/quality bar: hardware H264 at ~0.25 bits/pixel (visually lossless on flat timer graphics).
- No CDN at runtime; app must generate offline after first page load.
- No ffmpeg fallback; unsupported browsers get a clear error-panel message.
- TDD: every behavior has a failing test first; Node suite + real-browser E2E stay green.
- Commit per task; working tree clean at the end.

## Review Focus

- Fractional FPS 59.94: last-frame timestamp must equal `finalTimeMs/1000` exactly — pinned in Task 1 timestamp test.
- Browser without `VideoEncoder`/H264: clear error, never a hang — pinned in Task 1 gate test (mocked missing).
- Cancel mid-encode: no Blob, `CANCELLED` code, encoder resources freed — pinned in Task 3 mock test.
- Odd or huge dimensions (e.g. 4K): gate checks the exact configured width/height — pinned in Task 1 gate test.
- 1h+ 4K video in `BufferTarget` could exhaust tab memory — estimate already shows frame count pre-start, pinned by the existing `updateEstimate` test in `tests/test-harden.html`; no new code, behavior unchanged from the ffmpeg MEMFS era.

---

## File Structure

- Create: `vendor/mediabunny/mediabunny.mjs` (+ `vendor/mediabunny/LICENSE`, `vendor/mediabunny/VERSION`) — pinned ESM bundle, no runtime CDN.
- Modify: `js/generator.js` — engine swap, same public surface plus 3 new statics.
- Modify: `js/app.js` — drop `FFmpegLoader` construction/passing.
- Modify: `index.html` — drop `js/ffmpeg-loader.js` script tag.
- Modify: `server.mjs` — plain static server (remove COOP/COEP headers).
- Modify: `README.md` — no COOP/COEP, no CDN, offline note.
- Delete: `js/ffmpeg-loader.js`, `tests/test-ffmpeg-loader.html`, `tests/test-loader-concurrency.html`, `tests/test-loader-script.html`.
- Tests: extend `tests/test-generator.html`; new `tests/test-webcodecs.html` (loader/gate/generate with mocks); update `tests/test-harden.html`, `tests/test-app.html` if they reference the loader.

---

### Task 1: Pure logic — bitrate, timestamps, frameRate rule, support gate

**Files:**
- Modify: `js/generator.js`
- Test: `tests/test-generator.html` (Node `vm` suite, no DOM needed — mock `VideoEncoder`/`document` globals in-page)

**Interfaces:**
- Consumes: existing `frameTimes(finalTimeMs, fps)`, `estimate`, `effectiveBackground` (unchanged).
- Produces (used by Tasks 3–5):
  - `VideoGenerator.bitrateFor(width, height, fps) -> number` (bits/sec ≈ pixels × 0.25, rounded to integer)
  - `VideoGenerator.framePlan(finalTimeMs, fps) -> { times: number[], duration: number }` (`times` in seconds from `frameTimes(ms)/1000`; `duration = 1/fps` constant for every frame, so output duration equals `times.length/fps` exactly as the ffmpeg build produced)
  - `VideoGenerator.trackOptions(fps) -> object` (`{ frameRate: fps }` when `Number.isInteger(fps)` or fps is 23.976/29.97/59.94 passed as the exact `24000/1001`, `30000/1001`, `60000/1001` division; otherwise `{}`)
  - `VideoGenerator.checkSupport(width, height) -> Promise<{ok: true} | {ok: false, reason: string}>` (false when `typeof VideoEncoder === 'undefined'` or `isConfigSupported({ codec: 'avc1.420034', width, height })` resolves `{ supported: false }`)

- [ ] **Step 1: Write the failing tests** in `tests/test-generator.html`: bitrate scales with pixels (`bitrateFor(1920,1080,30) === Math.round(1920*1080*0.25)` and 4K > 1080p); `framePlan(60000, 60)` has 3601 times, first 0, last exactly 60, constant duration `1/60`; `framePlan(60367, 59.94)` last time exactly 60.367; `trackOptions(30)` deep-equals `{frameRate: 30}`, `trackOptions(60000/1001)` deep-equals `{frameRate: 60000/1001}`, `trackOptions(7.3)` deep-equals `{}`; `checkSupport` false with `VideoEncoder` undefined and with `isConfigSupported → {supported:false}`, true with `{supported:true}` (mock globals, restore after).
- [ ] **Step 2: Run to verify failure** — `node tests/run-test.js tests/test-generator.html`; expect FAILs naming the four missing statics.
- [ ] **Step 3: Implement the four statics** in `js/generator.js` with the exact signatures/values above.
- [ ] **Step 4: Run to verify pass** — same command; expect all PASS.
- [ ] **Step 5: Commit** — `git add js/generator.js tests/test-generator.html && git commit -m "feat: webcodecs pure logic (bitrate, frame plan, track options, support gate)"`.

### Task 2: Vendor Mediabunny + cached dynamic loader

**Files:**
- Create: `vendor/mediabunny/mediabunny.mjs`, `vendor/mediabunny/LICENSE`, `vendor/mediabunny/VERSION`
- Modify: `js/generator.js` (loader only)
- Test: `tests/test-webcodecs.html`

**Interfaces:**
- Consumes: nothing new.
- Produces (used by Task 3):
  - `VideoGenerator._importMuxer() -> Promise<module>` (default: `import('/vendor/mediabunny/mediabunny.mjs')`; assignable in tests for stubbing)
  - `VideoGenerator.loadMuxer() -> Promise<{ Output, Mp4OutputFormat, BufferTarget, CanvasSource, Quality }>` (cached after first success; throws `Error('Video encoding library failed to load')` naming the vendored path when the module lacks any of the five names)

- [ ] **Step 1: Vendor the bundle** — resolve the latest stable mediabunny, download its browser single-file ESM bundle (from the package's file list pick the single-file ESM build; if none exists, vendor the ESM directory and record its entry path instead), save as `vendor/mediabunny/mediabunny.mjs` + upstream `LICENSE` + `VERSION` containing the exact version number.
- [ ] **Step 2: Write the failing tests** in `tests/test-webcodecs.html`: stub `_importMuxer` with a fake five-name module → `loadMuxer()` resolves and second call does not re-import (count calls); stub missing `CanvasSource` → rejects with message containing `vendor/mediabunny`. Restore the real `_importMuxer` after.
- [ ] **Step 3: Run to verify failure** — `node tests/run-test.js tests/test-webcodecs.html`; expect FAILs (`loadMuxer` not a function).
- [ ] **Step 4: Implement `_importMuxer`/`loadMuxer`** in `js/generator.js` per the signatures above.
- [ ] **Step 5: Run to verify pass** — same command; expect all PASS. Also run `node -e` reading `vendor/mediabunny/mediabunny.mjs` asserting it contains `Output`, `CanvasSource`, `Mp4OutputFormat`, `BufferTarget`, `Quality` and that `VERSION` is non-empty.
- [ ] **Step 6: Commit** — `git add vendor js/generator.js tests/test-webcodecs.html && git commit -m "feat: vendored mediabunny plus cached loader"`.

### Task 3: `generate()` on WebCodecs (mocked I/O)

**Files:**
- Modify: `js/generator.js` (`generate`, `cancel`, constructor drops the loader arg)
- Test: `tests/test-webcodecs.html`

**Interfaces:**
- Consumes: Task 1 (`framePlan`, `trackOptions`, `bitrateFor`, `checkSupport`, `effectiveBackground`, painter) and Task 2 (`loadMuxer`).
- Produces (used by Tasks 4–5): `generate(config, onProgress, onPhase) -> Promise<Blob(type video/mp4)>` with identical progress/phase/cancel semantics to today (`report` throttling and `onPhase` texts `'Drawing frames…'`, `'Encoding video…'` unchanged).

- [ ] **Step 1: Write the failing tests** with stubbed muxer module + fake canvas (painter stub): timestamps passed to `source.add` equal `framePlan` times with constant `duration`; `addVideoTrack` receives `trackOptions(fps)`; `finalize()` called and Blob built as `new Blob([target.buffer], {type:'video/mp4'})`; `checkSupport → {ok:false}` rejects before any import/encode with the gate reason; `cancel()` mid-loop calls `output.cancel()` and rejects with `code === 'CANCELLED'`; progress callback receives rounded ints only.
- [ ] **Step 2: Run to verify failure** — `node tests/run-test.js tests/test-webcodecs.html`; expect FAILs.
- [ ] **Step 3: Implement `generate()`**: gate → `loadMuxer()` → `new Output({format: new Mp4OutputFormat(), target: new BufferTarget()})` → `new CanvasSource(canvas, {codec:'avc', quality: new Quality({bitrate: bitrateFor(...)})})` → `addVideoTrack(source, trackOptions(fps))` → `await output.start()` (wrap start/add errors into the user-facing unsupported message) → paint + `source.add(t, duration)` per frame with cancel checks + throttled progress → `await output.finalize()` → Blob. `cancel()` sets the flag; the loop's catch maps it to `output.cancel()` + `CANCELLED` error. Constructor takes no arguments.
- [ ] **Step 4: Run to verify pass** — `node tests/run-test.js tests/test-webcodecs.html` plus full `for f in tests/test-*.html` sweep; new tests PASS (pre-existing loader-consumer failures are Task 4's scope — record them, don't fix here).
- [ ] **Step 5: Commit** — `git add js/generator.js tests/test-webcodecs.html && git commit -m "feat: webcodecs generate path with mocked IO"`.

### Task 4: App wiring, deletions, docs

**Files:**
- Modify: `js/app.js` (no `FFmpegLoader`; `new VideoGenerator()`), `index.html`, `server.mjs`, `README.md`
- Modify: `tests/test-harden.html`, `tests/test-app.html` (only the loader references, e.g. `new VideoGenerator(null)`)
- Delete: `js/ffmpeg-loader.js`, `tests/test-ffmpeg-loader.html`, `tests/test-loader-concurrency.html`, `tests/test-loader-script.html`

**Interfaces:**
- Consumes: Task 3 constructor (`new VideoGenerator()`).
- Produces: whole Node suite green with no loader references left (`grep -r FFmpegLoader --include='*.js' --include='*.html' .` empty except history).

- [ ] **Step 1: Delete + rewire** (no new behavior): delete the four files; `app.js` constructs `VideoGenerator` with no args and its status copy drops SharedArrayBuffer/loading-engine wording if present; `index.html` drops the loader tag; `server.mjs` serves static files with content-type only; `README.md` documents no-COOP/COEP, no-CDN, offline generation.
- [ ] **Step 2: Update affected tests** minimally (constructor calls, DOM stubs if the panel changed).
- [ ] **Step 3: Run the full suite** — `for f in tests/test-*.html; do node tests/run-test.js "$f"; done`; expect 0 failures everywhere; grep for `FFmpegLoader|ffmpeg` in `js/`, `index.html`, `tests/` returns nothing.
- [ ] **Step 4: Commit** — `git add -A && git commit -m "chore: remove ffmpeg pipeline, plain static server, updated docs"`.

### Task 5: Real-browser verification (headless Chromium, served locally)

**Files:** none committed (temp `.verify-*.html` pages deleted afterward); MSE threshold recorded inside the committed E2E notes below.

**Interfaces:** Consumes Tasks 1–4 (the app as built).

- [ ] **Step 1: Assertion pages** — serve the repo, run each `tests/test-*.html` in headless Chromium, require zero console errors and each page's `All ... tests passed` log.
- [ ] **Step 2: Real MP4 E2E** — generate (e.g. 3 s @30 fps 720p + a fractional-FPS case): assert download Blob `type === 'video/mp4'`, size > 1 KB.
- [ ] **Step 3: Decode + pixel-compare** — `VideoDecoder` (avc) decode the MP4; assert decoded frame count equals `framePlan` length, total duration equals `times.length/fps` within 1 ms, and per-sample MSE vs the same canvas draws stays under the recorded threshold (flat graphics: expect near-zero; record the concrete number from the run in the commit message).
- [ ] **Step 4: Cancel + error paths live** — cancel mid-generation returns to idle with no download; blocking `VideoEncoder` yields the clear unsupported message in `#errorMsg` with retry visible.
- [ ] **Step 5: Finalize** — temp verify files removed, full Node suite re-run green, commit `test: browser-verified webcodecs engine (frames/duration/MSE…)` (or fold into Task 4's commit if clean).
