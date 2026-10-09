import type { CSSProperties, PointerEvent, ReactNode, RefObject, WheelEvent } from 'react';

type TimelineViewProps = {
  readonly boardRef: RefObject<HTMLDivElement | null>;
  readonly children: ReactNode;
  readonly currentTimeLabel: string;
  readonly durationLabel: string;
  readonly title: string;
  readonly onPointerCancel: () => void;
  readonly onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  readonly onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  readonly onPointerUp: () => void;
  readonly onWheel?: (event: WheelEvent<HTMLDivElement>) => void;
  readonly playheadPercent: number;
  readonly toolbar: ReactNode;
};

export function TimelineView({
  boardRef,
  children,
  currentTimeLabel,
  durationLabel,
  title,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onWheel,
  playheadPercent,
  toolbar
}: TimelineViewProps) {
  return (
    <div className="editor-timeline">
      <div className="editor-timeline__toolbar">
        <div className="editor-timeline__title">
          <strong>{title}</strong>
          <small>{currentTimeLabel} / {durationLabel}</small>
        </div>
        <div className="editor-timeline__tools">{toolbar}</div>
      </div>
      <div
        className="timeline-board"
        onPointerCancel={onPointerCancel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onWheel={onWheel}
        ref={boardRef}
        style={{ '--playhead': `${playheadPercent}%`, '--playhead-ratio': playheadPercent / 100 } as CSSProperties}
      >
        <div aria-label="Timeline playhead" className="timeline-playhead" role="presentation">
          <span className="timeline-playhead__grabber" />
          <span className="timeline-playhead__handle" />
        </div>
        {children}
      </div>
    </div>
  );
}
