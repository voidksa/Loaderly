export {};

type LoaderlySubtitleCue = {
  readonly startSeconds: number;
  readonly endSeconds: number;
  readonly text: string;
};

declare global {
  interface Window {
    readonly loaderly?: {
      readonly onDuplicatePrompt:(callback:(value:import('../shared/download-url/mediaIdentity').DuplicateDownloadPrompt)=>void)=>()=>void;
      readonly duplicateChoice:(id:string,choice:import('../shared/download-url/mediaIdentity').DuplicateChoice)=>Promise<{ok:boolean}>;
      readonly onDownloadIdentity:(callback:(value:import('../shared/download-url/mediaIdentity').DownloadIdentity)=>void)=>()=>void;
      readonly onDownloadProgress:(callback:(value:import('../shared/downloadProgress').DownloadProgress)=>void)=>()=>void;
      readonly appName: string;
      readonly appVersion: string;
      readonly appBuild: string;
      readonly trashMedia:(paths:string[])=>Promise<{removed:string[];failed:string[]}>;
      readonly missingLibraryFiles:(paths:string[])=>Promise<string[]>;
      readonly playlistPreview:(url:string)=>Promise<import('../shared/download-url/playlist').PlaylistResult>;
      readonly cancelPlaylist:()=>Promise<{ok:boolean}>;
      readonly exportVisualizerVideo:(payload:Parameters<NonNullable<Window['loaderly']>['saveMediaOutput']>[0]&{options:import('../shared/editor-project/visualizerVideo').VisualizerVideoOptions;whole:boolean})=>Promise<{ok:boolean;canceled?:boolean;path?:string;message?:string}>;
      readonly cancelVisualizerExport:()=>Promise<void>;
      readonly onVisualizerExport:(callback:(state:import('../shared/editor-project/visualizerVideo').VisualizerExportProgress)=>void)=>()=>void;
      readonly communityCatalog: ()=>Promise<import('../shared/community').CommunityCatalog>;
      readonly communityDrafts:(input:import('../shared/communityDrafts').DraftRequest)=>Promise<import('../shared/communityDrafts').DraftResult>;
      readonly communityRatings:(id?:string,stars?:number)=>Promise<import('../shared/communityRatings').CommunityRatingsResult>;
      readonly communityAccount:(action:'sign-in'|'poll'|'sign-out'|'cancel'|'open')=>Promise<import('../shared/communityRatings').CommunityAccount>;
      readonly programUpdate: (action:'state'|'check'|'download'|'cancel'|'install'|'automatic',automatic?:boolean)=>Promise<import('../shared/releases').UpdateState>;
      readonly onProgramUpdate: (callback:(state:import('../shared/releases').UpdateState)=>void)=>()=>void;
      readonly discoverModels: (connection:import('../shared/app-preferences/aiProviders').AiConnection) => Promise<{ok:boolean;models?:string[];message?:string}>;
      readonly translateSubtitles: (input:import('../shared/app-preferences/aiProviders').TranslationInput) => Promise<{ok:boolean;cues?:LoaderlySubtitleCue[];message?:string}>;
      readonly cancelTranslation: () => Promise<{ok:boolean}>;
      readonly extractAudio: (request:import('../shared/audioExtraction').ExtractAudioRequest) => Promise<import('../shared/audioExtraction').ExtractAudioResult>;
      readonly platform: NodeJS.Platform;
      readonly supportsClipboardFiles: boolean;
      readonly arch: NodeJS.Architecture;
      readonly onNavigate: (
        callback: (route: 'workspace' | 'downloads' | 'editor' | 'settings' | 'export') => void
      ) => () => void;
      readonly copyQuickItem: (payload: {
        readonly label: string;
        readonly mediaTitle: string;
        readonly rangeLabel: string;
      }) => Promise<{ readonly ok: boolean }>;
      readonly copyText: (text: string) => Promise<{ readonly ok: boolean }>;
      readonly prepareMediaPreview: (path: string, options?: { readonly forceTranscode?: boolean }) => Promise<
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
      >;
      readonly pickMediaFile: () => Promise<
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
      >;
      readonly openMediaFile: (path: string) => Promise<
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
      >;
      readonly showItemInFolder: (path: string) => Promise<{ readonly ok: boolean }>;
      readonly pickDownloadDirectory: () => Promise<{ readonly canceled: true } | { readonly canceled: false; readonly path: string }>;
      readonly checkDownloadDirectory: (path: string) => Promise<import('../shared/download-destination/downloadFolderError').DownloadFolderCheck>;
      readonly pickSubtitleFile: () => Promise<
        | { readonly canceled: true }
        | {
            readonly canceled: false;
            readonly path: string;
            readonly name: string;
            readonly cues: readonly LoaderlySubtitleCue[];
          }
      >;
      readonly loadSubtitleFile: (path: string) => Promise<
        | { readonly canceled: true }
        | {
            readonly canceled: false;
            readonly path: string;
            readonly name: string;
            readonly cues: readonly LoaderlySubtitleCue[];
          }
      >;
      readonly filePathForDrop: (file: File) => string;
      readonly downloadUrl: (payload: {
        readonly rowId?:number;
    readonly knownFiles?: readonly string[];
        readonly locale?: 'en'|'ar';
        readonly url: string;
        readonly quality: 'best' | '2160p' | '1440p' | '1080p' | '720p' | '480p' | '360p' | 'audio';
        readonly downloadDirectory?: string;
        readonly groupDownloadsByPlatform?: boolean;
        readonly writeSubtitles?: boolean;
        readonly subtitleLanguages?: string;
      }) => Promise<{
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
      }>;
      readonly copyMediaOutput: (payload: {
        readonly sourcePath: string;
        readonly kind: 'video' | 'image' | 'gif' | 'snapshot' | 'audio';
        readonly audio?: import('../shared/editor-project/audioProcessing').AudioSettings;
        readonly audioSections?: import('../shared/editor-project/audioSections').AudioSection[];
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
        readonly subtitleCues?: readonly LoaderlySubtitleCue[];
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
        };
      }) => Promise<{
        readonly ok: boolean;
        readonly path?: string;
        readonly message?: string;
      }>;
      readonly saveMediaOutput: (payload: {
        readonly sourcePath: string;
    readonly saveMode?: 'beside' | 'replace' | 'choose';
        readonly kind: 'video' | 'image' | 'gif' | 'snapshot' | 'audio';
        readonly audio?: import('../shared/editor-project/audioProcessing').AudioSettings;
        readonly audioSections?: import('../shared/editor-project/audioSections').AudioSection[];
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
        readonly subtitleCues?: readonly LoaderlySubtitleCue[];
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
        };
      }) => Promise<{
        readonly ok: boolean;
      readonly canceled?: boolean;
      readonly replacedSource?: boolean;
      readonly durationSeconds?: number;
      readonly sizeBytes?: number;
      readonly fileUrl?: string;
        readonly path?: string;
        readonly message?: string;
      }>;
      readonly checkTools: () => Promise<
        readonly {
          readonly name: string;
          readonly available: boolean;
          readonly path?: string;
          readonly version?: string;
          readonly message?: string;
          readonly updateSupported?: boolean;
          readonly latestVersion?: string;
          readonly updateAvailable?: boolean;
          readonly checkError?: string;
        }[]
      >;
        readonly cancelToolInstall: () => Promise<{ ok: boolean }>;
        readonly onToolInstallProgress: (callback: (value: import('../shared/tool-manager/toolStatus').ToolInstallProgress) => void) => () => void;
        readonly updateTool: (toolName: string) => Promise<{
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
          readonly latestVersion?: string;
          readonly updateAvailable?: boolean;
          readonly checkError?: string;
        };
      }>;
      readonly getWindowState: () => Promise<{ok:boolean;maximized:boolean}>;
      readonly onWindowState: (callback:(state:{maximized:boolean})=>void) => () => void;
      readonly getWindowAppearanceSupport: () => Promise<{supported:boolean;reduced:boolean}>;
      readonly onWindowAppearanceChanged: (callback:(state:{desktopGlass:boolean;supported:boolean;reduced:boolean})=>void) => () => void;
      readonly setTitlebarTheme: (themeMode: 'light' | 'dark', locale?: 'en' | 'ar', appearance?: unknown) => Promise<{ readonly ok: boolean; readonly desktopGlass?: boolean }>;
      readonly trayAction: (action: 'open' | 'downloads' | 'editor' | 'settings' | 'exit') => Promise<{ readonly ok: boolean }>;
      readonly windowControl: (action: 'minimize' | 'toggleMaximize' | 'close') => Promise<{
        readonly ok: boolean;
        readonly maximized?: boolean;
      }>;
    };
  }
}
