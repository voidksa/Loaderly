using System.Text.Json.Serialization;

namespace Loaderly;

internal enum DownloadTaskState
{
    Queued,
    Running,
    Completed,
    Canceled,
    Failed
}

internal sealed class DownloadQueueItem
{
    public Guid Id { get; init; } = Guid.NewGuid();

    public string SourceUrl { get; init; } = string.Empty;

    public DownloadOptions Options { get; init; } = new(
        DownloadQuality.Best,
        AllowPlaylist: false,
        WriteSubtitles: true,
        SubtitleLanguages: SubtitleLanguagePreference.DefaultLanguages);

    public DownloadTaskState State { get; set; } = DownloadTaskState.Queued;

    public double? Percent { get; set; }

    public string Status { get; set; } = "Queued";

    public string? Error { get; set; }

    public string? Speed { get; set; }

    public string? Eta { get; set; }

    public long? DownloadedBytes { get; set; }

    public long? TotalBytes { get; set; }

    [JsonIgnore]
    public CancellationTokenSource? Cancellation { get; set; }
}
