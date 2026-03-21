# Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone `/simulator/` React app that shows N phone-shaped iframes of the Mafia game in a draggable grid, plus a launch script that auto-connects all phones to the same game.

**Architecture:** The simulator is a separate Vite/React/Tailwind workspace on port 5174. Each phone is a CSS-styled bezel containing a real iframe pointing to the Mafia app at `localhost:5173` with `?gameCode=X&playerName=Player+N`. The Mafia app gets a `useAutoJoin` hook that reads those URL params and auto-connects. A Playwright script orchestrates the whole setup.

**Tech Stack:** React 19, Vite, Tailwind CSS v4, @dnd-kit/core + @dnd-kit/sortable, TypeScript, PeerJS (in Mafia app), Playwright (launch script)

---

## File Map

**Create (simulator):**
- `pnpm-workspace.yaml` — root workspace config, includes `simulator`
- `simulator/package.json` — simulator deps (react, vite, tailwind, dnd-kit)
- `simulator/vite.config.ts` — port 5174, react plugin, tailwind plugin
- `simulator/tsconfig.json` — TypeScript config
- `simulator/index.html` — HTML entry
- `simulator/src/main.tsx` — React root mount
- `simulator/src/index.css` — Tailwind base import
- `simulator/src/App.tsx` — reads `?gameCode` + `?count` from URL, renders Toolbar + PhoneGrid
- `simulator/src/components/Toolbar.tsx` — count picker (5–10), Refresh All, Reset Layout
- `simulator/src/components/PhoneGrid.tsx` — CSS grid with dnd-kit sortable list
- `simulator/src/components/PhoneFrame.tsx` — phone bezel CSS + scaled iframe
- `simulator/src/hooks/useDragGrid.ts` — dnd-kit drag-drop reordering logic

**Modify (Mafia app):**
- `src/lib/hooks/use-auto-join.ts` — new hook, reads URL params, auto-joins on mount
- `src/components/lobby/Lobby.tsx` — call `useAutoJoin()` at top of component

**Create (scripts):**
- `scripts/open-simulator.ts` — Playwright script: creates game, opens simulator URL
- `package.json` (root) — add `"open-simulator"` script entry

---

## Task 1: pnpm workspace setup

**Files:**
- Create: `pnpm-workspace.yaml`

- [ ] Create `pnpm-workspace.yaml` at repo root:

```yaml
packages:
  - '.'
  - 'simulator'
```

- [ ] Commit:

```bash
git add pnpm-workspace.yaml
git commit -m "chore: add pnpm workspace for simulator"
```

---

## Task 2: Scaffold simulator package

**Files:**
- Create: `simulator/package.json`
- Create: `simulator/tsconfig.json`
- Create: `simulator/vite.config.ts`
- Create: `simulator/index.html`
- Create: `simulator/src/main.tsx`
- Create: `simulator/src/index.css`

- [ ] Create `simulator/package.json`:

```json
{
  "name": "simulator",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build"
  },
  "dependencies": {
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/sortable": "^10.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "react": "^19.2.4",
    "react-dom": "^19.2.4"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.2.2",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^4.7.0",
    "tailwindcss": "^4.2.2",
    "typescript": "~5.8.3",
    "vite": "^6.4.1"
  }
}
```

- [ ] Create `simulator/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true
  },
  "include": ["src"]
}
```

- [ ] Create `simulator/vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
  },
});
```

- [ ] Create `simulator/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Mafia Simulator</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] Create `simulator/src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] Create `simulator/src/index.css`:

```css
@import "tailwindcss";

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: #0f0f0f;
  color: white;
  font-family: system-ui, sans-serif;
}
```

- [ ] Install simulator dependencies:

```bash
cd simulator && pnpm install
```

- [ ] Verify it starts without error:

```bash
pnpm --filter simulator dev
```

Expected: Vite dev server starts on port 5174. Visit localhost:5174 — blank page with no console errors.

- [ ] Commit:

```bash
git add simulator/
git commit -m "chore: scaffold simulator vite app"
```

---

## Task 3: App.tsx — URL param parsing + layout shell

**Files:**
- Create: `simulator/src/App.tsx`

The App reads `?gameCode` and `?count` from the URL. It owns the phone count state (initialized from URL param, updated by Toolbar). It renders a full-height layout with Toolbar at top and PhoneGrid filling the rest.

- [ ] Create `simulator/src/App.tsx`:

