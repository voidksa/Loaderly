import {createMediaIdAllocator} from '../shared/mediaIdentity';
import {AudioSectionControls} from './editor/AudioSectionControls';
import {normalizeAudioSections,audioSectionsForOutput,adjustAudioSectionWindow,type AudioSection} from '../shared/editor-project/audioSections';
import {TimeField} from './editor/TimeField';
import {formatTimecode} from '../shared/editor-timeline/timecode';
import {SoundPresetControls} from './editor/SoundPresetControls';
import {PlaylistPicker} from './editor/PlaylistPicker';
import {LibraryRemoval} from './editor/LibraryRemoval';
import {youtubePlaylistUrl,type PlaylistEntry} from '../shared/download-url/playlist';
import {encodeSoundPreset} from '../shared/audioPreset';
import { VisualizerVideoExport } from './editor/VisualizerVideoExport';
import type {VisualizerVideoOptions} from '../shared/editor-project/visualizerVideo';
import { CommunityLibrary } from './editor/CommunityLibrary';
import { ProgramUpdates } from './editor/ProgramUpdates';
import { SpeedControls } from './editor/SpeedControls';
import { flushSync } from 'react-dom';
import { hasSpeedSound } from '../shared/editor-project/speedSound';
import { DesktopMenu, type MenuOption } from './editor/DesktopMenu';
import { ColorField } from './editor/ColorField';
import { providerModels, providerBaseUrls } from '../shared/app-preferences/aiProviders';
import { AudioVisualizer, useAudioPreview } from './editor/AudioPreview';
import { VisualizerControls } from './editor/VisualizerControls';
import { defaultVisualizer, normalizeVisualizer, decodeVisualizer, encodeVisualizer, type AudioVisualizerSettings } from '../shared/editor-project/audioVisualizer';
import { defaultAudioSettings, normalizeAudioSettings, type AudioSettings } from '../shared/editor-project/audioProcessing';
import { AppearanceSettings } from './editor/AppearanceSettings';
import { appearanceVariables, decodeTheme, encodeTheme } from '../shared/app-preferences/appearance';
import { RangeInput } from './editor/RangeInput';
import { FilteredVideoPreview } from './editor/FilteredVideoPreview';
import { blurAmount, pixelBlockSize } from '../shared/editor-project/blurRendering';
import { moveEffectRegion, visibleEffectRegion } from '../shared/editor-project/editorPreviewGeometry';
import { sampleLumaPatch, findAdaptiveTrackingMatch, patchContrast, frameCorrelation, type PixelTrackingRect } from '../shared/editor-project/regionTracker';
import { loadTrackingVideo, releaseTrackingVideo, seekTrackingVideo } from './trackingVideo';
import { detectFaces } from './faceDetection';
import { parseToolVersion, type ToolStatus } from '../shared/tool-manager/toolStatus';
import { mediaDisplayTitle, mediaFileFormat } from '../shared/media-presentation/mediaPresentation';
﻿import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type WheelEvent as ReactWheelEvent
} from 'react';
import {
  ArrowLeft,
  AlertTriangle,
  AudioLines,
  BookOpen,
  Captions,
  Check,
  Clipboard,
  Clock3,
  Crop,
  Download,
  Eye,
  FileVideo,
  Film,
  FolderOpen,
  Gauge,
  HardDrive,
  Heart,
  Users,
  Image,
  Languages,
  LayoutGrid,
  Layers3,
  Library,
  Link,
  List,
  Maximize2,
  Minus,
  Minimize2,
  Moon,
  MousePointer2,
  Pause,
  Play,
  RefreshCcw,
  Redo2,
  Repeat,
  Plus,
  Search,
  Scissors,
  Settings,
  SlidersHorizontal,
  Square,
  Sun,
  Trash2,
  Undo2,
  Upload,
  Wrench,
  X,
  ZoomIn,
  type LucideIcon
} from 'lucide-react';
import {
  AiTranslationProvider,
  AppLocale,
  AppPreferences,
  defaultPreferences,
  DownloadStartMode,
  DownloadQuality,
  normalizePreferences,
  SubtitleDownloadMode,
  SubtitleLanguageProfile,
  ThemeMode
} from '../shared/app-preferences/appPreferences';
import {
  isRecoverableDownloadFileError,
  subtitlesSkippedRateLimitMessage,
  subtitlesSkippedUnavailableMessage
} from '../shared/download-recovery/downloadRecovery';
import {
  keptRangesFromCutOuts,
  snapSeconds,
  timelineMinZoom,
  timelineViewportFromZoom,
  timelineViewportRatioForSeconds,
  timelineViewportSecondsFromRatio,
  timelineZoomFromWheel,
  type TimeRange
} from '../shared/editor-timeline/editorTimeline';
import {
  editorLayerIdsForMedia,
  editorProjectTrackIdsForMedia,
  editorToolIdsForMedia,
  isEditorLayerAvailableForMedia,
  isEditorToolAvailableForMedia,
  isVisualEditorLayer,
  normalizeEditorLayerForMedia,
  type EditorLayerId,
  type EditorMediaKind,
  type EditorProjectTrackId,
  type EditorToolId
} from '../shared/editor-project/editorCapabilities';
import { regionAtKeyframeTime, regionSegmentsForExport, upsertRegionKeyframe, type EffectRegionKeyframe } from '../shared/editor-project/editorEffectKeyframes';
import { zoomScaleForRegion } from '../shared/editor-project/editorEffectTracking';
import { resolveEditorOutputActions, type EditorOutputActionKind } from '../shared/editor-project/editorOutput';
import type {
  BlurEffectItem,
  BlurEffectShape,
  BlurEffectStyle,
  EditorOverlayRect,
  EditorProject,
  ReframeEffectItem,
  SpeedEffectItem,
  SpeedEffectMode,
  TimelineItem,
  ZoomEffectItem
} from '../shared/editor-project/editorProject';
import {
  containMediaRect,
  mediaRegionToPreviewRegion,
  previewRectFromFrameRect,
  rectPixelsToPercent,
  type PreviewRect,
  type PreviewSize
} from '../shared/editor-project/editorPreviewGeometry';
import { buildEditorRenderPlan, type EditorRenderPlan, type RenderOutputKind } from '../shared/editor-project/editorRenderPlan';
import { canOpenEditorForMedia, editorSessionStorageKeys, playbackResumeSeconds, playerScrubSecondsFromClientX } from '../shared/editor-project/editorSession';
import { resolveEditorShortcut, type EditorShortcutAction } from '../shared/editor-project/editorShortcuts';
import { activeSubtitleCueIndex as findActiveSubtitleCueIndex, addSubtitleCueAt, updateSubtitleCue } from '../shared/editor-project/editorSubtitles';
import {
  REFRAME_PRESETS,
  clampDimension,
  computeReframeScale,
  ensureEvenDimension,
  findReframePresetId,
  isReframeBackground,
  isReframeFitMode,
  reframeFitModeLabel,
  type ReframeBackground,
  type ReframeFitMode
} from '../shared/reframe/reframe';
import {
  defaultEditorTextFontFamily,
  detectEditorTextDirection,
  editorTextCssFontFamily,
  editorTextFontOptions,
  editorTextFontOptionFor,
  type EditorTextFontFamily
} from '../shared/editor-project/editorTextOverlay';
import {
  createQuickCopyJob,
  QuickCopyJob,
  QuickCopyOutputKind
} from '../shared/quick-copy/quickCopy';
import {
  createText,
  localeLabel,
  qualityLabel,
  quickCopyLabel,
  themeLabel,
  type TextKey
} from './appText';
import { EditorContextMenu, type EditorContextMenuAction } from './editor/EditorContextMenu';
import { InspectorPanel } from './editor/InspectorPanel';
import { OutputDropdown, localizedOutputActionText } from './editor/OutputDropdown';
import { PreviewCanvas } from './editor/PreviewCanvas';
import { TimelineView } from './editor/TimelineView';
import { ToolRail, type EditorToolRailItem } from './editor/ToolRail';

type NavigationKey = 'community' | 'workspace' | 'downloads' | 'library' | 'editor' | 'queue' | 'tools' | 'export' | 'settings';
type MediaStatus = 'ready' | 'downloading' | 'queued' | 'edited' | 'failed';
type MediaSourceType = 'download' | 'local';
type MediaKind = 'video' | 'audio';
type WindowControlAction = 'minimize' | 'toggleMaximize' | 'close';
type AutosaveState = 'idle' | 'saving' | 'saved' | 'failed';
type DownloadPhase = 'preparing' | 'downloading' | 'processing' | 'completed' | 'failed';
type LibraryFilter = 'all' | 'video' | 'audio';
type LibrarySort = 'recent' | 'name' | 'duration';
type DownloadFilter = 'all' | 'active' | 'queued' | 'completed' | 'failed';

type MediaRow = {
  readonly id: number;
  readonly titleKey?: TextKey;
  readonly title?: string;
  readonly sourceKey?: TextKey;
  readonly source?: string;
  readonly duration: string;
  readonly durationSeconds?: number;
  readonly status: MediaStatus;
  readonly progress: number;
  readonly progressKnown?: boolean;
  readonly downloadPhase?: DownloadPhase;
  readonly downloadedBytes?: number;
  readonly totalBytes?: number;
  readonly downloadSpeedBytesPerSecond?: number;
  readonly size: string;
  readonly quality?: DownloadQuality;
  readonly sourceType?: MediaSourceType;
  readonly mediaKind?: MediaKind;
  readonly filePath?: string;
  readonly fileUrl?: string;
  readonly thumbnailUrl?: string;
  readonly createdAtMs?: number;
  readonly startedAtMs?: number;
  readonly completedAtMs?: number;
  readonly errorMessage?: string;
};

type TimelineLayer = {
  readonly id: EditorLayerId;
  readonly labelKey: TextKey;
  readonly detailKey: TextKey;
  readonly icon: LucideIcon;
  readonly offset: number;
  readonly width: number;
  readonly tone: 'cut' | 'subtitle' | 'blur' | 'zoom' | 'speed';
};

type EffectLayerId = 'blur' | 'zoom' | 'speed' | 'reframe';

type EffectWindow = {
  readonly startSeconds: number;
  readonly endSeconds: number;
};

type TimelineSegmentDragTarget =
  | {readonly kind:'audio-section';readonly id:string;readonly startSeconds:number;readonly endSeconds:number;readonly startClientX:number}
  | {
      readonly kind: 'trim';
      readonly startSeconds: number;
      readonly endSeconds: number;
      readonly startClientX: number;
    }
  | {
      readonly kind: 'effect';
      readonly id?: string;
      readonly layerId: EffectLayerId;
      readonly startSeconds: number;
      readonly endSeconds: number;
      readonly startClientX: number;
    }
  | {
      readonly kind: 'text';
      readonly id: number;
      readonly startSeconds: number;
      readonly endSeconds: number;
      readonly startClientX: number;
    }
  | {
      readonly kind: 'cutout';
      readonly id: number;
      readonly startSeconds: number;
      readonly endSeconds: number;
      readonly startClientX: number;
    };

type TimelineSegmentDragStart =
  | {readonly kind:'audio-section';readonly id:string;readonly startSeconds:number;readonly endSeconds:number}
  | {
      readonly kind: 'trim';
      readonly startSeconds: number;
      readonly endSeconds: number;
    }
  | {
      readonly kind: 'effect';
      readonly id?: string;
      readonly layerId: EffectLayerId;
      readonly startSeconds: number;
      readonly endSeconds: number;
    }
  | {
      readonly kind: 'text';
      readonly id: number;
      readonly startSeconds: number;
      readonly endSeconds: number;
    }
  | {
      readonly kind: 'cutout';
      readonly id: number;
      readonly startSeconds: number;
      readonly endSeconds: number;
    };

type NavigationItem = {
  readonly key: NavigationKey;
  readonly labelKey: TextKey;
  readonly icon: LucideIcon;
  readonly children?: readonly NavigationItem[];
};



type SubtitleCue = {
  readonly startSeconds: number;
  readonly endSeconds: number;
  readonly text: string;
};

type LoadedSubtitle = {
  readonly path: string;
  readonly name: string;
  readonly cues: readonly SubtitleCue[];
  readonly originalPath?: string;
  readonly originalName?: string;
  readonly originalCues?: readonly SubtitleCue[];
  readonly edited?: boolean;
};

type TextOverlay = {
  readonly id: number;
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly startSeconds: number;
  readonly endSeconds: number;
  readonly fontSize: number;
  readonly fontFamily?: EditorTextFontFamily;
  readonly color?: string;
  readonly zIndex: number;
  readonly hidden?: boolean;
  readonly locked?: boolean;
};

type CutOutRange = TimeRange & {
  readonly id: number;
};

type BlurMask = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

type ZoomRegion = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

type RegionResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

type TimelineHandleTarget =
  | {readonly kind:'audio-section';readonly id:string;readonly edge:'start'|'end'}
  | { readonly kind: 'trim'; readonly edge: 'start' | 'end' | 'playhead' }
  | { readonly kind: 'effect'; readonly layerId: EffectLayerId; readonly edge: 'start' | 'end'; readonly id?: string }
  | { readonly kind: 'text'; readonly id: number; readonly edge: 'start' | 'end' }
  | { readonly kind: 'cutout'; readonly id: number; readonly edge: 'start' | 'end' };

type EditorUiSnapshot = {
  readonly selectedLayerId: string;
  readonly playheadSeconds: number;
  readonly trimStartSeconds: number;
  readonly trimEndSeconds: number;
  readonly blurWindow: EffectWindow;
  readonly blurStrength: number;
  readonly blurMask: BlurMask;
  readonly zoomWindow: EffectWindow;
  readonly zoomScale: number;
  readonly zoomRegion: ZoomRegion;
  readonly speedWindow: EffectWindow;
  readonly speedRate: number;
  readonly reframeWindow: EffectWindow;
  readonly reframeTargetWidth: number;
  readonly reframeTargetHeight: number;
  readonly reframeFitMode: ReframeFitMode;
  readonly reframePositionX: number;
  readonly reframePositionY: number;
  readonly reframeBackground: ReframeBackground;
  readonly blurItems: readonly BlurEffectItem[];
  readonly zoomItems: readonly ZoomEffectItem[];
  readonly speedItems: readonly SpeedEffectItem[];
  readonly reframeItems: readonly ReframeEffectItem[];
  readonly selectedEffectItemId?: string;
  readonly textOverlays: readonly TextOverlay[];
  readonly selectedTextOverlayId?: number;
  readonly cutOutRanges: readonly CutOutRange[];
  readonly selectedCutOutId?: number;
  readonly subtitleFile?: LoadedSubtitle;
  readonly subtitlesVisible: boolean;
  readonly audioSettings?: AudioSettings;
  readonly audioSections?: AudioSection[];
  readonly visualizerSettings?: AudioVisualizerSettings;
  readonly visualizerVideo?: VisualizerVideoPreferences;
};

type VisualizerVideoPreferences = Omit<VisualizerVideoOptions,'scene'>&{image?:string;imageMode:'cover'|'logo';logoSize:number;logoX:number;logoY:number};

type CopiedTimelineItem =
  | { readonly kind: 'text'; readonly item: TextOverlay }
  | { readonly kind: 'cutout'; readonly item: CutOutRange }
  | {
      readonly kind: 'effect';
      readonly id?: string;
      readonly layerId: EffectLayerId;
      readonly window: EffectWindow;
      readonly blurStrength?: number;
      readonly blurMask?: BlurMask;
      readonly blurShape?: BlurEffectShape;
      readonly blurStyle?: BlurEffectStyle;
      readonly blurKeyframes?: BlurEffectItem['keyframes'];
      readonly blurTrackingEnabled?: boolean;
      readonly zoomScale?: number;
      readonly zoomRegion?: ZoomRegion;
      readonly zoomKeyframes?: ZoomEffectItem['keyframes'];
      readonly zoomTrackingEnabled?: boolean;
      readonly speedRate?: number;
      readonly speedMode?: SpeedEffectMode;
    };

type EditorContextMenuState = {
  readonly x: number;
  readonly y: number;
  readonly target: CopiedTimelineItem['kind'] | 'timeline' | 'preview';
};

const preferencesStorageKey = 'loaderly:preferences';
const mediaRowsStorageKey = 'loaderly:media-library:v1';
const subtitleReminderStorageKey = 'loaderly:subtitle-reminder-count';

const navigationItems: readonly NavigationItem[] = [
  { key: 'library', labelKey: 'library', icon: Library },
  { key: 'downloads', labelKey: 'downloads', icon: Download },
  { key: 'editor', labelKey: 'editor', icon: Scissors },
];

const navigationLabels: Record<Exclude<NavigationKey, 'community'>, TextKey> = {
  workspace: 'workspace',
  downloads: 'downloads',
  library: 'library',
  editor: 'editor',
  queue: 'queue',
  tools: 'tools',
  export: 'export',
  settings: 'preferences'
};

const emptyMediaRow: MediaRow = {
  id: 0,
  titleKey: 'noRealMedia',
  sourceKey: 'importRealMedia',
  duration: '00:00',
  status: 'queued',
  progress: 0,
  size: '0 MB'
};

const timelineLayers: readonly TimelineLayer[] = [
  {
    id: 'cuts',
    labelKey: 'cuts',
    detailKey: 'cutsDetail',
    icon: Scissors,
    offset: 5,
    width: 84,
    tone: 'cut'
  },
  {
    id: 'subtitles',
    labelKey: 'subtitles',
    detailKey: 'subtitlesDetail',
    icon: Captions,
    offset: 18,
    width: 46,
    tone: 'subtitle'
  },
  {
    id: 'blur',
    labelKey: 'blur',
    detailKey: 'blurDetail',
    icon: Layers3,
    offset: 48,
    width: 24,
    tone: 'blur'
  },
  {
    id: 'zoom',
    labelKey: 'zoom',
    detailKey: 'zoomDetail',
    icon: ZoomIn,
    offset: 22,
    width: 20,
    tone: 'zoom'
  },
  {
    id: 'speed',
    labelKey: 'speed',
    detailKey: 'speedDetail',
    icon: Gauge,
    offset: 63,
    width: 26,
    tone: 'speed'
  }
];

const qualityOptions: readonly DownloadQuality[] = ['best', '2160p', '1440p', '1080p', '720p', '480p', '360p', 'audio'];

function readPreferences(): AppPreferences {
  try {
    return normalizePreferences(JSON.parse(window.localStorage.getItem(preferencesStorageKey) ?? 'null'));
  } catch {
    return defaultPreferences;
  }
}

function readSavedMediaRows(): readonly MediaRow[] {
  try {
    const raw = window.localStorage.getItem(mediaRowsStorageKey);
    const value = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((row: Partial<MediaRow>, index): MediaRow | undefined => {
        const filePath = typeof row.filePath === 'string' && row.filePath.trim().length > 0 ? row.filePath : undefined;
        const source = typeof row.source === 'string' && row.source.trim().length > 0 ? row.source : undefined;
        const sourceType: MediaSourceType = row.sourceType === 'local' || (filePath && source === filePath) ? 'local' : 'download';
        const quality = isDownloadQuality(row.quality) ? row.quality : undefined;
        const durationSeconds = typeof row.durationSeconds === 'number' && Number.isFinite(row.durationSeconds) ? row.durationSeconds : undefined;
        const duration = typeof row.duration === 'string' && /^\d{2}:\d{2}(?::\d{2})?$/.test(row.duration)
          ? row.duration
          : durationSeconds !== undefined
            ? formatDuration(durationSeconds)
            : '00:00';

        if (!filePath && !source) {
          return undefined;
        }

        const ready = Boolean(filePath);
        const failed = row.status === 'failed' && !ready;

        const savedFileUrl = typeof row.fileUrl === 'string' && isLoaderlyMediaUrl(row.fileUrl) ? row.fileUrl : undefined;
        const savedThumbnailUrl =
          typeof row.thumbnailUrl === 'string' && isLoaderlyMediaUrl(row.thumbnailUrl) ? row.thumbnailUrl : undefined;

        return {
          id: typeof row.id === 'number' && Number.isFinite(row.id) ? row.id : Date.now() + index,
          title: typeof row.title === 'string' ? row.title : undefined,
          source: source ?? filePath,
          duration,
          durationSeconds,
          status: ready ? (row.status === 'edited' ? 'edited' : 'ready') : failed ? 'failed' : 'queued',
          progress: ready ? 100 : 0,
          progressKnown: ready,
          downloadPhase: ready ? 'completed' : failed ? 'failed' : 'preparing',
          size: typeof row.size === 'string' ? row.size : '0 MB',
          quality,
          sourceType,
          mediaKind: row.mediaKind === 'audio' ? 'audio' : mediaKindForPath(filePath ?? source, quality),
          filePath,
          fileUrl: savedFileUrl,
          thumbnailUrl: savedThumbnailUrl,
          createdAtMs: typeof row.createdAtMs === 'number' && Number.isFinite(row.createdAtMs) ? row.createdAtMs : undefined,
          startedAtMs: typeof row.startedAtMs === 'number' && Number.isFinite(row.startedAtMs) ? row.startedAtMs : undefined,
          completedAtMs: typeof row.completedAtMs === 'number' && Number.isFinite(row.completedAtMs) ? row.completedAtMs : undefined,
          errorMessage: typeof row.errorMessage === 'string' ? row.errorMessage : undefined
        };
      })
      .filter((row): row is MediaRow => Boolean(row));
  } catch {
    return [];
  }
}

function isLoaderlyMediaUrl(url: string): boolean {
  return url.startsWith('loaderly-media://');
}

function formatBytes(sizeBytes: number): string {
  if (sizeBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  }

  return `${Math.round(sizeBytes / 1024 / 1024)} MB`;
}

function formatDuration(seconds: number | undefined): string {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds <= 0) {
    return '00:00';
  }

  return formatTimecode(Math.round(seconds),false);
}

function formatElapsed(ms: number): string {
  return formatTimecode(Math.floor(ms/1000),false);
}

function friendlyDownloadError(message: string, locale: AppLocale): string {
  const normalized = message.replace(/\s+/g, ' ').trim();

  if (/yt-dlp was not found/i.test(normalized)) {
    return locale === 'ar' ? 'أداة yt-dlp غير موجودة. افتح الأدوات وشغل فحص الأدوات.' : 'yt-dlp was not found. Open Tools and run the tool check.';
  }

  if (/Download bridge is not available/i.test(normalized)) {
    return locale === 'ar' ? 'جسر التنزيل غير متاح في هذه النافذة.' : 'Download bridge is not available in this window.';
  }

  if (/WinError 10013|forbidden by its access permissions/i.test(normalized)) {
    return locale === 'ar'
      ? 'ويندوز منع اتصال yt-dlp بالإنترنت. تأكد من السماح للبرنامج في الجدار الناري أو الحماية.'
      : 'Windows blocked yt-dlp network access. Allow Loaderly/yt-dlp through firewall or security settings.';
  }

  if (/429|Too Many Requests/i.test(normalized)) {
    return locale === 'ar'
      ? 'يوتيوب حدّ الطلبات مؤقتًا لهذا الرابط. جرّب لاحقًا، أو استخدم شبكة مختلفة، أو استورد الملف محليًا إذا كان متوفرًا.'
      : 'YouTube temporarily rate-limited this request. Try again later, use another network, or import the file locally if available.';
  }

  if (isRecoverableDownloadFileError(normalized)) {
    return locale === 'ar'
      ? 'ويندوز قفل ملف مؤقت أثناء التحميل. أعد المحاولة، وإذا كان الملف اكتمل سيسترجعه Loaderly تلقائياً.'
      : 'Windows locked a temporary download file. Retry the download; if the final media finished, Loaderly will recover it automatically.';
  }

  if (/TikTok|universal data|rehydration|extract/i.test(normalized)) {
    return locale === 'ar'
      ? 'تعذر قراءة رابط TikTok بهذا الشكل. جرّب الرابط المختصر أو انسخ رابط المشاركة من التطبيق، أو استورد الملف محليًا إذا كان متوفرًا.'
      : 'TikTok did not expose this video in a downloadable format. Try the short share link, copy the share URL from the app, or import the local file if available.';
  }

  if (normalized === subtitlesSkippedRateLimitMessage) {
    return locale === 'ar'
      ? 'نُزّل الفيديو بدون الترجمة لأن طلبات الترجمة كانت محدودة مؤقتًا.'
      : 'The video downloaded without subtitles because subtitle requests were temporarily limited.';
  }

  if (normalized === subtitlesSkippedUnavailableMessage) {
    return locale === 'ar'
      ? 'نُزّل الفيديو، لكن لم تتوفر ترجمة قابلة للتنزيل لهذا الرابط.'
      : 'The video downloaded, but no downloadable subtitles were available for this link.';
  }

  const errorLine = message
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => /^ERROR:/i.test(line));
  const useful = errorLine ?? normalized;

  if (locale === 'en' && /[\u0600-\u06ff]/.test(useful)) {
    return 'Download failed. Retry to refresh the error details.';
  }

  return useful.length > 220 ? `${useful.slice(0, 217)}...` : useful;
}

function DownloadElapsedLabel({
  fallbackDownloadingLabel,
  locale,
  row
}: {
  readonly fallbackDownloadingLabel: string;
  readonly locale: AppLocale;
  readonly row: MediaRow;
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const isRunning = row.status === 'downloading' && Boolean(row.startedAtMs) && !row.completedAtMs;

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    setNowMs(Date.now());
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);

    return () => window.clearInterval(timer);
  }, [isRunning, row.startedAtMs]);

  let label: string;

  if (row.completedAtMs && row.startedAtMs) {
    label = locale === 'ar'
      ? `اكتمل خلال ${formatElapsed(row.completedAtMs - row.startedAtMs)}`
      : `Finished in ${formatElapsed(row.completedAtMs - row.startedAtMs)}`;
  } else if (row.status === 'failed' && row.errorMessage) {
    label = friendlyDownloadError(row.errorMessage, locale);
  } else if (row.startedAtMs) {
    label = locale === 'ar'
      ? `مر ${formatElapsed(nowMs - row.startedAtMs)}`
      : `${formatElapsed(nowMs - row.startedAtMs)} elapsed`;
  } else if (row.status === 'downloading') {
    label = fallbackDownloadingLabel;
  } else {
    label = row.status === 'queued'
      ? (locale === 'ar' ? 'بانتظار بدء التنزيل' : 'Waiting for download')
      : (locale === 'ar' ? 'جاهز محليًا' : 'Ready locally');
  }

  return <small dir="auto">{label}</small>;
}

function friendlyDownloadNotice(message: string | undefined, locale: AppLocale): string | undefined {
  if (message === subtitlesSkippedRateLimitMessage) {
    return locale === 'ar'
      ? 'نُزّل الفيديو، لكن تم تخطي الترجمة لأن YouTube حدّ طلبات الترجمة مؤقتًا.'
      : 'Video downloaded, but subtitles were skipped because YouTube temporarily rate-limited subtitle requests.';
  }

  if (message === subtitlesSkippedUnavailableMessage) {
    return locale === 'ar'
      ? 'نُزّل الفيديو، لكن لم تتوفر ترجمة قابلة للتنزيل لهذا الرابط.'
      : 'Video downloaded, but no downloadable subtitles were available for this link.';
  }

  return undefined;
}

function platformDisplayLabel(platform: NodeJS.Platform | undefined, arch: NodeJS.Architecture | undefined): string {
  const architecture = arch === 'x64' ? '64-bit' : arch === 'arm64' ? 'ARM64' : arch ?? '';

  if (platform === 'win32') {
    return `Windows ${architecture}`.trim();
  }

  if (platform === 'darwin') {
    return `macOS ${architecture}`.trim();
  }

  if (platform === 'linux') {
    return `Linux ${architecture}`.trim();
  }

  return platform ? `${platform} ${architecture}`.trim() : 'browser';
}

function defaultToolUpdateMessage(locale: AppLocale): string {
  return uiText(locale, 'Check for updates, then install or update each tool here.', 'افحص التحديثات، ثم ثبّت أو حدّث كل أداة من هنا.');
}

function subtitleTextAt(cues: readonly SubtitleCue[], seconds: number): string {
  return cues.find((cue) => seconds >= cue.startSeconds && seconds <= cue.endSeconds)?.text ?? '';
}

function splitBatchSources(value: string): readonly string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function fileKindForPath(path: string): 'media' | 'subtitle' | 'unknown' {
  const normalized = path.toLowerCase();

  if (/\.(srt|vtt)$/.test(normalized)) {
    return 'subtitle';
  }

  if (/\.(mp4|mov|mkv|webm|avi|m4v|mp3|wav|flac|m4a|aac|ogg|opus)$/.test(normalized)) {
    return 'media';
  }

  return 'unknown';
}

function mediaKindForPath(path: string | undefined, quality?: DownloadQuality): MediaKind {
  if (quality === 'audio') {
    return 'audio';
  }

  const normalized = (path ?? '').toLowerCase();

  return /\.(mp3|wav|flac|m4a|aac|ogg|opus)$/.test(normalized) ? 'audio' : 'video';
}

function isDownloadQuality(value: unknown): value is DownloadQuality {
  return qualityOptions.includes(value as DownloadQuality);
}

function normalizeRemoteSourceUrl(value: string): string {
  const trimmed = value.trim();

  try {
    const url = new URL(trimmed);

    if (url.hostname.endsWith('tiktok.com') && /^\/@[^/]+\/video\/\d+/.test(url.pathname)) {
      url.search = '';
      url.hash = '';
      return url.toString();
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}

function normalizeLocalFileSource(value: string): string {
  const trimmed = value.trim().replace(/^["']|["']$/g, '');

  if (!/^file:/i.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    const decodedPath = decodeURIComponent(url.pathname).replace(/^\/([A-Za-z]:)/, '$1');

    return decodedPath.replaceAll('/', '\\');
  } catch {
    return trimmed;
  }
}

function subtitleLanguagesForProfile(profile: SubtitleLanguageProfile): string {
  switch (profile) {
    case 'arabic':
      return 'ar,-live_chat';
    case 'english':
      return 'en,-live_chat';
    case 'arabic-english':
      return 'ar,en,-live_chat';
    case 'available':
      return 'original,ar,en,-live_chat';
  }
}

function editorCopy(locale: AppLocale) {
  const ar = locale === 'ar';

  return {
    selectTool: ar ? 'تحديد' : 'Select',
    selectToolDetail: ar ? 'حرّك العناصر وافتح خصائصها' : 'Move and inspect timeline items',
    selectToolActive: ar ? 'تم تفعيل أداة التحديد.' : 'Selection tool active.',
    addText: ar ? 'إضافة نص' : 'Add text',
    textLayer: ar ? 'طبقة نص' : 'Text layer',
    textTrack: ar ? 'النصوص' : 'Text',
    textPlaceholder: ar ? 'اكتب النص الذي يظهر فوق المقطع' : 'Text shown on the clip',
    removeText: ar ? 'حذف النص' : 'Remove text',
    cutOut: ar ? 'حذف جزء' : 'Cut out',
    cutOutTrack: ar ? 'الأجزاء المحذوفة' : 'Cut outs',
    cutOutHint: ar ? 'أضف جزء حذف حول المؤشر، واسحبه أو وسعه من التايم لاين' : 'Add a cut-out around the playhead, then drag or resize it on the timeline',
    removeCutOut: ar ? 'حذف الجزء المحدد' : 'Remove selected cut',
    keepRange: ar ? 'نطاق التصدير' : 'Keep range',
    snapOn: ar ? 'محاذاة تلقائية' : 'Soft snap',
    chooseSubtitle: ar ? 'اختيار ترجمة' : 'Choose subtitles',
    hideSubtitle: ar ? 'إخفاء' : 'Hide',
    showSubtitle: ar ? 'إظهار' : 'Show',
    removeSubtitle: ar ? 'إزالة الترجمة' : 'Remove subtitles',
    noSubtitle: ar ? 'لا توجد ترجمة محملة' : 'No subtitles loaded',
    loadedSubtitle: ar ? 'ترجمة محملة' : 'Loaded subtitles',
    currentSubtitleCue: ar ? 'المقطع الحالي' : 'Current cue',
    noCueAtPlayhead: ar ? 'لا يوجد نص ترجمة عند المؤشر الحالي.' : 'No subtitle cue at the current playhead.',
    addSubtitleCue: ar ? 'إضافة نص عند المؤشر' : 'Add cue here',
    removeSubtitleCue: ar ? 'حذف النص الحالي' : 'Remove cue',
    restoreOriginalSubtitle: ar ? 'استرجاع الأصل' : 'Restore original',
    translateSubtitle: ar ? 'ترجمة' : 'Translate',
    translateUnavailable: ar
      ? 'الترجمة الآلية تحتاج اختيار مزود ذكاء اصطناعي من الإعدادات قبل استخدامها.'
      : 'AI translation needs a provider in Preferences before it can run.',
    editedSubtitle: ar ? 'معدلة' : 'edited',
    subtitleStart: ar ? 'البداية' : 'Start',
    subtitleEnd: ar ? 'النهاية' : 'End',
    speedExportBlocked: ar
      ? 'معاينة السرعة تعمل هنا، لكن تصدير مقاطع Speed غير مدعوم بأمان بعد. احذف أو أخفِ Speed لتفعيل التصدير.'
      : 'Speed preview works here, but Speed effects are not export-supported safely yet. Delete or hide Speed to enable export.',
    dragHint: ar ? 'اسحب النص فوق المعاينة لتغيير مكانه' : 'Drag text on the preview to place it',
    dragBlurHint: ar ? 'اسحب قناع التمويه فوق المعاينة لتغيير مكانه' : 'Drag the blur mask on the preview',
    zoomToolDetail: ar ? 'أنشئ منطقة زوم مؤقتة عند المؤشر' : 'Create a timed zoom area at the playhead',
    dropHint: ar ? 'اسحب فيديو أو ملف SRT/VTT هنا' : 'Drop media or SRT/VTT here',
    dropPrimary: ar ? 'اسحب ملف فيديو هنا أو استورد ملفًا' : 'Drop media here or import a file',
    fontSize: ar ? 'حجم الخط' : 'Font size',
    textRange: ar ? 'نطاق النص' : 'Text range',
    reset: ar ? 'إعادة ضبط' : 'Reset',
    disabled: ar ? 'متوقف' : 'Off',
    batchAdded: ar ? 'أُضيف {count} روابط إلى قائمة الانتظار.' : 'Added {count} links to the queue.',
    emptyUrl: ar ? 'الصق رابطًا واحدًا أو عدة روابط، أو اسحب ملفًا.' : 'Paste one or more links, or drop a file.',
    subtitleLoaded: ar ? 'حُمّلت الترجمة: {name}' : 'Loaded subtitles: {name}',
    droppedUnsupported: ar ? 'الملف المسحوب غير مدعوم.' : 'Dropped file is not supported.'
  };
}

function clampRangeValue(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function roundedPercent(value: number): number {
  return Math.round(clampRangeValue(value, 0, 120));
}

function roundedPreviewPercent(value: number): number {
  return Math.round(clampRangeValue(value, 0, 100) * 10) / 10;
}

function formatPercentValue(value: number): string {
  return `${roundedPercent(value)}%`;
}

const timelineItemMinimumSeconds = 0.05;

function normalizeEffectWindow(windowValue: EffectWindow, duration: number): EffectWindow {
  const safeDuration = Math.max(timelineItemMinimumSeconds, duration);
  const startSeconds = clampRangeValue(windowValue.startSeconds, 0, safeDuration - timelineItemMinimumSeconds);
  const endSeconds = clampRangeValue(windowValue.endSeconds, startSeconds + timelineItemMinimumSeconds, safeDuration);

  return { startSeconds, endSeconds };
}

function isEffectLayerId(value: string): value is EffectLayerId {
  return value === 'blur' || value === 'zoom' || value === 'speed' || value === 'reframe';
}

function isTimelineItemActive(item: { readonly startTime: number; readonly endTime: number; readonly hidden?: boolean }, playheadSeconds: number): boolean {
  return !item.hidden && playheadSeconds >= item.startTime && playheadSeconds <= item.endTime;
}

function overlappingTimelineItemIds(items: readonly { readonly id: string; readonly startTime: number; readonly endTime: number; readonly hidden?: boolean }[]): ReadonlySet<string> {
  const sortedItems = items
    .filter((item) => !item.hidden)
    .slice()
    .sort((left, right) => left.startTime - right.startTime || left.endTime - right.endTime);
  const ids = new Set<string>();

  for (let index = 1; index < sortedItems.length; index += 1) {
    const previous = sortedItems[index - 1];
    const current = sortedItems[index];

    if (current.startTime < previous.endTime - 0.001) {
      ids.add(previous.id);
      ids.add(current.id);
    }
  }

  return ids;
}

function itemWindow(item: { readonly startTime: number; readonly endTime: number } | undefined, fallback: EffectWindow): EffectWindow {
  return item ? { startSeconds: item.startTime, endSeconds: item.endTime } : fallback;
}

function resizeRegionFromHandle(region: BlurMask, handle: RegionResizeHandle, pointerX: number, pointerY: number, minimumSize: number): BlurMask {
  let left = region.x - region.width / 2;
  let right = region.x + region.width / 2;
  let top = region.y - region.height / 2;
  let bottom = region.y + region.height / 2;

  if (handle.includes('w')) {
    left = clampRangeValue(pointerX, 0, right - minimumSize);
  }

  if (handle.includes('e')) {
    right = clampRangeValue(pointerX, left + minimumSize, 100);
  }

  if (handle.includes('n')) {
    top = clampRangeValue(pointerY, 0, bottom - minimumSize);
  }

  if (handle.includes('s')) {
    bottom = clampRangeValue(pointerY, top + minimumSize, 100);
  }

  const width = Math.max(minimumSize, right - left);
  const height = Math.max(minimumSize, bottom - top);

  return clampPreviewRegion({
    x: left + width / 2,
    y: top + height / 2,
    width,
    height
  }, minimumSize);
}

function clampPreviewRegion(region: BlurMask, minimumSize: number): BlurMask {
  const width = roundedPreviewPercent(clampRangeValue(region.width, minimumSize, 100));
  const height = roundedPreviewPercent(clampRangeValue(region.height, minimumSize, 100));

  return {
    x: roundedPreviewPercent(clampRangeValue(region.x, width / 2, 100 - width / 2)),
    y: roundedPreviewPercent(clampRangeValue(region.y, height / 2, 100 - height / 2)),
    width,
    height
  };
}

function clampPreviewOverlayPoint(x: number, y: number, frameRect: PreviewRect, elementRect: DOMRect): { readonly x: number; readonly y: number } {
  const halfWidth = clampRangeValue((elementRect.width / Math.max(1, frameRect.width)) * 50, 0, 48);
  const halfHeight = clampRangeValue((elementRect.height / Math.max(1, frameRect.height)) * 50, 0, 48);

  return {
    x: roundedPreviewPercent(clampRangeValue(x, halfWidth, 100 - halfWidth)),
    y: roundedPreviewPercent(clampRangeValue(y, halfHeight, 100 - halfHeight))
  };
}

function statusClass(status: MediaStatus): string {
  return status;
}

function uiText(locale: AppLocale, en: string, ar: string): string {
  return locale === 'ar' ? ar : en;
}

function aiProviderDefaultModel(provider: AiTranslationProvider): string { return providerModels[provider][0] ?? ''; }
function aiProviderDefaultBaseUrl(provider: AiTranslationProvider): string { return providerBaseUrls[provider]; }

function aiProviderNeedsApiKey(provider: AiTranslationProvider): boolean {
  return provider === 'openrouter' || provider === 'openai' || provider === 'anthropic' || provider === 'gemini';
}

function aiProviderNeedsBaseUrl(provider: AiTranslationProvider): boolean {
  return provider === 'local' || provider === 'custom';
}

function aiProviderReady(preferences: AppPreferences): boolean {
  if (preferences.aiTranslationProvider === 'off') {
    return false;
  }

  if (aiProviderNeedsApiKey(preferences.aiTranslationProvider) && preferences.aiTranslationApiKey.trim().length === 0) {
    return false;
  }

  if (aiProviderNeedsBaseUrl(preferences.aiTranslationProvider) && preferences.aiTranslationBaseUrl.trim().length === 0) {
    return false;
  }

  return preferences.aiTranslationModel.trim().length > 0;
}


export function App() {
  const initialPreferencesRef = useRef<AppPreferences | null>(null);
  const initialMediaRowsRef = useRef<readonly MediaRow[] | null>(null);

  if (!initialPreferencesRef.current) {
    initialPreferencesRef.current = readPreferences();
  }

  if (!initialMediaRowsRef.current) {
    initialMediaRowsRef.current = readSavedMediaRows();
  }

  const initialPreferences = initialPreferencesRef.current;
  const initialMediaRows = initialMediaRowsRef.current;
  const videoRef = useRef<HTMLMediaElement>(null);
  const previewFrameRef = useRef<HTMLDivElement>(null);
  const editorStageRef = useRef<HTMLElement>(null);
  const previewFocusReturnRef = useRef<HTMLElement | undefined>(undefined);
  const playerScrubberRef = useRef<HTMLDivElement>(null);
  const trimTimelineRef = useRef<HTMLDivElement>(null);
  const outputMenuRef = useRef<HTMLDivElement>(null);
  const previewFocusCloseTimerRef = useRef<number | undefined>(undefined);
  const playheadAutosaveTimerRef = useRef<number | undefined>(undefined);
  const timelineSegmentDragRef = useRef<TimelineSegmentDragTarget | undefined>(undefined);
  const timelineDragCommittedRef = useRef(false);
  const timelineHandleGestureRef = useRef<{ startX: number; committed: boolean } | undefined>(undefined);
  const timelineScrubRef = useRef(false);
  const timelineScrubPointerIdRef = useRef<number | undefined>(undefined);
  const playerScrubRef = useRef(false);
  const outputBusyRef = useRef(false);
  const toolCheckBusyRef = useRef(false);
  const downloadInFlightIdsRef = useRef<Set<number>>(new Set());
  const autoTrackingBusyRef = useRef(false);
  const previewPreparationRef = useRef<Set<string>>(new Set());
  const previewPlaybackFallbackRef = useRef<Set<string>>(new Set());
  const textPointerStartRef = useRef<{ readonly selectedId?: number; moved: boolean } | undefined>(undefined);
  const textOverlayDragRef = useRef<
    | {
        readonly id: number;
        readonly element: HTMLElement;
        readonly frameRect: PreviewRect;
        readonly elementRect: DOMRect;
        readonly startClientX: number;
        readonly startClientY: number;
        readonly originX: number;
        readonly originY: number;
        nextX: number;
        nextY: number;
        historyPushed: boolean;
        raf?: number;
      }
    | undefined
  >(undefined);
  const previewRegionDragRef = useRef<
    | {
        readonly layerId: 'blur' | 'zoom';
        readonly id: string;
        readonly element: HTMLElement;
        readonly frameRect: PreviewRect;
        readonly startClientX: number;
        readonly startClientY: number;
        readonly origin: BlurMask;
        readonly minimumSize: number;
        readonly mode: 'move' | 'resize';
        readonly handle?: RegionResizeHandle;
        next: BlurMask;
        historyPushed: boolean;
        raf?: number;
      }
    | undefined
  >(undefined);
  const [preferences, setPreferences] = useState<AppPreferences>(initialPreferences);
  const documentationUrl = `https://loaderly-docs.voidksa.workers.dev/${preferences.locale === 'ar' ? 'ar/' : ''}docs/`;
  const [availableProgramUpdate,setAvailableProgramUpdate]=useState('');
  useEffect(()=>window.loaderly?.onProgramUpdate(state=>{if(state.phase==='available')setAvailableProgramUpdate(state.version??'');}),[]);
  const [showDiscovery,setShowDiscovery]=useState(()=>localStorage.getItem('loaderly:discovery:2.1')!=='dismissed');
  const [activeNav, setActiveNav] = useState<NavigationKey>('library');
  const [communityCreatorOpen,setCommunityCreatorOpen]=useState(false);
  const [pendingSoundCode,setPendingSoundCode]=useState<string>();
  const communityOpen = activeNav === 'community';
  useEffect(() => {
    const open = (event:Event) => {setCommunityCreatorOpen((event as CustomEvent).detail?.create===true);selectNavigation('community');};
    window.addEventListener('loaderly:community', open);
    return () => window.removeEventListener('loaderly:community', open);
  });
  const [mediaRows, setMediaRows] = useState<readonly MediaRow[]>(initialMediaRows);
  const [allocateMediaId] = useState(()=>createMediaIdAllocator(initialMediaRows.map(row=>row.id)));
  const mediaRowsRef=useRef(mediaRows);mediaRowsRef.current=mediaRows;
  useEffect(()=>{
    let busy=false,disposed=false;
    const refresh=async()=>{
      if(busy||disposed||document.hidden||!window.loaderly?.missingLibraryFiles)return;
      const paths=mediaRowsRef.current.filter(row=>row.status==='ready'&&row.filePath).map(row=>row.filePath!);
      if(!paths.length)return;busy=true;
      try{const missing=new Set(await window.loaderly.missingLibraryFiles(paths));if(!disposed&&missing.size)setMediaRows(rows=>rows.filter(row=>row.status!=='ready'||!row.filePath||!missing.has(row.filePath)));}catch{/* Keep the library when the system cannot verify files. */}finally{busy=false;}
    };
    void refresh();const timer=window.setInterval(()=>void refresh(),15000);
    window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
    return()=>{disposed=true;clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[]);
  const [selectedMediaId, setSelectedMediaId] = useState<number | undefined>(undefined);
  const [openedEditorMediaId, setOpenedEditorMediaId] = useState<number | undefined>(undefined);
  const [settingsTab, setSettingsTab] = useState<'general' | 'downloads' | 'translation' | 'about'>('general');
  const [selectedLayerId, setSelectedLayerId] = useState<EditorLayerId>('cuts');
  // The active tool is independent of the timeline item shown in the inspector.
  const [activeEditorTool, setActiveEditorTool] = useState<EditorToolId>('select');
  const [urlValue, setUrlValue] = useState('');
  const [librarySelecting,setLibrarySelecting]=useState(false);
  const [librarySelection,setLibrarySelection]=useState<number[]>([]);
  const [libraryRemoval,setLibraryRemoval]=useState<number[]>();
  const [playlistRequest,setPlaylistRequest]=useState<{url:string;resolve:(entries:PlaylistEntry[]|null)=>void}>();
  const playlistSelections=useRef(new Map<string,string[]>());
  const addingDownloads=useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopPlayback, setLoopPlayback] = useState(false);
  useEffect(() => { setLoopPlayback(false); setActiveEditorTool('select'); setAudioInspectorOpen(false); }, [selectedMediaId]);
  const [playheadSeconds, setPlayheadSeconds] = useState(0);
  const [previewOrientation, setPreviewOrientation] = useState<'landscape' | 'portrait' | 'square'>('landscape');
  const [previewFrameSize, setPreviewFrameSize] = useState<PreviewSize>({ width: 16, height: 9 });
  const [previewMediaSize, setPreviewMediaSize] = useState<PreviewSize>({ width: 16, height: 9 });
  const [isPreviewFocusMode, setIsPreviewFocusMode] = useState(false);
  const [isPreviewFocusClosing, setIsPreviewFocusClosing] = useState(false);
  const [trimStartSeconds, setTrimStartSeconds] = useState(0);
  const [trimEndSeconds, setTrimEndSeconds] = useState(8);
  const [timelineZoom, setTimelineZoom] = useState(timelineMinZoom);
  const [timelineViewportStartSeconds, setTimelineViewportStartSeconds] = useState(0);
  const [blurWindow, setBlurWindow] = useState<EffectWindow>({ startSeconds: 0, endSeconds: 8 });
  const [blurStrength, setBlurStrength] = useState(0);
  const [blurMask, setBlurMask] = useState<BlurMask>({ x: 50, y: 42, width: 34, height: 22 });
  const [zoomWindow, setZoomWindow] = useState<EffectWindow>({ startSeconds: 0, endSeconds: 8 });
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomRegion, setZoomRegion] = useState<ZoomRegion>({ x: 50, y: 50, width: 62, height: 62 });
  const [speedWindow, setSpeedWindow] = useState<EffectWindow>({ startSeconds: 0, endSeconds: 8 });
  const [speedRate, setSpeedRate] = useState(1);
  const [reframeWindow, setReframeWindow] = useState<EffectWindow>({ startSeconds: 0, endSeconds: 8 });
  const [reframeTargetWidth, setReframeTargetWidth] = useState(0);
  const [reframeTargetHeight, setReframeTargetHeight] = useState(0);
  const [reframeFitMode, setReframeFitMode] = useState<ReframeFitMode>('fit');
  const [reframePositionX, setReframePositionX] = useState(0.5);
  const [reframePositionY, setReframePositionY] = useState(0.5);
  const [reframeBackground, setReframeBackground] = useState<ReframeBackground>({ kind: 'black' });
  const [blurItems, setBlurItems] = useState<readonly BlurEffectItem[]>([]);
  const [zoomItems, setZoomItems] = useState<readonly ZoomEffectItem[]>([]);
  const [speedItems, setSpeedItems] = useState<readonly SpeedEffectItem[]>([]);
  const [reframeItems, setReframeItems] = useState<readonly ReframeEffectItem[]>([]);
  const [selectedEffectItemId, setSelectedEffectItemId] = useState<string | undefined>(undefined);
  const [jobCounter, setJobCounter] = useState(1);
  const [toolStatuses, setToolStatuses] = useState<readonly ToolStatus[]>([]);
  const [toolCheckBusy, setToolCheckBusy] = useState(false);
  const [updatingToolName, setUpdatingToolName] = useState<string | undefined>(undefined);
  const [toolInstallProgress, setToolInstallProgress] = useState<import('../shared/tool-manager/toolStatus').ToolInstallProgress>();
  useEffect(() => window.loaderly?.onToolInstallProgress?.(setToolInstallProgress), []);
  const [copyJobs, setCopyJobs] = useState<readonly QuickCopyJob[]>([]);
  const [textOverlays, setTextOverlays] = useState<readonly TextOverlay[]>([]);
  const [selectedTextOverlayId, setSelectedTextOverlayId] = useState<number | undefined>(undefined);
  const [cutOutRanges, setCutOutRanges] = useState<readonly CutOutRange[]>([]);
  const [selectedCutOutId, setSelectedCutOutId] = useState<number | undefined>(undefined);
  const [textDraft, setTextDraft] = useState(initialPreferences.locale === 'ar' ? 'نص على المقطع' : 'On-screen text');
  const [subtitleFile, setSubtitleFile] = useState<LoadedSubtitle | undefined>(undefined);
  const [subtitlesVisible, setSubtitlesVisible] = useState(true);
  const [audioSettings,setAudioSettings]=useState<AudioSettings>(defaultAudioSettings);
  const [audioSections,setAudioSections]=useState<AudioSection[]>([]);
  const [selectedAudioSectionId,setSelectedAudioSectionId]=useState<string>();
  const [audioInspectorOpen,setAudioInspectorOpen]=useState(false);
  const [videoExportBusy,setVideoExportBusy]=useState(false);
  const [visualizerVideo,setVisualizerVideo]=useState<VisualizerVideoPreferences>({size:'landscape',resolution:1080,imageMode:'cover',logoSize:20,logoX:50,logoY:30});
  const [audioPanelTab,setAudioPanelTab]=useState<'sound'|'visualizer'|'video'>('sound');
  const [visualizerSettings,setVisualizerSettings]=useState<AudioVisualizerSettings>(()=>{
    try { return normalizeVisualizer(JSON.parse(localStorage.getItem('loaderly:audio-visualizer:v1') ?? 'null')); } catch { return defaultVisualizer; }
  });
  const [cleanAudioView,setCleanAudioView]=useState(false);
  const [cleanControlsVisible,setCleanControlsVisible]=useState(false);
  const cleanControlsTimer=useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(()=>{localStorage.setItem('loaderly:audio-visualizer:v1',JSON.stringify(visualizerSettings));},[visualizerSettings]);
  useEffect(()=>{setCleanAudioView(false);setCleanControlsVisible(false);clearTimeout(cleanControlsTimer.current);},[selectedMediaId]);
  useEffect(()=>()=>clearTimeout(cleanControlsTimer.current),[]);
  function revealCleanControls() {
    if(!cleanAudioView)return;
    setCleanControlsVisible(true);clearTimeout(cleanControlsTimer.current);
    cleanControlsTimer.current=setTimeout(()=>setCleanControlsVisible(false),1800);
  }
  function openCleanAudioView() {
    setCleanAudioView(true);setCleanControlsVisible(false);openPreviewFocusMode();
  }

  const [extractingAudio,setExtractingAudio]=useState(false);
  const [modelChoices,setModelChoices]=useState<string[]>([]);
  const [modelsBusy,setModelsBusy]=useState(false);
  const [aiMessage,setAiMessage]=useState('');
  const [translationBusy,setTranslationBusy]=useState(false);
  const [targetLanguage,setTargetLanguage]=useState('Arabic');
  const translationSequence=useRef(0);
  const [editorUndoStack, setEditorUndoStack] = useState<readonly EditorUiSnapshot[]>([]);
  const [editorRedoStack, setEditorRedoStack] = useState<readonly EditorUiSnapshot[]>([]);
  const [copiedTimelineItem, setCopiedTimelineItem] = useState<CopiedTimelineItem | undefined>(undefined);
  const [outputMenuOpen, setOutputMenuOpen] = useState(false);
  const [outputBusy, setOutputBusy] = useState<EditorOutputActionKind | undefined>(undefined);
  const [autosaveState, setAutosaveState] = useState<AutosaveState>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | undefined>(undefined);
  const [libraryViewMode, setLibraryViewMode] = useState<'grid' | 'list'>('grid');
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>('all');
  const [librarySort, setLibrarySort] = useState<LibrarySort>('recent');
  const [librarySearch, setLibrarySearch] = useState('');
  const [downloadFilter, setDownloadFilter] = useState<DownloadFilter>('all');
  const [editorContextMenu, setEditorContextMenu] = useState<EditorContextMenuState | undefined>(undefined);
  const [activity, setActivity] = useState(() => createText(initialPreferences.locale)('ready'));
  const [activityNotice, setActivityNotice] = useState('');
  useEffect(() => {
    if (/failed|could not|not available|unavailable|lost the target|target was lost|no clear|تعذّر|تعذر|فشل|غير متاح|فُقد|لا يوجد وجه/i.test(activity)) setActivityNotice(activity);
  }, [activity]);

  const [previewResult, setPreviewResult] = useState(false);
  const [trackingModes, setTrackingModes] = useState<Record<string, 'automatic' | 'manual'>>({});
  useEffect(() => setPreviewResult(false), [selectedMediaId, selectedEffectItemId]);
  const [autoTrackingItemId, setAutoTrackingItemId] = useState<string | undefined>(undefined);
  const [trackingMessage, setTrackingMessage] = useState<{ id: string; text: string }>();
  const trackingCancelledRef = useRef(false);
  const trackingContextRef = useRef({ selectedMediaId, activeNav, blurItems, zoomItems });
  trackingContextRef.current = { selectedMediaId, activeNav, blurItems, zoomItems };
  const latestEditorAutosaveRef = useRef<{ mediaId: number | undefined; save: () => boolean }>({ mediaId: undefined, save: () => false });
  latestEditorAutosaveRef.current = { mediaId: selectedMediaId, save: () => persistEditorSnapshotNow() };
  const [toolUpdateMessage, setToolUpdateMessage] = useState(() => defaultToolUpdateMessage(initialPreferences.locale));
  const playheadSecondsRef = useRef(0);
  const playbackUiFrameMsRef = useRef(0);

  const t = useMemo(() => createText(preferences.locale), [preferences.locale]);
  const editorText = useMemo(() => editorCopy(preferences.locale), [preferences.locale]);
  const inspectorText = useMemo(
    () => ({
      addBlur: uiText(preferences.locale, 'Add blur', 'إضافة بلور'),
      addSpeed: uiText(preferences.locale, 'Add speed', 'إضافة سرعة'),
      addZoom: uiText(preferences.locale, 'Add zoom', 'إضافة زوم'),
      blurEmpty: uiText(preferences.locale, 'No blur selected', 'لا يوجد بلور محدد'),
      blurEmptyDetail: uiText(
        preferences.locale,
        'Add a blur at the playhead to create a real timed timeline item.',
        'أضف بلور عند المؤشر لإنشاء عنصر حقيقي على الخط الزمني.'
      ),
      blurSubtitle: uiText(preferences.locale, 'Move or resize the blur box directly on the preview.', 'حرّك أو غيّر حجم التمويه مباشرة من المعاينة.'),
      content: uiText(preferences.locale, 'Content', 'المحتوى'),
      color: uiText(preferences.locale, 'Color', 'اللون'),
      delete: uiText(preferences.locale, 'Delete', 'حذف'),
      duplicate: uiText(preferences.locale, 'Duplicate', 'تكرار'),
      duration: uiText(preferences.locale, 'Duration', 'المدة'),
      easeIn: uiText(preferences.locale, 'Ease in', 'دخول ناعم'),
      easeOut: uiText(preferences.locale, 'Ease out', 'خروج ناعم'),
      end: uiText(preferences.locale, 'End', 'النهاية'),
      font: uiText(preferences.locale, 'Font', 'الخط'),
      geometry: uiText(preferences.locale, 'Preview geometry', 'موضع المعاينة'),
      hidden: uiText(preferences.locale, 'Hide', 'إخفاء'),
      item: uiText(preferences.locale, 'Item', 'العنصر'),
      layer: uiText(preferences.locale, 'Layer', 'الطبقة'),
      locked: uiText(preferences.locale, 'Lock', 'قفل'),
      motion: uiText(preferences.locale, 'Motion', 'الحركة'),
      name: uiText(preferences.locale, 'Name', 'الاسم'),
      noSpeed: uiText(preferences.locale, 'No speed item selected', 'لا يوجد عنصر سرعة محدد'),
      noText: uiText(preferences.locale, 'No text selected', 'لا يوجد نص محدد'),
      noTextDetail: uiText(preferences.locale, 'Text layers can overlap, move freely, and export with the selected range.', 'طبقات النص يمكن تكديسها وتحريكها بحرية وتصديرها مع النطاق المحدد.'),
      noZoom: uiText(preferences.locale, 'No zoom selected', 'لا يوجد زوم محدد'),
      positionStyle: uiText(preferences.locale, 'Position and style', 'الموضع والشكل'),
      rate: uiText(preferences.locale, 'Rate', 'السرعة'),
      scale: uiText(preferences.locale, 'Scale', 'مقدار التقريب'),
      show: uiText(preferences.locale, 'Show', 'إظهار'),
      size: uiText(preferences.locale, 'Size', 'الحجم'),
      speedSubtitle: uiText(preferences.locale, 'Preview-only speed region. Export is intentionally blocked.', 'منطقة سرعة للمعاينة فقط. التصدير محجوب حالياً حتى لا يخرج بنتيجة خاطئة.'),
      start: uiText(preferences.locale, 'Start', 'البداية'),
      strength: uiText(preferences.locale, 'Strength', 'القوة'),
      textSubtitle: uiText(preferences.locale, 'Add text at the playhead, then drag it on the preview.', 'أضف النص عند المؤشر ثم حرّكه فوق المعاينة.'),
      textTuneSubtitle: uiText(preferences.locale, 'Drag text on the preview or tune it here.', 'حرّك النص من المعاينة أو عدّله من هنا.'),
      timing: uiText(preferences.locale, 'Timing', 'التوقيت'),
      unlocked: uiText(preferences.locale, 'Unlock', 'فتح القفل'),
      zoomConflict: uiText(
        preferences.locale,
        'Overlapping Zoom effects cannot be exported yet. Move or shorten one zoom item; sequential zooms are supported.',
        'لا يمكن تصدير زوم متداخل حالياً. حرّك أو قصّر أحد عناصر التقريب؛ التقريب المتتابع مدعوم.'
      ),
      zoomEmptyDetail: uiText(
        preferences.locale,
        'Zooms are timeline items. Sequential zooms export; overlapping zooms are blocked.',
        'التقريب عنصر على الخط الزمني. التقريب المتتابع يتصدر، والمتداخل محجوب حالياً.'
      ),
      zoomHint: uiText(preferences.locale, 'Drag the zoom region on the preview and resize it from the handles.', 'اسحب منطقة التقريب فوق المعاينة وغيّر حجمها من المقابض.'),
      zoomSubtitle: uiText(preferences.locale, "Zoom returns to normal after this item's range.", 'التقريب يرجع للوضع الطبيعي بعد نهاية نطاقه.')
    }),
    [preferences.locale]
  );
  const editorTimelineIsRtl = false;

  function commitPlayheadSeconds(nextSeconds: number) {
    playheadSecondsRef.current = nextSeconds;
    setPlayheadSeconds(nextSeconds);
  }

  const selectedMedia = useMemo(
    () => mediaRows.find((row) => row.id === selectedMediaId) ?? emptyMediaRow,
    [mediaRows, selectedMediaId]
  );
  const selectedEditorMediaKind: EditorMediaKind = selectedMedia.mediaKind === 'audio' ? 'audio' : 'video';
  const isAudioEditor = selectedEditorMediaKind === 'audio';
  const selectedLayerIdForMedia = normalizeEditorLayerForMedia(selectedEditorMediaKind, selectedLayerId);

  const selectedLayer = useMemo(
    () => timelineLayers.find((layer) => layer.id === selectedLayerIdForMedia) ?? timelineLayers[0],
    [selectedLayerIdForMedia]
  );

  const selectedTextOverlay = useMemo(
    () => textOverlays.find((overlay) => overlay.id === selectedTextOverlayId),
    [selectedTextOverlayId, textOverlays]
  );
  const selectedCutOut = useMemo(
    () => cutOutRanges.find((range) => range.id === selectedCutOutId),
    [cutOutRanges, selectedCutOutId]
  );

  const selectedDurationSeconds = selectedMedia.durationSeconds ?? 0;
  const effectiveTrimEnd = selectedDurationSeconds > 0 ? Math.min(trimEndSeconds, selectedDurationSeconds) : trimEndSeconds;
  const timelineDuration = Math.max(1, selectedDurationSeconds || effectiveTrimEnd || 8);
  const timelineViewport = useMemo(
    () =>
      timelineViewportFromZoom({
        duration: timelineDuration,
        zoom: timelineZoom,
        previousStartSeconds: timelineViewportStartSeconds
      }),
    [timelineDuration, timelineViewportStartSeconds, timelineZoom]
  );
  const timelineViewportDuration = Math.max(0.001, timelineViewport.endSeconds - timelineViewport.startSeconds);
  const keptRanges = useMemo(
    () => keptRangesFromCutOuts({ startSeconds: trimStartSeconds, endSeconds: effectiveTrimEnd }, cutOutRanges),
    [cutOutRanges, effectiveTrimEnd, trimStartSeconds]
  );
  const hasRealMedia = Boolean(selectedMedia.filePath && selectedMedia.fileUrl);
  const activeSubtitleText = !isAudioEditor && subtitlesVisible && subtitleFile ? subtitleTextAt(subtitleFile.cues, playheadSeconds) : '';
  const activeSubtitleCueIndex = useMemo(
    () => (subtitleFile ? findActiveSubtitleCueIndex(subtitleFile.cues, playheadSeconds) : -1),
    [playheadSeconds, subtitleFile]
  );
  const activeSubtitleCue = activeSubtitleCueIndex >= 0 ? subtitleFile?.cues[activeSubtitleCueIndex] : undefined;
  const selectedBlurItem = useMemo(() => blurItems.find((item) => item.id === selectedEffectItemId), [blurItems, selectedEffectItemId]);
  const selectedZoomItem = useMemo(() => zoomItems.find((item) => item.id === selectedEffectItemId), [zoomItems, selectedEffectItemId]);
  const selectedSpeedItem = useMemo(() => speedItems.find((item) => item.id === selectedEffectItemId), [speedItems, selectedEffectItemId]);
  const selectedReframeItem = useMemo(() => reframeItems.find((item) => item.id === selectedEffectItemId), [reframeItems, selectedEffectItemId]);
  const activeBlurItems = useMemo(
    () => isAudioEditor ? [] : blurItems.filter((item) => isTimelineItemActive(item, playheadSeconds)),
    [blurItems, isAudioEditor, playheadSeconds]
  );
  const activeZoomItems = useMemo(
    () => isAudioEditor ? [] : zoomItems.filter((item) => !item.hidden && isTimelineItemActive(item, playheadSeconds)),
    [isAudioEditor, playheadSeconds, zoomItems]
  );
  const activeSpeedItems = useMemo(() => speedItems.filter((item) => !item.hidden && hasSpeedSound(item.rate, item.mode) && isTimelineItemActive(item, playheadSeconds)), [playheadSeconds, speedItems]);
  const activeReframeItems = useMemo(
    () => isAudioEditor ? [] : reframeItems.filter((item) => !item.hidden),
    [reframeItems, isAudioEditor, playheadSeconds]
  );
  const activeReframeItem = activeReframeItems[0];
  const overlappingZoomItemIds = useMemo(() => overlappingTimelineItemIds(zoomItems), [zoomItems]);
  const activeTextOverlays = useMemo(
    () =>
      isAudioEditor
        ? []
        :
      textOverlays
        .filter((overlay) => !overlay.hidden && playheadSeconds >= overlay.startSeconds && playheadSeconds <= overlay.endSeconds)
        .sort((left, right) => left.zIndex - right.zIndex),
    [isAudioEditor, playheadSeconds, textOverlays]
  );
  const activeZoomItem = activeZoomItems.find((item) => item.id === selectedEffectItemId) ?? activeZoomItems[0];
  const activeSpeedItem = activeSpeedItems.find((item) => item.id === selectedEffectItemId) ?? activeSpeedItems[0];
  const previewMediaRect = useMemo(
    () => containMediaRect(previewFrameSize, previewMediaSize),
    [previewFrameSize, previewMediaSize]
  );
  const previewMediaRectPercent = useMemo(
    () => rectPixelsToPercent(previewMediaRect, previewFrameSize),
    [previewFrameSize, previewMediaRect]
  );
  const activeZoomRegion = activeZoomItem ? activeRegionForEffect(activeZoomItem, playheadSeconds) : undefined;
  const activeZoomScale = activeZoomItem && activeZoomRegion ? zoomScaleForEffect(activeZoomItem, activeZoomRegion) : undefined;
  // Match the export crop: the focus can reach any edge, while the crop stays in-frame.
  const zoomCropOrigin = (center: number, scale: number) => {
    const size = Math.max(1, Math.min(99, 100 / scale));
    return 100 * clampRangeValue((center - size / 2) / Math.max(1, 100 - size), 0, 1);
  };
  const hasRegionSelection = Boolean(selectedBlurItem || selectedZoomItem);
  const adjustingRegion = hasRegionSelection && !isPlaying && !previewResult;
  const isZoomPreviewActive = Boolean(activeZoomItem) && !adjustingRegion;
  const previewVideoStyle = (() => {
    if (isZoomPreviewActive && activeZoomItem) {
      return {
        objectFit: 'contain' as const,
        transform: `scale(${activeZoomScale ?? activeZoomItem.scale})`,
        transformOrigin: `${zoomCropOrigin(activeZoomRegion?.x ?? 50, activeZoomScale ?? activeZoomItem.scale)}% ${zoomCropOrigin(activeZoomRegion?.y ?? 50, activeZoomScale ?? activeZoomItem.scale)}%`,
        transitionDuration: `${Math.max(activeZoomItem.easeIn ?? 0.75, activeZoomItem.easeOut ?? 0.75, 0.45)}s`,
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)'
      };
    }
    return { objectFit: 'contain' as const, transform: 'none', transitionDuration: '0s' };
  })();

  // Compute the canvas preview geometry when reframe is active.
  // We return explicit width/height/left/top for the video inside a canvas frame.
  const previewCanvasLayout = (() => {
    if (adjustingRegion || !activeReframeItem || activeReframeItem.targetWidth <= 0 || activeReframeItem.targetHeight <= 0) {
      return null;
    }
    const sourceW = previewMediaSize.width > 0 ? previewMediaSize.width : 1920;
    const sourceH = previewMediaSize.height > 0 ? previewMediaSize.height : 1080;
    const targetW = activeReframeItem.targetWidth;
    const targetH = activeReframeItem.targetHeight;
    const computed = computeReframeScale(
      sourceW,
      sourceH,
      targetW,
      targetH,
      activeReframeItem.fitMode,
      activeReframeItem.positionX,
      activeReframeItem.positionY
    );
    return computed;
  })();

  const previewCanvasFrameStyle = (() => {
    if (!previewCanvasLayout) {
      return undefined;
    }
    // Compute the canvas frame's CSS size to fit within the preview viewport
    // while maintaining the target aspect ratio (no CSS width/height conflict).
    const targetW = previewCanvasLayout.width;
    const targetH = previewCanvasLayout.height;
    const targetAspect = targetW / targetH;
    const availableW = Math.max(0, previewFrameSize.width);
    const availableH = Math.max(0, previewFrameSize.height);
    if (availableW <= 0 || availableH <= 0) {
      return { aspectRatio: `${targetW} / ${targetH}` } as CSSProperties;
    }
    const viewportAspect = availableW / availableH;
    let cssWidth: number;
    let cssHeight: number;
    if (viewportAspect > targetAspect) {
      // Viewport is wider than target: constrain by height
      cssHeight = availableH;
      cssWidth = cssHeight * targetAspect;
    } else {
      // Viewport is narrower or equal: constrain by width
      cssWidth = availableW;
      cssHeight = cssWidth / targetAspect;
    }
    return {
      width: `${cssWidth}px`,
      height: `${cssHeight}px`,
      transition: 'width 360ms cubic-bezier(0.16, 1, 0.3, 1), height 360ms cubic-bezier(0.16, 1, 0.3, 1)'
    } as CSSProperties;
  })();

  const previewCanvasVideoStyle = (() => {
    if (!previewCanvasLayout) {
      return undefined;
    }
    const w = previewCanvasLayout.width;
    const h = previewCanvasLayout.height;
    // Convert target pixels to percentages of the canvas frame
    // so the layout works regardless of the canvas frame's actual CSS size.
    const widthPct = (previewCanvasLayout.renderedWidth / w) * 100;
    const heightPct = (previewCanvasLayout.renderedHeight / h) * 100;
    const leftPct = (previewCanvasLayout.offsetX / w) * 100;
    const topPct = (previewCanvasLayout.offsetY / h) * 100;
    return {
      width: `${widthPct}%`,
      height: `${heightPct}%`,
      left: `${leftPct}%`,
      top: `${topPct}%`,
      position: 'absolute' as const,
      objectFit: 'fill' as const
    } as CSSProperties;
  })();

  const previewCanvasBackgroundStyle = (() => {
    if (!previewCanvasLayout || !activeReframeItem) {
      return undefined;
    }
    const bg = activeReframeItem.background as ReframeBackground;
    if (bg.kind === 'blur') {
      return {
        background: '#05070a'
      } as CSSProperties;
    }
    const color = bg.kind === 'color' ? bg.value : bg.kind === 'white' ? '#ffffff' : '#000000';
    return {
      background: color
    } as CSSProperties;
  })();

  const qualityMenuOptions = useMemo(
    () =>
      qualityOptions.map<MenuOption<DownloadQuality>>((quality) => ({
        value: quality,
        label: qualityLabel(quality, preferences.locale),
        description:
          quality === 'audio'
            ? (preferences.locale === 'ar' ? 'صوت فقط' : 'Audio only')
            : quality === 'best'
              ? t('noSaveDialog')
              : quality === '2160p'
                ? '4K'
                : quality === '1440p'
                  ? '2K'
                  : quality === '1080p'
                    ? 'Full HD'
                    : quality
      })),
    [preferences.locale, t]
  );

  const downloadStartModeOptions: readonly MenuOption<DownloadStartMode>[] = useMemo(
    () => [
      {
        value: 'auto',
        label: preferences.locale === 'ar' ? 'تنزيل فوري' : 'Start downloads now',
        description: preferences.locale === 'ar' ? 'أي رابط جديد يبدأ تنزيله مباشرة' : 'New URL items start downloading immediately'
      },
      {
        value: 'manual',
        label: preferences.locale === 'ar' ? 'إضافة إلى قائمة الانتظار' : 'Add to queue only',
        description: preferences.locale === 'ar' ? 'تختار بنفسك متى يبدأ كل تنزيل' : 'You choose when each queued item starts'
      }
    ],
    [preferences.locale]
  );

  const subtitleDownloadModeOptions: readonly MenuOption<SubtitleDownloadMode>[] = useMemo(
    () => [
      {
        value: 'auto',
        label: preferences.locale === 'ar' ? 'تنزيل الترجمة إن وجدت' : 'Download subtitles when available',
        description: preferences.locale === 'ar' ? 'يحاول تنزيل ملف الترجمة مع الفيديو' : 'Try to download subtitle files with videos'
      },
      {
        value: 'off',
        label: preferences.locale === 'ar' ? 'بدون ترجمة' : 'Do not download subtitles',
        description: preferences.locale === 'ar' ? 'ينزل الفيديو فقط ويتخطى طلبات الترجمة' : 'Download the media only and skip subtitle requests'
      }
    ],
    [preferences.locale]
  );

  const subtitleLanguageOptions: readonly MenuOption<SubtitleLanguageProfile>[] = useMemo(
    () => [
      {
        value: 'available',
        label: preferences.locale === 'ar' ? 'المتاح تلقائيا' : 'Best available',
        description: preferences.locale === 'ar' ? 'الأصلية ثم العربية أو الإنجليزية حسب توفرها' : 'Original, then Arabic or English when available'
      },
      { value: 'arabic', label: preferences.locale === 'ar' ? 'العربية' : 'Arabic' },
      { value: 'english', label: preferences.locale === 'ar' ? 'الإنجليزية' : 'English' },
      { value: 'arabic-english', label: preferences.locale === 'ar' ? 'العربية + الإنجليزية' : 'Arabic + English' }
    ],
    [preferences.locale]
  );

  const fullAiTranslationProviderOptions: readonly MenuOption<AiTranslationProvider>[] = useMemo(
    () => [
      {
        value: 'off',
        label: preferences.locale === 'ar' ? 'متوقف' : 'Disabled',
        description: preferences.locale === 'ar' ? 'تحرير الترجمة اليدوي يبقى متاحا' : 'Manual subtitle editing stays available'
      },
      { value: 'openrouter', label: 'OpenRouter', description: preferences.locale === 'ar' ? 'يدعم موديلات كثيرة من مزودين مختلفين' : 'Many models from different providers' },
      { value: 'openai', label: 'OpenAI', description: 'GPT models' },
      { value: 'anthropic', label: 'Anthropic', description: 'Claude models' },
      { value: 'gemini', label: 'Google Gemini', description: 'Gemini models' },
      { value: 'local', label: preferences.locale === 'ar' ? 'موديل محلي' : 'Local model', description: preferences.locale === 'ar' ? 'مثل Ollama أو خادم محلي متوافق' : 'Ollama or a compatible local server' },
      { value: 'custom', label: preferences.locale === 'ar' ? 'مزود مخصص' : 'Custom provider', description: preferences.locale === 'ar' ? 'رابط وموديل مخصص' : 'Custom endpoint and model' }
    ],
    [preferences.locale]
  );

  const themeMenuOptions: readonly MenuOption<ThemeMode>[] = useMemo(
    () => [
      { value: 'light', label: t('light'), icon: Sun },
      { value: 'dark', label: t('dark'), icon: Moon }
    ],
    [t]
  );

  const localeMenuOptions: readonly MenuOption<AppLocale>[] = useMemo(
    () => [
      { value: 'en', label: t('english'), icon: Languages },
      { value: 'ar', label: t('arabic'), icon: Languages }
    ],
    [t]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(
        preferencesStorageKey,
        JSON.stringify({ ...preferences, aiTranslationApiKey: '' })
      );
    }, 220);

    return () => window.clearTimeout(timer);
  }, [preferences]);

  useEffect(() => {
    document.documentElement.lang = preferences.locale === 'ar' ? 'ar' : 'en';
    document.documentElement.dir = preferences.locale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dataset.locale = preferences.locale;
    document.documentElement.classList.toggle('dark', preferences.themeMode === 'dark');
    for (const [key,value] of Object.entries(appearanceVariables(preferences.appearance, preferences.themeMode === 'dark'))) document.documentElement.style.setProperty(key,value);
    document.documentElement.dataset.density = preferences.appearance.density;
    document.documentElement.dataset.corners = preferences.appearance.corners;

    let canceled=false;
    const syncTitlebarTheme = () => {
      void window.loaderly?.setTitlebarTheme?.(preferences.themeMode, preferences.locale, preferences.appearance).then(result=>{
        if(!canceled) document.documentElement.dataset.desktopGlass=String(!!result.desktopGlass);
      });
    };
    syncTitlebarTheme();
    const frame = window.requestAnimationFrame(syncTitlebarTheme);

    return () => {canceled=true;window.cancelAnimationFrame(frame);};
  }, [preferences.locale, preferences.themeMode, preferences.appearance]);

  useEffect(() => {
    const frame = previewFrameRef.current;

    if (!frame || typeof ResizeObserver === 'undefined') {
      return;
    }

    const updatePreviewSize = () => {
      const rect = frame.getBoundingClientRect();
      setPreviewFrameSize({ width: Math.max(1, rect.width), height: Math.max(1, rect.height) });
    };
    const observer = new ResizeObserver(updatePreviewSize);
    observer.observe(frame);
    updatePreviewSize();

    return () => observer.disconnect();
  }, [activeNav, isPreviewFocusMode, selectedMedia.id]);

  useEffect(() => {
    setPreviewMediaSize({ width: 16, height: 9 });
  }, [selectedMedia.id]);

  useEffect(() => {
    const persistentRows = mediaRows.map((row) =>
      row.filePath
        ? row
        : {
            ...row,
            status: row.status === 'failed' ? 'failed' as MediaStatus : 'queued' as MediaStatus,
            progress: 0,
            startedAtMs: undefined
          }
    );

    try {
      window.localStorage.setItem(mediaRowsStorageKey, JSON.stringify(persistentRows));
    } catch {
      setActivity(preferences.locale === 'ar' ? 'فشل الحفظ المحلي للمكتبة.' : 'Media library autosave failed.');
    }
  }, [mediaRows, preferences.locale]);

  useEffect(() => {
    const duration = selectedMedia.durationSeconds ?? 0;
    const savedSnapshot = readSavedEditorSnapshot(selectedMedia);
    setAudioSettings(defaultAudioSettings);
    setAudioSections([]);setSelectedAudioSectionId(undefined);
    setAudioInspectorOpen(selectedMedia.mediaKind === 'audio');

    if (duration > 0 && savedSnapshot) {
      setTimelineZoom(timelineMinZoom);
      setTimelineViewportStartSeconds(0);
      applyEditorSnapshot(savedSnapshot);
      setIsPlaying(false);
      if (activeNav === 'editor') {
        setActivity(preferences.locale === 'ar' ? 'استُعيدت جلسة المحرر.' : 'Restored editor session.');
      }
      return;
    }

    if (duration > 0) {
      const nextEnd = duration;
      setTrimStartSeconds(0);
      setTrimEndSeconds(nextEnd);
      setTimelineZoom(timelineMinZoom);
      setTimelineViewportStartSeconds(0);
      setBlurWindow({ startSeconds: 0, endSeconds: nextEnd });
      setZoomWindow({ startSeconds: 0, endSeconds: nextEnd });
      setSpeedWindow({ startSeconds: 0, endSeconds: nextEnd });
      setBlurItems([]);
      setReframeItems([]);
      setSubtitleFile(undefined);
      setZoomItems([]);
      setSpeedItems([]);
      setSelectedEffectItemId(undefined);
      commitPlayheadSeconds(0);
    }

    setCutOutRanges([]);
    setSelectedCutOutId(undefined);
    setTextOverlays([]);
    setSelectedTextOverlayId(undefined);
    setIsPlaying(false);
  }, [selectedMedia.id, selectedMedia.durationSeconds]);

  useEffect(() => {
    const nextViewport = timelineViewportFromZoom({
      duration: timelineDuration,
      zoom: timelineZoom,
      previousStartSeconds: timelineViewportStartSeconds
    });

    if (Math.abs(nextViewport.startSeconds - timelineViewportStartSeconds) > 0.001) {
      setTimelineViewportStartSeconds(nextViewport.startSeconds);
    }
  }, [timelineDuration, timelineViewportStartSeconds, timelineZoom]);

  useEffect(() => {
    if (activeNav !== 'editor') {
      return;
    }

    const normalizedLayerId = normalizeEditorLayerForMedia(selectedEditorMediaKind, selectedLayerId);

    if (normalizedLayerId !== selectedLayerId) {
      setSelectedLayerId(normalizedLayerId);
    }

    if (!isAudioEditor) {
      return;
    }

    if (selectedTextOverlayId !== undefined) {
      setSelectedTextOverlayId(undefined);
    }

    if (isVisualEditorLayer(selectedLayerId) && selectedEffectItemId !== undefined) {
      setSelectedEffectItemId(undefined);
    }

    if (subtitleFile) {
      setSubtitleFile(undefined);
      setSubtitlesVisible(false);
    }
  }, [
    activeNav,
    isAudioEditor,
    selectedEditorMediaKind,
    selectedEffectItemId,
    selectedLayerId,
    selectedTextOverlayId,
    subtitleFile
  ]);

  useEffect(() => {
    const key = editorSnapshotStorageKey(selectedMedia);

    if (!key || !hasRealMedia) {
      setAutosaveState('idle');
      return;
    }

    setAutosaveState('saving');
    const timer = window.setTimeout(() => {
      persistEditorSnapshotNow(selectedMedia);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [
    audioSettings,
    audioSections,
    visualizerSettings,
    visualizerVideo,
    blurMask,
    blurStrength,
    blurItems,
    blurWindow,
    cutOutRanges,
    effectiveTrimEnd,
    hasRealMedia,
    selectedCutOutId,
    selectedEffectItemId,
    selectedLayerId,
    selectedMedia.filePath,
    selectedTextOverlayId,
    speedRate,
    speedItems,
    speedWindow,
    subtitleFile,
    subtitlesVisible,
    textOverlays,
    trimEndSeconds,
    trimStartSeconds,
    zoomRegion,
    zoomScale,
    zoomItems,
    zoomWindow
  ]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = activeSpeedItem?.rate ?? 1;
      videoRef.current.preservesPitch = activeSpeedItem?.mode !== 'normal';
    }
  }, [activeSpeedItem]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !selectedMedia.fileUrl) {
      return;
    }

    const syncLoadedMediaToPlayhead = () => {
      const duration =
        Number.isFinite(video.duration) && video.duration > 0
          ? video.duration
          : selectedDurationSeconds;
      const nextTime = clampRangeValue(playheadSecondsRef.current, 0, Math.max(0, duration));

      if (Number.isFinite(nextTime) && Math.abs(video.currentTime - nextTime) > 0.12) {
        try {
          video.currentTime = nextTime;
        } catch {
          // The metadata handler retries once the browser accepts seeking for this file.
        }
      }
    };

    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      syncLoadedMediaToPlayhead();
      return;
    }

    video.addEventListener('loadedmetadata', syncLoadedMediaToPlayhead, { once: true });

    return () => video.removeEventListener('loadedmetadata', syncLoadedMediaToPlayhead);
  }, [selectedDurationSeconds, selectedMedia.fileUrl, selectedMedia.id]);

  useEffect(() => {
    if (activeNav !== 'editor' || !selectedMedia.filePath || selectedMedia.fileUrl || selectedMedia.mediaKind === 'audio') {
      return;
    }

    void prepareSelectedMediaPreview(selectedMedia);
  }, [activeNav, selectedMedia.filePath, selectedMedia.fileUrl, selectedMedia.id, selectedMedia.mediaKind]);

  useEffect(() => {
    const handleEditorShortcut = (event: KeyboardEvent) => {
      if (activeNav !== 'editor' || event.defaultPrevented || event.isComposing) return;
      if (document.querySelector('[role="menu"], .editor-context-menu, .app-color-picker, dialog[open]') || outputMenuOpen) return;
      if (event.key === 'Escape' && isPreviewFocusMode) {
        event.preventDefault();
        closePreviewFocusMode();
        return;
      }

      const target = event.target as HTMLElement | null;
      const action = resolveEditorShortcut({
        key: event.key,
        code: event.code,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        targetTagName: target?.closest('input, textarea, select, button, a, summary')?.tagName ?? target?.tagName,
        isContentEditable: target?.isContentEditable || Boolean(target?.closest('[contenteditable=true], [role=textbox]')),
        inMenu: Boolean(target?.closest('[role=menu], [role=listbox]')),
        isComposing: event.isComposing,
        repeat: event.repeat
      });

      if (!action) {
        return;
      }

      if (cleanAudioView && action.type !== 'toggle-playback' && action.type !== 'seek') {
        event.preventDefault();
        return;
      }

      event.preventDefault();
      handleEditorShortcutAction(action);
    };

    window.addEventListener('keydown', handleEditorShortcut);

    return () => window.removeEventListener('keydown', handleEditorShortcut);
  }, [
    activeNav,
    cleanAudioView,
    outputMenuOpen,
    loopPlayback,
    isAudioEditor,
    keptRanges,
    copiedTimelineItem,
    selectedEffectItemId,
    selectedEditorMediaKind,
    blurItems,
    zoomItems,
    speedItems,
    reframeItems,
    textOverlays,
    cutOutRanges,
    editorRedoStack,
    editorUndoStack,
    effectiveTrimEnd,
    isPreviewFocusMode,
    playheadSeconds,
    selectedCutOutId,
    selectedDurationSeconds,
    selectedLayerId,
    selectedTextOverlay,
    trimStartSeconds
  ]);

  useEffect(() => {
    if (!isPlaying) {
      playbackUiFrameMsRef.current = 0;
      return;
    }

    let frame = 0;
    const syncPlayhead = (frameTimeMs: number) => {
      const video = videoRef.current;

      if (video && !video.paused) {
        playheadSecondsRef.current = video.currentTime;

        if (frameTimeMs - playbackUiFrameMsRef.current >= 32) {
          playbackUiFrameMsRef.current = frameTimeMs;
          setPlayheadSeconds(video.currentTime);
        }

        frame = window.requestAnimationFrame(syncPlayhead);
      }
    };

    frame = window.requestAnimationFrame(syncPlayhead);

    return () => window.cancelAnimationFrame(frame);
  }, [isPlaying]);

  useEffect(() => {
    const handleTimelineScrubMove = (event: PointerEvent) => {
      if (!timelineScrubRef.current) {
        return;
      }

      if (timelineScrubPointerIdRef.current !== undefined && event.pointerId !== timelineScrubPointerIdRef.current) {
        return;
      }

      if (event.buttons !== 1) {
        timelineScrubRef.current = false;
        timelineScrubPointerIdRef.current = undefined;
        return;
      }

      event.preventDefault();
      updatePlayhead(timelineSecondsFromPointer(event.clientX));
    };

    const handleTimelineScrubEnd = (event: PointerEvent) => {
      if (timelineScrubPointerIdRef.current !== undefined && event.pointerId !== timelineScrubPointerIdRef.current) {
        return;
      }

      timelineScrubRef.current = false;
      timelineScrubPointerIdRef.current = undefined;
    };

    window.addEventListener('pointermove', handleTimelineScrubMove, { passive: false });
    window.addEventListener('pointerup', handleTimelineScrubEnd);
    window.addEventListener('pointercancel', handleTimelineScrubEnd);

    return () => {
      window.removeEventListener('pointermove', handleTimelineScrubMove);
      window.removeEventListener('pointerup', handleTimelineScrubEnd);
      window.removeEventListener('pointercancel', handleTimelineScrubEnd);
    };
  }, [selectedDurationSeconds, selectedMedia.fileUrl, timelineDuration]);

  useEffect(() => {
    if (activeNav !== 'editor' && isPreviewFocusMode) {
      if (previewFocusCloseTimerRef.current !== undefined) {
        window.clearTimeout(previewFocusCloseTimerRef.current);
        previewFocusCloseTimerRef.current = undefined;
      }

      setIsPreviewFocusClosing(false);
      setIsPreviewFocusMode(false);
    }
  }, [activeNav, isPreviewFocusMode]);

  useEffect(() => {
    if (!isPreviewFocusMode) {
      return;
    }

    const stage = editorStageRef.current;

    if (!stage) {
      return;
    }

    previewFocusReturnRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    const focusFrame = window.requestAnimationFrame(() => stage.focus());
    const handleFocusModeKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || event.defaultPrevented) {
        return;
      }

      const controls = Array.from(
        stage.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
        )
      );

      if (controls.length === 0) {
        event.preventDefault();
        stage.focus();
        return;
      }

      const first = controls[0];
      const last = controls[controls.length - 1];

      if (!stage.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleFocusModeKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener('keydown', handleFocusModeKeyDown);
      const returnTarget = previewFocusReturnRef.current;
      previewFocusReturnRef.current = undefined;

      if (returnTarget?.isConnected) {
        returnTarget.focus();
      }
    };
  }, [isPreviewFocusMode]);

  useEffect(() => {
    return () => {
      if (previewFocusCloseTimerRef.current !== undefined) {
        window.clearTimeout(previewFocusCloseTimerRef.current);
      }

      if (playheadAutosaveTimerRef.current !== undefined) {
        window.clearTimeout(playheadAutosaveTimerRef.current);
      }
    };
  }, []);



  useEffect(() => {
    if (!outputMenuOpen) {
      return;
    }

    function closeOutputMenu(event: PointerEvent) {
      if (!outputMenuRef.current?.contains(event.target as Node)) {
        setOutputMenuOpen(false);
      }
    }

    window.addEventListener('pointerdown', closeOutputMenu);

    return () => window.removeEventListener('pointerdown', closeOutputMenu);
  }, [outputMenuOpen]);

  useEffect(() => {
    return window.loaderly?.onNavigate?.((route) => {
      setActiveNav(route);
      setActivity(t('openedSection', { section: t(navigationLabels[route]) }));
    });
  }, [t]);

  function updatePreferences(patch: Partial<AppPreferences>) {
    setPreferences((current) => normalizePreferences({ ...current, ...patch }));
  }

  async function chooseDownloadDirectory() {
    if (!window.loaderly?.pickDownloadDirectory) {
      setActivity(uiText(preferences.locale, 'Folder selection is not available in this window.', 'اختيار المجلد غير متاح في هذه النافذة.'));
      return;
    }

    const result = await window.loaderly.pickDownloadDirectory();

    if (result.canceled) {
      setActivity(t('fileDialogCanceled'));
      return;
    }

    updatePreferences({ downloadDirectory: result.path });
    setActivity(uiText(preferences.locale, 'Download folder updated.', 'حُدّث مجلد التنزيل.'));
  }

  function displayMediaTitle(row: MediaRow): string {
    return row.titleKey ? t(row.titleKey) : mediaDisplayTitle(row.title ?? t('newPastedMediaLink'));
  }

  function displayMediaSource(row: MediaRow): string {
    return row.sourceKey ? t(row.sourceKey) : (row.source ?? t('pastedUrl'));
  }

  function displayStatus(status: MediaStatus): string {
    switch (status) {
      case 'ready':
        return t('statusReady');
      case 'downloading':
        return t('statusDownloading');
      case 'queued':
        return t('statusQueued');
      case 'edited':
        return t('statusEdited');
      case 'failed':
        return preferences.locale === 'ar' ? 'فشل' : 'Failed';
    }
  }

  function displayMediaSize(row: MediaRow): string {
    if (row.status === 'queued' && !row.filePath) {
      return t('pending');
    }

    if (row.status === 'failed' && !row.filePath) {
      return displayStatus(row.status);
    }

    return row.size;
  }

  function mediaKindForRow(row: MediaRow): MediaKind {
    return row.mediaKind === 'audio' ? 'audio' : 'video';
  }

  function mediaKindLabel(row: MediaRow): string {
    return mediaKindForRow(row) === 'audio'
      ? uiText(preferences.locale, 'Audio', 'صوت')
      : uiText(preferences.locale, 'Video', 'فيديو');
  }

  function mediaFormatLabel(row: MediaRow): string {
    return mediaFileFormat(row.filePath, row.title) ?? 'N/A';
  }

  function downloadPhaseLabel(row: MediaRow): string {
    switch (row.downloadPhase) {
      case 'preparing':
        return uiText(preferences.locale, 'Preparing', 'تجهيز');
      case 'downloading':
        return uiText(preferences.locale, 'Downloading', 'تنزيل');
      case 'processing':
        return uiText(preferences.locale, 'Processing', 'معالجة');
      case 'completed':
        return uiText(preferences.locale, 'Completed', 'اكتمل');
      case 'failed':
        return uiText(preferences.locale, 'Failed', 'فشل');
      default:
        return displayStatus(row.status);
    }
  }

  async function copyMediaSource(row: MediaRow = selectedMedia) {
    const source = row.source ?? row.filePath;

    if (!source) {
      setActivity(preferences.locale === 'ar' ? 'لا يوجد رابط أو مسار مصدر لنسخه.' : 'No source URL or path is available to copy.');
      return;
    }

    if (!window.loaderly?.copyText) {
      setActivity(preferences.locale === 'ar' ? 'نسخ النص غير متاح في هذه النافذة.' : 'Text copy is not available in this window.');
      return;
    }

    const result = await window.loaderly.copyText(source);
    setActivity(
      result.ok
        ? (preferences.locale === 'ar' ? 'نُسخ المصدر.' : 'Source copied.')
        : (preferences.locale === 'ar' ? 'تعذر نسخ المصدر.' : 'Could not copy the source.')
    );
  }

  async function prepareSelectedMediaPreview(
    row: MediaRow = selectedMedia,
    options: { readonly forceTranscode?: boolean; readonly preserveTimeline?: boolean } = {}
  ) {
    if (!row.filePath || !window.loaderly?.prepareMediaPreview) {
      setActivity(t('previewFailed'));
      return;
    }

    const preparationKey = `${row.filePath}:${options.forceTranscode ? 'force' : 'normal'}`;

    if (previewPreparationRef.current.has(preparationKey)) {
      return;
    }

    previewPreparationRef.current.add(preparationKey);
    setActivity(preferences.locale === 'ar' ? 'جارٍ تجهيز معاينة متوافقة...' : 'Preparing a compatible preview...');

    try {
      const result = await window.loaderly.prepareMediaPreview(row.filePath, { forceTranscode: options.forceTranscode === true });

      if (result.canceled) {
        setActivity(t('previewFailed'));
        return;
      }

      setMediaRows((rows) =>
        rows.map((item) =>
          item.id === row.id
            ? {
                ...item,
                title: result.name || item.title,
                duration: formatDuration(result.durationSeconds),
                durationSeconds: result.durationSeconds,
                size: formatBytes(result.sizeBytes),
                filePath: result.path,
                fileUrl: result.fileUrl,
                thumbnailUrl: result.thumbnailUrl ?? item.thumbnailUrl
              }
            : item
        )
      );

      if (!options.preserveTimeline && result.durationSeconds !== undefined && Number.isFinite(result.durationSeconds) && result.durationSeconds > 0) {
        const preparedDuration = result.durationSeconds;
        setTrimStartSeconds(0);
        setTrimEndSeconds(preparedDuration);
        commitPlayheadSeconds(clampRangeValue(playheadSecondsRef.current, 0, preparedDuration));
      }

      if (result.subtitlePath) {
        void loadSubtitlePath(result.subtitlePath);
      }

      setActivity(result.path !== row.filePath ? (preferences.locale === 'ar' ? 'جُهّز نسخة معاينة متوافقة.' : 'Compatible preview prepared.') : t('previewReady'));
    } catch (error) {
      setActivity(
        preferences.locale === 'ar'
          ? 'تعذر تجهيز معاينة متوافقة لهذا الملف.'
          : `Could not prepare a compatible preview${error instanceof Error ? `: ${error.message}` : '.'}`
      );
    } finally {
      previewPreparationRef.current.delete(preparationKey);
    }
  }

  function displayMediaDuration(row: MediaRow): string {
    if (row.durationSeconds !== undefined && Number.isFinite(row.durationSeconds) && row.durationSeconds > 0) {
      return formatDuration(row.durationSeconds);
    }

    if (row.status === 'queued' || row.status === 'downloading') {
      return t('detecting');
    }

    if (row.status === 'failed') {
      return preferences.locale === 'ar' ? 'غير معروف' : 'Not detected';
    }

    return '00:00';
  }

  function isMediaReadyForEditor(row: MediaRow): boolean {
    return canOpenEditorForMedia(row);
  }

  function speedEditorHint(): string {
    return isAudioEditor
      ? uiText(preferences.locale, 'Change speed for part of this audio. MP3 export keeps the speed edit.', 'غيّر سرعة جزء من الصوت. تصدير MP3 يحفظ تعديل السرعة.')
      : uiText(preferences.locale, 'Change speed for part of the video. Export keeps the speed edit.', 'غيّر سرعة جزء من الفيديو. التصدير يحفظ تعديل السرعة.');
  }

  function audioVisualToolBlockedMessage(): string {
    return uiText(preferences.locale, 'This tool is only available for video files.', 'هذه الأداة خاصة بملفات الفيديو فقط.');
  }

  function activeRegionForEffect(item: Pick<BlurEffectItem | ZoomEffectItem, 'region' | 'keyframes' | 'trackingEnabled'>, seconds: number): BlurMask {
    return (item.trackingEnabled ? regionAtKeyframeTime(item.region, item.keyframes, seconds) : item.region) as BlurMask;
  }

  function zoomScaleForEffect(item: Pick<ZoomEffectItem, 'scale' | 'trackingEnabled'>, region: EditorOverlayRect): number {
    return item.trackingEnabled ? zoomScaleForRegion(region) : clampRangeValue(item.scale, 1, 8);
  }

  function pausePlaybackForPreciseRegionEdit() {
    const player = videoRef.current;

    if (player && !player.paused) {
      player.pause();
      setIsPlaying(false);
    }
  }

  function previewMediaClientRect(): PreviewRect | undefined {
    const frame = previewFrameRef.current;

    if (!frame) {
      return undefined;
    }

    return previewRectFromFrameRect(frame.getBoundingClientRect(), containMediaRect({ width: frame.clientWidth, height: frame.clientHeight }, previewMediaSize));
  }

  function regionHandleOffsets(region: EditorOverlayRect): CSSProperties {
    const left = (region.x - region.width / 2) / 100 * previewFrameSize.width;
    const top = (region.y - region.height / 2) / 100 * previewFrameSize.height;
    const right = (100 - region.x - region.width / 2) / 100 * previewFrameSize.width;
    const bottom = (100 - region.y - region.height / 2) / 100 * previewFrameSize.height;
    return { '--handle-left': `${Math.max(-14, 1-left)}px`, '--handle-top': `${Math.max(-14, 1-top)}px`,
      '--handle-right': `${Math.max(-14, 1-right)}px`, '--handle-bottom': `${Math.max(-14, 1-bottom)}px` } as CSSProperties;
  }

  function previewRegionStyle(region: EditorOverlayRect, extra?: CSSProperties): CSSProperties {
    const previewRegion = mediaRegionToPreviewRegion(visibleEffectRegion(region), previewMediaRectPercent);

    return {
      left: `${previewRegion.x}%`,
      top: `${previewRegion.y}%`,
      width: `${previewRegion.width}%`,
      height: `${previewRegion.height}%`,
      ...regionHandleOffsets(previewRegion),
      ...extra
    };
  }

  function previewPointStyle(x: number, y: number, extra?: CSSProperties): CSSProperties {
    const previewRegion = mediaRegionToPreviewRegion({ x, y, width: 0, height: 0 }, previewMediaRectPercent);

    return {
      left: `${previewRegion.x}%`,
      top: `${previewRegion.y}%`,
      ...extra
    };
  }

  function applyRegionDragToElement(element: HTMLElement, region: BlurMask) {
    const previewRegion = mediaRegionToPreviewRegion(visibleEffectRegion(region), previewMediaRectPercent);
    element.style.left = `${previewRegion.x}%`;
    element.style.top = `${previewRegion.y}%`;
    element.style.width = `${previewRegion.width}%`;
    element.style.height = `${previewRegion.height}%`;
    Object.entries(regionHandleOffsets(previewRegion)).forEach(([name, value]) => element.style.setProperty(name, String(value)));
  }

  function blurStrengthForItem(item: BlurEffectItem): number {
    return blurAmount(item.strength);
  }

  function keyframeCountLabel(item: Pick<BlurEffectItem | ZoomEffectItem, 'keyframes'>): string {
    const count = item.keyframes?.length ?? 0;
    return preferences.locale === 'ar' ? `${count} نقاط حركة` : `${count} keyframes`;
  }

  function shiftedRegionKeyframes(
    keyframes: readonly EffectRegionKeyframe[] | undefined,
    sourceWindow: EffectWindow,
    nextStartSeconds: number
  ): readonly EffectRegionKeyframe[] | undefined {
    if (!keyframes?.length) {
      return undefined;
    }

    return keyframes.map((keyframe) => ({
      ...keyframe,
      timeSeconds: nextStartSeconds + Math.max(0, keyframe.timeSeconds - sourceWindow.startSeconds)
    }));
  }

  function mediaProgressLabel(row: MediaRow): string {
    if (row.status === 'ready' || row.status === 'edited') {
      return '100%';
    }

    if (row.status === 'queued') {
      return downloadPhaseLabel({ ...row, downloadPhase: row.downloadPhase ?? 'preparing' });
    }

    if (row.status === 'failed') {
      return downloadPhaseLabel({ ...row, downloadPhase: 'failed' });
    }

    if (row.progressKnown === false) {
      return downloadPhaseLabel(row);
    }

    return `${Math.max(0, Math.min(100, Math.round(row.progress)))}%`;
  }

  function openSelectedMediaEditor(row: MediaRow = selectedMedia) {
    if (!isMediaReadyForEditor(row)) {
      setSelectedMediaId(row.id);
      setActiveNav(row.sourceType === 'local' ? 'library' : 'downloads');
      setActivity(
        preferences.locale === 'ar'
          ? 'هذا العنصر غير جاهز. انتظر اكتمال التنزيل ثم افتحه في المحرر.'
          : 'This item is not ready yet. Wait for the download to finish, then open it in the editor.'
      );
      return;
    }

    if (hasRealMedia) {
      persistEditorSnapshotNow();
    }

    setSelectedMediaId(row.id);
    setOpenedEditorMediaId(row.id);
    setSelectedLayerId(normalizeEditorLayerForMedia(row.mediaKind === 'audio' ? 'audio' : 'video', selectedLayerId));
    setActiveNav('editor');
    setActivity(t('openedSection', { section: t('editor') }));
  }

  async function showSelectedMediaInFolder(row: MediaRow = selectedMedia) {
    if (!row.filePath || !window.loaderly?.showItemInFolder) {
      setActivity(uiText(preferences.locale, 'The source file is not available on this device.', 'الملف الأصلي غير متاح على هذا الجهاز.'));
      return;
    }

    const result = await window.loaderly.showItemInFolder(row.filePath);
    setActivity(
      result.ok
        ? uiText(preferences.locale, 'Opened the media location.', 'فُتح موقع الملف.')
        : uiText(preferences.locale, 'The media location could not be opened.', 'تعذر فتح موقع الملف.')
    );
  }

  function requestRemoveMedia(rowId: number) {
    if(mediaRows.some(row=>row.id===rowId&&row.status!=='downloading'))setLibraryRemoval([rowId]);
  }

  function toggleLibrarySelection(id:number){setLibrarySelection(ids=>ids.includes(id)?ids.filter(value=>value!==id):[...ids,id]);}

  async function removeLibrarySelection(disk:boolean):Promise<string|undefined>{
    const selected=mediaRows.filter(row=>libraryRemoval?.includes(row.id));
    let removedIds=selected.map(row=>row.id);
    let removedPaths:string[]=[];
    if(disk){
      if(!window.loaderly?.trashMedia)throw Error();
      const result=await window.loaderly.trashMedia(selected.flatMap(row=>row.filePath?[row.filePath]:[]));
      removedPaths=result.removed;
      removedIds=selected.filter(row=>!row.filePath||result.removed.includes(row.filePath)).map(row=>row.id);
    }
    const allRemovedIds=mediaRows.filter(row=>removedIds.includes(row.id)||(disk&&row.filePath&&removedPaths.includes(row.filePath))).map(row=>row.id);
    setMediaRows(rows=>rows.filter(row=>!allRemovedIds.includes(row.id)));
    if(selectedMediaId!==undefined&&allRemovedIds.includes(selectedMediaId))setSelectedMediaId(undefined);
    setLibrarySelection(ids=>ids.filter(id=>!allRemovedIds.includes(id)));
    const failed=selected.filter(row=>!removedIds.includes(row.id));
    if(failed.length){setLibraryRemoval(failed.map(row=>row.id));return uiText(preferences.locale,`${failed.length} files could not be moved to Trash. They remain in your library.`,`${failed.length} ملفات تعذّر نقلها إلى السلة وبقيت في المكتبة.`);}
    setLibraryRemoval(undefined);setLibrarySelecting(false);
    setActivity(uiText(preferences.locale,`${selected.length} files removed${disk?' and moved to Trash':''}.`,`تمت إزالة ${selected.length} ملفات${disk?' ونقلها إلى السلة':''}.`));
  }



  function retryDownload(row: MediaRow) {
    if (!row.source) {
      setActivity(preferences.locale === 'ar' ? 'لا يوجد رابط مصدر لهذا العنصر.' : 'This item has no source URL to retry.');
      return;
    }

    void startUrlDownload(row.id, row.source, row.quality);
  }

  function updateQueuedMediaQuality(rowId: number, quality: DownloadQuality) {
    setMediaRows((rows) =>
      rows.map((row) => (row.id === rowId && (row.status === 'queued' || row.status === 'failed') ? { ...row, quality } : row))
    );
  }

  async function startDownloadBatch(rows: readonly MediaRow[], concurrency = 2) {
    let nextIndex = 0;
    const worker = async () => {
      while (nextIndex < rows.length) {
        const row = rows[nextIndex];
        nextIndex += 1;

        if (row?.source) {
          await startUrlDownload(row.id, row.source, row.quality);
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(concurrency, rows.length) }, () => worker()));
  }

  function startAllQueuedDownloads() {
    const queuedRows = mediaRows.filter((row) => row.sourceType !== 'local' && row.status === 'queued' && row.source);

    if (queuedRows.length === 0) {
      setActivity(preferences.locale === 'ar' ? 'لا توجد تنزيلات منتظرة.' : 'No queued downloads to start.');
      return;
    }

    void startDownloadBatch(queuedRows);
  }

  function friendlyToolUpdateResult(toolName: string, ok: boolean, message: string | undefined): string {
    return ok ? uiText(preferences.locale, `${toolName} is ready.`, `${toolName} جاهز.`)
      : uiText(preferences.locale, `Could not install ${toolName}. ${message ?? 'Please retry.'}`, `تعذر تثبيت ${toolName}. ${message ?? 'حاول مرة أخرى.'}`);
  }

  async function updateBundledTool(toolName: string) {
    if (updatingToolName) {
      return;
    }

    if (!window.loaderly?.updateTool) {
      const message = preferences.locale === 'ar' ? 'تحديث الأدوات غير متاح من هذه النافذة حالياً.' : 'Tool updates are not available from this window right now.';
      setToolUpdateMessage(message);
      setActivity(message);
      return;
    }

    setUpdatingToolName(toolName);
    setToolInstallProgress(undefined);
    setToolUpdateMessage(preferences.locale === 'ar' ? `جارٍ تحديث ${toolName}...` : `Updating ${toolName}...`);
    setActivity(preferences.locale === 'ar' ? `جارٍ تحديث ${toolName}...` : `Updating ${toolName}...`);

    try {
      const result = await window.loaderly.updateTool(toolName);
      const message = friendlyToolUpdateResult(toolName, result.ok, result.message);
      setToolUpdateMessage(message);
      setActivity(message);

      if (result.ok && result.status) setToolStatuses(previous => [...previous.filter(item => item.name !== toolName), result.status!]);
    } catch (error) {
      const message = friendlyToolUpdateResult(toolName, false, error instanceof Error ? error.message : undefined);
      setToolUpdateMessage(message);
      setActivity(message);
    } finally {
      setUpdatingToolName(undefined);
      setToolInstallProgress(undefined);
    }
  }

  function selectNavigation(key: NavigationKey) {
    if (key === 'workspace') key = 'library';
    if (activeNav === 'editor' && key !== 'editor' && hasRealMedia) {
      persistEditorSnapshotNow();
    }

    if (key === 'editor' && (openedEditorMediaId !== selectedMediaId || !isMediaReadyForEditor(selectedMedia))) {
      setActiveNav('downloads');
      setActivity(
        preferences.locale === 'ar'
          ? 'اختر ملفا جاهزا أولا. عناصر قائمة الانتظار لا تفتح في المحرر قبل اكتمال التنزيل.'
          : 'Choose a ready media file first. Pending downloads cannot open in the editor.'
      );
      return;
    }

    setActiveNav(key);
    setActivity(t('openedSection', { section: key === 'community' ? uiText(preferences.locale, 'Community library', 'مكتبة المجتمع') : t(navigationLabels[key]) }));
  }

  function selectMediaRow(rowId: number) {
    if (hasRealMedia) {
      persistEditorSnapshotNow();
    }

    setSelectedMediaId(rowId);
  }

  function leaveEditorToWorkspace() {
    if (hasRealMedia) {
      persistEditorSnapshotNow();
    }

    setIsPlaying(false);
    videoRef.current?.pause();
    selectNavigation('library');
  }

  async function handleWindowControl(action: WindowControlAction) {
    if (!window.loaderly?.windowControl) {
      setActivity(uiText(preferences.locale, 'Desktop controls are unavailable in browser preview.', 'أزرار النافذة متاحة داخل تطبيق سطح المكتب فقط.'));
      return;
    }

    try {
      const result = await window.loaderly.windowControl(action);
      if (!result.ok) {
        setActivity(uiText(preferences.locale, 'The window action could not be completed.', 'تعذر تنفيذ أمر النافذة.'));
      }
    } catch {
      setActivity(uiText(preferences.locale, 'The desktop bridge did not respond.', 'لم يستجب جسر تطبيق سطح المكتب.'));
    }
  }

  async function addDownload() {
    if(addingDownloads.current)return;
    addingDownloads.current=true;
    try { await prepareDownloads(); } finally { addingDownloads.current=false; }
  }

  async function prepareDownloads() {
    const sources = splitBatchSources(urlValue);

    if (sources.length === 0) {
      setActivity(editorText.emptyUrl);
      return;
    }

    const remoteSources: string[] = [];
    const playlistMetadata=new Map<string,PlaylistEntry>();
    const inspectedPlaylists=new Set<string>();

    for (const source of sources) {
      const localPath = normalizeLocalFileSource(source);
      const kind = fileKindForPath(localPath);

      if (kind === 'media' && window.loaderly?.openMediaFile) {
        await importDroppedMedia(localPath);
        continue;
      }

      if (kind === 'subtitle' && window.loaderly?.loadSubtitleFile) {
        await loadSubtitlePath(localPath);
        continue;
      }

      const normalized=normalizeRemoteSourceUrl(source);
      const playlistUrl=youtubePlaylistUrl(normalized);
      if(playlistUrl){
        if(inspectedPlaylists.has(playlistUrl))continue;
        inspectedPlaylists.add(playlistUrl);
        const selection=await new Promise<PlaylistEntry[]|null>(resolve=>setPlaylistRequest({url:playlistUrl,resolve}));
        if(selection===null)return;
        for(const entry of selection){if(!remoteSources.includes(entry.url))remoteSources.push(entry.url);playlistMetadata.set(entry.url,entry);}
      }else if(!remoteSources.includes(normalized))remoteSources.push(normalized);
    }

    if (remoteSources.length === 0) {
      setUrlValue('');
      return;
    }

    const createdRows = remoteSources.map<MediaRow>((source, index) => {
      const metadata=playlistMetadata.get(source);
      const title = metadata?.title??source.replace(/^https?:\/\//, '');

      return {
        id: allocateMediaId(),
        title,
        source,
        duration: '00:00',
        status: 'queued',
        progress: 0,
        progressKnown: false,
        downloadPhase: 'preparing',
        size: '0 MB',
        quality: preferences.quality,
        sourceType: 'download',
        mediaKind: mediaKindForPath(undefined, preferences.quality),
        createdAtMs: Date.now() + index
      };
    });

    setMediaRows((rows) => [...createdRows, ...rows]);
    setSelectedMediaId(createdRows[0]?.id);
    setActiveNav('downloads');
    setUrlValue('');
    setActivity(
      remoteSources.length === 1
        ? t('addedToQueue', { title: createdRows[0]?.title ?? remoteSources[0] })
        : editorText.batchAdded.replace('{count}', String(remoteSources.length))
    );

    if (preferences.subtitleDownloadMode === 'off' && createdRows.some((row) => row.mediaKind !== 'audio')) {
      const reminderCount = Number(window.localStorage.getItem(subtitleReminderStorageKey) ?? '0');

      if (Number.isFinite(reminderCount) && reminderCount < 2) {
        window.localStorage.setItem(subtitleReminderStorageKey, String(reminderCount + 1));
        setActivity(
          uiText(
            preferences.locale,
            'Subtitles are off. Enable them in Preferences before downloading if you need captions.',
            'تنزيل الترجمة متوقف. فعّلها من الإعدادات قبل التنزيل إذا تحتاج ترجمة.'
          )
        );
      }
    }

    if (preferences.downloadStartMode === 'auto' && window.loaderly?.downloadUrl) {
      void startDownloadBatch(createdRows);
    }
  }

  async function startUrlDownload(rowId: number, sourceOverride?: string, qualityOverride?: DownloadQuality) {
    const queuedRow = mediaRows.find((row) => row.id === rowId);
    const source = normalizeRemoteSourceUrl(sourceOverride ?? queuedRow?.source ?? queuedRow?.title ?? '');

    if (queuedRow?.status === 'downloading' || downloadInFlightIdsRef.current.has(rowId)) {
      return;
    }

    if (!source) {
      setActivity(preferences.locale === 'ar' ? 'هذا العنصر لا يحتوي على رابط مصدر.' : 'This queued item has no source URL.');
      return;
    }

    if (!window.loaderly?.downloadUrl) {
      setMediaRows((rows) =>
        rows.map((row) =>
          row.id === rowId
            ? {
                ...row,
                status: 'failed',
                progress: 0,
                progressKnown: true,
                downloadPhase: 'failed',
                startedAtMs: undefined,
                errorMessage: preferences.locale === 'ar' ? 'التنزيل غير متاح من هذه النافذة حالياً.' : 'Downloads are not available from this window right now.'
              }
            : row
        )
      );
      setActivity(
        preferences.locale === 'ar'
          ? 'التنزيل غير متاح من هذه النافذة حالياً.'
          : 'Downloads are not available from this window right now.'
      );
      return;
    }

    downloadInFlightIdsRef.current.add(rowId);

    const startedAtMs = Date.now();
    setMediaRows((rows) =>
      rows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              status: 'downloading',
              progress: 0,
              progressKnown: false,
              downloadPhase: 'downloading',
              startedAtMs,
              completedAtMs: undefined,
              errorMessage: undefined
            }
          : row
      )
    );
    setActivity(t('downloadingStarted', { title: source }));

    try {
      const requestedQuality = qualityOverride ?? queuedRow?.quality ?? preferences.quality;
      const shouldWriteSubtitles = preferences.subtitleDownloadMode === 'auto' && requestedQuality !== 'audio';
      const result = await window.loaderly.downloadUrl({
        knownFiles:mediaRowsRef.current.flatMap(row=>row.filePath?[row.filePath]:[]),
        locale:preferences.locale,
        url: source,
        quality: requestedQuality,
        downloadDirectory: preferences.downloadDirectory,
        groupDownloadsByPlatform: preferences.groupDownloadsByPlatform,
        writeSubtitles: shouldWriteSubtitles,
        subtitleLanguages: shouldWriteSubtitles ? subtitleLanguagesForProfile(preferences.subtitleLanguageProfile) : undefined
      });

      if(result?.skipped){
        setMediaRows(rows=>rows.filter(row=>row.id!==rowId));
        setActivity(uiText(preferences.locale,'Skipped duplicate. The existing file was kept.','تم تخطي التكرار والإبقاء على الملف الموجود.'));
        return;
      }
      if (!result?.ok || result.path === undefined || result.fileUrl === undefined) {
        const rawErrorMessage = result?.message ?? 'unknown error';
        const errorMessage = friendlyDownloadError(rawErrorMessage, preferences.locale);

        setMediaRows((rows) =>
          rows.map((row) =>
            row.id === rowId
              ? {
                  ...row,
                  status: 'failed',
                  progress: 0,
                  progressKnown: true,
                  downloadPhase: 'failed',
                  startedAtMs: undefined,
                  errorMessage: rawErrorMessage
                }
              : row
          )
        );
        setActivity(t('downloadFailed', { message: errorMessage }));
        return;
      }

      setMediaRows((rows) =>
        rows.filter(row=>row.id===rowId||!result.replacedPath||row.filePath!==result.replacedPath).map((row) =>
          row.id === rowId
            ? {
                ...row,
                title: result.name ?? row.title,
                source,
                duration: formatDuration(result.durationSeconds),
                durationSeconds: result.durationSeconds,
                status: 'ready',
                progress: 100,
                progressKnown: true,
                downloadPhase: 'completed',
                size: result.sizeBytes === undefined ? row.size : formatBytes(result.sizeBytes),
                quality: requestedQuality,
                sourceType: 'download',
                mediaKind: mediaKindForPath(result.path, requestedQuality),
                filePath: result.path,
                fileUrl: result.fileUrl,
                thumbnailUrl: result.thumbnailUrl,
                completedAtMs: Date.now(),
                errorMessage: undefined
              }
            : row
        )
      );
      setSelectedMediaId(rowId);
      setActiveNav('downloads');
      {
        const finishedMessage = t('downloadFinished', { title: result.name ?? source });
        const notice = friendlyDownloadNotice(result.message, preferences.locale);
        setActivity(notice ? `${finishedMessage} ${notice}` : finishedMessage);
      }

      if (result.subtitlePath) {
        void loadSubtitlePath(result.subtitlePath);
      }
    } catch (error) {
      const rawErrorMessage = error instanceof Error ? error.message : 'unknown error';
      const errorMessage = friendlyDownloadError(rawErrorMessage, preferences.locale);
      setMediaRows((rows) =>
        rows.map((row) =>
          row.id === rowId
            ? {
                ...row,
                status: 'failed',
                progress: 0,
                progressKnown: true,
                downloadPhase: 'failed',
                startedAtMs: undefined,
                errorMessage: rawErrorMessage
              }
            : row
        )
      );
      setActivity(t('downloadFailed', { message: errorMessage }));
    } finally {
      downloadInFlightIdsRef.current.delete(rowId);
    }
  }

  async function importLocalVideo() {
    if (window.loaderly?.pickMediaFile) {
      const result = await window.loaderly.pickMediaFile();

      if (result.canceled) {
        setActivity(t('fileDialogCanceled'));
        return;
      }

      const nextId = allocateMediaId();
      const nextRow: MediaRow = {
        id: nextId,
        title: result.name,
        source: result.path,
        duration: formatDuration(result.durationSeconds),
        durationSeconds: result.durationSeconds,
        status: 'ready',
        progress: 100,
        progressKnown: true,
        downloadPhase: 'completed',
        size: formatBytes(result.sizeBytes),
        sourceType: 'local',
        mediaKind: mediaKindForPath(result.path),
        filePath: result.path,
        fileUrl: result.fileUrl,
        thumbnailUrl: result.thumbnailUrl,
        createdAtMs: Date.now(),
        completedAtMs: Date.now()
      };

      setMediaRows((rows) => [nextRow, ...rows]);
      setSelectedMediaId(nextId);
      setActiveNav('library');
      setActivity(t('localFileImported', { name: result.name }));
      if (result.subtitlePath) {
        void loadSubtitlePath(result.subtitlePath);
      }
      return;
    }

    setActivity(t('desktopBridgeUnavailable'));
  }

  function outputRangeForKind(kind: QuickCopyOutputKind): EffectWindow {
    const isRangeCopy = kind === QuickCopyOutputKind.Video || kind === QuickCopyOutputKind.Gif || kind === QuickCopyOutputKind.Audio;

    return {
      startSeconds: isRangeCopy ? trimStartSeconds : playheadSeconds,
      endSeconds: isRangeCopy ? effectiveTrimEnd : playheadSeconds + 0.04
    };
  }

  function renderOutputKind(kind: QuickCopyOutputKind): RenderOutputKind {
    return kind;
  }

  function currentEditorProject(): EditorProject {
    const durationSeconds = Math.max(0.1, selectedDurationSeconds || effectiveTrimEnd || 8);
    const mediaId = selectedMedia.id > 0 ? String(selectedMedia.id) : 'empty';
    const mediaItem: TimelineItem = {
      id: `${mediaId}:media`,
      type: 'media',
      name: displayMediaTitle(selectedMedia),
      trackId: 'media',
      startTime: 0,
      endTime: durationSeconds,
      locked: true,
      hidden: false,
      sourcePath: selectedMedia.filePath ?? '',
      durationSeconds
    };
    const cutItems: readonly TimelineItem[] = cutOutRanges.map((range) => ({
      id: `cutout-${range.id}`,
      type: 'cut-out',
      name: `Cut out ${range.id}`,
      trackId: 'cut',
      startTime: range.startSeconds,
      endTime: range.endSeconds,
      locked: false,
      hidden: false
    }));
    const textItems: readonly TimelineItem[] = textOverlays.map((overlay) => ({
      id: `text-${overlay.id}`,
      type: 'text',
      name: overlay.text || editorText.textLayer,
      trackId: 'text',
      startTime: overlay.startSeconds,
      endTime: overlay.endSeconds,
      locked: Boolean(overlay.locked),
      hidden: Boolean(overlay.hidden),
      region: { x: overlay.x, y: overlay.y, width: 40, height: 12 },
      text: overlay.text,
      fontFamily: editorTextFontOptionFor(overlay.fontFamily).value,
      fontSize: overlay.fontSize,
      fontWeight: 700,
      color: overlay.color ?? '#ffffff',
      align: 'center',
      zIndex: overlay.zIndex
    }));
    const subtitleItems: readonly TimelineItem[] =
      subtitleFile && subtitlesVisible
        ? [
            {
              id: `subtitle-${subtitleFile.name}`,
              type: 'subtitle',
              name: subtitleFile.name,
              trackId: 'subtitles',
              startTime: trimStartSeconds,
              endTime: effectiveTrimEnd,
              locked: false,
              hidden: !subtitlesVisible,
              subtitlePath: subtitleFile.path,
              label: subtitleFile.name,
              cues: subtitleFile.cues
            }
          ]
        : [];

    const allTracks = [
      { id: 'media', label: 'Media', type: 'media', locked: true, hidden: false },
      { id: 'cut', label: 'Cuts', type: 'cut-out', locked: false, hidden: false },
      { id: 'blur', label: 'Blur', type: 'blur', locked: false, hidden: false },
      { id: 'zoom', label: 'Zoom', type: 'zoom', locked: false, hidden: false },
      { id: 'speed', label: 'Speed', type: 'speed', locked: false, hidden: false },
      { id: 'reframe', label: 'Canvas', type: 'reframe', locked: false, hidden: false },
      { id: 'text', label: 'Text', type: 'text', locked: false, hidden: false },
      { id: 'subtitles', label: 'Subtitles', type: 'subtitle', locked: false, hidden: false }
    ] as const;
    const trackIds = new Set<EditorProjectTrackId>(editorProjectTrackIdsForMedia(selectedEditorMediaKind));
    const items = isAudioEditor
      ? [mediaItem, ...cutItems, ...speedItems]
      : [mediaItem, ...cutItems, ...blurItems, ...zoomItems, ...speedItems, ...reframeItems, ...textItems, ...subtitleItems];

    return {
      id: `project:${mediaId}`,
      mediaId,
      mediaName: displayMediaTitle(selectedMedia),
      sourcePath: selectedMedia.filePath ?? '',
      durationSeconds,
      selection: selectedEffectItemId
        ? { itemId: selectedEffectItemId }
        : selectedTextOverlayId
          ? { itemId: `text-${selectedTextOverlayId}` }
          : {},
      tracks: allTracks.filter((track) => trackIds.has(track.id)),
      items
    };
  }

  function renderPlanForKind(kind: QuickCopyOutputKind, whole = false): EditorRenderPlan {
    const outputWindow = whole ? {startSeconds:0,endSeconds:selectedDurationSeconds} : outputRangeForKind(kind);

    return buildEditorRenderPlan(currentEditorProject(), {
      kind: renderOutputKind(kind),
      startSeconds: outputWindow.startSeconds,
      endSeconds: outputWindow.endSeconds,
      frameSeconds: playheadSeconds
    });
  }

  function resolvedEditorOutputActions() {
    const mediaKind = selectedMedia.mediaKind === 'audio' ? 'audio' : 'video';
    const rangePlan = renderPlanForKind(mediaKind === 'audio' ? QuickCopyOutputKind.Audio : QuickCopyOutputKind.Video);
    const framePlan = renderPlanForKind(QuickCopyOutputKind.Image);

    return resolveEditorOutputActions({
      hasMedia: hasRealMedia,
      hasSelection: effectiveTrimEnd > trimStartSeconds + 0.1,
      mediaKind,
      supportsClipboardFiles: Boolean(window.loaderly?.copyMediaOutput && window.loaderly?.supportsClipboardFiles),
      supportsClipboardImages: Boolean(window.loaderly?.copyMediaOutput || window.loaderly?.copyQuickItem),
      unsupportedRangeEffects: rangePlan.unsupportedEffects,
      unsupportedFrameEffects: framePlan.unsupportedEffects
    });
  }

  function aiConnection() { return {provider:preferences.aiTranslationProvider,apiKey:preferences.aiTranslationApiKey,model:preferences.aiTranslationModel,baseUrl:preferences.aiTranslationBaseUrl}; }
  useEffect(()=>{translationSequence.current++;setTranslationBusy(false);void window.loaderly?.cancelTranslation?.();},[selectedMediaId]);
  useEffect(()=>{setModelChoices([]);setAiMessage('');},[preferences.aiTranslationProvider]);
  async function refreshAiModels() {
    setModelsBusy(true);setAiMessage('');
    try {const result=await window.loaderly?.discoverModels(aiConnection());if(!result?.ok)throw new Error(result?.message);setModelChoices(result.models??[]);setAiMessage(uiText(preferences.locale,`${result.models?.length??0} models available.`, `النماذج المتاحة: ${result.models?.length??0}.`));}
    catch {setAiMessage(uiText(preferences.locale,'Could not load models. Check the endpoint and key, or enter a model ID.','تعذّر جلب النماذج. تحقق من الرابط والمفتاح، أو أدخل اسم النموذج.'));}finally{setModelsBusy(false)}
  }
  async function translateCurrentSubtitles() {
    if(!subtitleFile||translationBusy||!aiProviderReady(preferences))return;
    const sequence=++translationSequence.current,original=subtitleFile;setTranslationBusy(true);setAiMessage('');
    try {const result=await window.loaderly?.translateSubtitles({connection:aiConnection(),targetLanguage,cues:original.cues});if(sequence!==translationSequence.current)return;if(!result?.ok||!result.cues)throw new Error(result?.message);
      pushEditorHistory();setSubtitleFile(current=>current===original?{...original,cues:result.cues!,originalCues:original.originalCues??original.cues,edited:true}:current);setAiMessage(uiText(preferences.locale,'Subtitles translated. Review the wording before export.','تُرجمت النصوص. راجع الصياغة قبل التصدير.'));
    }catch(error){if(sequence===translationSequence.current)setAiMessage(uiText(preferences.locale,error instanceof Error?error.message:'Translation failed.','تعذّرت الترجمة. تحقق من إعدادات المزود وحدوده. بقيت النصوص الأصلية.'));}
    finally{if(sequence===translationSequence.current)setTranslationBusy(false)}
  }
  function translationControls() {return <div className="subtitle-translation"><label className="setting-field"><span>{uiText(preferences.locale,'Translate into','لغة الترجمة')}</span><input className="setting-input" value={targetLanguage} onChange={e=>setTargetLanguage(e.target.value)} maxLength={80} list="translation-languages"/><datalist id="translation-languages">{['Arabic','English','French','Spanish','German','Japanese','Turkish'].map(x=><option key={x} value={x}/>)}</datalist></label><p>{uiText(preferences.locale,'Translation sends subtitle text to your selected provider. Video and audio stay on this device.','تُرسل نصوص الترجمة إلى المزود المحدد. يبقى الفيديو والصوت على جهازك.')}</p><div className="inspector-actions"><button className="button primary" disabled={!aiProviderReady(preferences)||translationBusy||!targetLanguage.trim()} onClick={()=>void translateCurrentSubtitles()}>{uiText(preferences.locale,translationBusy?'Translating…':'Translate subtitles',translationBusy?'جارٍ الترجمة…':'ترجمة النصوص')}</button>{translationBusy?<button className="button secondary" onClick={()=>{translationSequence.current++;setTranslationBusy(false);void window.loaderly?.cancelTranslation();setAiMessage(uiText(preferences.locale,'Translation canceled.','أُلغيت الترجمة.'))}}>{uiText(preferences.locale,'Cancel','إلغاء')}</button>:null}</div>{!aiProviderReady(preferences)?<button className="text-link" onClick={()=>{setSettingsTab('translation');setActiveNav('settings')}}>{uiText(preferences.locale,'Configure provider','إعداد المزود')}</button>:null}<p role="status">{aiMessage}</p></div>}

  async function extractAudioForEditing(row: MediaRow) {
    if (!row.filePath || !window.loaderly?.extractAudio || extractingAudio) return;
    setExtractingAudio(true);setActivity(uiText(preferences.locale,'Extracting audio…','جارٍ استخراج الصوت…'));
    try { const result=await window.loaderly.extractAudio(row.filePath);if(result.canceled)return;
      const next:MediaRow={id:allocateMediaId(),title:result.name,source:result.path,sourceType:'local',mediaKind:'audio',status:'ready',progress:100,progressKnown:true,downloadPhase:'completed',duration:formatDuration(result.durationSeconds),durationSeconds:result.durationSeconds,size:formatBytes(result.sizeBytes),filePath:result.path,fileUrl:result.fileUrl,createdAtMs:Date.now(),completedAtMs:Date.now()};
      setMediaRows(rows=>[next,...rows]);openSelectedMediaEditor(next);setAudioInspectorOpen(true);
      setActivity(uiText(preferences.locale,'Audio extracted. Your video is unchanged.','استُخرج الصوت. بقي الفيديو الأصلي كما هو.'));
    } catch(error) {setActivity(uiText(preferences.locale,`Could not extract audio: ${error instanceof Error?error.message:'Unknown error'}`,'تعذّر استخراج الصوت. تحقق من وجود مسار صوتي وأداة FFmpeg.'));} finally {setExtractingAudio(false)}
  }

  function mediaOutputPayload(kind: QuickCopyOutputKind, label: string, whole = false) {
    const outputWindow = whole ? {startSeconds:0,endSeconds:selectedDurationSeconds} : outputRangeForKind(kind);
    const plan = renderPlanForKind(kind,whole);
    const exportBlurItems = plan.blurItems.flatMap((item) =>
      regionSegmentsForExport(item.region, item.trackingEnabled ? item.keyframes : undefined, item.startTime, item.endTime).map((segment) => ({
        strength: blurStrengthForItem(item),
        shape: item.shape ?? 'rectangle',
        style: item.style ?? 'normal',
        x: segment.region.x,
        y: segment.region.y,
        width: segment.region.width,
        height: segment.region.height,
        startSeconds: segment.startSeconds,
        endSeconds: segment.endSeconds
      }))
    );
    const exportZoomItems = plan.zoomItems.flatMap((item) =>
      regionSegmentsForExport(item.region, item.trackingEnabled ? item.keyframes : undefined, item.startTime, item.endTime).map((segment) => ({
        scale: item.trackingEnabled ? zoomScaleForRegion(segment.region) : item.scale,
        x: segment.region.x,
        y: segment.region.y,
        width: segment.region.width,
        height: segment.region.height,
        startSeconds: segment.startSeconds,
        endSeconds: segment.endSeconds,
        easeIn: item.easeIn,
        easeOut: item.easeOut
      }))
    );

    return {
      sourcePath: selectedMedia.filePath ?? '',
      audio: audioSettings,
      audioSections: audioSectionsForOutput(audioSections,{ranges:keptRangesFromCutOuts(outputWindow,plan.cutOutRanges.map(s=>({startSeconds:s.startTime,endSeconds:s.endTime}))),speeds:plan.speedItems}),
      kind,
      label,
      startSeconds: outputWindow.startSeconds,
      endSeconds: outputWindow.endSeconds,
      frameSeconds: playheadSeconds,
      cutOutRanges: plan.cutOutRanges.map((range) => ({
        startSeconds: range.startTime,
        endSeconds: range.endTime
      })),
      textOverlays: plan.textOverlays.map((overlay) => ({
        text: overlay.text,
        x: overlay.region.x,
        y: overlay.region.y,
        startSeconds: overlay.startTime,
        endSeconds: overlay.endTime,
        fontSize: overlay.fontSize,
        fontFamily: editorTextFontOptionFor(overlay.fontFamily).value,
        color: overlay.color
      })),
      subtitlePath: subtitlesVisible ? plan.subtitle?.subtitlePath : undefined,
      subtitleCues: subtitlesVisible ? plan.subtitle?.cues : undefined,
      effects: {
        speeds: plan.speedItems.map(item=>({rate:item.rate,mode:item.mode??'preserve-pitch',startSeconds:item.startTime,endSeconds:item.endTime})),
        blurs: exportBlurItems,
        zooms: exportZoomItems,
        blur: exportBlurItems[0]
            ? {
                strength: exportBlurItems[0].strength,
                shape: exportBlurItems[0].shape,
                style: exportBlurItems[0].style,
                x: exportBlurItems[0].x,
                y: exportBlurItems[0].y,
                width: exportBlurItems[0].width,
                height: exportBlurItems[0].height,
                startSeconds: exportBlurItems[0].startSeconds,
                endSeconds: exportBlurItems[0].endSeconds
              }
            : undefined,
        zoom: exportZoomItems[0]
            ? {
                scale: exportZoomItems[0].scale,
                x: exportZoomItems[0].x,
                y: exportZoomItems[0].y,
                width: exportZoomItems[0].width,
                height: exportZoomItems[0].height,
                startSeconds: exportZoomItems[0].startSeconds,
                endSeconds: exportZoomItems[0].endSeconds
              }
            : undefined,
        speed: plan.speedItems[0]
            ? {
                rate: plan.speedItems[0].rate,
                mode: plan.speedItems[0].mode ?? 'preserve-pitch',
                startSeconds: plan.speedItems[0].startTime,
                endSeconds: plan.speedItems[0].endTime
              }
            : undefined,
        reframe: plan.reframeItems[0]
            ? {
                targetWidth: plan.reframeItems[0].targetWidth,
                targetHeight: plan.reframeItems[0].targetHeight,
                fitMode: plan.reframeItems[0].fitMode,
                positionX: plan.reframeItems[0].positionX,
                positionY: plan.reframeItems[0].positionY,
                background: plan.reframeItems[0].background,
                startSeconds: plan.reframeItems[0].startTime,
                endSeconds: plan.reframeItems[0].endTime
              }
            : undefined
      }
    };
  }

  async function runMediaOutput(kind: QuickCopyOutputKind, destination: 'clipboard' | 'file', label: string) {
    const isRangeCopy = kind === QuickCopyOutputKind.Video || kind === QuickCopyOutputKind.Gif || kind === QuickCopyOutputKind.Audio;
    const mediaTitle = displayMediaTitle(selectedMedia);
    const plan = renderPlanForKind(kind);
    const outputAction = resolvedEditorOutputActions().find((item) => item.kind === editorActionKindForMediaOutput(kind, destination));
    const job = createQuickCopyJob({
      id: jobCounter,
      kind,
      startSeconds: isRangeCopy ? trimStartSeconds : playheadSeconds,
      endSeconds: isRangeCopy ? effectiveTrimEnd : playheadSeconds + 0.04
    });
    const renderingJob: QuickCopyJob = { ...job, destination, label, status: 'rendering' };
    let status: QuickCopyJob['status'] = 'failed';
    let finalActivity = uiText(preferences.locale, 'Output failed.', 'فشل الإخراج.');

    setCopyJobs((jobs) => [renderingJob, ...jobs.filter((item) => item.id !== renderingJob.id)].slice(0, 50));
    setJobCounter((value) => value + 1);

    try {
      if (!selectedMedia.filePath) {
        finalActivity = t('sourceFileRequired');
      } else if (plan.unsupportedEffects.length > 0) {
        finalActivity = outputAction
          ? localizedOutputActionText(outputAction, preferences.locale).description
          : uiText(preferences.locale, 'This output contains unsupported effects.', 'هذا الإخراج يحتوي تأثيرات غير مدعومة حاليًا.');
      } else if (destination === 'file') {
        if (!window.loaderly?.saveMediaOutput) {
          finalActivity = uiText(preferences.locale, 'Saving output is unavailable in this window.', 'حفظ الإخراج غير متاح في هذه النافذة.');
        } else {
          const result = await window.loaderly.saveMediaOutput(mediaOutputPayload(kind, label));
          status = result.ok ? 'saved' : 'failed';
          finalActivity = result.ok
            ? uiText(preferences.locale, `${label} saved.`, `حُفظ ${label}.`)
            : t('outputFailed', { message: result.message ?? 'unknown error' });
        }
      } else if (window.loaderly?.copyMediaOutput) {
        const result = await window.loaderly.copyMediaOutput(mediaOutputPayload(kind, label));
        status = result.ok ? 'copied' : 'failed';
        finalActivity = result.ok
          ? t('outputCopiedToClipboard', { label })
          : t('outputFailed', { message: result.message ?? 'unknown error' });
      } else if ((kind === QuickCopyOutputKind.Image || kind === QuickCopyOutputKind.Snapshot) && window.loaderly?.copyQuickItem) {
        const result = await window.loaderly.copyQuickItem({
          label,
          mediaTitle,
          rangeLabel: job.rangeLabel
        });
        status = result.ok ? 'copied' : 'failed';
        finalActivity = result.ok
          ? t('outputCopiedToClipboard', { label })
          : t('outputFailed', { message: uiText(preferences.locale, 'Clipboard copy failed', 'تعذر النسخ إلى الحافظة') });
      } else {
        finalActivity = uiText(preferences.locale, 'Clipboard output is unavailable in this window.', 'نسخ الإخراج للحافظة غير متاح في هذه النافذة.');
      }
    } catch (error) {
      status = 'failed';
      finalActivity = t('outputFailed', { message: error instanceof Error ? error.message : 'unknown error' });
    } finally {
      setCopyJobs((jobs) => jobs.map((item) => (item.id === renderingJob.id ? { ...item, status } : item)).slice(0, 50));
      setActivity(finalActivity);
    }
  }

  function editorActionKindForMediaOutput(kind: QuickCopyOutputKind, destination: 'clipboard' | 'file'): EditorOutputActionKind {
    if (kind === QuickCopyOutputKind.Audio) {
      return destination === 'file' ? 'save-audio' : 'copy-audio';
    }

    if (kind === QuickCopyOutputKind.Gif) {
      return destination === 'file' ? 'save-gif' : 'copy-gif';
    }

    if (kind === QuickCopyOutputKind.Image || kind === QuickCopyOutputKind.Snapshot) {
      return destination === 'file' ? 'save-frame' : 'copy-frame';
    }

    return destination === 'file' ? 'save-video' : 'copy-video';
  }

  function quickCopyKindForOutputAction(kind: EditorOutputActionKind): QuickCopyOutputKind {
    switch (kind) {
      case 'copy-gif':
      case 'save-gif':
        return QuickCopyOutputKind.Gif;
      case 'copy-frame':
      case 'save-frame':
        return QuickCopyOutputKind.Image;
      case 'copy-video':
      case 'save-video':
        return QuickCopyOutputKind.Video;
      case 'copy-audio':
      case 'save-audio':
        return QuickCopyOutputKind.Audio;
    }
  }

  async function runEditorOutput(kind: EditorOutputActionKind) {
    const action = resolvedEditorOutputActions().find((item) => item.kind === kind);

    if (!action || outputBusy || outputBusyRef.current) {
      return;
    }

    if (action.disabled) {
      setOutputMenuOpen(false);
      setActivity(action.disabledReason ?? 'This output action is not available.');
      return;
    }

    outputBusyRef.current = true;
    setOutputBusy(kind);
    setOutputMenuOpen(true);
    const actionText = localizedOutputActionText(action, preferences.locale);
    setActivity(`${actionText.label}...`);

    try {
      await runMediaOutput(quickCopyKindForOutputAction(kind), kind.startsWith('save-') ? 'file' : 'clipboard', actionText.label);
    } finally {
      outputBusyRef.current = false;
      setOutputBusy(undefined);
      setOutputMenuOpen(false);
    }
  }

  async function runToolCheck() {
    if (toolCheckBusyRef.current) {
      return;
    }

    setActiveNav('tools');
    setActivity(t('checkingTools'));
    setToolUpdateMessage(t('checkingTools'));

    if (!window.loaderly?.checkTools) {
      setToolStatuses([]);
      setToolUpdateMessage(t('toolCheckUnavailable'));
      setActivity(t('toolCheckUnavailable'));
      return;
    }

    toolCheckBusyRef.current = true;
    setToolCheckBusy(true);

    try {
      const statuses = await window.loaderly.checkTools();
      const missingTools = statuses.filter((status) => !status.available).map((status) => status.name);
      const installed = statuses.length - missingTools.length;
      const missing = missingTools.length > 0 ? t('missingTools', { tools: missingTools.join(', ') }) : t('noMissingTools');
      const updates = new Set(statuses.filter(status => status.updateAvailable).map(status => status.name === 'ffprobe' ? 'ffmpeg' : status.name)).size;
      const failed = statuses.some(status => status.checkError);
      const toolUpdateStatus = failed
        ? uiText(preferences.locale, 'Installed tools checked. Update checks are temporarily unavailable. Try again in a minute.', 'فُحصت الأدوات المثبتة. تعذر فحص بعض التحديثات مؤقتًا. أعد المحاولة بعد دقيقة.')
        : uiText(preferences.locale, `Check complete. ${updates} updates available.`, `اكتمل الفحص. ${updates} تحديثات متاحة.`);

      setToolStatuses(statuses);
      setToolUpdateMessage(toolUpdateStatus);
      setActivity(t('toolsChecked', { installed, total: statuses.length, missing }));
    } catch (error) {
      const message = t('toolCheckFailed', { message: error instanceof Error ? error.message : 'unknown error' });
      setToolUpdateMessage(message);
      setActivity(message);
    } finally {
      toolCheckBusyRef.current = false;
      setToolCheckBusy(false);
    }
  }

  async function loadSubtitlePath(path: string) {
    const result = await window.loaderly?.loadSubtitleFile?.(path);

    if (!result || result.canceled) {
      return;
    }

    setSubtitleFile({
      path: result.path,
      name: result.name,
      cues: result.cues,
      originalPath: result.path,
      originalName: result.name,
      originalCues: result.cues,
      edited: false
    });
    setSubtitlesVisible(true);
    setSelectedLayerId('subtitles');
    setActivity(editorText.subtitleLoaded.replace('{name}', result.name));
  }

  function editorSnapshotStorageKey(row: MediaRow): string | undefined {
    return editorSessionStorageKeys(row.filePath)[0];
  }

  function persistEditorSnapshotNow(row: MediaRow = selectedMedia, snapshot: EditorUiSnapshot = captureEditorSnapshot()): boolean {
    const key = editorSnapshotStorageKey(row);

    if (!key || !row.filePath) {
      return false;
    }

    try {
      window.localStorage.setItem(key, JSON.stringify(snapshot));
      setAutosaveState('saved');
      setLastSavedAt(Date.now());
      return true;
    } catch {
      setAutosaveState('failed');
      setActivity(uiText(preferences.locale, 'Autosave failed. Your current edit is still open, but it was not saved locally.', 'تعذّر الحفظ التلقائي. تعديلاتك الحالية ما زالت مفتوحة ولم تُحفظ على الجهاز.'));
      return false;
    }
  }

  function schedulePlayheadAutosave() {
    if (playheadAutosaveTimerRef.current !== undefined) {
      window.clearTimeout(playheadAutosaveTimerRef.current);
    }

    const scheduledMediaId = selectedMediaId;
    playheadAutosaveTimerRef.current = window.setTimeout(() => {
      playheadAutosaveTimerRef.current = undefined;
      // A seek during session restoration must not later overwrite restored effects
      // with the empty snapshot captured before React committed that restoration.
      if (latestEditorAutosaveRef.current.mediaId === scheduledMediaId) latestEditorAutosaveRef.current.save();
    }, 500);
  }

  function readSavedEditorSnapshot(row: MediaRow): EditorUiSnapshot | undefined {
    const keys = editorSessionStorageKeys(row.filePath);

    if (keys.length === 0) {
      return undefined;
    }

    try {
      const raw = keys.map((key) => window.localStorage.getItem(key)).find((value) => value !== null);

      if (!raw) {
        return undefined;
      }

      const value = JSON.parse(raw) as Partial<EditorUiSnapshot>;

      if (!value || !Array.isArray(value.textOverlays) || !Array.isArray(value.cutOutRanges)) {
        return undefined;
      }

      return {
        selectedLayerId: value.selectedLayerId ?? 'cuts',
        playheadSeconds: finiteOr(value.playheadSeconds, 0),
        trimStartSeconds: finiteOr(value.trimStartSeconds, 0),
        trimEndSeconds: finiteOr(value.trimEndSeconds, row.durationSeconds ?? 8),
        blurWindow: value.blurWindow ?? { startSeconds: 0, endSeconds: row.durationSeconds ?? 8 },
        blurStrength: finiteOr(value.blurStrength, 0),
        blurMask: value.blurMask ?? { x: 50, y: 42, width: 34, height: 22 },
        zoomWindow: value.zoomWindow ?? { startSeconds: 0, endSeconds: row.durationSeconds ?? 8 },
        zoomScale: finiteOr(value.zoomScale, 1),
        zoomRegion: value.zoomRegion ?? { x: 50, y: 50, width: 62, height: 62 },
        speedWindow: value.speedWindow ?? { startSeconds: 0, endSeconds: row.durationSeconds ?? 8 },
        speedRate: finiteOr(value.speedRate, 1),
        reframeWindow: value.reframeWindow ?? { startSeconds: 0, endSeconds: row.durationSeconds ?? 8 },
        reframeTargetWidth: finiteOr(value.reframeTargetWidth, 0),
        reframeTargetHeight: finiteOr(value.reframeTargetHeight, 0),
        reframeFitMode: isReframeFitMode(value.reframeFitMode) ? value.reframeFitMode : ('fit' as ReframeFitMode),
        reframePositionX: finiteOr(value.reframePositionX, 0.5),
        reframePositionY: finiteOr(value.reframePositionY, 0.5),
        reframeBackground: isReframeBackground(value.reframeBackground) ? value.reframeBackground : ({ kind: 'black' } as ReframeBackground),
        blurItems: Array.isArray(value.blurItems) ? value.blurItems : [],
        zoomItems: Array.isArray(value.zoomItems) ? value.zoomItems : [],
        speedItems: Array.isArray(value.speedItems) ? value.speedItems : [],
        reframeItems: Array.isArray(value.reframeItems) ? value.reframeItems : [],
        selectedEffectItemId: value.selectedEffectItemId,
        textOverlays: Array.isArray(value.textOverlays)
          ? value.textOverlays.map((overlay: TextOverlay, index: number) => ({
              ...overlay,
              zIndex: finiteOr(overlay.zIndex, index + 1),
              fontFamily: editorTextFontOptionFor(overlay.fontFamily).value,
              color: overlay.color ?? '#ffffff',
              hidden: Boolean(overlay.hidden),
              locked: Boolean(overlay.locked)
            }))
          : [],
        selectedTextOverlayId: value.selectedTextOverlayId,
        cutOutRanges: value.cutOutRanges,
        selectedCutOutId: value.selectedCutOutId,
        subtitleFile: value.subtitleFile,
        audioSettings: normalizeAudioSettings(value.audioSettings),
        audioSections: normalizeAudioSections(value.audioSections,row.durationSeconds),
        visualizerSettings: value.visualizerSettings ? normalizeVisualizer(value.visualizerSettings) : undefined,
        visualizerVideo: value.visualizerVideo,
        subtitlesVisible: value.subtitlesVisible ?? true
      };
    } catch {
      return undefined;
    }
  }

  function finiteOr(value: number | undefined, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  }

  function captureEditorSnapshot(): EditorUiSnapshot {
    return {
      selectedLayerId,
      playheadSeconds: playheadSecondsRef.current,
      trimStartSeconds,
      trimEndSeconds,
      blurWindow,
      blurStrength,
      blurMask,
      zoomWindow,
      zoomScale,
      zoomRegion,
      speedWindow,
      speedRate,
      reframeWindow,
      reframeTargetWidth,
      reframeTargetHeight,
      reframeFitMode,
      reframePositionX,
      reframePositionY,
      reframeBackground,
      blurItems,
      zoomItems,
      speedItems,
      reframeItems,
      selectedEffectItemId,
      textOverlays,
      selectedTextOverlayId,
      cutOutRanges,
      selectedCutOutId,
      subtitleFile,
      subtitlesVisible,
      audioSettings,
      audioSections,
      visualizerSettings,
      visualizerVideo
    };
  }

  function applyEditorSnapshot(snapshot: EditorUiSnapshot) {
    setAudioSettings(normalizeAudioSettings(snapshot.audioSettings));
    setAudioSections(normalizeAudioSections(snapshot.audioSections));
    if(snapshot.visualizerSettings)setVisualizerSettings(normalizeVisualizer(snapshot.visualizerSettings));
    if(snapshot.visualizerVideo)setVisualizerVideo(snapshot.visualizerVideo);
    const nextLayerId = normalizeEditorLayerForMedia(selectedEditorMediaKind, snapshot.selectedLayerId);

    setSelectedLayerId(nextLayerId);
    setTrimStartSeconds(snapshot.trimStartSeconds);
    setTrimEndSeconds(snapshot.trimEndSeconds);
    setBlurWindow(snapshot.blurWindow);
    setBlurStrength(snapshot.blurStrength);
    setBlurMask(snapshot.blurMask);
    setZoomWindow(snapshot.zoomWindow);
    setZoomScale(snapshot.zoomScale);
    setZoomRegion(snapshot.zoomRegion);
    setSpeedWindow(snapshot.speedWindow);
    setSpeedRate(snapshot.speedRate);
    setReframeWindow(snapshot.reframeWindow);
    setReframeTargetWidth(snapshot.reframeTargetWidth);
    setReframeTargetHeight(snapshot.reframeTargetHeight);
    setReframeFitMode(snapshot.reframeFitMode);
    setReframePositionX(snapshot.reframePositionX);
    setReframePositionY(snapshot.reframePositionY);
    setReframeBackground(snapshot.reframeBackground);
    setBlurItems(isAudioEditor ? [] : snapshot.blurItems);
    setZoomItems(isAudioEditor ? [] : snapshot.zoomItems);
    setSpeedItems(snapshot.speedItems);
    setReframeItems(isAudioEditor ? [] : snapshot.reframeItems);
    setSelectedEffectItemId(isAudioEditor && isVisualEditorLayer(snapshot.selectedLayerId) ? undefined : snapshot.selectedEffectItemId);
    setTextOverlays(isAudioEditor ? [] : snapshot.textOverlays);
    setSelectedTextOverlayId(isAudioEditor ? undefined : snapshot.selectedTextOverlayId);
    setCutOutRanges(snapshot.cutOutRanges);
    setSelectedCutOutId(snapshot.selectedCutOutId);
    setSubtitleFile(isAudioEditor ? undefined : snapshot.subtitleFile);
    setSubtitlesVisible(isAudioEditor ? false : snapshot.subtitlesVisible);
    updatePlayhead(snapshot.playheadSeconds);
  }

  function pushEditorHistory() {
    setEditorUndoStack((items) => [...items.slice(-79), captureEditorSnapshot()]);
    setEditorRedoStack([]);
  }

  function undoEditorAction() {
    const previous = editorUndoStack.at(-1);

    if (!previous) {
      setActivity(uiText(preferences.locale, 'Nothing to undo.', 'لا توجد خطوة للتراجع عنها.'));
      return;
    }

    setEditorUndoStack((items) => items.slice(0, -1));
    setEditorRedoStack((items) => [captureEditorSnapshot(), ...items.slice(0, 79)]);
    applyEditorSnapshot(previous);
    setActivity(uiText(preferences.locale, 'Undo.', 'تُراجع عن آخر خطوة.'));
  }

  function redoEditorAction() {
    const next = editorRedoStack[0];

    if (!next) {
      setActivity(uiText(preferences.locale, 'Nothing to redo.', 'لا توجد خطوة لإعادتها.'));
      return;
    }

    setEditorRedoStack((items) => items.slice(1));
    setEditorUndoStack((items) => [...items.slice(-79), captureEditorSnapshot()]);
    applyEditorSnapshot(next);
    setActivity(uiText(preferences.locale, 'Redo.', 'أُعيدت الخطوة.'));
  }

  function selectedTimelineItemForClipboard(): CopiedTimelineItem | undefined {
    if (selectedTextOverlay) {
      return { kind: 'text', item: selectedTextOverlay };
    }

    if (selectedCutOut) {
      return { kind: 'cutout', item: selectedCutOut };
    }

    if (selectedLayerIdForMedia === 'blur' && selectedBlurItem) {
      return {
        kind: 'effect',
        id: selectedBlurItem.id,
        layerId: 'blur',
        window: { startSeconds: selectedBlurItem.startTime, endSeconds: selectedBlurItem.endTime },
        blurStrength: selectedBlurItem.strength,
        blurMask: selectedBlurItem.region,
        blurShape: selectedBlurItem.shape,
        blurStyle: selectedBlurItem.style,
        blurKeyframes: selectedBlurItem.keyframes,
        blurTrackingEnabled: selectedBlurItem.trackingEnabled
      };
    }

    if (selectedLayerIdForMedia === 'zoom' && selectedZoomItem) {
      return {
        kind: 'effect',
        id: selectedZoomItem.id,
        layerId: 'zoom',
        window: { startSeconds: selectedZoomItem.startTime, endSeconds: selectedZoomItem.endTime },
        zoomScale: selectedZoomItem.scale,
        zoomRegion: selectedZoomItem.region,
        zoomKeyframes: selectedZoomItem.keyframes,
        zoomTrackingEnabled: selectedZoomItem.trackingEnabled
      };
    }

    if (selectedLayerIdForMedia === 'speed' && selectedSpeedItem) {
      return {
        kind: 'effect',
        id: selectedSpeedItem.id,
        layerId: 'speed',
        window: { startSeconds: selectedSpeedItem.startTime, endSeconds: selectedSpeedItem.endTime },
        speedRate: selectedSpeedItem.rate,
        speedMode: selectedSpeedItem.mode
      };
    }

    if (selectedLayerIdForMedia === 'reframe' && selectedReframeItem) {
      return {
        kind: 'effect',
        id: selectedReframeItem.id,
        layerId: 'reframe',
        window: { startSeconds: selectedReframeItem.startTime, endSeconds: selectedReframeItem.endTime }
      };
    }

    return undefined;
  }

  function copySelectedTimelineItem() {
    const selected = selectedTimelineItemForClipboard();

    if (!selected) {
      setActivity(uiText(preferences.locale, 'Select a timeline item first.', 'حدد عنصرًا من الخط الزمني أولًا.'));
      return;
    }

    setCopiedTimelineItem(selected);
    setActivity(uiText(preferences.locale, 'Timeline item copied.', 'نُسخ عنصر الخط الزمني.'));
  }

  function pasteCopiedTimelineItem() {
    if (!copiedTimelineItem) {
      setActivity(uiText(preferences.locale, 'No copied timeline item.', 'لا يوجد عنصر منسوخ من الخط الزمني.'));
      return;
    }

    if (isAudioEditor && (copiedTimelineItem.kind === 'text' || (copiedTimelineItem.kind === 'effect' && isVisualEditorLayer(copiedTimelineItem.layerId)))) {
      setActivity(audioVisualToolBlockedMessage());
      return;
    }

    pushEditorHistory();
    const span =
      copiedTimelineItem.kind === 'effect'
        ? copiedTimelineItem.window.endSeconds - copiedTimelineItem.window.startSeconds
        : copiedTimelineItem.item.endSeconds - copiedTimelineItem.item.startSeconds;
    const startSeconds = clampRangeValue(playheadSeconds, 0, Math.max(0, timelineDuration - span));
    const endSeconds = clampRangeValue(startSeconds + span, startSeconds + timelineItemMinimumSeconds, timelineDuration);

    if (copiedTimelineItem.kind === 'text') {
      const id = Date.now();
      const placement = shiftedTextOverlayPlacement(copiedTimelineItem.item, startSeconds, span);
      setTextOverlays((items) => [
        ...items,
        {
          ...copiedTimelineItem.item,
          id,
          x: placement.x,
          y: placement.y,
          startSeconds: placement.startSeconds,
          endSeconds: placement.endSeconds,
          zIndex: nextTextZIndex(),
          hidden: false,
          locked: false
        }
      ]);
      selectTextOverlay(id);
      return;
    }

    if (copiedTimelineItem.kind === 'cutout') {
      const id = Date.now();
      setCutOutRanges((items) => [...items, { ...copiedTimelineItem.item, id, startSeconds, endSeconds }]);
      setSelectedCutOutId(id);
      setSelectedTextOverlayId(undefined);
      setSelectedEffectItemId(undefined);
      setSelectedLayerId('cuts');
      return;
    }

    const id = `${copiedTimelineItem.layerId}-${Date.now()}`;
    setSelectedLayerId(copiedTimelineItem.layerId);
    setSelectedEffectItemId(id);
    setSelectedTextOverlayId(undefined);
    setSelectedCutOutId(undefined);

    if (copiedTimelineItem.layerId === 'blur') {
      const next: BlurEffectItem = {
        id,
        type: 'blur',
        name: 'Blur copy',
        trackId: 'blur',
        startTime: startSeconds,
        endTime: endSeconds,
        locked: false,
        hidden: false,
        region: copiedTimelineItem.blurMask ?? blurMask,
        strength: copiedTimelineItem.blurStrength ?? 14,
        shape: copiedTimelineItem.blurShape ?? 'rectangle',
        style: copiedTimelineItem.blurStyle ?? 'normal',
        keyframes: shiftedRegionKeyframes(copiedTimelineItem.blurKeyframes, copiedTimelineItem.window, startSeconds),
        trackingEnabled: copiedTimelineItem.blurTrackingEnabled
      };
      setBlurItems((items) => [...items, next]);
      setBlurWindow({ startSeconds, endSeconds });
      setBlurStrength(next.strength);
      setBlurMask(next.region);
    } else if (copiedTimelineItem.layerId === 'zoom') {
      const next: ZoomEffectItem = {
        id,
        type: 'zoom',
        name: 'Zoom copy',
        trackId: 'zoom',
        startTime: startSeconds,
        endTime: endSeconds,
        locked: false,
        hidden: false,
        region: copiedTimelineItem.zoomRegion ?? zoomRegion,
        scale: copiedTimelineItem.zoomScale ?? 1.25,
        easeIn: 0.75,
        easeOut: 0.75,
        easing: 'ease-in-out',
        keyframes: shiftedRegionKeyframes(copiedTimelineItem.zoomKeyframes, copiedTimelineItem.window, startSeconds),
        trackingEnabled: copiedTimelineItem.zoomTrackingEnabled
      };
      setZoomItems((items) => [...items, next]);
      setZoomWindow({ startSeconds, endSeconds });
      setZoomScale(next.scale);
      setZoomRegion(next.region);
    } else if (copiedTimelineItem.layerId === 'speed') {
      const next: SpeedEffectItem = {
        id,
        type: 'speed',
        name: 'Speed copy',
        trackId: 'speed',
        startTime: startSeconds,
        endTime: endSeconds,
        locked: false,
        hidden: false,
        rate: copiedTimelineItem.speedRate ?? 2,
        mode: copiedTimelineItem.speedMode ?? 'preserve-pitch'
      };
      setSpeedItems((items) => [...items, next]);
      setSpeedWindow({ startSeconds, endSeconds });
      setSpeedRate(next.rate);
    } else {
      const next: ReframeEffectItem = {
        id,
        type: 'reframe',
        name: 'Canvas copy',
        trackId: 'reframe',
        startTime: startSeconds,
        endTime: endSeconds,
        locked: false,
        hidden: false,
        targetWidth: reframeTargetWidth,
        targetHeight: reframeTargetHeight,
        fitMode: reframeFitMode,
        positionX: reframePositionX,
        positionY: reframePositionY,
        background: reframeBackground
      };
      setReframeItems((items) => [...items, next]);
      setReframeWindow({ startSeconds, endSeconds });
      setReframeTargetWidth(reframeTargetWidth);
      setReframeTargetHeight(reframeTargetHeight);
    }
  }

  function canPasteCopiedTimelineItem(): boolean {
    if (!copiedTimelineItem) {
      return false;
    }

    return !(
      isAudioEditor &&
      (copiedTimelineItem.kind === 'text' || (copiedTimelineItem.kind === 'effect' && isVisualEditorLayer(copiedTimelineItem.layerId)))
    );
  }

  function duplicateSelectedTimelineItem() {
    const selected = selectedTimelineItemForClipboard();

    if (!selected) {
      setActivity(uiText(preferences.locale, 'Select a timeline item first.', 'حدد عنصرًا من الخط الزمني أولًا.'));
      return;
    }

    if (isAudioEditor && (selected.kind === 'text' || (selected.kind === 'effect' && isVisualEditorLayer(selected.layerId)))) {
      setActivity(audioVisualToolBlockedMessage());
      return;
    }

    pushEditorHistory();

    if (selected.kind === 'text') {
      const id = Date.now();
      const span = selected.item.endSeconds - selected.item.startSeconds;
      const startSeconds = clampRangeValue(selected.item.startSeconds + 0.5, 0, Math.max(0, timelineDuration - span));
      const placement = shiftedTextOverlayPlacement(selected.item, startSeconds, span);
      setTextOverlays((items) => [
        ...items,
        {
          ...selected.item,
          id,
          x: placement.x,
          y: placement.y,
          startSeconds: placement.startSeconds,
          endSeconds: placement.endSeconds,
          zIndex: nextTextZIndex(),
          hidden: false,
          locked: false
        }
      ]);
      selectTextOverlay(id);
      setActivity(uiText(preferences.locale, 'Text layer duplicated.', 'أُنشئت نسخة من طبقة النص.'));
      return;
    }

    if (selected.kind === 'cutout') {
      const id = Date.now();
      const span = selected.item.endSeconds - selected.item.startSeconds;
      const startSeconds = clampRangeValue(selected.item.startSeconds + 0.5, trimStartSeconds, Math.max(trimStartSeconds, effectiveTrimEnd - span));
      setCutOutRanges((items) => [...items, { ...selected.item, id, startSeconds, endSeconds: startSeconds + span }]);
      setSelectedCutOutId(id);
      setSelectedTextOverlayId(undefined);
      setSelectedEffectItemId(undefined);
      setSelectedLayerId('cuts');
      setActivity(uiText(preferences.locale, 'Cut range duplicated.', 'أُنشئت نسخة من نطاق القص.'));
      return;
    }

    const id = `${selected.layerId}-${Date.now()}`;
    const span = selected.window.endSeconds - selected.window.startSeconds;
    const startTime = clampRangeValue(selected.window.startSeconds + 0.5, 0, Math.max(0, timelineDuration - span));
    const endTime = startTime + span;
    setSelectedEffectItemId(id);
    setSelectedTextOverlayId(undefined);
    setSelectedCutOutId(undefined);
    setSelectedLayerId(selected.layerId);

    if (selected.layerId === 'blur') {
      const next: BlurEffectItem = {
        id,
        type: 'blur',
        name: 'Blur copy',
        trackId: 'blur',
        startTime,
        endTime,
        locked: false,
        hidden: false,
        region: selected.blurMask ?? blurMask,
        strength: selected.blurStrength ?? 14,
        shape: selected.blurShape ?? 'rectangle',
        style: selected.blurStyle ?? 'normal',
        keyframes: shiftedRegionKeyframes(selected.blurKeyframes, selected.window, startTime),
        trackingEnabled: selected.blurTrackingEnabled
      };
      setBlurItems((items) => [...items, next]);
      setBlurWindow({ startSeconds: startTime, endSeconds: endTime });
      setBlurStrength(next.strength);
      setBlurMask(next.region);
    } else if (selected.layerId === 'zoom') {
      const next: ZoomEffectItem = {
        id,
        type: 'zoom',
        name: 'Zoom copy',
        trackId: 'zoom',
        startTime,
        endTime,
        locked: false,
        hidden: false,
        region: selected.zoomRegion ?? zoomRegion,
        scale: selected.zoomScale ?? 1.25,
        easeIn: 0.75,
        easeOut: 0.75,
        easing: 'ease-in-out',
        keyframes: shiftedRegionKeyframes(selected.zoomKeyframes, selected.window, startTime),
        trackingEnabled: selected.zoomTrackingEnabled
      };
      setZoomItems((items) => [...items, next]);
      setZoomWindow({ startSeconds: startTime, endSeconds: endTime });
      setZoomScale(next.scale);
      setZoomRegion(next.region);
    } else if (selected.layerId === 'speed') {
      const next: SpeedEffectItem = {
        id,
        type: 'speed',
        name: 'Speed copy',
        trackId: 'speed',
        startTime,
        endTime,
        locked: false,
        hidden: false,
        rate: selected.speedRate ?? 2,
        mode: selected.speedMode ?? 'preserve-pitch'
      };
      setSpeedItems((items) => [...items, next]);
      setSpeedWindow({ startSeconds: startTime, endSeconds: endTime });
      setSpeedRate(next.rate);
    } else {
      const next: ReframeEffectItem = {
        id,
        type: 'reframe',
        name: 'Canvas copy',
        trackId: 'reframe',
        startTime,
        endTime,
        locked: false,
        hidden: false,
        targetWidth: reframeTargetWidth,
        targetHeight: reframeTargetHeight,
        fitMode: reframeFitMode,
        positionX: reframePositionX,
        positionY: reframePositionY,
        background: reframeBackground
      };
      setReframeItems((items) => [...items, next]);
      setReframeWindow({ startSeconds: startTime, endSeconds: endTime });
      setReframeTargetWidth(reframeTargetWidth);
      setReframeTargetHeight(reframeTargetHeight);
      setReframeFitMode(reframeFitMode);
    }

    setActivity(uiText(preferences.locale, 'Effect duplicated.', 'أُنشئت نسخة من التأثير.'));
  }

  function deleteSelectedTimelineItem() {
    if (selectedCutOutId !== undefined) {
      removeSelectedCutOut();
      return;
    }

    if (selectedTextOverlay) {
      removeSelectedTextOverlay();
      return;
    }

    pushEditorHistory();

    if (selectedLayerIdForMedia === 'blur' && selectedBlurItem && !selectedBlurItem.locked) {
      setBlurItems((items) => items.filter((item) => item.id !== selectedBlurItem.id));
      setSelectedEffectItemId(undefined);
      setBlurStrength(0);
    } else if (selectedLayerIdForMedia === 'zoom' && selectedZoomItem && !selectedZoomItem.locked) {
      setZoomItems((items) => items.filter((item) => item.id !== selectedZoomItem.id));
      setSelectedEffectItemId(undefined);
      setZoomScale(1);
    } else if (selectedLayerIdForMedia === 'speed' && selectedSpeedItem && !selectedSpeedItem.locked) {
      setSpeedItems((items) => items.filter((item) => item.id !== selectedSpeedItem.id));
      setSelectedEffectItemId(undefined);
      setSpeedRate(1);
    } else if (selectedLayerIdForMedia === 'reframe' && selectedReframeItem && !selectedReframeItem.locked) {
      setReframeItems((items) => items.filter((item) => item.id !== selectedReframeItem.id));
      setSelectedEffectItemId(undefined);
      setReframeTargetWidth(0);
      setReframeTargetHeight(0);
      setReframeFitMode('fit');
      setReframePositionX(0.5);
      setReframePositionY(0.5);
      setReframeBackground({ kind: 'black' });
    }
  }

  function resetSelectedTransform() {
    pushEditorHistory();

    if (selectedTextOverlay) {
      setTextOverlays((items) => items.map((item) => (item.id === selectedTextOverlay.id ? { ...item, x: 50, y: 72 } : item)));
      return;
    }

    if (selectedLayerIdForMedia === 'blur' && selectedBlurItem) {
      const nextRegion = { x: 50, y: 42, width: 34, height: 22 };
      setBlurMask(nextRegion);
      updateBlurItem(selectedBlurItem.id, { region: nextRegion });
    } else if (selectedLayerIdForMedia === 'zoom' && selectedZoomItem) {
      const nextRegion = { x: 50, y: 50, width: 62, height: 62 };
      setZoomRegion(nextRegion);
      updateZoomItem(selectedZoomItem.id, { region: nextRegion, scale: 1 });
      setZoomScale(1);
    }
  }

  function toggleSelectedLock() {
    pushEditorHistory();

    if (selectedTextOverlay) {
      setTextOverlays((items) => items.map((item) => (item.id === selectedTextOverlay.id ? { ...item, locked: !item.locked } : item)));
      return;
    }

    if (selectedLayerIdForMedia === 'blur' && selectedBlurItem) {
      updateBlurItem(selectedBlurItem.id, { locked: !selectedBlurItem.locked });
    } else if (selectedLayerIdForMedia === 'zoom' && selectedZoomItem) {
      updateZoomItem(selectedZoomItem.id, { locked: !selectedZoomItem.locked });
    } else if (selectedLayerIdForMedia === 'speed' && selectedSpeedItem) {
      updateSpeedItem(selectedSpeedItem.id, { locked: !selectedSpeedItem.locked });
    } else if (selectedLayerIdForMedia === 'reframe' && selectedReframeItem) {
      updateReframeItem(selectedReframeItem.id, { locked: !selectedReframeItem.locked });
    }
  }

  function toggleSelectedVisibility() {
    pushEditorHistory();

    if (selectedTextOverlay) {
      setTextOverlays((items) => items.map((item) => (item.id === selectedTextOverlay.id ? { ...item, hidden: !item.hidden } : item)));
      return;
    }

    if (selectedLayerIdForMedia === 'blur' && selectedBlurItem) {
      updateBlurItem(selectedBlurItem.id, { hidden: !selectedBlurItem.hidden });
    } else if (selectedLayerIdForMedia === 'zoom' && selectedZoomItem) {
      updateZoomItem(selectedZoomItem.id, { hidden: !selectedZoomItem.hidden });
    } else if (selectedLayerIdForMedia === 'speed' && selectedSpeedItem) {
      updateSpeedItem(selectedSpeedItem.id, { hidden: !selectedSpeedItem.hidden });
    } else if (selectedLayerIdForMedia === 'reframe' && selectedReframeItem) {
      updateReframeItem(selectedReframeItem.id, { hidden: !selectedReframeItem.hidden });
    }
  }

  function moveSelectedTextLayer(direction: 'forward' | 'backward') {
    if (!selectedTextOverlay || selectedTextOverlay.locked) {
      return;
    }

    pushEditorHistory();
    const delta = direction === 'forward' ? 1 : -1;
    setTextOverlays((items) => items.map((item) => (item.id === selectedTextOverlay.id ? { ...item, zIndex: Math.max(0, item.zIndex + delta) } : item)));
  }

  function openEditorContextMenu(event: ReactPointerEvent<HTMLElement> | ReactMouseEvent<HTMLElement>, target: EditorContextMenuState['target']) {
    event.preventDefault();
    event.stopPropagation();
    setEditorContextMenu({ x: event.clientX, y: event.clientY, target });
  }

  function runEditorContextAction(action: EditorContextMenuAction) {
    setEditorContextMenu(undefined);

    switch (action) {
      case 'copy':
        copySelectedTimelineItem();
        break;
      case 'paste':
        pasteCopiedTimelineItem();
        break;
      case 'duplicate':
        duplicateSelectedTimelineItem();
        break;
      case 'delete':
        deleteSelectedTimelineItem();
        break;
      case 'reset':
        resetSelectedTransform();
        break;
      case 'edit-text':
        if (isEditorLayerAvailableForMedia(selectedEditorMediaKind, 'text')) {
          setSelectedLayerId('text');
        } else {
          setActivity(audioVisualToolBlockedMessage());
        }
        break;
      case 'lock':
        toggleSelectedLock();
        break;
      case 'hide':
        toggleSelectedVisibility();
        break;
      case 'bring-forward':
        moveSelectedTextLayer('forward');
        break;
      case 'send-backward':
        moveSelectedTextLayer('backward');
        break;
    }
  }

  function handleEditorShortcutAction(action: EditorShortcutAction) {
    switch (action.type) {
      case 'toggle-playback':
        void togglePlayback();
        break;
      case 'seek':
        updatePlayhead(playheadSeconds + action.deltaSeconds);
        break;
      case 'undo':
        undoEditorAction();
        break;
      case 'redo':
        redoEditorAction();
        break;
      case 'delete-selected':
        deleteSelectedTimelineItem();
        break;
      case 'copy-selected':
        copySelectedTimelineItem();
        break;
      case 'paste-clipboard':
        pasteCopiedTimelineItem();
        break;
      case 'duplicate-selected':
        duplicateSelectedTimelineItem();
        break;
      case 'deselect':
        activateTimelineSelection();
        setSelectedLayerId('cuts');
        setSelectedTextOverlayId(undefined);
        setSelectedCutOutId(undefined);
        setSelectedEffectItemId(undefined);
        setEditorContextMenu(undefined);
        break;
      case 'set-start-at-playhead':
        pushEditorHistory();
        setTrimStartSeconds(clampRangeValue(playheadSeconds, 0, Math.max(0, effectiveTrimEnd - timelineItemMinimumSeconds)));
        break;
      case 'set-end-at-playhead':
        pushEditorHistory();
        setTrimEndSeconds(clampRangeValue(playheadSeconds, trimStartSeconds + timelineItemMinimumSeconds, Math.max(1, selectedDurationSeconds || 30)));
        break;
      case 'activate-tool':
        openEditorTool(action.tool === 'cut' ? 'cuts' : action.tool);
        break;
    }
  }

  function openPreviewFocusMode() {
    if (previewFocusCloseTimerRef.current !== undefined) {
      window.clearTimeout(previewFocusCloseTimerRef.current);
      previewFocusCloseTimerRef.current = undefined;
    }

    setIsPreviewFocusClosing(false);
    setIsPreviewFocusMode(true);
  }

  function closePreviewFocusMode() {
    setCleanAudioView(false);
    clearTimeout(cleanControlsTimer.current);
    if (!isPreviewFocusMode) {
      return;
    }

    if (previewFocusCloseTimerRef.current !== undefined) {
      window.clearTimeout(previewFocusCloseTimerRef.current);
    }

    setIsPreviewFocusClosing(true);
    previewFocusCloseTimerRef.current = window.setTimeout(() => {
      setIsPreviewFocusMode(false);
      setIsPreviewFocusClosing(false);
      previewFocusCloseTimerRef.current = undefined;
    }, 190);
  }

  function togglePreviewFocusMode() {
    if (isPreviewFocusMode && !isPreviewFocusClosing) {
      closePreviewFocusMode();
      return;
    }

    openPreviewFocusMode();
  }

  async function chooseSubtitleFile() {
    const result = await window.loaderly?.pickSubtitleFile?.();

    if (!result || result.canceled) {
      setActivity(t('fileDialogCanceled'));
      return;
    }

    pushEditorHistory();
    setSubtitleFile({
      path: result.path,
      name: result.name,
      cues: result.cues,
      originalPath: result.path,
      originalName: result.name,
      originalCues: result.cues,
      edited: false
    });
    setSubtitlesVisible(true);
    setSelectedLayerId('subtitles');
    setActivity(editorText.subtitleLoaded.replace('{name}', result.name));
  }

  function updateActiveSubtitleCue(patch: Partial<SubtitleCue>) {
    if (!subtitleFile || activeSubtitleCueIndex < 0) {
      return;
    }

    pushEditorHistory();
    const cues = updateSubtitleCue(subtitleFile.cues, activeSubtitleCueIndex, patch, timelineDuration);
    setSubtitleFile({ ...subtitleFile, cues, edited: true });
    setSubtitlesVisible(true);
    setSelectedLayerId('subtitles');
  }

  function addSubtitleCueAtPlayhead() {
    if (!subtitleFile) {
      return;
    }

    pushEditorHistory();
    const text = preferences.locale === 'ar' ? 'نص ترجمة' : 'Subtitle text';
    const cues = addSubtitleCueAt(subtitleFile.cues, playheadSeconds, timelineDuration, text);
    setSubtitleFile({ ...subtitleFile, cues, edited: true });
    setSubtitlesVisible(true);
    setSelectedLayerId('subtitles');
    setActivity(editorText.addSubtitleCue);
  }

  function removeActiveSubtitleCue() {
    if (!subtitleFile || activeSubtitleCueIndex < 0) {
      return;
    }

    pushEditorHistory();
    setSubtitleFile({ ...subtitleFile, cues: subtitleFile.cues.filter((_, index) => index !== activeSubtitleCueIndex), edited: true });
    setSelectedLayerId('subtitles');
    setActivity(editorText.removeSubtitleCue);
  }

  function restoreOriginalSubtitle() {
    if (!subtitleFile?.originalCues) {
      return;
    }

    pushEditorHistory();
    setSubtitleFile({
      ...subtitleFile,
      path: subtitleFile.originalPath ?? subtitleFile.path,
      name: subtitleFile.originalName ?? subtitleFile.name,
      cues: subtitleFile.originalCues,
      edited: false
    });
    setSubtitlesVisible(true);
    setSelectedLayerId('subtitles');
    setActivity(editorText.restoreOriginalSubtitle);
  }

  function nextTextZIndex(): number {
    return Math.max(0, ...textOverlays.map((overlay) => overlay.zIndex)) + 1;
  }

  function selectTextOverlay(id: number) {
    setSelectedTextOverlayId(id);
    setSelectedEffectItemId(undefined);
    setSelectedCutOutId(undefined);
    setSelectedLayerId('text');
  }

  function textOverlayIdsAtPoint(clientX: number, clientY: number): readonly number[] {
    if (typeof document === 'undefined') {
      return [];
    }

    const ids = document
      .elementsFromPoint(clientX, clientY)
      .map((element) => Number((element as HTMLElement).dataset.textOverlayId))
      .filter((id) => Number.isFinite(id));

    return [...new Set(ids)];
  }

  function selectTextOverlayFromPoint(fallbackId: number, clientX: number, clientY: number, previousSelectedId?: number) {
    const stack = textOverlayIdsAtPoint(clientX, clientY);

    if (stack.length <= 1) {
      selectTextOverlay(stack[0] ?? fallbackId);
      return;
    }

    const previousIndex = previousSelectedId === undefined ? -1 : stack.indexOf(previousSelectedId);
    const nextId = previousIndex >= 0 ? stack[(previousIndex + 1) % stack.length] : stack[0] ?? fallbackId;
    selectTextOverlay(nextId);
    setActivity(`Selected text layer ${stack.indexOf(nextId) + 1} of ${stack.length}.`);
  }

  function selectTextOverlayForContextPoint(fallbackId: number, clientX: number, clientY: number) {
    const stack = textOverlayIdsAtPoint(clientX, clientY);
    const selectedId = selectedTextOverlayId !== undefined && stack.includes(selectedTextOverlayId) ? selectedTextOverlayId : undefined;
    selectTextOverlay(selectedId ?? stack[0] ?? fallbackId);
  }

  function shiftedTextOverlayPlacement(source: TextOverlay, desiredStartSeconds: number, spanSeconds: number) {
    const overlappingSiblings = textOverlays.filter(
      (item) =>
        item.id !== source.id &&
        item.startSeconds < desiredStartSeconds + spanSeconds &&
        item.endSeconds > desiredStartSeconds &&
        Math.abs(item.x - source.x) < 14 &&
        Math.abs(item.y - source.y) < 14
    );
    const offset = Math.min(24, 8 * (overlappingSiblings.length + 1));
    const exactTimeSiblings = textOverlays.filter(
      (item) =>
        item.id !== source.id &&
        Math.abs(item.startSeconds - desiredStartSeconds) < 0.08 &&
        Math.abs(item.endSeconds - (desiredStartSeconds + spanSeconds)) < 0.08
    ).length;
    const startSeconds = clampRangeValue(desiredStartSeconds + exactTimeSiblings * 0.28, 0, Math.max(0, timelineDuration - spanSeconds));

    return {
      startSeconds,
      endSeconds: startSeconds + spanSeconds,
      x: roundedPercent(clampRangeValue(source.x + offset, 6, 94)),
      y: roundedPercent(clampRangeValue(source.y + offset, 8, 92))
    };
  }

  function addTextOverlay() {
    if (isAudioEditor) {
      setActivity(audioVisualToolBlockedMessage());
      return;
    }

    pushEditorHistory();
    const id = Date.now();
    const text = textDraft.trim() || (preferences.locale === 'ar' ? 'نص على المقطع' : 'On-screen text');
    const spanSeconds = Math.min(4, Math.max(1.5, timelineDuration * 0.22));
    const startSeconds = clampRangeValue(playheadSeconds, 0, Math.max(0, timelineDuration - spanSeconds));
    const overlay: TextOverlay = {
      id,
      text,
      x: 50,
      y: 78,
      startSeconds,
      endSeconds: clampRangeValue(startSeconds + spanSeconds, startSeconds + timelineItemMinimumSeconds, timelineDuration || effectiveTrimEnd),
      fontSize: 34,
      fontFamily: defaultEditorTextFontFamily,
      color: '#ffffff',
      zIndex: nextTextZIndex(),
      hidden: false,
      locked: false
    };

    setTextOverlays((items) => [...items, overlay]);
    selectTextOverlay(id);
    setActivity(editorText.dragHint);
  }

  function updateSelectedTextOverlay(patch: Partial<Omit<TextOverlay, 'id'>>, recordHistory = true) {
    if (!selectedTextOverlay || selectedTextOverlay.locked) {
      return;
    }

    if (recordHistory) pushEditorHistory();
    setTextOverlays((items) => items.map((item) => (item.id === selectedTextOverlay.id ? { ...item, ...patch } : item)));
  }

  function removeSelectedTextOverlay() {
    if (!selectedTextOverlay || selectedTextOverlay.locked) {
      return;
    }

    pushEditorHistory();
    setTextOverlays((items) => items.filter((item) => item.id !== selectedTextOverlay.id));
    setSelectedTextOverlayId(undefined);
  }

  function addCutOutRange() {
    pushEditorHistory();
    const selection = { startSeconds: trimStartSeconds, endSeconds: effectiveTrimEnd };
    const span = Math.min(1.2, Math.max(0.35, (selection.endSeconds - selection.startSeconds) * 0.12));
    const startSeconds = clampRangeValue(playheadSeconds, selection.startSeconds, Math.max(selection.startSeconds, selection.endSeconds - span));
    const cutOut: CutOutRange = {
      id: Date.now(),
      startSeconds,
      endSeconds: clampRangeValue(startSeconds + span, startSeconds + timelineItemMinimumSeconds, selection.endSeconds)
    };

    setCutOutRanges((items) => [...items, cutOut]);
    setSelectedCutOutId(cutOut.id);
    setSelectedTextOverlayId(undefined);
    setSelectedEffectItemId(undefined);
    setSelectedLayerId('cuts');
    setActivity(editorText.cutOutHint);
  }

  function setCutOutWindow(id: number, nextWindow: EffectWindow) {
    const normalized = normalizeEffectWindow(
      {
        startSeconds: clampRangeValue(nextWindow.startSeconds, trimStartSeconds, Math.max(trimStartSeconds, effectiveTrimEnd - timelineItemMinimumSeconds)),
        endSeconds: clampRangeValue(nextWindow.endSeconds, trimStartSeconds + timelineItemMinimumSeconds, effectiveTrimEnd)
      },
      timelineDuration
    );

    setCutOutRanges((items) => items.map((item) => (item.id === id ? { ...item, ...normalized } : item)));
  }

  function removeSelectedCutOut() {
    if (selectedCutOutId === undefined) {
      return;
    }

    pushEditorHistory();
    setCutOutRanges((items) => items.filter((item) => item.id !== selectedCutOutId));
    setSelectedCutOutId(undefined);
  }

  function beginTextOverlayDrag(overlay: TextOverlay, element: HTMLElement, clientX: number, clientY: number) {
    const frameRect = previewMediaClientRect();

    if (!frameRect || overlay.locked) {
      textOverlayDragRef.current = undefined;
      return;
    }

    textOverlayDragRef.current = {
      id: overlay.id,
      element,
      frameRect,
      elementRect: element.getBoundingClientRect(),
      startClientX: clientX,
      startClientY: clientY,
      originX: overlay.x,
      originY: overlay.y,
      nextX: overlay.x,
      nextY: overlay.y,
      historyPushed: false
    };
    element.classList.add('dragging');
  }

  function moveTextOverlayDrag(clientX: number, clientY: number) {
    const drag = textOverlayDragRef.current;

    if (!drag) {
      return;
    }

    const nextPoint = clampPreviewOverlayPoint(
      drag.originX + ((clientX - drag.startClientX) / Math.max(1, drag.frameRect.width)) * 100,
      drag.originY + ((clientY - drag.startClientY) / Math.max(1, drag.frameRect.height)) * 100,
      drag.frameRect,
      drag.elementRect
    );
    drag.nextX = nextPoint.x;
    drag.nextY = nextPoint.y;
    drag.historyPushed = true;

    if (drag.raf !== undefined) {
      return;
    }

    drag.raf = window.requestAnimationFrame(() => {
      const current = textOverlayDragRef.current;

      if (!current) {
        return;
      }

      current.element.style.left = `${current.nextX}%`;
      current.element.style.top = `${current.nextY}%`;
      const point = previewPointStyle(current.nextX, current.nextY);
      current.element.style.left = String(point.left);
      current.element.style.top = String(point.top);
      current.raf = undefined;
    });
  }

  function commitTextOverlayDrag() {
    const drag = textOverlayDragRef.current;

    if (!drag) {
      return;
    }

    if (drag.raf !== undefined) {
      window.cancelAnimationFrame(drag.raf);
    }

    textOverlayDragRef.current = undefined;

    if (!drag.historyPushed) {
      drag.element.classList.remove('dragging');
      return;
    }

    pushEditorHistory();
    setTextOverlays((items) =>
      items.map((item) => (item.id === drag.id && !item.locked ? { ...item, x: drag.nextX, y: drag.nextY } : item))
    );
    drag.element.classList.remove('dragging');
  }

  function beginPreviewRegionDrag(
    layerId: 'blur' | 'zoom',
    id: string,
    region: BlurMask,
    locked: boolean,
    element: HTMLElement,
    clientX: number,
    clientY: number,
    handle?: RegionResizeHandle
  ) {
    const frameRect = previewMediaClientRect();

    if (!frameRect || locked || !adjustingRegion) {
      previewRegionDragRef.current = undefined;
      return;
    }

    pausePlaybackForPreciseRegionEdit();
    previewRegionDragRef.current = {
      layerId,
      id,
      element,
      frameRect,
      startClientX: clientX,
      startClientY: clientY,
      origin: region,
      minimumSize: layerId === 'zoom' ? 8 : 6,
      mode: handle ? 'resize' : 'move',
      handle,
      next: region,
      historyPushed: false
    };
    element.classList.add('dragging');
  }

  function nextPreviewRegionFromPointer(clientX: number, clientY: number) {
    const drag = previewRegionDragRef.current;

    if (!drag) {
      return undefined;
    }

    if (drag.mode === 'resize' && drag.handle) {
      const pointerX = clampRangeValue(((clientX - drag.frameRect.left) / Math.max(1, drag.frameRect.width)) * 100, 0, 100);
      const pointerY = clampRangeValue(((clientY - drag.frameRect.top) / Math.max(1, drag.frameRect.height)) * 100, 0, 100);
      return resizeRegionFromHandle(visibleEffectRegion(drag.origin), drag.handle, pointerX, pointerY, drag.minimumSize);
    }

    return moveEffectRegion(drag.origin,
      drag.origin.x + ((clientX - drag.startClientX) / Math.max(1, drag.frameRect.width)) * 100,
      drag.origin.y + ((clientY - drag.startClientY) / Math.max(1, drag.frameRect.height)) * 100,
      drag.layerId === 'zoom');
  }

  function movePreviewRegionDrag(clientX: number, clientY: number) {
    const drag = previewRegionDragRef.current;

    if (!drag) {
      return;
    }

    const next = nextPreviewRegionFromPointer(clientX, clientY);
    if (!next) {
      return;
    }
    drag.next = next;
    drag.historyPushed = true;

    if (drag.raf !== undefined) {
      return;
    }

    drag.raf = window.requestAnimationFrame(() => {
      const current = previewRegionDragRef.current;
      if (!current) {
        return;
      }

      applyRegionDragToElement(current.element, current.next);
      if (current.layerId === 'zoom') {
        current.element.style.setProperty('--zoom-scale', String(clampRangeValue(100 / current.next.width, 1.05, 8)));
      }
      current.raf = undefined;
    });
  }

  function commitPreviewRegionDrag() {
    const drag = previewRegionDragRef.current;

    if (!drag) {
      return;
    }

    if (drag.raf !== undefined) {
      window.cancelAnimationFrame(drag.raf);
    }

    previewRegionDragRef.current = undefined;

    if (!drag.historyPushed) {
      drag.element.classList.remove('dragging');
      return;
    }

    pushEditorHistory();
    if (drag.layerId === 'blur') {
      const item = blurItems.find((candidate) => candidate.id === drag.id);
      updateBlurItem(
        drag.id,
        item?.trackingEnabled
          ? { keyframes: upsertRegionKeyframe(item.keyframes, playheadSeconds, drag.next), trackingEnabled: true }
          : { region: drag.next }
      );
      setBlurMask(drag.next);
      drag.element.classList.remove('dragging');
      return;
    }

    const item = zoomItems.find((candidate) => candidate.id === drag.id);
    const nextScale = drag.mode === 'move' && item ? zoomScaleForEffect(item, drag.next) : clampRangeValue(100 / drag.next.width, 1.05, 8);
    updateZoomItem(
      drag.id,
      item?.trackingEnabled
        ? { keyframes: upsertRegionKeyframe(item.keyframes, playheadSeconds, drag.next), trackingEnabled: true, scale: nextScale }
        : { region: drag.next, scale: nextScale }
    );
    setZoomScale(nextScale);
    setZoomRegion(drag.next);
    drag.element.classList.remove('dragging');
  }

  async function importDroppedMedia(path: string) {
    const result = await window.loaderly?.openMediaFile?.(path);

    if (!result || result.canceled) {
      setActivity(editorText.droppedUnsupported);
      return;
    }

    const nextId = Date.now();
    const nextRow: MediaRow = {
      id: nextId,
      title: result.name,
      source: result.path,
      duration: formatDuration(result.durationSeconds),
      durationSeconds: result.durationSeconds,
      status: 'ready',
      progress: 100,
      progressKnown: true,
      downloadPhase: 'completed',
      size: formatBytes(result.sizeBytes),
      sourceType: 'local',
      mediaKind: mediaKindForPath(result.path),
      filePath: result.path,
      fileUrl: result.fileUrl,
      thumbnailUrl: result.thumbnailUrl,
      createdAtMs: Date.now(),
      completedAtMs: Date.now()
    };

    setMediaRows((rows) => [nextRow, ...rows]);
    setSelectedMediaId(nextId);
    setActiveNav('library');
    setActivity(t('localFileImported', { name: result.name }));

    if (result.subtitlePath) {
      void loadSubtitlePath(result.subtitlePath);
    }
  }

  async function handleWorkspaceDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();

    const file = event.dataTransfer.files[0];
    const text = event.dataTransfer.getData('text').trim();

    if (file && window.loaderly?.filePathForDrop) {
      const path = window.loaderly.filePathForDrop(file);
      const kind = fileKindForPath(path);

      if (kind === 'media') {
        await importDroppedMedia(path);
        return;
      }

      if (kind === 'subtitle') {
        await loadSubtitlePath(path);
        return;
      }
    }

    if (text) {
      setUrlValue(text);
      setActivity(editorText.dropHint);
      return;
    }

    setActivity(editorText.droppedUnsupported);
  }

  async function togglePlayback() {
    const video = videoRef.current;

    if (!video || !selectedMedia.fileUrl) {
      setIsPlaying((value) => !value);
      return;
    }

    if (video.paused) {
      const playbackEndSeconds = Math.max(0.1, selectedDurationSeconds || timelineDuration);
      const requestedPlayheadSeconds = playheadSecondsRef.current;
      const nextTime = playbackResumeSeconds({
        mediaCurrentSeconds: video.currentTime,
        requestedPlayheadSeconds,
        lastKnownPlayheadSeconds: requestedPlayheadSeconds,
        playbackEndSeconds
      });
      const resumeTime = loopPlayback && isAudioEditor && (nextTime < trimStartSeconds || nextTime >= effectiveTrimEnd - .02)
        ? (keptRanges[0]?.startSeconds ?? trimStartSeconds) : nextTime;
      video.currentTime = resumeTime;
      commitPlayheadSeconds(resumeTime);
      try {
        await video.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
        setActivity(preferences.locale === 'ar' ? 'تعذر تشغيل معاينة هذا الفيديو.' : 'This video preview could not be played.');
      }
    } else {
      const pausedAt = Number.isFinite(video.currentTime) ? video.currentTime : playheadSeconds;
      video.pause();
      commitPlayheadSeconds(pausedAt);
      setIsPlaying(false);
      schedulePlayheadAutosave();
    }
  }

  function updatePlayhead(nextValue: number) {
    const duration =
      selectedDurationSeconds && Number.isFinite(selectedDurationSeconds) && selectedDurationSeconds > 0 ? selectedDurationSeconds : timelineDuration;
    const nextPlayhead = clampRangeValue(nextValue, 0, Math.max(0, duration));
    commitPlayheadSeconds(nextPlayhead);
    schedulePlayheadAutosave();

    if (videoRef.current && selectedMedia.fileUrl) {
      try {
        videoRef.current.currentTime = nextPlayhead;
      } catch {
        // Some files accept seeking only after enough metadata is loaded.
      }
    }
  }

  function seekPlayerFromPointer(clientX: number) {
    const rect = playerScrubberRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    updatePlayhead(
      playerScrubSecondsFromClientX({
        clientX,
        left: rect.left,
        width: rect.width,
        durationSeconds: timelineDuration,
        isRtl: editorTimelineIsRtl
      })
    );
  }

  function selectEffectItem(layerId: EffectLayerId, id: string) {
    if (!isEditorLayerAvailableForMedia(selectedEditorMediaKind, layerId)) {
      setActivity(audioVisualToolBlockedMessage());
      return;
    }

    setSelectedLayerId(layerId);
    setSelectedEffectItemId(id);
    setSelectedTextOverlayId(undefined);
    setSelectedCutOutId(undefined);

    if (layerId === 'blur') {
      const item = blurItems.find((candidate) => candidate.id === id);

      if (item) {
        setBlurWindow({ startSeconds: item.startTime, endSeconds: item.endTime });
        setBlurStrength(item.strength);
        setBlurMask(item.region);
      }
    } else if (layerId === 'zoom') {
      const item = zoomItems.find((candidate) => candidate.id === id);

      if (item) {
        setZoomWindow({ startSeconds: item.startTime, endSeconds: item.endTime });
        setZoomScale(item.scale);
        setZoomRegion(item.region);
      }
    } else if (layerId === 'reframe') {
      const item = reframeItems.find((candidate) => candidate.id === id);

      if (item) {
        setReframeWindow({ startSeconds: item.startTime, endSeconds: item.endTime });
        setReframeTargetWidth(item.targetWidth);
        setReframeTargetHeight(item.targetHeight);
        setReframeFitMode(item.fitMode);
        setReframePositionX(item.positionX);
        setReframePositionY(item.positionY);
        setReframeBackground(item.background);
      }
    } else {
      const item = speedItems.find((candidate) => candidate.id === id);

      if (item) {
        setSpeedWindow({ startSeconds: item.startTime, endSeconds: item.endTime });
        setSpeedRate(item.rate);
      }
    }
  }

  function updateBlurItem(id: string, patch: Partial<BlurEffectItem>) {
    setTrackingMessage(current => current?.id === id ? undefined : current);
    setBlurItems((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function updateZoomItem(id: string, patch: Partial<ZoomEffectItem>) {
    setTrackingMessage(current => current?.id === id ? undefined : current);
    setZoomItems((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function updateSpeedItem(id: string, patch: Partial<SpeedEffectItem>) {
    setSpeedItems((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function updateReframeItem(id: string, patch: Partial<ReframeEffectItem>) {
    setReframeItems((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function effectWindowForLayer(layerId: EffectLayerId, id?: string): EffectWindow {
    switch (layerId) {
      case 'blur':
        return normalizeEffectWindow(itemWindow(blurItems.find((item) => item.id === id) ?? selectedBlurItem ?? blurItems[0], blurWindow), timelineDuration);
      case 'zoom':
        return normalizeEffectWindow(itemWindow(zoomItems.find((item) => item.id === id) ?? selectedZoomItem ?? zoomItems[0], zoomWindow), timelineDuration);
      case 'speed':
        return normalizeEffectWindow(itemWindow(speedItems.find((item) => item.id === id) ?? selectedSpeedItem ?? speedItems[0], speedWindow), timelineDuration);
      case 'reframe':
        return normalizeEffectWindow(itemWindow(reframeItems.find((item) => item.id === id) ?? reframeItems[0], reframeWindow), timelineDuration);
    }
  }

  function setEffectWindowForLayer(layerId: EffectLayerId, nextWindow: EffectWindow, id?: string) {
    const normalized = normalizeEffectWindow(nextWindow, timelineDuration);

    switch (layerId) {
      case 'blur': {
        setBlurWindow(normalized);
        const targetId = id ?? selectedBlurItem?.id;
        const target = blurItems.find((item) => item.id === targetId);
        if (targetId && !target?.locked) {
          updateBlurItem(targetId, { startTime: normalized.startSeconds, endTime: normalized.endSeconds });
        }
        break;
      }
      case 'zoom': {
        setZoomWindow(normalized);
        const targetId = id ?? selectedZoomItem?.id;
        const target = zoomItems.find((item) => item.id === targetId);
        if (targetId && !target?.locked) {
          updateZoomItem(targetId, { startTime: normalized.startSeconds, endTime: normalized.endSeconds });
        }
        break;
      }
      case 'speed': {
        setSpeedWindow(normalized);
        const targetId = id ?? selectedSpeedItem?.id;
        const target = speedItems.find((item) => item.id === targetId);
        if (targetId && !target?.locked) {
          updateSpeedItem(targetId, { startTime: normalized.startSeconds, endTime: normalized.endSeconds });
        }
        break;
      }
      case 'reframe': {
        const fullWindow = normalizeEffectWindow({ startSeconds: 0, endSeconds: timelineDuration }, timelineDuration);
        setReframeWindow(fullWindow);
        const targetId = id ?? reframeItems[0]?.id;
        const target = reframeItems.find((item) => item.id === targetId);
        if (targetId && !target?.locked) {
          updateReframeItem(targetId, { startTime: 0, endTime: timelineDuration });
        }
        break;
      }
    }
  }

  function nextEffectWindowFromPlayhead(): EffectWindow {
    const duration = timelineDuration;
    const span = Math.min(3, Math.max(0.8, duration * 0.18));
    const startSeconds = clampRangeValue(playheadSeconds, 0, Math.max(0, duration - span));
    const endSeconds = clampRangeValue(startSeconds + span, startSeconds + timelineItemMinimumSeconds, duration);

    return { startSeconds, endSeconds };
  }

  function enableTimelineEffect(layerId: EffectLayerId) {
    if (!isEditorLayerAvailableForMedia(selectedEditorMediaKind, layerId)) {
      setActivity(audioVisualToolBlockedMessage());
      return;
    }

    if (layerId === 'reframe' && reframeItems.length > 0) {
      selectEffectItem('reframe', reframeItems[0].id);
      setActivity(uiText(preferences.locale, 'Canvas selected. It applies to the full video.', 'حُدد المقاس. ينطبق على الفيديو كاملًا.'));
      return;
    }

    pushEditorHistory();
    const windowValue = nextEffectWindowFromPlayhead();
    const id = `${layerId}-${Date.now()}`;
    setSelectedLayerId(layerId);
    setSelectedEffectItemId(id);
    setSelectedTextOverlayId(undefined);
    setSelectedCutOutId(undefined);
    setEffectWindowForLayer(layerId, windowValue, id);

    switch (layerId) {
      case 'blur': {
        const next: BlurEffectItem = {
          id,
          type: 'blur',
          name: `${t('blur')} ${blurItems.length + 1}`,
          trackId: 'blur',
          startTime: windowValue.startSeconds,
          endTime: windowValue.endSeconds,
          locked: false,
          hidden: false,
          region: blurMask,
          strength: blurStrength > 0 ? blurStrength : 14,
          shape: 'rectangle',
          style: 'normal'
        };
        setBlurItems((items) => [...items, next]);
        setBlurWindow(windowValue);
        setBlurStrength(next.strength);
        setBlurMask(next.region);
        setActivity(t('effectApplied', { effect: t('blur'), value: '14px' }));
        break;
      }
      case 'zoom': {
        const next: ZoomEffectItem = {
          id,
          type: 'zoom',
          name: `${t('zoom')} ${zoomItems.length + 1}`,
          trackId: 'zoom',
          startTime: windowValue.startSeconds,
          endTime: windowValue.endSeconds,
          locked: false,
          hidden: false,
          region: { ...zoomRegion, width: 74, height: 74 },
          scale: zoomScale > 1 ? zoomScale : 1.25,
          easeIn: 0.75,
          easeOut: 0.75,
          easing: 'ease-in-out'
        };
        setZoomItems((items) => [...items, next]);
        setZoomWindow(windowValue);
        setZoomScale(next.scale);
        setZoomRegion(next.region);
        setActivity(
          overlappingTimelineItemIds([...zoomItems, next]).size > 0
            ? inspectorText.zoomConflict
            : t('effectApplied', { effect: t('zoom'), value: `${next.scale.toFixed(2)}x` })
        );
        break;
      }
      case 'speed': {
        const next: SpeedEffectItem = {
          id,
          type: 'speed',
          name: `${t('speed')} ${speedItems.length + 1}`,
          trackId: 'speed',
          startTime: windowValue.startSeconds,
          endTime: windowValue.endSeconds,
          locked: false,
          hidden: false,
          rate: speedRate !== 1 ? speedRate : 2,
          mode: 'normal'
        };
        setSpeedItems((items) => [...items, next]);
        setSpeedWindow(windowValue);
        setSpeedRate(next.rate);
        setActivity(t('effectApplied', { effect: t('speed'), value: '2.00x' }));
        break;
      }
      case 'reframe': {
        const fullWindow = { startSeconds: 0, endSeconds: timelineDuration };
        const sourceW = previewMediaSize.width > 0 ? previewMediaSize.width : 1920;
        const sourceH = previewMediaSize.height > 0 ? previewMediaSize.height : 1080;
        const initialW = reframeTargetWidth > 0 ? reframeTargetWidth : sourceW;
        const initialH = reframeTargetHeight > 0 ? reframeTargetHeight : sourceH;
        const next: ReframeEffectItem = {
          id,
          type: 'reframe',
          name: uiText(preferences.locale, 'Canvas', 'مقاس اللوحة'),
          trackId: 'reframe',
          startTime: 0,
          endTime: timelineDuration,
          locked: false,
          hidden: false,
          targetWidth: initialW,
          targetHeight: initialH,
          fitMode: reframeFitMode,
          positionX: reframePositionX,
          positionY: reframePositionY,
          background: reframeBackground
        };
        setReframeItems((items) => [...items, next]);
        setReframeWindow(fullWindow);
        setReframeTargetWidth(initialW);
        setReframeTargetHeight(initialH);
        setActivity(preferences.locale === 'ar' ? 'أُضيف مقاس اللوحة. ينطبق على الفيديو كاملًا.' : 'Canvas reframe added. It applies to the full video.');
        break;
      }
    }
  }

  function updateSelectedMediaDuration(duration: number) {
    if (!Number.isFinite(duration) || duration <= 0 || selectedMedia.id === 0) {
      return;
    }

    setMediaRows((rows) =>
      rows.map((row) =>
        row.id === selectedMedia.id
          ? {
              ...row,
              duration: formatDuration(duration),
              durationSeconds: duration
            }
          : row
      )
    );
  }

  function timelineTrackRect(): { readonly left: number; readonly width: number } | undefined {
    const frame = trimTimelineRef.current;

    if (!frame) {
      return undefined;
    }

    const trackRect = frame.querySelector<HTMLElement>('.timeline-row__track')?.getBoundingClientRect();

    if (trackRect && trackRect.width > 0) {
      return { left: trackRect.left, width: trackRect.width };
    }

    const rect = frame.getBoundingClientRect();
    const styles = window.getComputedStyle(frame);
    const customLabelWidth = Number.parseFloat(styles.getPropertyValue('--track-label-width'));
    const paddingLeft = Number.parseFloat(styles.paddingLeft) || 0;
    const paddingRight = Number.parseFloat(styles.paddingRight) || 0;
    const labelWidth = Number.isFinite(customLabelWidth) && customLabelWidth > 0 ? customLabelWidth : 136;
    const left = rect.left + paddingLeft + labelWidth;
    const width = Math.max(1, rect.width - paddingLeft - paddingRight - labelWidth);

    return { left, width };
  }

  function timelineSecondsFromPointer(clientX: number): number {
    const rect = timelineTrackRect();

    if (!rect) {
      return playheadSeconds;
    }

    const visualRatio = clampRangeValue((clientX - rect.left) / Math.max(1, rect.width), 0, 1);
    const ratio = editorTimelineIsRtl ? 1 - visualRatio : visualRatio;

    return timelineViewportSecondsFromRatio(ratio, timelineViewport);
  }

  function timelineSnapPoints(): readonly number[] {
    return [
      0,
      timelineDuration,
      trimStartSeconds,
      effectiveTrimEnd,
      playheadSeconds,
      blurWindow.startSeconds,
      blurWindow.endSeconds,
      zoomWindow.startSeconds,
      zoomWindow.endSeconds,
      speedWindow.startSeconds,
      speedWindow.endSeconds,
      reframeWindow.startSeconds,
      reframeWindow.endSeconds,
      ...blurItems.flatMap((item) => [item.startTime, item.endTime]),
      ...zoomItems.flatMap((item) => [item.startTime, item.endTime]),
      ...speedItems.flatMap((item) => [item.startTime, item.endTime]),
      ...reframeItems.flatMap((item) => [item.startTime, item.endTime]),
      ...textOverlays.flatMap((overlay) => [overlay.startSeconds, overlay.endSeconds]),
      ...cutOutRanges.flatMap((range) => [range.startSeconds, range.endSeconds])
    ];
  }

  function snapTimelineSeconds(value: number, extraPoints: readonly number[] = []): number {
    const rect = timelineTrackRect();
    const pixelThresholdSeconds = rect ? (timelineViewportDuration / Math.max(1, rect.width)) * 14 : timelineViewportDuration * 0.012;
    const threshold = Math.min(2.5, Math.max(0.025, pixelThresholdSeconds));

    return snapSeconds(value, [...timelineSnapPoints(), ...extraPoints], timelineDuration, threshold);
  }

  function timelineWindowSnapStartPoints(span: number, extraPoints: readonly number[] = []): readonly number[] {
    const points = [...timelineSnapPoints(), ...extraPoints];

    return [
      ...points,
      ...points.map((point) => point - span)
    ];
  }

  function timelineSecondsDeltaFromPointer(startClientX: number, currentClientX: number): number {
    const rect = timelineTrackRect();

    if (!rect) {
      return 0;
    }

    const direction = editorTimelineIsRtl ? -1 : 1;

    return ((currentClientX - startClientX) * direction * timelineViewportDuration) / Math.max(1, rect.width);
  }

  function updateTimelineZoomFromWheel(event: ReactWheelEvent<HTMLDivElement>) {
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }

    const rect = timelineTrackRect();
    const visualRatio = rect ? clampRangeValue((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1) : 0.5;
    const anchorRatio = editorTimelineIsRtl ? 1 - visualRatio : visualRatio;
    const anchorSeconds = timelineViewportSecondsFromRatio(anchorRatio, timelineViewport);
    const nextZoom = timelineZoomFromWheel(timelineZoom, event.deltaY);
    const nextViewport = timelineViewportFromZoom({
      duration: timelineDuration,
      zoom: nextZoom,
      anchorSeconds,
      anchorRatio
    });

    event.preventDefault();
    setTimelineZoom(nextZoom);
    setTimelineViewportStartSeconds(nextViewport.startSeconds);
  }

  function moveTrimControl(control: 'playhead' | 'start' | 'end', clientX: number) {
    const nextSeconds = snapTimelineSeconds(timelineSecondsFromPointer(clientX));

    switch (control) {
      case 'playhead':
        updatePlayhead(nextSeconds);
        break;
      case 'start': {
        const nextStart = clampRangeValue(nextSeconds, 0, Math.max(0, effectiveTrimEnd - timelineItemMinimumSeconds));
        setTrimStartSeconds(nextStart);
        updatePlayhead(Math.max(nextStart, playheadSeconds));
        break;
      }
      case 'end':
        setTrimEndSeconds(clampRangeValue(nextSeconds, trimStartSeconds + timelineItemMinimumSeconds, Math.max(1, selectedDurationSeconds || 30)));
        break;
    }
  }

  function setTextOverlayWindow(id: number, nextWindow: EffectWindow) {
    const normalized = normalizeEffectWindow(nextWindow, timelineDuration);

    setTextOverlays((items) =>
      items.map((item) => (item.id === id && !item.locked ? { ...item, startSeconds: normalized.startSeconds, endSeconds: normalized.endSeconds } : item))
    );
  }

  function moveTimelineHandle(target: TimelineHandleTarget, clientX: number) {
    if(target.kind==='audio-section') {
      const seconds=snapTimelineSeconds(timelineSecondsFromPointer(clientX),audioSections.filter(s=>s.id!==target.id).flatMap(s=>[s.startSeconds,s.endSeconds]));
      setAudioSections(items=>items.map(item=>item.id===target.id?adjustAudioSectionWindow(item,items,timelineDuration,target.edge,seconds):item));
      return;
    }
    if (target.kind === 'trim') {
      moveTrimControl(target.edge, clientX);
      return;
    }

    if (target.kind === 'text') {
      const nextSeconds = snapTimelineSeconds(timelineSecondsFromPointer(clientX));
      const overlay = textOverlays.find((item) => item.id === target.id);

      if (!overlay) {
        return;
      }

      if (target.edge === 'start') {
        setTextOverlayWindow(target.id, {
          startSeconds: clampRangeValue(nextSeconds, 0, overlay.endSeconds - timelineItemMinimumSeconds),
          endSeconds: overlay.endSeconds
        });
      } else {
        setTextOverlayWindow(target.id, {
          startSeconds: overlay.startSeconds,
          endSeconds: clampRangeValue(nextSeconds, overlay.startSeconds + timelineItemMinimumSeconds, timelineDuration)
        });
      }

      return;
    }

    if (target.kind === 'cutout') {
      const nextSeconds = snapTimelineSeconds(timelineSecondsFromPointer(clientX), [trimStartSeconds, effectiveTrimEnd]);
      const cutOut = cutOutRanges.find((item) => item.id === target.id);

      if (!cutOut) {
        return;
      }

      if (target.edge === 'start') {
        setCutOutWindow(target.id, {
          startSeconds: clampRangeValue(nextSeconds, trimStartSeconds, cutOut.endSeconds - timelineItemMinimumSeconds),
          endSeconds: cutOut.endSeconds
        });
      } else {
        setCutOutWindow(target.id, {
          startSeconds: cutOut.startSeconds,
          endSeconds: clampRangeValue(nextSeconds, cutOut.startSeconds + timelineItemMinimumSeconds, effectiveTrimEnd)
        });
      }

      return;
    }

    const nextSeconds = snapTimelineSeconds(timelineSecondsFromPointer(clientX));
    const currentWindow = effectWindowForLayer(target.layerId, target.id);

    if (target.edge === 'start') {
      setEffectWindowForLayer(target.layerId, {
        ...currentWindow,
        startSeconds: clampRangeValue(nextSeconds, 0, currentWindow.endSeconds - timelineItemMinimumSeconds)
      }, target.id);
    } else {
      setEffectWindowForLayer(target.layerId, {
        ...currentWindow,
        endSeconds: clampRangeValue(nextSeconds, currentWindow.startSeconds + timelineItemMinimumSeconds, timelineDuration)
      }, target.id);
    }
  }

  function bindTimelineHandle(target: TimelineHandleTarget) {
    return {
      onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
        if (event.button !== 0) return;
        activateTimelineSelection();
        if(target.kind==='audio-section')selectAudioSection(target.id);
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        timelineHandleGestureRef.current = { startX: event.clientX, committed: false };
      },
      onPointerMove: (event: ReactPointerEvent<HTMLElement>) => {
        const gesture = timelineHandleGestureRef.current;
        if (event.buttons !== 1 || !gesture) return;
        event.stopPropagation();
        if (!gesture.committed) {
          if (Math.abs(event.clientX - gesture.startX) < 3) return;
          pushEditorHistory(); gesture.committed = true;
        }
        moveTimelineHandle(target, event.clientX);
      },
      onPointerUp: () => { timelineHandleGestureRef.current = undefined; },
      onPointerCancel: () => { timelineHandleGestureRef.current = undefined; }
    };
  }

  function moveTimelineSegment(clientX: number) {
    const drag = timelineSegmentDragRef.current;

    if (!drag) {
      return;
    }

    if (!timelineDragCommittedRef.current) {
      if (Math.abs(clientX - drag.startClientX) < 3) return;
      pushEditorHistory();
      timelineDragCommittedRef.current = true;
    }

    const span = Math.max(timelineItemMinimumSeconds, drag.endSeconds - drag.startSeconds);
    const maxStart = Math.max(0, timelineDuration - span);
    const rawStart = clampRangeValue(drag.startSeconds + timelineSecondsDeltaFromPointer(drag.startClientX, clientX), 0, maxStart);
    const nextStart = snapTimelineSeconds(rawStart, timelineWindowSnapStartPoints(span, [trimStartSeconds, effectiveTrimEnd]));
    const nextWindow = { startSeconds: nextStart, endSeconds: nextStart + span };

    if(drag.kind==='audio-section') {
      setAudioSections(items=>items.map(item=>item.id===drag.id?adjustAudioSectionWindow(item,items,timelineDuration,'move',nextStart):item));
      return;
    }

    if (drag.kind === 'trim') {
      setTrimStartSeconds(nextWindow.startSeconds);
      setTrimEndSeconds(nextWindow.endSeconds);
      updatePlayhead(clampRangeValue(playheadSeconds, nextWindow.startSeconds, nextWindow.endSeconds));
      return;
    }

    if (drag.kind === 'text') {
      setTextOverlayWindow(drag.id, nextWindow);
      return;
    }

    if (drag.kind === 'cutout') {
      setCutOutWindow(drag.id, {
        startSeconds: clampRangeValue(nextWindow.startSeconds, trimStartSeconds, effectiveTrimEnd - span),
        endSeconds: clampRangeValue(nextWindow.endSeconds, trimStartSeconds + span, effectiveTrimEnd)
      });
      return;
    }

    setEffectWindowForLayer(drag.layerId, nextWindow, drag.id);
  }

  function selectAudioSection(id:string) {
    setAudioInspectorOpen(true);setAudioPanelTab('sound');setSelectedAudioSectionId(id);
    setSelectedEffectItemId(undefined);setSelectedCutOutId(undefined);setSelectedTextOverlayId(undefined);
  }

  function bindTimelineSegment(target: TimelineSegmentDragStart) {
    return {
      onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
        if (event.button !== 0) return;
        activateTimelineSelection();
        event.stopPropagation();
        if (target.kind === 'effect' && target.layerId === 'reframe') { if(target.id)selectEffectItem('reframe',target.id);return; }
        event.currentTarget.setPointerCapture(event.pointerId);
        timelineDragCommittedRef.current = false;
        timelineSegmentDragRef.current = { ...target, startClientX: event.clientX };

        if (target.kind === 'audio-section') {
          selectAudioSection(target.id);
        } else if (target.kind === 'effect') {
          if (target.id) {
            selectEffectItem(target.layerId, target.id);
          } else {
            setSelectedLayerId(target.layerId);
          }
        } else if (target.kind === 'text') {
          setSelectedTextOverlayId(target.id);
          setSelectedEffectItemId(undefined);
          setSelectedCutOutId(undefined);
          setSelectedLayerId('text');
        } else if (target.kind === 'cutout') {
          setSelectedCutOutId(target.id);
          setSelectedTextOverlayId(undefined);
          setSelectedEffectItemId(undefined);
          setSelectedLayerId('cuts');
        } else {
          setSelectedTextOverlayId(undefined);
          setSelectedEffectItemId(undefined);
          setSelectedCutOutId(undefined);
          setSelectedLayerId('cuts');
        }
      },
      onPointerMove: (event: ReactPointerEvent<HTMLElement>) => {
        if (event.buttons === 1) {
          event.stopPropagation();
          moveTimelineSegment(event.clientX);
        }
      },
      onPointerUp: () => {
        timelineSegmentDragRef.current = undefined;
      },
      onPointerCancel: () => {
        timelineSegmentDragRef.current = undefined;
      }
    };
  }

  function renderRouteHero({
    actions,
    description,
    eyebrow,
    stats = [],
    title
  }: {
    readonly actions?: ReactNode;
    readonly description: string;
    readonly eyebrow: string;
    readonly stats?: readonly {
      readonly icon: LucideIcon;
      readonly label: string;
      readonly onClick?: () => void;
      readonly tone?: 'accent' | 'ready' | 'danger' | 'muted';
      readonly value: string | number;
    }[];
    readonly title: string;
  }) {
    return (
      <header className="card-panel route-hero">
        <div className="route-hero__copy">
          <span className="workspace-eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {stats.length > 0 ? (
          <div className="route-hero__stats">
            {stats.map((stat) => {
              const Icon = stat.icon;
              const content = (
                <>
                  <span className={`route-hero__stat-icon route-hero__stat-icon--${stat.tone ?? 'muted'}`}>
                    <Icon aria-hidden="true" size={16} />
                  </span>
                  <span>
                    <strong>{stat.value}</strong>
                    <small>{stat.label}</small>
                  </span>
                </>
              );

              return stat.onClick ? (
                <button className="route-hero__stat" key={stat.label} onClick={stat.onClick} type="button">{content}</button>
              ) : (
                <div className="route-hero__stat" key={stat.label}>{content}</div>
              );
            })}
          </div>
        ) : null}
        {actions ? <div className="route-hero__actions">{actions}</div> : null}
      </header>
    );
  }

  function renderMediaThumbnail(row: MediaRow, compact = false) {
    return (
      <span className={`media-thumb${compact ? ' media-thumb--compact' : ''}`}>
        {row.thumbnailUrl ? (
          <img alt="" draggable={false} src={row.thumbnailUrl} />
        ) : (
          mediaKindForRow(row) === 'audio'
            ? <AudioLines aria-hidden="true" size={compact ? 18 : 24} />
            : <FileVideo aria-hidden="true" size={compact ? 18 : 24} />
        )}
      </span>
    );
  }

  function renderDownloadCards(rows: readonly MediaRow[] = mediaRows) {
    if (!rows.length) return <div className="download-empty"><Download size={28} /><h2>{uiText(preferences.locale, 'No downloads here', 'لا توجد تنزيلات هنا')}</h2><p>{downloadFilter === 'all' ? uiText(preferences.locale, 'Add a link above to get started.', 'أضف رابطًا بالأعلى للبدء.') : uiText(preferences.locale, 'Downloads with this status will appear here.', 'تظهر هنا التنزيلات التي تطابق هذه الحالة.')}</p></div>;
    return <div className="download-list" aria-label={uiText(preferences.locale, 'Downloads', 'التنزيلات')}>
      {rows.map(row => {
        const ready = isMediaReadyForEditor(row);
        const title = displayMediaTitle(row);
        const running = row.status === 'downloading';
        return <article className="download-entry" key={row.id}>
          <div className="download-entry__thumbnail">{renderMediaThumbnail(row)}</div>
          <div className="download-entry__body">
            <strong className="download-entry__title" data-tooltip={title}><bdi>{title}</bdi></strong>
            <div className="download-entry__metadata"><span className={`download-entry__state ${statusClass(row.status)}`}>{running ? <Download size={12}/> : ready ? <Check size={12}/> : row.status==='failed' ? <AlertTriangle size={12}/> : <Clock3 size={12}/>} {running ? mediaProgressLabel(row) : ready ? uiText(preferences.locale, 'Completed', 'مكتمل') : displayStatus(row.status)}</span><span data-tooltip={displayMediaSource(row)}>{mediaSourceLabel(row)}</span><span>{qualityLabel(row.quality ?? preferences.quality, preferences.locale)}</span>{ready ? <span>{displayMediaSize(row)}</span> : null}{ready ? <span>{displayMediaDuration(row)}</span> : null}</div>
            {running ? <div className="download-entry__progress"><div className={`download-progress${row.progressKnown === false ? ' indeterminate' : ''}`} role="progressbar" aria-label={uiText(preferences.locale, 'Download progress', 'تقدم التنزيل')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={row.progressKnown === false ? undefined : row.progress}><span style={{inlineSize: `${Math.max(0, Math.min(100, row.progress))}%`}} /></div><small><DownloadElapsedLabel fallbackDownloadingLabel={downloadPhaseLabel(row)} locale={preferences.locale} row={row} /></small></div> : null}
            {row.status === 'failed' && row.errorMessage ? <p className="download-entry__error">{friendlyDownloadError(row.errorMessage, preferences.locale)}</p> : null}
          </div>
          <div className="download-entry__actions">
            {row.status === 'queued' || row.status === 'failed' ? <DesktopMenu ariaLabel={t('quality')} options={qualityMenuOptions} value={row.quality ?? preferences.quality} valueLabel={qualityLabel(row.quality ?? preferences.quality, preferences.locale)} onChange={(quality) => updateQueuedMediaQuality(row.id, quality)} /> : null}
            {ready ? <button className="button secondary" onClick={() => { selectMediaRow(row.id); selectNavigation('library'); }} type="button"><Library size={14} />{uiText(preferences.locale, 'View in library', 'عرض في المكتبة')}</button> : !running ? <button className="button secondary" onClick={() => retryDownload(row)} type="button"><Play size={14} />{row.status === 'failed' ? uiText(preferences.locale, 'Retry', 'إعادة المحاولة') : uiText(preferences.locale, 'Start', 'بدء')}</button> : null}
            <button aria-label={uiText(preferences.locale, `Remove ${title}`, `حذف ${title}`)} data-tooltip={uiText(preferences.locale, 'Remove item', 'إزالة العنصر')} className="download-remove" disabled={running} onClick={() => requestRemoveMedia(row.id)} type="button"><X size={16} /></button>
          </div>
        </article>;
      })}
    </div>;
  }

  function renderLibraryCards(rows: readonly MediaRow[] = mediaRows, effectiveSelectedId = selectedMediaId) {
    if (rows.length === 0) {
      return (
        <div className="library-empty">
          <span className="library-empty__icon">
            <Library aria-hidden="true" size={24} />
          </span>
          <div>
            <strong>{t('noRealMedia')}</strong>
            <small>{t('importRealMedia')}</small>
          </div>

        </div>
      );
    }

    return rows.map((row) => {
      const title = displayMediaTitle(row);
      const KindIcon = mediaKindForRow(row) === 'audio' ? AudioLines : Film;
      return (
        <article className={`library-card${(librarySelecting?librarySelection.includes(row.id):effectiveSelectedId === row.id) ? ' selected' : ''}`} key={row.id}>
          {librarySelecting&&<input className="library-card-select" type="checkbox" aria-label={uiText(preferences.locale,`Select ${title}`,`تحديد ${title}`)} checked={librarySelection.includes(row.id)} onChange={()=>toggleLibrarySelection(row.id)}/>}
          <button aria-label={title} aria-pressed={effectiveSelectedId === row.id} className="library-card__main"
            onClick={() => librarySelecting?toggleLibrarySelection(row.id):selectMediaRow(row.id)} onDoubleClick={() => {if(!librarySelecting)openSelectedMediaEditor(row);}} type="button">
            <span className="library-card__visual">
              {renderMediaThumbnail(row)}
              <span className="library-card__duration">{displayMediaDuration(row)}</span>
              {row.status === 'edited' ? <span className="library-card__edited"><Scissors size={12} />{displayStatus(row.status)}</span> : null}
            </span>
            <span className="library-card__copy">
              <strong data-tooltip={title}><bdi>{title}</bdi></strong>
              <small data-tooltip={displayMediaSource(row)}><bdi>{mediaSourceLabel(row)}</bdi></small>
              <span className="library-card__metadata"><span><KindIcon size={13} />{mediaKindLabel(row)}</span><span>{displayMediaSize(row)}</span><span>{mediaFormatLabel(row)}</span></span>
            </span>
          </button>
        </article>
      );
    });
  }

  function mediaSourceLabel(row: MediaRow): string {
    const source = displayMediaSource(row);
    try { return new URL(source).hostname.replace(/^www\./, '') || uiText(preferences.locale, 'Local file', 'ملف محلي'); }
    catch { return uiText(preferences.locale, 'Local file', 'ملف محلي'); }
  }

  function renderTextAndSubtitleTools() {
    return (
      <div className="editor-workbench">
        <section className="editor-tool-card">
          <div>
            <strong>{editorText.textLayer}</strong>
            <small>{editorText.dragHint}</small>
          </div>
          <div className="text-layer-row">
            <input
              aria-label={editorText.textLayer}
              dir="auto"
              onChange={(event) => setTextDraft(event.currentTarget.value)}
              placeholder={editorText.textPlaceholder}
              type="text"
              value={textDraft}
            />
            <button className="button primary" onClick={addTextOverlay} type="button">
              <Captions aria-hidden="true" size={15} />
              {editorText.addText}
            </button>
          </div>
          {selectedTextOverlay ? (
            <div className="text-layer-controls">
              <input
                aria-label={editorText.textLayer}
                dir="auto"
                onChange={(event) => updateSelectedTextOverlay({ text: event.currentTarget.value })}
                value={selectedTextOverlay.text}
              />
              <label className="range-control">
                <span>{editorText.fontSize}</span>
                <RangeInput
                  max={72}
                  min={18}
                  onChange={(event) => updateSelectedTextOverlay({ fontSize: Number(event.currentTarget.value) })}
                  step={1}
                  type="range"
                  value={selectedTextOverlay.fontSize}
                />
                <strong>{selectedTextOverlay.fontSize}px</strong>
              </label>
              <label className="range-control">
                <span>{t('trimStart')}</span>
                <RangeInput
                  max={Math.max(1, selectedDurationSeconds || 30)}
                  min={0}
                  onChange={(event) => updateSelectedTextOverlay({ startSeconds: Number(event.currentTarget.value) })}
                  step={0.1}
                  type="range"
                  value={selectedTextOverlay.startSeconds}
                />
                <strong>{formatTimecode(selectedTextOverlay.startSeconds)}</strong>
              </label>
              <label className="range-control">
                <span>{t('trimEnd')}</span>
                <RangeInput
                  max={Math.max(1, selectedDurationSeconds || 30)}
                  min={0}
                  onChange={(event) => updateSelectedTextOverlay({ endSeconds: Number(event.currentTarget.value) })}
                  step={0.1}
                  type="range"
                  value={selectedTextOverlay.endSeconds}
                />
                <strong>{formatTimecode(selectedTextOverlay.endSeconds)}</strong>
              </label>
              <button className="button secondary" onClick={removeSelectedTextOverlay} type="button">
                <X aria-hidden="true" size={15} />
                {editorText.removeText}
              </button>
            </div>
          ) : null}
        </section>

        <section className="editor-tool-card">
          <div>
            <strong>{t('subtitles')}</strong>
            <small>
              {subtitleFile ? `${editorText.loadedSubtitle}: ${subtitleFile.name} / ${subtitleFile.cues.length}` : editorText.noSubtitle}
            </small>
          </div>
          <div className="subtitle-actions">
            <button className="button secondary" onClick={() => void chooseSubtitleFile()} type="button">
              <Upload aria-hidden="true" size={15} />
              {editorText.chooseSubtitle}
            </button>
            <button
              className="button secondary"
              disabled={!subtitleFile}
              onClick={() => {
                pushEditorHistory();
                setSubtitlesVisible((value) => !value);
              }}
              type="button"
            >
              <Eye aria-hidden="true" size={15} />
              {subtitlesVisible ? editorText.hideSubtitle : editorText.showSubtitle}
            </button>
            <button
              className="button secondary"
              disabled={!subtitleFile}
              onClick={() => {
                pushEditorHistory();
                setSubtitleFile(undefined);
                setSubtitlesVisible(true);
              }}
              type="button"
            >
              <X aria-hidden="true" size={15} />
              {editorText.removeSubtitle}
            </button>
          </div>
          {subtitleFile ? (
            <div className="subtitle-cue-editor">
              <div className="subtitle-cue-editor__header">
                <strong>
                  {editorText.currentSubtitleCue}
                  {subtitleFile.edited ? ` / ${editorText.editedSubtitle}` : ''}
                </strong>
                <small>
                  {activeSubtitleCue ? `${activeSubtitleCueIndex + 1} / ${subtitleFile.cues.length}` : editorText.noCueAtPlayhead}
                </small>
              </div>
              {activeSubtitleCue ? (
                <>
                  <textarea
                    aria-label={editorText.currentSubtitleCue}
                    onChange={(event) => updateActiveSubtitleCue({ text: event.currentTarget.value })}
                    value={activeSubtitleCue.text}
                  />
                  <div className="subtitle-cue-editor__times">
                    <TimeField label={editorText.subtitleStart} value={activeSubtitleCue.startSeconds} max={Math.max(0,activeSubtitleCue.endSeconds-.1)} ar={preferences.locale==='ar'} onChange={value=>updateActiveSubtitleCue({startSeconds:value})}/>
                    <TimeField label={editorText.subtitleEnd} value={activeSubtitleCue.endSeconds} min={activeSubtitleCue.startSeconds+.1} max={timelineDuration} ar={preferences.locale==='ar'} onChange={value=>updateActiveSubtitleCue({endSeconds:value})}/>
                  </div>
                  <button className="button secondary" onClick={removeActiveSubtitleCue} type="button">
                    <X aria-hidden="true" size={15} />
                    {editorText.removeSubtitleCue}
                  </button>
                </>
              ) : (
                <button className="button secondary" onClick={addSubtitleCueAtPlayhead} type="button">
                  <Captions aria-hidden="true" size={15} />
                  {editorText.addSubtitleCue}
                </button>
              )}
              <div className="subtitle-actions">
                <button className="button secondary" disabled={!subtitleFile.originalCues || !subtitleFile.edited} onClick={restoreOriginalSubtitle} type="button">
                  <RefreshCcw aria-hidden="true" size={15} />
                  {editorText.restoreOriginalSubtitle}
                </button>
                {translationControls()}
              </div>

            </div>
          ) : null}
        </section>
      </div>
    );
  }

  function renderSelectedEditorTool() {
    switch (selectedLayerId) {
      case 'subtitles':
        return renderTextAndSubtitleTools();
      case 'blur':
        return (
          <div className="editor-tool-panel">
            <label className="range-control">
              <span>{t('blurMask')}</span>
              <RangeInput
                max={32}
                min={0}
                onChange={(event) => {
                  const value = Number(event.currentTarget.value);
                  pushEditorHistory();
                  setBlurStrength(value);
                  if (selectedBlurItem) {
                    updateBlurItem(selectedBlurItem.id, { strength: value });
                  }
                  setActivity(t('effectApplied', { effect: t('blur'), value: value > 0 ? `${value}px` : editorText.disabled }));
                }}
                step={1}
                type="range"
                value={blurStrength}
              />
              <strong>{blurStrength > 0 ? `${blurStrength}px` : editorText.disabled}</strong>
            </label>
            <label className="range-control">
              <span>{t('range')}</span>
              <RangeInput
                max={100}
                min={6}
                onChange={(event) => {
                  const width = Number(event.currentTarget.value);
                  const nextRegion = { ...(selectedBlurItem ? activeRegionForEffect(selectedBlurItem, playheadSeconds) : blurMask), width };
                  pushEditorHistory();
                  if (selectedBlurItem) {
                    updateEffectRegionAtPlayhead('blur', selectedBlurItem.id, nextRegion);
                  } else {
                    setBlurMask(nextRegion);
                  }
                }}
                step={1}
                type="range"
                value={selectedBlurItem ? activeRegionForEffect(selectedBlurItem, playheadSeconds).width : blurMask.width}
              />
              <strong>{formatPercentValue(selectedBlurItem ? activeRegionForEffect(selectedBlurItem, playheadSeconds).width : blurMask.width)}</strong>
            </label>
            <label className="range-control">
              <span>{t('height')}</span>
              <RangeInput
                max={100}
                min={6}
                onChange={(event) => {
                  const height = Number(event.currentTarget.value);
                  const nextRegion = { ...(selectedBlurItem ? activeRegionForEffect(selectedBlurItem, playheadSeconds) : blurMask), height };
                  pushEditorHistory();
                  if (selectedBlurItem) {
                    updateEffectRegionAtPlayhead('blur', selectedBlurItem.id, nextRegion);
                  } else {
                    setBlurMask(nextRegion);
                  }
                }}
                step={1}
                type="range"
                value={selectedBlurItem ? activeRegionForEffect(selectedBlurItem, playheadSeconds).height : blurMask.height}
              />
              <strong>{formatPercentValue(selectedBlurItem ? activeRegionForEffect(selectedBlurItem, playheadSeconds).height : blurMask.height)}</strong>
            </label>
            <small>{editorText.dragBlurHint}</small>
            <button
              className="button secondary"
              onClick={() => {
                pushEditorHistory();
                setBlurStrength(0);
                if (selectedBlurItem) {
                  updateBlurItem(selectedBlurItem.id, { strength: 0 });
                }
              }}
              type="button"
            >
              <RefreshCcw aria-hidden="true" size={15} />
              {editorText.reset}
            </button>
          </div>
        );
      case 'zoom':
        return (
          <div className="editor-tool-panel">
            <label className="range-control">
              <span>{t('zoomKeyframes')}</span>
              <RangeInput
                max={8}
                min={1}
                onChange={(event) => {
                  const value = Number(event.currentTarget.value);
                  pushEditorHistory();
                  setZoomScale(value);
                  const size = roundedPercent(clampRangeValue(100 / value, 8, 100));
                  const nextRegion = { ...(selectedZoomItem ? activeRegionForEffect(selectedZoomItem, playheadSeconds) : zoomRegion), width: size, height: size };

                  if (selectedZoomItem) {
                    updateEffectRegionAtPlayhead('zoom', selectedZoomItem.id, nextRegion, value);
                  } else {
                    setZoomRegion(nextRegion);
                  }
                  setActivity(t('effectApplied', { effect: t('zoom'), value: `${value.toFixed(2)}x` }));
                }}
                step={0.05}
                type="range"
                value={zoomScale}
              />
              <strong>{zoomScale.toFixed(2)}x</strong>
            </label>
            <label className="range-control">
              <span>{t('range')}</span>
              <RangeInput
                max={100}
                min={8}
                onChange={(event) => {
                  const width = Number(event.currentTarget.value);
                  const nextScale = clampRangeValue(100 / width, 1, 8);
                  const nextRegion = { ...(selectedZoomItem ? activeRegionForEffect(selectedZoomItem, playheadSeconds) : zoomRegion), width };

                  pushEditorHistory();
                  setZoomScale(nextScale);
                  if (selectedZoomItem) {
                    updateEffectRegionAtPlayhead('zoom', selectedZoomItem.id, nextRegion, nextScale);
                  } else {
                    setZoomRegion(nextRegion);
                  }
                }}
                step={1}
                type="range"
                value={selectedZoomItem ? activeRegionForEffect(selectedZoomItem, playheadSeconds).width : zoomRegion.width}
              />
              <strong>{formatPercentValue(selectedZoomItem ? activeRegionForEffect(selectedZoomItem, playheadSeconds).width : zoomRegion.width)}</strong>
            </label>
            <label className="range-control">
              <span>{t('height')}</span>
              <RangeInput
                max={100}
                min={8}
                onChange={(event) => {
                  const nextRegion = { ...(selectedZoomItem ? activeRegionForEffect(selectedZoomItem, playheadSeconds) : zoomRegion), height: Number(event.currentTarget.value) };
                  pushEditorHistory();
                  if (selectedZoomItem) {
                    updateEffectRegionAtPlayhead('zoom', selectedZoomItem.id, nextRegion);
                  } else {
                    setZoomRegion(nextRegion);
                  }
                }}
                step={1}
                type="range"
                value={selectedZoomItem ? activeRegionForEffect(selectedZoomItem, playheadSeconds).height : zoomRegion.height}
              />
              <strong>{formatPercentValue(selectedZoomItem ? activeRegionForEffect(selectedZoomItem, playheadSeconds).height : zoomRegion.height)}</strong>
            </label>
            <button
              className="button secondary"
              onClick={() => {
                pushEditorHistory();
                setZoomScale(1);
                if (selectedZoomItem) {
                  updateZoomItem(selectedZoomItem.id, { scale: 1 });
                }
              }}
              type="button"
            >
              <RefreshCcw aria-hidden="true" size={15} />
              {editorText.reset}
            </button>
          </div>
        );
      case 'speed':
        return (
          <div className="editor-tool-panel">
            <label className="range-control">
              <span>{t('speedPreview')}</span>
              <RangeInput
                max={8}
                min={0.25}
                onChange={(event) => {
                  const value = Number(event.currentTarget.value);
                  pushEditorHistory();
                  setSpeedRate(value);
                  if (selectedSpeedItem) {
                    updateSpeedItem(selectedSpeedItem.id, { rate: value });
                  }
                  setActivity(t('effectApplied', { effect: t('speed'), value: `${value.toFixed(2)}x` }));
                }}
                step={0.25}
                type="range"
                value={speedRate}
              />
              <strong>{speedRate.toFixed(2)}x</strong>
            </label>
            <button
              className="button secondary"
              onClick={() => {
                pushEditorHistory();
                setSpeedRate(1);
                if (selectedSpeedItem) {
                  updateSpeedItem(selectedSpeedItem.id, { rate: 1 });
                }
              }}
              type="button"
            >
              <RefreshCcw aria-hidden="true" size={15} />
              {editorText.reset}
            </button>
            <small className="editor-tool-note">{speedEditorHint()}</small>
          </div>
        );
      case 'cuts':
      default:
        return (
          <div className="editor-tool-panel editor-tool-panel--compact">
            <span className="editor-chip">
              {t('trimStart')}
              <strong>{formatDuration(trimStartSeconds)}</strong>
            </span>
            <span className="editor-chip">
              {t('playhead')}
              <strong>{formatDuration(playheadSeconds)}</strong>
            </span>
            <span className="editor-chip">
              {t('trimEnd')}
              <strong>{formatDuration(effectiveTrimEnd)}</strong>
            </span>
            <span className="editor-chip">
              {editorText.keepRange}
              <strong>{keptRanges.length}</strong>
            </span>
          </div>
        );
    }
  }

  void renderSelectedEditorTool;

  function isTimelineSeekSurface(target: EventTarget | null, event?: ReactPointerEvent<HTMLDivElement>): boolean {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    if (target.closest('button, input, textarea, select, .timeline-segment, .timeline-segment__handle')) {
      return false;
    }

    const isBoardOrTrackArea = Boolean(target.closest('.timeline-board, .timeline-row__track, .timeline-ruler, .timeline-playhead'));

    if (!isBoardOrTrackArea) {
      return false;
    }

    if (event) {
      const rect = timelineTrackRect();
      if (rect) {
        const x = event.clientX;
        const y = event.clientY;
        const elements = document.elementsFromPoint(x, y);
        for (const el of elements) {
          if (el instanceof HTMLElement && el.closest('.timeline-segment')) {
            return false;
          }
        }
      }
    }

    return true;
  }

  function renderTimeline() {
    const playheadPercent = timelineViewportRatioForSeconds(playheadSeconds, timelineViewport) * 100;
    const trimWindow = normalizeEffectWindow({ startSeconds: trimStartSeconds, endSeconds: effectiveTrimEnd }, timelineDuration);
    const primaryTextOverlay = selectedTextOverlay;
    const visibleLayerIds = new Set<EditorLayerId>(editorLayerIdsForMedia(selectedEditorMediaKind));
    const MediaTimelineIcon = isAudioEditor ? AudioLines : Film;
    const mediaTimelineLabel = isAudioEditor ? uiText(preferences.locale, 'Audio', 'الصوت') : t('media');
    const rulerTicks = [0, 0.25, 0.5, 0.75, 1].map((tick) => ({
      tick,
      seconds: timelineViewportSecondsFromRatio(tick, timelineViewport)
    }));
    const formatTimelineRange = (windowValue: EffectWindow) =>
      `${formatTimecode(windowValue.startSeconds)} - ${formatTimecode(windowValue.endSeconds)}`;
    const segmentStyle = (windowValue: EffectWindow) => {
      const normalized = normalizeEffectWindow(windowValue, timelineDuration);
      const viewportStart = Math.min(timelineViewport.startSeconds, timelineViewport.endSeconds);
      const viewportEnd = Math.max(timelineViewport.startSeconds, timelineViewport.endSeconds);
      const viewportDuration = Math.max(0.001, viewportEnd - viewportStart);
      const rangeStart = Math.min(normalized.startSeconds, normalized.endSeconds);
      const rangeEnd = Math.max(normalized.startSeconds, normalized.endSeconds);
      const visibleStart = Math.max(rangeStart, viewportStart);
      const visibleEnd = Math.min(rangeEnd, viewportEnd);

      if (visibleEnd <= visibleStart) {
        return {
          '--segment-start': `${((rangeStart - viewportStart) / viewportDuration) * 100}%`,
          '--segment-width': `${Math.max(0.1, ((rangeEnd - rangeStart) / viewportDuration) * 100)}%`
        } as CSSProperties;
      }

      return {
        '--segment-start': `${((visibleStart - viewportStart) / viewportDuration) * 100}%`,
        '--segment-width': `${Math.max(0.1, ((visibleEnd - visibleStart) / viewportDuration) * 100)}%`
      } as CSSProperties;
    };
    const renderSegment = ({
      layerId,
      label,
      windowValue,
      tone,
      enabled,
      handles = false,
      selected,
      conflict = false,
      dragTarget,
      startHandleTarget: customStartHandleTarget,
      endHandleTarget: customEndHandleTarget
    }: {
      readonly layerId: string;
      readonly label: string;
      readonly windowValue: EffectWindow;
      readonly tone: TimelineLayer['tone'] | 'media' | 'cutout' | 'text';
      readonly enabled: boolean;
      readonly handles?: boolean;
      readonly selected?: boolean;
      readonly conflict?: boolean;
      readonly dragTarget?: TimelineSegmentDragStart;
      readonly startHandleTarget?: TimelineHandleTarget;
      readonly endHandleTarget?: TimelineHandleTarget;
    }) => {
      if (!enabled) {
        return <span className="timeline-empty-pill">{editorText.disabled}</span>;
      }

      const effectLayerId = isEffectLayerId(layerId) ? layerId : undefined;
      const segmentDragTarget: TimelineSegmentDragStart | undefined =
        dragTarget ??
        (layerId === 'cuts'
          ? { kind: 'trim', startSeconds: windowValue.startSeconds, endSeconds: windowValue.endSeconds }
            : effectLayerId
            ? { kind: 'effect', layerId: effectLayerId, startSeconds: windowValue.startSeconds, endSeconds: windowValue.endSeconds }
            : layerId === 'subtitles' && primaryTextOverlay
              ? { kind: 'text', id: primaryTextOverlay.id, startSeconds: windowValue.startSeconds, endSeconds: windowValue.endSeconds }
              : undefined);
      const startHandleTarget: TimelineHandleTarget | undefined =
        customStartHandleTarget ??
        (layerId === 'cuts'
          ? { kind: 'trim', edge: 'start' }
          : effectLayerId
            ? { kind: 'effect', layerId: effectLayerId, edge: 'start' }
            : layerId === 'subtitles' && primaryTextOverlay
              ? { kind: 'text', id: primaryTextOverlay.id, edge: 'start' }
              : undefined);
      const endHandleTarget: TimelineHandleTarget | undefined =
        customEndHandleTarget ??
        (layerId === 'cuts'
          ? { kind: 'trim', edge: 'end' }
          : effectLayerId
            ? { kind: 'effect', layerId: effectLayerId, edge: 'end' }
            : layerId === 'subtitles' && primaryTextOverlay
              ? { kind: 'text', id: primaryTextOverlay.id, edge: 'end' }
              : undefined);
      const isActiveAtPlayhead = playheadSeconds >= windowValue.startSeconds && playheadSeconds <= windowValue.endSeconds;
      const isSegmentSelected = selected ?? selectedLayerIdForMedia === layerId;

      return (
        <button
          key={layerId+'-'+(segmentDragTarget&&'id' in segmentDragTarget?segmentDragTarget.id:'')}
          aria-label={`${label}: ${formatTimelineRange(windowValue)}`}
          data-tooltip={`${label}: ${formatTimelineRange(windowValue)}`}
          aria-pressed={isSegmentSelected}
          className={`timeline-segment timeline-segment--${tone}${isSegmentSelected ? ' selected' : ''}${isActiveAtPlayhead ? ' active' : ''}${conflict ? ' conflict' : ''}`}
          onClick={() => {
            activateTimelineSelection();
            if (segmentDragTarget?.kind === 'audio-section') {
              selectAudioSection(segmentDragTarget.id);
            } else if (layerId.startsWith('cutout-')) {
              setSelectedCutOutId(Number(layerId.replace('cutout-', '')));
              setSelectedTextOverlayId(undefined);
              setSelectedEffectItemId(undefined);
              setSelectedLayerId('cuts');
            } else if (layerId.startsWith('text-')) {
              setSelectedTextOverlayId(Number(layerId.replace('text-', '')));
              setSelectedEffectItemId(undefined);
              setSelectedCutOutId(undefined);
              setSelectedLayerId('text');
            } else if (segmentDragTarget?.kind === 'effect' && segmentDragTarget.id) {
              selectEffectItem(segmentDragTarget.layerId, segmentDragTarget.id);
            } else if (layerId === 'media-full') {
              setSelectedTextOverlayId(undefined);
              setSelectedEffectItemId(undefined);
              setSelectedCutOutId(undefined);
              setSelectedLayerId('cuts');
            } else {
              setSelectedTextOverlayId(undefined);
              setSelectedEffectItemId(undefined);
              setSelectedCutOutId(undefined);
              setSelectedLayerId(normalizeEditorLayerForMedia(selectedEditorMediaKind, layerId));
            }
          }}
          onContextMenu={(event) => {
            activateTimelineSelection();
            if (segmentDragTarget?.kind === 'audio-section') {
              event.preventDefault();
              selectAudioSection(segmentDragTarget.id);
            } else if (layerId.startsWith('cutout-')) {
              setSelectedCutOutId(Number(layerId.replace('cutout-', '')));
              setSelectedTextOverlayId(undefined);
              setSelectedEffectItemId(undefined);
              setSelectedLayerId('cuts');
              openEditorContextMenu(event, 'cutout');
            } else if (layerId.startsWith('text-')) {
              setSelectedTextOverlayId(Number(layerId.replace('text-', '')));
              setSelectedEffectItemId(undefined);
              setSelectedCutOutId(undefined);
              setSelectedLayerId('text');
              openEditorContextMenu(event, 'text');
            } else if (segmentDragTarget?.kind === 'effect' && segmentDragTarget.id) {
              selectEffectItem(segmentDragTarget.layerId, segmentDragTarget.id);
              openEditorContextMenu(event, 'timeline');
            } else if (layerId === 'media-full') {
              setSelectedTextOverlayId(undefined);
              setSelectedEffectItemId(undefined);
              setSelectedCutOutId(undefined);
              setSelectedLayerId('cuts');
              openEditorContextMenu(event, 'timeline');
            } else if (effectLayerId) {
              setSelectedTextOverlayId(undefined);
              setSelectedCutOutId(undefined);
              setSelectedLayerId(effectLayerId);
              openEditorContextMenu(event, 'timeline');
            } else {
              openEditorContextMenu(event, 'timeline');
            }
          }}
          style={segmentStyle(windowValue)}
          type="button"
          {...(segmentDragTarget ? bindTimelineSegment(segmentDragTarget) : {})}
        >
          <span>{label}</span>
          <small>{formatTimelineRange(windowValue)}</small>
          {handles && startHandleTarget && endHandleTarget ? (
            <>
              <span className="timeline-segment__handle start" {...bindTimelineHandle(startHandleTarget)} />
              <span className="timeline-segment__handle end" {...bindTimelineHandle(endHandleTarget)} />
            </>
          ) : null}
        </button>
      );
    };

    const timelineToolbar = (
      <>
        <span className="timeline-toolbar-chip">
          <Scissors aria-hidden="true" size={13} />
          {editorText.keepRange}: {formatTimelineRange(trimWindow)}
        </span>
        <span className="timeline-toolbar-chip">
          {editorText.snapOn}
        </span>
        <span className="timeline-toolbar-chip">
          <ZoomIn aria-hidden="true" size={13} />
          {Math.round(timelineZoom * 100)}%
        </span>
        {selectedCutOut ? (
          <button className="button secondary" onClick={removeSelectedCutOut} type="button">
            <X aria-hidden="true" size={15} />
            {editorText.removeCutOut}
          </button>
        ) : null}
      </>
    );

    return (
      <TimelineView
        boardRef={trimTimelineRef}
        title={uiText(preferences.locale, 'Timeline', 'الخط الزمني')}
        onPointerDown={(event) => {
          if (!isTimelineSeekSurface(event.target, event)) {
            return;
          }

          setEditorContextMenu(undefined);
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          timelineScrubRef.current = true;
          timelineScrubPointerIdRef.current = event.pointerId;
          updatePlayhead(timelineSecondsFromPointer(event.clientX));
        }}
        onPointerMove={(event) => {
          if (timelineScrubRef.current && event.buttons === 1) {
            updatePlayhead(timelineSecondsFromPointer(event.clientX));
          }
        }}
        onPointerUp={() => {
          timelineScrubRef.current = false;
          timelineScrubPointerIdRef.current = undefined;
        }}
        onPointerCancel={() => {
          timelineScrubRef.current = false;
          timelineScrubPointerIdRef.current = undefined;
        }}
        onWheel={updateTimelineZoomFromWheel}
        currentTimeLabel={formatDuration(playheadSeconds)}
        durationLabel={`${formatTimelineRange(timelineViewport)} / ${formatDuration(timelineDuration)}`}
        playheadPercent={playheadPercent}
        toolbar={timelineToolbar}
      >
          <div className="timeline-ruler" aria-hidden="true">
            {rulerTicks.map(({ tick, seconds }) => (
              <span key={tick} style={{ insetInlineStart: `${tick * 100}%` }}>
                {formatDuration(seconds)}
              </span>
            ))}
          </div>
          <div className="timeline-row timeline-row--media">
            <span className="timeline-row__label">
              <MediaTimelineIcon aria-hidden="true" size={14} />
              {mediaTimelineLabel}
            </span>
            <div className="timeline-row__track">
              {renderSegment({
                layerId: 'media-full',
                label: displayMediaTitle(selectedMedia),
                windowValue: { startSeconds: 0, endSeconds: timelineDuration },
                tone: 'media',
                enabled: true
              })}
            </div>
          </div>
          {audioSections.length>0&&<div className="timeline-row timeline-row--sound"><span className="timeline-row__label"><AudioLines size={14}/>{uiText(preferences.locale,'Sound sections','أجزاء الصوت')}</span><div className="timeline-row__track">{audioSections.map((section,i)=>renderSegment({layerId:`audio-section-${section.id}`,label:`${uiText(preferences.locale,'Sound','الصوت')} ${i+1}`,windowValue:section,tone:'speed',enabled:true,handles:true,selected:selectedAudioSectionId===section.id,dragTarget:{kind:'audio-section',id:section.id,startSeconds:section.startSeconds,endSeconds:section.endSeconds},startHandleTarget:{kind:'audio-section',id:section.id,edge:'start'},endHandleTarget:{kind:'audio-section',id:section.id,edge:'end'}}))}</div></div>}
          {cutOutRanges.length > 0 ? (
          <div className="timeline-row">
            <span className="timeline-row__label">
              <Scissors aria-hidden="true" size={14} />
              {editorText.cutOutTrack}
            </span>
            <div className="timeline-row__track">
              {cutOutRanges.length === 0
                ? <span className="timeline-empty-pill">{editorText.disabled}</span>
                : cutOutRanges.map((cutOut, index) =>
                    renderSegment({
                      layerId: `cutout-${cutOut.id}`,
                      label: `${editorText.cutOut} ${index + 1}`,
                      windowValue: cutOut,
                      tone: 'cutout',
                      enabled: true,
                      handles: true,
                      selected: selectedCutOutId === cutOut.id,
                      dragTarget: {
                        kind: 'cutout',
                        id: cutOut.id,
                        startSeconds: cutOut.startSeconds,
                        endSeconds: cutOut.endSeconds
                      },
                      startHandleTarget: { kind: 'cutout', id: cutOut.id, edge: 'start' },
                      endHandleTarget: { kind: 'cutout', id: cutOut.id, edge: 'end' }
                    })
                  )}
            </div>
          </div>
          ) : null}
          {visibleLayerIds.has('blur') && blurItems.length > 0 ? (
          <div className="timeline-row">
            <span className="timeline-row__label">
              <Layers3 aria-hidden="true" size={14} />
              {t('blur')}
            </span>
            <div className="timeline-row__track">
              {blurItems.length === 0
                ? <span className="timeline-empty-pill">{editorText.disabled}</span>
                : blurItems.map((item, index) =>
                    renderSegment({
                      layerId: 'blur',
                      label: item.name || `${t('blur')} ${index + 1}`,
                      windowValue: { startSeconds: item.startTime, endSeconds: item.endTime },
                      tone: 'blur',
                      enabled: true,
                      handles: true,
                      selected: selectedEffectItemId === item.id,
                      dragTarget: {
                        kind: 'effect',
                        id: item.id,
                        layerId: 'blur',
                        startSeconds: item.startTime,
                        endSeconds: item.endTime
                      },
                      startHandleTarget: { kind: 'effect', id: item.id, layerId: 'blur', edge: 'start' },
                      endHandleTarget: { kind: 'effect', id: item.id, layerId: 'blur', edge: 'end' }
                    })
                  )}
            </div>
          </div>
          ) : null}
          {visibleLayerIds.has('zoom') && zoomItems.length > 0 ? (
          <div className="timeline-row">
            <span className="timeline-row__label">
              <ZoomIn aria-hidden="true" size={14} />
              {t('zoom')}
            </span>
            <div className="timeline-row__track">
              {zoomItems.length === 0
                ? <span className="timeline-empty-pill">{editorText.disabled}</span>
                : zoomItems.map((item, index) =>
                    renderSegment({
                      layerId: 'zoom',
                      label: item.name || `${t('zoom')} ${index + 1}`,
                      windowValue: { startSeconds: item.startTime, endSeconds: item.endTime },
                      tone: 'zoom',
                      enabled: true,
                      handles: true,
                      selected: selectedEffectItemId === item.id,
                      conflict: overlappingZoomItemIds.has(item.id),
                      dragTarget: {
                        kind: 'effect',
                        id: item.id,
                        layerId: 'zoom',
                        startSeconds: item.startTime,
                        endSeconds: item.endTime
                      },
                      startHandleTarget: { kind: 'effect', id: item.id, layerId: 'zoom', edge: 'start' },
                      endHandleTarget: { kind: 'effect', id: item.id, layerId: 'zoom', edge: 'end' }
                    })
                  )}
            </div>
          </div>
          ) : null}
          {speedItems.length > 0 ? (
          <div className="timeline-row">
            <span className="timeline-row__label">
              <Gauge aria-hidden="true" size={14} />
              {t('speed')}
            </span>
            <div className="timeline-row__track">
              {speedItems.length === 0
                ? <span className="timeline-empty-pill">{editorText.disabled}</span>
                : speedItems.map((item, index) =>
                    renderSegment({
                      layerId: 'speed',
                      label: item.name || `${t('speed')} ${index + 1}`,
                      windowValue: { startSeconds: item.startTime, endSeconds: item.endTime },
                      tone: 'speed',
                      enabled: true,
                      handles: true,
                      selected: selectedEffectItemId === item.id,
                      dragTarget: {
                        kind: 'effect',
                        id: item.id,
                        layerId: 'speed',
                        startSeconds: item.startTime,
                        endSeconds: item.endTime
                      },
                      startHandleTarget: { kind: 'effect', id: item.id, layerId: 'speed', edge: 'start' },
                      endHandleTarget: { kind: 'effect', id: item.id, layerId: 'speed', edge: 'end' }
                    })
                  )}
            </div>
          </div>
          ) : null}
          {visibleLayerIds.has('reframe') && reframeItems.length > 0 ? (
          <div className="timeline-row">
            <span className="timeline-row__label">
              <Crop aria-hidden="true" size={14} />
              {uiText(preferences.locale, 'Canvas', 'تغيير المقاس')}
            </span>
            <div className="timeline-row__track">
              {reframeItems.length === 0
                ? <span className="timeline-empty-pill">{editorText.disabled}</span>
                : reframeItems.map((item) =>
                    renderSegment({
                      layerId: 'reframe',
                      label: uiText(preferences.locale, 'Full video', 'الفيديو كاملاً'),
                      windowValue: { startSeconds: 0, endSeconds: timelineDuration },
                      tone: 'blur',
                      enabled: true,
                      handles: false,
                      selected: selectedEffectItemId === item.id,
                      dragTarget: {
                        kind: 'effect',
                        id: item.id,
                        layerId: 'reframe',
                        startSeconds: 0,
                        endSeconds: timelineDuration
                      }
                    })
                  )}
            </div>
          </div>
          ) : null}
          {visibleLayerIds.has('text') && textOverlays.length > 0 ? (
          <div className="timeline-row">
            <span className="timeline-row__label">
              <Captions aria-hidden="true" size={14} />
              {editorText.textTrack}
            </span>
            <div className="timeline-row__track">
              {textOverlays.length === 0
                ? <span className="timeline-empty-pill">{editorText.disabled}</span>
                : textOverlays.map((overlay) =>
                    renderSegment({
                      layerId: `text-${overlay.id}`,
                      label: overlay.text || editorText.textLayer,
                      windowValue: { startSeconds: overlay.startSeconds, endSeconds: overlay.endSeconds },
                      tone: 'text',
                      enabled: true,
                      handles: true,
                      selected: selectedTextOverlayId === overlay.id,
                      dragTarget: {
                        kind: 'text',
                        id: overlay.id,
                        startSeconds: overlay.startSeconds,
                        endSeconds: overlay.endSeconds
                      },
                      startHandleTarget: { kind: 'text', id: overlay.id, edge: 'start' },
                      endHandleTarget: { kind: 'text', id: overlay.id, edge: 'end' }
                    })
                  )}
            </div>
          </div>
          ) : null}
          {visibleLayerIds.has('subtitles') && Boolean(subtitleFile) ? (
          <div className="timeline-row">
            <span className="timeline-row__label">
              <Captions aria-hidden="true" size={14} />
              {t('subtitles')}
            </span>
            <div className="timeline-row__track">
              {renderSegment({
                layerId: 'subtitles',
                label: subtitleFile ? subtitleFile.name : editorText.noSubtitle,
                windowValue: trimWindow,
                tone: 'subtitle',
                enabled: Boolean(subtitleFile)
              })}
            </div>
          </div>
          ) : null}
        </TimelineView>
    );
  }

  function outputActionIcon(kind: EditorOutputActionKind): LucideIcon {
    switch (kind) {
      case 'copy-video':
        return Film;
      case 'copy-gif':
        return RefreshCcw;
      case 'save-video':
      case 'save-gif':
      case 'save-frame':
        return Download;
      case 'copy-frame':
        return Image;
      case 'copy-audio':
        return AudioLines;
      case 'save-audio':
        return Download;
    }
  }

  function renderOutputMenu() {
    const actions = resolvedEditorOutputActions();

    return (
      <OutputDropdown
        actions={actions}
        busy={outputBusy}
        iconForAction={outputActionIcon}
        locale={preferences.locale}
        menuRef={outputMenuRef}
        onRun={(kind) => void runEditorOutput(kind)}
        onToggle={() => setOutputMenuOpen((open) => !open)}
        open={outputMenuOpen}
      />
    );
  }

  function autosaveLabel(): string {
    switch (autosaveState) {
      case 'saving':
        return uiText(preferences.locale, 'Saving...', 'جارٍ الحفظ...');
      case 'saved':
        return lastSavedAt
          ? uiText(
              preferences.locale,
              `Saved locally ${new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
              `محفوظ محليًا ${new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            )
          : uiText(preferences.locale, 'Saved locally', 'محفوظ محليًا');
      case 'failed':
        return uiText(preferences.locale, 'Autosave failed', 'فشل الحفظ التلقائي');
      case 'idle':
      default:
        return hasRealMedia ? uiText(preferences.locale, 'Restore ready', 'جاهز للاسترجاع') : uiText(preferences.locale, 'No media session', 'لا توجد جلسة وسائط');
    }
  }

  function renderInspectorNumberField(
    label: string,
    value: number,
    onChange: (value: number) => void,
    options: { readonly min?: number; readonly max?: number; readonly step?: number; readonly suffix?: string } = {}
  ) {
    return (
      <label className="inspector-field">
        <span>{label}</span>
        <div>
          <input
            max={options.max}
            min={options.min}
            onChange={(event) => onChange(Number(event.currentTarget.value))}
            step={options.step ?? 0.1}
            type="number"
            value={Number.isInteger(value) ? value : Number(value.toFixed(2))}
          />
          {options.suffix ? <small>{options.suffix}</small> : null}
        </div>
      </label>
    );
  }

  function renderInspectorTextField(label: string, value: string, onChange: (value: string) => void) {
    return (
      <label className="inspector-field">
        <span>{label}</span>
        <input onChange={(event) => onChange(event.currentTarget.value)} value={value} />
      </label>
    );
  }

  function renderInspectorToggles() {
    const locked = Boolean(selectedTextOverlay?.locked || selectedBlurItem?.locked || selectedZoomItem?.locked || selectedSpeedItem?.locked || selectedReframeItem?.locked);
    const hidden = Boolean(selectedTextOverlay?.hidden || selectedBlurItem?.hidden || selectedZoomItem?.hidden || selectedSpeedItem?.hidden || selectedReframeItem?.hidden);
    const isReframe = selectedLayerIdForMedia === 'reframe';

    return (
      <div className="inspector-actions">
        {!isReframe ? (
        <button className="button secondary" onClick={duplicateSelectedTimelineItem} type="button">
          <Clipboard aria-hidden="true" size={14} />
          {inspectorText.duplicate}
        </button>
        ) : null}
        <button aria-pressed={locked} className="button secondary" onClick={toggleSelectedLock} type="button">
          {locked ? inspectorText.unlocked : inspectorText.locked}
        </button>
        <button aria-pressed={!hidden} className="button secondary" onClick={toggleSelectedVisibility} type="button">
          {hidden ? inspectorText.show : inspectorText.hidden}
        </button>
        <button className="button secondary danger" onClick={deleteSelectedTimelineItem} type="button">
          <X aria-hidden="true" size={14} />
          {inspectorText.delete}
        </button>
      </div>
    );
  }

  function renderInspectorTimingFields(
    startSeconds: number,
    endSeconds: number,
    updateWindow: (windowValue: EffectWindow) => void
  ) {
    const duration = Math.max(0, endSeconds - startSeconds);

    return (
      <div className="inspector-section">
        <strong>{inspectorText.timing}</strong>
        <div className="inspector-grid">
          <TimeField label={inspectorText.start} value={startSeconds} min={0} max={Math.max(0,endSeconds-timelineItemMinimumSeconds)} ar={preferences.locale==='ar'} onChange={value=>{
            pushEditorHistory();
            updateWindow({ startSeconds: clampRangeValue(value, 0, Math.max(0, endSeconds - timelineItemMinimumSeconds)), endSeconds });
          }}/>
          <TimeField label={inspectorText.end} value={endSeconds} min={startSeconds+timelineItemMinimumSeconds} max={timelineDuration} ar={preferences.locale==='ar'} onChange={value=>{
            pushEditorHistory();
            updateWindow({ startSeconds, endSeconds: clampRangeValue(value, startSeconds + timelineItemMinimumSeconds, timelineDuration) });
          }}/>
          <label className="inspector-field readonly">
            <span>{inspectorText.duration}</span>
            <strong dir="ltr">{formatTimecode(duration)}</strong>
          </label>
        </div>
      </div>
    );
  }

  function renderRegionFields(region: BlurMask, updateRegion: (region: BlurMask) => void) {
    const update = (patch: Partial<BlurMask>) => {
      pushEditorHistory();
      updateRegion({ ...region, ...patch });
    };

    return (
      <details className="inspector-section inspector-advanced">
        <summary>{uiText(preferences.locale, 'Position & size', 'الموضع والحجم')}</summary>
        <div className="inspector-grid inspector-grid--four">
          {renderInspectorNumberField('X', region.x, (value) => update({ x: roundedPercent(clampRangeValue(value, 0, 100)) }), { min: 0, max: 100, step: 1, suffix: '%' })}
          {renderInspectorNumberField('Y', region.y, (value) => update({ y: roundedPercent(clampRangeValue(value, 0, 100)) }), { min: 0, max: 100, step: 1, suffix: '%' })}
          {renderInspectorNumberField('W', region.width, (value) => update({ width: roundedPercent(clampRangeValue(value, 4, 100)) }), { min: 4, max: 100, step: 1, suffix: '%' })}
          {renderInspectorNumberField('H', region.height, (value) => update({ height: roundedPercent(clampRangeValue(value, 4, 100)) }), { min: 4, max: 100, step: 1, suffix: '%' })}
        </div>
      </details>
    );
  }

  function updateEffectRegionAtPlayhead(layerId: 'blur' | 'zoom', id: string, region: BlurMask, scale?: number) {
    pausePlaybackForPreciseRegionEdit();

    if (layerId === 'blur') {
      const item = blurItems.find((candidate) => candidate.id === id);
      setBlurMask(region);
      updateBlurItem(
        id,
        item?.trackingEnabled
          ? { keyframes: upsertRegionKeyframe(item.keyframes, playheadSeconds, region), trackingEnabled: true }
          : { region }
      );
      return;
    }

    const item = zoomItems.find((candidate) => candidate.id === id);
    const nextScale = scale ?? clampRangeValue(100 / Math.max(1, region.width), 1, 8);
    setZoomRegion(region);
    setZoomScale(nextScale);
    updateZoomItem(
      id,
      item?.trackingEnabled
        ? { keyframes: upsertRegionKeyframe(item.keyframes, playheadSeconds, region), trackingEnabled: true, scale: nextScale }
        : { region, scale: nextScale }
    );
  }

  function startEffectTracking(layerId: 'blur' | 'zoom', item: BlurEffectItem | ZoomEffectItem) {
    const region = activeRegionForEffect(item, playheadSeconds);
    pushEditorHistory();

    if (layerId === 'blur') {
      updateBlurItem(item.id, {
        keyframes: upsertRegionKeyframe(item.keyframes, playheadSeconds, region),
        trackingEnabled: true
      });
      setBlurMask(region);
    } else {
      updateZoomItem(item.id, {
        keyframes: upsertRegionKeyframe(item.keyframes, playheadSeconds, region),
        trackingEnabled: true
      });
      setZoomRegion(region);
    }

    setActivity(uiText(preferences.locale, 'Tracking keyframes enabled.', 'تم تفعيل نقاط الحركة.'));
  }

  function resetEffectTracking(layerId: 'blur' | 'zoom', item: BlurEffectItem | ZoomEffectItem) {
    setTrackingMessage(undefined);
    setTrackingModes(modes => ({ ...modes, [item.id]: 'automatic' }));
    pushEditorHistory();

    if (layerId === 'blur') {
      updateBlurItem(item.id, { keyframes: [], trackingEnabled: false });
    } else {
      updateZoomItem(item.id, { keyframes: [], trackingEnabled: false });
    }

    setActivity(uiText(preferences.locale, 'Tracking keyframes reset.', 'تمت إعادة ضبط نقاط الحركة.'));
  }

  function addManualEffectKeyframe(layerId: 'blur' | 'zoom', item: BlurEffectItem | ZoomEffectItem) {
    const region = activeRegionForEffect(item, playheadSeconds);
    pushEditorHistory();

    if (layerId === 'blur') {
      updateBlurItem(item.id, {
        keyframes: upsertRegionKeyframe(item.keyframes, playheadSeconds, region),
        trackingEnabled: true
      });
    } else {
      updateZoomItem(item.id, {
        keyframes: upsertRegionKeyframe(item.keyframes, playheadSeconds, region),
        trackingEnabled: true
      });
    }

    setActivity(uiText(preferences.locale, 'Keyframe saved at the playhead.', 'حُفظ نقطة حركة عند المؤشر.'));
  }

  function trackingMinimumSizeForLayer(layerId: 'blur' | 'zoom'): number {
    return layerId === 'zoom' ? 8 : 6;
  }

  function roundedTrackingSeconds(seconds: number): number {
    return Math.round(Math.max(0, seconds) * 1000) / 1000;
  }

  function trackingSampleTimes(startSeconds: number, endSeconds: number, anchorSeconds?: number): readonly number[] {
    const safeStart = Math.max(0, startSeconds);
    const safeEnd = Math.max(safeStart + timelineItemMinimumSeconds, endSeconds);
    const duration = safeEnd - safeStart;
    const sampleCount = Math.min(481, Math.max(5, Math.ceil(duration / 0.125) + 1));
    const times = new Set<number>();

    for (let index = 0; index < sampleCount; index += 1) {
      times.add(roundedTrackingSeconds(safeStart + (duration * index) / Math.max(1, sampleCount - 1)));
    }

    if (anchorSeconds !== undefined) {
      times.add(roundedTrackingSeconds(clampRangeValue(anchorSeconds, safeStart, safeEnd)));
    }

    return Array.from(times).sort((left, right) => left - right);
  }

  function lumaFrameFromVideo(video: HTMLVideoElement, context: CanvasRenderingContext2D, width: number, height: number): Uint8ClampedArray {
    context.drawImage(video, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;
    const luma = new Uint8ClampedArray(width * height);

    for (let sourceIndex = 0, targetIndex = 0; sourceIndex < pixels.length; sourceIndex += 4, targetIndex += 1) {
      luma[targetIndex] = Math.round(pixels[sourceIndex] * 0.299 + pixels[sourceIndex + 1] * 0.587 + pixels[sourceIndex + 2] * 0.114);
    }

    return luma;
  }

  function pixelRectFromRegion(region: BlurMask, frameWidth: number, frameHeight: number, minimumSize: number): PixelTrackingRect {
    const minWidth = Math.max(8, (frameWidth * minimumSize) / 100);
    const minHeight = Math.max(8, (frameHeight * minimumSize) / 100);
    const width = Math.round(clampRangeValue((region.width / 100) * frameWidth, minWidth, frameWidth));
    const height = Math.round(clampRangeValue((region.height / 100) * frameHeight, minHeight, frameHeight));
    const centerX = (region.x / 100) * frameWidth;
    const centerY = (region.y / 100) * frameHeight;

    return {
      x: Math.round(clampRangeValue(centerX - width / 2, 0, Math.max(0, frameWidth - width))),
      y: Math.round(clampRangeValue(centerY - height / 2, 0, Math.max(0, frameHeight - height))),
      width,
      height
    };
  }

  function regionFromPixelRect(rect: PixelTrackingRect, frameWidth: number, frameHeight: number, minimumSize: number): BlurMask {
    return clampPreviewRegion(
      {
        x: ((rect.x + rect.width / 2) / Math.max(1, frameWidth)) * 100,
        y: ((rect.y + rect.height / 2) / Math.max(1, frameHeight)) * 100,
        width: (rect.width / Math.max(1, frameWidth)) * 100,
        height: (rect.height / Math.max(1, frameHeight)) * 100
      },
      minimumSize
    );
  }

  async function selectedRegionTrackingKeyframes(
    video: HTMLVideoElement,
    context: CanvasRenderingContext2D,
    frameWidth: number,
    frameHeight: number,
    layerId: 'blur' | 'zoom',
    item: BlurEffectItem | ZoomEffectItem,
    startSeconds: number,
    endSeconds: number,
    reportProgress: (index: number, total: number) => void
  ): Promise<readonly EffectRegionKeyframe[]> {
    const minimumSize = trackingMinimumSizeForLayer(layerId);
    const anchorSeconds = roundedTrackingSeconds(clampRangeValue(playheadSeconds, startSeconds, endSeconds));
    const times = trackingSampleTimes(startSeconds, endSeconds, anchorSeconds);
    const anchorRegion = activeRegionForEffect(item, anchorSeconds);

    await seekTrackingVideo(video, anchorSeconds);
    const anchorFrame = lumaFrameFromVideo(video, context, frameWidth, frameHeight);
    const anchorRect = pixelRectFromRegion(anchorRegion, frameWidth, frameHeight, minimumSize);
    const templateWidth = Math.min(28, Math.max(16, Math.round(anchorRect.width / 2)));
    const templateHeight = Math.min(28, Math.max(16, Math.round(anchorRect.height / 2)));
    const anchorTemplate = sampleLumaPatch(anchorFrame, frameWidth, frameHeight, anchorRect, templateWidth, templateHeight);
    if (patchContrast(anchorTemplate) < 8) throw new Error('tracking-low-detail');
    const keyframes = new Map<number, BlurMask>();
    let matchCount = 0;

    keyframes.set(anchorSeconds, anchorRegion);

    const trackTimes = async (directionTimes: readonly number[]) => {
      let previousRect = anchorRect;
      let template = anchorTemplate;
      let previousFrame = anchorFrame;

      for (const seconds of directionTimes) {
        reportProgress(matchCount, times.length);
        await seekTrackingVideo(video, seconds);
        const frame = lumaFrameFromVideo(video, context, frameWidth, frameHeight);
        if (frameCorrelation(previousFrame, frame) < 0.15) throw new Error(`tracking-lost:${seconds}`);
        const match = findAdaptiveTrackingMatch(frame, frameWidth, frameHeight, template, templateWidth, templateHeight, previousRect);

        if (match && match.score <= 45) {
          previousRect = match.rect;
          previousFrame = frame;
          template = sampleLumaPatch(frame, frameWidth, frameHeight, previousRect, templateWidth, templateHeight);
          matchCount += 1;
        } else {
          throw new Error(`tracking-lost:${seconds}`);
        }

        keyframes.set(roundedTrackingSeconds(seconds), regionFromPixelRect(previousRect, frameWidth, frameHeight, minimumSize));
      }
    };

    await trackTimes(times.filter((seconds) => seconds > anchorSeconds));
    await trackTimes(times.filter((seconds) => seconds < anchorSeconds).reverse());

    if (matchCount === 0) {
      return [];
    }

    return Array.from(keyframes.entries())
      .map(([timeSeconds, region]) => ({ timeSeconds, region }))
      .sort((left, right) => left.timeSeconds - right.timeSeconds);
  }

  async function runAutoTracking(layerId: 'blur' | 'zoom', item: BlurEffectItem | ZoomEffectItem, mode: 'face' | 'selection') {
    if (autoTrackingBusyRef.current || item.locked || isAudioEditor) return;
    const preview = videoRef.current;
    if (!(preview instanceof HTMLVideoElement) || !preview.videoWidth) {
      setTrackingMessage({ id: item.id, text: uiText(preferences.locale, 'Wait for the video preview to load.', 'انتظر حتى تجهز معاينة الفيديو.') });
      return;
    }
    const report = (text: string) => {
      setTrackingMessage({ id: item.id, text });
      setActivity(text);
    };
    const ensureCurrent = () => {
      const current = trackingContextRef.current;
      const latestItem = (layerId === 'blur' ? current.blurItems : current.zoomItems).find(candidate => candidate.id === item.id);
      if (trackingCancelledRef.current || current.selectedMediaId !== selectedMediaId || current.activeNav !== 'editor' || latestItem !== item) {
        throw new Error('tracking-cancelled');
      }
    };
    const progress = (index: number, total: number) => {
      ensureCurrent();
      report(uiText(preferences.locale, `Tracking ${Math.round(index / total * 100)}%…`, `جارٍ التتبع ${Math.round(index / total * 100)}٪…`));
    };
    autoTrackingBusyRef.current = true;
    trackingCancelledRef.current = false;
    setAutoTrackingItemId(item.id);
    preview.pause();
    setIsPlaying(false);
    let video: HTMLVideoElement | undefined;
    try {
      report(uiText(preferences.locale, 'Preparing local tracking…', 'جارٍ تجهيز التتبع المحلي…'));
      video = await loadTrackingVideo(preview.currentSrc || preview.src);
      ensureCurrent();
      const canvas = document.createElement('canvas');
      const width = canvas.width = Math.min(480, video.videoWidth);
      const height = canvas.height = Math.max(1, Math.round(width / video.videoWidth * video.videoHeight));
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('tracking-decode');
      const start = Math.max(0, item.startTime);
      const end = Math.min(video.duration, item.endTime);
      if (end <= start) throw new Error('tracking-range');
      let keyframes: readonly EffectRegionKeyframe[];
      if (mode === 'face') {
        const anchor = roundedTrackingSeconds(clampRangeValue(playheadSeconds, start, end));
        const times = trackingSampleTimes(start, end, anchor);
        const seed = activeRegionForEffect(item, anchor);
        let previousFaceFrame: Uint8ClampedArray | undefined;
        const readFace = async (seconds: number, previous: BlurMask, initial: boolean): Promise<BlurMask> => {
          await seekTrackingVideo(video!, seconds);
          ensureCurrent();
          const frame = lumaFrameFromVideo(video!, context, width, height);
          if (!initial && previousFaceFrame && frameCorrelation(previousFaceFrame, frame) < 0.15) throw new Error(`tracking-lost:${seconds}`);
          previousFaceFrame = frame;
          const faces = detectFaces(frame, width, height);
          const regions = faces.map(box => clampPreviewRegion({
            x: (box.x + box.width / 2) / width * 100,
            y: (box.y + box.height / 2) / height * 100,
            width: box.width / width * 135, height: box.height / height * 135
          }, trackingMinimumSizeForLayer(layerId)));
          // Follow the face nearest the selected target, never the largest face in each frame.
          regions.sort((a, b) => Math.hypot(a.x - previous.x, a.y - previous.y) - Math.hypot(b.x - previous.x, b.y - previous.y));
          const next = regions[0];
          if (!next) throw new Error(initial ? 'tracking-no-face' : `tracking-lost:${seconds}`);
          if (!initial && (Math.hypot(next.x - previous.x, next.y - previous.y) > Math.max(previous.width, previous.height) || next.width / previous.width < 0.6 || next.width / previous.width > 1.7)) throw new Error(`tracking-lost:${seconds}`);
          return next;
        };
        const anchorRegion = await readFace(anchor, seed, true);
        const anchorFaceFrame = previousFaceFrame;
        const points: EffectRegionKeyframe[] = [{ timeSeconds: anchor, region: anchorRegion }];
        for (const direction of [times.filter(time => time > anchor), times.filter(time => time < anchor).reverse()]) {
          let previous = anchorRegion;
          previousFaceFrame = anchorFaceFrame;
          for (const seconds of direction) {
            progress(points.length, times.length);
            previous = await readFace(seconds, previous, false);
            points.push({ timeSeconds: seconds, region: previous });
          }
        }
        keyframes = points.sort((a, b) => a.timeSeconds - b.timeSeconds);
      } else {
        keyframes = await selectedRegionTrackingKeyframes(video, context, width, height, layerId, item, start, end, progress);
      }
      ensureCurrent();
      if (keyframes.length < 2) throw new Error('tracking-lost');
      const firstRegion = keyframes[0].region as BlurMask;
      pushEditorHistory();
      if (layerId === 'blur') {
        updateBlurItem(item.id, { region: firstRegion, keyframes, trackingEnabled: true });
        setBlurMask(firstRegion);
      } else {
        updateZoomItem(item.id, { region: firstRegion, keyframes, trackingEnabled: true, scale: zoomScaleForRegion(firstRegion) });
        setZoomRegion(firstRegion);
        setZoomScale(zoomScaleForRegion(firstRegion));
      }
      report(uiText(preferences.locale, `Tracking ready: ${keyframes.length} motion points. Play to review before export.`, `التتبع جاهز: ${keyframes.length} نقطة حركة. شغّل المعاينة لمراجعتها قبل التصدير.`));
    } catch (error) {
      const detail = error instanceof Error ? error.message : '';
      const code = detail.split(':')[0];
      const lostAt = Number(detail.split(':')[1]);
      const lostTime = Number.isFinite(lostAt) ? ` (${formatTimecode(lostAt)})` : '';
      const message = code === 'tracking-cancelled'
        ? uiText(preferences.locale, 'Tracking cancelled. Existing motion points were kept.', 'أُلغي التتبع مع الاحتفاظ بنقاط الحركة السابقة.')
        : code === 'tracking-no-face'
          ? uiText(preferences.locale, 'No clear front-facing face here. Position the box on the target and use Track area, or choose a clearer frame.', 'لم يظهر وجه أمامي واضح هنا. حدد الهدف واستخدم «تتبع المنطقة»، أو اختر لقطة أوضح.')
          : code === 'tracking-lost'
            ? uiText(preferences.locale, `The target was lost${lostTime}. Shorten the effect around this shot and fit the box tightly to the target, then retry. Existing points were kept.`, `فُقد الهدف${lostTime}. قصّر مدة التأثير داخل نفس اللقطة واضبط الصندوق حول الهدف ثم أعد المحاولة. بقيت النقاط السابقة.`)
            : code === 'tracking-low-detail'
              ? uiText(preferences.locale, 'This area has too little detail to track. Fit the box around a visible object with clear edges.', 'المنطقة لا تحتوي تفاصيل كافية للتتبع. اضبط الصندوق حول جسم واضح الحواف.')
            : uiText(preferences.locale, 'Video frames could not be read for tracking. Reopen the preview and retry. Existing points were kept.', 'تعذرت قراءة إطارات الفيديو للتتبع. افتح المعاينة مجددًا ثم حاول. بقيت النقاط السابقة.');
      report(message);
    } finally {
      if (video) releaseTrackingVideo(video);
      autoTrackingBusyRef.current = false;
      setAutoTrackingItemId(undefined);
    }
  }

  function renderTrackingControls(layerId: 'blur' | 'zoom', item: BlurEffectItem | ZoomEffectItem) {
    const mode = trackingModes[item.id] ?? 'automatic';
    const busy = autoTrackingItemId === item.id;
    const disabled = isAudioEditor || item.locked || autoTrackingItemId !== undefined;
    return (
      <div className="inspector-section tracking-controls">
        <strong>{uiText(preferences.locale, 'Motion tracking', 'تتبع الحركة')}</strong>
        <div className="segmented-control" aria-label={uiText(preferences.locale, 'Tracking mode', 'طريقة التتبع')}>
          {(['automatic', 'manual'] as const).map(value => <button key={value} type="button" className={mode === value ? 'active' : ''} aria-pressed={mode === value} disabled={disabled} onClick={() => {
            setTrackingModes(modes => ({ ...modes, [item.id]: value }));
            setTrackingMessage(undefined);
            if (value === 'manual' && !item.trackingEnabled) startEffectTracking(layerId, item);
          }}>{value === 'automatic' ? uiText(preferences.locale, 'Automatic', 'تلقائي') : uiText(preferences.locale, 'Manual', 'يدوي')}</button>)}
        </div>
        <small>{mode === 'automatic'
          ? uiText(preferences.locale, 'Track area follows any detailed target you box. Find face detects a clear front-facing face and follows it.', 'تتبع المنطقة يتبع الهدف الذي تحدده بالصندوق. اكتشاف الوجه يحدد وجهًا أماميًا واضحًا ثم يتتبعه.')
          : uiText(preferences.locale, 'Move the playhead, then drag the box. Each move saves a motion point automatically.', 'حرّك مؤشر الزمن ثم اسحب الصندوق. كل سحبة تحفظ نقطة حركة تلقائيًا.')}</small>
        <div className="inspector-actions inspector-actions--wrap">
          {busy ? <button className="button secondary" aria-busy="true" onClick={() => { trackingCancelledRef.current = true; }} type="button">{uiText(preferences.locale, 'Cancel scan', 'إلغاء الفحص')}</button> : mode === 'automatic' ? <>
            <button className="button primary" disabled={disabled} onClick={() => void runAutoTracking(layerId, item, 'selection')} type="button">{uiText(preferences.locale, 'Track area', 'تتبع المنطقة')}</button>
            <button className="button secondary" disabled={disabled} onClick={() => void runAutoTracking(layerId, item, 'face')} type="button">{uiText(preferences.locale, 'Find & track face', 'اكتشاف وتتبع وجه')}</button>
          </> : <button className="button secondary" disabled={disabled} onClick={() => addManualEffectKeyframe(layerId, item)} type="button">{uiText(preferences.locale, 'Add point here', 'إضافة نقطة هنا')}</button>}
        </div>
        <div className="tracking-footer"><span className="inspector-chip">{keyframeCountLabel(item)}</span>
          {item.keyframes?.length ? <button className="button secondary" disabled={disabled} onClick={() => resetEffectTracking(layerId, item)} type="button">{uiText(preferences.locale, 'Clear motion', 'مسح الحركة')}</button> : null}
        </div>
        {trackingMessage?.id === item.id ? <small role="status" className="tracking-status">{trackingMessage.text}</small> : null}
      </div>
    );
  }

  function renderBlurInspector() {
    if (!selectedBlurItem) {
      return (
        <InspectorPanel title={t('blur')} subtitle={inspectorText.blurSubtitle}>
          <div className="inspector-empty">
            <Layers3 aria-hidden="true" size={20} />
            <strong>{inspectorText.blurEmpty}</strong>
            <small>{inspectorText.blurEmptyDetail}</small>
            <button className="button primary" onClick={() => enableTimelineEffect('blur')} type="button">
              <Layers3 aria-hidden="true" size={15} />
              {inspectorText.addBlur}
            </button>
          </div>
        </InspectorPanel>
      );
    }

    const currentRegion = activeRegionForEffect(selectedBlurItem, playheadSeconds);
    const blurShapeOptions: readonly { readonly value: BlurEffectShape; readonly label: string }[] = [
      { value: 'rectangle', label: uiText(preferences.locale, 'Rectangle', 'مربع') },
      { value: 'ellipse', label: uiText(preferences.locale, 'Oval', 'بيضاوي') },
      { value: 'rounded', label: uiText(preferences.locale, 'Rounded', 'مدور') }
    ];
    const blurStyleOptions: readonly { readonly value: BlurEffectStyle; readonly label: string; readonly strength: number }[] = [
      { value: 'light', label: uiText(preferences.locale, 'Light', 'خفيف'), strength: 6 },
      { value: 'normal', label: uiText(preferences.locale, 'Normal', 'عادي'), strength: 14 },
      { value: 'strong', label: uiText(preferences.locale, 'Strong', 'قوي'), strength: 28 },
      { value: 'pixelated', label: uiText(preferences.locale, 'Pixelated', 'بكسلة'), strength: 12 }
    ];

    return (
      <InspectorPanel title={selectedBlurItem.name || t('blur')} subtitle={inspectorText.blurSubtitle} footer={renderAddTimelineItem('blur')}>
        <div className="inspector-section">
          <strong>{uiText(preferences.locale, 'Shape', 'الشكل')}</strong>
          <div className="segmented-control segmented-control--wrap">
            {blurShapeOptions.map((option) => (
              <button
                aria-pressed={(selectedBlurItem.shape === 'face' ? 'ellipse' : selectedBlurItem.shape ?? 'rectangle') === option.value}
                className={(selectedBlurItem.shape === 'face' ? 'ellipse' : selectedBlurItem.shape ?? 'rectangle') === option.value ? 'active' : ''}
                key={option.value}
                onClick={() => {
                  pushEditorHistory();
                  updateBlurItem(selectedBlurItem.id, { shape: option.value });
                }}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="inspector-section">
          <strong>{uiText(preferences.locale, 'Blur style', 'نوع التمويه')}</strong>
          <div className="segmented-control segmented-control--wrap">
            {blurStyleOptions.map((option) => (
              <button
                aria-pressed={(selectedBlurItem.style ?? 'normal') === option.value}
                className={(selectedBlurItem.style ?? 'normal') === option.value ? 'active' : ''}
                key={option.value}
                onClick={() => {
                  pushEditorHistory();
                  setBlurStrength(option.strength);
                  updateBlurItem(selectedBlurItem.id, { style: option.value, strength: option.strength });
                }}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
          <label className="range-control">
            <span>{selectedBlurItem.style === 'pixelated' ? uiText(preferences.locale, 'Block size', 'حجم البكسل') : inspectorText.strength}</span>
            <RangeInput
              max={32}
              min={0}
              onChange={(event) => {
                const value = Number(event.currentTarget.value);
                pushEditorHistory();
                setBlurStrength(value);
                updateBlurItem(selectedBlurItem.id, { strength: value });
              }}
              step={1}
              type="range"
              value={selectedBlurItem.strength}
            />
            <strong>{selectedBlurItem.strength === 0 ? uiText(preferences.locale, 'Off', 'متوقف') : `${selectedBlurItem.style === 'pixelated' ? pixelBlockSize(selectedBlurItem.strength) : selectedBlurItem.strength}px`}</strong>
          </label>
        </div>
        {renderTrackingControls('blur', selectedBlurItem)}
        <details className="inspector-section inspector-advanced">
          <summary>{uiText(preferences.locale, 'Rename effect', 'تسمية التأثير')}</summary>
          {renderInspectorTextField(inspectorText.name, selectedBlurItem.name, (value) => {
            pushEditorHistory();
            updateBlurItem(selectedBlurItem.id, { name: value });
          })}
        </details>
        {renderInspectorTimingFields(selectedBlurItem.startTime, selectedBlurItem.endTime, (windowValue) =>
          setEffectWindowForLayer('blur', windowValue, selectedBlurItem.id)
        )}
        {renderRegionFields(currentRegion, (region) => updateEffectRegionAtPlayhead('blur', selectedBlurItem.id, region))}
        {renderInspectorToggles()}
      </InspectorPanel>
    );
  }

  function renderZoomInspector() {
    if (!selectedZoomItem) {
      return (
        <InspectorPanel title={t('zoom')} subtitle={inspectorText.zoomHint}>
          <div className="inspector-empty">
            <ZoomIn aria-hidden="true" size={20} />
            <strong>{inspectorText.noZoom}</strong>
            <small>{inspectorText.zoomEmptyDetail}</small>
            <button className="button primary" onClick={() => enableTimelineEffect('zoom')} type="button">
              <ZoomIn aria-hidden="true" size={15} />
              {inspectorText.addZoom}
            </button>
          </div>
        </InspectorPanel>
      );
    }

    const hasConflict = overlappingZoomItemIds.has(selectedZoomItem.id);
    const zoomPresets = [1.25, 1.5, 2, 4];
    const currentRegion = activeRegionForEffect(selectedZoomItem, playheadSeconds);
    const currentScale = zoomScaleForEffect(selectedZoomItem, currentRegion);
    const applyZoomScale = (value: number) => {
      const scale = clampRangeValue(value, 1.05, 8);
      const size = roundedPercent(clampRangeValue(100 / scale, 8, 100));
      const region = { ...currentRegion, width: size, height: size };
      pushEditorHistory();
      updateEffectRegionAtPlayhead('zoom', selectedZoomItem.id, region, scale);
      updateZoomItem(selectedZoomItem.id, { easeIn: selectedZoomItem.easeIn ?? 0.75, easeOut: selectedZoomItem.easeOut ?? 0.75 });
    };

    return (
      <InspectorPanel title={selectedZoomItem.name || t('zoom')} subtitle={inspectorText.zoomSubtitle} footer={renderAddTimelineItem('zoom')}>
        {hasConflict ? (
          <div className="inspector-warning">
            {inspectorText.zoomConflict}
          </div>
        ) : null}
        <div className="inspector-section">
          <strong>{uiText(preferences.locale, 'Zoom amount', 'مقدار التكبير')}</strong>
          <div className="zoom-preset-grid" aria-label={uiText(preferences.locale, 'Zoom presets', 'إعدادات التكبير الجاهزة')}>
            {zoomPresets.map((preset) => (
              <button
                aria-pressed={Math.abs(currentScale - preset) < 0.08}
                className={Math.abs(currentScale - preset) < 0.08 ? 'active' : ''}
                key={preset}
                onClick={() => applyZoomScale(preset)}
                type="button"
              >
                {preset % 1 === 0 ? preset.toFixed(0) : preset.toFixed(2).replace(/0$/, '')}x
              </button>
            ))}
          </div>
          <label className="range-control">
            <span>{inspectorText.scale}</span>
            <RangeInput aria-label={inspectorText.scale} type="range" min="1.05" max="8" step="0.05" value={currentScale} onChange={event => applyZoomScale(Number(event.currentTarget.value))} />
            <strong>{currentScale.toFixed(2)}x</strong>
          </label>
          <details className="inspector-advanced">
            <summary>{uiText(preferences.locale, 'Transition & precise scale', 'الانتقال والتكبير الدقيق')}</summary>
            <div className="inspector-grid">
            {renderInspectorNumberField(inspectorText.scale, currentScale, applyZoomScale, { min: 1.05, max: 8, step: 0.05, suffix: 'x' })}
            <TimeField label={inspectorText.easeIn} value={selectedZoomItem.easeIn??.75} max={2} ar={preferences.locale==='ar'} onChange={value=>{
              pushEditorHistory();
              updateZoomItem(selectedZoomItem.id, { easeIn: clampRangeValue(value, 0, 2) });
            }}/>
            <TimeField label={inspectorText.easeOut} value={selectedZoomItem.easeOut??.75} max={2} ar={preferences.locale==='ar'} onChange={value=>{
              pushEditorHistory();
              updateZoomItem(selectedZoomItem.id, { easeOut: clampRangeValue(value, 0, 2) });
            }}/>
            </div>
          </details>
        </div>
        {renderTrackingControls('zoom', selectedZoomItem)}
        <details className="inspector-section inspector-advanced">
          <summary>{uiText(preferences.locale, 'Rename effect', 'تسمية التأثير')}</summary>
          {renderInspectorTextField(inspectorText.name, selectedZoomItem.name, (value) => {
            pushEditorHistory();
            updateZoomItem(selectedZoomItem.id, { name: value });
          })}
        </details>
        {renderInspectorTimingFields(selectedZoomItem.startTime, selectedZoomItem.endTime, (windowValue) =>
          setEffectWindowForLayer('zoom', windowValue, selectedZoomItem.id)
        )}
        {renderRegionFields(currentRegion, (region) => {
          const scale = clampRangeValue(100 / Math.max(1, region.width), 1, 8);
          updateEffectRegionAtPlayhead('zoom', selectedZoomItem.id, region, scale);
        })}
        {renderInspectorToggles()}
      </InspectorPanel>
    );
  }

  function renderSoundPresets() {
    return <SoundPresetControls ar={preferences.locale==='ar'} value={{audio:audioSections.find(section=>section.id===selectedAudioSectionId)?.settings??audioSettings,speed:selectedSpeedItem?{rate:selectedSpeedItem.rate,mode:selectedSpeedItem.mode??'preserve-pitch'}:undefined}} initialCode={pendingSoundCode} speedAvailable={!!selectedSpeedItem&&!selectedSpeedItem.locked} onApply={(preset,includeSpeed)=>{pushEditorHistory();if(audioSections.some(section=>section.id===selectedAudioSectionId))setAudioSections(sections=>sections.map(section=>section.id===selectedAudioSectionId?{...section,settings:{...preset.audio,fadeIn:0,fadeOut:0}}:section));else setAudioSettings(preset.audio);if(includeSpeed&&preset.speed&&selectedSpeedItem&&!selectedSpeedItem.locked)updateSpeedItem(selectedSpeedItem.id,preset.speed);setPendingSoundCode(undefined);}}/>;
  }

  function renderSpeedInspector() {
    const hint = speedEditorHint();

    if (!selectedSpeedItem) {
      return (
        <InspectorPanel title={t('speed')} subtitle={hint}>
          <div className="inspector-empty">
            <Gauge aria-hidden="true" size={20} />
            <strong>{inspectorText.noSpeed}</strong>
            <small>{hint}</small>
            <button className="button primary" onClick={() => enableTimelineEffect('speed')} type="button">
              <Gauge aria-hidden="true" size={15} />
              {inspectorText.addSpeed}
            </button>
          </div>
        </InspectorPanel>
      );
    }

    return (
      <InspectorPanel title={selectedSpeedItem.name || t('speed')} subtitle={hint} footer={renderAddTimelineItem('speed')}>
        <SpeedControls rate={selectedSpeedItem.rate} mode={selectedSpeedItem.mode} ar={preferences.locale === 'ar'} onRate={rate => {
          pushEditorHistory(); setSpeedRate(rate); updateSpeedItem(selectedSpeedItem.id, {rate});
        }} onMode={mode => {pushEditorHistory(); updateSpeedItem(selectedSpeedItem.id, {mode});}} />
        {renderInspectorTimingFields(selectedSpeedItem.startTime, selectedSpeedItem.endTime, (windowValue) =>
          setEffectWindowForLayer('speed', windowValue, selectedSpeedItem.id)
        )}
        <details className="inspector-section inspector-advanced">
          <summary>{uiText(preferences.locale, 'Rename effect', 'تسمية التأثير')}</summary>
          {renderInspectorTextField(inspectorText.name, selectedSpeedItem.name, (value) => {
            pushEditorHistory();
            updateSpeedItem(selectedSpeedItem.id, { name: value });
          })}
        </details>
        {renderInspectorToggles()}
        {renderSoundPresets()}
      </InspectorPanel>
    );
  }

  function renderReframeInspector() {
    const reframeLabel = uiText(preferences.locale, 'Canvas', 'تغيير المقاس');

    if (!selectedReframeItem) {
      const hasReframe = reframeItems.length > 0;
      return (
        <InspectorPanel title={reframeLabel} subtitle={uiText(preferences.locale, 'Resize and reframe the video to any canvas.', 'غيّر مقاس الفيديو وأعد تأطيره لأي إطار.')}>
          <div className="inspector-empty">
            <Crop aria-hidden="true" size={20} />
            <strong>{uiText(preferences.locale, 'No canvas selected', 'لا يوجد تحويل مقاس محدد')}</strong>
            <small>{hasReframe
              ? uiText(preferences.locale, 'One canvas already exists. Select it or delete it first.', 'يوجد تحويل مقاس واحد بالفعل. حدده أو احذفه أولاً.')
              : uiText(preferences.locale, 'Add a canvas to resize and reframe the video.', 'أضف تحويل مقاس لتغيير حجم الفيديو.')}
            </small>
            {!hasReframe ? (
            <button className="button primary" onClick={() => enableTimelineEffect('reframe')} type="button">
              <Crop aria-hidden="true" size={15} />
              {uiText(preferences.locale, 'Add canvas', 'إضافة تحويل مقاس')}
            </button>
            ) : null}
          </div>
        </InspectorPanel>
      );
    }

    const targetW = clampDimension(ensureEvenDimension(selectedReframeItem.targetWidth), 16, 7680);
    const targetH = clampDimension(ensureEvenDimension(selectedReframeItem.targetHeight), 16, 4320);
    const presetId = findReframePresetId(targetW, targetH, previewMediaSize.width, previewMediaSize.height);
    const currentAspect = previewMediaSize.width / Math.max(1, previewMediaSize.height);
    const targetAspect = targetW / Math.max(1, targetH);

    const handlePresetSelect = (id: string) => {
      pushEditorHistory();
      if (id === 'original') {
        const sourceW = previewMediaSize.width > 0 ? previewMediaSize.width : 1920;
        const sourceH = previewMediaSize.height > 0 ? previewMediaSize.height : 1080;
        setReframeTargetWidth(sourceW);
        setReframeTargetHeight(sourceH);
        updateReframeItem(selectedReframeItem.id, { targetWidth: sourceW, targetHeight: sourceH, fitMode: 'original' });
        setReframeFitMode('original');
      } else {
        const preset = REFRAME_PRESETS.find((candidate) => candidate.id === id);
        if (preset) {
          setReframeTargetWidth(preset.width);
          setReframeTargetHeight(preset.height);
          updateReframeItem(selectedReframeItem.id, { targetWidth: preset.width, targetHeight: preset.height, fitMode: 'fit' });
          setReframeFitMode('fit');
        }
      }
    };

    const handleWidthChange = (value: number) => {
      const next = clampDimension(ensureEvenDimension(value), 16, 7680);
      pushEditorHistory();
      setReframeTargetWidth(next);
      updateReframeItem(selectedReframeItem.id, { targetWidth: next });
    };

    const handleHeightChange = (value: number) => {
      const next = clampDimension(ensureEvenDimension(value), 16, 4320);
      pushEditorHistory();
      setReframeTargetHeight(next);
      updateReframeItem(selectedReframeItem.id, { targetHeight: next });
    };

    const handleFitModeChange = (mode: ReframeFitMode) => {
      pushEditorHistory();
      setReframeFitMode(mode);
      updateReframeItem(selectedReframeItem.id, { fitMode: mode });
    };

    const handlePositionChange = (axis: 'x' | 'y', value: number) => {
      const clamped = clampRangeValue(value, 0, 1);
      pushEditorHistory();
      if (axis === 'x') {
        setReframePositionX(clamped);
        updateReframeItem(selectedReframeItem.id, { positionX: clamped });
      } else {
        setReframePositionY(clamped);
        updateReframeItem(selectedReframeItem.id, { positionY: clamped });
      }
    };

    const handleBackgroundChange = (bg: ReframeBackground) => {
      pushEditorHistory();
      setReframeBackground(bg);
      updateReframeItem(selectedReframeItem.id, { background: bg });
    };

    return (
      <InspectorPanel title={selectedReframeItem.name || reframeLabel} subtitle={uiText(preferences.locale, 'Pick a preset or set custom size. Adjust fit, position, and background.', 'اختر مقاساً جاهزاً أو حدد مقاساً مخصصاً. اضبط الملاءمة والموقع والخلفية.')}>
        <div className="inspector-section">
          <strong>{inspectorText.item}</strong>
          {renderInspectorTextField(inspectorText.name, selectedReframeItem.name, (value) => {
            pushEditorHistory();
            updateReframeItem(selectedReframeItem.id, { name: value });
          })}
          <small style={{ color: 'var(--muted)', fontSize: '11px' }}>
            {uiText(preferences.locale, 'Canvas is always applied to the entire video.', 'ينطبق المقاس الجديد على الفيديو كاملًا.')}
          </small>
        </div>
        <div className="inspector-section">
          <strong>{uiText(preferences.locale, 'Preset', 'مقاس جاهز')}</strong>
          <div className="inspector-grid inspector-grid--three">
            {REFRAME_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`inspector-option-button${presetId === preset.id ? ' active' : ''}`}
                onClick={() => handlePresetSelect(preset.id)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        <div className="inspector-section">
          <strong>{uiText(preferences.locale, 'Size', 'المقاس')}</strong>
          <div className="inspector-grid inspector-grid--two">
            {renderInspectorNumberField(uiText(preferences.locale, 'Width', 'العرض'), targetW, handleWidthChange, { min: 16, max: 7680, step: 2, suffix: 'px' })}
            {renderInspectorNumberField(uiText(preferences.locale, 'Height', 'الارتفاع'), targetH, handleHeightChange, { min: 16, max: 4320, step: 2, suffix: 'px' })}
          </div>
          <small style={{ color: 'var(--muted)', fontSize: '11px' }}>
            {uiText(preferences.locale, 'Source aspect', 'نسبة المصدر')}: {currentAspect.toFixed(2)} · {uiText(preferences.locale, 'Target aspect', 'نسبة الهدف')}: {targetAspect.toFixed(2)}
          </small>
        </div>
        <div className="inspector-section">
          <strong>{uiText(preferences.locale, 'Fit Mode', 'وضع الملاءمة')}</strong>
          <div className="inspector-grid inspector-grid--two">
            {(['fit', 'fill', 'original', 'stretch'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`inspector-option-button${selectedReframeItem.fitMode === mode ? ' active' : ''}`}
                onClick={() => handleFitModeChange(mode)}
              >
                {reframeFitModeLabel(mode)}
              </button>
            ))}
          </div>
        </div>
        {(selectedReframeItem.fitMode === 'fit' || selectedReframeItem.fitMode === 'fill') ? (
          (() => {
            const nearlyEqual = (a: number, b: number) => Math.abs(a - b) < 0.005;
            const isLeftActive = nearlyEqual(selectedReframeItem.positionX, 0);
            const isCenterActive = nearlyEqual(selectedReframeItem.positionX, 0.5) && nearlyEqual(selectedReframeItem.positionY, 0.5);
            const isRightActive = nearlyEqual(selectedReframeItem.positionX, 1);

            const handleLeft = () => {
              pushEditorHistory();
              setReframePositionX(0);
              updateReframeItem(selectedReframeItem.id, { positionX: 0 });
            };
            const handleCenter = () => {
              pushEditorHistory();
              setReframePositionX(0.5);
              setReframePositionY(0.5);
              updateReframeItem(selectedReframeItem.id, { positionX: 0.5, positionY: 0.5 });
            };
            const handleRight = () => {
              pushEditorHistory();
              setReframePositionX(1);
              updateReframeItem(selectedReframeItem.id, { positionX: 1 });
            };

            return (
              <div className="inspector-section">
                <strong>{uiText(preferences.locale, 'Position', 'الموقع')}</strong>
                <div className="inspector-grid inspector-grid--two">
                  {renderInspectorNumberField('X', selectedReframeItem.positionX, (value) => handlePositionChange('x', value), { min: 0, max: 1, step: 0.01 })}
                  {renderInspectorNumberField('Y', selectedReframeItem.positionY, (value) => handlePositionChange('y', value), { min: 0, max: 1, step: 0.01 })}
                </div>
                <div className="inspector-grid inspector-grid--three">
                  <button
                    type="button"
                    className={`inspector-option-button${isLeftActive ? ' active' : ''}`}
                    onClick={handleLeft}
                  >
                    {uiText(preferences.locale, 'Left', 'يسار')}
                  </button>
                  <button
                    type="button"
                    className={`inspector-option-button${isCenterActive ? ' active' : ''}`}
                    onClick={handleCenter}
                  >
                    {uiText(preferences.locale, 'Center', 'وسط')}
                  </button>
                  <button
                    type="button"
                    className={`inspector-option-button${isRightActive ? ' active' : ''}`}
                    onClick={handleRight}
                  >
                    {uiText(preferences.locale, 'Right', 'يمين')}
                  </button>
                </div>
              </div>
            );
          })()
        ) : null}
        {selectedReframeItem.fitMode === 'fit' ? (
          <div className="inspector-section">
            <strong>{uiText(preferences.locale, 'Background', 'الخلفية')}</strong>
            <div className="inspector-grid inspector-grid--two">
              {(['black', 'white', 'blur'] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  className={`inspector-option-button${selectedReframeItem.background.kind === kind ? ' active' : ''}`}
                  onClick={() => handleBackgroundChange({ kind } as ReframeBackground)}
                >
                  {kind === 'black' ? uiText(preferences.locale, 'Black', 'أسود') : kind === 'white' ? uiText(preferences.locale, 'White', 'أبيض') : uiText(preferences.locale, 'Blur', 'ضبابية')}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                pushEditorHistory();
                setReframeTargetWidth(targetW);
                setReframeTargetHeight(targetH);
                setReframeFitMode('fit');
                setReframePositionX(0.5);
                setReframePositionY(0.5);
                setReframeBackground({ kind: 'black' });
                updateReframeItem(selectedReframeItem.id, {
                  targetWidth: targetW,
                  targetHeight: targetH,
                  fitMode: 'fit',
                  positionX: 0.5,
                  positionY: 0.5,
                  background: { kind: 'black' }
                });
              }}
            >
              <RefreshCcw aria-hidden="true" size={15} />
              {uiText(preferences.locale, 'Reset canvas', 'إعادة تعيين المقاس')}
            </button>
          </div>
        ) : null}
        {renderInspectorToggles()}
      </InspectorPanel>
    );
  }

  function renderTextInspector() {
    if (!selectedTextOverlay) {
      return (
        <InspectorPanel title={editorText.textLayer} subtitle={inspectorText.textSubtitle}>
          <div className="inspector-empty">
            <Captions aria-hidden="true" size={20} />
            <strong>{inspectorText.noText}</strong>
            <small>{inspectorText.noTextDetail}</small>
            <input
              dir="auto"
              onChange={(event) => setTextDraft(event.currentTarget.value)}
              placeholder={editorText.textPlaceholder}
              type="text"
              value={textDraft}
            />
            <button className="button primary" onClick={addTextOverlay} type="button">
              <Captions aria-hidden="true" size={15} />
              {editorText.addText}
            </button>
          </div>
        </InspectorPanel>
      );
    }

    return (
      <InspectorPanel title={selectedTextOverlay.text || editorText.textLayer} subtitle={inspectorText.textTuneSubtitle} footer={renderAddTimelineItem('text')}>
        <div className="inspector-section">
          <strong>{inspectorText.content}</strong>
          <textarea
            className="inspector-textarea"
            dir="auto"
            onChange={(event) => updateSelectedTextOverlay({ text: event.currentTarget.value })}
            value={selectedTextOverlay.text}
          />
        </div>
        {renderInspectorTimingFields(selectedTextOverlay.startSeconds, selectedTextOverlay.endSeconds, (windowValue) =>
          setTextOverlayWindow(selectedTextOverlay.id, windowValue)
        )}
        <div className="inspector-section">
          <strong>{inspectorText.positionStyle}</strong>
          <div className="inspector-grid inspector-grid--four">
            {renderInspectorNumberField('X', selectedTextOverlay.x, (value) => updateSelectedTextOverlay({ x: roundedPercent(clampRangeValue(value, 0, 100)) }), { min: 0, max: 100, step: 1, suffix: '%' })}
            {renderInspectorNumberField('Y', selectedTextOverlay.y, (value) => updateSelectedTextOverlay({ y: roundedPercent(clampRangeValue(value, 0, 100)) }), { min: 0, max: 100, step: 1, suffix: '%' })}
            {renderInspectorNumberField(inspectorText.size, selectedTextOverlay.fontSize, (value) => updateSelectedTextOverlay({ fontSize: clampRangeValue(value, 10, 160) }), { min: 10, max: 160, step: 1, suffix: 'px' })}
            {renderInspectorNumberField(inspectorText.layer, selectedTextOverlay.zIndex, (value) => updateSelectedTextOverlay({ zIndex: Math.max(0, Math.round(value)) }), { min: 0, step: 1 })}
          </div>
          <label className="inspector-field">
            <span>{inspectorText.font}</span>
            <select
              onChange={(event) => updateSelectedTextOverlay({ fontFamily: editorTextFontOptionFor(event.currentTarget.value).value })}
              value={editorTextFontOptionFor(selectedTextOverlay.fontFamily).value}
            >
              {editorTextFontOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <ColorField ar={preferences.locale === 'ar'} label={inspectorText.color}
            onChange={(color, recordHistory) => updateSelectedTextOverlay({ color }, recordHistory)}
            value={selectedTextOverlay.color ?? '#ffffff'} />
        </div>
        {renderInspectorToggles()}
      </InspectorPanel>
    );
  }

  function renderSubtitleInspector() {
    return (
      <InspectorPanel title={t('subtitles')} subtitle={subtitleFile ? `${subtitleFile.name} / ${subtitleFile.cues.length}` : editorText.noSubtitle}>
        <div className="inspector-section">
          <strong>{uiText(preferences.locale, 'Subtitle file', 'ملف الترجمة')}</strong>
          <div className="inspector-actions">
            <button className="button secondary" onClick={() => void chooseSubtitleFile()} type="button">
              <Upload aria-hidden="true" size={15} />
              {editorText.chooseSubtitle}
            </button>
            <button
              aria-pressed={subtitlesVisible}
              className="button secondary"
              disabled={!subtitleFile}
              onClick={() => {
                pushEditorHistory();
                setSubtitlesVisible((value) => !value);
              }}
              type="button"
            >
              <Eye aria-hidden="true" size={15} />
              {subtitlesVisible ? editorText.hideSubtitle : editorText.showSubtitle}
            </button>
            <button
              className="button secondary"
              disabled={!subtitleFile}
              onClick={() => {
                pushEditorHistory();
                setSubtitleFile(undefined);
                setSubtitlesVisible(true);
              }}
              type="button"
            >
              <X aria-hidden="true" size={15} />
              {editorText.removeSubtitle}
            </button>
          </div>
        </div>
        {subtitleFile ? (
          <div className="inspector-section">
            <strong>
              {editorText.currentSubtitleCue}
              {subtitleFile.edited ? ` / ${editorText.editedSubtitle}` : ''}
            </strong>
            <small>{activeSubtitleCue ? `${activeSubtitleCueIndex + 1} / ${subtitleFile.cues.length}` : editorText.noCueAtPlayhead}</small>
            {activeSubtitleCue ? (
              <>
                <textarea
                  className="inspector-textarea"
                  onChange={(event) => updateActiveSubtitleCue({ text: event.currentTarget.value })}
                  value={activeSubtitleCue.text}
                />
                <div className="inspector-grid">
                  <TimeField label={editorText.subtitleStart} value={activeSubtitleCue.startSeconds} max={Math.max(0,activeSubtitleCue.endSeconds-.1)} ar={preferences.locale==='ar'} onChange={value=>
                    updateActiveSubtitleCue({ startSeconds: clampRangeValue(value, 0, Math.max(0, activeSubtitleCue.endSeconds - 0.1)) })
                  }/>
                  <TimeField label={editorText.subtitleEnd} value={activeSubtitleCue.endSeconds} min={activeSubtitleCue.startSeconds+.1} max={timelineDuration} ar={preferences.locale==='ar'} onChange={value=>
                    updateActiveSubtitleCue({ endSeconds: clampRangeValue(value, activeSubtitleCue.startSeconds + 0.1, timelineDuration) })
                  }/>
                </div>
                <button className="button secondary danger" onClick={removeActiveSubtitleCue} type="button">
                  <X aria-hidden="true" size={15} />
                  {editorText.removeSubtitleCue}
                </button>
              </>
            ) : (
              <button className="button secondary" onClick={addSubtitleCueAtPlayhead} type="button">
                <Captions aria-hidden="true" size={15} />
                {editorText.addSubtitleCue}
              </button>
            )}
            <div className="inspector-actions">
              <button className="button secondary" disabled={!subtitleFile.originalCues || !subtitleFile.edited} onClick={restoreOriginalSubtitle} type="button">
                <RefreshCcw aria-hidden="true" size={15} />
                {editorText.restoreOriginalSubtitle}
              </button>
              {translationControls()}
            </div>

          </div>
        ) : null}
      </InspectorPanel>
    );
  }

  function renderCutInspector() {
    return (
      <InspectorPanel title={selectedCutOut ? `${editorText.cutOut} ${selectedCutOut.id}` : editorText.keepRange} subtitle={editorText.cutOutHint} footer={selectedCutOut ? renderAddTimelineItem('cuts') : undefined}>
        {selectedCutOut ? (
          <>
            {renderInspectorTimingFields(selectedCutOut.startSeconds, selectedCutOut.endSeconds, (windowValue) =>
              setCutOutWindow(selectedCutOut.id, windowValue)
            )}
            <div className="inspector-actions">
              <button className="button secondary" onClick={duplicateSelectedTimelineItem} type="button">
                <Clipboard aria-hidden="true" size={14} />
                {inspectorText.duplicate}
              </button>
              <button className="button secondary danger" onClick={removeSelectedCutOut} type="button">
                <X aria-hidden="true" size={14} />
                {editorText.removeCutOut}
              </button>
            </div>
          </>
        ) : (
          <div className="inspector-section">
            <strong>{editorText.keepRange}</strong>
            <div className="inspector-grid">
              <TimeField label={inspectorText.start} value={trimStartSeconds} max={Math.max(0,effectiveTrimEnd-timelineItemMinimumSeconds)} ar={preferences.locale==='ar'} onChange={value=>{
                pushEditorHistory();
                setTrimStartSeconds(clampRangeValue(value, 0, Math.max(0, effectiveTrimEnd - timelineItemMinimumSeconds)));
              }}/>
              <TimeField label={inspectorText.end} value={effectiveTrimEnd} min={trimStartSeconds+timelineItemMinimumSeconds} max={timelineDuration} ar={preferences.locale==='ar'} onChange={value=>{
                pushEditorHistory();
                setTrimEndSeconds(clampRangeValue(value, trimStartSeconds + timelineItemMinimumSeconds, timelineDuration));
              }}/>
            </div>
            <button className="button primary" onClick={addCutOutRange} type="button">
              <Scissors aria-hidden="true" size={15} />
              {editorText.cutOut}
            </button>
          </div>
        )}
      </InspectorPanel>
    );
  }

  function renderEditorInspector() {
    if (selectedLayerIdForMedia === 'text' && selectedTextOverlay) {
      return renderTextInspector();
    }

    switch (selectedLayerIdForMedia) {
      case 'blur':
        return renderBlurInspector();
      case 'zoom':
        return renderZoomInspector();
      case 'speed':
        return renderSpeedInspector();
      case 'reframe':
        return renderReframeInspector();
      case 'subtitles':
        return renderSubtitleInspector();
      case 'text':
        return renderTextInspector();
      case 'cuts':
      default:
        return renderCutInspector();
    }
  }

  const audioAnalyser = useAudioPreview(videoRef, audioSettings, {ranges:keptRanges,speeds:speedItems.filter(item=>!item.hidden)},audioSections);

  function activateTimelineSelection() {
    setActiveEditorTool('select');
    setAudioInspectorOpen(false);
  }

  function openEditorTool(toolId: EditorToolId) {
    if (!isEditorToolAvailableForMedia(selectedEditorMediaKind, toolId)) return;
    setAudioInspectorOpen(false);
    if (toolId === 'select') {
      setActiveEditorTool('select');
      return;
    }
    if (toolId === 'cuts') {
      const item = selectedCutOut ?? cutOutRanges.find(item => playheadSeconds >= item.startSeconds && playheadSeconds < item.endSeconds) ?? cutOutRanges.at(-1);
      if (item) {
        setSelectedCutOutId(item.id); setSelectedEffectItemId(undefined); setSelectedTextOverlayId(undefined); setSelectedLayerId('cuts');
      } else {setSelectedLayerId('cuts');setSelectedCutOutId(undefined);setSelectedEffectItemId(undefined);setSelectedTextOverlayId(undefined);}
    } else if (toolId === 'text') {
      const item = selectedTextOverlay ?? textOverlays.find(item => playheadSeconds >= item.startSeconds && playheadSeconds < item.endSeconds) ?? textOverlays.at(-1);
      if (item) selectTextOverlay(item.id); else {setSelectedLayerId('text');setSelectedTextOverlayId(undefined);setSelectedEffectItemId(undefined);setSelectedCutOutId(undefined);}
    } else if (toolId === 'subtitles') {
      setSelectedTextOverlayId(undefined); setSelectedEffectItemId(undefined); setSelectedCutOutId(undefined); setSelectedLayerId('subtitles');
    } else {
      const items = toolId === 'blur' ? blurItems : toolId === 'zoom' ? zoomItems : toolId === 'speed' ? speedItems : reframeItems;
      const item = items.find(item => item.id === selectedEffectItemId) ?? items.find(item => isTimelineItemActive(item, playheadSeconds)) ?? items.at(-1);
      if (item) selectEffectItem(toolId, item.id); else {setSelectedLayerId(toolId);setSelectedEffectItemId(undefined);setSelectedTextOverlayId(undefined);setSelectedCutOutId(undefined);}
    }
    setActiveEditorTool(toolId);
  }

  function renderAddTimelineItem(toolId: 'blur' | 'zoom' | 'speed' | 'text' | 'cuts') {
    const label = toolId === 'blur' ? uiText(preferences.locale, 'Add another blur', 'إضافة تمويه آخر')
      : toolId === 'zoom' ? uiText(preferences.locale, 'Add another zoom', 'إضافة تقريب آخر')
      : toolId === 'speed' ? uiText(preferences.locale, 'Add another speed effect', 'إضافة تأثير سرعة آخر')
      : toolId === 'text' ? uiText(preferences.locale, 'Add another text', 'إضافة نص آخر')
      : uiText(preferences.locale, 'Add another cut', 'إضافة قص آخر');
    return <button className="button secondary inspector-add-item" type="button" onClick={() => {
      if (toolId === 'text') addTextOverlay(); else if (toolId === 'cuts') addCutOutRange(); else enableTimelineEffect(toolId);
    }}><Plus aria-hidden="true" size={15}/>{label}</button>;
  }

  function renderEditorToolRail() {
    const availableToolIds = new Set<EditorToolId>(editorToolIdsForMedia(selectedEditorMediaKind));
    const items = [
      { id: 'select', label: editorText.selectTool, detail: editorText.selectToolDetail, icon: MousePointer2 },
      { id: 'cuts', label: editorText.cutOut, detail: editorText.cutOutHint, icon: Scissors },
      { id: 'blur', label: t('blur'), detail: editorText.dragBlurHint, icon: Layers3 },
      { id: 'zoom', label: t('zoom'), detail: editorText.zoomToolDetail, icon: ZoomIn },
      { id: 'speed', label: t('speed'), detail: speedEditorHint(), icon: Gauge },
      { id: 'reframe', label: uiText(preferences.locale, 'Canvas', 'تغيير المقاس'), detail: uiText(preferences.locale, 'Resize & reframe video', 'تغيير مقاس الفيديو'), icon: Crop },
      { id: 'text', label: uiText(preferences.locale, 'Text', 'النص'), detail: editorText.dragHint, icon: Captions },
      { id: 'subtitles', label: t('subtitles'), detail: subtitleFile ? subtitleFile.name : editorText.noSubtitle, icon: Upload }
    ] as const;
    const tools: EditorToolRailItem[] = items.filter(item => availableToolIds.has(item.id)).map(item => ({
      ...item, active: !audioInspectorOpen && activeEditorTool === item.id, onSelect: () => openEditorTool(item.id)
    }));
    return <ToolRail items={[...tools, {id:'audio',label:uiText(preferences.locale,'Audio','الصوت'),detail:uiText(preferences.locale,'Volume, fades and tone','المستوى والتدرّج والترددات'),icon:AudioLines,active:audioInspectorOpen,onSelect:()=>setAudioInspectorOpen(true)}]} />;
  }

  function renderEditorContextMenu() {
    if (!editorContextMenu) {
      return null;
    }

    const canPaste = canPasteCopiedTimelineItem();
    const canEditText = Boolean(selectedTextOverlay);
    const canLayerOrder = Boolean(selectedTextOverlay);
    const canToggleState = Boolean(
      selectedTextOverlay ||
        (selectedLayerIdForMedia === 'blur' && selectedBlurItem) ||
        (selectedLayerIdForMedia === 'zoom' && selectedZoomItem) ||
        (selectedLayerIdForMedia === 'speed' && selectedSpeedItem) ||
        (selectedLayerIdForMedia === 'reframe' && selectedReframeItem)
    );

    return (
      <EditorContextMenu
        canEditText={canEditText}
        canLayerOrder={canLayerOrder}
        canPaste={canPaste}
        canToggleState={canToggleState}
        locale={preferences.locale}
        onAction={runEditorContextAction}
        x={editorContextMenu.x}
        y={editorContextMenu.y}
      />
    );
  }

  function renderEditorPanel(className = 'editor-panel card-panel') {
    const playerProgressPercent = timelineDuration > 0 ? (clampRangeValue(playheadSeconds, 0, timelineDuration) / timelineDuration) * 100 : 0;
    const previewInstruction = audioInspectorOpen
      ? uiText(preferences.locale, "Play the clip to hear your adjustments and see its spectrum.", "شغّل المقطع لسماع التعديلات ومشاهدة طيف الصوت.")
      : selectedTextOverlay
      ? editorText.dragHint
      : selectedLayerIdForMedia === 'blur'
        ? editorText.dragBlurHint
        : selectedLayerIdForMedia === 'zoom'
          ? inspectorText.zoomHint
          : selectedLayerIdForMedia === 'speed'
            ? speedEditorHint()
            : selectedLayerIdForMedia === 'reframe'
              ? uiText(preferences.locale, 'Choose a canvas preset and position the media in the inspector.', 'اختر مقاس اللوحة واضبط موضع الوسائط من لوحة الخصائص.')
              : selectedLayerIdForMedia === 'subtitles'
                ? uiText(preferences.locale, 'Review subtitle timing and text from the inspector.', 'راجع توقيت الترجمة ونصها من لوحة الخصائص.')
                : selectedLayerIdForMedia === 'text'
                  ? uiText(preferences.locale, 'Add text, then drag it directly on the preview.', 'أضف نصًا ثم اسحبه مباشرة داخل المعاينة.')
                  : editorText.cutOutHint;
    const handlePreviewTimeUpdate = (media: HTMLMediaElement) => {
      const currentTime = media.currentTime;
      if (loopPlayback && isAudioEditor && !media.paused && keptRanges.length && currentTime >= effectiveTrimEnd - .02) {
        media.currentTime = keptRanges[0].startSeconds;
        commitPlayheadSeconds(media.currentTime);
        return;
      }
      const activeCut = cutOutRanges.find(
        (range) => currentTime >= range.startSeconds && currentTime < range.endSeconds
      );

      if (activeCut) {
        const skipTo = Math.min(activeCut.endSeconds, media.duration || activeCut.endSeconds);

        try {
          media.currentTime = skipTo;
        } catch {
          // Some media cannot seek until more data is loaded; the next time update retries.
        }

        commitPlayheadSeconds(skipTo);
        return;
      }

      playheadSecondsRef.current = currentTime;

      if (media.paused) {
        commitPlayheadSeconds(currentTime);
      }
    };

    return (
      <article onClick={event => {
        const button = (event.target as HTMLElement).closest('button');
        if (event.detail > 0 && button && !button.hasAttribute('aria-haspopup') && !button.closest('[role="menu"]')) {
          queueMicrotask(() => { if (document.activeElement === button && !document.querySelector('[role="menu"], dialog[open]')) button.blur(); });
        }
      }} aria-label={uiText(preferences.locale, 'Media editor', 'محرر الوسائط')} className={`${className} editor-studio${isAudioEditor ? ' editor-studio--audio' : ''}`}>
        <div className="editor-command-bar">
          <div className="editor-command-bar__media">
            <button className="editor-back-button" onClick={leaveEditorToWorkspace} type="button">
              <ArrowLeft aria-hidden="true" size={15} />
              {t('library')}
            </button>
            <div>
              <h2 dir="auto" data-tooltip={displayMediaTitle(selectedMedia)}>{displayMediaTitle(selectedMedia)}</h2>
              <p className="editor-source-line">
                <span dir="auto" data-tooltip={displayMediaSource(selectedMedia)}>{mediaSourceLabel(selectedMedia)} · {displayMediaSize(selectedMedia)}</span>
                {(selectedMedia.source || selectedMedia.filePath) ? (
                  <button className="source-copy-button" onClick={() => void copyMediaSource(selectedMedia)} type="button">
                    <Clipboard aria-hidden="true" size={13} />
                    {preferences.locale === 'ar' ? 'نسخ المصدر' : 'Copy source'}
                  </button>
                ) : null}
              </p>
            </div>
          </div>
          <div className="editor-command-bar__status">
            <span aria-live="polite" className={`autosave-status autosave-status--${autosaveState}`} role="status" data-tooltip={autosaveLabel()}>{autosaveState==='saved'?<><Check size={13} aria-hidden="true"/>{uiText(preferences.locale,'Saved','محفوظ')}</>:autosaveLabel()}</span>
          </div>
          <div className="panel-actions">
            <a className="button secondary editor-guide-link" href={`${documentationUrl}${isAudioEditor ? 'audio' : 'editor'}/`} target="_blank" rel="noopener noreferrer" data-tooltip={uiText(preferences.locale, 'Open the editor guide', 'فتح دليل المحرر')}>
              <BookOpen aria-hidden="true" size={15} />
              {uiText(preferences.locale, 'Help', 'مساعدة')}
            </a>
            <button className="button secondary editor-history-button" disabled={editorUndoStack.length === 0} onClick={undoEditorAction} type="button">
              <Undo2 aria-hidden="true" size={15} />
              {uiText(preferences.locale, 'Undo', 'تراجع')}
            </button>
            <button className="button secondary editor-history-button" disabled={editorRedoStack.length === 0} onClick={redoEditorAction} type="button">
              <Redo2 aria-hidden="true" size={15} />
              {uiText(preferences.locale, 'Redo', 'إعادة')}
            </button>
            {!isAudioEditor ? <button className="button secondary" disabled={extractingAudio} onClick={()=>void extractAudioForEditing(selectedMedia)}><AudioLines size={15}/>{uiText(preferences.locale,extractingAudio?'Extracting…':'Extract audio',extractingAudio?'جارٍ الاستخراج…':'استخراج الصوت')}</button> : null}
            {isAudioEditor&&<button className="button secondary" onClick={()=>{setAudioInspectorOpen(true);setAudioPanelTab('video');setTimeout(()=>document.querySelector('.visualizer-video-export')?.scrollIntoView({block:'nearest',behavior:'smooth'}),50);}} type="button"><Film size={15}/>{uiText(preferences.locale,'Export video','تصدير فيديو')}</button>}
            {renderOutputMenu()}
          </div>
        </div>

        <div className="editor-workspace-layout">
          {renderEditorToolRail()}

          <section
            aria-label={uiText(preferences.locale, 'Preview editor', 'معاينة المحرر')}
            aria-modal={isPreviewFocusMode ? true : undefined}
            className={`editor-stage${adjustingRegion ? ' editor-stage--adjusting' : ''}${isPlaying || previewResult ? ' editor-stage--result' : ''}${isPreviewFocusMode ? ' editor-stage--focus' : ''}${isPreviewFocusClosing ? ' editor-stage--focus-exit' : ''}${cleanAudioView && isAudioEditor ? ' editor-stage--clean-audio' : ''}${cleanControlsVisible ? ' clean-controls-visible' : ''}`}
            onPointerMove={revealCleanControls}
            onKeyDown={(event)=>{
              if(cleanAudioView && event.key==='Tab' && !cleanControlsVisible){
                event.preventDefault();flushSync(revealCleanControls);
                const controls=editorStageRef.current?.querySelectorAll<HTMLButtonElement>('.preview-control-button');
                (event.shiftKey ? controls?.[controls.length-1] : controls?.[0])?.focus();
              }
            }}
            ref={editorStageRef}
            role={isPreviewFocusMode ? 'dialog' : 'region'}
            tabIndex={isPreviewFocusMode ? -1 : undefined}
          >
            <div className="editor-stage__bar">
              <span>{adjustingRegion ? uiText(preferences.locale, 'Adjust on the full frame. Drag the box or its handles.', 'اضبط المنطقة على الصورة كاملة. اسحب الصندوق أو مقابضه.') : previewInstruction}</span>
              {hasRegionSelection ? <button className="button secondary preview-mode-toggle" type="button" aria-pressed={previewResult} onClick={() => { pausePlaybackForPreciseRegionEdit(); setPreviewResult(value => !value); }}>{previewResult ? uiText(preferences.locale, 'Adjust area', 'ضبط المنطقة') : uiText(preferences.locale, 'Preview result', 'معاينة النتيجة')}</button> : null}
            </div>

            <PreviewCanvas
              hasMedia={hasRealMedia}
              onContextMenu={(event) => openEditorContextMenu(event, 'preview')}
              onDrop={(event) => void handleWorkspaceDrop(event)}
              onPointerDown={() => setEditorContextMenu(undefined)}
              orientation={isAudioEditor?visualizerVideo.size:previewOrientation}
              previewRef={previewFrameRef}
              selectedLayerId={selectedLayerIdForMedia}
            >
            {selectedMedia.fileUrl ? selectedMedia.mediaKind === 'audio' ? (
              <div className="preview-audio audio-scene" style={{background:visualizerSettings.backgroundGradient ? `linear-gradient(145deg,${visualizerSettings.background},${visualizerSettings.backgroundEnd})` : visualizerSettings.background}}>
                <AudioVisualizer analyser={audioAnalyser} playing={isPlaying} settings={visualizerSettings} scene={{...visualizerVideo,settings:visualizerSettings,title:displayMediaTitle(selectedMedia)}}/>
                <audio
                  className="preview-audio__element"
                  crossOrigin="anonymous"
                  key={selectedMedia.fileUrl}
                  onEnded={(event) => {
                    if (loopPlayback && isAudioEditor) {
                      event.currentTarget.currentTime = keptRanges[0]?.startSeconds ?? 0;
                      void event.currentTarget.play().catch(() => setIsPlaying(false));
                    } else setIsPlaying(false);
                  }}
                  onLoadedData={(event) => {
                    if (selectedMedia.filePath) {
                      previewPlaybackFallbackRef.current.delete(selectedMedia.filePath);
                    }

                    const duration = event.currentTarget.duration;

                    if (Number.isFinite(duration) && duration > 0) {
                      try {
                        event.currentTarget.currentTime = clampRangeValue(playheadSecondsRef.current, 0, duration);
                      } catch {
                        // Seeking can wait until the player receives another interaction.
                      }
                    }
                  }}
                  onLoadedMetadata={(event) => {
                    const duration = event.currentTarget.duration;

                    if (Number.isFinite(duration) && duration > 0) {
                      updateSelectedMediaDuration(duration);
                      setTrimEndSeconds(current => selectedDurationSeconds > 0 ? Math.min(current, duration) : duration);
                      try {
                        event.currentTarget.currentTime = clampRangeValue(playheadSecondsRef.current, 0, duration);
                      } catch {
                        // Some media cannot seek until more data is loaded; the player controls will retry on interaction.
                      }
                      setActivity(t('previewReady'));
                    }
                  }}
                  onError={() => {
                    setIsPlaying(false);
                    setActivity(preferences.locale === 'ar' ? 'تعذر تشغيل معاينة هذا الصوت.' : 'This audio preview could not be played.');
                  }}
                  onTimeUpdate={(event) => handlePreviewTimeUpdate(event.currentTarget)}
                  ref={(element) => {
                    videoRef.current = element;
                  }}
                  preload="auto"
                  src={selectedMedia.fileUrl}
                />
              </div>
            ) : previewCanvasLayout ? (
              <div className="preview-canvas-frame" style={previewCanvasFrameStyle}>
                <div className="preview-canvas-frame__background" style={previewCanvasBackgroundStyle}>
                  {activeReframeItem && (activeReframeItem.background as ReframeBackground).kind === 'blur' ? (
                    <FilteredVideoPreview videoRef={videoRef} blurs={activeBlurItems} zoom={activeZoomItem} zoomScale={activeZoomScale} adjusting={false} style={{ objectFit: 'cover', filter: 'blur(20px)', transform: 'scale(1.1)' }} />
                  ) : null}
                </div>
                <video
                  crossOrigin="anonymous"
                  className="preview-canvas-frame__video"
                  key={selectedMedia.fileUrl}
                  onEnded={(event) => {
                    if (loopPlayback && isAudioEditor) {
                      event.currentTarget.currentTime = keptRanges[0]?.startSeconds ?? 0;
                      void event.currentTarget.play().catch(() => setIsPlaying(false));
                    } else setIsPlaying(false);
                  }}
                  onLoadedData={(event) => {
                    if (selectedMedia.filePath) {
                      previewPlaybackFallbackRef.current.delete(selectedMedia.filePath);
                    }

                    const duration = event.currentTarget.duration;

                    if (Number.isFinite(duration) && duration > 0) {
                      try {
                        event.currentTarget.currentTime = clampRangeValue(playheadSecondsRef.current, 0, duration);
                      } catch {
                        // Seeking can wait until the player receives another interaction.
                      }
                    }
                  }}
                  onLoadedMetadata={(event) => {
                    const duration = event.currentTarget.duration;
                    const { videoHeight, videoWidth } = event.currentTarget;

                    if (Number.isFinite(duration) && duration > 0) {
                      updateSelectedMediaDuration(duration);
                      setTrimEndSeconds(current => selectedDurationSeconds > 0 ? Math.min(current, duration) : duration);
                      try {
                        event.currentTarget.currentTime = clampRangeValue(playheadSecondsRef.current, 0, duration);
                      } catch {
                        // Some media cannot seek until more data is loaded; the player controls will retry on interaction.
                      }
                      setActivity(t('previewReady'));
                    }

                    if (videoWidth > 0 && videoHeight > 0) {
                      setPreviewMediaSize({ width: videoWidth, height: videoHeight });
                      const nextOrientation =
                        Math.abs(videoWidth - videoHeight) < 12 ? 'square' : videoHeight > videoWidth ? 'portrait' : 'landscape';
                      setPreviewOrientation(nextOrientation);
                    }
                  }}
                  onError={() => {
                    setIsPlaying(false);
                    if (selectedMedia.filePath && !previewPlaybackFallbackRef.current.has(selectedMedia.filePath)) {
                      previewPlaybackFallbackRef.current.add(selectedMedia.filePath);
                      void prepareSelectedMediaPreview(selectedMedia, { forceTranscode: true, preserveTimeline: true });
                      return;
                    }

                    setActivity(preferences.locale === 'ar' ? 'تعذر تشغيل معاينة هذا الفيديو.' : 'This video preview could not be played.');
                  }}
                  onTimeUpdate={(event) => handlePreviewTimeUpdate(event.currentTarget)}
                  ref={(element) => {
                    videoRef.current = element;
                  }}
                  playsInline
                  preload="auto"
                  src={selectedMedia.fileUrl}
                  style={previewCanvasVideoStyle}
                />
                {activeBlurItems.length > 0 || activeZoomItem ? <FilteredVideoPreview videoRef={videoRef} blurs={activeBlurItems} zoom={activeZoomItem} zoomScale={activeZoomScale} adjusting={adjustingRegion} style={previewCanvasVideoStyle} /> : null}
              </div>
            ) : (
              <div className="preview-video-aspect" style={{ position: 'absolute', left: previewMediaRect.left, top: previewMediaRect.top, width: previewMediaRect.width, height: previewMediaRect.height, overflow: 'hidden' }}>
                <video
                  crossOrigin="anonymous"
                  className="preview-video"
                  key={selectedMedia.fileUrl}
                  onEnded={(event) => {
                    if (loopPlayback && isAudioEditor) {
                      event.currentTarget.currentTime = keptRanges[0]?.startSeconds ?? 0;
                      void event.currentTarget.play().catch(() => setIsPlaying(false));
                    } else setIsPlaying(false);
                  }}
                  onLoadedData={(event) => {
                    if (selectedMedia.filePath) {
                      previewPlaybackFallbackRef.current.delete(selectedMedia.filePath);
                    }

                    const duration = event.currentTarget.duration;

                    if (Number.isFinite(duration) && duration > 0) {
                      try {
                        event.currentTarget.currentTime = clampRangeValue(playheadSecondsRef.current, 0, duration);
                      } catch {
                        // Seeking can wait until the player receives another interaction.
                      }
                    }
                  }}
                  onLoadedMetadata={(event) => {
                    const duration = event.currentTarget.duration;
                    const { videoHeight, videoWidth } = event.currentTarget;

                    if (Number.isFinite(duration) && duration > 0) {
                      updateSelectedMediaDuration(duration);
                      setTrimEndSeconds(current => selectedDurationSeconds > 0 ? Math.min(current, duration) : duration);
                      try {
                        event.currentTarget.currentTime = clampRangeValue(playheadSecondsRef.current, 0, duration);
                      } catch {
                        // Some media cannot seek until more data is loaded; the player controls will retry on interaction.
                      }
                      setActivity(t('previewReady'));
                    }

                    if (videoWidth > 0 && videoHeight > 0) {
                      setPreviewMediaSize({ width: videoWidth, height: videoHeight });
                      const nextOrientation =
                        Math.abs(videoWidth - videoHeight) < 12 ? 'square' : videoHeight > videoWidth ? 'portrait' : 'landscape';
                      setPreviewOrientation(nextOrientation);
                    }
                  }}
                  onError={() => {
                    setIsPlaying(false);
                    if (selectedMedia.filePath && !previewPlaybackFallbackRef.current.has(selectedMedia.filePath)) {
                      previewPlaybackFallbackRef.current.add(selectedMedia.filePath);
                      void prepareSelectedMediaPreview(selectedMedia, { forceTranscode: true, preserveTimeline: true });
                      return;
                    }

                    setActivity(preferences.locale === 'ar' ? 'تعذر تشغيل معاينة هذا الفيديو.' : 'This video preview could not be played.');
                  }}
                  onTimeUpdate={(event) => handlePreviewTimeUpdate(event.currentTarget)}
                  ref={(element) => {
                    videoRef.current = element;
                  }}
                  playsInline
                  preload="auto"
                  src={selectedMedia.fileUrl}
                  style={previewVideoStyle}
                />
                {activeBlurItems.length > 0 ? <FilteredVideoPreview videoRef={videoRef} blurs={activeBlurItems} zoom={activeZoomItem} zoomScale={activeZoomScale} adjusting={adjustingRegion} /> : null}
              </div>
            ) : (
              <div className="preview-empty">
                <FileVideo aria-hidden="true" size={22} />
                <strong>{editorText.dropPrimary}</strong>
                <small>{t('importRealMedia')}</small>
                <button className="button primary" onClick={() => void importLocalVideo()} type="button">
                  <Upload aria-hidden="true" size={15} />
                  {t('import')}
                </button>
              </div>
            )}
            {hasRealMedia
              ? activeBlurItems.map((item, index) => {
                const region = activeRegionForEffect(item, playheadSeconds);

                return (
                  <button
                    aria-label={uiText(preferences.locale, `Blur region ${index + 1}`, `منطقة التمويه ${index + 1}`)}
                    aria-pressed={selectedEffectItemId === item.id}
                    data-blur-id={item.id}
                    className={`preview-effect preview-effect--blur blur-shape--${item.shape ?? 'rectangle'} blur-style--${item.style ?? 'normal'}${selectedEffectItemId === item.id ? ' selected' : ''}`}
                    key={item.id}
                    onContextMenu={(event) => {
                      selectEffectItem('blur', item.id);
                      openEditorContextMenu(event, 'preview');
                    }}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      event.currentTarget.setPointerCapture(event.pointerId);
                      beginPreviewRegionDrag('blur', item.id, region, item.locked, event.currentTarget, event.clientX, event.clientY);
                      selectEffectItem('blur', item.id);
                    }}
                    onPointerMove={(event) => {
                      if (event.buttons === 1 && !item.locked) {
                        movePreviewRegionDrag(event.clientX, event.clientY);
                      }
                    }}
                    onPointerCancel={commitPreviewRegionDrag}
                    onPointerUp={commitPreviewRegionDrag}
                    style={previewRegionStyle(region, { '--blur-strength': `${blurStrengthForItem(item)}px` } as CSSProperties)}
                    type="button"
                  >
                    {(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const).map((corner) => (
                      <span
                        aria-hidden="true"
                        className={`region-resize-handle ${corner}`}
                        key={corner}
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          event.currentTarget.setPointerCapture(event.pointerId);
                          selectEffectItem('blur', item.id);
                          const target = event.currentTarget.closest('.preview-effect') as HTMLElement | null;
                          if (target) {
                            beginPreviewRegionDrag('blur', item.id, region, item.locked, target, event.clientX, event.clientY, corner);
                            movePreviewRegionDrag(event.clientX, event.clientY);
                          }
                        }}
                        onPointerMove={(event) => {
                          if (event.buttons === 1 && !item.locked) {
                            event.stopPropagation();
                            movePreviewRegionDrag(event.clientX, event.clientY);
                          }
                        }}
                        onPointerCancel={commitPreviewRegionDrag}
                        onPointerUp={commitPreviewRegionDrag}
                      />
                    ))}
                  </button>
                );
              })
              : null}
            {hasRealMedia
              ? activeZoomItems.map((item, index) => {
                const region = activeRegionForEffect(item, playheadSeconds);

                return (
                  <button
                    aria-label={uiText(preferences.locale, `Zoom region ${index + 1}`, `منطقة التكبير ${index + 1}`)}
                    aria-pressed={selectedEffectItemId === item.id}
                    className={`preview-effect preview-effect--zoom${selectedEffectItemId === item.id ? ' selected' : ''}`}
                    key={item.id}
                    onContextMenu={(event) => {
                      selectEffectItem('zoom', item.id);
                      openEditorContextMenu(event, 'preview');
                    }}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      event.currentTarget.setPointerCapture(event.pointerId);
                      beginPreviewRegionDrag('zoom', item.id, region, item.locked, event.currentTarget, event.clientX, event.clientY);
                      selectEffectItem('zoom', item.id);
                    }}
                    onPointerMove={(event) => {
                      if (event.buttons === 1 && !item.locked) {
                        movePreviewRegionDrag(event.clientX, event.clientY);
                      }
                    }}
                    onPointerCancel={commitPreviewRegionDrag}
                    onPointerUp={commitPreviewRegionDrag}
                    style={previewRegionStyle(region, { '--zoom-scale': String(zoomScaleForEffect(item, region)) } as CSSProperties)}
                    type="button"
                    >
                    {(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const).map((corner) => (
                      <span
                        aria-hidden="true"
                        className={`region-resize-handle ${corner}`}
                        key={corner}
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          event.currentTarget.setPointerCapture(event.pointerId);
                          selectEffectItem('zoom', item.id);
                          const target = event.currentTarget.closest('.preview-effect') as HTMLElement | null;
                          if (target) {
                            beginPreviewRegionDrag('zoom', item.id, region, item.locked, target, event.clientX, event.clientY, corner);
                            movePreviewRegionDrag(event.clientX, event.clientY);
                          }
                        }}
                        onPointerMove={(event) => {
                          if (event.buttons === 1 && !item.locked) {
                            event.stopPropagation();
                            movePreviewRegionDrag(event.clientX, event.clientY);
                          }
                        }}
                        onPointerCancel={commitPreviewRegionDrag}
                        onPointerUp={commitPreviewRegionDrag}
                      />
                    ))}
                  </button>
                );
              })
              : null}
            {null}
            {activeTextOverlays.map((overlay) => (
              <button
                className={`text-overlay${selectedTextOverlay?.id === overlay.id ? ' selected' : ''}`}
                data-layer-label={`L${overlay.zIndex}`}
                data-text-overlay-id={overlay.id}
                dir={detectEditorTextDirection(overlay.text)}
                key={overlay.id}
                onContextMenu={(event) => {
                  selectTextOverlayForContextPoint(overlay.id, event.clientX, event.clientY);
                  openEditorContextMenu(event, 'text');
                }}
                onClick={(event) => {
                  if (!textPointerStartRef.current?.moved) {
                    selectTextOverlayFromPoint(overlay.id, event.clientX, event.clientY, textPointerStartRef.current?.selectedId);
                  }
                  textPointerStartRef.current = undefined;
                }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  textPointerStartRef.current = { selectedId: selectedTextOverlayId, moved: false };
                  beginTextOverlayDrag(overlay, event.currentTarget, event.clientX, event.clientY);
                  selectTextOverlay(overlay.id);
                }}
                onPointerMove={(event) => {
                  if (event.buttons === 1 && !overlay.locked) {
                    if (textPointerStartRef.current) {
                      textPointerStartRef.current.moved = true;
                    }
                    moveTextOverlayDrag(event.clientX, event.clientY);
                  }
                }}
                onPointerCancel={() => {
                  commitTextOverlayDrag();
                  textPointerStartRef.current = undefined;
                }}
                onPointerUp={commitTextOverlayDrag}
                style={previewPointStyle(overlay.x, overlay.y, {
                  '--overlay-font-size': `${overlay.fontSize}px`,
                  color: overlay.color ?? '#ffffff',
                  fontFamily: editorTextCssFontFamily(overlay.fontFamily),
                  zIndex: overlay.zIndex
                } as CSSProperties)}
                type="button"
              >
                {overlay.text}
              </button>
            ))}
            {activeSubtitleText ? <div className="subtitle-preview-overlay">{activeSubtitleText}</div> : null}
            {hasRealMedia && (!isAudioEditor || (visualizerSettings.showBadges && !cleanAudioView)) ? <div className="preview-tool-chip">{audioInspectorOpen ? uiText(preferences.locale, 'Audio', 'الصوت') : selectedLayerIdForMedia === 'text' || selectedTextOverlay ? editorText.textLayer : t(selectedLayer.labelKey)}</div> : null}
              {!isAudioEditor || (visualizerSettings.showBadges && !cleanAudioView) ? <div className={`play-state${isPlaying ? ' running' : ''}`}>{isPlaying ? t('previewPlaying') : t('previewPaused')}</div> : null}
            </PreviewCanvas>
            {hasRealMedia ? (
              <div className="preview-control-strip" onPointerDown={(event) => event.stopPropagation()}>
                <button
                  aria-label={isPlaying ? t('pause') : t('play')}
                  aria-pressed={isPlaying}
                  className="preview-control-button"
                  onClick={() => void togglePlayback()}
                  type="button"
                >
                  {isPlaying ? <Pause aria-hidden="true" size={16} /> : <Play aria-hidden="true" size={16} />}
                </button>
                {isAudioEditor ? <button type="button" className={`preview-control-button${loopPlayback ? ' active' : ''}`} aria-label={uiText(preferences.locale,'Repeat playback','تكرار التشغيل')} data-tooltip={uiText(preferences.locale,'Repeat the kept audio range. Preview only.','تكرار النطاق المحدد أثناء الاستماع فقط.')} aria-pressed={loopPlayback} onClick={()=>setLoopPlayback(value=>!value)}><Repeat size={16} aria-hidden="true"/></button> : null}
                <strong>{formatDuration(playheadSeconds)}</strong>
                <div
                  aria-label={uiText(preferences.locale, 'Player scrubber', 'شريط تقدم المعاينة')}
                  aria-valuemax={timelineDuration}
                  aria-valuemin={0}
                  aria-valuenow={playheadSeconds}
                  aria-valuetext={`${formatDuration(playheadSeconds)} / ${formatDuration(timelineDuration)}`}
                  className="preview-control-strip__rail"
                  onKeyDown={(event) => {
                    const step = event.shiftKey ? 5 : 1;
                    let nextTime: number | undefined;

                    switch (event.key) {
                      case 'ArrowLeft':
                      case 'ArrowDown':
                        nextTime = playheadSeconds - step;
                        break;
                      case 'ArrowRight':
                      case 'ArrowUp':
                        nextTime = playheadSeconds + step;
                        break;
                      case 'Home':
                        nextTime = 0;
                        break;
                      case 'End':
                        nextTime = timelineDuration;
                        break;
                    }

                    if (nextTime !== undefined) {
                      event.preventDefault();
                      updatePlayhead(clampRangeValue(nextTime, 0, timelineDuration));
                    }
                  }}
                  onPointerCancel={() => {
                    playerScrubRef.current = false;
                  }}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    event.currentTarget.setPointerCapture(event.pointerId);
                    playerScrubRef.current = true;
                    seekPlayerFromPointer(event.clientX);
                  }}
                  onPointerMove={(event) => {
                    if (playerScrubRef.current && event.buttons === 1) {
                      event.stopPropagation();
                      seekPlayerFromPointer(event.clientX);
                    }
                  }}
                  onPointerUp={(event) => {
                    event.stopPropagation();
                    playerScrubRef.current = false;
                  }}
                  ref={playerScrubberRef}
                  role="slider"
                  tabIndex={0}
                >
                  <span style={{ inlineSize: `${playerProgressPercent}%` }} />
                  <i style={{ insetInlineStart: `clamp(8px, ${playerProgressPercent}%, calc(100% - 8px))` }} />
                </div>
                <small>{formatDuration(timelineDuration)}</small>
                <button
                  aria-label={isPreviewFocusMode
                    ? uiText(preferences.locale, 'Exit focused preview', 'الخروج من وضع المعاينة المركزة')
                    : uiText(preferences.locale, 'Open focused preview', 'فتح المعاينة المركزة')}
                  aria-pressed={isPreviewFocusMode}
                  className="preview-control-button preview-control-button--ghost preview-control-button--focus"
                  onClick={togglePreviewFocusMode}
                  type="button"
                >
                  {isPreviewFocusMode ? <Minimize2 aria-hidden="true" size={16} /> : <Maximize2 aria-hidden="true" size={16} />}
                </button>
              </div>
            ) : null}
          </section>

          {audioInspectorOpen ? <InspectorPanel title={uiText(preferences.locale,'Audio','الصوت')} subtitle={uiText(preferences.locale,'Sound and visualizer settings','إعدادات الصوت والطيف')}>
            {isAudioEditor ? <div className="segmented-control audio-panel-tabs">{(['sound','visualizer','video'] as const).map(tab=><button key={tab} type="button" aria-pressed={audioPanelTab===tab} className={audioPanelTab===tab?'active':''} onClick={()=>setAudioPanelTab(tab)}>{tab==='sound'?<SlidersHorizontal size={14} aria-hidden="true"/>:tab==='video'?<Film size={14} aria-hidden="true"/>:<AudioLines size={14} aria-hidden="true"/>}{tab==='sound'?uiText(preferences.locale,'Sound','الصوت'):tab==='video'?uiText(preferences.locale,'Video','الفيديو'):uiText(preferences.locale,'Visualizer','الطيف')}</button>)}</div> : null}
            {isAudioEditor && audioPanelTab==='visualizer' ? <VisualizerControls value={visualizerSettings} onChange={setVisualizerSettings} ar={preferences.locale==='ar'} onCleanView={openCleanAudioView}/> : isAudioEditor && audioPanelTab==='video' ? <VisualizerVideoExport busy={videoExportBusy} ar={preferences.locale==='ar'} analyser={audioAnalyser} playing={isPlaying} onBusy={setVideoExportBusy} options={{...visualizerVideo,scene:{...visualizerVideo,settings:visualizerSettings,title:displayMediaTitle(selectedMedia)}}} onChange={value=>setVisualizerVideo({...value,...value.scene})} payload={whole=>mediaOutputPayload(QuickCopyOutputKind.Audio,'Visualizer video',whole)}/> : <><AudioSectionControls base={audioSettings} sections={audioSections} selectedId={selectedAudioSectionId} onSelect={setSelectedAudioSectionId} onBase={value=>{pushEditorHistory();setAudioSettings(value);}} onSections={value=>{pushEditorHistory();setAudioSections(value);}} duration={timelineDuration} playhead={playheadSeconds} onSeek={updatePlayhead} ar={preferences.locale==='ar'} loop={isAudioEditor?loopPlayback:undefined} onLoopChange={setLoopPlayback}/>{renderSoundPresets()}</>}
          </InspectorPanel> : renderEditorInspector()}
        </div>

        {renderTimeline()}
        {renderEditorContextMenu()}
      </article>
    );
  }

  function renderDownloadsSurface() {
    const downloadRows = mediaRows.filter((row) => row.sourceType !== 'local');
    const downloadingRows = downloadRows.filter((row) => row.status === 'downloading');
    const queuedRows = downloadRows.filter((row) => row.status === 'queued');
    const completedRows = downloadRows.filter((row) => row.status === 'ready' || row.status === 'edited');
    const failedRows = downloadRows.filter((row) => row.status === 'failed');
    const filteredDownloadRows = downloadRows.filter((row) => {
      switch (downloadFilter) {
        case 'active':
          return row.status === 'downloading';
        case 'queued':
          return row.status === 'queued';
        case 'completed':
          return row.status === 'ready' || row.status === 'edited';
        case 'failed':
          return row.status === 'failed';
        default:
          return true;
      }
    });
    const downloadFilterOptions: readonly { readonly count: number; readonly label: string; readonly value: DownloadFilter }[] = [
      { value: 'all', label: uiText(preferences.locale, 'All', 'الكل'), count: downloadRows.length },
      { value: 'active', label: uiText(preferences.locale, 'Active', 'نشط'), count: downloadingRows.length },
      { value: 'queued', label: uiText(preferences.locale, 'Queued', 'منتظر'), count: queuedRows.length },
      { value: 'completed', label: uiText(preferences.locale, 'Completed', 'مكتمل'), count: completedRows.length },
      { value: 'failed', label: uiText(preferences.locale, 'Failed', 'متعثر'), count: failedRows.length }
    ];
    const hasQueuedDownloads = queuedRows.some((row) => Boolean(row.source));

    return (
      <section className="route-page downloads-page">
        <header className="page-heading"><div><h1>{t('downloads')}</h1><p>{uiText(preferences.locale, 'Paste a link to download. Completed files are saved in your library.', 'الصق رابطًا للتنزيل. الملفات المكتملة تُحفظ في مكتبتك.')}</p></div></header>
          <section className="command-bar download-composer" aria-label={uiText(preferences.locale, 'Download command', 'إضافة تنزيل')}>
            <div className="command-bar__controls">
              <label className="command-bar__group command-bar__group--wide">
                <Link aria-hidden="true" size={17} />
                <textarea
                  aria-label={uiText(preferences.locale, 'Media URL', 'رابط الوسائط')}
                  dir="auto"
                  onChange={(event) => setUrlValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                      event.preventDefault();
                      void addDownload();
                    }
                  }}
                  placeholder={t('pastePlaceholder')}
                  rows={1}
                  value={urlValue}
                />
              </label>
              <div className="command-bar__actions">
                <DesktopMenu
                  ariaLabel={t('quality')}
                  onChange={(quality) => {
                    updatePreferences({ quality });
                    setActivity(t('qualitySet', { quality: qualityLabel(quality, preferences.locale) }));
                  }}
                  options={qualityMenuOptions}
                  value={preferences.quality}
                  valueLabel={qualityLabel(preferences.quality, preferences.locale)}
                />

                <button className="button primary" onClick={() => void addDownload()} type="button">
                  <Download aria-hidden="true" size={15} />
                  {preferences.downloadStartMode === 'auto'
                    ? uiText(preferences.locale, 'Download now', 'تنزيل الآن')
                    : uiText(preferences.locale, 'Add to queue', 'إضافة إلى قائمة الانتظار')}
                </button>
              </div>
            </div>
          </section>
        <article className="card-panel download-queue">
          <div className="download-queue__toolbar">
            <div className="download-filters" aria-label={uiText(preferences.locale, 'Download status', 'حالة التنزيل')}>
              {downloadFilterOptions.map(option => <button className={downloadFilter === option.value ? 'active' : ''} aria-pressed={downloadFilter === option.value} key={option.value} onClick={() => setDownloadFilter(option.value)} type="button">{option.label}<span>{option.count}</span></button>)}
            </div>
            {hasQueuedDownloads ? <button className="button secondary" onClick={startAllQueuedDownloads} type="button"><Play size={14} />{uiText(preferences.locale, 'Start queued', 'بدء المنتظر')}</button> : null}
          </div>
          {renderDownloadCards(filteredDownloadRows)}
        </article>
      </section>
    );
  }

  function renderLibrarySurface() {
    const libraryRows = mediaRows.filter((row) => row.status === 'ready' || row.status === 'edited');
    const normalizedSearch = librarySearch.trim().toLocaleLowerCase(preferences.locale);
    const filteredLibraryRows = libraryRows
      .filter((row) => libraryFilter === 'all' || mediaKindForRow(row) === libraryFilter)
      .filter((row) => {
        if (!normalizedSearch) {
          return true;
        }

        return `${displayMediaTitle(row)} ${displayMediaSource(row)}`.toLocaleLowerCase(preferences.locale).includes(normalizedSearch);
      })
      .sort((left, right) => {
        if (librarySort === 'name') {
          return displayMediaTitle(left).localeCompare(displayMediaTitle(right), preferences.locale);
        }

        if (librarySort === 'duration') {
          return (right.durationSeconds ?? 0) - (left.durationSeconds ?? 0);
        }

        return (right.completedAtMs ?? right.createdAtMs ?? right.id) - (left.completedAtMs ?? left.createdAtMs ?? left.id);
      });
    const selectedLibraryItem = filteredLibraryRows.find((row) => row.id === selectedMediaId) ?? emptyMediaRow;
    const libraryFilterOptions: readonly { readonly value: LibraryFilter; readonly label: string }[] = [
      { value: 'all', label: uiText(preferences.locale, 'All', 'الكل') },
      { value: 'video', label: uiText(preferences.locale, 'Videos', 'الفيديو') },
      { value: 'audio', label: uiText(preferences.locale, 'Audio', 'الصوت') }
    ];
    const librarySortOptions: readonly MenuOption<LibrarySort>[] = [
      { value: 'recent', label: uiText(preferences.locale, 'Recently added', 'الأحدث إضافة'), icon: Clock3 },
      { value: 'name', label: uiText(preferences.locale, 'Name', 'الاسم'), icon: List },
      { value: 'duration', label: uiText(preferences.locale, 'Longest first', 'الأطول أولًا'), icon: Gauge }
    ];
    const activeSortLabel = librarySortOptions.find((option) => option.value === librarySort)?.label ?? librarySortOptions[0].label;

    return (
      <section className="route-page">
        {renderRouteHero({
          eyebrow: uiText(preferences.locale, 'YOUR COLLECTION', 'مجموعتك'),
          title: t('library'),
          description: uiText(preferences.locale, `${libraryRows.length} files · Select to preview, double-click to edit.`, `${libraryRows.length} ملفات · اختر للمعاينة، واضغط مرتين للتعديل.`),
          actions: (
            <button className="button primary" onClick={() => void importLocalVideo()} type="button">
              <Upload aria-hidden="true" size={15} />
              {t('import')}
            </button>
          )
        })}

        <div className={`route-workspace route-workspace--collection${selectedLibraryItem.id > 0 ? " has-selection" : ""}`}>
          <article className="card-panel route-panel route-panel--large">
            <div className="library-toolbar library-toolbar--rich">
              <label className="toolbar-search">
                <Search aria-hidden="true" size={15} />
                <input
                  aria-label={uiText(preferences.locale, 'Search library', 'البحث في المكتبة')}
                  dir="auto"
                  onChange={(event) => setLibrarySearch(event.currentTarget.value)}
                  placeholder={uiText(preferences.locale, 'Search title or source', 'ابحث بالعنوان أو المصدر')}
                  type="search"
                  value={librarySearch}
                />
                {librarySearch ? (
                  <button aria-label={uiText(preferences.locale, 'Clear search', 'مسح البحث')} onClick={() => setLibrarySearch('')} type="button">
                    <X aria-hidden="true" size={14} />
                  </button>
                ) : null}
              </label>
              <div className="library-toolbar__controls">
                <div className="segmented-control" aria-label={uiText(preferences.locale, 'Library filter', 'فلتر المكتبة')}>
                  {libraryFilterOptions.map((option) => (
                    <button
                      aria-pressed={libraryFilter === option.value}
                      className={libraryFilter === option.value ? 'active' : ''}
                      key={option.value}
                      onClick={() => setLibraryFilter(option.value)}
                      type="button"
                    >
                      {option.value === 'all' ? <Layers3 size={14} aria-hidden="true" /> : option.value === 'video' ? <Film size={14} aria-hidden="true" /> : <AudioLines size={14} aria-hidden="true" />}
                      {option.label}
                    </button>
                  ))}
                </div>
                <DesktopMenu
                  ariaLabel={uiText(preferences.locale, 'Sort library', 'ترتيب المكتبة')}
                  icon={<SlidersHorizontal aria-hidden="true" size={15} />}
                  onChange={setLibrarySort}
                  options={librarySortOptions}
                  value={librarySort}
                  valueLabel={activeSortLabel}
                />
                <div className="segmented-control segmented-control--icons" aria-label={preferences.locale === 'ar' ? 'طريقة عرض المكتبة' : 'Library view mode'}>
                  <button
                    aria-label={uiText(preferences.locale, 'Grid view', 'عرض شبكي')}
                    aria-pressed={libraryViewMode === 'grid'}
                    className={libraryViewMode === 'grid' ? 'active' : ''}
                    onClick={() => setLibraryViewMode('grid')}
                    type="button"
                  >
                    <LayoutGrid aria-hidden="true" size={15} />
                  </button>
                  <button
                    aria-label={uiText(preferences.locale, 'List view', 'عرض قائمة')}
                    aria-pressed={libraryViewMode === 'list'}
                    className={libraryViewMode === 'list' ? 'active' : ''}
                    onClick={() => setLibraryViewMode('list')}
                    type="button"
                  >
                    <List aria-hidden="true" size={15} />
                  </button>
                </div>
              </div>
            </div>
            <div className="library-bulk-toolbar" hidden={!libraryRows.length}>
              <button className="button secondary" disabled={!libraryRows.length} aria-pressed={librarySelecting} onClick={()=>{setLibrarySelecting(value=>!value);setLibrarySelection([]);}}>{librarySelecting?<X size={15}/>:<Check size={15}/>} {uiText(preferences.locale,librarySelecting?'Done selecting':'Select files',librarySelecting?'إنهاء التحديد':'تحديد ملفات')}</button>
              {librarySelecting&&<><button className="button secondary" onClick={()=>setLibrarySelection(filteredLibraryRows.map(row=>row.id))}><Check size={15}/>{uiText(preferences.locale,librarySearch||libraryFilter!=='all'?'Select all results':'Select all',librarySearch||libraryFilter!=='all'?'تحديد كل النتائج':'تحديد الكل')}</button><button className="button secondary" disabled={!librarySelection.length} onClick={()=>setLibrarySelection([])}><X size={15}/>{uiText(preferences.locale,'Clear selection','إلغاء التحديد')}</button><span role="status">{librarySelection.length} {uiText(preferences.locale,'selected','محدد')}</span><button className="button secondary" disabled={!librarySelection.length} onClick={()=>setLibraryRemoval([...librarySelection])}><Trash2 size={15}/>{uiText(preferences.locale,'Remove selected','إزالة المحدد')}</button></>}
            </div>
            <div className={`library-grid library-grid--${libraryViewMode}`}>
              {filteredLibraryRows.length === 0 && libraryRows.length > 0 ? (
                <div className="library-empty">
                  <span className="library-empty__icon">
                    <Search aria-hidden="true" size={24} />
                  </span>
                  <div>
                    <strong>{uiText(preferences.locale, 'No matching media', 'لا توجد ملفات مطابقة')}</strong>
                    <small>{uiText(preferences.locale, 'Clear the search or switch the media filter.', 'امسح البحث أو غيّر فلتر الوسائط.')}</small>
                  </div>
                  <button
                    className="button secondary"
                    onClick={() => {
                      setLibrarySearch('');
                      setLibraryFilter('all');
                    }}
                    type="button"
                  >
                    {uiText(preferences.locale, 'Reset filters', 'إعادة ضبط الفلاتر')}
                  </button>
                </div>
              ) : renderLibraryCards(filteredLibraryRows, selectedLibraryItem.id)}
            </div>
          </article>

          {selectedLibraryItem.id > 0 ? <aside className="card-panel route-panel route-inspector">
                <div className="selection-heading"><span>{t('selectedItem')}</span><button className="download-remove" type="button" aria-label={uiText(preferences.locale, 'Close details', 'إغلاق التفاصيل')} onClick={() => { persistEditorSnapshotNow(); setSelectedMediaId(undefined); }}><X size={16} /></button></div>
                <div className="route-inspector__media route-inspector__media--large">
                  {renderMediaThumbnail(selectedLibraryItem)}
                  <div>
                    <h2><bdi>{displayMediaTitle(selectedLibraryItem)}</bdi></h2>
                    <p dir="auto" data-tooltip={displayMediaSource(selectedLibraryItem)}>{mediaSourceLabel(selectedLibraryItem)}</p>
                  </div>
                </div>
                <div className="detail-list">
                  <span>{uiText(preferences.locale, 'Media type', 'نوع الوسائط')}</span>
                  <strong>{mediaKindLabel(selectedLibraryItem)}</strong>
                  <span>{t('duration')}</span>
                  <strong>{displayMediaDuration(selectedLibraryItem)}</strong>
                  <span>{uiText(preferences.locale, 'File size', 'حجم الملف')}</span>
                  <strong>{displayMediaSize(selectedLibraryItem)}</strong>
                  <span>{t('status')}</span>
                  <strong>{displayStatus(selectedLibraryItem.status)}</strong>
                </div>
                <div className="route-actions route-actions--stack">
                  {selectedLibraryItem.mediaKind === 'audio' && mediaFormatLabel(selectedLibraryItem) === 'MP4' && selectedLibraryItem.sourceType === 'download' ? <div className="legacy-audio-notice"><p>{uiText(preferences.locale, 'This older audio download is in an MP4 container. Download an MP3 copy to use the corrected format.', 'هذا التنزيل الصوتي القديم محفوظ داخل MP4. نزّل نسخة MP3 للحصول على الصيغة الصحيحة.')}</p><button className="button secondary button-wide" type="button" onClick={() => { retryDownload({ ...selectedLibraryItem, quality: 'audio' }); setDownloadFilter('active'); selectNavigation('downloads'); }}><Download size={14} />{uiText(preferences.locale, 'Download MP3 copy', 'تنزيل نسخة MP3')}</button></div> : null}
                  <button className="button secondary button-wide" onClick={() => void showSelectedMediaInFolder(selectedLibraryItem)} type="button"><FolderOpen size={15} />{uiText(preferences.locale, "Show in folder", "عرض في المجلد")}</button>
                  <button className="button primary button-wide" onClick={() => openSelectedMediaEditor(selectedLibraryItem)} type="button">
                    <Scissors aria-hidden="true" size={15} />
                    {t('openEditor')}
                  </button>
                  {selectedLibraryItem.mediaKind !== 'audio' ? <button className="button secondary button-wide" disabled={extractingAudio} onClick={()=>void extractAudioForEditing(selectedLibraryItem)}><AudioLines size={15}/>{uiText(preferences.locale,'Extract and edit audio','استخراج الصوت وتعديله')}</button> : null}
                  <button className="button secondary button-danger button-wide" onClick={() => requestRemoveMedia(selectedLibraryItem.id)} type="button">
                    <Trash2 aria-hidden="true" size={15} />
                    {uiText(preferences.locale, 'Remove file', 'إزالة الملف')}
                  </button>
                </div>
          </aside> : null}
        </div>
      </section>
    );
  }

  function renderEditorSurface() {
    return (
      <section className="route-surface route-surface--editor">
        {renderEditorPanel('editor-panel route-panel--large')}
      </section>
    );
  }

  function outputFormatForAction(kind: EditorOutputActionKind): string {
    if (kind === 'copy-gif' || kind === 'save-gif') {
      return 'GIF';
    }

    if (kind === 'copy-frame' || kind === 'save-frame') {
      return 'PNG';
    }

    if (kind === 'copy-audio' || kind === 'save-audio') {
      return 'MP3';
    }

    return 'MP4';
  }

  function renderOutputJobs(jobs: readonly QuickCopyJob[]) {
    if (jobs.length === 0) {
      return (
        <div className="activity-empty">
          <span className="activity-empty__icon"><Crop aria-hidden="true" size={21} /></span>
          <strong>{uiText(preferences.locale, 'No output jobs yet', 'لا توجد عمليات إخراج حتى الآن')}</strong>
          <small>{uiText(preferences.locale, 'Saved and copied outputs will appear here with their live status.', 'عمليات الحفظ والنسخ ستظهر هنا مع حالتها مباشرة.')}</small>
        </div>
      );
    }

    return (
      <div aria-live="polite" className="queue-list" role="log">
        {jobs.map((job) => {
          const complete = job.status === 'copied' || job.status === 'saved';
          const JobIcon = complete ? Check : job.status === 'failed' ? AlertTriangle : job.status === 'rendering' ? RefreshCcw : Clock3;

          return (
            <div className="queue-item" key={job.id}>
              <span className={`job-state ${job.status}`}>
                <JobIcon aria-hidden="true" className={job.status === 'rendering' ? 'output-menu__spinner' : undefined} size={12} />
              </span>
              <span>
                <strong dir="auto">{job.label.startsWith('Copy ') ? quickCopyLabel(job.kind, preferences.locale) : job.label}</strong>
                <small>
                  <span dir="ltr">{job.rangeLabel}</span>
                  {' / '}
                  {t(job.status)}
                  {job.destination ? ` / ${job.destination === 'file' ? uiText(preferences.locale, 'device', 'الجهاز') : uiText(preferences.locale, 'clipboard', 'الحافظة')}` : ''}
                </small>
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  function renderQueueSurface() {
    const activityDownloads = mediaRows.filter(
      (row) => row.sourceType !== 'local' && (row.status === 'downloading' || row.status === 'queued' || row.status === 'failed')
    );
    const activeCount = activityDownloads.filter((row) => row.status === 'downloading').length;
    const queuedCount = activityDownloads.filter((row) => row.status === 'queued').length;
    const failedCount = activityDownloads.filter((row) => row.status === 'failed').length;

    return (
      <section className="route-page">
        {renderRouteHero({
          eyebrow: uiText(preferences.locale, 'Activity center', 'مركز النشاط'),
          title: uiText(preferences.locale, 'See what is moving, waiting, or needs attention.', 'اعرف وش يعمل الآن، وش ينتظر، وش يحتاج انتباه.'),
          description: uiText(
            preferences.locale,
            'Active downloads and recent outputs stay together without mixing them into your finished library.',
            'التنزيلات النشطة وعمليات الإخراج الأخيرة في مكان واحد بدون خلطها بالمكتبة.'
          ),
          stats: [
            { icon: Download, label: uiText(preferences.locale, 'Active', 'نشط'), value: activeCount, tone: 'accent' },
            { icon: Clock3, label: uiText(preferences.locale, 'Queued', 'منتظر'), value: queuedCount },
            { icon: AlertTriangle, label: uiText(preferences.locale, 'Failed', 'متعثر'), value: failedCount, tone: failedCount > 0 ? 'danger' : 'muted' },
            { icon: Crop, label: uiText(preferences.locale, 'Outputs', 'الإخراج'), value: copyJobs.length, tone: 'ready' }
          ],
          actions: (
            <button className="button primary" onClick={() => selectNavigation('downloads')} type="button">
              <Download aria-hidden="true" size={15} />
              {uiText(preferences.locale, 'Open downloads', 'فتح التنزيلات')}
            </button>
          )
        })}

        <div className="route-workspace route-workspace--split">
          <article className="card-panel route-panel route-panel--large">
            <div className="panel-heading panel-heading--tight">
              <div>
                <h2>{uiText(preferences.locale, 'Current download activity', 'نشاط التنزيل الحالي')}</h2>
                <p>{uiText(preferences.locale, 'Only active, queued, and failed downloads appear here.', 'يظهر هنا فقط النشط والمنتظر والمتعثر.')}</p>
              </div>
              <span className="route-mode-badge">{activityDownloads.length} {t('items')}</span>
            </div>
            {activityDownloads.length > 0 ? (
              renderDownloadCards(activityDownloads)
            ) : (
              <div className="activity-empty">
                <span className="activity-empty__icon"><Check aria-hidden="true" size={21} /></span>
                <strong>{uiText(preferences.locale, 'Nothing needs attention', 'لا يوجد شيء يحتاج انتباه')}</strong>
                <small>{uiText(preferences.locale, 'New downloads will appear here while they are active or waiting.', 'التنزيلات الجديدة تظهر هنا وهي نشطة أو منتظرة.')}</small>
                <button className="button secondary" onClick={() => selectNavigation('downloads')} type="button">
                  {uiText(preferences.locale, 'View download history', 'عرض سجل التنزيلات')}
                </button>
              </div>
            )}
          </article>

          <aside className="card-panel route-panel">
            <div className="panel-heading panel-heading--tight">
              <div>
                <h2>{uiText(preferences.locale, 'Recent outputs', 'عمليات الإخراج الأخيرة')}</h2>
                <p>{uiText(preferences.locale, 'Live status for saves and clipboard copies.', 'حالة مباشرة لعمليات الحفظ والنسخ.')}</p>
              </div>
            </div>
            {renderOutputJobs(copyJobs.slice(0, 12))}
          </aside>
        </div>
      </section>
    );
  }

  function renderToolsSurface() {
    const tools = [
      { name: 'yt-dlp', title: 'yt-dlp', description: uiText(preferences.locale, 'Downloads video and audio from links.', 'تنزيل الفيديو والصوت من الروابط.') },
      { name: 'ffmpeg', title: 'FFmpeg + FFprobe', description: uiText(preferences.locale, 'Video editing, exports and media information. Updated together.', 'تعديل الفيديو والتصدير ومعلومات الملفات. يحُدّثهما معًا.') },
      { name: 'deno', title: 'Deno', description: uiText(preferences.locale, 'JavaScript runtime used for YouTube downloads.', 'محرك JavaScript المستخدم لتنزيلات يوتيوب.') }
    ];
    return (
      <section className="route-page tools-page">
        {renderRouteHero({ eyebrow: uiText(preferences.locale, 'APP TOOLS', 'أدوات التطبيق'), title: t('tools'),
          description: uiText(preferences.locale, 'Everything Loaderly needs to download, edit and export.', 'كل ما يحتاجه Loaderly للتنزيل والتعديل والتصدير.'),
          actions: <button className="button secondary" disabled={toolCheckBusy || Boolean(updatingToolName)} onClick={() => void runToolCheck()} type="button"><RefreshCcw size={15} />{toolCheckBusy ? uiText(preferences.locale, 'Checking…', 'جارٍ الفحص…') : uiText(preferences.locale, 'Check for updates', 'فحص التحديثات')}</button>
        })}
        <article className="card-panel tools-manager" aria-busy={toolCheckBusy || Boolean(updatingToolName)}>
          <div className="tools-update-notice" role="status" aria-live="polite"><Wrench size={16} /><span dir="auto">{toolUpdateMessage}</span></div>
          {updatingToolName && <div className="tool-install-progress" role="status" aria-live="polite">
            <span>{toolInstallProgress?.phase === 'downloading'
              ? uiText(preferences.locale, `Downloading ${(Number(toolInstallProgress.received ?? 0) / 1048576).toFixed(1)} MB${toolInstallProgress.total ? ` / ${(toolInstallProgress.total / 1048576).toFixed(1)} MB` : ''}`, `جارٍ التنزيل: ${(Number(toolInstallProgress.received ?? 0) / 1048576).toFixed(1)} ميجابايت`)
              : toolInstallProgress?.phase === 'verifying' ? uiText(preferences.locale, 'Verifying and starting the tool. The first run can take up to 90 seconds on macOS.', 'جارٍ التحقق وتشغيل الأداة. قد يستغرق التشغيل الأول على الماك حتى 90 ثانية.')
              : toolInstallProgress?.phase === 'activating' ? uiText(preferences.locale, 'Finishing installation…', 'جارٍ إنهاء التثبيت…') : uiText(preferences.locale, 'Checking the verified package…', 'جارٍ فحص حزمة الأداة…')}</span>
            <button className="button secondary" type="button" onClick={() => void window.loaderly?.cancelToolInstall()}>{uiText(preferences.locale, 'Cancel', 'إلغاء')}</button>
          </div>}
          <div className="tools-list">
            {tools.map(tool => {
              const status = toolStatuses.find(item => item.name === tool.name);
              const probe = tool.name === 'ffmpeg' ? toolStatuses.find(item => item.name === 'ffprobe') : undefined;
              const missing = status && (!status.available || (probe && !probe.available));
              const update = status?.updateAvailable || probe?.updateAvailable;
              const working = updatingToolName === tool.name;
              const badge = !status ? uiText(preferences.locale, 'Not checked', 'لم يُفحص') : missing ? uiText(preferences.locale, 'Not installed', 'غير مثبت') : status.checkError ? uiText(preferences.locale, 'Installed', 'مثبت') : update ? uiText(preferences.locale, 'Update available', 'تحديث متاح') : status.updateAvailable === false ? uiText(preferences.locale, 'Up to date', 'محدّث') : uiText(preferences.locale, 'Installed', 'مثبت');
              return <div className="tool-entry" key={tool.name}>
                <span className="tool-entry__icon"><Wrench size={22} /></span>
                <div className="tool-entry__copy"><div className="tool-entry__heading"><h2>{tool.title}</h2><span className={`tool-row__badge${missing ? ' missing' : update ? ' pending' : ' current'}`}>{badge}</span></div>
                  <p>{tool.description}</p>
                  <div className="tool-entry__versions"><span data-tooltip={status?.path}>{uiText(preferences.locale, 'Installed', 'المثبت')}: <b>{status?.available ? parseToolVersion(status.version ?? '') ?? status.version : 'N/A'}</b></span>
                  <span>{uiText(preferences.locale, 'Latest', 'الأحدث')}: <b>{status?.latestVersion ?? 'N/A'}</b></span></div>
                  {status?.checkError ? <small className="tool-entry__error" dir="auto">{uiText(preferences.locale, status.checkError, status.checkError.includes('limited requests') ? 'خدمة التحديثات حدّت الطلبات مؤقتًا. أعد المحاولة لاحقًا.' : status.checkError.includes('too long') ? 'تأخرت استجابة خدمة التحديثات. أعد المحاولة بعد دقيقة.' : status.checkError.includes('reach the update service') ? 'تعذر الاتصال بخدمة التحديثات. تحقق من اتصالك وأعد المحاولة بعد دقيقة.' : 'تعذر فحص التحديثات الآن. أعد المحاولة لاحقًا.')}</small> : null}
                  {status?.message && !status.available && status.path ? <small className="tool-entry__error" dir="auto">{status.message}</small> : null}
                </div>
                <button className={`button ${missing || update ? 'primary' : 'secondary'}`} disabled={!status?.updateSupported || toolCheckBusy || Boolean(updatingToolName) || (!missing && !update)} onClick={() => void updateBundledTool(tool.name)} type="button">
                  {working ? <RefreshCcw className="spin" size={15} /> : missing || update ? <Download size={15} /> : <Check size={15} />}
                  {working ? uiText(preferences.locale, 'Installing…', 'جارٍ التثبيت…') : missing ? uiText(preferences.locale, 'Install', 'تثبيت') : update ? uiText(preferences.locale, 'Update', 'تحديث') : !status ? uiText(preferences.locale, 'Check first', 'افحص أولًا') : uiText(preferences.locale, 'Installed', 'مثبت')}
                </button>
              </div>;
            })}
          </div>
          <p className="tools-manager__footnote">{uiText(preferences.locale, 'Tools are installed for Loaderly only. Your files and projects stay in place.', 'يتم تثبيت الأدوات لـ Loaderly فقط. تبقى ملفاتك ومشاريعك كما هي.')}</p>
        </article>
      </section>
    );
  }

  function renderExportSurface() {
    const outputActions = resolvedEditorOutputActions();
    const selectedRangeLabel = `${formatDuration(trimStartSeconds)} - ${formatDuration(effectiveTrimEnd)}`;
    const selectedRangeDuration = Math.max(0, effectiveTrimEnd - trimStartSeconds);
    const appliedEditCount = cutOutRanges.length + blurItems.length + zoomItems.length + speedItems.length + reframeItems.length + textOverlays.length + (subtitleFile ? 1 : 0);
    const availableOutputCount = outputActions.filter((action) => !action.disabled).length;

    return (
      <section className="route-page">
        {renderRouteHero({
          eyebrow: uiText(preferences.locale, 'Output studio', 'استوديو الإخراج'),
          title: uiText(preferences.locale, 'Turn the current edit into the exact file you need.', 'حوّل تعديلك الحالي للملف اللي تحتاجه بالضبط.'),
          description: uiText(
            preferences.locale,
            'Every action states its real format and destination. Jobs appear immediately while rendering.',
            'كل خيار يوضح صيغته ووجهته الحقيقية، وتظهر العملية مباشرة أثناء التجهيز.'
          ),
          stats: [
            { icon: Film, label: uiText(preferences.locale, 'Available actions', 'خيارات متاحة'), value: availableOutputCount, tone: 'accent' },
            { icon: Clock3, label: uiText(preferences.locale, 'Selected range', 'النطاق المحدد'), value: formatDuration(selectedRangeDuration) },
            { icon: Layers3, label: uiText(preferences.locale, 'Applied edits', 'تعديلات مطبقة'), value: appliedEditCount, tone: 'ready' },
            { icon: Crop, label: uiText(preferences.locale, 'Recent jobs', 'عمليات حديثة'), value: copyJobs.length }
          ],
          actions: (
            <button className="button primary" disabled={!isMediaReadyForEditor(selectedMedia)} onClick={() => openSelectedMediaEditor()} type="button">
              <Scissors aria-hidden="true" size={15} />
              {uiText(preferences.locale, 'Back to editor', 'العودة للمحرر')}
            </button>
          )
        })}

        <div className="route-workspace route-workspace--split">
          <article aria-busy={outputBusy !== undefined} className="card-panel route-panel route-panel--large">
            <div className="panel-heading panel-heading--tight">
              <div>
                <h2>{uiText(preferences.locale, 'Choose output', 'اختر الإخراج')}</h2>
                <p dir="auto">{displayMediaTitle(selectedMedia)}</p>
              </div>
              <span className="route-mode-badge">{availableOutputCount} / {outputActions.length}</span>
            </div>
            <div className="export-summary">
              <div>
                <strong>{uiText(preferences.locale, 'The selected timeline range is rendered with every supported edit.', 'يتم إخراج النطاق المحدد مع كل التعديلات المدعومة.')}</strong>
                <small>{uiText(preferences.locale, 'Pick an action below to save on the device or copy to the clipboard.', 'اختر من الأسفل للحفظ على الجهاز أو النسخ للحافظة.')}</small>
              </div>
              <div className="export-summary__meta">
                <span>{uiText(preferences.locale, 'Media', 'الوسائط')} <strong>{selectedEditorMediaKind === 'audio' ? 'MP3' : uiText(preferences.locale, 'Video', 'فيديو')}</strong></span>
                <span>{uiText(preferences.locale, 'Range', 'النطاق')} <strong dir="ltr">{selectedRangeLabel}</strong></span>
                <span>{uiText(preferences.locale, 'Edits', 'التعديلات')} <strong>{appliedEditCount}</strong></span>
              </div>
            </div>
            <div className="output-grid">
              {outputActions.map((action) => {
                const Icon = outputActionIcon(action.kind);
                const actionText = localizedOutputActionText(action, preferences.locale);
                const destination = action.kind.startsWith('save-')
                  ? uiText(preferences.locale, 'Device', 'الجهاز')
                  : uiText(preferences.locale, 'Clipboard', 'الحافظة');

                return (
                  <button
                    aria-busy={outputBusy === action.kind}
                    className={`output-card${action.disabled ? ' disabled' : ''}`}
                    disabled={action.disabled || outputBusy !== undefined}
                    key={action.kind}
                    onClick={() => void runEditorOutput(action.kind)}
                    type="button"
                  >
                    <span className="output-card__icon">
                      <Icon aria-hidden="true" size={20} />
                    </span>
                    <span className="output-card__copy">
                      <strong>{actionText.label}</strong>
                      <small>{actionText.description}</small>
                      <span className="output-card__meta">
                        <b>{outputFormatForAction(action.kind)}</b>
                        <b>{destination}</b>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </article>

          <aside className="card-panel route-panel">
            <div className="panel-heading panel-heading--tight">
              <div>
                <h2>{t('latestJobs')}</h2>
                <p>{uiText(preferences.locale, 'Rendering, saved, copied, and failed outputs.', 'عمليات التجهيز والحفظ والنسخ والمتعثرة.')}</p>
              </div>
            </div>
            {renderOutputJobs(copyJobs.slice(0, 10))}
          </aside>
        </div>
      </section>
    );
  }

  function renderSettingsSurface() {
    const tabs = [
      { id: 'general', label: uiText(preferences.locale, 'General', 'عام'), icon: Settings },
      { id: 'downloads', label: t('downloads'), icon: Download },
      { id: 'translation', label: uiText(preferences.locale, 'Subtitles & AI', 'الترجمة'), icon: Languages },
      { id: 'about', label: uiText(preferences.locale, 'About', 'حول البرنامج'), icon: Wrench }
    ] as const;
    return <section className="route-page settings-page">
      <header className="page-heading"><div><h1>{t('preferences')}</h1><p>{uiText(preferences.locale, 'Make Loaderly work your way. Changes are saved automatically.', 'اضبط Loaderly على طريقتك. تُحفظ تغييراتك تلقائيًا.')}</p></div></header>
      <nav className="settings-tabs" aria-label={uiText(preferences.locale, 'Settings sections', 'أقسام الإعدادات')}>
        {tabs.map(tab => <button aria-pressed={settingsTab === tab.id} className={settingsTab === tab.id ? 'active' : ''} key={tab.id} onClick={() => setSettingsTab(tab.id)} type="button"><tab.icon size={16} />{tab.label}</button>)}
      </nav>
      <article className="card-panel settings-panel"><div className="settings-list" key={settingsTab}>
        {settingsTab === 'general' ? <>
            <div className="setting-section-heading">
              <Sun aria-hidden="true" size={17} />
              <span>
                <strong>{uiText(preferences.locale, 'Appearance', 'المظهر')}</strong>
                <small>{uiText(preferences.locale, 'Theme, language, and interface direction', 'المظهر واللغة واتجاه الواجهة')}</small>
              </span>
            </div>
            <div className="setting-row">
              <span>
                <strong>{t('theme')}</strong>
                <small>{t('appearance')}</small>
              </span>
              <DesktopMenu
                ariaLabel={t('theme')}
                icon={preferences.themeMode === 'dark' ? <Moon aria-hidden="true" size={15} /> : <Sun aria-hidden="true" size={15} />}
                onChange={(themeMode) => {
                  updatePreferences({ themeMode });
                  setActivity(t('themeSet', { theme: themeLabel(themeMode, preferences.locale) }));
                }}
                options={themeMenuOptions}
                value={preferences.themeMode}
                valueLabel={themeLabel(preferences.themeMode, preferences.locale)}
              />
            </div>
            <AppearanceSettings value={preferences.appearance} onChange={appearance => updatePreferences({appearance})} ar={preferences.locale === 'ar'} dark={preferences.themeMode === 'dark'} />
            <div className="setting-row">
              <span>
                <strong>{t('language')}</strong>
                <small>{localeLabel(preferences.locale)}</small>
              </span>
              <DesktopMenu
                ariaLabel={t('language')}
                icon={<Languages aria-hidden="true" size={15} />}
                onChange={(locale) => {
                  const nextT = createText(locale);
                  updatePreferences({ locale });
                  setToolUpdateMessage(defaultToolUpdateMessage(locale));
                  setActivity(nextT('localeSet', { language: localeLabel(locale) }));
                }}
                options={localeMenuOptions}
                value={preferences.locale}
                valueLabel={localeLabel(preferences.locale)}
              />
            </div>
        </> : null}
        {settingsTab === 'downloads' ? <>
            <div className="setting-section-heading">
              <Download aria-hidden="true" size={17} />
              <span>
                <strong>{uiText(preferences.locale, 'Downloads', 'التنزيلات')}</strong>
                <small>{uiText(preferences.locale, 'Quality, start behavior, and file organization', 'الجودة وطريقة البدء وتنظيم الملفات')}</small>
              </span>
            </div>
            <div className="setting-row">
              <span>
                <strong>{t('quality')}</strong>
                <small>{t('downloadProfile')}</small>
              </span>
              <DesktopMenu
                ariaLabel={t('quality')}
                onChange={(quality) => {
                  updatePreferences({ quality });
                  setActivity(t('qualitySet', { quality: qualityLabel(quality, preferences.locale) }));
                }}
                options={qualityMenuOptions}
                value={preferences.quality}
                valueLabel={qualityLabel(preferences.quality, preferences.locale)}
              />
            </div>
            <div className="setting-row">
              <span>
                <strong>{preferences.locale === 'ar' ? 'بدء التنزيل' : 'Download start'}</strong>
                <small>{preferences.downloadStartMode === 'manual' ? (preferences.locale === 'ar' ? 'إضافة إلى قائمة الانتظار فقط' : 'Queue only') : (preferences.locale === 'ar' ? 'تنزيل فوري' : 'Start immediately')}</small>
              </span>
              <DesktopMenu
                ariaLabel={preferences.locale === 'ar' ? 'بدء التنزيل' : 'Download start'}
                onChange={(downloadStartMode) => {
                  updatePreferences({ downloadStartMode });
                  setActivity(
                    downloadStartMode === 'manual'
                      ? (preferences.locale === 'ar' ? 'الروابط الجديدة ستنتظر في قائمة الانتظار.' : 'New URLs will wait in the queue.')
                      : (preferences.locale === 'ar' ? 'الروابط الجديدة ستبدأ التنزيل مباشرة.' : 'New URLs will start downloading immediately.')
                  );
                }}
                options={downloadStartModeOptions}
                value={preferences.downloadStartMode}
                valueLabel={downloadStartModeOptions.find((option) => option.value === preferences.downloadStartMode)?.label ?? 'Auto'}
              />
            </div>
            <div className="setting-row">
              <span>
                <strong>{uiText(preferences.locale, 'Download folder', 'مجلد التنزيل')}</strong>
                <small className="setting-path">
                  {preferences.downloadDirectory || uiText(preferences.locale, 'Default Loaderly folder inside Downloads', 'المجلد الافتراضي داخل التنزيلات')}
                </small>
              </span>
              <div className="setting-actions">
                {preferences.downloadDirectory ? (
                  <button className="button secondary" onClick={() => updatePreferences({ downloadDirectory: '' })} type="button">
                    <X aria-hidden="true" size={15} />
                    {uiText(preferences.locale, 'Default', 'افتراضي')}
                  </button>
                ) : null}
                <button className="button secondary" onClick={() => void chooseDownloadDirectory()} type="button">
                  <HardDrive aria-hidden="true" size={15} />
                  {uiText(preferences.locale, 'Choose folder', 'اختيار مجلد')}
                </button>
              </div>
            </div>
            <div className="setting-row">
              <span>
                <strong>{uiText(preferences.locale, 'Platform folders', 'مجلدات المنصات')}</strong>
                <small>
                  {preferences.groupDownloadsByPlatform
                    ? uiText(preferences.locale, 'YouTube, TikTok, Instagram, and other sources get their own folders', 'يوتيوب وتيك توك وإنستقرام وغيرها يكون لكل منصة مجلد')
                    : uiText(preferences.locale, 'All downloads stay in the selected folder', 'كل التنزيلات تبقى في المجلد المحدد')}
                </small>
              </span>
              <DesktopMenu
                ariaLabel={uiText(preferences.locale, 'Platform folders', 'مجلدات المنصات')}
                onChange={(value) => updatePreferences({ groupDownloadsByPlatform: value === 'platform' })}
                options={[
                  {
                    value: 'platform',
                    label: uiText(preferences.locale, 'Sort by platform', 'تقسيم حسب المنصة'),
                    description: uiText(preferences.locale, 'Recommended for keeping sources organized', 'مناسب لترتيب المصادر تلقائياً')
                  },
                  {
                    value: 'single',
                    label: uiText(preferences.locale, 'Single folder', 'مجلد واحد'),
                    description: uiText(preferences.locale, 'Put every download in one place', 'ضع كل التنزيلات في مكان واحد')
                  }
                ]}
                value={preferences.groupDownloadsByPlatform ? 'platform' : 'single'}
                valueLabel={
                  preferences.groupDownloadsByPlatform
                    ? uiText(preferences.locale, 'Sort by platform', 'تقسيم حسب المنصة')
                    : uiText(preferences.locale, 'Single folder', 'مجلد واحد')
                }
              />
            </div>
        </> : null}
        {settingsTab === 'translation' ? <>
            <div className="setting-section-heading">
              <Captions aria-hidden="true" size={17} />
              <span>
                <strong>{uiText(preferences.locale, 'Subtitles', 'الترجمة')}</strong>
                <small>{uiText(preferences.locale, 'Download language and caption behavior', 'لغة التنزيل وطريقة التعامل مع الترجمة')}</small>
              </span>
            </div>
            <div className="setting-row">
              <span>
                <strong>{uiText(preferences.locale, 'Subtitle download', 'تنزيل الترجمة')}</strong>
                <small>
                  {preferences.subtitleDownloadMode === 'auto'
                    ? uiText(preferences.locale, 'Download subtitle files when available', 'تنزيل ملفات الترجمة عند توفرها')
                    : uiText(preferences.locale, 'Skip subtitle download requests', 'تخطي طلبات تنزيل الترجمة')}
                </small>
              </span>
              <DesktopMenu
                ariaLabel={uiText(preferences.locale, 'Subtitle download', 'تنزيل الترجمة')}
                onChange={(subtitleDownloadMode) => updatePreferences({ subtitleDownloadMode })}
                options={subtitleDownloadModeOptions}
                value={preferences.subtitleDownloadMode}
                valueLabel={subtitleDownloadModeOptions.find((option) => option.value === preferences.subtitleDownloadMode)?.label ?? 'Auto'}
              />
            </div>
            {preferences.subtitleDownloadMode === 'auto' ? (
            <div className="setting-row">
              <span>
                <strong>{uiText(preferences.locale, 'Subtitle language', 'لغة الترجمة')}</strong>
                <small>{subtitleLanguageOptions.find((option) => option.value === preferences.subtitleLanguageProfile)?.label ?? 'Best available'}</small>
              </span>
              <DesktopMenu
                ariaLabel={uiText(preferences.locale, 'Subtitle language', 'لغة الترجمة')}
                onChange={(subtitleLanguageProfile) => updatePreferences({ subtitleLanguageProfile })}
                options={subtitleLanguageOptions}
                value={preferences.subtitleLanguageProfile}
                valueLabel={subtitleLanguageOptions.find((option) => option.value === preferences.subtitleLanguageProfile)?.label ?? 'Best available'}
              />
            </div>
            ) : (
              <div className="setting-note">
                {uiText(
                  preferences.locale,
                  'Subtitle downloads are off. If you need captions for a video, enable them here before downloading.',
                  'تنزيل الترجمة متوقف. إذا احتجت ترجمة للمقطع، فعّلها من هنا قبل التنزيل.'
                )}
              </div>
            )}
            <div className="setting-section-heading">
              <Languages aria-hidden="true" size={17} />
              <span>
                <strong>{uiText(preferences.locale, 'AI translation', 'الترجمة بالذكاء الاصطناعي')}</strong>
                <small>{uiText(preferences.locale, 'Provider, model, and session credentials', 'المزود والنموذج وبيانات الجلسة')}</small>
              </span>
            </div>
            <div className="setting-row">
              <span>
                <strong>{uiText(preferences.locale, 'AI translation provider', 'مزود الترجمة بالذكاء الاصطناعي')}</strong>
                <small>{uiText(preferences.locale, 'Choose a provider before using auto-translate', 'اختر المزود قبل استخدام الترجمة الآلية')}</small>
              </span>
              <DesktopMenu
                ariaLabel={uiText(preferences.locale, 'AI translation provider', 'مزود الترجمة بالذكاء الاصطناعي')}
                onChange={(aiTranslationProvider) =>
                  updatePreferences({
                    aiTranslationProvider,
                    aiTranslationBaseUrl: aiProviderDefaultBaseUrl(aiTranslationProvider),
                    aiTranslationModel: aiProviderDefaultModel(aiTranslationProvider)
                  })
                }
                options={fullAiTranslationProviderOptions}
                placement="top"
                value={preferences.aiTranslationProvider}
                valueLabel={fullAiTranslationProviderOptions.find((option) => option.value === preferences.aiTranslationProvider)?.label ?? 'Disabled'}
              />
            </div>
            {preferences.aiTranslationProvider !== 'off' ? (
              <div className="setting-stack">
                <div className="setting-input-grid">
                  {aiProviderNeedsApiKey(preferences.aiTranslationProvider) || preferences.aiTranslationProvider === 'custom' ? (
                    <label className="setting-field">
                      <span>
                        {uiText(preferences.locale, 'API key', 'مفتاح API')}
                        <small>{uiText(preferences.locale, 'Used this session. Never saved on disk.', 'يُستخدم خلال الجلسة ولا يُحفظ على الجهاز')}</small>
                      </span>
                      <input
                        className="setting-input"
                        onChange={(event) => updatePreferences({ aiTranslationApiKey: event.currentTarget.value })}
                        placeholder={uiText(preferences.locale, 'Paste your provider key', 'ألصق مفتاح المزود')}
                        type="password"
                        value={preferences.aiTranslationApiKey}
                      />
                    </label>
                  ) : null}
                  {aiProviderNeedsBaseUrl(preferences.aiTranslationProvider) ? (
                    <label className="setting-field">
                      <span>{uiText(preferences.locale, 'Server URL', 'رابط الخادم')}</span>
                      <input
                        className="setting-input"
                        onChange={(event) => updatePreferences({ aiTranslationBaseUrl: event.currentTarget.value })}
                        placeholder={preferences.aiTranslationProvider === 'local' ? 'http://localhost:11434/v1' : 'https://api.example.com/v1'}
                        type="url"
                        value={preferences.aiTranslationBaseUrl}
                      />
                    </label>
                  ) : null}
                  <div className="setting-field setting-field--wide model-picker"><span>{uiText(preferences.locale,'Available models','النماذج المتاحة')}</span><DesktopMenu ariaLabel={uiText(preferences.locale,'Choose model','اختيار النموذج')} value={preferences.aiTranslationModel} valueLabel={preferences.aiTranslationModel || uiText(preferences.locale,'Choose a model','اختر نموذجًا')} options={(modelChoices.length?modelChoices:providerModels[preferences.aiTranslationProvider]).map(value=>({value,label:value}))} onChange={aiTranslationModel=>updatePreferences({aiTranslationModel})}/><button className="button secondary" disabled={modelsBusy} onClick={()=>void refreshAiModels()}>{uiText(preferences.locale,modelsBusy?'Loading…':'Refresh models',modelsBusy?'جارٍ الجلب…':'تحديث النماذج')}</button></div>
                  <label className="setting-field setting-field--wide">
                    <span>{uiText(preferences.locale, 'Model', 'النموذج')}</span>
                    <input
                      className="setting-input"
                      onChange={(event) => updatePreferences({ aiTranslationModel: event.currentTarget.value })}
                      placeholder={aiProviderDefaultModel(preferences.aiTranslationProvider)}
                      type="text"
                      value={preferences.aiTranslationModel}
                    />
                  </label>
                </div>
                <p role="status">{aiMessage}</p>
                <p aria-live="polite" className={`setting-status${aiProviderReady(preferences) ? ' ready' : ''}`} role="status">
                  {aiProviderReady(preferences)
                    ? uiText(preferences.locale, 'Settings complete. Refresh models to check provider access.', 'اكتملت الإعدادات. حدّث النماذج للتحقق من الاتصال بالمزود.')
                    : uiText(preferences.locale, 'Complete the provider settings before using auto-translate.', 'أكمل إعدادات المزود قبل استخدام الترجمة الآلية.')}
                </p>
              </div>
            ) : null}
        </> : null}
        {settingsTab === 'about' ? <>
          <div className="loaderly-about">
            <img alt="Loaderly" src="./assets/loaderly-64.png" />
            <div>
              <strong>Loaderly 2.1</strong>
              <p>{uiText(preferences.locale, 'Your media, from the first download to the final edit.', 'وسائطك، من أول تنزيل إلى آخر تعديل.')}</p>
            </div>
          </div>
          <div className="detail-list">
            <span>{t('appInfo')}</span>
            <strong>{window.loaderly?.appName ?? 'Loaderly 2.1'}</strong>
            <span>{t('platform')}</span>
            <strong>{platformDisplayLabel(window.loaderly?.platform, window.loaderly?.arch)}</strong>
          </div>
          <p className="loaderly-copyright"><a className="text-link" href={documentationUrl} target="_blank" rel="noopener noreferrer">{uiText(preferences.locale, 'Help & guides', 'المساعدة والوثائق')}</a> · © 2026 VOIDKSA · <a className="text-link" href="https://github.com/voidksa/Loaderly" target="_blank" rel="noreferrer">GitHub / voidksa</a></p>
            <div className="setting-section-heading">
              <RefreshCcw aria-hidden="true" size={17} />
              <span>
                <strong>{uiText(preferences.locale, 'Updates', 'التحديثات')}</strong>
                <small>{uiText(preferences.locale, 'Loaderly and bundled component updates', 'تحديث Loaderly والمكونات المدمجة')}</small>
              </span>
            </div>
            <ProgramUpdates beforeInstall={()=>!hasRealMedia||persistEditorSnapshotNow()} ar={preferences.locale==='ar'} busy={videoExportBusy||Boolean(outputBusy)||mediaRows.some(row=>row.status==='downloading')||copyJobs.some(job=>job.status==='rendering')}/>
        </> : null}
      </div></article>
    </section>;
  }

  function renderActiveSurface() {
    if(communityOpen)return <CommunityLibrary initialStudio={communityCreatorOpen} ar={preferences.locale==='ar'} dark={preferences.themeMode==='dark'} currentCode={kind=>kind==='sound'?encodeSoundPreset({audio:audioSections.find(section=>section.id===selectedAudioSectionId)?.settings??audioSettings,speed:selectedSpeedItem?{rate:selectedSpeedItem.rate,mode:selectedSpeedItem.mode??'preserve-pitch'}:undefined}):kind==='theme'?encodeTheme(preferences.appearance):encodeVisualizer(visualizerSettings)} onApply={look=>{
      if(look.kind==='sound'){const previous=pendingSoundCode;setPendingSoundCode(look.code);return()=>setPendingSoundCode(previous);}
      if(look.kind==='theme'){const previous=preferences.appearance;updatePreferences({appearance:decodeTheme(look.code)});return()=>updatePreferences({appearance:previous});}
      const previous=visualizerSettings,value=decodeVisualizer(look.code);if(value)setVisualizerSettings(value);return()=>setVisualizerSettings(previous);
    }}/>;
    switch (activeNav) {
      case 'workspace':
        return renderLibrarySurface();
      case 'downloads':
        return renderDownloadsSurface();
      case 'library':
        return renderLibrarySurface();
      case 'editor':
        return renderEditorSurface();
      case 'queue':
        return renderQueueSurface();
      case 'tools':
        return renderToolsSurface();
      case 'export':
        return renderExportSurface();
      case 'settings':
        return renderSettingsSurface();
    }
  }




  return (
    <main
      className={`app-shell${activeNav === 'editor' ? ' editor-mode' : ''}`}
      data-locale={preferences.locale}
      data-theme={preferences.themeMode}
      data-platform={window.loaderly?.platform ?? 'win32'}
    >
      <header className="titlebar">
        <div className="titlebar__left">
          <div className="titlebar__brand">
            <img alt="" className="brand-icon" src="./assets/loaderly-64.png" />
            <strong>Loaderly<span className="brand-version">2.1</span></strong>

          </div>
        </div>
        <div className="titlebar__actions">
          <span aria-live="polite" className="activity-announcement" dir="auto" role="status">{activity}</span>
        </div>
        {(!window.loaderly || window.loaderly.platform === 'win32') && <div className="window-controls" aria-label={uiText(preferences.locale, 'Window controls', 'أزرار النافذة')}>
          <button aria-label={uiText(preferences.locale, 'Minimize', 'تصغير')} className="window-control" onClick={() => void handleWindowControl('minimize')} type="button">
            <Minus aria-hidden="true" size={15} />
          </button>
          <button aria-label={uiText(preferences.locale, 'Maximize', 'تكبير')} className="window-control" onClick={() => void handleWindowControl('toggleMaximize')} type="button">
            <Square aria-hidden="true" size={13} />
          </button>
          <button aria-label={uiText(preferences.locale, 'Close', 'إغلاق')} className="window-control window-control--close" onClick={() => void handleWindowControl('close')} type="button">
            <X aria-hidden="true" size={15} />
          </button>
        </div>}
      </header>
          {activityNotice && <div className="activity-notice" role="alert" dir="auto"><span>{activityNotice}</span><button type="button" aria-label={preferences.locale==='ar'?'إغلاق':'Dismiss'} onClick={()=>setActivityNotice('')}><X size={15}/></button></div>}

      <div className="shell-body">
        <aside className="product-nav" aria-label={uiText(preferences.locale, 'Primary navigation', 'التنقل الرئيسي')}>
          <span className="nav-section-label">{uiText(preferences.locale, 'YOUR WORKSPACE', 'مساحة عملك')}</span>
          <nav className="product-nav__primary">
            {navigationItems.filter(item => item.key !== 'editor' || (openedEditorMediaId === selectedMediaId && isMediaReadyForEditor(selectedMedia))).map((item) => {
              const Icon = item.icon;
              return (
                <button
                  aria-current={activeNav === item.key ? 'page' : undefined}
                  className={`product-nav__item${activeNav === item.key ? ' active' : ''}`}
                  key={item.key}
                  onClick={() => selectNavigation(item.key)}
                  type="button"
                >
                  <Icon aria-hidden="true" size={16} />
                  <span>{t(item.labelKey)}</span>
                </button>
              );
            })}
            <div className="product-nav__community">
              <button className={`product-nav__item${communityOpen ? ' active' : ''}`} aria-current={communityOpen ? 'page' : undefined} onClick={() => selectNavigation('community')} type="button">
                <Users aria-hidden="true" size={16}/><span>{uiText(preferences.locale, 'Community library', 'مكتبة المجتمع')}</span>
              </button>
            </div>
          </nav>
          <div className="product-nav__utilities">
            <button aria-current={activeNav === 'tools' ? 'page' : undefined} className={`product-nav__utility${activeNav === 'tools' ? ' active' : ''}`} onClick={() => { selectNavigation('tools'); if (!toolStatuses.length) void runToolCheck(); }} type="button">
              <SlidersHorizontal aria-hidden="true" size={15} />
              <span>{t('tools')}</span>
            </button>
            <button aria-current={activeNav === 'settings' ? 'page' : undefined} className={`product-nav__utility${activeNav === 'settings' ? ' active' : ''}`} onClick={() => selectNavigation('settings')} type="button">
              <Settings aria-hidden="true" size={15} />
              <span>{t('preferences')}</span>
            </button>
            <a className="product-nav__utility documentation-link" href={documentationUrl} target="_blank" rel="noopener noreferrer" data-tooltip={uiText(preferences.locale, 'Open documentation and troubleshooting', 'فتح أدلة الاستخدام وحل المشكلات')}>
              <BookOpen aria-hidden="true" size={15} /><span>{uiText(preferences.locale, 'Help & guides', 'المساعدة والوثائق')}</span>
            </a>
            <a className="product-nav__utility support-link" href={preferences.locale === 'ar' ? 'https://creators.sa/ar/voidksa' : 'https://creators.sa/en/voidksa'} target="_blank" rel="noopener noreferrer">
              <Heart aria-hidden="true" size={15} /><span>{uiText(preferences.locale, 'Support Loaderly', 'دعم البرنامج')}</span>
            </a>
          </div>
        </aside>

        <section
          className="workspace"
          aria-label={uiText(preferences.locale, 'Loaderly workspace', 'مساحة عمل Loaderly')}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => void handleWorkspaceDrop(event)}
        >
          {availableProgramUpdate&&<div className="community-look-card" role="status"><strong>{uiText(preferences.locale,'A new Loaderly update is available: ','يتوفر تحديث جديد لـ Loaderly: ')}{availableProgramUpdate}</strong><button className="button secondary" onClick={()=>{selectNavigation('settings');setSettingsTab('about');setAvailableProgramUpdate('');}}>{uiText(preferences.locale,'View update in Settings','عرض التحديث في الإعدادات')}</button><button className="button secondary" onClick={()=>setAvailableProgramUpdate('')}>{uiText(preferences.locale,'Later','لاحقًا')}</button></div>}
          {showDiscovery&&!communityOpen&&['workspace','library'].includes(activeNav)&&<section className="discovery-card"><div><strong>{uiText(preferences.locale,'Make Loaderly yours','خلّ Loaderly على ذوقك')}</strong><p>{uiText(preferences.locale,'Try community themes, design an audio visualizer, and turn your audio into a video.','جرّب ثيمات المجتمع وصمّم طيفًا للصوت وحوّل صوتك إلى فيديو.')}</p></div><button className="button primary" onClick={()=>selectNavigation('community')}>{uiText(preferences.locale,'Explore designs','اكتشف التصاميم')}</button><button className="button secondary" onClick={()=>{localStorage.setItem('loaderly:discovery:2.1','dismissed');setShowDiscovery(false);}}>{uiText(preferences.locale,'Later','لاحقًا')}</button></section>}
          {renderActiveSurface()}
        </section>
      </div>
      {libraryRemoval&&<LibraryRemoval ar={preferences.locale==='ar'} names={mediaRows.filter(row=>libraryRemoval.includes(row.id)).map(displayMediaTitle)} canTrash={mediaRows.some(row=>libraryRemoval.includes(row.id)&&!!row.filePath)} onCancel={()=>setLibraryRemoval(undefined)} onRemove={removeLibrarySelection}/>}
      {playlistRequest&&<PlaylistPicker key={playlistRequest.url} url={playlistRequest.url} ar={preferences.locale==='ar'} initialSelection={playlistSelections.current.get(playlistRequest.url)} onRemember={ids=>playlistSelections.current.set(playlistRequest.url,ids)} onDone={entries=>{setPlaylistRequest(undefined);playlistRequest.resolve(entries);}}/>}
    </main>
  );
}
