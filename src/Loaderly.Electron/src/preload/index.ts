import type { AiConnection, TranslationInput } from '../shared/app-preferences/aiProviders';
import { contextBridge, ipcRenderer, webUtils, type IpcRendererEvent } from 'electron';

type SubtitleCue = {
  readonly startSeconds: number;
  readonly endSeconds: number;
  readonly text: string;
};

declare const __LOADERLY_VERSION__: string;
declare const __LOADERLY_BUILD__: string;

contextBridge.exposeInMainWorld('loaderly', {
  onDuplicatePrompt:(callback:(value:import('../shared/download-url/mediaIdentity').DuplicateDownloadPrompt)=>void)=>{const handler=(_event:IpcRendererEvent,value:import('../shared/download-url/mediaIdentity').DuplicateDownloadPrompt)=>callback(value);ipcRenderer.on('loaderly:duplicate-prompt',handler);return()=>ipcRenderer.removeListener('loaderly:duplicate-prompt',handler);},
  duplicateChoice:(id:string,choice:import('../shared/download-url/mediaIdentity').DuplicateChoice)=>ipcRenderer.invoke('loaderly:duplicate-choice',id,choice),
  onDownloadIdentity:(callback:(value:import('../shared/download-url/mediaIdentity').DownloadIdentity)=>void)=>{const handler=(_event:IpcRendererEvent,value:import('../shared/download-url/mediaIdentity').DownloadIdentity)=>callback(value);ipcRenderer.on('loaderly:download-identity',handler);return()=>ipcRenderer.removeListener('loaderly:download-identity',handler);},
  onDownloadProgress:(callback:(value:import('../shared/downloadProgress').DownloadProgress)=>void)=>{const handler=(_event:IpcRendererEvent,value:import('../shared/downloadProgress').DownloadProgress)=>callback(value);ipcRenderer.on('loaderly:download-progress',handler);return()=>ipcRenderer.removeListener('loaderly:download-progress',handler);},
  appName: `Loaderly ${__LOADERLY_VERSION__}`,
  appVersion: __LOADERLY_VERSION__,
  appBuild: __LOADERLY_BUILD__,
  trashMedia:(paths:string[])=>ipcRenderer.invoke('loaderly:trash-media',paths),
  missingLibraryFiles:(paths:string[])=>ipcRenderer.invoke('loaderly:missing-library-files',paths) as Promise<string[]>,
  playlistPreview:(url:string)=>ipcRenderer.invoke('loaderly:playlist-preview',url),
  cancelPlaylist:()=>ipcRenderer.invoke('loaderly:playlist-cancel'),
  cancelToolInstall: () => ipcRenderer.invoke('loaderly:cancel-tool-install'),
  onToolInstallProgress: (callback: (value: import('../shared/tool-manager/toolStatus').ToolInstallProgress) => void) => {
    const handler = (_event: IpcRendererEvent, value: import('../shared/tool-manager/toolStatus').ToolInstallProgress) => callback(value);
    ipcRenderer.on('loaderly:tool-install-progress', handler);
    return () => ipcRenderer.removeListener('loaderly:tool-install-progress', handler);
  },
  exportVisualizerVideo:(payload:unknown)=>ipcRenderer.invoke('loaderly:visualizer-export',payload),
  cancelVisualizerExport:()=>ipcRenderer.invoke('loaderly:visualizer-cancel'),
  onVisualizerExport:(callback:(state:import('../shared/editor-project/visualizerVideo').VisualizerExportProgress)=>void)=>{const handler=(_event:IpcRendererEvent,state:import('../shared/editor-project/visualizerVideo').VisualizerExportProgress)=>callback(state);ipcRenderer.on('loaderly:visualizer-progress',handler);return()=>ipcRenderer.removeListener('loaderly:visualizer-progress',handler);},
  communityCatalog: ()=>ipcRenderer.invoke('loaderly:community-catalog'),
  communityDrafts:(input:import('../shared/communityDrafts').DraftRequest)=>ipcRenderer.invoke('loaderly:community-drafts',input),
  communityRatings:(id?:string,stars?:number)=>ipcRenderer.invoke('loaderly:community-ratings',id,stars),
  communityAccount:(action:string)=>ipcRenderer.invoke('loaderly:community-account',action),
  programUpdate: (action:string,automatic?:boolean)=>ipcRenderer.invoke('loaderly:program-update',action,automatic),
  onProgramUpdate: (callback:(state:import('../shared/releases').UpdateState)=>void)=>{const handler=(_event:IpcRendererEvent,state:import('../shared/releases').UpdateState)=>callback(state);ipcRenderer.on('loaderly:program-update-state',handler);return ()=>ipcRenderer.removeListener('loaderly:program-update-state',handler);},
  discoverModels: (connection:AiConnection) => ipcRenderer.invoke('loaderly:ai-models',connection),
  translateSubtitles: (input:TranslationInput) => ipcRenderer.invoke('loaderly:ai-translate',input),
  cancelTranslation: () => ipcRenderer.invoke('loaderly:ai-cancel'),
  extractAudio: (request: import('../shared/audioExtraction').ExtractAudioRequest) => ipcRenderer.invoke('loaderly:extract-audio', request) as Promise<import('../shared/audioExtraction').ExtractAudioResult>,
  platform: process.platform,
  arch: process.arch,
  supportsClipboardFiles: process.platform === 'win32' || process.platform === 'darwin',
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
  checkDownloadDirectory: (path: string) => ipcRenderer.invoke('loaderly:check-download-directory', path) as Promise<import('../shared/download-destination/downloadFolderError').DownloadFolderCheck>,
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
    readonly rowId?:number;
    readonly knownFiles?: readonly string[];
    readonly locale?: 'en'|'ar';
    readonly url: string;
    readonly quality: 'best' | '2160p' | '1440p' | '1080p' | '720p' | '480p' | '360p' | 'audio';
    readonly downloadDirectory?: string;
    readonly groupDownloadsByPlatform?: boolean;
    readonly writeSubtitles?: boolean;
    readonly subtitleLanguages?: string;
  }) =>
    ipcRenderer.invoke('loaderly:download-url', payload) as Promise<{
      readonly ok: boolean;
      readonly skipped?: boolean;
      readonly replacedPath?: string;
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
    readonly saveMode?: 'beside' | 'replace' | 'choose';
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
      readonly canceled?: boolean;
      readonly replacedSource?: boolean;
      readonly durationSeconds?: number;
      readonly sizeBytes?: number;
      readonly fileUrl?: string;
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
  getWindowState: () => ipcRenderer.invoke('loaderly:window-control','state') as Promise<{ok:boolean;maximized:boolean}>,
  onWindowState: (callback:(state:{maximized:boolean})=>void) => {const handler=(_event:IpcRendererEvent,state:{maximized:boolean})=>callback(state);ipcRenderer.on('loaderly:window-state',handler);return()=>ipcRenderer.removeListener('loaderly:window-state',handler);},
  getWindowAppearanceSupport: () => ipcRenderer.invoke('loaderly:window-appearance-support') as Promise<{supported:boolean;reduced:boolean}>,
  onWindowAppearanceChanged: (callback:(state:{desktopGlass:boolean;supported:boolean;reduced:boolean})=>void) => {
    const handler=(_event:IpcRendererEvent,state:{desktopGlass:boolean;supported:boolean;reduced:boolean})=>callback(state);
    ipcRenderer.on('loaderly:window-appearance-changed',handler);
    return()=>ipcRenderer.removeListener('loaderly:window-appearance-changed',handler);
  },
  setTitlebarTheme: (themeMode: 'light' | 'dark', locale?: 'en' | 'ar', appearance?: unknown) =>
    ipcRenderer.invoke('loaderly:set-titlebar-theme', themeMode, locale, appearance) as Promise<{ readonly ok: boolean; readonly desktopGlass: boolean }>,
  trayAction: (action: 'open' | 'downloads' | 'editor' | 'settings' | 'exit') =>
    ipcRenderer.invoke('loaderly:tray-action', action) as Promise<{ readonly ok: boolean }>,
  windowControl: (action: 'minimize' | 'toggleMaximize' | 'close') =>
    ipcRenderer.invoke('loaderly:window-control', action) as Promise<{
      readonly ok: boolean;
      readonly maximized?: boolean;
    }>
});
