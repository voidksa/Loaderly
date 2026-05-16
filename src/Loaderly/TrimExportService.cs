using System.Collections.Specialized;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Text;

namespace Loaderly;

internal enum TrimExportQuality
{
    High,
    Balanced,
    Small
}

internal sealed record SubtitleBurnInOptions(string SubtitleFilePath, SubtitleStyle Style);

internal sealed record TrimExportOptions(
    bool MuteAudio,
    TrimExportQuality Quality,
    SubtitleBurnInOptions? SubtitleBurnIn = null);

internal sealed class TrimExportService
{
    public async Task<string> ExportTrimAsync(
        string sourceFilePath,
        TimeSpan start,
        TimeSpan end,
        string outputFilePath,
        CancellationToken cancellationToken)
    {
        return await ExportTrimAsync(
            sourceFilePath,
            start,
            end,
            outputFilePath,
            new TrimExportOptions(MuteAudio: false, Quality: TrimExportQuality.High),
            cancellationToken);
    }

    public async Task<string> ExportTrimAsync(
        string sourceFilePath,
        TimeSpan start,
        TimeSpan end,
        string outputFilePath,
        TrimExportOptions options,
        CancellationToken cancellationToken)
    {
        if (!File.Exists(sourceFilePath))
        {
            throw new FileNotFoundException("Source video file was not found.", sourceFilePath);
        }

        if (end - start < TimeSpan.FromMilliseconds(250))
        {
            throw new InvalidOperationException("Choose a longer trim range.");
        }

        Directory.CreateDirectory(Path.GetDirectoryName(outputFilePath)!);
        if (File.Exists(outputFilePath))
        {
            File.Delete(outputFilePath);
        }

        var ffmpegPath = ToolResolver.ResolveToolPath("ffmpeg");
        var error = new StringBuilder();
        var startInfo = new ProcessStartInfo
        {
            FileName = ffmpegPath,
            UseShellExecute = false,
            RedirectStandardOutput = false,
            RedirectStandardError = true,
            CreateNoWindow = true
        };
        ToolResolver.AddToolDirectoriesToPath(startInfo);

        string? assSubtitlePath = null;
        if (options.SubtitleBurnIn is { } subtitleBurnIn)
        {
            assSubtitlePath = SubtitleBurnInService.CreateAssFile(
                subtitleBurnIn.SubtitleFilePath,
                start,
                end,
                subtitleBurnIn.Style);
        }

        foreach (var argument in ExportArguments(sourceFilePath, start, end, outputFilePath, options, assSubtitlePath))
        {
            startInfo.ArgumentList.Add(argument);
        }

        try
        {
            using var process = new Process { StartInfo = startInfo };
            var outputClosed = Task.CompletedTask;
            var errorClosed = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            process.ErrorDataReceived += (_, e) =>
            {
                if (e.Data is null)
                {
                    errorClosed.TrySetResult();
                    return;
                }

                if (!string.IsNullOrWhiteSpace(e.Data))
                {
                    lock (error)
                    {
                        error.AppendLine(e.Data);
                    }
                }
            };

            process.Start();
            process.BeginErrorReadLine();

            try
            {
                await ProcessRunner.WaitForExitAndStreamsAsync(
                    process,
                    outputClosed,
                    errorClosed.Task,
                    cancellationToken).ConfigureAwait(false);
            }
            catch (OperationCanceledException)
            {
                throw;
            }

            if (process.ExitCode != 0)
            {
                string message;
                lock (error)
                {
                    message = error.Length == 0 ? "Trim export failed." : error.ToString().Trim();
                }

                throw new InvalidOperationException(message);
            }
        }
        finally
        {
            DeleteTemporaryFile(assSubtitlePath);
        }

        return outputFilePath;
    }

    public string SavePathFor(string sourceFilePath, TimeSpan start, TimeSpan end)
    {
        var folder = Path.GetDirectoryName(sourceFilePath) ?? Environment.CurrentDirectory;
        var name = Path.GetFileNameWithoutExtension(sourceFilePath);
        return Path.Combine(folder, $"{name} trim {Math.Round(start.TotalSeconds)}-{Math.Round(end.TotalSeconds)}s.mp4");
    }

    public string TemporaryPathForCopy()
    {
        var directory = Path.Combine(AppDataFolder.Path, "TrimExports");
        Directory.CreateDirectory(directory);
        return Path.Combine(directory, $"{Guid.NewGuid():N}.mp4");
    }

    public void CopyFileToClipboard(string filePath)
    {
        var collection = new StringCollection();
        collection.Add(filePath);
        Clipboard.SetFileDropList(collection);
    }

    internal static IReadOnlyList<string> ExportArgumentsForTest(
        string sourceFilePath,
        TimeSpan start,
        TimeSpan end,
        string outputFilePath,
        TrimExportOptions options,
        string? assSubtitlePath)
    {
        return ExportArguments(sourceFilePath, start, end, outputFilePath, options, assSubtitlePath).ToList();
    }

    private static IEnumerable<string> ExportArguments(
        string sourceFilePath,
        TimeSpan start,
        TimeSpan end,
        string outputFilePath,
        TrimExportOptions options,
        string? assSubtitlePath)
    {
        yield return "-y";
        yield return "-ss";
        yield return FormatTime(start);
        yield return "-t";
        yield return FormatTime(end - start);
        yield return "-i";
        yield return sourceFilePath;
        yield return "-map";
        yield return "0:v:0";
        if (options.MuteAudio)
        {
            yield return "-an";
        }
        else
        {
            yield return "-map";
            yield return "0:a?";
        }

        if (!string.IsNullOrWhiteSpace(assSubtitlePath))
        {
            yield return "-vf";
            yield return $"ass='{EscapeFilterPath(assSubtitlePath)}'";
        }

        yield return "-c:v";
        yield return "libx264";
        yield return "-preset";
        yield return "veryfast";
        yield return "-crf";
        yield return CrfFor(options.Quality);
        yield return "-pix_fmt";
        yield return "yuv420p";
        if (!options.MuteAudio)
        {
            yield return "-c:a";
            yield return "aac";
            yield return "-b:a";
            yield return "192k";
        }

        yield return "-movflags";
        yield return "+faststart";
        yield return outputFilePath;
    }

    private static string CrfFor(TrimExportQuality quality)
    {
        return quality switch
        {
            TrimExportQuality.Small => "28",
            TrimExportQuality.Balanced => "22",
            _ => "18"
        };
    }

    private static string FormatTime(TimeSpan time)
    {
        return time.TotalSeconds.ToString("0.000", CultureInfo.InvariantCulture);
    }

    private static string EscapeFilterPath(string path)
    {
        return Path.GetFullPath(path)
            .Replace('\\', '/')
            .Replace(":", "\\:", StringComparison.Ordinal)
            .Replace("'", "\\'", StringComparison.Ordinal);
    }

    private static void DeleteTemporaryFile(string? path)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            return;
        }

        try
        {
            if (File.Exists(path))
            {
                File.Delete(path);
            }
        }
        catch
        {
        }
    }

}
