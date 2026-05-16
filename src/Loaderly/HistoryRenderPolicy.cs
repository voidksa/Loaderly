namespace Loaderly;

internal static class HistoryRenderPolicy
{
    public const int MaxUnfilteredCards = 36;
    public const int MaxFilteredCards = 72;

    public static IReadOnlyList<DownloadItem> VisibleItems(IEnumerable<DownloadItem> items, string query)
    {
        var limit = string.IsNullOrWhiteSpace(query) ? MaxUnfilteredCards : MaxFilteredCards;
        return items.Take(limit).ToList();
    }
}
