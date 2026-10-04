# Bundled fonts

All faces ship as **latin subset, weight 400, woff2**, from **Fontsource 5.3.0**.
They are vendored in this repository so the app stays fully offline — no CDN,
no network request, no system-font dependency.

## Batch 1 — original set

| Family | Copyright | Licence |
|---|---|---|
| JetBrains Mono | 2020 The JetBrains Mono Project Authors | SIL OFL 1.1 — `OFL.txt` |
| Space Mono | 2016 The Space Mono Project Authors | SIL OFL 1.1 — `OFL.txt` |
| Cascadia Code | Microsoft / Google Inc. | SIL OFL 1.1 — `OFL.txt` |
| Ubuntu Mono | Canonical Ltd. | Ubuntu Font Licence 1.0 — `LICENSE-ubuntu-mono-ufl.txt` |
| Share Tech Mono | 2012 Carrois Type Design, Ralph du Carrois | SIL OFL 1.1 — `OFL.txt` |
| VT323 | 2011 The VT323 Project Authors | SIL OFL 1.1 — `OFL.txt` |

## Batch 2 — added 2026-10-04

All twenty are **SIL Open Font License 1.1**, each shipping its own
`<package>-LICENSE` file next to the font.

| Family | Copyright | File |
|---|---|---|
| Roboto Mono | 2015 The Roboto Mono Project Authors | `roboto-mono-latin-400-normal.woff2` |
| IBM Plex Mono | 2017 IBM Corp. | `ibm-plex-mono-latin-400-normal.woff2` |
| Source Code Pro | The Source Code Pro Project Authors | `source-code-pro-latin-400-normal.woff2` |
| Fira Code | The Fira Code Project Authors | `fira-code-latin-400-normal.woff2` |
| Inconsolata | The Inconsolata Project Authors | `inconsolata-latin-400-normal.woff2` |
| PT Mono | © 2010 ParaType Inc., ParaType Ltd. | `pt-mono-latin-400-normal.woff2` |
| Noto Sans Mono | The Noto Project Authors | `noto-sans-mono-latin-400-normal.woff2` |
| DM Mono | The DM Mono Project Authors | `dm-mono-latin-400-normal.woff2` |
| Anonymous Pro | The Anonymous Pro Project Authors | `anonymous-pro-latin-400-normal.woff2` |
| Cutive Mono | The Cutive Project Authors | `cutive-mono-latin-400-normal.woff2` |
| Cousine | The Cousine Project Authors | `cousine-latin-400-normal.woff2` |
| Overpass Mono | The Overpass Project Authors | `overpass-mono-latin-400-normal.woff2` |
| Red Hat Mono | 2024 The Red Hat Project Authors | `red-hat-mono-latin-400-normal.woff2` |
| Azeret Mono | The Azeret Project Authors | `azeret-mono-latin-400-normal.woff2` |
| Martian Mono | 2020 The Martian Mono Project Authors | `martian-mono-latin-400-normal.woff2` |
| Sometype Mono | The Sometype Project Authors | `sometype-mono-latin-400-normal.woff2` |
| Spline Sans Mono | The Spline Sans Mono Project Authors | `spline-sans-mono-latin-400-normal.woff2` |
| B612 Mono | The B612 Project Authors | `b612-mono-latin-400-normal.woff2` |
| Kode Mono | The Kode Mono Project Authors | `kode-mono-latin-400-normal.woff2` |
| Fragment Mono | The Fragment Mono Project Authors | `fragment-mono-latin-400-normal.woff2` |

## Why every face is monospaced or tabular

The exported video is a timer. `TimerDisplay` repaints every frame and the
digits change between frames, so a face whose digits have differing advance
widths makes the readout slide sideways on every tick. That would contradict
the frame-accurate claim the product is built on.

Every family in this directory was verified in-browser to give all ten digits
an identical advance width. A proportional or non-tabular face does not belong
here; if you add one, it needs a warning in the UI, not a quiet place on the
list.