```tsx
import { useState } from 'react';
import { Toolbar } from './components/Toolbar';
import { PhoneGrid } from './components/PhoneGrid';

const DEFAULT_COUNT = 10;
const MIN_COUNT = 5;
const MAX_COUNT = 10;

function parseParams() {
  const params = new URLSearchParams(window.location.search);
  const gameCode = params.get('gameCode') ?? '';
  const countRaw = parseInt(params.get('count') ?? '', 10);
  const count = isNaN(countRaw)
    ? DEFAULT_COUNT
    : Math.min(MAX_COUNT, Math.max(MIN_COUNT, countRaw));
  return { gameCode, count };
}

export default function App() {
  const { gameCode, count: initialCount } = parseParams();
  const [count, setCount] = useState(initialCount);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Toolbar
        count={count}
        onCountChange={setCount}
        onRefreshAll={() => setRefreshKey((k) => k + 1)}
      />
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <PhoneGrid gameCode={gameCode} count={count} refreshKey={refreshKey} />
      </div>
    </div>
  );
}
```

- [ ] Visit `localhost:5174?gameCode=TEST&count=7` — page renders without errors (Toolbar and PhoneGrid stubs will be added next). TypeScript should compile.

- [ ] Commit:

```bash
git add simulator/src/App.tsx
git commit -m "feat(simulator): App shell with URL param parsing"
```

---

## Task 4: Toolbar component

**Files:**
- Create: `simulator/src/components/Toolbar.tsx`

- [ ] Create `simulator/src/components/Toolbar.tsx`:

```tsx
interface ToolbarProps {
  count: number;
  onCountChange: (count: number) => void;
  onRefreshAll: () => void;
  onResetLayout: () => void;
}

export function Toolbar({ count, onCountChange, onRefreshAll, onResetLayout }: ToolbarProps) {
  return (
    <div className="flex items-center gap-4 border-b border-white/10 bg-gray-900 px-4 py-2">
      <span className="text-sm font-semibold text-gray-300">Mafia Simulator</span>

      <div className="flex items-center gap-2">
        <label htmlFor="phone-count" className="text-xs text-gray-400">
          Phones
        </label>
        <select
          id="phone-count"
          value={count}
          onChange={(e) => onCountChange(Number(e.target.value))}
          className="rounded border border-white/10 bg-gray-800 px-2 py-1 text-sm text-white"
        >
          {[5, 6, 7, 8, 9, 10].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={onRefreshAll}
        className="rounded bg-gray-700 px-3 py-1 text-xs text-white hover:bg-gray-600"
      >
        Refresh All
      </button>

      <button
        onClick={onResetLayout}
        className="rounded bg-gray-700 px-3 py-1 text-xs text-white hover:bg-gray-600"
      >
        Reset Layout
      </button>
    </div>
  );
}
```

Now update `App.tsx` to add the missing `resetKey` state and wire `onResetLayout`:

- [ ] Replace `simulator/src/App.tsx` with the complete version:

```tsx
import { useState } from 'react';
import { Toolbar } from './components/Toolbar';
import { PhoneGrid } from './components/PhoneGrid';

const DEFAULT_COUNT = 10;
const MIN_COUNT = 5;
const MAX_COUNT = 10;

function parseParams() {
  const params = new URLSearchParams(window.location.search);
  const gameCode = params.get('gameCode') ?? '';
  const countRaw = parseInt(params.get('count') ?? '', 10);
  const count = isNaN(countRaw)
    ? DEFAULT_COUNT
    : Math.min(MAX_COUNT, Math.max(MIN_COUNT, countRaw));
  return { gameCode, count };
}

export default function App() {
  const { gameCode, count: initialCount } = parseParams();
  const [count, setCount] = useState(initialCount);
  const [refreshKey, setRefreshKey] = useState(0);
  const [resetKey, setResetKey] = useState(0);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Toolbar
        count={count}
        onCountChange={setCount}
        onRefreshAll={() => setRefreshKey((k) => k + 1)}
        onResetLayout={() => setResetKey((k) => k + 1)}
      />
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <PhoneGrid gameCode={gameCode} count={count} refreshKey={refreshKey} resetKey={resetKey} />
      </div>
    </div>
  );
}
```

- [ ] Commit:

```bash
git add simulator/src/components/Toolbar.tsx simulator/src/App.tsx
git commit -m "feat(simulator): Toolbar with count picker and controls"
```

---

## Task 5: PhoneFrame component

**Files:**
- Create: `simulator/src/components/PhoneFrame.tsx`

