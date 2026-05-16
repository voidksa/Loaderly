namespace Loaderly;

internal sealed class CoalescingProgress<T> : IProgress<T>, IDisposable
{
    private readonly object sync = new();
    private readonly Action<Action> post;
    private readonly Action<T> apply;
    private readonly UiUpdateThrottler throttler;

    private T? latest;
    private bool hasLatest;
    private bool scheduled;
    private bool disposed;

    public CoalescingProgress(Action<Action> post, Action<T> apply, int intervalMilliseconds)
    {
        this.post = post;
        this.apply = apply;
        throttler = new UiUpdateThrottler(intervalMilliseconds);
    }

    public void Report(T value)
    {
        int delay;
        lock (sync)
        {
            if (disposed)
            {
                return;
            }

            latest = value;
            hasLatest = true;
            if (scheduled)
            {
                return;
            }

            scheduled = true;
            delay = throttler.DelayUntilNextRun(Environment.TickCount64);
        }

        _ = ScheduleAsync(delay);
    }

    public void Flush()
    {
        Dispatch();
    }

    public void Dispose()
    {
        lock (sync)
        {
            disposed = true;
            hasLatest = false;
            scheduled = false;
        }
    }

    private async Task ScheduleAsync(int delayMilliseconds)
    {
        try
        {
            if (delayMilliseconds > 0)
            {
                await Task.Delay(delayMilliseconds).ConfigureAwait(false);
            }

            post(Dispatch);
        }
        catch
        {
            lock (sync)
            {
                scheduled = false;
            }
        }
    }

    private void Dispatch()
    {
        T value;
        lock (sync)
        {
            if (disposed || !hasLatest)
            {
                scheduled = false;
                return;
            }

            value = latest!;
            latest = default;
            hasLatest = false;
            scheduled = false;
            throttler.MarkRun(Environment.TickCount64);
        }

        apply(value);

        int delay;
        lock (sync)
        {
            if (disposed || !hasLatest || scheduled)
            {
                return;
            }

            scheduled = true;
            delay = throttler.DelayUntilNextRun(Environment.TickCount64);
        }

        _ = ScheduleAsync(delay);
    }
}
