using System.Diagnostics;

namespace Loaderly;

internal static class ProcessRunner
{
    private static readonly TimeSpan StreamCloseTimeout = TimeSpan.FromSeconds(3);
    private static readonly TimeSpan KillExitTimeout = TimeSpan.FromSeconds(5);

    public static async Task WaitForExitAsync(Process process, CancellationToken cancellationToken)
    {
        try
        {
            await process.WaitForExitAsync(cancellationToken).ConfigureAwait(false);
        }
        catch (OperationCanceledException)
        {
            KillProcessTree(process);
            await WaitAfterKillAsync(process).ConfigureAwait(false);
            throw;
        }
    }

    public static async Task WaitForExitAndStreamsAsync(
        Process process,
        Task outputClosed,
        Task errorClosed,
        CancellationToken cancellationToken)
    {
        await WaitForExitAsync(process, cancellationToken).ConfigureAwait(false);

        try
        {
            await Task.WhenAll(outputClosed, errorClosed)
                .WaitAsync(StreamCloseTimeout, cancellationToken)
                .ConfigureAwait(false);
        }
        catch (TimeoutException)
        {
        }
    }

    public static void KillProcessTree(Process process)
    {
        try
        {
            if (!process.HasExited)
            {
                process.Kill(entireProcessTree: true);
            }
        }
        catch
        {
        }
    }

    private static async Task WaitAfterKillAsync(Process process)
    {
        try
        {
            await process.WaitForExitAsync(CancellationToken.None)
                .WaitAsync(KillExitTimeout)
                .ConfigureAwait(false);
        }
        catch
        {
        }
    }
}
