import {exportVisualizerVideo,runEncoder} from './visualizerExport';
import type {VisualizerVideoOptions} from '../shared/editor-project/visualizerVideo';
import { communityCatalog } from './communityCatalog';
import {applyWindowAppearance} from './windowAppearance';
import { CommunityRatings } from './communityRatings';
import { ProgramUpdates } from './programUpdates';
import {inspectPlaylist} from './playlist';
import {trashMediaFiles} from './trashMedia';
import {managedDownload,missingLibraryFiles,type DuplicateChoice} from './downloadConflicts';
import { audioSpeedFilterChain, hasSpeedSound, normalizeSpeedMode } from '../shared/editor-project/speedSound';
import { appearanceVariables, normalizeAppearance, defaultAppearance } from '../shared/app-preferences/appearance';
import { discoverModels, translateCues } from './aiTranslation';
import type { AiConnection, TranslationInput } from '../shared/app-preferences/aiProviders';
import { type AudioSettings } from '../shared/editor-project/audioProcessing';
import { applyAudioEffects, needsAudioEffects } from './audioEffects';
import { blurAmount, pixelBlockSize, blurShapeAlpha } from '../shared/editor-project/blurRendering';
import { ToolManager } from './toolManager';
import { textFontCandidates, toolCandidates } from './desktopPlatform';
import { macApplicationMenu, textContextMenu } from './desktopMenus';
import { pathToFileURL } from 'node:url';
import type { ToolName, ToolStatus } from '../shared/tool-manager/toolStatus';
import { app, BrowserWindow, clipboard, dialog, ipcMain, Menu, nativeImage, protocol, screen, shell, Tray, type IpcMainInvokeEvent, type OpenDialogOptions } from 'electron';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { mkdir, readdir, readFile, stat, writeFile, rename, unlink } from 'node:fs/promises';
import { basename, dirname, extname, isAbsolute, join, parse } from 'node:path';
import { Readable } from 'node:stream';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';
import {
  isRecoverableDownloadFileError,
  mediaFileNameMatchesSourceIdentity,
  sourceIdentityFromUrl,
  subtitlesSkippedRateLimitMessage,
  subtitlesSkippedUnavailableMessage
} from '../shared/download-recovery/downloadRecovery';
import { defaultLoaderlyDownloadDirectory, resolveDownloadDirectory } from '../shared/download-destination/downloadDestination';
import { downloadFormatArgs as sharedDownloadFormatArgs, isFinalDownloadPath } from '../shared/download-formats/downloadFormats';
import { MAX_DOWNLOAD_URL_LENGTH, normalizeDownloadUrl } from '../shared/download-url/downloadUrl';
import { buildReframeFilter } from '../shared/reframe/reframeFilter';
import type { ReframeEffectItem } from '../shared/editor-project/editorProject';
import { keptRangesFromCutOuts, type TimeRange } from '../shared/editor-timeline/editorTimeline';
import { mediaContentTypeForPath, mediaFileResponsePlan, mediaCorsHeaders } from '../shared/media-protocol/mediaProtocol';
import { retimeSubtitleCuesForOutput, subtitleCuesForStillFrame } from '../shared/editor-project/editorSubtitles';
import {
  defaultEditorTextFontFamily,
  prepareEditorTextForExport,
  type EditorTextFontFamily
} from '../shared/editor-project/editorTextOverlay';

const execFileAsync = promisify(execFile);
const ytDlpIsolationArgs = ['--ignore-config', '--no-plugin-dirs', '--no-exec'] as const;

const isExportValidationRun = Boolean(process.env.LOADERLY_EXPORT_VALIDATION_PAYLOAD || process.env.LOADERLY_EXPORT_VALIDATION_PAYLOAD_PATH);

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'loaderly-media',
    privileges: {
      standard: true,
      secure: true,
      corsEnabled: true,
      supportFetchAPI: true,
      stream: true
    }
  }
]);

function safeLog(stream: NodeJS.WriteStream, message: string): void {
  try {
    if (stream.destroyed || !stream.writable) {
      return;
    }

    stream.write(`${message}\n`);
  } catch {
    // Logging must never take down the desktop app when the parent pipe is gone.
  }
}

function safeMainLog(message: string): void {
  safeLog(process.stdout, message);
}

function safeMainError(message: string): void {
  safeLog(process.stderr, message);
}

process.stdout.on('error', () => {
  // Ignore closed parent pipes from development launchers.
});

process.stderr.on('error', () => {
  // Ignore closed parent pipes from development launchers.
});

process.on('uncaughtException', (error) => {
  if (isBrokenPipeError(error)) {
    return;
  }

  throw error;
});

function isBrokenPipeError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const record = error as { readonly code?: unknown; readonly message?: unknown };
    return record.code === 'EPIPE' || (typeof record.message === 'string' && /EPIPE|broken pipe/i.test(record.message));
  }

  return false;
}

if (isExportValidationRun) {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-gpu-compositing');
  app.commandLine.appendSwitch('disable-gpu-sandbox');
  app.commandLine.appendSwitch('in-process-gpu');
}

let visualizerExportController: AbortController | undefined;
let programUpdater: ProgramUpdates;
let activeWork = 0;
let installingProgramUpdate = false;
let mainWindowRef: BrowserWindow | undefined;
let trayRef: Tray | undefined;
let trayWindowRef: BrowserWindow | undefined;
let currentThemeMode: ThemeMode = 'light';
let currentAppearance = defaultAppearance;
let currentLocale: AppLocale = 'en';
let isQuitting = false;

const trayWindowSize = {
  width: 232,
  height: 216
} as const;

type CopyQuickItemPayload = {
  readonly label: string;
  readonly mediaTitle: string;
  readonly rangeLabel: string;
};

type PickMediaFileResult =
  | {
      readonly canceled: true;
    }
  | {
      readonly canceled: false;
      readonly path: string;
      readonly fileUrl: string;
      readonly thumbnailUrl?: string;
      readonly name: string;
      readonly sizeBytes: number;
      readonly durationSeconds?: number;
      readonly subtitlePath?: string;
    };

type DownloadUrlPayload = {
  readonly knownFiles?: readonly string[];
  readonly locale?: 'en'|'ar';
  readonly url: string;
  readonly quality: 'best' | '2160p' | '1440p' | '1080p' | '720p' | '480p' | '360p' | 'audio';
  readonly downloadDirectory?: string;
  readonly groupDownloadsByPlatform?: boolean;
  readonly writeSubtitles?: boolean;
  readonly subtitleLanguages?: string;
};

type DownloadUrlResult = {
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
};

type SubtitleCue = {
  readonly startSeconds: number;
  readonly endSeconds: number;
  readonly text: string;
};

type SubtitleFileResult =
  | {
      readonly canceled: true;
    }
  | {
      readonly canceled: false;
      readonly path: string;
      readonly name: string;
      readonly cues: readonly SubtitleCue[];
    };

type TextOverlayPayload = {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly startSeconds: number;
  readonly endSeconds: number;
  readonly fontSize: number;
  readonly fontFamily?: EditorTextFontFamily;
  readonly color?: string;
  readonly textFilePath?: string;
};

