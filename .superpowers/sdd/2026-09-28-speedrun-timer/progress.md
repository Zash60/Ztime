# SDD ledger — plan: docs/superpowers/plans/2026-09-28-speedrun-timer.md

## Pre-flight Scan

### Shared Interfaces
- Task 1 → Task 3: FFmpegLoader (load, isLoaded, getProgress) — no conflict
- Task 2 → Task 3: TimerDisplay (draw, formatTime, roundMs) — no conflict
- Task 2 → Task 5: TimerDisplay (draw) — no conflict
- Task 1,2,3,4,5 → Task 6: All components — no conflict

### Self-Consistency
- All type signatures consistent across tasks
- All method names consistent across tasks
- No contradictions found

## Tasks