The phone is rendered at 390×844px internally, then `transform: scale(scaleFactor)` shrinks it to fit. `scaleFactor` is passed by `PhoneGrid` based on the available cell height. The `key` prop on the iframe changes when `refreshKey` changes, causing React to remount the iframe (cross-origin reload workaround).

- [ ] Create `simulator/src/components/PhoneFrame.tsx`:

```tsx
interface PhoneFrameProps {
  label: string;
  src: string;
  scaleFactor: number;
  refreshKey: number;
}

const PHONE_WIDTH = 390;
const PHONE_HEIGHT = 844;
const BEZEL = 12; // px around iframe inside bezel

export function PhoneFrame({ label, src, scaleFactor, refreshKey }: PhoneFrameProps) {
  const outerWidth = (PHONE_WIDTH + BEZEL * 2) * scaleFactor;
  const outerHeight = (PHONE_HEIGHT + BEZEL * 2 + 40) * scaleFactor; // 40 for top bar with label

  return (
    <div
      style={{ width: outerWidth, height: outerHeight, margin: '0 auto' }}
      className="select-none"
    >
      {/* Phone shell — renders at 1x, then scaled down */}
      <div
        style={{
          width: PHONE_WIDTH + BEZEL * 2,
          height: PHONE_HEIGHT + BEZEL * 2 + 40,
          transform: `scale(${scaleFactor})`,
          transformOrigin: 'top left',
        }}
        className="relative overflow-hidden rounded-[44px] bg-gray-800 shadow-2xl ring-1 ring-white/10"
      >
        {/* Notch bar — top of phone */}
        <div className="relative flex h-10 items-center justify-center bg-gray-900">
          {/* Notch pill */}
          <div className="absolute top-2 h-5 w-24 rounded-full bg-black" />
          {/* Label */}
          <span className="relative z-10 text-xs font-medium text-gray-400">{label}</span>
        </div>

        {/* Side buttons (decorative) */}
        <div
          className="absolute left-0 top-24 h-8 w-1 rounded-r bg-gray-600"
          style={{ marginLeft: -1 }}
        />
        <div
          className="absolute left-0 top-36 h-12 w-1 rounded-r bg-gray-600"
          style={{ marginLeft: -1 }}
        />
        <div
          className="absolute right-0 top-32 h-14 w-1 rounded-l bg-gray-600"
          style={{ marginRight: -1 }}
        />

        {/* Screen area */}
        <div className="overflow-hidden" style={{ width: PHONE_WIDTH, margin: `0 ${BEZEL}px` }}>
          <iframe
            key={refreshKey}
            src={src}
            width={PHONE_WIDTH}
            height={PHONE_HEIGHT}
            style={{ border: 'none', display: 'block' }}
            title={label}
          />
        </div>

        {/* Home bar */}
        <div className="flex h-6 items-center justify-center bg-gray-900">
          <div className="h-1 w-24 rounded-full bg-gray-600" />
        </div>
      </div>
    </div>
  );
}
```

- [ ] Commit:

```bash
git add simulator/src/components/PhoneFrame.tsx
git commit -m "feat(simulator): PhoneFrame bezel with scaled iframe"
```

---

## Task 6: useDragGrid hook

**Files:**
- Create: `simulator/src/hooks/useDragGrid.ts`

Manages an ordered list of IDs. `resetKey` resets order to `[0, 1, 2, ...]`. Returns the current order and a `handleDragEnd` callback for dnd-kit's `DndContext`.

- [ ] Create `simulator/src/hooks/useDragGrid.ts`:

```ts
import { useState, useEffect } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

export function useDragGrid(count: number, resetKey: number) {
  const [order, setOrder] = useState<number[]>(() =>
    Array.from({ length: count }, (_, i) => i)
  );

  // Re-initialize order when count changes (append new phones at end, trim excess)
  useEffect(() => {
    setOrder((prev) => {
      const next = Array.from({ length: count }, (_, i) => i);
      // preserve existing positions for phones still in range
      const preserved = prev.filter((id) => id < count);
      const missing = next.filter((id) => !preserved.includes(id));
      return [...preserved, ...missing].slice(0, count);
    });
  }, [count]);

  // Reset order when resetKey changes
  useEffect(() => {
    setOrder(Array.from({ length: count }, (_, i) => i));
  }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOrder((items) => {
        const oldIndex = items.indexOf(Number(active.id));
        const newIndex = items.indexOf(Number(over.id));
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return { order, handleDragEnd };
}
```