type BlurEffectPayload = {
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

type ZoomEffectPayload = {
  readonly scale: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly startSeconds?: number;
  readonly endSeconds?: number;
  readonly easeIn?: number;
  readonly easeOut?: number;
};

type SpeedEffectPayload = {readonly rate:number;readonly mode?:SpeedEffectMode;readonly startSeconds?:number;readonly endSeconds?:number};
type MediaEffectsPayload = {
  readonly speeds?: readonly SpeedEffectPayload[];
  readonly blur?: BlurEffectPayload;
  readonly blurs?: readonly BlurEffectPayload[];
  readonly zoom?: ZoomEffectPayload;
  readonly zooms?: readonly ZoomEffectPayload[];
  readonly speed?: {
    readonly rate: number;
    readonly mode?: SpeedEffectMode;
    readonly startSeconds?: number;
    readonly endSeconds?: number;
  };
  readonly reframe?: {
    readonly targetWidth: number;
    readonly targetHeight: number;
    readonly fitMode: 'fit' | 'fill' | 'stretch' | 'original';
    readonly positionX: number;
    readonly positionY: number;
    readonly background: 'black' | 'white' | 'blur' | ReframeEffectItem['background'];
    readonly startSeconds?: number;
    readonly endSeconds?: number;
  };
};

type CopyMediaOutputPayload = {
  readonly sourcePath: string;
  readonly kind: 'video' | 'image' | 'gif' | 'snapshot' | 'audio';
  readonly audio?: AudioSettings;
        readonly audioSections?: import('../shared/editor-project/audioSections').AudioSection[];
  readonly label: string;
  readonly startSeconds: number;
  readonly endSeconds: number;
  readonly frameSeconds: number;
  readonly cutOutRanges?: readonly TimeRange[];
  readonly textOverlays?: readonly TextOverlayPayload[];
  readonly subtitlePath?: string;
  readonly subtitleCues?: readonly SubtitleCue[];
  readonly effects?: MediaEffectsPayload;
};

type CopyMediaOutputResult = {
  readonly ok: boolean;
  readonly path?: string;
  readonly message?: string;
};

type ExportValidationCase = {
  readonly name: string;
  readonly destination: 'clipboard' | 'file';
  readonly outputPath?: string;
  readonly payload: CopyMediaOutputPayload;
};

type ToolUpdateResult = {
  readonly ok: boolean;
  readonly name: string;
  readonly message?: string;
  readonly status?: ToolStatus;
};

type WindowControlAction = 'minimize' | 'toggleMaximize' | 'close';
type ThemeMode = 'light' | 'dark';
type AppLocale = 'en' | 'ar';
type SpeedEffectMode = 'normal' | 'preserve-pitch' | 'warm' | 'bright' | 'radio';
type TrayAction = 'open' | 'downloads' | 'editor' | 'settings' | 'exit';
type RelativeEffectRange = {
  readonly startSeconds: number;
  readonly endSeconds: number;
};

type NormalizedSpeedEffect = {
  readonly rate: number;
  readonly mode: SpeedEffectMode;
  readonly range: RelativeEffectRange | null;
};

type SpeedPiece = {
  readonly startSeconds: number;
  readonly endSeconds: number;
  readonly rate: number;
  readonly mode: SpeedEffectMode;
};

function handleTrustedIpc<Args extends unknown[], Result>(
  channel: string,
  listener: (event: IpcMainInvokeEvent, ...args: Args) => Result
): void {
  ipcMain.handle(channel, (event, ...args) => {
    const mainWindow = mainWindowRef;
    const isMainFrame = event.senderFrame === event.sender.mainFrame;

    if (!mainWindow || event.sender !== mainWindow.webContents || !isMainFrame) {
      throw new Error(`Blocked untrusted IPC call: ${channel}`);
    }

    const work = ['loaderly:playlist-preview','loaderly:download-url','loaderly:save-media-output','loaderly:copy-media-output','loaderly:extract-audio','loaderly:update-tool','loaderly:visualizer-export'].includes(channel);
    if (work && installingProgramUpdate) throw Error('An update is starting');
    if (!work) return listener(event, ...(args as Args));
    activeWork++;
    return Promise.resolve().then(()=>listener(event, ...(args as Args))).finally(()=>{activeWork--;});
  });
}

function registerIpcHandlers() {
  handleTrustedIpc('loaderly:trash-media',(_event,paths:unknown)=>trashMediaFiles(paths,path=>shell.trashItem(path)));
  handleTrustedIpc('loaderly:visualizer-cancel',()=>visualizerExportController?.abort());
  handleTrustedIpc('loaderly:visualizer-export',async(event,payload:CopyMediaOutputPayload&{options:VisualizerVideoOptions;whole:boolean})=>{
    if(visualizerExportController)return {ok:false,message:'Another video is exporting.'};
    const controller=new AbortController();visualizerExportController=controller;
    try{
      const ffmpeg=resolveToolPath('ffmpeg');if(!ffmpeg)throw Error('FFmpeg is unavailable');
      if(!payload.sourcePath || !existsSync(payload.sourcePath))throw Error('Source audio is missing');
      const duration=await probeDurationSeconds(payload.sourcePath);if(!duration)throw Error('Could not read audio duration');
      const start=payload.whole?0:Math.max(0,Math.min(duration,payload.startSeconds)),end=payload.whole?duration:Math.min(duration,payload.endSeconds);
      if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)throw Error('Select a valid range');
      const choice=await dialog.showSaveDialog(BrowserWindow.fromWebContents(event.sender)!,{title:'Export audio as video',defaultPath:join(app.getPath('videos'),parse(payload.sourcePath).name+'-visualizer.mp4'),filters:[{name:'MP4 video',extensions:['mp4']}]});
      if(choice.canceled||!choice.filePath)return {ok:false,message:'Save canceled.'};
      return await exportVisualizerVideo({sourcePath:payload.sourcePath,outputPath:choice.filePath,options:payload.options,ffmpeg,signal:controller.signal,
        notify:state=>{if(!event.sender.isDestroyed())event.sender.send('loaderly:visualizer-progress',state);},
        prepareAudio:async(path,signal)=>{
          const audioPayload={...payload,kind:'audio' as const,startSeconds:start,endSeconds:end};
          const args=[...ffmpegCopyArgs(audioPayload,path,false)];
          args[args.indexOf('libmp3lame')]='pcm_s16le';const quality=args.indexOf('-q:a');if(quality>=0)args.splice(quality,2);
          await runEncoder(ffmpeg,args,signal);
          if(payload.audio){const length=await probeDurationSeconds(path)??end-start;if(needsAudioEffects(payload.audio,length,payload.audioSections)){const processed=path+'.processed.wav';await applyAudioEffects(ffmpeg,path,processed,payload.audio,length,'pcm_s16le',signal,payload.audioSections);await rename(processed,path);}}
        }});
    }catch(error){const canceled=controller.signal.aborted;if(!event.sender.isDestroyed())event.sender.send('loaderly:visualizer-progress',{phase:canceled?'canceled':'error',percent:0});return {ok:false,message:canceled?'Export canceled.':error instanceof Error?error.message:'Export failed.'};}
    finally{visualizerExportController=undefined;}
  });
  handleTrustedIpc('loaderly:community-catalog',()=>communityCatalog(app.getPath('userData')));
  const communityRatings = new CommunityRatings(app.getPath('userData'));
  handleTrustedIpc('loaderly:community-drafts',(_event,input:import('../shared/communityDrafts').DraftRequest)=>communityRatings.drafts(input));
  handleTrustedIpc('loaderly:community-ratings',(_event,id?:unknown,stars?:unknown)=>communityRatings.ratings(id,stars));
  handleTrustedIpc('loaderly:community-account',async (_event,action:string)=>{
    if(action==='sign-in')return communityRatings.begin();
    if(action==='poll')return communityRatings.poll();
    if(action==='sign-out'||action==='cancel')return communityRatings.logout();
    if(action==='open'){await shell.openExternal('https://github.com/login/device');return {};}
    throw Error('Invalid account action');
  });
  handleTrustedIpc('loaderly:program-update', async (_event, action:string, automatic?:boolean) => {
    if(process.windowsStore){
      if(action==='check')await shell.openExternal('ms-windows-store://pdp/?ProductId=9N1R1H10HXR7');
      return programUpdater.state;
    }
    if(action==='check')return programUpdater.check();
    if(action==='download')return programUpdater.download();
    if(action==='cancel'){programUpdater.cancel();return programUpdater.state;}
    if(action==='automatic')return programUpdater.preferences(automatic===true);
    if(action==='install'){
      if(activeWork || installingProgramUpdate)throw Error('Finish active jobs before updating');
      installingProgramUpdate=true;
      try {
        if(process.platform==='win32'){
          await programUpdater.launchWindowsInstaller();isQuitting=true;app.quit();
        }else shell.showItemInFolder(await programUpdater.verifiedFile());
      }finally{installingProgramUpdate=false;}
    }
    return programUpdater.state;
  });
  handleTrustedIpc('loaderly:copy-quick-item', (_event, payload: CopyQuickItemPayload) => {
    const safeTitle = payload.mediaTitle || 'Loaderly media';
    const safeRange = payload.rangeLabel || 'current frame';
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
        <rect width="960" height="540" fill="#25272c"/>
        <rect x="64" y="64" width="832" height="412" rx="8" fill="#17172d" stroke="#7668ff" stroke-width="2"/>
        <rect x="96" y="376" width="768" height="48" rx="4" fill="#5b50d6"/>
        <text x="96" y="148" fill="#f6f7ff" font-family="Segoe UI, Arial, sans-serif" font-size="34" font-weight="700">${escapeSvgText(payload.label)}</text>
        <text x="96" y="206" fill="#f3f4f6" font-family="Segoe UI, Arial, sans-serif" font-size="24">${escapeSvgText(safeTitle)}</text>
        <text x="96" y="254" fill="#d6dae0" font-family="Segoe UI, Arial, sans-serif" font-size="20">${escapeSvgText(safeRange)}</text>
        <text x="120" y="408" fill="#f6f7ff" font-family="Segoe UI, Arial, sans-serif" font-size="18">Copied from Loaderly 2.0 preview</text>
      </svg>
    `;
    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

    clipboard.writeImage(nativeImage.createFromDataURL(dataUrl));

    return { ok: !clipboard.readImage().isEmpty() };
  });

  handleTrustedIpc('loaderly:copy-text', (_event, text: string) => {
    clipboard.writeText(text);

    return { ok: clipboard.readText() === text };
  });

  handleTrustedIpc('loaderly:prepare-media-preview', async (_event, path: string, options?: { readonly forceTranscode?: boolean }): Promise<PickMediaFileResult> => {
    if (!existsSync(path) || !isMediaPath(path)) {
      return { canceled: true };
    }

    return { canceled: false, ...(await mediaFileDetails(path, { forceTranscode: options?.forceTranscode === true })) };
  });

  handleTrustedIpc('loaderly:pick-media-file', async (event): Promise<PickMediaFileResult> => {
    const owner = BrowserWindow.fromWebContents(event.sender);
    const options: OpenDialogOptions = {
      title: 'Import media',
      properties: ['openFile'],
      filters: [
        {
          name: 'Media',
          extensions: ['mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v', 'mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg', 'opus']
        },
        { name: 'All files', extensions: ['*'] }
      ]
    };
    const result = owner ? await dialog.showOpenDialog(owner, options) : await dialog.showOpenDialog(options);

    const path = result.filePaths[0];

    if (result.canceled || path === undefined) {
      return { canceled: true };
    }

    return { canceled: false, ...(await mediaFileDetails(path)) };
  });

  handleTrustedIpc('loaderly:pick-download-directory', async (event): Promise<{ readonly canceled: true } | { readonly canceled: false; readonly path: string }> => {
    const owner = BrowserWindow.fromWebContents(event.sender);
    const options: OpenDialogOptions = {
      title: 'Choose download folder',
      defaultPath: defaultDownloadBaseDirectory(),
      properties: ['openDirectory', 'createDirectory']
    };
    const result = owner ? await dialog.showOpenDialog(owner, options) : await dialog.showOpenDialog(options);
    const path = result.filePaths[0];

    if (result.canceled || path === undefined) {
      return { canceled: true };
    }

    return { canceled: false, path };
  });

  handleTrustedIpc('loaderly:open-media-file', async (_event, path: string): Promise<PickMediaFileResult> => {
    if (!existsSync(path) || !isMediaPath(path)) {
      return { canceled: true };
    }

    return { canceled: false, ...(await mediaFileDetails(path)) };
  });

  handleTrustedIpc('loaderly:show-item-in-folder', (_event, path: string): { readonly ok: boolean } => {
    if (!existsSync(path) || !isMediaPath(path)) {
      return { ok: false };
    }

    shell.showItemInFolder(path);
    return { ok: true };
  });

  handleTrustedIpc('loaderly:pick-subtitle-file', async (event): Promise<SubtitleFileResult> => {
    const owner = BrowserWindow.fromWebContents(event.sender);
    const options: OpenDialogOptions = {
      title: 'Import subtitles',
      properties: ['openFile'],
      filters: [
        { name: 'Subtitle files', extensions: ['srt', 'vtt'] },
        { name: 'All files', extensions: ['*'] }
      ]
    };
    const result = owner ? await dialog.showOpenDialog(owner, options) : await dialog.showOpenDialog(options);

    const path = result.filePaths[0];

    if (result.canceled || path === undefined) {
      return { canceled: true };
    }

    return loadSubtitleFile(path);
  });

  handleTrustedIpc('loaderly:load-subtitle-file', async (_event, path: string): Promise<SubtitleFileResult> => {
    if (!existsSync(path) || !isSubtitlePath(path)) {
      return { canceled: true };
    }

    return loadSubtitleFile(path);
  });

  handleTrustedIpc('loaderly:check-tools', async (): Promise<readonly ToolStatus[]> => {
    return getToolManager().checkAll();
  });

  handleTrustedIpc('loaderly:cancel-tool-install', () => { getToolManager().cancel(); return { ok: true }; });
  handleTrustedIpc('loaderly:update-tool', async (event, toolName: string): Promise<ToolUpdateResult> => {
    return getToolManager().install(toolName, progress => { if (!event.sender.isDestroyed()) event.sender.send('loaderly:tool-install-progress', progress); });
  });

  handleTrustedIpc('loaderly:download-url', async (_event, payload: DownloadUrlPayload): Promise<DownloadUrlResult> => {
    return downloadUrl(payload);
  });
  handleTrustedIpc('loaderly:missing-library-files',(_event,paths:unknown)=>missingLibraryFiles(paths));

  const playlistJobs=new Map<number,AbortController>();
  handleTrustedIpc('loaderly:playlist-preview',async(event,url:unknown)=>{
    const id=event.sender.id;
    if(playlistJobs.has(id))return {ok:false,message:'A playlist is already loading. Try again shortly.'};
    const controller=new AbortController();playlistJobs.set(id,controller);
    const closed=()=>controller.abort();event.sender.once('destroyed',closed);
    try{return await inspectPlaylist(url,resolveToolPath('yt-dlp'),controller.signal);}
    finally{event.sender.removeListener('destroyed',closed);if(playlistJobs.get(id)===controller)playlistJobs.delete(id);}
  });
  handleTrustedIpc('loaderly:playlist-cancel',event=>{playlistJobs.get(event.sender.id)?.abort();return {ok:true};});

  const translationJobs = new Map<number, AbortController>();
  handleTrustedIpc('loaderly:ai-models', async (_event, connection:AiConnection) => {
    try { return {ok:true,models:await discoverModels(connection)}; } catch(error) { return {ok:false,message:error instanceof Error?error.message:'Model discovery failed.'}; }
  });
  handleTrustedIpc('loaderly:ai-translate', async (event, input:TranslationInput) => {
    const id=event.sender.id;translationJobs.get(id)?.abort();const controller=new AbortController();translationJobs.set(id,controller);
    const closed=()=>controller.abort();event.sender.once('destroyed',closed);
    try {return {ok:true,cues:await translateCues(input,controller.signal)};} catch(error) {return {ok:false,message:controller.signal.aborted?'Translation canceled.':error instanceof Error?error.message:'Translation failed.'};}
    finally {event.sender.removeListener('destroyed',closed);if(translationJobs.get(id)===controller)translationJobs.delete(id);}
  });
  handleTrustedIpc('loaderly:ai-cancel', (event) => {translationJobs.get(event.sender.id)?.abort();return {ok:true};});

  handleTrustedIpc('loaderly:extract-audio', async (_event, sourcePath: string) => {
    if (typeof sourcePath !== 'string' || !existsSync(sourcePath) || !isMediaPath(sourcePath)) throw new Error('Source file was not found.');
    if (!await hasAudioStream(sourcePath)) throw new Error('This video has no audio track.');
    const directory = join(app.getPath('music'), 'Loaderly');
    await mkdir(directory, { recursive: true });
    const outputPath = join(directory, `${parse(sourcePath).name}-audio-${Date.now()}.mp3`);
    const duration = await probeDurationSeconds(sourcePath);
    if (!duration) throw new Error('Could not read the source duration.');
    const result = await renderMediaOutput({ sourcePath, kind:'audio', label:'Extract audio', startSeconds:0, endSeconds:duration, frameSeconds:0 }, 'file', outputPath);
    if (!result.ok) { await unlink(outputPath).catch(()=>{}); throw new Error(result.message); }
    return { canceled:false, ...(await mediaFileDetails(outputPath)) };
  });

  handleTrustedIpc('loaderly:copy-media-output', async (_event, payload: CopyMediaOutputPayload): Promise<CopyMediaOutputResult> => {
    return copyMediaOutput(payload);
  });

  handleTrustedIpc('loaderly:save-media-output', async (event, payload: CopyMediaOutputPayload): Promise<CopyMediaOutputResult> => {
    const owner = BrowserWindow.fromWebContents(event.sender);
    return saveMediaOutput(payload, owner ?? undefined);
  });

  handleTrustedIpc('loaderly:set-titlebar-theme', (event, themeMode: ThemeMode, locale?: AppLocale, appearance?: unknown) => {
    currentThemeMode = themeMode === 'dark' ? 'dark' : 'light';
    currentAppearance = normalizeAppearance(appearance);
    currentLocale = locale === 'ar' ? 'ar' : 'en';
    if (process.platform === 'darwin' && trayRef) trayRef.setContextMenu(nativeTrayMenu());

    if (trayWindowRef) {
      void trayWindowRef.loadURL(trayHtmlUrl());
    }

    const owner=BrowserWindow.fromWebContents(event.sender);
    const desktopGlass=owner?applyWindowAppearance(owner,currentAppearance,currentThemeMode==='dark'):false;
    return { ok: true, desktopGlass };
  });

  handleTrustedIpc('loaderly:tray-action', (_event, action: TrayAction) => {
    runTrayAction(action);

    return { ok: true };
  });

  handleTrustedIpc('loaderly:window-control', (event, action: WindowControlAction) => {
    const window = BrowserWindow.fromWebContents(event.sender);

    if (window === null) {
      return { ok: false };
    }

    switch (action) {
      case 'minimize':
        window.minimize();
        break;
      case 'toggleMaximize':
        if (window.isMaximized()) {
          window.unmaximize();
        } else {
          window.maximize();
        }
        break;
      case 'close':
        window.close();
        break;
    }

    return { ok: true, maximized: window.isMaximized() };
  });
}

async function downloadUrl(payload: DownloadUrlPayload): Promise<DownloadUrlResult> {
  const normalizedUrl = normalizeDownloadUrl(payload?.url);

  if (normalizedUrl === undefined) {
    return { ok: false, message: `Enter a valid http or https URL (maximum ${MAX_DOWNLOAD_URL_LENGTH} characters).` };
  }

  const normalizedPayload: DownloadUrlPayload = { ...payload, url: normalizedUrl };
  const toolPath = resolveToolPath('yt-dlp');

  if (toolPath === undefined) {
    return { ok: false, message: 'yt-dlp was not found.' };
  }

  const outputDirectory = resolveDownloadDirectory(
    normalizedPayload.downloadDirectory?.trim() || defaultDownloadBaseDirectory(),
    normalizedPayload.url,
    normalizedPayload.groupDownloadsByPlatform !== false
  );
  await mkdir(outputDirectory, { recursive: true });

  try {
    const denoPath=resolveToolPath('deno');
    const {stdout}=await execFileAsync(toolPath,[...ytDlpIsolationArgs,'--no-playlist','--skip-download','--dump-single-json','--windows-filenames','--output','%(title).180B [%(id)s].%(ext)s',...(denoPath?['--js-runtimes',`deno:${denoPath}`]:[]),'--',normalizedUrl],{timeout:90_000,windowsHide:true,maxBuffer:8*1024*1024});
    const metadata=JSON.parse(stdout) as {title?:string;id?:string};
    if(typeof metadata.title!=='string'||!metadata.title.trim())throw Error('Could not read the download title. Try again.');
    const result=await managedDownload({directory:outputDirectory,title:metadata.title,identity:metadata.id,kind:payload.quality==='audio'?'audio':'video',knownFiles:Array.isArray(payload.knownFiles)?payload.knownFiles.filter((p):p is string=>typeof p==='string'):[],
      classify:async path=>{const ffprobe=resolveToolPath('ffprobe');if(!ffprobe)return undefined;try{const {stdout}=await execFileAsync(ffprobe,['-v','error','-show_streams','-of','json',path],{timeout:15_000,windowsHide:true,maxBuffer:1024*1024});const streams=JSON.parse(stdout).streams as {codec_type:string;disposition?:{attached_pic?:number}}[];return streams.some(s=>s.codec_type==='video'&&!s.disposition?.attached_pic)?'video':streams.some(s=>s.codec_type==='audio')?'audio':undefined;}catch{return undefined;}},
      choose:path=>confirmDuplicateDownload(path,metadata.title!,payload.locale==='ar'),
      download:stage=>runYtDlpDownload(toolPath,stage,normalizedPayload)});
    if(!result.ok||!result.path)return result;
    return {...result,...await mediaFileDetails(result.path),subtitlePath:result.subtitlePath};
  } catch (error) {
    const message = execFailureMessage(error);

    return {
      ok: false,
      message
    };
  }
}

let duplicatePrompt:Promise<unknown>=Promise.resolve();
function confirmDuplicateDownload(path:string,title:string,ar:boolean):Promise<DuplicateChoice>{
  const prompt=duplicatePrompt.catch(()=>{}).then(async()=>{
    const options={type:'question' as const,title:ar?'الملف موجود بالفعل':'Already downloaded',message:ar?'يوجد ملف من النوع نفسه بهذا الاسم.':'A file of the same type already has this name.',detail:`${title}\n\n${path}\n\n${ar?'تخطي يبقي الموجود. استبدال يحمّل الجديد أولًا. نسخة أخرى تضيف رقمًا إلى الاسم.':'Skip keeps the existing file. Replace downloads the new file first. Keep both adds a number to its name.'}`,buttons:ar?['تخطي','تنزيل نسخة أخرى','استبدال الموجود']:['Skip','Keep both','Replace existing'],defaultId:0,cancelId:0,noLink:true};
    const response=await(mainWindowRef?dialog.showMessageBox(mainWindowRef,options):dialog.showMessageBox(options));
    return (['skip','keep','replace'] as const)[response.response]??'skip';
  });
  duplicatePrompt=prompt;return prompt;
}

function defaultDownloadBaseDirectory(): string {
  return defaultLoaderlyDownloadDirectory(app.getPath('downloads'));
}

async function runYtDlpDownload(toolPath: string, outputDirectory: string, payload: DownloadUrlPayload): Promise<DownloadUrlResult> {
  const startedAtMs = Date.now() - 2000;
  const existingMediaPaths = new Set(await listMediaFiles(outputDirectory).catch(() => []));
  const sourceIdentity = sourceIdentityFromUrl(payload.url);
  const ffmpegPath = resolveToolPath('ffmpeg');
  const denoPath = resolveToolPath('deno');
  const args = [
    ...ytDlpIsolationArgs,
    '--no-playlist',
    '--continue',
    '--no-mtime',
    '--windows-filenames',
    '--retries',
    '10',
    '--fragment-retries',
    '10',
    '--file-access-retries',
    '20',
    '--retry-sleep',
    'file_access:linear=1::3',
    '-N',
    '1',
    ...(denoPath ? ['--js-runtimes', `deno:${denoPath}`] : []),
    ...(ffmpegPath ? ['--ffmpeg-location', dirname(ffmpegPath)] : []),
    '--paths',
    outputDirectory,
    '--output',
    '%(title).180B [%(id)s].%(ext)s',
    '--print',
    'after_move:filepath',
    '--print',
    'after_video:filepath',
    '--print',
    'filename',
    ...downloadFormatArgs(payload.quality),
    '--',
    payload.url
  ];

  let stdout = '';
  try {
    const result = await execFileAsync(toolPath, args, {
      timeout: 1000 * 60 * 30,
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 4
    });
    stdout = result.stdout;
  } catch (error) {
    const message = execFailureMessage(error);
    const recoveredPath = await findChangedMediaFileWithRetry(
      outputDirectory,
      startedAtMs,
      existingMediaPaths,
      isRecoverableDownloadFileError(message) ? 28 : 6,
      sourceIdentity,
      payload.quality
    );

    if (recoveredPath) {
      await waitForStableFile(recoveredPath);
      const subtitleMessage = await tryDownloadSubtitles(toolPath, outputDirectory, payload);
      const details = await mediaFileDetails(recoveredPath);

      return { ok: true, ...details, ...(subtitleMessage ? { message: subtitleMessage } : {}) };
    }

    throw error;
  }

  const stdoutPaths = stdout
    .split(/\r?\n/)
    .flatMap((line) => candidateMediaPathsFromYtDlpLine(line, outputDirectory))
    .filter((line) => existsSync(line) && isFinalDownloadPath(line, payload.quality));
  const stdoutPath = stdoutPaths[stdoutPaths.length - 1];
  const recoveredPath = stdoutPath ?? (await findChangedMediaFile(outputDirectory, startedAtMs, existingMediaPaths, sourceIdentity, payload.quality));

  if (recoveredPath === undefined) {
    return { ok: false, message: 'Download finished but no output file was found.' };
  }

  await waitForStableFile(recoveredPath);
  const subtitleMessage = await tryDownloadSubtitles(toolPath, outputDirectory, payload);
  const details = await mediaFileDetails(recoveredPath);

  return { ok: true, ...details, ...(subtitleMessage ? { message: subtitleMessage } : {}) };
}

function downloadFormatArgs(quality: DownloadUrlPayload['quality']): readonly string[] {
  return sharedDownloadFormatArgs(quality);
}

function subtitleDownloadArgs(payload: DownloadUrlPayload): readonly string[] {
  if (payload.quality === 'audio' || payload.writeSubtitles === false) {
    return [];
  }

  return [
    '--write-subs',
    '--write-auto-subs',
    '--convert-subs',
    'srt',
    '--sub-langs',
    payload.subtitleLanguages?.trim() || 'original,ar,en,-live_chat'
  ];
}

async function tryDownloadSubtitles(
  toolPath: string,
  outputDirectory: string,
  payload: DownloadUrlPayload
): Promise<string | undefined> {
  const args = subtitleDownloadArgs(payload);

  if (args.length === 0) {
    return undefined;
  }

  const denoPath = resolveToolPath('deno');

  try {
    await execFileAsync(
      toolPath,
      [
        ...ytDlpIsolationArgs,
        '--no-playlist',
        '--skip-download',
        '--no-mtime',
        '--windows-filenames',
        '--retries',
        '5',
        '--file-access-retries',
        '10',
        ...(denoPath ? ['--js-runtimes', `deno:${denoPath}`] : []),
        '--paths',
        outputDirectory,
        '--output',
        '%(title).180B [%(id)s].%(ext)s',
        ...args,
        '--',
        payload.url
      ],
      {
        timeout: 1000 * 60 * 8,
        windowsHide: true,
        maxBuffer: 1024 * 1024 * 2
      }
    );
  } catch (error) {
    const message = execFailureMessage(error);
    return isSubtitleDownloadFailure(message) ? subtitlesSkippedRateLimitMessage : subtitlesSkippedUnavailableMessage;
  }

  return undefined;
}

async function waitForStableFile(path: string): Promise<void> {
  let previousSize = -1;

  for (let attempt = 0; attempt < 12; attempt++) {
    const current = await stat(path);

    if (current.size > 0 && current.size === previousSize) {
      return;
    }

    previousSize = current.size;
    await delay(250);
  }
}

function isSubtitleDownloadFailure(message: string): boolean {
  return (
    /subtitle|subtitles|caption|captions|timedtext/i.test(message) &&
    /Unable to download|HTTP Error 429|Too Many Requests|rate.?limit/i.test(message)
  );
}

function execFailureMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const record = error as {
      readonly message?: unknown;
      readonly stderr?: unknown;
      readonly stdout?: unknown;
    };
    const stderr = typeof record.stderr === 'string' ? record.stderr.trim() : Buffer.isBuffer(record.stderr) ? record.stderr.toString('utf8').trim() : '';
    const stdout = typeof record.stdout === 'string' ? record.stdout.trim() : Buffer.isBuffer(record.stdout) ? record.stdout.toString('utf8').trim() : '';
    const message = typeof record.message === 'string' ? record.message.trim() : '';
    return [stderr, stdout, message].find((value) => value.length > 0) ?? 'Download failed.';
  }

  return error instanceof Error ? error.message : 'Download failed.';
}

async function findChangedMediaFile(
  directory: string,
  startedAtMs: number,
  existingPaths: ReadonlySet<string>,
  sourceIdentity?: string,
  quality: DownloadUrlPayload['quality'] = 'best'
): Promise<string | undefined> {
  const mediaFiles = (await mediaFilesWithStats(directory))
    .filter(entry => isFinalDownloadPath(entry.path, quality))
    .filter(entry => !sourceIdentity || mediaFileNameMatchesSourceIdentity(entry.path, sourceIdentity));
  const newestNewFile = mediaFiles
    .filter((entry) => !existingPaths.has(entry.path))
    .sort((left, right) => right.modifiedAt - left.modifiedAt)[0]?.path;

  if (newestNewFile) {
    return newestNewFile;
  }

  const newestChangedFile = mediaFiles
    .filter((entry) => entry.modifiedAt >= startedAtMs)
    .sort((left, right) => right.modifiedAt - left.modifiedAt)[0]?.path;

  if (newestChangedFile) {
    return newestChangedFile;
  }

  if (!sourceIdentity) {
    return undefined;
  }

  return mediaFiles
    .filter((entry) => mediaFileNameMatchesSourceIdentity(basename(entry.path), sourceIdentity))
    .sort((left, right) => right.modifiedAt - left.modifiedAt)[0]?.path;
}

async function findChangedMediaFileWithRetry(
  directory: string,
  startedAtMs: number,
  existingPaths: ReadonlySet<string>,
  attempts: number,
  sourceIdentity?: string,
  quality: DownloadUrlPayload['quality'] = 'best'
): Promise<string | undefined> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const recoveredPath = await findChangedMediaFile(directory, startedAtMs, existingPaths, sourceIdentity, quality).catch(() => undefined);

    if (recoveredPath) {
      return recoveredPath;
    }

    await delay(350);
  }

  return undefined;
}

function candidateMediaPathsFromYtDlpLine(line: string, outputDirectory: string): readonly string[] {
  const trimmed = line.trim();

  if (trimmed.length === 0) {
    return [];
  }

  const rawCandidates = new Set<string>();
  rawCandidates.add(trimmed);

  const markerMatch = trimmed.match(/(?:Destination|Merging formats into|Moving file to|has already been downloaded|Deleting original file)\s*:?\s+(.+)$/i);
  if (markerMatch?.[1]) {
    rawCandidates.add(markerMatch[1]);
  }

  for (const match of trimmed.matchAll(/"([^"]+)"/g)) {
    rawCandidates.add(match[1]);
  }

  for (const match of trimmed.matchAll(/'([^']+)'/g)) {
    rawCandidates.add(match[1]);
  }

  return [...rawCandidates]
    .map((candidate) => candidate.trim())
    .filter((candidate) => isMediaPath(candidate))
    .flatMap((candidate) => {
      if (isAbsolute(candidate)) {
        return [candidate];
      }

      return [join(outputDirectory, candidate)];
    });
}

async function listMediaFiles(directory: string): Promise<readonly string[]> {
  return (await mediaFilesWithStats(directory)).map((entry) => entry.path);
}

async function mediaFilesWithStats(directory: string): Promise<readonly { readonly path: string; readonly modifiedAt: number }[]> {
  const mediaExtensions = new Set(['.mp4', '.m4v', '.mov', '.mkv', '.webm', '.mp3', '.m4a', '.wav', '.aac']);
  const entries = await readdir(directory, { withFileTypes: true });
  const directFiles = await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .filter((entry) => mediaExtensions.has(extname(entry.name).toLowerCase()))
      .map(async (entry) => {
        const path = join(directory, entry.name);
        const fileStat = await stat(path);

        return { path, modifiedAt: fileStat.mtimeMs };
      })
  );
  const nestedFiles = (
    await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => mediaFilesWithStats(join(directory, entry.name)).catch(() => []))
    )
  ).flat();

  return [...directFiles, ...nestedFiles];
}

async function copyMediaOutput(payload: CopyMediaOutputPayload): Promise<CopyMediaOutputResult> {
  return renderMediaOutput(payload, 'clipboard');
}

async function saveMediaOutput(payload: CopyMediaOutputPayload, owner?: BrowserWindow): Promise<CopyMediaOutputResult> {
  const defaultPath = join(app.getPath(payload.kind === 'audio' ? 'music' : 'videos'), outputFileName(payload));
  const filters =
    payload.kind === 'audio'
      ? [{ name: 'MP3 audio', extensions: ['mp3'] }]
      : payload.kind === 'gif'
      ? [{ name: 'GIF', extensions: ['gif'] }]
      : payload.kind === 'image' || payload.kind === 'snapshot'
        ? [{ name: 'PNG image', extensions: ['png'] }]
        : [{ name: 'MP4 video', extensions: ['mp4'] }];
  const result = owner
    ? await dialog.showSaveDialog(owner, { title: `Save ${payload.label}`, defaultPath, filters })
    : await dialog.showSaveDialog({ title: `Save ${payload.label}`, defaultPath, filters });

  if (result.canceled || !result.filePath) {
    return { ok: false, message: 'Save canceled.' };
  }

  return renderMediaOutput(payload, 'file', result.filePath);
}

async function renderMediaOutput(
  payload: CopyMediaOutputPayload,
  destination: 'clipboard' | 'file',
  requestedOutputPath?: string
): Promise<CopyMediaOutputResult> {
  if (!existsSync(payload.sourcePath)) {
    return { ok: false, message: 'Source media file was not found.' };
  }

  const toolPath = resolveToolPath('ffmpeg');

  if (toolPath === undefined) {
    return { ok: false, message: 'ffmpeg was not found.' };
  }

  const outputDirectory = join(app.getPath('temp'), 'Loaderly', 'QuickCopy');
  await mkdir(outputDirectory, { recursive: true });
  const outputPath = requestedOutputPath ?? join(outputDirectory, outputFileName(payload));
  const subtitlePath = payload.kind === 'audio' ? undefined : await writeRetimedSubtitleFile(payload, outputDirectory);
  const textOverlays = payload.kind === 'audio' ? [] : await writeTextOverlayFiles(payload, outputDirectory);
  const sourceHasAudio = payload.kind === 'video' ? await hasAudioStream(payload.sourcePath) : false;
  const sourceDimensions =
    payload.kind === 'video' || payload.kind === 'image' || payload.kind === 'snapshot' || payload.kind === 'gif'
      ? await probeVideoDimensions(payload.sourcePath)
      : undefined;

  if ((payload.kind === 'video' || payload.kind === 'gif' || payload.kind === 'audio') && (payload.cutOutRanges?.length ?? 0) > 0) {
    const keptRanges = keptRangesFromCutOuts(
      { startSeconds: Math.max(0, payload.startSeconds), endSeconds: Math.max(payload.startSeconds + 0.1, payload.endSeconds) },
      payload.cutOutRanges ?? []
    );

    if (keptRanges.length === 0) {
      return { ok: false, message: 'Cut-out ranges remove the whole selected clip.' };
    }
  }

  const args = ffmpegCopyArgs({ ...payload, subtitlePath, textOverlays }, outputPath, sourceHasAudio, sourceDimensions);

  try {
    await execFileAsync(toolPath, args, {
      timeout: 1000 * 60 * 5,
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 4
    });

    if ((payload.kind === 'audio' || (payload.kind === 'video' && sourceHasAudio)) && payload.audio) {
      const outputDuration = await probeDurationSeconds(outputPath) ?? Math.max(.1, payload.endSeconds-payload.startSeconds);
      if (needsAudioEffects(payload.audio, outputDuration,payload.audioSections)) {
        const processed = join(dirname(outputPath), `${parse(outputPath).name}-audio-pass-${Date.now()}${extname(outputPath)}`);
        try {
          await applyAudioEffects(toolPath, outputPath, processed, payload.audio, outputDuration, payload.kind === 'audio' ? 'libmp3lame' : 'aac', AbortSignal.timeout(300000),payload.audioSections);
          await rename(processed, outputPath);
        } finally { await unlink(processed).catch(()=>{}); }
      }
    }
    if (destination === 'file') {
      return { ok: true, path: outputPath };
    }

    if (payload.kind === 'image' || payload.kind === 'snapshot') {
      const image = nativeImage.createFromPath(outputPath);
      clipboard.writeImage(image);

      return { ok: !clipboard.readImage().isEmpty(), path: outputPath };
    }

    await copyFilesToClipboard([outputPath]);

    return { ok: true, path: outputPath };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : destination === 'file' ? 'Save failed.' : 'Copy failed.'
    };
  }
}

async function runExportValidationFromEnvironment(): Promise<boolean> {
  const rawPayload =
    process.env.LOADERLY_EXPORT_VALIDATION_PAYLOAD ??
    (process.env.LOADERLY_EXPORT_VALIDATION_PAYLOAD_PATH
      ? await readFile(process.env.LOADERLY_EXPORT_VALIDATION_PAYLOAD_PATH, 'utf8')
      : undefined);

  if (!rawPayload) {
    return false;
  }

  const resultPath = process.env.LOADERLY_EXPORT_VALIDATION_RESULT_PATH;

  try {
    const request = JSON.parse(rawPayload.replace(/^\uFEFF/, '')) as { readonly cases?: readonly ExportValidationCase[] };
    const cases = request.cases ?? [];
    const results = [];

    for (const validationCase of cases) {
      const result = await renderMediaOutput(validationCase.payload, validationCase.destination, validationCase.outputPath);
      results.push({ name: validationCase.name, result });
    }

    const validationResult = { ok: results.every((item) => item.result.ok), results };
    const serialized = JSON.stringify(validationResult);
    if (resultPath) {
      await writeFile(resultPath, serialized, 'utf8');
    }
    safeMainLog(`LOADERLY_EXPORT_VALIDATION_RESULT=${serialized}`);
  } catch (error) {
    const validationResult = {
      ok: false,
      results: [],
      message: error instanceof Error ? error.message : 'Export validation failed.'
    };
    const serialized = JSON.stringify(validationResult);
    if (resultPath) {
      await writeFile(resultPath, serialized, 'utf8');
    }
    safeMainLog(`LOADERLY_EXPORT_VALIDATION_RESULT=${serialized}`);
  }

  return true;
}

function outputFileName(payload: CopyMediaOutputPayload): string {
  const safeLabel = payload.label.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-').toLowerCase();
  const stamp = new Date().toISOString().replace(/[.:]/g, '-');

  switch (payload.kind) {
    case 'gif':
      return `${safeLabel}-${stamp}.gif`;
    case 'video':
      return `${safeLabel}-${stamp}.mp4`;
    case 'audio':
      return `${safeLabel}-${stamp}.mp3`;
    case 'image':
    case 'snapshot':
      return `${safeLabel}-${stamp}.png`;
  }
}

function ffmpegCopyArgs(
  payload: CopyMediaOutputPayload,
  outputPath: string,
  sourceHasAudio = false,
  sourceDimensions?: { width: number; height: number }
): readonly string[] {
  const safeStart = Math.max(0, payload.startSeconds);
  const safeEnd = Math.max(safeStart + 0.1, payload.endSeconds);
  const duration = Math.max(0.1, safeEnd - safeStart);
  const frameTime = Math.max(0, payload.frameSeconds);
  const speedEffects = payload.effects?.speeds?.length ? payload.effects.speeds.map(speed=>normalizedSpeedEffect({...payload,effects:{...payload.effects,speed}})).filter((item):item is NormalizedSpeedEffect=>Boolean(item)) : [normalizedSpeedEffect(payload)].filter((item):item is NormalizedSpeedEffect=>Boolean(item));
  const speedEffect = speedEffects[0];
  const speedRate = speedEffect?.rate ?? 1;
  const keptRanges = keptRangesFromCutOuts({ startSeconds: safeStart, endSeconds: safeEnd }, payload.cutOutRanges ?? []);
  const hasCutOuts =
    (payload.cutOutRanges?.length ?? 0) > 0 &&
    keptRanges.length > 0 &&
    !(keptRanges.length === 1 && Math.abs(keptRanges[0].startSeconds - safeStart) < 0.02 && Math.abs(keptRanges[0].endSeconds - safeEnd) < 0.02);

  if (payload.kind === 'audio') {
    return ffmpegAudioArgs(payload, outputPath, speedEffects, keptRanges, duration);
  }

  const overlayGraph = composeOverlayGraph(payload, '0:v', 'loaderly_vfx', sourceDimensions);

  if (payload.kind === 'image' || payload.kind === 'snapshot') {
    return [
      '-y',
      '-ss',
      formatSeconds(frameTime),
      '-i',
      payload.sourcePath,
      '-filter_complex',
      overlayGraph,
      '-map',
      '[loaderly_vfx]',
      '-frames:v',
      '1',
      outputPath
    ];
  }

  if (hasCutOuts || speedEffects.length > 1) {
    return ffmpegSegmentedTimelineArgs(payload, outputPath, sourceHasAudio, overlayGraph, speedEffects, keptRanges, duration);
  }

  if (speedEffect?.range) {
    return ffmpegPartialSpeedArgs(payload, outputPath, sourceHasAudio, overlayGraph, speedEffect, duration);
  }

  if (payload.kind === 'gif') {
    const graph = [
      overlayGraph,
      `[loaderly_vfx]${speedRate !== 1 ? `setpts=PTS/${formatFilterNumber(speedRate)},` : ''}fps=15,scale=720:-1:flags=lanczos[loaderly_gif]`
    ];

    return [
      '-y',
      '-ss',
      formatSeconds(safeStart),
      '-t',
      formatSeconds(duration),
      '-i',
      payload.sourcePath,
      '-filter_complex',
      graph.join(';'),
      '-map',
      '[loaderly_gif]',
      outputPath
    ];
  }

  const videoGraph = speedRate !== 1
    ? `${overlayGraph};[loaderly_vfx]setpts=PTS/${formatFilterNumber(speedRate)}[loaderly_vout]`
    : overlayGraph.replace('[loaderly_vfx]', '[loaderly_vout]');

  return [
    '-y',
    '-ss',
    formatSeconds(safeStart),
    '-t',
    formatSeconds(duration),
    '-i',
    payload.sourcePath,
    '-filter_complex',
    videoGraph,
    '-map',
    '[loaderly_vout]',
    ...(sourceHasAudio ? ['-map', '0:a'] : []),
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '20',
    ...(sourceHasAudio && speedEffect && hasSpeedSound(speedRate, speedEffect.mode) ? audioSpeedFilterArgs(speedRate, speedEffect?.mode ?? 'preserve-pitch') : []),
    ...(sourceHasAudio ? ['-c:a', 'aac'] : []),
    '-movflags',
    '+faststart',
    outputPath
  ];
}

function ffmpegPartialSpeedArgs(
  payload: CopyMediaOutputPayload,
  outputPath: string,
  sourceHasAudio: boolean,
  overlayGraph: string,
  speedEffect: NormalizedSpeedEffect,
  duration: number
): readonly string[] {
  const safeStart = Math.max(0, payload.startSeconds);
  const range = speedEffect.range;

  if (!range) {
    return ffmpegCopyArgs({ ...payload, effects: { ...payload.effects, speed: { ...payload.effects?.speed, rate: speedEffect.rate } } }, outputPath, sourceHasAudio);
  }

  const graph: string[] = [];
  const videoInputLabel = 'loaderly_vfx';
  graph.push(overlayGraph);
  graph.push(...speedVideoGraph(videoInputLabel, 'loaderly_vout', duration, range, speedEffect.rate));

  if (payload.kind === 'gif') {
    graph.push('[loaderly_vout]fps=15,scale=720:-1:flags=lanczos[loaderly_gif]');

    return [
      '-y',
      '-ss',
      formatSeconds(safeStart),
      '-t',
      formatSeconds(duration),
      '-i',
      payload.sourcePath,
      '-filter_complex',
      graph.join(';'),
      '-map',
      '[loaderly_gif]',
      outputPath
    ];
  }

  if (sourceHasAudio) {
    graph.push(...speedAudioGraph('0:a', 'loaderly_aout', duration, range, speedEffect.rate, speedEffect.mode));
  }

  return [
    '-y',
    '-ss',
    formatSeconds(safeStart),
    '-t',
    formatSeconds(duration),
    '-i',
    payload.sourcePath,
    '-filter_complex',
    graph.join(';'),
    '-map',
    '[loaderly_vout]',
    ...(sourceHasAudio ? ['-map', '[loaderly_aout]'] : []),
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '20',
    ...(sourceHasAudio ? ['-c:a', 'aac'] : []),
    '-movflags',
    '+faststart',
    outputPath
  ];
}

function ffmpegAudioArgs(
  payload: CopyMediaOutputPayload,
  outputPath: string,
  speedEffects: readonly NormalizedSpeedEffect[],
  keptRanges: readonly TimeRange[],
  duration: number
): readonly string[] {
  const safeStart = Math.max(0, payload.startSeconds);
  const relativeRanges = keptRanges.map((range) => ({
    startSeconds: Math.max(0, range.startSeconds - safeStart),
    endSeconds: Math.min(duration, range.endSeconds - safeStart)
  }));
  const pieces = timelinePieces(relativeRanges, speedEffects);
  const graph = timelineAudioGraph('0:a', 'loaderly_aout', pieces);

  return [
    '-y',
    '-ss',
    formatSeconds(safeStart),
    '-t',
    formatSeconds(duration),
    '-i',
    payload.sourcePath,
    '-filter_complex',
    graph.join(';'),
    '-map',
    '[loaderly_aout]',
    '-vn',
    '-c:a',
    'libmp3lame',
    '-q:a',
    '2',
    outputPath
  ];
}

function ffmpegSegmentedTimelineArgs(
  payload: CopyMediaOutputPayload,
  outputPath: string,
  sourceHasAudio: boolean,
  overlayGraph: string,
  speedEffects: readonly NormalizedSpeedEffect[],
  keptRanges: readonly TimeRange[],
  duration: number
): readonly string[] {
  const safeStart = Math.max(0, payload.startSeconds);
  const relativeRanges = keptRanges.map((range) => ({
    startSeconds: Math.max(0, range.startSeconds - safeStart),
    endSeconds: Math.min(duration, range.endSeconds - safeStart)
  }));
  const pieces = timelinePieces(relativeRanges, speedEffects);
  const graph: string[] = [];

  graph.push(overlayGraph);
  graph.push(...timelineVideoGraph('loaderly_vfx', 'loaderly_vout', pieces));

  if (payload.kind === 'gif') {
    graph.push('[loaderly_vout]fps=15,scale=720:-1:flags=lanczos[loaderly_gif]');

    return [
      '-y',
      '-ss',
      formatSeconds(safeStart),
      '-t',
      formatSeconds(duration),
      '-i',
      payload.sourcePath,
      '-filter_complex',
      graph.join(';'),
      '-map',
      '[loaderly_gif]',
      outputPath
    ];
  }

  if (sourceHasAudio) {
    graph.push(...timelineAudioGraph('0:a', 'loaderly_aout', pieces));
  }

  return [
    '-y',
    '-ss',
    formatSeconds(safeStart),
    '-t',
    formatSeconds(duration),
    '-i',
    payload.sourcePath,
    '-filter_complex',
    graph.join(';'),
    '-map',
    '[loaderly_vout]',
    ...(sourceHasAudio ? ['-map', '[loaderly_aout]'] : []),
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '20',
    ...(sourceHasAudio ? ['-c:a', 'aac'] : []),
    '-movflags',
    '+faststart',
    outputPath
  ];
}

function timelinePieces(keptRanges: readonly TimeRange[], speedEffects: readonly NormalizedSpeedEffect[]): readonly SpeedPiece[] {
  const pieces: SpeedPiece[] = [];
  for (const range of keptRanges) {
    const points = [...new Set([range.startSeconds, range.endSeconds, ...speedEffects.flatMap(effect => effect.range ? [effect.range.startSeconds, effect.range.endSeconds] : [])].map(point => Math.max(range.startSeconds, Math.min(range.endSeconds, point))))].sort((a,b)=>a-b);
    for (let i=0;i<points.length-1;i++) {
      const startSeconds=points[i],endSeconds=points[i+1],midpoint=(startSeconds+endSeconds)/2;
      const effect=speedEffects.find(effect=>!effect.range||(midpoint>=effect.range.startSeconds&&midpoint<effect.range.endSeconds));
      if(endSeconds>startSeconds+.001)pieces.push({startSeconds,endSeconds,rate:effect?.rate??1,mode:effect?.mode??'preserve-pitch'});
    }
  }
  return pieces;
}

function timelineVideoGraph(inputLabel: string, outputLabel: string, pieces: readonly SpeedPiece[]): readonly string[] {
  const sourceLabels = pieces.map((_, index) => `loaderly_piecev${index}src`);
  const outputLabels = pieces.map((_, index) => `loaderly_piecev${index}out`);
  const graph: string[] = [];

  graph.push(`[${inputLabel}]split=${pieces.length}${sourceLabels.map((label) => `[${label}]`).join('')}`);

  pieces.forEach((piece, index) => {
    const setpts = piece.rate === 1 ? 'PTS-STARTPTS' : `(PTS-STARTPTS)/${formatFilterNumber(piece.rate)}`;
    graph.push(
      `[${sourceLabels[index]}]trim=start=${formatSeconds(piece.startSeconds)}:end=${formatSeconds(piece.endSeconds)},setpts=${setpts}[${outputLabels[index]}]`
    );
  });
  graph.push(`${outputLabels.map((label) => `[${label}]`).join('')}concat=n=${pieces.length}:v=1:a=0[${outputLabel}]`);

  return graph;
}

function timelineAudioGraph(inputLabel: string, outputLabel: string, pieces: readonly SpeedPiece[]): readonly string[] {
  const sourceLabels = pieces.map((_, index) => `loaderly_piecea${index}src`);
  const outputLabels = pieces.map((_, index) => `loaderly_piecea${index}out`);
  const graph: string[] = [];

  graph.push(`[${inputLabel}]asplit=${pieces.length}${sourceLabels.map((label) => `[${label}]`).join('')}`);

  pieces.forEach((piece, index) => {
    const tempo = !hasSpeedSound(piece.rate, piece.mode) ? '' : `,${audioSpeedFilterChain(piece.rate, piece.mode)}`;
    graph.push(
      `[${sourceLabels[index]}]atrim=start=${formatSeconds(piece.startSeconds)}:end=${formatSeconds(piece.endSeconds)},asetpts=PTS-STARTPTS${tempo}[${outputLabels[index]}]`
    );
  });
  graph.push(`${outputLabels.map((label) => `[${label}]`).join('')}concat=n=${pieces.length}:v=0:a=1[${outputLabel}]`);

  return graph;
}

function speedPieces(duration: number, range: RelativeEffectRange, rate: number, mode: SpeedEffectMode): readonly SpeedPiece[] {
  const start = clampNumber(range.startSeconds, 0, Math.max(0, duration - 0.02));
  const end = clampNumber(range.endSeconds, start + 0.02, duration);
  const pieces: SpeedPiece[] = [];

  if (start > 0.02) {
    pieces.push({ startSeconds: 0, endSeconds: start, rate: 1, mode: 'preserve-pitch' });
  }

  pieces.push({ startSeconds: start, endSeconds: end, rate, mode });

  if (end < duration - 0.02) {
    pieces.push({ startSeconds: end, endSeconds: duration, rate: 1, mode: 'preserve-pitch' });
  }

  return pieces;
}

function speedVideoGraph(inputLabel: string, outputLabel: string, duration: number, range: RelativeEffectRange, rate: number): readonly string[] {
  const pieces = speedPieces(duration, range, rate, 'preserve-pitch');
  const sourceLabels = pieces.map((_, index) => `loaderly_speedv${index}src`);
  const outputLabels = pieces.map((_, index) => `loaderly_speedv${index}out`);
  const graph: string[] = [];

  graph.push(`[${inputLabel}]split=${pieces.length}${sourceLabels.map((label) => `[${label}]`).join('')}`);

  pieces.forEach((piece, index) => {
    const setpts = piece.rate === 1 ? 'PTS-STARTPTS' : `(PTS-STARTPTS)/${formatFilterNumber(piece.rate)}`;
    graph.push(
      `[${sourceLabels[index]}]trim=start=${formatSeconds(piece.startSeconds)}:end=${formatSeconds(piece.endSeconds)},setpts=${setpts}[${outputLabels[index]}]`
    );
  });
  graph.push(`${outputLabels.map((label) => `[${label}]`).join('')}concat=n=${pieces.length}:v=1:a=0[${outputLabel}]`);

  return graph;
}

function speedAudioGraph(inputLabel: string, outputLabel: string, duration: number, range: RelativeEffectRange, rate: number, mode: SpeedEffectMode): readonly string[] {
  const pieces = speedPieces(duration, range, rate, mode);
  const sourceLabels = pieces.map((_, index) => `loaderly_speeda${index}src`);
  const outputLabels = pieces.map((_, index) => `loaderly_speeda${index}out`);
  const graph: string[] = [];

  graph.push(`[${inputLabel}]asplit=${pieces.length}${sourceLabels.map((label) => `[${label}]`).join('')}`);

  pieces.forEach((piece, index) => {
    const tempo = !hasSpeedSound(piece.rate, piece.mode) ? '' : `,${audioSpeedFilterChain(piece.rate, piece.mode)}`;
    graph.push(
      `[${sourceLabels[index]}]atrim=start=${formatSeconds(piece.startSeconds)}:end=${formatSeconds(piece.endSeconds)},asetpts=PTS-STARTPTS${tempo}[${outputLabels[index]}]`
    );
  });
  graph.push(`${outputLabels.map((label) => `[${label}]`).join('')}concat=n=${pieces.length}:v=0:a=1[${outputLabel}]`);

  return graph;
}

function composeOverlayGraph(
  payload: CopyMediaOutputPayload,
  inputLabel: string,
  outputLabel: string,
  sourceDimensions?: { width: number; height: number }
): string {
  const graph: string[] = [];
  let currentLabel = inputLabel;
  let step = 0;

  const nextLabel = (prefix: string) => `loaderly_${prefix}_${step++}`;

  for (const zoom of normalizedZooms(payload)) {
    const output = nextLabel('zoom');
    appendZoomGraph(graph, currentLabel, output, zoom, payload, step);
    currentLabel = output;
  }

  for (const blur of normalizedBlurs(payload)) {
    const output = nextLabel('blur');
    appendBlurGraph(graph, currentLabel, output, blur, payload, step, sourceDimensions);
    currentLabel = output;
  }

  if (
    payload.effects?.reframe &&
    sourceDimensions !== undefined &&
    payload.effects.reframe.targetWidth > 0 &&
    payload.effects.reframe.targetHeight > 0
  ) {
    const reframe = payload.effects.reframe;
    const output = nextLabel('reframe');
    const built = buildReframeFilter(
      {
        id: 'reframe-active',
        type: 'reframe',
        name: 'Active reframe',
        trackId: 'reframe',
        startTime: reframe.startSeconds ?? 0,
        endTime: reframe.endSeconds ?? 0,
        locked: false,
        hidden: false,
        targetWidth: reframe.targetWidth,
        targetHeight: reframe.targetHeight,
        fitMode: reframe.fitMode,
        positionX: reframe.positionX,
        positionY: reframe.positionY,
        background: typeof reframe.background === 'string' ? { kind: reframe.background } : reframe.background
      },
      { sourceWidth: sourceDimensions.width, sourceHeight: sourceDimensions.height },
      output,
      currentLabel
    );
    graph.push(built.filter);
    currentLabel = output;
  }

  if (payload.subtitlePath && existsSync(payload.subtitlePath)) {
    const output = nextLabel('subtitles');
    const bundledFonts = join(process.resourcesPath, 'fonts');
    const fontDirectory = existsSync(bundledFonts) ? `:fontsdir=${escapeFilterPath(bundledFonts)}` : '';
    graph.push(`[${currentLabel}]subtitles=${escapeFilterPath(payload.subtitlePath)}${fontDirectory}[${output}]`);
    currentLabel = output;
  }

  for (const overlay of payload.textOverlays ?? []) {
    const filter = textOverlayFilter(overlay, payload);

    if (!filter) {
      continue;
    }

    const output = nextLabel('text');
    graph.push(`[${currentLabel}]${filter}[${output}]`);
    currentLabel = output;
  }

  graph.push(`[${currentLabel}]null[${outputLabel}]`);
  return graph.join(';');
}

function appendZoomGraph(
  graph: string[],
  inputLabel: string,
  outputLabel: string,
  zoom: ZoomEffectPayload,
  payload: CopyMediaOutputPayload,
  index: number
) {
  const range = relativeEffectRange(payload, zoom);

  if (range === undefined) {
    graph.push(`[${inputLabel}]null[${outputLabel}]`);
    return;
  }

  const safeScale = formatFilterNumber(zoom.scale);
  const cropWidthPercent = 100 / zoom.scale;
  const cropHeightPercent = 100 / zoom.scale;
  const xFactor = formatFilterNumber(normalizedRegionFactor(zoom.x, cropWidthPercent));
  const yFactor = formatFilterNumber(normalizedRegionFactor(zoom.y, cropHeightPercent));
  const base = `loaderly_zoom${index}_base`;
  const source = `loaderly_zoom${index}_src`;
  const zoomed = `loaderly_zoom${index}_zoomed`;
  const zoomChain = `scale=trunc(iw*${safeScale}/2)*2:trunc(ih*${safeScale}/2)*2,crop=iw/${safeScale}:ih/${safeScale}:(iw-iw/${safeScale})*${xFactor}:(ih-ih/${safeScale})*${yFactor}`;
  const enable = range ? `:${enableBetween(range)}` : '';

  graph.push(`[${inputLabel}]split[${base}][${source}]`);
  graph.push(`[${source}]${zoomChain}[${zoomed}]`);
  graph.push(`[${base}][${zoomed}]overlay=0:0${enable}[${outputLabel}]`);
}

function appendBlurGraph(
  graph: string[],
  inputLabel: string,
  outputLabel: string,
  blur: BlurEffectPayload,
  payload: CopyMediaOutputPayload,
  index: number,
  sourceDimensions?: { width: number; height: number }
) {
  const range = relativeEffectRange(payload, blur);

  if (range === undefined || blur.strength <= 0) {
    graph.push(`[${inputLabel}]null[${outputLabel}]`);
    return;
  }

  const strength = blurAmount(blur.strength);
  const width = formatFilterNumber(Math.max(4, Math.min(100, blur.width)) / 100);
  const height = formatFilterNumber(Math.max(4, Math.min(100, blur.height)) / 100);
  const xFactor = formatFilterNumber(normalizedRegionFactor(blur.x, blur.width));
  const yFactor = formatFilterNumber(normalizedRegionFactor(blur.y, blur.height));
  const base = `loaderly_blur${index}_base`;
  const mask = `loaderly_blur${index}_mask`;
  const blurred = `loaderly_blur${index}_blurred`;
  const enable = range ? `:${enableBetween(range)}` : '';
  const cropW = sourceDimensions ? Math.max(1, Math.round(sourceDimensions.width * Number(width))) : undefined;
  const cropH = sourceDimensions ? Math.max(1, Math.round(sourceDimensions.height * Number(height))) : undefined;
  const block = pixelBlockSize(strength);
  if (blur.style === 'pixelated' && (!cropW || !cropH)) throw new Error('Could not read video dimensions for mosaic export.');
  const blurChain = blur.style === 'pixelated'
    ? `scale=${Math.max(1, Math.round((cropW ?? 1) / block))}:${Math.max(1, Math.round((cropH ?? 1) / block))}:flags=area,scale=${cropW}:${cropH}:flags=neighbor`
    : `gblur=sigma=${strength}:steps=2`;
  const alpha = blurShapeAlpha(blur.shape);
  const shapeMask = alpha ? `,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='${alpha}'` : '';
  graph.push(`[${inputLabel}]split[${base}][${mask}]`);
  graph.push(
    `[${mask}]format=rgba,crop=w=${cropW ?? `iw*${width}`}:h=${cropH ?? `ih*${height}`}:x=(iw-ow)*${xFactor}:y=(ih-oh)*${yFactor}:exact=1,${blurChain}${shapeMask}[${blurred}]`
  );
  graph.push(`[${base}][${blurred}]overlay=x=(W-w)*${xFactor}:y=(H-h)*${yFactor}${enable}[${outputLabel}]`);
}

function textOverlayFilter(overlay: TextOverlayPayload, payload: CopyMediaOutputPayload): string | undefined {
  const text = overlay.text.trim();

  if (!text) {
    return undefined;
  }

  if (payload.kind === 'image' || payload.kind === 'snapshot') {
    if (payload.frameSeconds < overlay.startSeconds || payload.frameSeconds > overlay.endSeconds) {
      return undefined;
    }
  }

  const start = Math.max(0, overlay.startSeconds - Math.max(0, payload.startSeconds));
  const end = Math.max(start + 0.1, overlay.endSeconds - Math.max(0, payload.startSeconds));
  const x = clampPercent(overlay.x) / 100;
  const y = clampPercent(overlay.y) / 100;
  const fontSize = Math.round(Math.max(14, Math.min(120, overlay.fontSize || 34)));
  const font = drawTextFontOption(overlay.fontFamily);
  const fontColor = safeHexColor(overlay.color) ?? 'white';
  const drawTextOptions = [
    font,
    overlay.textFilePath ? `textfile=${escapeFilterPath(overlay.textFilePath)}` : `text=${escapeDrawText(prepareEditorTextForExport(text))}`,
    `fontcolor=${fontColor}`,
    `fontsize=${fontSize}`,
    'text_shaping=1',
    'box=1',
    'boxcolor=black@0.46',
    'boxborderw=12',
    `x=(w-text_w)*${x.toFixed(4)}`,
    `y=(h-text_h)*${y.toFixed(4)}`,
    payload.kind === 'image' || payload.kind === 'snapshot' ? undefined : `enable=between(t\\,${formatSeconds(start)}\\,${formatSeconds(end)})`
  ].filter(Boolean);

  return `drawtext=${drawTextOptions.join(':')}`;
}

function normalizedRegionFactor(centerPercent: number, sizePercent: number): number {
  const size = Math.max(1, Math.min(99, sizePercent));
  const available = Math.max(1, 100 - size);
  const topLeft = Math.max(0, Math.min(available, centerPercent - size / 2));

  return topLeft / available;
}

function relativeEffectRange(
  payload: CopyMediaOutputPayload,
  effect: { readonly startSeconds?: number; readonly endSeconds?: number }
): RelativeEffectRange | null | undefined {
  const outputStart = Math.max(0, payload.startSeconds);
  const outputEnd = Math.max(outputStart + 0.1, payload.endSeconds);
  const duration = outputEnd - outputStart;
  const start = effect.startSeconds ?? outputStart;
  const end = effect.endSeconds ?? outputEnd;

  if (payload.kind === 'image' || payload.kind === 'snapshot') {
    return payload.frameSeconds >= start && payload.frameSeconds <= end ? null : undefined;
  }

  const relativeStart = Math.max(0, start - outputStart);
  const relativeEnd = Math.min(duration, end - outputStart);

  if (relativeEnd <= 0 || relativeStart >= duration || relativeEnd <= relativeStart + 0.02) {
    return undefined;
  }

  if (relativeStart <= 0.02 && relativeEnd >= duration - 0.02) {
    return null;
  }

  return {
    startSeconds: relativeStart,
    endSeconds: relativeEnd
  };
}

function enableBetween(range: RelativeEffectRange): string {
  return `enable=between(t\\,${formatSeconds(range.startSeconds)}\\,${formatSeconds(range.endSeconds)})`;
}

function normalizedBlurs(payload: CopyMediaOutputPayload): readonly BlurEffectPayload[] {
  const source = payload.effects?.blurs?.length ? payload.effects.blurs : payload.effects?.blur ? [payload.effects.blur] : [];

  return source
    .filter((blur) => Number.isFinite(blur.strength) && blur.strength > 0)
    .map((blur) => ({
      strength: Math.max(1, Math.min(48, blur.strength)),
      shape: blur.shape,
      style: blur.style,
      x: clampPercent(blur.x),
      y: clampPercent(blur.y),
      width: Math.max(4, Math.min(100, blur.width)),
      height: Math.max(4, Math.min(100, blur.height)),
      startSeconds: blur.startSeconds,
      endSeconds: blur.endSeconds
    }));
}

function normalizedZooms(payload: CopyMediaOutputPayload): readonly ZoomEffectPayload[] {
  const source = payload.effects?.zooms?.length ? payload.effects.zooms : payload.effects?.zoom ? [payload.effects.zoom] : [];

  return source
    .filter((zoom) => Number.isFinite(zoom.scale) && zoom.scale > 1)
    .map((zoom) => ({
      scale: Math.max(1, Math.min(8, zoom.scale)),
      x: clampPercent(zoom.x),
      y: clampPercent(zoom.y),
      width: Math.max(8, Math.min(100, zoom.width)),
      height: Math.max(8, Math.min(100, zoom.height)),
      startSeconds: zoom.startSeconds,
      endSeconds: zoom.endSeconds,
      easeIn: zoom.easeIn,
      easeOut: zoom.easeOut
    }));
}

function normalizedSpeedEffect(payload: CopyMediaOutputPayload): NormalizedSpeedEffect | undefined {
  const speed = payload.effects?.speed;
  const value = speed?.rate ?? 1;
  const rate = Number.isFinite(value) ? Math.max(0.25, Math.min(8, value)) : 1;
  const mode: SpeedEffectMode = normalizeSpeedMode(speed?.mode);

  if (!speed || !hasSpeedSound(rate, mode)) {
    return undefined;
  }

  const range = relativeEffectRange(payload, speed);

  if (range === undefined) {
    return undefined;
  }

  return { rate, mode, range };
}

function formatFilterNumber(value: number): string {
  return Number(value.toFixed(4)).toString();
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function audioSpeedFilterArgs(speedRate: number, mode: SpeedEffectMode): readonly string[] {
  return ['-filter:a', audioSpeedFilterChain(speedRate, mode)];
}

async function hasAudioStream(sourcePath: string): Promise<boolean> {
  const toolPath = resolveToolPath('ffprobe');

  if (toolPath === undefined) {
    return false;
  }

  try {
    const result = await execFileAsync(
      toolPath,
      ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=index', '-of', 'csv=p=0', sourcePath],
      {
        timeout: 1000 * 15,
        windowsHide: true,
        maxBuffer: 1024 * 256
      }
    );

    return result.stdout.trim().length > 0;
  } catch {
    return false;
  }
}

function drawTextFontOption(fontFamily: EditorTextFontFamily | undefined): string {
  const fallback = [join(process.resourcesPath, 'fonts/NotoSansArabic.ttf'), join(__dirname, '../renderer/fonts/NotoSansArabic.ttf')].find(existsSync) ?? '';
  const fontPath = textFontCandidates(fontFamily ?? defaultEditorTextFontFamily, process.platform, fallback).find(candidate => candidate && existsSync(candidate));

  return fontPath ? `fontfile=${escapeFilterPath(fontPath)}` : '';
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 50));
}

function safeHexColor(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(normalized) ? `0x${normalized.slice(1)}` : undefined;
}

function escapeDrawText(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll(' ', '\\ ')
    .replaceAll(':', '\\:')
    .replaceAll("'", "\\'")
    .replaceAll(',', '\\,')
    .replaceAll('%', '\\%')
    .replace(/\r?\n/g, '\\n');
}

function escapeFilterPath(value: string): string {
  // execFile passes the graph without a shell. Escape separately for the filter
  // option parser and the outer graph parser (especially Windows drive colons).
  const option = value.replaceAll('\\', '/').replace(/[':\\]/g, '\\$&');
  return option.replace(/[\\'\[\],;]/g, '\\$&');
}

async function copyFilesToClipboard(paths: readonly string[]): Promise<void> {
  if (process.platform === 'darwin' && paths.length === 1) {
    const value = Buffer.from(pathToFileURL(paths[0]).href);
    clipboard.writeBuffer('public.file-url', value);
    if (!clipboard.readBuffer('public.file-url').equals(value)) throw new Error('Could not copy the file. Save to device instead.');
    return;
  }
  if (process.platform !== 'win32') throw new Error('Clipboard file copy is not available on this platform. Save to device instead.');
  const escapedPaths = paths.map((path) => path.replaceAll("'", "''"));
  const script = [
    'Add-Type -AssemblyName System.Windows.Forms',
    '$files = New-Object System.Collections.Specialized.StringCollection',
    ...escapedPaths.map((path) => `[void]$files.Add('${path}')`),
    'for ($attempt = 0; $attempt -lt 8; $attempt++) {',
    '  try {',
    '    [System.Windows.Forms.Clipboard]::Clear()',
    '    [System.Windows.Forms.Clipboard]::SetFileDropList($files)',
    '    exit 0',
    '  } catch {',
    '    if ($attempt -eq 7) { throw }',
    '    Start-Sleep -Milliseconds 160',
    '  }',
    '}'
  ].join('; ');

  await execFileAsync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-STA', '-Command', script], {
    timeout: 10000,
    windowsHide: true,
    maxBuffer: 1024 * 256
  });
}

async function mediaFileDetails(
  path: string,
  options: { readonly forceTranscode?: boolean } = {}
): Promise<Omit<Exclude<PickMediaFileResult, { readonly canceled: true }>, 'canceled'>> {
  const playablePath = await ensurePreviewCompatibleMedia(path, options.forceTranscode === true);
  const fileStat = await stat(playablePath);
  const durationSeconds = await probeDurationSeconds(playablePath);
  const thumbnailPath = await ensureMediaThumbnail(playablePath, durationSeconds);
  const subtitlePath =
    (await findSubtitleForMedia(playablePath)) ??
    (playablePath === path ? undefined : await findSubtitleForMedia(path));

  return {
    path: playablePath,
    fileUrl: mediaProtocolUrlForPath(playablePath),
    thumbnailUrl: thumbnailPath ? mediaProtocolUrlForPath(thumbnailPath) : undefined,
    name: basename(path),
    sizeBytes: fileStat.size,
    durationSeconds,
    subtitlePath
  };
}

function mediaProtocolUrlForPath(filePath: string): string {
  return `loaderly-media://file/${Buffer.from(filePath, 'utf8').toString('base64url')}`;
}

function filePathFromMediaProtocolUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url);

    if (parsed.protocol !== 'loaderly-media:' || parsed.hostname !== 'file') {
      return undefined;
    }

    const token = parsed.pathname.replace(/^\/+/, '');

    return token.length > 0 ? Buffer.from(token, 'base64url').toString('utf8') : undefined;
  } catch {
    return undefined;
  }
}

