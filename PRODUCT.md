# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Speedrunners filming their own run. They open the tool mid-session, before or
between attempts, type the split they are chasing, and export an MP4 of a
counting timer to overlay in their editor. They are in a recording setup —
often a second monitor, OBS running, attention split between the game and the
clip. The tool must be legible and operable at a glance and never interrupt
that flow.

## Product Purpose

Produce a frame-accurate MP4 of a speedrun timer counting from zero to a chosen
final split. Every frame lands on the exact millisecond grid for the configured
FPS, so the timer's readout on the finished video matches the real frame the
viewer sees.

Success means the speedrunner gets a usable overlay file they trust enough to
paste over their capture without checking it frame by frame.

## Positioning

No server, no CDN, no upload, no build step. The whole encode runs on the
user's own GPU through WebCodecs, at the resolution and framerate of their
actual recording. A competitor could not truthfully claim the combination of
offline operation, frame-exact timing, and vendor-free typography.

## Operating Context

- Used beside a live game capture; OBS or an equivalent recorder is running.
- The exported file is consumed in a video editor as an overlay.
- Runs range from seconds to several hours; formats switch between
  `M:SS.mmm` and `H:MM:SS.mmm` depending on the category.
- Recording setups vary: 720p/1080p/4K at 30, 60, or fractional rates such as
  23.976 and 59.94.
- Generation can take minutes at 4K; the tab must stay in front and the user
  must be able to cancel without losing their configuration.

## Capabilities and Constraints

- Frame-accurate frame plan from `00:00.000` to the exact final split.
- FPS 1–240 including fractional rates.
- Resolutions 1280×720, 1920×1080, 3840×2160.
- Backgrounds: black, white, red, green, blue.
- 11 time formats spanning hours, minutes, seconds, milliseconds, centiseconds,
  and deciseconds.
- 26 vendored monospace faces plus the system monospace fallback. Every face is
  monospaced or carries tabular figures, so exported digits never shift
  horizontally between frames.
- WebCodecs H.264 encoding in realtime latency mode, muxed to MP4 by the
  vendored Mediabunny build.
- Hard constraint: 100% offline. No network request, no CDN, no system font
  dependency, no build step, no framework. The vendored fonts and Mediabunny
  ship in the repository and must keep doing so.
- Hard constraint: the vendored fonts are product content — the user picks a
  typeface for the exported video — not interface chrome. All are SIL OFL 1.1
  except Ubuntu Mono (UFL 1.0), and all ship inside this repository.
- Chrome/Edge 94+ and Safari 16.4+ have full hardware encode. Firefox has no
  WebCodecs H.264 encoder; the app detects this and says so before starting.
- Live canvas preview of the timer before generation.
- Undecided product facts: nothing outstanding.

## Brand Commitments

- The product name is **Ztime**; the current document title and in-app copy are
  English and factual, and are not to be replaced with invented claims.
- Voice is plain and technical. The tool states what it will do and what it
  produced; it does not congratulate the user or gamify the result.
- The public repository exists at github.com/Zash60/Ztime under MIT.
- **Visual world: the category standard, taken seriously (decided 2026-10-04).**
  The user was offered six distinct visual worlds and chose the category
  default — a clean light grid with a single restrained accent — explicitly, and
  declined to name any peer product to sit alongside it. Convention is therefore
  the commitment, executed at full fidelity: no irony, no smuggled quirk, no
  knowing wink. The bar is craftsmanship within that world, not novelty. This
  supersedes the earlier Oceano identity; do not reintroduce a "creative" look
  without asking.

## Evidence on Hand

- Working application in this repository; it runs end to end via
  `node server.mjs` and generates MP4s in a supported browser.
- 6 vendored font files with their licenses in `fonts/` and
  `fonts/ATTRIBUTION.md`.
- Vendored Mediabunny in `vendor/mediabunny/` (MPL-2.0).
- `screenshots/desktop.png` and `screenshots/mobile.png` capture the incumbent
  interface; `speedrun-timer-demo.mp4` is a real output of the tool.
- Absences future work must not fabricate: no testimonials, no user counts, no
  benchmarks, no pricing, no external brand partnerships.

## Product Principles

1. **The export is the product.** The interface exists to produce one correct
   file; every pixel of chrome is paid for by what it helps configure.
2. **Frame-exact or useless.** Timing claims must be verifiable in the output.
   Never approximate a frame count or a split in the interest of speed.
3. **Offline is a feature, not a limitation.** The tool works on a plane, at a
   LAN party, with no account and no telemetry.
4. **Operable at a glance.** The user is mid-run and looking away. State is
   always visible; the next action is never hidden.
5. **Never destroy work.** Cancel, reload, or error must leave the user's
   configuration exactly where it was.

## Accessibility & Inclusion

No product-specific requirement has been established beyond the incumbent
behavior: labelled controls, `aria-live` regions for validation, status, and
progress, `aria-invalid` on failing fields, and visible focus rings. Keyboard
operation of the whole form and `prefers-reduced-motion` support are expected
of any redesign.