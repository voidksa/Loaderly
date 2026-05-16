namespace Loaderly;

internal static class TrimPanelLayout
{
    public static IReadOnlyList<int> RowHeights { get; } =
    [
        48,
        146,
        38,
        38,
        38,
        108,
        118,
        96,
        40,
        40,
        40,
        40
    ];

    public static int ContentHeight => RowHeights.Sum();

    public static bool NeedsScrolling(int availableContentHeight)
    {
        return availableContentHeight < ContentHeight;
    }
}
