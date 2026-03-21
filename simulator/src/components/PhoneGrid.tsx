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

const PHONE_HEIGHT = 844 + 24 + 40; // PHONE_HEIGHT + HOME_BAR_HEIGHT + TOP_BAR_HEIGHT, matches PhoneFrame
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
