# Speedrun Timer Video Generator — Design Doc

**Date:** 2026-09-28
**Status:** Approved (pending user review)

## Overview

A web app that generates MP4 videos of a speedrun timer counting from 0 to a user-defined final time, with frame-accurate millisecond rounding at a configurable FPS. Everything runs client-side in the browser.

## Requirements

### Functional
- Generate an MP4 video with a timer counting from 0 to a user-defined final time
- Configurable FPS (1–240) — the video FPS equals the timer FPS
- Frame-accurate millisecond rounding: at 60fps frames show 000, 017, 033, 050… (never 016.67777)
- Timer always centered in the video
- Configurable background: solid color or transparent
- Configurable resolution (e.g. 1280x720, 1920x1080, 3840x2160)
- Configurable font: family, size, color
- No animations — timer just appears and counts
- No border or shadow on the text
- No time limit on video duration
- Only the timer — no extra elements (no progress bar, no labels, no logo)
- Output format: MP4
- All processing in the browser (client-side)

### Non-functional
- Simple, single-page interface
- No framework — vanilla HTML/CSS/JS
- Progress indicator during video generation
- Clear error messages

## Architecture

**Approach:** Canvas 2D + ffmpeg.wasm

- HTML5 Canvas draws each timer frame
- ffmpeg.wasm encodes frames into MP4
- No server — everything runs in the browser

### Components

1. **TimerDisplay** — Draws the timer on Canvas
   - Formats time as M:SS.mmm / M:SS.cc / M:SS.d (user-selectable)
   - Rounds milliseconds per-frame based on FPS
   - Centers the timer in the video

2. **VideoGenerator** — Manages video generation
   - Uses ffmpeg.wasm to encode frames into MP4
   - Controls video FPS
   - Reports progress

3. **ConfigPanel** — User interface
   - Inputs: FPS, final time, resolution, background, font, time format
   - "Generate Video" button
   - Progress bar

4. **Preview** — Live preview
   - Shows how the timer will look in the video
   - Updates as the user configures

### Data Flow

1. User configures: FPS, final time, resolution, background, font, format
2. ConfigPanel validates inputs
3. VideoGenerator calculates total frames (final time × FPS)
4. For each frame:
   - Calculate current time (frame / FPS)
   - Round milliseconds correctly for the FPS
   - TimerDisplay draws the frame on Canvas
   - Frame is sent to ffmpeg.wasm
5. ffmpeg.wasm encodes all frames into MP4
6. User downloads the video

### Error Handling

- Invalid FPS: accept only 1–240
- Invalid final time: accept only positive values
- Invalid resolution: accept only positive values
- Invalid background: accept only valid colors or transparent
- Invalid font: accept only valid font families
- Generation error: show clear message and allow retry
- Progress: show progress bar during generation

### Testing

- Unit tests: time formatting and millisecond rounding
- Integration tests: video generation with different configurations
- Manual tests: UI and full flow
- Performance tests: long video generation (e.g. 1 hour)

## File Structure

```
/root/Ztime/
├── index.html          # Main page
├── css/
│   └── style.css       # Styles
├── js/
│   ├── app.js          # Main app logic
│   ├── timer.js        # TimerDisplay component
│   ├── generator.js    # VideoGenerator component
│   ├── config.js       # ConfigPanel component
│   └── preview.js      # Preview component
├── vendor/
│   └── ffmpeg.wasm     # ffmpeg.wasm library
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-09-28-speedrun-timer-design.md
```