function isPreviewServablePath(path: string): boolean {
  return isMediaPath(path) || ['.jpg', '.jpeg', '.png', '.webp'].includes(extname(path).toLowerCase());
}

async function ensurePreviewCompatibleMedia(sourcePath: string, forceTranscode = false): Promise<string> {
  if (!isMediaPath(sourcePath) || extname(sourcePath).toLowerCase() === '.mp3') {
    return sourcePath;
  }

  const parsed = parse(sourcePath);

  if (parsed.name.endsWith('.loaderly-h264')) {
    return sourcePath;
  }

  const codec = await probeVideoCodec(sourcePath);

  if (!forceTranscode && codec !== undefined && isChromiumPreviewCodec(codec)) {
    return sourcePath;
  }

  const ffmpegPath = resolveToolPath('ffmpeg');

  if (ffmpegPath === undefined) {
    return sourcePath;
  }

  const outputPath = join(parsed.dir, `${parsed.name}.loaderly-h264.mp4`);

  if (existsSync(outputPath)) {
    const [sourceStat, outputStat] = await Promise.all([stat(sourcePath), stat(outputPath)]);

    if (outputStat.mtimeMs >= sourceStat.mtimeMs && outputStat.size > 0) {
      return outputPath;
    }
  }

  try {
    await execFileAsync(
      ffmpegPath,
      [
        '-y',
        '-i',
        sourcePath,
        '-map',
        '0:v:0',
        '-map',
        '0:a?',
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '23',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-b:a',
        '160k',
        '-movflags',
        '+faststart',
        outputPath
      ],
      {
        timeout: 1000 * 60 * 20,
        windowsHide: true,
        maxBuffer: 1024 * 1024 * 8
      }
    );
  } catch {
    return sourcePath;
  }

  return existsSync(outputPath) ? outputPath : sourcePath;
}

