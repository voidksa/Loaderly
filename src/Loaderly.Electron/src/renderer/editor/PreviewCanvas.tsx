import type { DragEvent, MouseEvent, PointerEvent, ReactNode, RefObject } from 'react';

type PreviewCanvasProps = {
  readonly children: ReactNode;
  readonly hasMedia: boolean;
  readonly onContextMenu: (event: MouseEvent<HTMLDivElement>) => void;
  readonly onDrop: (event: DragEvent<HTMLDivElement>) => void;
  readonly onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  readonly orientation?: 'landscape' | 'portrait' | 'square';
  readonly previewRef: RefObject<HTMLDivElement | null>;
  readonly selectedLayerId: string;
};

export function PreviewCanvas({
  children,
  hasMedia,
  onContextMenu,
  onDrop,
  onPointerDown,
  orientation = 'landscape',
  previewRef,
  selectedLayerId
}: PreviewCanvasProps) {
  return (
    <div className="preview-surface">
      <div
        className={`preview-frame${hasMedia ? ' has-video' : ''}`}
        data-effect={selectedLayerId}
        data-orientation={orientation}
        onContextMenu={onContextMenu}
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
        onPointerDown={onPointerDown}
        ref={previewRef}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}
