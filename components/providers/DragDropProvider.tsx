'use client';

import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

interface DragDropProviderProps {
  children: React.ReactNode;
}

/**
 * DragDropProvider component that wraps the application with React DnD context
 * Uses HTML5Backend for native drag and drop support
 */
export const DragDropProvider: React.FC<DragDropProviderProps> = ({ children }) => {
  return (
    <DndProvider backend={HTML5Backend}>
      {children}
    </DndProvider>
  );
};

// Drag and drop item types
export const ItemTypes = {
  NODE: 'node',
  OUTLINE_ITEM: 'outline_item',
} as const;

export type DragItemType = typeof ItemTypes[keyof typeof ItemTypes];
