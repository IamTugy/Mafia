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
