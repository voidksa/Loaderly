import type { AiConnection, TranslationInput } from '../shared/app-preferences/aiProviders';
import { contextBridge, ipcRenderer, webUtils, type IpcRendererEvent } from 'electron';

type SubtitleCue = {
  readonly startSeconds: number;
  readonly endSeconds: number;
  readonly text: string;
};

contextBridge.exposeInMainWorld('loaderly', {
  appName: 'Loaderly 2.0',
  discoverModels: (connection:AiConnection) => ipcRenderer.invoke('loaderly:ai-models',connection),
  translateSubtitles: (input:TranslationInput) => ipcRenderer.invoke('loaderly:ai-translate',input),
  cancelTranslation: () => ipcRenderer.invoke('loaderly:ai-cancel'),
  extractAudio: (path: string) => ipcRenderer.invoke('loaderly:extract-audio', path),
  platform: process.platform,
  arch: process.arch,
  onNavigate: (callback: (route: 'workspace' | 'downloads' | 'editor' | 'settings' | 'export') => void) => {
    const handler = (_event: IpcRendererEvent, route: 'workspace' | 'downloads' | 'editor' | 'settings' | 'export') => callback(route);

    ipcRenderer.on('loaderly:navigate', handler);

    return () => ipcRenderer.removeListener('loaderly:navigate', handler);
  },
  copyQuickItem: (payload: { label: string; mediaTitle: string; rangeLabel: string }) =>
    ipcRenderer.invoke('loaderly:copy-quick-item', payload) as Promise<{ ok: boolean }>,
  copyText: (text: string) => ipcRenderer.invoke('loaderly:copy-text', text) as Promise<{ ok: boolean }>,
  prepareMediaPreview: (path: string, options?: { readonly forceTranscode?: boolean }) =>
    ipcRenderer.invoke('loaderly:prepare-media-preview', path, options) as Promise<
      | { readonly canceled: true }
      | {
          readonly canceled: false;
          readonly path: string;
          readonly fileUrl: string;
          readonly thumbnailUrl?: string;
          readonly name: string;
          readonly sizeBytes: number;
          readonly durationSeconds?: number;
          readonly subtitlePath?: string;
        }
    >,
  pickMediaFile: () =>
    ipcRenderer.invoke('loaderly:pick-media-file') as Promise<
      | { readonly canceled: true }
      | {
          readonly canceled: false;
          readonly path: string;
          readonly fileUrl: string;
          readonly thumbnailUrl?: string;
          readonly name: string;
          readonly sizeBytes: number;
          readonly durationSeconds?: number;
          readonly subtitlePath?: string;
        }
    >,
  openMediaFile: (path: string) =>
    ipcRenderer.invoke('loaderly:open-media-file', path) as Promise<
      | { readonly canceled: true }
      | {
          readonly canceled: false;
          readonly path: string;
          readonly fileUrl: string;
          readonly thumbnailUrl?: string;
          readonly name: string;
          readonly sizeBytes: number;
          readonly durationSeconds?: number;
          readonly subtitlePath?: string;
        }
    >,
  showItemInFolder: (path: string) =>
    ipcRenderer.invoke('loaderly:show-item-in-folder', path) as Promise<{ readonly ok: boolean }>,
  pickDownloadDirectory: () =>
    ipcRenderer.invoke('loaderly:pick-download-directory') as Promise<{ readonly canceled: true } | { readonly canceled: false; readonly path: string }>,
  pickSubtitleFile: () =>
    ipcRenderer.invoke('loaderly:pick-subtitle-file') as Promise<
      | { readonly canceled: true }
      | { readonly canceled: false; readonly path: string; readonly name: string; readonly cues: readonly SubtitleCue[] }
    >,
  loadSubtitleFile: (path: string) =>
    ipcRenderer.invoke('loaderly:load-subtitle-file', path) as Promise<
      | { readonly canceled: true }
      | { readonly canceled: false; readonly path: string; readonly name: string; readonly cues: readonly SubtitleCue[] }
    >,
  filePathForDrop: (file: File) => webUtils.getPathForFile(file),
  downloadUrl: (payload: {
    readonly url: string;
    readonly quality: 'best' | '2160p' | '1440p' | '1080p' | '720p' | '480p' | '360p' | 'audio';
    readonly downloadDirectory?: string;
    readonly groupDownloadsByPlatform?: boolean;
    readonly writeSubtitles?: boolean;
    readonly subtitleLanguages?: string;
  }) =>
    ipcRenderer.invoke('loaderly:download-url', payload) as Promise<{
      readonly ok: boolean;
      readonly path?: string;
      readonly fileUrl?: string;
      readonly thumbnailUrl?: string;
      readonly name?: string;
      readonly sizeBytes?: number;
      readonly durationSeconds?: number;
      readonly subtitlePath?: string;
      readonly message?: string;
    }>,
  copyMediaOutput: (payload: {
    readonly sourcePath: string;
    readonly kind: 'video' | 'image' | 'gif' | 'snapshot' | 'audio';
    readonly label: string;
    readonly startSeconds: number;
    readonly endSeconds: number;
    readonly frameSeconds: number;
    readonly cutOutRanges?: readonly {
      readonly startSeconds: number;
      readonly endSeconds: number;
    }[];
    readonly textOverlays?: readonly {
      readonly text: string;
      readonly x: number;
      readonly y: number;
      readonly startSeconds: number;
      readonly endSeconds: number;
      readonly fontSize: number;
      readonly fontFamily?: string;
      readonly color?: string;
    }[];
    readonly subtitlePath?: string;
    readonly subtitleCues?: readonly SubtitleCue[];
    readonly effects?: {
      readonly blur?: {
        readonly strength: number;
        readonly shape?: 'rectangle' | 'ellipse' | 'face' | 'rounded';
        readonly style?: 'normal' | 'light' | 'strong' | 'pixelated';
        readonly x: number;
        readonly y: number;
        readonly width: number;
        readonly height: number;
        readonly startSeconds?: number;
        readonly endSeconds?: number;
      };
      readonly blurs?: readonly {
        readonly strength: number;
        readonly shape?: 'rectangle' | 'ellipse' | 'face' | 'rounded';
        readonly style?: 'normal' | 'light' | 'strong' | 'pixelated';
        readonly x: number;
        readonly y: number;
        readonly width: number;
        readonly height: number;
        readonly startSeconds?: number;
        readonly endSeconds?: number;
      }[];
      readonly zoom?: {
        readonly scale: number;
        readonly x: number;
        readonly y: number;
        readonly width: number;
        readonly height: number;
        readonly startSeconds?: number;
        readonly endSeconds?: number;
      };
      readonly zooms?: readonly {
        readonly scale: number;
        readonly x: number;
        readonly y: number;
        readonly width: number;
        readonly height: number;
        readonly startSeconds?: number;
        readonly endSeconds?: number;
        readonly easeIn?: number;
        readonly easeOut?: number;
      }[];
      readonly speed?: {
        readonly rate: number;
        readonly mode?: 'normal' | 'preserve-pitch' | 'warm' | 'bright' | 'radio';
        readonly startSeconds?: number;
        readonly endSeconds?: number;
      };
      readonly crop?: {
        readonly top: number;
        readonly bottom: number;
        readonly left: number;
        readonly right: number;
        readonly startSeconds?: number;
        readonly endSeconds?: number;
      };
    };
  }) =>
    ipcRenderer.invoke('loaderly:copy-media-output', payload) as Promise<{
      readonly ok: boolean;
      readonly path?: string;
      readonly message?: string;
    }>,
  saveMediaOutput: (payload: {
    readonly sourcePath: string;
    readonly kind: 'video' | 'image' | 'gif' | 'snapshot' | 'audio';
    readonly label: string;
    readonly startSeconds: number;
    readonly endSeconds: number;
    readonly frameSeconds: number;
    readonly cutOutRanges?: readonly {
      readonly startSeconds: number;
      readonly endSeconds: number;
    }[];
    readonly textOverlays?: readonly {
      readonly text: string;
      readonly x: number;
      readonly y: number;
      readonly startSeconds: number;
      readonly endSeconds: number;
      readonly fontSize: number;
      readonly color?: string;
      readonly fontFamily?: string;
    }[];
    readonly subtitlePath?: string;
    readonly subtitleCues?: readonly SubtitleCue[];
    readonly effects?: {
      readonly blur?: {
        readonly strength: number;
        readonly shape?: 'rectangle' | 'ellipse' | 'face' | 'rounded';
        readonly style?: 'normal' | 'light' | 'strong' | 'pixelated';
        readonly x: number;
        readonly y: number;
        readonly width: number;
        readonly height: number;
        readonly startSeconds?: number;
        readonly endSeconds?: number;
      };
      readonly blurs?: readonly {
        readonly strength: number;
        readonly shape?: 'rectangle' | 'ellipse' | 'face' | 'rounded';
        readonly style?: 'normal' | 'light' | 'strong' | 'pixelated';
        readonly x: number;
        readonly y: number;
        readonly width: number;
        readonly height: number;
        readonly startSeconds?: number;
        readonly endSeconds?: number;
      }[];
      readonly zoom?: {
        readonly scale: number;
        readonly x: number;
        readonly y: number;
        readonly width: number;
        readonly height: number;
        readonly startSeconds?: number;
        readonly endSeconds?: number;
      };
      readonly zooms?: readonly {
        readonly scale: number;
        readonly x: number;
        readonly y: number;
        readonly width: number;
        readonly height: number;
        readonly startSeconds?: number;
        readonly endSeconds?: number;
        readonly easeIn?: number;
        readonly easeOut?: number;
      }[];
      readonly speed?: {
        readonly rate: number;
        readonly mode?: 'normal' | 'preserve-pitch' | 'warm' | 'bright' | 'radio';
        readonly startSeconds?: number;
        readonly endSeconds?: number;
      };
      readonly crop?: {
        readonly top: number;
        readonly bottom: number;
        readonly left: number;
        readonly right: number;
        readonly startSeconds?: number;
        readonly endSeconds?: number;
      };
    };
  }) =>
    ipcRenderer.invoke('loaderly:save-media-output', payload) as Promise<{
      readonly ok: boolean;
      readonly path?: string;
      readonly message?: string;
    }>,
  checkTools: () =>
    ipcRenderer.invoke('loaderly:check-tools') as Promise<
      readonly {
        readonly name: string;
        readonly available: boolean;
        readonly path?: string;
        readonly version?: string;
        readonly message?: string;
        readonly updateSupported?: boolean;
      }[]
    >,
  updateTool: (toolName: string) =>
    ipcRenderer.invoke('loaderly:update-tool', toolName) as Promise<{
      readonly ok: boolean;
      readonly name: string;
      readonly message?: string;
      readonly status?: {
        readonly name: string;
        readonly available: boolean;
        readonly path?: string;
        readonly version?: string;
        readonly message?: string;
        readonly updateSupported?: boolean;
      };
    }>,
  setTitlebarTheme: (themeMode: 'light' | 'dark', locale?: 'en' | 'ar', appearance?: unknown) =>
    ipcRenderer.invoke('loaderly:set-titlebar-theme', themeMode, locale, appearance) as Promise<{ readonly ok: boolean }>,
  trayAction: (action: 'open' | 'downloads' | 'editor' | 'settings' | 'exit') =>
    ipcRenderer.invoke('loaderly:tray-action', action) as Promise<{ readonly ok: boolean }>,
  windowControl: (action: 'minimize' | 'toggleMaximize' | 'close') =>
    ipcRenderer.invoke('loaderly:window-control', action) as Promise<{
      readonly ok: boolean;
      readonly maximized?: boolean;
    }>
});
