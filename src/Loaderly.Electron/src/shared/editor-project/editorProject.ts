export type EditorOverlayRect = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation?: number;
  readonly opacity?: number;
};

export type EditorSubtitleCue = {
  readonly startSeconds: number;
  readonly endSeconds: number;
  readonly text: string;
};

export type EffectRegionKeyframe = {
  readonly timeSeconds: number;
  readonly region: EditorOverlayRect;
};

export type BlurEffectShape = 'rectangle' | 'ellipse' | 'face' | 'rounded';
export type BlurEffectStyle = 'normal' | 'light' | 'strong' | 'pixelated';
export type SpeedEffectMode = 'normal' | 'preserve-pitch' | 'warm' | 'bright' | 'radio';

export type TimelineItemBase = {
  readonly id: string;
  readonly type: string;
  readonly name: string;
  readonly trackId: string;
  readonly startTime: number;
  readonly endTime: number;
  readonly locked: boolean;
  readonly hidden: boolean;
};

export type MediaClipItem = TimelineItemBase & {
  readonly type: 'media';
  readonly sourcePath: string;
  readonly durationSeconds: number;
};

export type CutRangeItem = TimelineItemBase & {
  readonly type: 'cut-range' | 'cut-out';
};

export type BlurEffectItem = TimelineItemBase & {
  readonly type: 'blur';
  readonly region: EditorOverlayRect;
  readonly strength: number;
  readonly shape?: BlurEffectShape;
  readonly style?: BlurEffectStyle;
  readonly keyframes?: readonly EffectRegionKeyframe[];
  readonly trackingEnabled?: boolean;
  readonly fadeIn?: number;
  readonly fadeOut?: number;
};

export type ZoomEffectItem = TimelineItemBase & {
  readonly type: 'zoom';
  readonly region: EditorOverlayRect;
  readonly scale: number;
  readonly easeIn: number;
  readonly easeOut: number;
  readonly easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  readonly keyframes?: readonly EffectRegionKeyframe[];
  readonly trackingEnabled?: boolean;
};

export type SpeedEffectItem = TimelineItemBase & {
  readonly type: 'speed';
  readonly rate: number;
  readonly mode?: SpeedEffectMode;
};

export type ReframeEffectItem = TimelineItemBase & {
  readonly type: 'reframe';
  readonly targetWidth: number;
  readonly targetHeight: number;
  readonly fitMode: 'fit' | 'fill' | 'stretch' | 'original';
  readonly positionX: number;
  readonly positionY: number;
  readonly background:
    | { readonly kind: 'black' }
    | { readonly kind: 'white' }
    | { readonly kind: 'blur' }
    | { readonly kind: 'color'; readonly value: string };
};

export type TextLayerItem = TimelineItemBase & {
  readonly type: 'text';
  readonly region: EditorOverlayRect;
  readonly text: string;
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly fontWeight: number;
  readonly color: string;
  readonly backgroundColor?: string;
  readonly align: 'left' | 'center' | 'right';
  readonly zIndex: number;
};

export type SubtitleLayerItem = TimelineItemBase & {
  readonly type: 'subtitle';
  readonly subtitlePath: string;
  readonly label: string;
  readonly cues?: readonly EditorSubtitleCue[];
};

export type TimelineItem =
  | MediaClipItem
  | CutRangeItem
  | BlurEffectItem
  | ZoomEffectItem
  | SpeedEffectItem
  | ReframeEffectItem
  | TextLayerItem
  | SubtitleLayerItem;

export type TimelineTrack = {
  readonly id: string;
  readonly label: string;
  readonly type: TimelineItem['type'] | 'overlay';
  readonly locked: boolean;
  readonly hidden: boolean;
};

export type EditorProject = {
  readonly id: string;
  readonly mediaId: string;
  readonly mediaName: string;
  readonly sourcePath: string;
  readonly durationSeconds: number;
  readonly selection: {
    readonly itemId?: string;
  };
  readonly tracks: readonly TimelineTrack[];
  readonly items: readonly TimelineItem[];
};

export type EditorState = {
  readonly project: EditorProject;
  readonly clipboard?: TimelineItem;
  readonly history: {
    readonly past: readonly EditorProject[];
    readonly future: readonly EditorProject[];
  };
};

export type CreateEditorStateInput = {
  readonly mediaId: string;
  readonly mediaName: string;
  readonly sourcePath: string;
  readonly durationSeconds: number;
};