async function ensureMediaThumbnail(sourcePath: string, durationSeconds?: number): Promise<string | undefined> {
  if (!isMediaPath(sourcePath) || mediaKindForPath(sourcePath) === 'audio') {
    return undefined;
  }

  const ffmpegPath = resolveToolPath('ffmpeg');

  if (ffmpegPath === undefined) {
    return undefined;
  }

  const outputPath = mediaThumbnailPath(sourcePath);

  if (existsSync(outputPath)) {
    const [sourceStat, outputStat] = await Promise.all([stat(sourcePath), stat(outputPath)]);

    if (outputStat.mtimeMs >= sourceStat.mtimeMs && outputStat.size > 0) {
      return outputPath;
    }
  }

  await mkdir(dirname(outputPath), { recursive: true });

  const seekSeconds = Number.isFinite(durationSeconds) && (durationSeconds ?? 0) > 2 ? '1' : '0.1';

  try {
    await execFileAsync(
      ffmpegPath,
      [
        '-y',
        '-ss',
        seekSeconds,
        '-i',
        sourcePath,
        '-frames:v',
        '1',
        '-vf',
        'scale=640:-2',
        '-q:v',
        '4',
        outputPath
      ],
      {
        timeout: 20000,
        windowsHide: true,
        maxBuffer: 1024 * 512
      }
    );
  } catch {
    return undefined;
  }

  return existsSync(outputPath) ? outputPath : undefined;
}

