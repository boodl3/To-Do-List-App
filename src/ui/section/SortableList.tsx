import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { ReactNode } from 'react';

/** One reorderable list (tasks, or one task's subtasks). Items never move between lists. */
export function SortableList({
  ids,
  onMove,
  children,
}: {
  ids: string[];
  onMove: (id: string, toIndex: number) => void;
  children: ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={({ active, over }) => {
        if (over && active.id !== over.id) onMove(String(active.id), ids.indexOf(String(over.id)));
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

/** Sortable wiring for a row: `setNodeRef` + `style` on the row, `handleProps` on its grip. */
export function useSortableRow(id: string) {
  const { setNodeRef, transform, transition, isDragging, attributes, listeners } = useSortable({
    id,
  });
  return {
    setNodeRef,
    style: {
      transform: transform ? `translate3d(0, ${transform.y}px, 0)` : undefined,
      transition,
    },
    isDragging,
    handleProps: { ...attributes, ...listeners },
  };
}
