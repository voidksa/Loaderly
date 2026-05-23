using System.Diagnostics;
using System.IO;
using System.Collections.Concurrent;

namespace Loaderly;

internal static class ToolResolver
{
    private static readonly ConcurrentDictionary<string, string> ToolPathCache = new(StringComparer.OrdinalIgnoreCase);
    internal static string UserToolDirectory => Path.Combine(AppDataFolder.Path, "tools", "windows");

    public static string ResolveToolPath(string toolName)
    {
        return ToolPathCache.GetOrAdd(NormalizeToolName(toolName), ResolveToolPathUncached);
    }

    public static string? TryResolveBundledToolPath(string toolName)
    {
        foreach (var directory in CandidateToolDirectories(includeCurrentDirectory: false))
        {
            foreach (var executableName in ExecutableNames(toolName))
            {
                var candidate = Path.Combine(directory, executableName);
                if (File.Exists(candidate))
                {
                    return candidate;
                }
            }
        }

        return null;
    }

    internal static void ClearCache()
    {
        ToolPathCache.Clear();
    }

    internal static void ClearCacheForTest()
    {
        ClearCache();
    }

    internal static string FirstCandidateToolDirectoryForTest()
    {
        return PreferredToolDirectories(includeCurrentDirectory: true).First();
    }

    private static string ResolveToolPathUncached(string toolName)
    {
        foreach (var directory in CandidateToolDirectories())
        {
            foreach (var executableName in ExecutableNames(toolName))
            {
                var candidate = Path.Combine(directory, executableName);
                if (File.Exists(candidate))
                {
                    return candidate;
                }
            }
        }

        foreach (var directory in PathDirectories())
        {
            foreach (var executableName in ExecutableNames(toolName))
            {
                var candidate = Path.Combine(directory, executableName);
                if (File.Exists(candidate))
                {
                    return candidate;
                }
            }
        }

        throw new InvalidOperationException(
            $"{toolName} was not found. Put {toolName}.exe in tools\\windows or add it to PATH.");
    }

    public static void AddToolDirectoriesToPath(ProcessStartInfo startInfo)
    {
        var toolDirectories = CandidateToolDirectories(includeCurrentDirectory: false).ToArray();
        if (toolDirectories.Length == 0)
        {
            return;
        }

        startInfo.Environment.TryGetValue("PATH", out var existingPath);
        startInfo.Environment["PATH"] = string.Join(
            Path.PathSeparator,
            toolDirectories.Concat([existingPath ?? string.Empty]).Where(value => value.Length > 0));
    }

    private static IEnumerable<string> ExecutableNames(string toolName)
    {
        toolName = NormalizeToolName(toolName);
        if (toolName.EndsWith(".exe", StringComparison.OrdinalIgnoreCase))
        {
            yield return toolName;
            yield break;
        }

        yield return $"{toolName}.exe";
        yield return toolName;
    }

    private static IEnumerable<string> CandidateToolDirectories(bool includeCurrentDirectory = true)
    {
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var candidate in PreferredToolDirectories(includeCurrentDirectory))
        {
            if (seen.Add(candidate) && Directory.Exists(candidate))
            {
                yield return candidate;
            }
        }
    }

    private static IEnumerable<string> PreferredToolDirectories(bool includeCurrentDirectory)
    {
        yield return UserToolDirectory;

        var anchors = includeCurrentDirectory
            ? new[] { AppContext.BaseDirectory, Environment.CurrentDirectory }
            : [AppContext.BaseDirectory];
        foreach (var anchor in anchors)
        {
            var directory = new DirectoryInfo(anchor);
            while (directory is not null)
            {
                yield return directory.FullName;
                yield return Path.Combine(directory.FullName, "tools");
                yield return Path.Combine(directory.FullName, "tools", "windows");
                yield return Path.Combine(directory.FullName, "tools", "windows", "ffmpeg", "bin");
                directory = directory.Parent;
            }
        }
    }

    private static IEnumerable<string> PathDirectories()
    {
        var path = Environment.GetEnvironmentVariable("PATH") ?? string.Empty;
        foreach (var rawDirectory in path.Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries))
        {
            var directory = rawDirectory.Trim();
            if (directory.Length > 0 && Directory.Exists(directory))
            {
                yield return directory;
            }
        }
    }

    private static string NormalizeToolName(string toolName)
    {
        return toolName.Trim();
    }
}
