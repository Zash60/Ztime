---
name: Ztime
description: Frame-accurate speedrun timer MP4 generator, rendered offline in the browser.
colors:
  ground: "#eef1f5"
  surface: "#ffffff"
  surface-sunken: "#f6f8fa"
  line: "#d7dce3"
  line-strong: "#8a97a8"
  ink: "#0f172a"
  ink-secondary: "#475569"
  ink-tertiary: "#64748b"
  accent: "#1d4ed8"
  accent-hover: "#1e40af"
  accent-on: "#ffffff"
  accent-wash: "#eff4ff"
  accent-line: "#c7d7fe"
  success: "#15803d"
  success-wash: "#f0fdf4"
  success-line: "#bbf7d0"
  danger: "#b91c1c"
  danger-wash: "#fef2f2"
  danger-line: "#fecaca"
  warning: "#a16207"
  canvas-black: "#000000"
typography:
  brand-name:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.022em"
  brand-tag:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  panel-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "-0.012em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.5
  group-legend:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "0.08em"
  measurement:
    fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "1.75rem"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-0.02em"
    fontFeature: "tabular-nums"
  readout:
    fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tabular-nums"
  error-message:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  finish-time:
    fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "1.375rem"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.02em"
    fontFeature: "tabular-nums"
  caption:
    fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tabular-nums"
  input-touch:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  swatch: "3px"
  control: "5px"
  md: "6px"
  lg: "10px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "9px"
  md: "14px"
  lg: "20px"
  xl: "28px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-on}"
    rounded: "{rounded.md}"
    padding: "13px 16px"
    typography: "{typography.body}"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-primary-disabled:
    backgroundColor: "{colors.accent-wash}"
    textColor: "{colors.ink-secondary}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.md}"
    padding: "13px 16px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "9px 11px"
    typography: "{typography.body}"
  input-measurement:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
    typography: "{typography.measurement}"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "20px"
  group-fieldset:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "2px 14px 16px"
  card-finish:
    backgroundColor: "{colors.success-wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
  card-error:
    backgroundColor: "{colors.danger-wash}"
    textColor: "{colors.danger}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
  progress-bar:
    backgroundColor: "{colors.surface-sunken}"
    rounded: "{rounded.pill}"
    height: "6px"
---

# Design System: Ztime

## Overview

This system is deliberately the category standard. The user was shown six
distinct visual worlds and chose the conventional one — a clean light grid with
a single restrained accent — by name, then declined to name any peer product
whose level of craft it should sit beside. That is a decision, not a gap. The
bar here is execution: how well the ordinary arrangement of a professional
desktop tool is built, not whether the interface is novel. There is no
metaphor to decode and no visual joke to find.

The world is a light neutral page carrying white instrument panels, so the one
dark object on screen is the preview canvas — the actual frame of the video
being configured, at the actual export resolution. Everything else is chrome
that has to earn its place against a speedrunner who is mid-run, recording, and
looking away from the tab every few seconds. Density is moderate, not austere:
the form shows everything the render depends on, and hides only the typography
group behind a disclosure.

State is where this system spends its craft. Idle, hover, focus, invalid,
busy, error, and finished each have a designed form, and the two terminal
states (finished, failed) deliberately share the same card geometry so a
failure never looks like a different product from a success.

**Key Characteristics:**
- One accent, reserved. Blue marks the primary action, its in-flight state, progress, and focus. Nothing else wears it.
- Monospace means measurement, never decoration. It appears on the split field, the format readout, the estimate, the finish time, and the typeface previews — and nowhere else.
- Zero shadows. Depth comes from hairline borders and tonal layering alone.
- The preview canvas is the only dark object on the page, and it stays in view while the configuration column scrolls.

## Colors

A cool neutral ramp carries the entire interface; a single blue carries intent,
and red/green appear only as terminal outcomes.

### Primary
- **Signal Blue** (`#1d4ed8`): the Generate Video button, its hover (`#1e40af`), the progress fill, the caret, and every focus ring. It is the only saturated colour in an at-rest screen.

