export type DownloadProgress = {
  readonly rowId: number;
  readonly engine?: 'yt-dlp' | 'pytubefix';
  readonly phase: 'preparing' | 'downloading' | 'processing' | 'subtitles' | 'finalizing' | 'waiting-audio' | 'removing-music' | 'saving-audio';
  readonly originalPath?: string;
  readonly subtitlePath?: string;
  readonly percent?: number;
  readonly downloadedBytes?: number;
  readonly totalBytes?: number;
  readonly estimated?: boolean;
  readonly speedBytesPerSecond?: number;
  readonly etaSeconds?: number;
  readonly stream?: 'audio' | 'video' | 'media';
};
export type TransferProgress = Omit<DownloadProgress,'rowId'>;
