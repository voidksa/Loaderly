namespace Loaderly;

internal static class TrimPanelLayout
{
    public static IReadOnlyList<int> RowHeights { get; } =
    [
        34,
        104,
        30,
        30,
        28,
        270,
        96,
        34,
        34,
        34,
        34
    ];

    public static int ContentHeight => RowHeights.Sum();

    public static bool NeedsScrolling(int availableContentHeight)
    {
        return availableContentHeight < ContentHeight;
    }
}
