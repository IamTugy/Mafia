# Mafia Game Simulator — Design Spec

**Date:** 2026-03-21
**Status:** Approved

## Overview

A standalone dev-tool web app that renders N "phone" frames in a draggable grid, each showing a real iframe of the Mafia game. A launch script orchestrates everything: it creates a game, extracts the code, and opens the simulator with all phones pre-connected to the same session.

Designed to be game-agnostic so future games can reuse the simulator with their own URL param conventions.

---

## Prerequisites

The simulator is added to the root pnpm workspace (`pnpm-workspace.yaml` includes `simulator`). Both dev servers must be running before executing the launch script:

```bash
# Terminal 1 — Mafia app
pnpm dev                       # localhost:5173

# Terminal 2 — Simulator app
pnpm --filter simulator dev    # localhost:5174

# Terminal 3 — Launch
pnpm open-simulator [count]
```

The launch script opens the simulator URL and logs a success message once it has done so — it does not wait for iframes to load or players to connect (acceptable for a dev tool).

Player count is capped at 10 (`MAX_PLAYERS`). Setting count > 10 will open extra phones in the lobby but they will be rejected by the host (seats are full). Stick to 5–10.

---

## Architecture

### Two deliverables

1. **`/simulator/`** — standalone React/Vite/Tailwind app at repo root, runs on port `5174`. Added to the root pnpm workspace. Has its own `package.json`, `tsconfig`, and `node_modules`.
2. **Mafia app change** — a `useAutoJoin` hook in `Lobby.tsx` reads `?gameCode` and `?playerName` URL params on mount and auto-joins.

### Directory structure

```
/simulator/
  package.json         (react, vite, tailwind, @dnd-kit/core, @dnd-kit/sortable)
  vite.config.ts       (server port: 5174)
  index.html
  src/
    App.tsx            (root — reads ?gameCode & ?count from URL, renders Toolbar + PhoneGrid)
    components/
      PhoneGrid.tsx    (responsive CSS grid, manages phone order state)
      PhoneFrame.tsx   (phone bezel + scaled iframe)
      Toolbar.tsx      (count picker, refresh all, reset layout)
    hooks/
      useDragGrid.ts   (dnd-kit drag-drop reordering logic)
```

### Launch flow

1. User runs `pnpm open-simulator [count]` from repo root (default: 10) — both dev servers must already be running
2. Playwright (non-headless, same as `open-lobby.ts`) opens `localhost:5173?host=true&playerName=Player+1`
3. `useAutoJoin` in the Mafia app fires and auto-creates the game (see Mafia App Changes)
4. Script waits for `[data-testid="game-code"]` to appear (rendered inside `GameRoom` once `isActive` is true on the server store; timeout 20s)
5. Extracts the game code (which is the PeerJS peer ID — a 6-digit number)
6. Opens `localhost:5174?gameCode=CODE&count=N` in a new visible page
7. Simulator renders N phones; phone N loads `localhost:5173?gameCode=CODE&playerName=Player+N`
8. Each Mafia app instance detects `?gameCode` + `?playerName` → calls `connectToHost(gameCode, playerName)` directly (game code IS the PeerJS peer ID, no lookup needed)
9. Logs success (URL opened, not waiting for connections), keeps process alive until user closes

---

## Components

### Toolbar

- Phone count picker: dropdown, options **5–10** (minimum 5 to allow game start per `MIN_PLAYERS`; maximum 10 per `MAX_PLAYERS`)
- "Refresh All": reloads all iframes by cycling their React `key` prop (cross-origin-safe; avoids `contentWindow.location.reload()` which is blocked across different ports)
- "Reset Layout": restores original phone order

### PhoneGrid

- CSS grid, column count based on current phone count:
  - 9–10 phones → 5 columns
  - 7–8 phones → 4 columns
  - 5–6 phones → 3 columns
- Count state is owned by `App.tsx` as React state, initialized from `?count` URL param. Changing via Toolbar updates in-memory state only (page refresh restores to URL param value — acceptable for a dev tool).
- `@dnd-kit/core` + `@dnd-kit/sortable` for drag-to-reorder
- Drag handle on the phone bezel top bar

### PhoneFrame

- Phone bezel styled with CSS: rounded corners (~50px radius), top notch, side buttons, bottom home bar
- Dark charcoal color, subtle drop shadow
- Player label ("Player 1") shown in the bezel top bar
- Inner `<iframe>` is rendered at exactly **390×844px** (iPhone 14 portrait). A `transform: scale(X)` on the iframe wrapper scales it visually to fit the grid cell. The iframe element itself is never resized — this ensures the Mafia app's CSS media queries fire at the correct 390px width.
- Drag lift effect: slight rotation + elevated shadow

---

## Mafia App Changes

### `useAutoJoin` hook (new, called from `Lobby.tsx`)

Placed in `Lobby.tsx` alongside the existing `createGame` / `connectToHost` logic, since it uses the same hooks and mirrors the same flow.

Reads `?gameCode` and `?playerName` from `window.location.search` on mount.

**Host branch** (`?host=true&playerName=X`):
Mirrors the existing `createGame` callback in `Lobby.tsx` (lines 27–30):
```ts
const host = await initializeHost();   // from useServerStore
await connectToHost(host.id, name);    // from useClientPeer — host.id is the PeerJS peer ID
```
`initializeHost` is from `useServerStore`; `connectToHost` is from `useClientPeer`. Both are already in scope in `Lobby.tsx`.

**Join branch** (`?gameCode=ABC123&playerName=X`):
```ts
await connectToHost(gameCode, name);   // gameCode is the PeerJS peer ID directly
```

**No params**: no-op, normal lobby behavior unchanged.

~20 lines, no effect on production builds.

---

## Launch Script (`scripts/open-simulator.ts`)

Added to **root `package.json`** alongside the existing `"open-lobby"` entry:
```json
"open-simulator": "tsx scripts/open-simulator.ts"
```

Steps:
1. Parse `count` from `process.argv[2]`, default 10
2. Launch Playwright **non-headless** chromium (WebRTC/PeerJS requires a real browser context)
3. Open `localhost:5173?host=true&playerName=Player+1` in a new page
4. Wait for `[data-testid="game-code"]` (appears in `GameRoom` once `isActive` is true; timeout 20s)
5. Extract game code text
6. Open `localhost:5174?gameCode=CODE&count=N` in a new visible page
7. Log "Simulator open at localhost:5174 — players connecting in background"
8. Keep process alive with `await new Promise(() => {})`

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
