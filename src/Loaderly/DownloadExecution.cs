namespace Loaderly;

internal static class DownloadExecution
{
    public static Task<IReadOnlyList<DownloadResult>> RunAsync(
        Func<Task<IReadOnlyList<DownloadResult>>> operation,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return Task.Run(operation, cancellationToken);
    }
}
