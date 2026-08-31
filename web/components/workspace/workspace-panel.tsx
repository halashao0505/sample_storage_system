'use client';

import type { DragEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react';

export type PanelId = 'trend' | 'devices' | 'records' | 'queue';
export type ResizeDirection = 'n' | 'e' | 's' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
export type PanelSize = { width: number; height: number };

const resizeDirections: ResizeDirection[] = ['n', 'e', 's', 'w', 'ne', 'nw', 'se', 'sw'];

type WorkspacePanelProps = {
  id: PanelId;
  title: string;
  subtitle: string;
  children: ReactNode;
  size: PanelSize;
  isDragging: boolean;
  onDragStart: (event: DragEvent<HTMLElement>, id: PanelId) => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>, id: PanelId) => void;
  onResizeStart: (event: ReactPointerEvent<HTMLSpanElement>, id: PanelId, direction: ResizeDirection) => void;
  onResetSize: (id: PanelId) => void;
};

export function WorkspacePanel({ id, title, subtitle, children, size, isDragging, onDragStart, onDragEnd, onDragOver, onDrop, onResizeStart, onResetSize }: WorkspacePanelProps) {
  return (
    <article className={`workspace-panel ${isDragging ? 'is-dragging' : ''}`} style={{ width: size.width, height: size.height }} onDragOver={onDragOver} onDrop={(event) => onDrop(event, id)}>
      <header className="panel-bar" draggable onDragStart={(event) => onDragStart(event, id)} onDragEnd={onDragEnd} onDoubleClick={() => onResetSize(id)}>
        <span className="panel-grip" aria-hidden="true">⠿</span>
        <div><h2>{title}</h2><p>{subtitle}</p></div>
        <span className="panel-resize-note">拖动排序 · 双击还原</span>
      </header>
      <div className="panel-body">{children}</div>
      {resizeDirections.map((direction) => <span key={direction} className={`resize-handle resize-${direction}`} aria-label={`从${direction}方向缩放`} onPointerDown={(event) => onResizeStart(event, id, direction)} />)}
    </article>
  );
}
