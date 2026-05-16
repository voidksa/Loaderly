using System.Diagnostics;
using System.IO;

namespace Loaderly;

internal static class ToolResolver
{
    public static string ResolveToolPath(string toolName)
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
        var toolDirectories = CandidateToolDirectories().ToArray();
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
        if (toolName.EndsWith(".exe", StringComparison.OrdinalIgnoreCase))
        {
            yield return toolName;
            yield break;
        }

        yield return $"{toolName}.exe";
        yield return toolName;
    }

    private static IEnumerable<string> CandidateToolDirectories()
    {
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var anchor in new[] { AppContext.BaseDirectory, Environment.CurrentDirectory })
        {
            var directory = new DirectoryInfo(anchor);
            while (directory is not null)
            {
                foreach (var candidate in new[]
                         {
                             directory.FullName,
                             Path.Combine(directory.FullName, "tools"),
                             Path.Combine(directory.FullName, "tools", "windows"),
                             Path.Combine(directory.FullName, "tools", "windows", "ffmpeg", "bin")
                         })
                {
                    if (seen.Add(candidate) && Directory.Exists(candidate))
                    {
                        yield return candidate;
                    }
                }

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
}
