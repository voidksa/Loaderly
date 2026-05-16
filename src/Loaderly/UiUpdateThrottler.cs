namespace Loaderly;

internal sealed class UiUpdateThrottler
{
    public UiUpdateThrottler(int intervalMilliseconds)
    {
        if (intervalMilliseconds <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(intervalMilliseconds));
        }

        IntervalMilliseconds = intervalMilliseconds;
    }

    public int IntervalMilliseconds { get; }

    private long lastRunTick = long.MinValue;

    public bool ShouldRun(long currentTick, bool throttle)
    {
        if (!throttle || lastRunTick == long.MinValue || currentTick - lastRunTick >= IntervalMilliseconds)
        {
            lastRunTick = currentTick;
            return true;
        }

        return false;
    }

    public int DelayUntilNextRun(long currentTick)
    {
        if (lastRunTick == long.MinValue)
        {
            return 1;
        }

        var remaining = IntervalMilliseconds - (currentTick - lastRunTick);
        return (int)Math.Clamp(remaining, 1, IntervalMilliseconds);
    }

    public void MarkRun(long currentTick)
    {
        lastRunTick = currentTick;
    }
}