### Neutral
- **Cool Ground** (`#eef1f5`): the page behind the panels.
- **Panel White** (`#ffffff`): every panel, input, and the masthead bar.
- **Sunk Well** (`#f6f8fa`): the final-time field and the progress track — the two places a value is being set rather than displayed.
- **Hairline** (`#d7dce3`): dividers, group borders, and the low-emphasis box around measurement readouts.
- **Control Edge** (`#8a97a8`): the border on anything you can click or type into. Deliberately darker than Hairline so an input boundary holds roughly 3:1 against white.
- **Ink** (`#0f172a`): headings and entered values.
- **Slate** (`#475569`): field labels, secondary prose, disabled-button labels, and the placeholder in the split field.
- **Quiet Slate** (`#64748b`): hints and the preview caption.
- **Canvas Black** (`#000000`): the preview canvas and nothing else. The default export background is user-selectable, but the page's own preview surface is always this black.

### Secondary
None. A second accent would compete with the first; success and failure are states, not identities, so they appear only inside their own card.

### Tertiary
- **Caution Amber** (`#a16207`): the estimate line when the render is heavy enough to warn that the tab should stay in front.

### Named Rules

**The One Accent Rule.** Signal Blue is reserved for the primary action, that action's in-flight state, progress, focus, and themed browser surfaces. If a new element wants the accent and it is not one of those, it gets a neutral.

**The Terminal Rule.** Green and red live inside a wash-and-hairline card and nowhere else. Neither colour ever becomes a general theme.

## Typography

**UI Font:** the platform sans stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`).
**Measurement Font:** the vendored `JetBrains Mono`, falling back to `ui-monospace`.

**Character:** a quiet workhorse sans for every word, and a monospace reserved
strictly for things that are measured — times, frame counts, byte values,
format strings. The contrast between the two is functional, not stylistic: when
something is in monospace, it is a number.

### Hierarchy
- **Brand Name** (700, 1.5rem, 1.1, -0.022em): the product name, once, in the masthead.
- **Panel Title** (700, 1.0625rem, -0.012em): the configuration panel heading.
- **Body / Input** (400, 0.9375rem, 1.4): entered values and select contents.
- **Label** (600, 0.8125rem): field labels, one per control, never uppercase.
- **Group Legend** (700, 0.6875rem, 0.08em, uppercase): Timing, Output, Typography — the only uppercase text in the interface.
- **Measurement** (400, 1.75rem, 1.1, tabular-nums): the final-time field, sunk into the panel so it reads as the one value being set.
- **Readout** (400, 0.8125rem, tabular-nums): estimate, live status, format example, preview caption, finish time.
- **Error Message** (400, 0.875rem): the failure card's prose, one step above Readout so a problem is legible without hunting for it.
- **Finish Time** (400, 1.375rem, tabular-nums, -0.02em): the split inside the finish card — the Measurement Voice one step down from the field it came from.
- **Caption** (400, 0.75rem, tabular-nums): the export dimensions under the canvas.
- **Input (touch)** (400, 1rem): the mobile input size below 560px. Not a style choice — anything under 16px makes iOS zoom the page on focus.

### Named Rules

**The Measurement Voice Rule.** Monospace is used for measurement and for nothing else. Never set body copy, labels, headings, or helper prose in a monospace face to look technical.

**The Export Face Rule.** The typeface picker lists 26 vendored monospaced or tabular faces. Every one is verified to give all ten digits an identical advance width, because the exported timer repaints every frame and a face whose digits differ in width would make the readout slide sideways on each tick — contradicting the frame-accurate claim the product is built on. A proportional face does not belong on that list; if one is ever added, it needs a warning in the UI.

**The Tabular Rule.** Every number that can change while the user watches it — the timer, the frame count, the percentage, the finish time — is set with tabular figures so digits never shift position.

## Layout

A single centred shell capped at 1200px with 24px side padding. The masthead is
a full-bleed white bar with an inner shell: brand left, one factual promise
line right, closed by a 1px border. Below it, a two-column grid — configuration
fixed at 400px, preview `minmax(0, 1fr)` — with a 24px gap and 28px top
offset.

Spacing runs on a 6/9/14/20/28 rhythm. Groups are `<fieldset>` elements whose
legend breaks the top border, so the group label sits on the rule rather than
floating inside it.

At 900px the grid collapses to one column and the preview panel takes `order: -1`,
so the artifact is always seen before the form that configures it. At 560px the
shell padding drops to 14px, panel padding to 14px, and all inputs go to 16px
so mobile keyboards do not zoom the page on focus.

Above 900px the preview panel is `position: sticky` at 24px: the canvas stays
visible while a tall configuration column scrolls past it.

## Elevation & Depth

This system ships **no shadows at all**. Depth is conveyed entirely by a 1px
border plus tonal layering: the Cool Ground sits behind Panel White, Sunk Well
sits inside Panel White, and washes sit inside panels. Nothing floats.

### Shadow Vocabulary

None. There is no shadow token in this system, and adding one is a change to the
world, not a tweak to a component.

### Named Rules

**The Flat Rule.** Elevation is declared once, as a 1px border. A 1px border
under a soft shadow is a ghost card; if you want separation, change the fill.

**The One Edge Rule.** A component has a border or it does not. Never a
coloured left or right rule above 1px to mark importance — importance is shown
by fill, weight, or position.

## Shapes

Consistently small, lightly rounded corners: 6px on controls and groups, 10px on
the two panels, 5px on the retry button, 3px on a colour swatch (it has to fit
inside a 6px field with padding), and fully rounded only on the 6px progress
track. Nothing is pill-shaped except the progress bar. The masthead, the canvas
bezel, and the checkbox-style borders are square-cornered by design; the only
geometry on the page is rectangles and hairlines.

## Components

### Buttons
- **Shape:** gently rounded (6px).
- **Primary:** Signal Blue fill, white label, `13px 16px` padding, 0.9375rem/600. Full width in the action block.
- **Hover / Focus:** hover darkens to `#1e40af`; focus is a 2px accent outline at 2px offset. Both transition in 140ms.
- **Disabled:** the button *empties* rather than fading — accent wash fill, accent-line border, Slate label — so it reads as in flight rather than broken. A label that vanishes during the longest wait in the product is a failure state in itself.
- **Secondary:** white fill, Control Edge border, Slate label; used for Cancel.