export type EditorOutputState = {
  readonly blurItems: readonly {
    readonly strength: number;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly startSeconds: number;
    readonly endSeconds: number;
  }[];
  readonly textOverlays: readonly {
    readonly text: string;
    readonly x: number;
    readonly y: number;
    readonly startSeconds: number;
    readonly endSeconds: number;
    readonly fontSize: number;
    readonly fontFamily: string;
  }[];
  readonly cutOutRanges: readonly {
    readonly startSeconds: number;
    readonly endSeconds: number;
  }[];
  readonly zoom?: {
    readonly scale: number;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly startSeconds: number;
    readonly endSeconds: number;
  };
  readonly speed?: {
    readonly rate: number;
    readonly startSeconds: number;
    readonly endSeconds: number;
  };
  readonly subtitlePath?: string;
  readonly limitedEffects: readonly ('zoom' | 'speed')[];
  readonly reframe?: {
    readonly targetWidth: number;
    readonly targetHeight: number;
    readonly fitMode: 'fit' | 'fill' | 'stretch' | 'original';
    readonly positionX: number;
    readonly positionY: number;
    readonly background:
      | { readonly kind: 'black' }
      | { readonly kind: 'white' }
      | { readonly kind: 'blur' }
      | { readonly kind: 'color'; readonly value: string };
    readonly startSeconds: number;
    readonly endSeconds: number;
  };
};

export type EditorCommand =
  | { readonly type: 'select-item'; readonly id?: string }
  | { readonly type: 'add-item'; readonly item: TimelineItem; readonly select?: boolean }
  | { readonly type: 'delete-selected' }
  | { readonly type: 'move-item'; readonly id: string; readonly startTime: number }
  | { readonly type: 'resize-item'; readonly id: string; readonly startTime: number; readonly endTime: number }
  | { readonly type: 'update-item'; readonly id: string; readonly patch: Partial<TimelineItem> }
  | { readonly type: 'copy-selected' }
  | { readonly type: 'paste-clipboard'; readonly id: string; readonly atTime?: number }
  | { readonly type: 'duplicate-selected'; readonly id: string };

const defaultTracks: readonly TimelineTrack[] = [
  { id: 'media', label: 'Media', type: 'media', locked: true, hidden: false },
  { id: 'cut', label: 'Cuts', type: 'cut-out', locked: false, hidden: false },
  { id: 'blur', label: 'Blur', type: 'blur', locked: false, hidden: false },
  { id: 'zoom', label: 'Zoom', type: 'zoom', locked: false, hidden: false },
  { id: 'speed', label: 'Speed', type: 'speed', locked: false, hidden: false },
  { id: 'reframe', label: 'Canvas', type: 'reframe', locked: false, hidden: false },
  { id: 'text', label: 'Text', type: 'text', locked: false, hidden: false },
  { id: 'subtitles', label: 'Subtitles', type: 'subtitle', locked: false, hidden: false }
];

export function createEditorState(input: CreateEditorStateInput): EditorState {
  const durationSeconds = Math.max(0.1, finiteNumber(input.durationSeconds, 0.1));
  const mediaItem: MediaClipItem = {
    id: `${input.mediaId}:media`,
    type: 'media',
    name: input.mediaName,
    trackId: 'media',
    startTime: 0,
    endTime: durationSeconds,
    locked: true,
    hidden: false,
    sourcePath: input.sourcePath,
    durationSeconds
  };

  return {
    project: {
      id: `project:${input.mediaId}`,
      mediaId: input.mediaId,
      mediaName: input.mediaName,
      sourcePath: input.sourcePath,
      durationSeconds,
      selection: {},
      tracks: defaultTracks,
      items: [mediaItem]
    },
    history: {
      past: [],
      future: []
    }
  };
}

export function getSelectedTimelineItem(state: EditorState): TimelineItem | undefined {
  const selectedId = state.project.selection.itemId;
  return selectedId ? state.project.items.find((item) => item.id === selectedId) : undefined;
}

export function activeTimelineItemsAt(project: EditorProject, playheadSeconds: number): readonly TimelineItem[] {
  return project.items.filter(
    (item) => !item.hidden && playheadSeconds >= item.startTime - 0.001 && playheadSeconds <= item.endTime + 0.001
  );
}

export function updateTimelineItemRegion(project: EditorProject, id: string, region: EditorOverlayRect): EditorProject {
  let changed = false;
  const items = project.items.map((item) => {
    if (item.id !== id || !timelineItemHasRegion(item)) {
      return item;
    }

    changed = true;
    return {
      ...item,
      region: normalizeOverlayRect(region)
    } as TimelineItem;
  });

  return changed ? { ...project, items } : project;
}

