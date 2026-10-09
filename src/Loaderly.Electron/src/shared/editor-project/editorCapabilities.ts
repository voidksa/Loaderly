export type EditorMediaKind = 'video' | 'audio';
export type EditorLayerId = 'cuts' | 'blur' | 'zoom' | 'speed' | 'reframe' | 'text' | 'subtitles';
export type EditorToolId = 'select' | EditorLayerId;
export type EditorProjectTrackId = 'media' | 'cut' | 'blur' | 'zoom' | 'speed' | 'reframe' | 'text' | 'subtitles';

const videoToolIds = ['select', 'cuts', 'blur', 'zoom', 'speed', 'reframe', 'text', 'subtitles'] as const;
const audioToolIds = ['select', 'cuts', 'speed'] as const;

const videoLayerIds = ['cuts', 'subtitles', 'blur', 'zoom', 'speed', 'reframe', 'text'] as const;
const audioLayerIds = ['cuts', 'speed'] as const;

const videoTrackIds = ['media', 'cut', 'blur', 'zoom', 'speed', 'reframe', 'text', 'subtitles'] as const;
const audioTrackIds = ['media', 'cut', 'speed'] as const;

export function editorToolIdsForMedia(kind: EditorMediaKind): readonly EditorToolId[] {
  return kind === 'audio' ? audioToolIds : videoToolIds;
}

export function editorLayerIdsForMedia(kind: EditorMediaKind): readonly EditorLayerId[] {
  return kind === 'audio' ? audioLayerIds : videoLayerIds;
}

export function editorProjectTrackIdsForMedia(kind: EditorMediaKind): readonly EditorProjectTrackId[] {
  return kind === 'audio' ? audioTrackIds : videoTrackIds;
}

export function isEditorLayerAvailableForMedia(kind: EditorMediaKind, layerId: string | undefined): layerId is EditorLayerId {
  return Boolean(layerId && editorLayerIdsForMedia(kind).includes(layerId as EditorLayerId));
}

export function isEditorToolAvailableForMedia(kind: EditorMediaKind, toolId: string | undefined): toolId is EditorToolId {
  return Boolean(toolId && editorToolIdsForMedia(kind).includes(toolId as EditorToolId));
}

export function normalizeEditorLayerForMedia(kind: EditorMediaKind, layerId: string | undefined): EditorLayerId {
  return isEditorLayerAvailableForMedia(kind, layerId) ? layerId : 'cuts';
}

export function isVisualEditorLayer(layerId: string | undefined): boolean {
  return layerId === 'blur' || layerId === 'zoom' || layerId === 'reframe' || layerId === 'text' || layerId === 'subtitles';
}