### Chips (if used)
Not used.

### Cards / Containers
- **Corner Style:** 10px on panels, 6px on the terminal-state cards.
- **Background:** Panel White for panels; Sunk Well for the split field and progress track; success/danger washes for the terminal cards.
- **Shadow Strategy:** none — see Elevation & Depth.
- **Border:** 1px Hairline on panels and groups; 1px Control Edge on the canvas bezel.
- **Internal Padding:** 20px on panels, 2px/14px/16px inside a fieldset group.

### Inputs / Fields
- **Style:** 1px Control Edge stroke on Panel White, 6px radius, `9px 11px` padding.
- **Focus:** 2px accent outline at 1px offset plus an accent border — the border shifts *and* the outline appears.
- **Error:** 1px Danger border, with a Slate-weight error line directly beneath the field. Never colour alone: the message is always present.
- **Measurement field:** the final-time input is sunk, monospaced at 1.75rem, and its placeholder carries the format model at Slate — not faded, because it is functional guidance, not decoration.
- **Typeface select:** each option is set in the face it exports as, and the closed select previews the current choice in that face, so the decision is made by looking.
- **Colour input:** given an inner swatch border so a white swatch still reads as a chip on a white field.

### Navigation
None. This is a single-screen tool; the masthead is an identity bar, not a nav.

### Readouts
Status, estimate, and format-example lines share one monospace readout class and collapse entirely when empty, so the panel never reserves space for silence.

### Terminal cards
The finish card and the error card are the same object with a different wash
and hairline. The finish card leads with a small-caps label (`Time!`), then the
split in the measurement face, then the file detail. The error card states what
stopped and that settings were kept, with the retry button on its own line below.

## Do's and Don'ts

### Do:
- **Do** keep the preview canvas the only dark object on the page; it is the artifact, not a decoration.
- **Do** give every terminal state a designed card, and keep finished and failed the same geometry.
- **Do** set every changing number in tabular figures.
- **Do** make the busy state legible — unfill the button, never fade its label away.
- **Do** theme the surfaces the browser ships: selection, caret, scrollbars.

### Don't:
- **Don't** add a second accent, a tint to a neutral panel, or a coloured left rule to mark importance.
- **Don't** set prose in monospace to look technical; monospace is measurement only.
- **Don't** introduce a shadow. This world has none, and the first one is the start of a new world.
- **Don't** hide a control the render depends on. Typography is the only disclosed group, and it is disclosed because it changes nothing about correctness.
- **Don't** invent product claims, counts, or testimonials to fill a surface.
- **Don't** round a component above 10px or make anything pill-shaped except the progress track.