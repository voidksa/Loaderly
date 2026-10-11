export type DownloadProgress = {
  readonly rowId: number;
  readonly phase: 'preparing' | 'downloading' | 'processing' | 'subtitles' | 'finalizing';
  readonly percent?: number;
  readonly downloadedBytes?: number;
  readonly totalBytes?: number;
  readonly estimated?: boolean;
  readonly speedBytesPerSecond?: number;
  readonly etaSeconds?: number;
  readonly stream?: 'audio' | 'video' | 'media';
};
export type TransferProgress = Omit<DownloadProgress,'rowId'>;