function mediaThumbnailPath(sourcePath: string): string {
  const hash = createHash('sha1').update(sourcePath).digest('hex');

  return join(app.getPath('userData'), 'thumbnails', `${hash}.jpg`);
}

async function probeVideoCodec(path: string): Promise<string | undefined> {
  const toolPath = resolveToolPath('ffprobe');

  if (toolPath === undefined) {
    return undefined;
  }

  try {
    const { stdout } = await execFileAsync(
      toolPath,
      ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name', '-of', 'default=noprint_wrappers=1:nokey=1', path],
      {
        timeout: 10000,
        windowsHide: true,
        maxBuffer: 1024 * 64
      }
    );
    const codec = stdout.trim().split(/\r?\n/)[0]?.trim().toLowerCase();

    return codec || undefined;
  } catch {
    return undefined;
  }
}

async function probeVideoDimensions(path: string): Promise<{ width: number; height: number } | undefined> {
  const toolPath = resolveToolPath('ffprobe');

  if (toolPath === undefined) {
    return undefined;
  }

  try {
    const { stdout } = await execFileAsync(
      toolPath,
      [
        '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        path
      ],
      {
        timeout: 10000,
        windowsHide: true,
        maxBuffer: 1024 * 64
      }
    );
    const lines = stdout.trim().split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const width = Number.parseInt(lines[0] ?? '', 10);
    const height = Number.parseInt(lines[1] ?? '', 10);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return undefined;
    }
    return { width, height };
  } catch {
    return undefined;
  }
}

