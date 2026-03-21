# Mafia Game Simulator — Design Spec

**Date:** 2026-03-21
**Status:** Approved

## Overview

A standalone dev-tool web app that renders N "phone" frames in a draggable grid, each showing a real iframe of the Mafia game. A launch script orchestrates everything: it creates a game, extracts the code, and opens the simulator with all phones pre-connected to the same session.

Designed to be game-agnostic so future games can reuse the simulator with their own URL param conventions.

---

## Architecture

### Two deliverables

1. **`/simulator/`** — standalone React/Vite/Tailwind app at repo root, runs on port `5174`
2. **Mafia app change** — reads `?gameCode` and `?playerName` URL params on load and auto-joins

### Directory structure

```
/simulator/
  package.json         (react, vite, tailwind, @dnd-kit/core, @dnd-kit/sortable)
  vite.config.ts
  index.html
  src/
    App.tsx            (root — reads ?gameCode & ?count from URL, renders PhoneGrid)
    components/
      PhoneGrid.tsx    (responsive CSS grid, manages phone list state)
      PhoneFrame.tsx   (phone bezel + scaled iframe)
      Toolbar.tsx      (count picker, refresh all, reset layout)
    hooks/
      useDragGrid.ts   (dnd-kit drag-drop reordering logic)
```

### Launch flow

1. User runs `pnpm open-simulator [count]` in the Mafia project (default count: 10)
2. Playwright (headless) opens `localhost:5173?host=true&playerName=Player+1`
3. Waits for `[data-testid="game-code"]`, extracts the code
4. Opens `localhost:5174?gameCode=CODE&count=N` in a visible browser window
5. Simulator renders N phones; phone N loads `localhost:5173?gameCode=CODE&playerName=Player+N`
6. Mafia app detects URL params → auto-joins, skipping manual lobby
7. Script keeps process alive until user closes

---

## Components

### Toolbar

- Phone count picker: dropdown, options 2–10, updates grid live
- "Refresh All": reloads all iframes
- "Reset Layout": restores original phone order

### PhoneGrid

- CSS grid with responsive column count:
  - 10 phones → 5 columns
  - 8 phones → 4 columns
  - 6 phones → 3 columns
  - ≤4 phones → 2 columns
- `@dnd-kit/core` + `@dnd-kit/sortable` for drag-to-reorder
- Drag handle on the phone bezel top bar

### PhoneFrame

- Phone bezel styled with CSS: rounded corners (~50px radius), top notch, side buttons, bottom home bar
- Dark charcoal color, subtle drop shadow
- Player label ("Player 1") shown in the bezel top bar
- Inner iframe: 390×844px (iPhone 14 portrait), scaled down via `transform: scale()` to fit grid cell
- Scaling ensures the Mafia app renders at true mobile viewport width
- Drag lift effect: slight rotation + elevated shadow

---

## Mafia App Changes

### `useAutoJoin` hook (new, ~20 lines)

Reads `?gameCode` and `?playerName` from `window.location.search` on mount.

- If `?host=true&playerName=X`: auto-creates a game (calls `initializeHost` + `connectToHost`)
- If `?gameCode=ABC&playerName=X`: auto-joins the game (calls `connectToHost`)
- If neither param is present: no-op, normal lobby behavior unchanged

Called once in `App.tsx` or `Lobby.tsx`. No effect on production builds when params are absent.

---

## Launch Script (`scripts/open-simulator.ts`)

```
pnpm open-simulator [count]
```

Steps:
1. Parse `count` from `process.argv[2]`, default 10
2. Launch Playwright headless chromium
3. Open `localhost:5173?host=true&playerName=Player+1`
4. Wait for `[data-testid="game-code"]` (timeout 20s)
5. Extract game code text
6. Open simulator URL in a new visible page: `localhost:5174?gameCode=CODE&count=N`
7. Log success, keep process alive with `await new Promise(() => {})`

Reuses the existing `fillGameCode` pattern from `open-lobby.ts` if needed.

`package.json` addition:
```json
"open-simulator": "tsx scripts/open-simulator.ts"
```

---

## What Does NOT Change

- `scripts/open-lobby.ts` — untouched
- All game logic, P2P layer, Zustand stores — untouched
- Production behavior — auto-join only fires when URL params are present

---

## Out of Scope

- Simulator controlling game state (phones are passive viewers)
- Recording/playback
- Multi-game switching within a session