export function editorProjectToOutputState(project: EditorProject, range: TimeProjectionRange): EditorOutputState {
  const selectedItems = project.items.filter((item) => itemIntersectsRange(item, range));
  const zoomItems = selectedItems.filter((item): item is ZoomEffectItem => item.type === 'zoom' && !item.hidden);
  const speedItems = selectedItems.filter((item): item is SpeedEffectItem => item.type === 'speed' && !item.hidden);
  const reframeItems = selectedItems.filter((item): item is ReframeEffectItem => item.type === 'reframe' && !item.hidden);
  const subtitle = selectedItems.find((item): item is SubtitleLayerItem => item.type === 'subtitle' && !item.hidden);

  return {
    blurItems: selectedItems
      .filter((item): item is BlurEffectItem => item.type === 'blur' && !item.hidden)
      .map((item) => ({
        strength: item.strength,
        x: item.region.x,
        y: item.region.y,
        width: item.region.width,
        height: item.region.height,
        startSeconds: item.startTime,
        endSeconds: item.endTime
      })),
    textOverlays: selectedItems
      .filter((item): item is TextLayerItem => item.type === 'text' && !item.hidden)
      .sort((left, right) => left.zIndex - right.zIndex)
      .map((item) => ({
        text: item.text,
        x: item.region.x,
        y: item.region.y,
        startSeconds: item.startTime,
        endSeconds: item.endTime,
        fontSize: item.fontSize,
        fontFamily: item.fontFamily
      })),
    cutOutRanges: selectedItems
      .filter((item): item is CutRangeItem => item.type === 'cut-out' && !item.hidden)
      .map((item) => ({ startSeconds: item.startTime, endSeconds: item.endTime })),
    zoom: zoomItems[0]
      ? {
          scale: zoomItems[0].scale,
          x: zoomItems[0].region.x,
          y: zoomItems[0].region.y,
          width: zoomItems[0].region.width,
          height: zoomItems[0].region.height,
          startSeconds: zoomItems[0].startTime,
          endSeconds: zoomItems[0].endTime
        }
      : undefined,
    speed: speedItems[0]
      ? {
          rate: speedItems[0].rate,
          startSeconds: speedItems[0].startTime,
          endSeconds: speedItems[0].endTime
        }
      : undefined,
    subtitlePath: subtitle?.subtitlePath,
    limitedEffects: [...(zoomItems.length > 0 ? ['zoom' as const] : []), ...(speedItems.length > 1 ? ['speed' as const] : [])],
    reframe: reframeItems[0]
      ? {
          targetWidth: reframeItems[0].targetWidth,
          targetHeight: reframeItems[0].targetHeight,
          fitMode: reframeItems[0].fitMode,
          positionX: reframeItems[0].positionX,
          positionY: reframeItems[0].positionY,
          background: reframeItems[0].background,
          startSeconds: reframeItems[0].startTime,
          endSeconds: reframeItems[0].endTime
        }
      : undefined
  };
}

export function applyEditorCommand(state: EditorState, command: EditorCommand): EditorState {
  if (command.type === 'copy-selected') {
    const selected = getSelectedTimelineItem(state);
    return selected && selected.type !== 'media' ? { ...state, clipboard: selected } : state;
  }

  const nextProject = reduceProject(state.project, state.clipboard, command);

  if (nextProject === state.project) {
    return state;
  }

  return {
    ...state,
    project: nextProject,
    history: {
      past: [...state.history.past, state.project],
      future: []
    }
  };
}

export function undoEditorState(state: EditorState): EditorState {
  const previous = state.history.past.at(-1);

  if (!previous) {
    return state;
  }

  return {
    ...state,
    project: previous,
    history: {
      past: state.history.past.slice(0, -1),
      future: [state.project, ...state.history.future]
    }
  };
}

export function redoEditorState(state: EditorState): EditorState {
  const next = state.history.future[0];

  if (!next) {
    return state;
  }

  return {
    ...state,
    project: next,
    history: {
      past: [...state.history.past, state.project],
      future: state.history.future.slice(1)
    }
  };
}