function isChromiumPreviewCodec(codec: string): boolean {
  return ['h264', 'avc1', 'aac', 'mp3', 'opus', 'vorbis'].includes(codec.toLowerCase());
}

async function loadSubtitleFile(path: string): Promise<SubtitleFileResult> {
  const content = await readFile(path, 'utf8');

  return {
    canceled: false,
    path,
    name: basename(path),
    cues: parseSubtitleCues(content)
  };
}

async function findSubtitleForMedia(mediaPath: string): Promise<string | undefined> {
  const folder = dirname(mediaPath);
  const mediaName = parse(mediaPath).name.toLowerCase();
  const entries = await readdir(folder, { withFileTypes: true }).catch(() => []);
  const candidates = entries
    .filter((entry) => entry.isFile() && isSubtitlePath(entry.name))
    .map((entry) => join(folder, entry.name));

  return (
    candidates.find((candidate) => parse(candidate).name.toLowerCase() === mediaName) ??
    candidates.find((candidate) => parse(candidate).name.toLowerCase().startsWith(mediaName)) ??
    candidates[0]
  );
}

async function writeRetimedSubtitleFile(payload: CopyMediaOutputPayload, outputDirectory: string): Promise<string | undefined> {
  const sourceCues =
    payload.subtitleCues && payload.subtitleCues.length > 0
      ? payload.subtitleCues
      : payload.subtitlePath && existsSync(payload.subtitlePath)
        ? parseSubtitleCues(await readFile(payload.subtitlePath, 'utf8'))
        : [];

  if (sourceCues.length === 0) {
    return undefined;
  }

  const cues =
    payload.kind === 'image' || payload.kind === 'snapshot'
      ? subtitleCuesForStillFrame(sourceCues, payload.frameSeconds)
      : retimeSubtitleCuesForOutput(sourceCues, payload.startSeconds, payload.endSeconds);

  if (cues.length === 0) {
    return undefined;
  }

  const subtitlePath = join(outputDirectory, `subtitle-${Date.now()}.srt`);
  await writeFile(subtitlePath, formatSrt(cues), 'utf8');

  return subtitlePath;
}

