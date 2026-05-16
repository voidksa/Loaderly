namespace Loaderly;

internal sealed class DownloadItem
{
    public Guid Id { get; init; } = Guid.NewGuid();

    public string Title { get; init; } = string.Empty;

    public string SourceUrl { get; init; } = string.Empty;

    public string FilePath { get; init; } = string.Empty;

    public string? ThumbnailPath { get; set; }

    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.Now;
}