function reduceProject(project: EditorProject, clipboard: TimelineItem | undefined, command: EditorCommand): EditorProject {
  switch (command.type) {
    case 'select-item':
      return command.id === project.selection.itemId
        ? project
        : { ...project, selection: command.id ? { itemId: command.id } : {} };
    case 'add-item': {
      const item = normalizeTimelineItem(command.item, project.durationSeconds);
      return {
        ...project,
        selection: command.select ? { itemId: item.id } : project.selection,
        items: [...project.items.filter((existing) => existing.id !== item.id), item]
      };
    }
    case 'delete-selected': {
      const selectedId = project.selection.itemId;

      if (!selectedId) {
        return project;
      }

      const selected = project.items.find((item) => item.id === selectedId);

      if (!selected || selected.locked || selected.type === 'media') {
        return project;
      }

      return {
        ...project,
        selection: {},
        items: project.items.filter((item) => item.id !== selectedId)
      };
    }
    case 'move-item': {
      const item = project.items.find((candidate) => candidate.id === command.id);

      if (!item || item.locked) {
        return project;
      }

      const duration = item.endTime - item.startTime;
      const startTime = clampTime(command.startTime, project.durationSeconds - duration);
      return updateItem(project, command.id, { startTime, endTime: startTime + duration });
    }
    case 'resize-item': {
      const item = project.items.find((candidate) => candidate.id === command.id);

      if (!item || item.locked) {
        return project;
      }

      return updateItem(project, command.id, {
        startTime: command.startTime,
        endTime: command.endTime
      });
    }
    case 'update-item':
      return updateItem(project, command.id, command.patch);
    case 'paste-clipboard': {
      if (!clipboard || clipboard.type === 'media') {
        return project;
      }

      const copied = cloneTimelineItem(clipboard, command.id, command.atTime ?? clipboard.startTime + 0.5, project.durationSeconds);
      return {
        ...project,
        selection: { itemId: copied.id },
        items: [...project.items, copied]
      };
    }
    case 'duplicate-selected': {
      const selected = project.items.find((item) => item.id === project.selection.itemId);

      if (!selected || selected.type === 'media') {
        return project;
      }

      const copied = cloneTimelineItem(selected, command.id, selected.startTime + 0.5, project.durationSeconds);
      return {
        ...project,
        selection: { itemId: copied.id },
        items: [...project.items, copied]
      };
    }
    default:
      return project;
  }
}

function updateItem(project: EditorProject, id: string, patch: Partial<TimelineItem>): EditorProject {
  let changed = false;
  const items = project.items.map((item) => {
    if (item.id !== id) {
      return item;
    }

    const next = normalizeTimelineItem({ ...item, ...patch } as TimelineItem, project.durationSeconds);
    changed = JSON.stringify(next) !== JSON.stringify(item);
    return next;
  });

  return changed ? { ...project, selection: { itemId: id }, items } : project;
}

function cloneTimelineItem(item: TimelineItem, id: string, startTime: number, projectDuration: number): TimelineItem {
  const duration = Math.max(0.1, item.endTime - item.startTime);
  const safeStart = clampTime(startTime, Math.max(0, projectDuration - duration));
  return normalizeTimelineItem(
    {
      ...item,
      id,
      name: item.name.endsWith(' copy') ? item.name : `${item.name} copy`,
      startTime: safeStart,
      endTime: safeStart + duration,
      locked: false
    } as TimelineItem,
    projectDuration
  );
}

function normalizeTimelineItem<T extends TimelineItem>(item: T, projectDuration: number): T {
  const startTime = clampTime(Math.min(item.startTime, item.endTime), projectDuration);
  const endTime = Math.max(startTime + 0.1, clampTime(Math.max(item.startTime, item.endTime), projectDuration));
  return {
    ...item,
    startTime,
    endTime: Math.min(projectDuration, endTime)
  };
}

type TimeProjectionRange = {
  readonly startSeconds: number;
  readonly endSeconds: number;
  readonly frameSeconds: number;
};

function itemIntersectsRange(item: TimelineItem, range: TimeProjectionRange): boolean {
  if (item.type === 'media') {
    return true;
  }

  return item.endTime > range.startSeconds && item.startTime < range.endSeconds;
}

function timelineItemHasRegion(item: TimelineItem): item is BlurEffectItem | ZoomEffectItem | TextLayerItem {
  return item.type === 'blur' || item.type === 'zoom' || item.type === 'text';
}

function normalizeOverlayRect(region: EditorOverlayRect): EditorOverlayRect {
  return {
    ...region,
    x: clampPercent(region.x),
    y: clampPercent(region.y),
    width: clampPercent(region.width, 1),
    height: clampPercent(region.height, 1)
  };
}

function clampTime(value: number, max: number): number {
  return Math.max(0, Math.min(Math.max(0, max), finiteNumber(value, 0)));
}

function finiteNumber(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function clampPercent(value: number, minimum = 0): number {
  return Math.max(minimum, Math.min(100, finiteNumber(value, minimum)));
}