- [ ] Commit:

```bash
git add simulator/src/hooks/useDragGrid.ts
git commit -m "feat(simulator): useDragGrid hook for drag-to-reorder"
```

---

## Task 7: PhoneGrid component

**Files:**
- Create: `simulator/src/components/PhoneGrid.tsx`

Renders the CSS grid. Uses `useDragGrid` for order. Calculates `scaleFactor` from available container height. Uses dnd-kit `DndContext` + `SortableContext` for drag-drop. Each phone is a `SortablePhoneFrame` that wraps `PhoneFrame` with dnd-kit's `useSortable`.

- [ ] Create `simulator/src/components/PhoneGrid.tsx`:

```tsx
import { useRef, useEffect, useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PhoneFrame } from './PhoneFrame';
import { useDragGrid } from '../hooks/useDragGrid';

const PHONE_HEIGHT = 844 + 12 * 2 + 40; // matches PhoneFrame constants
const MAFIA_URL = 'http://localhost:5173';

function colsForCount(count: number): number {
  if (count >= 9) return 5;
  if (count >= 7) return 4;
  return 3;
}

interface SortablePhoneProps {
  id: number;
  gameCode: string;
  scaleFactor: number;
  refreshKey: number;
}

function SortablePhone({ id, gameCode, scaleFactor, refreshKey }: SortablePhoneProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    rotate: isDragging ? '2deg' : '0deg',
    zIndex: isDragging ? 50 : 'auto',
  };

  const src = gameCode
    ? `${MAFIA_URL}?gameCode=${gameCode}&playerName=${encodeURIComponent(`Player ${id + 1}`)}`
    : MAFIA_URL;

  return (
    <div ref={setNodeRef} style={style} className="flex flex-col items-center">
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="mb-1 cursor-grab rounded px-4 py-0.5 text-xs text-gray-500 hover:bg-white/5 active:cursor-grabbing"
      >
        ⠿ drag
      </div>
      <PhoneFrame
        label={`Player ${id + 1}`}
        src={src}
        scaleFactor={scaleFactor}
        refreshKey={refreshKey}
      />
    </div>
  );
}

interface PhoneGridProps {
  gameCode: string;
  count: number;
  refreshKey: number;
  resetKey: number;
}

export function PhoneGrid({ gameCode, count, refreshKey, resetKey }: PhoneGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scaleFactor, setScaleFactor] = useState(0.3);
  const { order, handleDragEnd } = useDragGrid(count, resetKey);

  const sensors = useSensors(useSensor(PointerSensor));
  const cols = colsForCount(count);

  // Calculate scale to fit phones in container height
  useEffect(() => {
    const measure = () => {
      if (!containerRef.current) return;
      const rows = Math.ceil(count / cols);
      const availH = containerRef.current.clientHeight / rows - 40; // 40 for drag handle
      const scale = Math.min(availH / PHONE_HEIGHT, 1);
      setScaleFactor(Math.max(scale, 0.15));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [count, cols]);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={order} strategy={rectSortingStrategy}>
        <div
          ref={containerRef}
          className="h-full w-full"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: '8px',
            alignItems: 'start',
          }}
        >
          {order.map((id) => (
            <SortablePhone
              key={id}
              id={id}
              gameCode={gameCode}
              scaleFactor={scaleFactor}
              refreshKey={refreshKey}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
```

- [ ] Start simulator (`pnpm --filter simulator dev`) and visit `localhost:5174`. Verify phones render. Visit `localhost:5174?count=6` — should show 6 phones in 3 columns.

- [ ] Commit:

```bash
git add simulator/src/components/PhoneGrid.tsx
git commit -m "feat(simulator): PhoneGrid with dnd-kit drag-drop"
```

---

## Task 8: useAutoJoin hook in Mafia app

**Files:**
- Create: `src/lib/hooks/use-auto-join.ts`
- Modify: `src/components/lobby/Lobby.tsx`

The hook runs once on mount. It mirrors the `createGame` pattern already in `Lobby.tsx` lines 27–30.

- [ ] Create `src/lib/hooks/use-auto-join.ts`:

