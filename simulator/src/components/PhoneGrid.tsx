import { useRef, useEffect, useState, useCallback } from 'react';
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

const PHONE_WIDTH = 390;
const PHONE_HEIGHT = 844 + 24 + 40; // PHONE_HEIGHT + HOME_BAR_HEIGHT + TOP_BAR_HEIGHT
const PHONE_SHELL_WIDTH = 390 + 12 * 2; // PHONE_WIDTH + BEZEL*2
const BEZEL = 12;
const TOP_BAR = 40;
const MAFIA_URL = 'http://localhost:5173';
const GAP = 4; // px between grid cells

function colsForCount(count: number): number {
  if (count >= 9) return 5;
  if (count >= 7) return 4;
  return 3;
}

interface SortablePhoneProps {
  id: number;
  cssOrder: number;
  gameCode: string;
  scaleFactor: number;
  refreshKey: number;
  startIndex: number;
  hostFirst: boolean;
  mirrorClicks: boolean;
  onMirrorClick: (sourceId: number, x: number, y: number) => void;
  iframeRef: (id: number, el: HTMLIFrameElement | null) => void;
}

function SortablePhone({ id, cssOrder, gameCode, scaleFactor, refreshKey, startIndex, hostFirst, mirrorClicks, onMirrorClick, iframeRef }: SortablePhoneProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    // cssOrder keeps this phone's DOM node in place — only the CSS grid slot changes.
    // Browsers reload iframes when their DOM position changes, so we must never let
    // React move the node; changing `order` is a safe CSS-only update.
    order: cssOrder,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    rotate: isDragging ? '2deg' : '0deg',
    zIndex: isDragging ? 50 : 'auto',
  };

  const isHostPhone = hostFirst && id === 0;
  const playerNum = isHostPhone ? 1 : id + startIndex;
  const src = isHostPhone
    ? `${MAFIA_URL}?host=true&playerName=${encodeURIComponent(`Player ${playerNum}`)}`
    : gameCode
      ? `${MAFIA_URL}?gameCode=${gameCode}&playerName=${encodeURIComponent(`Player ${playerNum}`)}`
      : 'about:blank';

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // The overlay sits on top of the scaled phone shell. We need coords relative
    // to the iframe's viewport (unscaled). The overlay covers the full phone shell
    // at the scaled size. Convert click position to unscaled iframe coords.
    const rect = e.currentTarget.getBoundingClientRect();
    const rawX = (e.clientX - rect.left) / scaleFactor;
    const rawY = (e.clientY - rect.top) / scaleFactor;

    // Subtract bezel + top bar offsets to get iframe-relative coords
    const iframeX = rawX - BEZEL;
    const iframeY = rawY - TOP_BAR;

    // Only broadcast if click is within the iframe area
    if (iframeX >= 0 && iframeX <= PHONE_WIDTH && iframeY >= 0 && iframeY <= 844) {
      onMirrorClick(id, iframeX, iframeY);
    }
  };

  const setIframeRef = useCallback(
    (el: HTMLIFrameElement | null) => iframeRef(id, el),
    [id, iframeRef]
  );

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Drag handle — absolute top-right, sits above the phone bezel */}
      <div
        {...attributes}
        {...listeners}
        className="absolute right-1 top-1 z-10 cursor-grab rounded p-1 text-lg leading-none text-gray-400 hover:bg-white/10 active:cursor-grabbing"
      >
        ⠿
      </div>
      {/* Mirror-click overlay — transparent, captures clicks when mirror mode is on */}
      {mirrorClicks && (
        <div
          onClick={handleOverlayClick}
          className="absolute inset-0 z-[5] cursor-crosshair"
        />
      )}
      <PhoneFrame
        ref={setIframeRef}
        label={`Player ${playerNum}`}
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
  startIndex: number;
  hostFirst: boolean;
  mirrorClicks: boolean;
}

export function PhoneGrid({ gameCode, count, refreshKey, resetKey, startIndex, hostFirst, mirrorClicks }: PhoneGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRefs = useRef<Map<number, HTMLIFrameElement>>(new Map());
  const [scaleFactor, setScaleFactor] = useState(0.3);
  const { order, handleDragEnd } = useDragGrid(count, resetKey);

  const sensors = useSensors(useSensor(PointerSensor));
  const cols = colsForCount(count);

  const setIframeRef = useCallback((id: number, el: HTMLIFrameElement | null) => {
    if (el) {
      iframeRefs.current.set(id, el);
    } else {
      iframeRefs.current.delete(id);
    }
  }, []);

  const handleMirrorClick = useCallback((sourceId: number, x: number, y: number) => {
    // Send click coordinates to ALL iframes (including the source — the source
    // has the overlay blocking it, so it needs the simulated click too)
    iframeRefs.current.forEach((iframe) => {
      try {
        iframe.contentWindow?.postMessage(
          { type: 'mafia:simulate-click', x, y },
          '*'
        );
      } catch {
        // cross-origin or iframe not ready
      }
    });
  }, []);

  // Scale phones to fill available cell space (constrained by whichever axis is tighter)
  useEffect(() => {
    const measure = () => {
      if (!containerRef.current) return;
      const rows = Math.ceil(count / cols);
      const availH = containerRef.current.clientHeight / rows;
      const availW = (containerRef.current.clientWidth - (cols - 1) * GAP) / cols;
      const scale = Math.min(availH / PHONE_HEIGHT, availW / PHONE_SHELL_WIDTH, 1);
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
            gap: `${GAP}px`,
            alignItems: 'start',
          }}
        >
          {/* Render in fixed DOM order so iframe nodes never move (browser reloads them on move).
              CSS `order` on each phone controls the visual grid position instead. */}
          {Array.from({ length: count }, (_, id) => (
            <SortablePhone
              key={id}
              id={id}
              cssOrder={order.indexOf(id)}
              gameCode={gameCode}
              scaleFactor={scaleFactor}
              refreshKey={refreshKey}
              startIndex={startIndex}
              hostFirst={hostFirst}
              mirrorClicks={mirrorClicks}
              onMirrorClick={handleMirrorClick}
              iframeRef={setIframeRef}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
