namespace Loaderly;

internal static class ToolLookup
{
    public static Task<string> ResolveAsync(string toolName, CancellationToken cancellationToken)
    {
        return RunAsync(() => ToolResolver.ResolveToolPath(toolName), cancellationToken);
    }

    internal static Task<string> RunForTest(Func<string> operation, CancellationToken cancellationToken)
    {
        return RunAsync(operation, cancellationToken);
    }

    private static Task<T> RunAsync<T>(Func<T> operation, CancellationToken cancellationToken)
    {
        return Task.Run(operation, cancellationToken);
    }
}