async function writeTextOverlayFiles(payload: CopyMediaOutputPayload, outputDirectory: string): Promise<readonly TextOverlayPayload[]> {
  return Promise.all(
    (payload.textOverlays ?? []).map(async (overlay, index) => {
      const textFilePath = join(outputDirectory, `text-${Date.now()}-${index}.txt`);
      await writeFile(textFilePath, prepareEditorTextForExport(overlay.text), 'utf8');

      return { ...overlay, textFilePath };
    })
  );
}

function parseSubtitleCues(content: string): readonly SubtitleCue[] {
  const normalized = content
    .replace(/^\uFEFF/, '')
    .replace(/\r/g, '')
    .replace(/^WEBVTT[^\n]*(\n|$)/i, '')
    .trim();

  if (!normalized) {
    return [];
  }

  return normalized
    .split(/\n{2,}/)
    .flatMap((block) => {
      const lines = block
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      const timingIndex = lines.findIndex((line) => line.includes('-->'));

      if (timingIndex < 0) {
        return [];
      }

      const [startText, endText] = lines[timingIndex].split('-->').map((part) => part.trim().split(/\s+/)[0]);
      const startSeconds = parseSubtitleTime(startText);
      const endSeconds = parseSubtitleTime(endText);
      const text = lines
        .slice(timingIndex + 1)
        .join('\n')
        .replace(/<[^>]+>/g, '')
        .trim();

      if (!Number.isFinite(startSeconds) || !Number.isFinite(endSeconds) || endSeconds <= startSeconds || text.length === 0) {
        return [];
      }

      return [{ startSeconds, endSeconds, text }];
    });
}

function parseSubtitleTime(value: string | undefined): number {
  if (!value) {
    return Number.NaN;
  }

  const match = value.trim().match(/(?:(\d+):)?(\d{2}):(\d{2})[,.](\d{1,3})/);

  if (!match) {
    return Number.NaN;
  }

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const milliseconds = Number(match[4].padEnd(3, '0').slice(0, 3));

  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}

function formatSrt(cues: readonly SubtitleCue[]): string {
  return cues
    .map((cue, index) => {
      const start = formatSubtitleTime(cue.startSeconds);
      const end = formatSubtitleTime(cue.endSeconds);

      return `${index + 1}\n${start} --> ${end}\n${cue.text}`;
    })
    .join('\n\n');
}

function formatSubtitleTime(seconds: number): string {
  const totalMilliseconds = Math.max(0, Math.round(seconds * 1000));
  const milliseconds = totalMilliseconds % 1000;
  const totalSeconds = Math.floor(totalMilliseconds / 1000);
  const displaySeconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  return `${pad2(hours)}:${pad2(minutes)}:${pad2(displaySeconds)},${milliseconds.toString().padStart(3, '0')}`;
}

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

function isMediaPath(path: string): boolean {
  return ['.mp4', '.mov', '.mkv', '.webm', '.avi', '.m4v', '.mp3', '.m4a', '.wav', '.aac', '.flac', '.ogg', '.opus'].includes(extname(path).toLowerCase());
}

function mediaKindForPath(path: string): 'video' | 'audio' {
  return ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg', '.opus'].includes(extname(path).toLowerCase()) ? 'audio' : 'video';
}

function isSubtitlePath(path: string): boolean {
  return ['.srt', '.vtt'].includes(extname(path).toLowerCase());
}

async function probeDurationSeconds(path: string): Promise<number | undefined> {
  const toolPath = resolveToolPath('ffprobe');

  if (toolPath === undefined) {
    return undefined;
  }

  try {
    const { stdout } = await execFileAsync(
      toolPath,
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', path],
      {
        timeout: 10000,
        windowsHide: true,
        maxBuffer: 1024 * 64
      }
    );
    const duration = Number.parseFloat(stdout.trim());

    return Number.isFinite(duration) ? duration : undefined;
  } catch {
    return undefined;
  }
}

function formatSeconds(value: number): string {
  return Math.max(0, value).toFixed(3);
}