```ts
import { useEffect } from 'react';
import { useServerStore } from '@/lib/store/server-store';
import { useClientStore } from '@/lib/store/client-store';

export function useAutoJoin() {
  const initializeHost = useServerStore((state) => state.initializeHost);
  const initializeClient = useClientStore((state) => state.initializeClient);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gameCode = params.get('gameCode');
    const playerName = params.get('playerName');
    const isHost = params.get('host') === 'true';

    if (!playerName) return;

    if (isHost) {
      initializeHost().then((host) => {
        initializeClient(host.id, playerName);
      });
    } else if (gameCode) {
      initializeClient(gameCode, playerName);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
```

Note: uses `initializeClient` directly from `useClientStore`. This is equivalent to calling `connectToHost` from `useClientPeer` — `connectToHost` is a thin wrapper around `initializeClient`. Using `initializeClient` directly here avoids needing to call `useClientPeer()` in a separate hook.

- [ ] Add `useAutoJoin()` call to `src/components/lobby/Lobby.tsx` at the top of the `Lobby` function, before any return:

```tsx
// Add import at top:
import { useAutoJoin } from '@/lib/hooks/use-auto-join';

// Add inside Lobby() function, before any logic:
useAutoJoin();
```

- [ ] Verify: start Mafia dev server (`pnpm dev`), visit `localhost:5173?host=true&playerName=Alice`. Page should auto-create a game (skip lobby form, jump to GameRoom). Check browser console for errors.

- [ ] Verify: in a second tab, visit `localhost:5173?gameCode=XXXXX&playerName=Bob` (using the code from above). Should auto-join.

- [ ] Commit:

```bash
git add src/lib/hooks/use-auto-join.ts src/components/lobby/Lobby.tsx
git commit -m "feat: useAutoJoin hook for URL-param auto-connect"
```

---

## Task 9: open-simulator.ts launch script

**Files:**
- Create: `scripts/open-simulator.ts`
- Modify: `package.json` (root)

- [ ] Create `scripts/open-simulator.ts`:

```ts
import { chromium } from '@playwright/test';

const MAFIA_URL = 'http://localhost:5173';
const SIMULATOR_URL = 'http://localhost:5174';
const PLAYER_COUNT = Math.min(10, Math.max(5, Number(process.argv[2]) || 10));

async function main() {
  const execPath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
  const browser = await chromium.launch({
    headless: false,
    ...(execPath ? { executablePath: execPath } : {}),
  });
  const context = await browser.newContext();

  // Player 1: create game via URL params
  const hostPage = await context.newPage();
  await hostPage.goto(
    `${MAFIA_URL}?host=true&playerName=${encodeURIComponent('Player 1')}`
  );
  await hostPage.waitForSelector('[data-testid="game-code"]', { timeout: 20_000 });
  const gameCode = (await hostPage.textContent('[data-testid="game-code"]'))!.trim();
  console.log(`Game code: ${gameCode}`);

  // Open simulator — phones 2..N will auto-join via URL params inside iframes
  const simulatorPage = await context.newPage();
  await simulatorPage.goto(
    `${SIMULATOR_URL}?gameCode=${gameCode}&count=${PLAYER_COUNT}`
  );

  console.log(`Simulator open at ${SIMULATOR_URL} — ${PLAYER_COUNT} players connecting in background`);
  console.log('Close the browser window to exit.');

  await new Promise(() => {});
}

main().catch(console.error);
```

- [ ] Add script to root `package.json` (alongside existing `"open-lobby"`):

```json
"open-simulator": "tsx scripts/open-simulator.ts"
```

- [ ] Commit:

```bash
git add scripts/open-simulator.ts package.json
git commit -m "feat: open-simulator launch script"
```

---

## Task 10: End-to-end smoke test

- [ ] Start both dev servers in separate terminals:

```bash
# Terminal 1
pnpm dev

# Terminal 2
pnpm --filter simulator dev
```

- [ ] Run the launch script:

```bash
pnpm open-simulator 6
```

Expected:
1. Browser opens with host page (Player 1 in GameRoom)
2. Simulator opens at localhost:5174 with 6 phones
3. Phones 2–6 load the Mafia lobby and join the game
4. All 6 players visible in the GameRoom player list

- [ ] Test drag-drop: drag one phone to a different position in the grid. It should reorder.

- [ ] Test Refresh All: click "Refresh All" in toolbar. All iframes reload.

- [ ] Test Reset Layout: drag phones around, click "Reset Layout". Order resets to Player 1–6 original order.

- [ ] Test count picker: change from 6 to 8. Two more phones appear (unconnected, since game already started with 6).

- [ ] Commit any fixes found during smoke test, then final commit:

```bash
git commit -m "chore: simulator smoke test complete"
```
