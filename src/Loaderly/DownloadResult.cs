namespace Loaderly;

internal sealed record DownloadResult(string FilePath, string Title);

internal enum DownloadQuality
{
    Best,
    Video1080p,
    Video720p,
    AudioOnly
}

internal sealed record DownloadOptions(
    DownloadQuality Quality,
    bool AllowPlaylist,
    bool WriteSubtitles,
    string SubtitleLanguages);

internal sealed record DownloadProgress(
    double? Percent,
    string Status,
    string Message,
    string? Speed = null,
    string? Eta = null,
    long? DownloadedBytes = null,
    long? TotalBytes = null);