function escapeSvgText(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function resolveAppIconPath(): string | undefined {
  const file = process.platform === 'win32' ? 'loaderly.ico' : 'identity/loaderly-512.png';
  const candidates = [
    join(process.cwd(), '../../assets', file),
    join(__dirname, '../../../../assets', file),
    join(process.resourcesPath ?? '', 'assets', file)
  ];

  return candidates.find((candidate) => existsSync(candidate));
}

let toolManager: ToolManager | undefined;
function getToolManager(): ToolManager {
  return toolManager ??= new ToolManager(join(app.getPath('userData'), 'tools'), resolveBundledToolPath);
}
function resolveToolPath(toolName: string): string | undefined {
  return getToolManager().resolve(toolName as ToolName);
}

function resolveBundledToolPath(toolName: string): string | undefined {
  return toolCandidates(toolName, process.platform, process.resourcesPath, process.execPath, join(__dirname, '../../../..'), process.env.PATH ?? '').find(existsSync);
}

const auxiliaryFontCache = new Map<string, string>();
function auxiliaryFontCss(arabic: boolean): string {
  const file = arabic ? 'NotoSansArabic.ttf' : 'InterVariable.woff2';
  if (!auxiliaryFontCache.has(file)) {
    const fontPath = join(__dirname, '../renderer/fonts', file);
    if (!existsSync(fontPath)) return '';
    const encoded = readFileSync(fontPath).toString('base64');
    auxiliaryFontCache.set(file, `@font-face{font-family:LoaderlyUI;src:url(data:font/${arabic?'ttf':'woff2'};base64,${encoded});font-weight:100 900}body,button{font-family:LoaderlyUI,"Segoe UI",sans-serif!important}`);
  }
  return auxiliaryFontCache.get(file)!;
}

function rendererFallbackHtmlUrl(message: string): string {
  const isDark = currentThemeMode === 'dark';
  const isArabic = currentLocale === 'ar';
  const theme = appearanceVariables(currentAppearance, isDark);
  const copy = isArabic
    ? {
        title: 'تعذر تشغيل واجهة Loaderly',
        body: 'تعذر تحميل الواجهة. تفاصيل المشكلة موضحة أدناه.',
        hint: 'أغلق Loaderly من أيقونته بجانب الساعة ثم افتحه مجددًا. إذا استمرت المشكلة، أعد تثبيته لتحديث ملفات البرنامج.',
        label: 'تفاصيل المشكلة'
      }
    : {
        title: 'Loaderly interface could not start',
        body: 'The interface did not load. Details are shown below.',
        hint: 'Exit Loaderly from its system tray icon and reopen it. If this continues, reinstall Loaderly to refresh its application files.',
        label: 'Error details'
      };
  const html = `<!doctype html>
<html lang="${isArabic ? 'ar' : 'en'}" dir="${isArabic ? 'rtl' : 'ltr'}">
  <head>
    <meta charset="utf-8" />
    <style>
      ${auxiliaryFontCss(isArabic)}
      html, body {
        margin: 0;
        min-height: 100%;
        background: ${theme['--background']};
        color: ${isDark ? '#f4f6fb' : '#1f2228'};
        font-family: "Segoe UI", system-ui, sans-serif;
      }
      body {
        display: grid;
        place-items: center;
        padding: 32px;
      }
      .panel {
        width: min(560px, 100%);
        border: 1px solid ${theme['--border']};
        border-radius: 10px;
        background: ${theme['--surface']};
        box-shadow: 0 20px 60px rgba(0, 0, 0, ${isDark ? '0.42' : '0.16'});
        padding: 24px;
      }
      h1 {
        margin: 0 0 8px;
        font-size: 22px;
      }
      p {
        margin: 0 0 16px;
        color: ${isDark ? '#b7becb' : '#626a76'};
        line-height: 1.7;
      }
      code {
        display: block;
        white-space: pre-wrap;
        padding: 14px;
        border-radius: 8px;
        background: ${theme['--surface-raised']};
        direction: ltr;
        text-align: left;
        color: ${isDark ? '#f4f6fb' : '#1f2228'};
        font: 12px Consolas, monospace;
      }
      strong {
        display: block;
        margin: 18px 0 8px;
      }
    </style>
  </head>
  <body>
    <main class="panel">
      <h1>${escapeHtml(copy.title)}</h1>
      <p>${escapeHtml(copy.body)}</p>
      <p>${escapeHtml(copy.hint)}</p>
      <strong>${escapeHtml(copy.label)}</strong>
      <code>${escapeHtml(message)}</code>
    </main>
  </body>
</html>`;

  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

function allowedExternalUrl(value: string): string | undefined {
  try {
    const url = new URL(value);

    return url.protocol === 'https:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function allowedDevelopmentRendererUrl(): string | undefined {
  if (app.isPackaged || !process.env.ELECTRON_RENDERER_URL) {
    return undefined;
  }

  try {
    const url = new URL(process.env.ELECTRON_RENDERER_URL);
    const isLoopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]';

    if (!isLoopback || (url.protocol !== 'http:' && url.protocol !== 'https:')) {
      return undefined;
    }

    return url.toString();
  } catch {
    return undefined;
  }
}

function createMainWindow(): BrowserWindow {
  const iconPath = resolveAppIconPath();
  const available = screen.getPrimaryDisplay().workAreaSize;
  const mainWindow = new BrowserWindow({
    width: Math.min(1440, available.width),
    height: Math.min(920, available.height),
    minWidth: Math.min(1180, available.width),
    minHeight: Math.min(720, available.height),
    title: 'Loaderly 2.1',
    backgroundColor: '#f3f4f6',
    autoHideMenuBar: true,
    frame: process.platform !== 'win32',
    ...(process.platform === 'darwin' ? { titleBarStyle: 'hiddenInset' as const, trafficLightPosition: { x: 16, y: 17 }, vibrancy: 'sidebar' as const, visualEffectState: 'followWindow' as const, backgroundColor: '#00000000' } : {}),
    icon: iconPath,
    show: false,
    webPreferences: {
      preload: resolvePreloadPath(),
      // Continue media-clock edits while the desktop window is minimized or hidden.
      backgroundThrottling: false,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  let fallbackLoaded = false;

  mainWindow.webContents.on('context-menu', (_event, params) => {
    const template = textContextMenu(params);
    if (!template.length) return;
    Menu.buildFromTemplate(template).popup({ window: mainWindow, frame: params.frame ?? undefined });
  });

  const showRendererFallback = (message: string) => {
    if (fallbackLoaded || mainWindow.isDestroyed()) {
      return;
    }

    fallbackLoaded = true;
    safeMainError(`[loaderly] renderer fallback: ${message}`);
    void mainWindow.loadURL(rendererFallbackHtmlUrl(message));
    mainWindow.show();
  };

  mainWindow.once('ready-to-show', () => {
    mainWindow.setMenuBarVisibility(false);
    mainWindow.show();
  });

  mainWindow.on('close', (event) => {
    if (isQuitting) {
      return;
    }

    // Linux desktops do not always provide a tray. Never strand a hidden app.
    if (process.platform === 'linux') { isQuitting = true; app.quit(); return; }
    event.preventDefault();
    mainWindow.hide();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const externalUrl = allowedExternalUrl(url);

    if (externalUrl) {
      void shell.openExternal(externalUrl);
    }

    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    event.preventDefault();
    const externalUrl = allowedExternalUrl(url);

    if (externalUrl) {
      void shell.openExternal(externalUrl);
    }
  });
  mainWindow.webContents.on('did-fail-load', (_event, code, description, url) => {
    showRendererFallback(`${code} ${description} (${url})`);
  });
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    showRendererFallback(`Renderer process stopped: ${details.reason}`);
  });
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (level >= 2) {
      safeMainError(`[loaderly:renderer] ${message} (${sourceId}:${line})`);
    }
  });
  mainWindow.webContents.on('did-finish-load', () => {
    if (fallbackLoaded) {
      return;
    }

    setTimeout(() => {
      if (fallbackLoaded || mainWindow.isDestroyed()) {
        return;
      }

      void mainWindow.webContents
        .executeJavaScript("Boolean(document.getElementById('root')?.children.length)", true)
        .then((hasContent) => {
          if (!hasContent) {
            showRendererFallback('Renderer loaded, but React did not mount into #root.');
          }
        })
        .catch((error: unknown) => {
          showRendererFallback(error instanceof Error ? error.message : 'Renderer health check failed.');
        });
    }, 1200);
  });

  const developmentRendererUrl = allowedDevelopmentRendererUrl();

  if (developmentRendererUrl) {
    void mainWindow.loadURL(developmentRendererUrl);
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return mainWindow;
}

function showMainWindow(route?: 'workspace' | 'downloads' | 'editor' | 'settings' | 'export') {
  const mainWindow = mainWindowRef;

  if (!mainWindow) {
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();

  if (route) {
    mainWindow.webContents.send('loaderly:navigate', route);
  }
}

function trayActionFromUrl(url: string): TrayAction | undefined {
  try {
    const parsed = new URL(url);

    if (parsed.protocol !== 'loaderly-tray:') {
      return undefined;
    }

    switch (parsed.hostname) {
      case 'open':
      case 'downloads':
      case 'editor':
      case 'settings':
      case 'exit':
        return parsed.hostname;
      default:
        return undefined;
    }
  } catch {
    return undefined;
  }
}

function handleTrayUrl(url: string): boolean {
  const action = trayActionFromUrl(url);

  if (!action) {
    return false;
  }

  runTrayAction(action);
  return true;
}

function trayHtmlUrl(): string {
  const isDark = currentThemeMode === 'dark';
  const isArabic = currentLocale === 'ar';
  const theme = appearanceVariables(currentAppearance, isDark);
  const colors = {background:theme['--background'],surface:theme['--surface'],foreground:theme['--foreground'],muted:theme['--muted'],border:theme['--border-soft'],accent:theme['--accent'],accentSoft:theme['--accent-soft']};
  const logoPath = resolveAppIconPath();
  const logo = logoPath ? nativeImage.createFromPath(logoPath).resize({width:64,height:64}).toDataURL() : '';
  const copy = isArabic
    ? {
        panel: 'لوحة سريعة',
        open: 'فتح Loaderly',
        downloads: 'التنزيلات',
        editor: 'المحرر',
        settings: 'الإعدادات',
        exit: 'إغلاق Loaderly نهائيًا'
      }
    : {
        panel: 'Quick actions',
        open: 'Open Loaderly',
        downloads: 'Show Downloads',
        editor: 'Editor',
        settings: 'Settings',
        exit: 'Exit Loaderly'
      };
  const icon = {
    logo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/></svg>',
    open: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>',
    downloads: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>',
    editor: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88"/><path d="M14.47 14.48 20 20"/></svg>',
    settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.7 3.4 10.5 2h3l.8 1.4 1.6.6 1.5-.5 2.1 2.1-.5 1.5.6 1.6 1.4.8v3l-1.4.8-.6 1.6.5 1.5-2.1 2.1-1.5-.5-1.6.6-.8 1.4h-3l-.8-1.4-1.6-.6-1.5.5-2.1-2.1.5-1.5-.6-1.6L2 13.5v-3l1.4-.8L4 8.1l-.5-1.5 2.1-2.1 1.5.5 1.6-.6Z"/><circle cx="12" cy="12" r="3"/></svg>',
    exit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17 15 12l-5-5"/><path d="M15 12H3"/><path d="M21 3v18"/></svg>'
  };
  const html = `<!doctype html>
<html lang="${isArabic ? 'ar' : 'en'}" dir="${isArabic ? 'rtl' : 'ltr'}">
  <head>
    <meta charset="utf-8" />
    <style>
      ${auxiliaryFontCss(isArabic)}
      * { box-sizing: border-box; }
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        overflow: hidden;
        background: transparent;
        color: ${colors.foreground};
        font-family: "Segoe UI", system-ui, sans-serif;
        font-size: 13px;
        user-select: none;
      }
      .tray-panel {
        height: 100%;
        display: grid;
        grid-template-rows: 48px minmax(0, 1fr) 48px;
        border: 1px solid ${colors.border};
        border-radius: 8px;
        overflow: hidden;
        background: ${colors.surface};
        box-shadow: 0 18px 42px rgba(0, 0, 0, ${isDark ? '0.42' : '0.18'});
      }
      .tray-head {
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 12px;
        border-bottom: 1px solid ${colors.border};
        background: ${colors.background};
      }
      .mark {
        width: 22px;
        height: 22px;
        display: grid;
        place-items: center;
        border-radius: 6px;
        background: ${colors.accentSoft};
        color: ${colors.accent};
      }
      .mark svg,
      .icon svg {
        width: 15px;
        height: 15px;
        display: block;
        fill: none;
        stroke: currentColor;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-width: 2;
      }
      .mark svg {
        fill: currentColor;
        stroke: none;
      }
      strong { display: block; font-size: 13px; }
      small { display: block; color: ${colors.muted}; font-size: 11px; }
      .tray-actions {
        min-height: 0;
        display: grid;
        gap: 2px;
        padding: 5px;
        align-content: start;
      }
      a {
        height: 34px;
        display: flex;
        align-items: center;
        gap: 9px;
        border: 1px solid transparent;
        border-radius: 6px;
        background: transparent;
        color: ${colors.foreground};
        font: inherit;
        text-decoration: none;
        text-align: start;
        padding: 0 10px;
        cursor: pointer;
      }
      a:hover,
      a:focus-visible {
        border-color: ${colors.border};
        background: ${colors.accentSoft};
        outline: none;
      }
      a:active {
        transform: translateY(1px);
      }
      .exit {
        border-top: 1px solid ${colors.border};
        padding: 6px 5px;
        background: ${colors.background};
      }
      .exit a {
        width: 100%;
        color: ${isDark ? '#f4b8b8' : '#722f37'};
      }
      .icon {
        width: 18px;
        height: 18px;
        display: grid;
        place-items: center;
        color: ${colors.accent};
        flex: 0 0 18px;
      }
    </style>
  </head>
  <body>
    <div class="tray-panel">
      <div class="tray-head">
        <img class="mark" src="${logo}" alt="" />
        <span>
          <strong>Loaderly 2.0</strong>
          <small>${copy.panel}</small>
        </span>
      </div>
      <div class="tray-actions">
        <a href="loaderly-tray://open"><span class="icon">${icon.open}</span>${copy.open}</a>
        <a href="loaderly-tray://downloads"><span class="icon">${icon.downloads}</span>${copy.downloads}</a>
        <a href="loaderly-tray://settings"><span class="icon">${icon.settings}</span>${copy.settings}</a>
      </div>
      <div class="exit">
        <a href="loaderly-tray://exit"><span class="icon">${icon.exit}</span>${copy.exit}</a>
      </div>
    </div>
    <script>
      document.addEventListener('keydown', event => {
        const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
        if (!keys.includes(event.key)) return;
        event.preventDefault();
        const items = [...document.querySelectorAll('a')];
        const index = items.indexOf(document.activeElement);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
          : event.key === 'ArrowDown' ? (index + 1) % items.length : (index < 0 ? items.length - 1 : (index + items.length - 1) % items.length);
        items[next].focus();
      });
    </script>
  </body>
</html>`;

  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

function createTrayWindow(): BrowserWindow {
  if (trayWindowRef && !trayWindowRef.isDestroyed()) {
    return trayWindowRef;
  }

  const trayWindow = new BrowserWindow({
    width: trayWindowSize.width,
    height: trayWindowSize.height,
    useContentSize: true,
    show: false,
    frame: false,
    thickFrame: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    backgroundColor: appearanceVariables(currentAppearance, currentThemeMode === 'dark')['--background'],
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  trayWindow.webContents.setWindowOpenHandler(({ url }) => {
    handleTrayUrl(url);
    return { action: 'deny' };
  });
  trayWindow.webContents.on('will-navigate', (event, url) => {
    if (handleTrayUrl(url)) {
      event.preventDefault();
    }
  });
  trayWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape') { event.preventDefault(); trayWindow.hide(); }
  });
  trayWindow.on('blur', () => {
    if (!trayWindow.webContents.isDevToolsOpened()) {
      trayWindow.hide();
    }
  });
  trayWindow.on('closed', () => {
    trayWindowRef = undefined;
  });
  void trayWindow.loadURL(trayHtmlUrl());
  trayWindowRef = trayWindow;

  return trayWindow;
}

function positionTrayWindow(trayWindow: BrowserWindow) {
  const trayBounds = trayRef?.getBounds();

  if (!trayBounds) {
    return;
  }

  trayWindow.setContentSize(trayWindowSize.width, trayWindowSize.height);
  const [width, height] = trayWindow.getSize();
  const display = screen.getDisplayNearestPoint({
    x: trayBounds.x + Math.round(trayBounds.width / 2),
    y: trayBounds.y + Math.round(trayBounds.height / 2)
  });
  const workArea = display.workArea;
  const x = Math.min(Math.max(Math.round(trayBounds.x + trayBounds.width / 2 - width / 2), workArea.x + 8), workArea.x + workArea.width - width - 8);
  let y = trayBounds.y - height - 10;

  if (y < workArea.y + 8) {
    y = trayBounds.y + trayBounds.height + 10;
  }

  y = Math.min(Math.max(y, workArea.y + 8), workArea.y + workArea.height - height - 8);

  trayWindow.setBounds({ x, y, width, height });
}

function toggleTrayWindow() {
  const trayWindow = createTrayWindow();

  if (trayWindow.isVisible()) {
    trayWindow.hide();
    return;
  }

  positionTrayWindow(trayWindow);
  trayWindow.show();
  trayWindow.focus();
}

function runTrayAction(action: TrayAction) {
  trayWindowRef?.hide();

  switch (action) {
    case 'open':
      showMainWindow('workspace');
      break;
    case 'downloads':
      showMainWindow('downloads');
      break;
    case 'editor':
      showMainWindow('editor');
      break;
    case 'settings':
      showMainWindow('settings');
      break;
    case 'exit':
      isQuitting = true;
      app.quit();
      break;
  }
}

function createTray() {
  if (process.platform === 'linux') return;
  if (trayRef) {
    return;
  }

  const iconPath = resolveAppIconPath();
  let icon = iconPath ? nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 }) : nativeImage.createEmpty();
  if (process.platform === 'darwin' && iconPath) {
    // Extract the light brand mark as an alpha mask; macOS supplies its own tint.
    const source = nativeImage.createFromPath(iconPath).resize({ width: 36, height: 36 });
    const bitmap = source.toBitmap();
    for (let i = 0; i < bitmap.length; i += 4) {
      const alpha = Math.round(Math.max(0, Math.min(1, (Math.min(bitmap[i], bitmap[i + 1], bitmap[i + 2]) - 100) / 140)) * bitmap[i + 3]);
      bitmap[i] = bitmap[i + 1] = bitmap[i + 2] = 0; bitmap[i + 3] = alpha;
    }
    icon = nativeImage.createFromBitmap(bitmap, { width: 36, height: 36, scaleFactor: 2 });
    icon.setTemplateImage(true);
  }
  const tray = new Tray(icon);

  tray.setToolTip('Loaderly');
  if (process.platform === 'darwin') {
    tray.setContextMenu(nativeTrayMenu());
  } else {
    tray.on('click', toggleTrayWindow);
    tray.on('right-click', toggleTrayWindow);
  }
  tray.on('double-click', () => runTrayAction('open'));
  trayRef = tray;
}

function nativeTrayMenu() {
  const ar = currentLocale === 'ar';
  return Menu.buildFromTemplate([
    { label: ar ? 'فتح Loaderly' : 'Open Loaderly', click: () => runTrayAction('open') },
    { label: ar ? 'التنزيلات' : 'Downloads', click: () => runTrayAction('downloads') },
    { type: 'separator' },
    { label: ar ? 'الإعدادات…' : 'Settings…', accelerator: 'Command+,', click: () => runTrayAction('settings') },
    { type: 'separator' },
    { label: ar ? 'إنهاء Loaderly' : 'Quit Loaderly', accelerator: 'Command+Q', click: () => runTrayAction('exit') }
  ]);
}

function resolvePreloadPath(): string {
  const commonJsPreloadPath = join(__dirname, '../preload/index.cjs');

  if (existsSync(commonJsPreloadPath)) {
    return commonJsPreloadPath;
  }

  const legacyPreloadPaths = [join(__dirname, '../preload/index.js'), join(__dirname, '../preload/index.mjs')];
  return legacyPreloadPaths.find((candidate) => existsSync(candidate)) ?? commonJsPreloadPath;
}

function registerMediaProtocol(): void {
  protocol.handle('loaderly-media', async (request) => {
    const filePath = filePathFromMediaProtocolUrl(request.url);

    if (!filePath || !isPreviewServablePath(filePath) || !existsSync(filePath)) {
      return new Response('Media not found', { status: 404 });
    }

    const fileStat = await stat(filePath);
    const responsePlan = mediaFileResponsePlan({
      fileSizeBytes: fileStat.size,
      rangeHeader: request.headers.get('range'),
      contentType: mediaContentTypeForPath(filePath)
    });
    const headers = { ...responsePlan.headers, ...mediaCorsHeaders(request.headers.get('origin'), process.env.ELECTRON_RENDERER_URL) };

    if (responsePlan.status === 416) {
      return new Response(null, {
        status: responsePlan.status,
        headers
      });
    }

    const stream = responsePlan.status === 206
      ? createReadStream(filePath, { start: responsePlan.start, end: responsePlan.end })
      : createReadStream(filePath);

    return new Response(Readable.toWeb(stream) as BodyInit, {
      status: responsePlan.status,
      headers
    });
  });
}

app.setName('Loaderly');

if (process.platform === 'win32') {
  app.setAppUserModelId('com.voidksa.loaderly');
}

if (!isExportValidationRun && !app.requestSingleInstanceLock()) {
  isQuitting = true;
  app.quit();
} else {
  app.on('second-instance', () => showMainWindow('workspace'));

  app.whenReady().then(async () => {
    Menu.setApplicationMenu(process.platform === 'darwin' ? Menu.buildFromTemplate(macApplicationMenu(
      () => runTrayAction('settings'),
      () => { void shell.openExternal('https://loaderly-docs.voidksa.workers.dev/docs/'); }
    )) : null);
    registerMediaProtocol();

    if (await runExportValidationFromEnvironment()) {
      isQuitting = true;
      app.quit();
      return;
    }

    programUpdater=new ProgramUpdates(join(app.getPath('userData'),'Updates'),app.getVersion(),state=>{if(mainWindowRef&&!mainWindowRef.isDestroyed())mainWindowRef.webContents.send('loaderly:program-update-state',state);},undefined,process.windowsStore===true);
    await programUpdater.initialize();
    if(app.isPackaged&&!process.windowsStore){setTimeout(()=>{if(programUpdater.state.automatic)void programUpdater.check();},30000);setInterval(()=>{if(programUpdater.state.automatic)void programUpdater.check();},12*60*60*1000).unref();}
    registerIpcHandlers();
    mainWindowRef = createMainWindow();
    createTray();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindowRef = createMainWindow();
      }

      // Returning from another app must preserve the route and the focused input.
      showMainWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (isQuitting && process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('before-quit', () => {
    isQuitting = true;
  });
}

app.on('will-quit', () => {
  if (trayWindowRef) {
    trayWindowRef.destroy();
    trayWindowRef = undefined;
  }

  if (trayRef) {
    trayRef.destroy();
    trayRef = undefined;
  }
});
