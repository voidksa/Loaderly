namespace Loaderly;

internal static class TimelineThumbnailPlan
{
    public static int CountForWidth(int width)
    {
        return Math.Clamp(width / 120, 4, 8);
    }
}
