using System.Diagnostics;
using System.IO;
using System.Text.RegularExpressions;
using System.Text;

namespace Loaderly;

internal sealed class MediaDownloadService
{
    private static readonly TimeSpan DestinationFolderProbeTimeout = TimeSpan.FromSeconds(5);
    private static readonly HashSet<string> MediaExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".mp4",
        ".m4v",
        ".mov",
        ".mp3",
        ".m4a"
    };

    internal static int DestinationFolderProbeTimeoutMillisecondsForTest => (int)DestinationFolderProbeTimeout.TotalMilliseconds;

    public async Task EnsureDependenciesAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        _ = ToolResolver.ResolveToolPath("yt-dlp");
        _ = ToolResolver.ResolveToolPath("ffmpeg");
        _ = ToolResolver.ResolveToolPath("ffprobe");
        await Task.CompletedTask;
    }

    public async Task<DownloadResult> DownloadAsync(
        string sourceUrl,
        string destinationFolder,
        IProgress<string>? progress,
        CancellationToken cancellationToken)
    {
        var results = await DownloadManyAsync(
            sourceUrl,
            destinationFolder,
            new DownloadOptions(DownloadQuality.Best, AllowPlaylist: false, WriteSubtitles: true, SubtitleLanguages: SubtitleLanguagePreference.DefaultLanguages),
            progress is null ? null : new Progress<DownloadProgress>(value => progress.Report(value.Message)),
            cancellationToken);

        return results.First();
    }

    public async Task<IReadOnlyList<DownloadResult>> DownloadManyAsync(
        string sourceUrl,
        string destinationFolder,
        DownloadOptions options,
        IProgress<DownloadProgress>? progress,
        CancellationToken cancellationToken)
    {
        return await DownloadManyAsync(
            sourceUrl,
            destinationFolder,
            options,
            progress,
            cancellationToken,
            allowSubtitleFallback: true);
    }

    private async Task<IReadOnlyList<DownloadResult>> DownloadManyAsync(
        string sourceUrl,
        string destinationFolder,
        DownloadOptions options,
        IProgress<DownloadProgress>? progress,
        CancellationToken cancellationToken,
        bool allowSubtitleFallback)
    {
        await EnsureDestinationFolderReadyAsync(destinationFolder, cancellationToken).ConfigureAwait(false);

        var ytDlpPath = ToolResolver.ResolveToolPath("yt-dlp");
        var ffmpegPath = ToolResolver.ResolveToolPath("ffmpeg");
        var effectiveOptions = await ResolveSubtitleOptionsAsync(
            ytDlpPath,
            sourceUrl,
            options,
            progress,
            cancellationToken).ConfigureAwait(false);

        var startedAt = DateTimeOffset.Now.AddSeconds(-2);
        var lines = new List<string>();
        var error = new StringBuilder();
        var outputClosed = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var errorClosed = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);

        var startInfo = new ProcessStartInfo
        {
            FileName = ytDlpPath,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true
        };
        ToolResolver.AddToolDirectoriesToPath(startInfo);

        foreach (var argument in DownloadArguments(sourceUrl, destinationFolder, ffmpegPath, effectiveOptions))
        {
            startInfo.ArgumentList.Add(argument);
        }

        using var process = new Process
        {
            StartInfo = startInfo,
            EnableRaisingEvents = true
        };

        process.OutputDataReceived += (_, e) =>
        {
            if (e.Data is null)
            {
                outputClosed.TrySetResult();
                return;
            }

            if (string.IsNullOrWhiteSpace(e.Data))
            {
                return;
            }

            lock (lines)
            {
                lines.Add(e.Data);
            }

            progress?.Report(ParseProgress(e.Data));
        };
        process.ErrorDataReceived += (_, e) =>
        {
            if (e.Data is null)
            {
                errorClosed.TrySetResult();
                return;
            }

            if (string.IsNullOrWhiteSpace(e.Data))
            {
                return;
            }

            lock (error)
            {
                error.AppendLine(e.Data);
            }

            progress?.Report(ParseProgress(e.Data));
        };

        process.Start();
        process.BeginOutputReadLine();
        process.BeginErrorReadLine();

        try
        {
            await ProcessRunner.WaitForExitAndStreamsAsync(
                process,
                outputClosed.Task,
                errorClosed.Task,
                cancellationToken).ConfigureAwait(false);
        }
        catch (OperationCanceledException)
        {
            throw;
        }

        if (process.ExitCode != 0)
        {
            var message = error.Length == 0 ? "Download failed." : error.ToString().Trim();
            if (allowSubtitleFallback && effectiveOptions.WriteSubtitles && IsSubtitleDownloadFailure(message))
            {
                progress?.Report(new DownloadProgress(
                    null,
                    "Retrying without subtitles",
                    "Subtitles could not be downloaded; retrying the video without subtitles."));
                return await DownloadManyAsync(
                    sourceUrl,
                    destinationFolder,
                    effectiveOptions with { WriteSubtitles = false, SubtitleLanguages = string.Empty },
                    progress,
                    cancellationToken,
                    allowSubtitleFallback: false).ConfigureAwait(false);
            }

            throw new InvalidOperationException(FriendlyError(message));
        }

        string[] capturedLines;
        lock (lines)
        {
            capturedLines = [.. lines];
        }

        var results = ResultsForOutput(capturedLines).ToList();
        if (results.Count == 0)
        {
            var filePath = NewestMediaFile(destinationFolder, startedAt);
            results.Add(new DownloadResult(filePath, Path.GetFileNameWithoutExtension(filePath)));
        }

        return results;
    }

    internal static Task RunWithTimeoutForTest(
        Func<Task> operation,
        TimeSpan timeout,
        CancellationToken cancellationToken,
        string timeoutMessage)
    {
        return RunWithTimeoutAsync(operation, timeout, cancellationToken, timeoutMessage);
    }

    private static Task EnsureDestinationFolderReadyAsync(string destinationFolder, CancellationToken cancellationToken)
    {
        return RunWithTimeoutAsync(
            () =>
            {
                Directory.CreateDirectory(destinationFolder);
                return Task.CompletedTask;
            },
            DestinationFolderProbeTimeout,
            cancellationToken,
            $"Download folder did not respond: {destinationFolder}");
    }

    private static async Task RunWithTimeoutAsync(
        Func<Task> operation,
        TimeSpan timeout,
        CancellationToken cancellationToken,
        string timeoutMessage)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var operationTask = Task.Run(operation, CancellationToken.None);
        var completed = await Task.WhenAny(operationTask, Task.Delay(timeout, cancellationToken)).ConfigureAwait(false);
        if (completed != operationTask)
        {
            cancellationToken.ThrowIfCancellationRequested();
            throw new TimeoutException(timeoutMessage);
        }

        await operationTask.ConfigureAwait(false);
    }

    private static async Task<DownloadOptions> ResolveSubtitleOptionsAsync(
        string ytDlpPath,
        string sourceUrl,
        DownloadOptions options,
        IProgress<DownloadProgress>? progress,
        CancellationToken cancellationToken)
    {
        if (!options.WriteSubtitles || !SubtitleLanguagePreference.IsOriginalSource(options.SubtitleLanguages))
        {
            return options;
        }

        progress?.Report(new DownloadProgress(null, "Finding subtitles", "Finding the video's original subtitle language."));
        var originalLanguage = await OriginalSubtitleLanguageResolver.ResolveAsync(ytDlpPath, sourceUrl, cancellationToken)
            .ConfigureAwait(false);
        if (string.IsNullOrWhiteSpace(originalLanguage))
        {
            progress?.Report(new DownloadProgress(null, "No original subtitles", "No original video subtitles were found; downloading video only."));
            return options with { WriteSubtitles = false, SubtitleLanguages = string.Empty };
        }

        progress?.Report(new DownloadProgress(null, "Original subtitles", $"Original subtitles: {originalLanguage}"));
        return options with { SubtitleLanguages = SubtitleLanguagePreference.Normalize(originalLanguage) };
    }

    private static IEnumerable<string> DownloadArguments(
        string sourceUrl,
        string destinationFolder,
        string ffmpegPath,
        DownloadOptions options)
    {
        yield return options.AllowPlaylist ? "--yes-playlist" : "--no-playlist";
        if (options.AllowPlaylist)
        {
            yield return "--ignore-errors";
        }

        yield return "--newline";
        yield return "--continue";
        yield return "--restrict-filenames";
        if (options.Quality == DownloadQuality.AudioOnly)
        {
            yield return "--extract-audio";
            yield return "--audio-format";
            yield return "mp3";
            yield return "--audio-quality";
            yield return "0";
        }
        else
        {
            yield return "--merge-output-format";
            yield return "mp4";
            yield return "--recode-video";
            yield return "mp4";
            yield return "-f";
            yield return FormatSelector(options.Quality);
            yield return "-S";
            yield return "vcodec:h264,acodec:aac,ext:mp4:m4a";
        }

        if (options.WriteSubtitles)
        {
            yield return "--write-subs";
            yield return "--write-auto-subs";
            yield return "--sub-langs";
            yield return string.IsNullOrWhiteSpace(options.SubtitleLanguages)
                ? SubtitleLanguagePreference.DefaultLanguages
                : SubtitleLanguagePreference.Normalize(options.SubtitleLanguages);
            yield return "--convert-subs";
            yield return "srt";
        }

        yield return "--ffmpeg-location";
        yield return Path.GetDirectoryName(ffmpegPath) ?? ffmpegPath;
        yield return "--paths";
        yield return destinationFolder;
        yield return "--output";
        yield return "%(title).180B [%(id)s].%(ext)s";
        yield return "--print";
        yield return "after_move:%(filepath)s";
        yield return "--print";
        yield return "after_move:%(title)s";
        yield return sourceUrl;
    }

    private static string FormatSelector(DownloadQuality quality)
    {
        return quality switch
        {
            DownloadQuality.Video1080p => "bv*[height<=1080]+ba/b[height<=1080]/best[height<=1080]",
            DownloadQuality.Video720p => "bv*[height<=720]+ba/b[height<=720]/best[height<=720]",
            _ => "bv*+ba/best"
        };
    }

    private static DownloadProgress ParseProgress(string line)
    {
        var match = Regex.Match(line, @"\[download\]\s+(?<percent>\d+(?:\.\d+)?)%", RegexOptions.IgnoreCase);
        if (match.Success && double.TryParse(match.Groups["percent"].Value, out var percent))
        {
            var speedMatch = Regex.Match(line, @"\bat\s+(?<speed>\S+/s)", RegexOptions.IgnoreCase);
            var etaMatch = Regex.Match(line, @"\bETA\s+(?<eta>\S+)", RegexOptions.IgnoreCase);
            var speed = speedMatch.Success ? speedMatch.Groups["speed"].Value : null;
            var eta = etaMatch.Success ? etaMatch.Groups["eta"].Value : null;
            var detail = speed is null && eta is null
                ? "Downloading"
                : $"Downloading{(speed is null ? string.Empty : $" - {speed}")}{(eta is null ? string.Empty : $" - ETA {eta}")}";
            return new DownloadProgress(percent, detail, line, speed, eta);
        }

        if (line.Contains("Deleting original file", StringComparison.OrdinalIgnoreCase) ||
            line.Contains("Merging formats", StringComparison.OrdinalIgnoreCase) ||
            line.Contains("ExtractAudio", StringComparison.OrdinalIgnoreCase))
        {
            return new DownloadProgress(null, "Processing", line);
        }

        return new DownloadProgress(null, "Working", line);
    }

    internal static bool IsSubtitleDownloadFailure(string message)
    {
        return message.Contains("subtitle", StringComparison.OrdinalIgnoreCase) &&
               (message.Contains("Unable to download", StringComparison.OrdinalIgnoreCase) ||
                message.Contains("HTTP Error 429", StringComparison.OrdinalIgnoreCase) ||
                message.Contains("Too Many Requests", StringComparison.OrdinalIgnoreCase));
    }

    internal static IReadOnlyList<DownloadResult> ResultsForOutputForTest(IReadOnlyList<string> capturedLines)
    {
        return ResultsForOutput(capturedLines);
    }

    private static IReadOnlyList<DownloadResult> ResultsForOutput(IReadOnlyList<string> capturedLines)
    {
        var results = new List<DownloadResult>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        string? pendingPath = null;

        foreach (var rawLine in capturedLines)
        {
            var line = rawLine.Trim();
            if (line.Length == 0)
            {
                continue;
            }

            if (Path.IsPathFullyQualified(line) && File.Exists(line))
            {
                AddPendingResult();
                pendingPath = line;
                continue;
            }

            if (pendingPath is not null && IsLikelyTitle(line, pendingPath))
            {
                AddResult(pendingPath, line);
                pendingPath = null;
            }
        }

        AddPendingResult();
        return results;

        void AddPendingResult()
        {
            if (pendingPath is not null)
            {
                AddResult(pendingPath, Path.GetFileNameWithoutExtension(pendingPath));
                pendingPath = null;
            }
        }

        void AddResult(string filePath, string title)
        {
            if (seen.Add(filePath))
            {
                results.Add(new DownloadResult(filePath, title));
            }
        }
    }

    private static string TitleFor(IEnumerable<string> capturedLines, string filePath)
    {
        var title = capturedLines
            .LastOrDefault(line => IsLikelyTitle(line, filePath))
            ?.Trim();
        return string.IsNullOrWhiteSpace(title)
            ? Path.GetFileNameWithoutExtension(filePath)
            : title;
    }

    private static bool IsLikelyTitle(string line, string filePath)
    {
        var value = line.Trim();
        return value.Length > 0 &&
               !value.StartsWith("[", StringComparison.Ordinal) &&
               !Path.IsPathFullyQualified(value) &&
               !string.Equals(value, filePath, StringComparison.OrdinalIgnoreCase);
    }

    private static string NewestMediaFile(string folder, DateTimeOffset after)
    {
        var candidate = Directory
            .EnumerateFiles(folder)
            .Where(path => MediaExtensions.Contains(Path.GetExtension(path)))
            .Select(path => new FileInfo(path))
            .Where(file => file.LastWriteTimeUtc >= after.UtcDateTime)
            .OrderByDescending(file => file.LastWriteTimeUtc)
            .FirstOrDefault();

        if (candidate is null)
        {
            throw new FileNotFoundException("Download finished but no output media file was found.");
        }

        return candidate.FullName;
    }

    private static string FriendlyError(string raw)
    {
        if (raw.Contains("Unsupported URL", StringComparison.OrdinalIgnoreCase))
        {
            return "This site or link is not supported by the downloader.";
        }

        if (raw.Contains("Private video", StringComparison.OrdinalIgnoreCase) ||
            raw.Contains("Sign in", StringComparison.OrdinalIgnoreCase) ||
            raw.Contains("login", StringComparison.OrdinalIgnoreCase))
        {
            return "This media needs sign-in or is private.";
        }

        if (raw.Contains("ffmpeg", StringComparison.OrdinalIgnoreCase) ||
            raw.Contains("ffprobe", StringComparison.OrdinalIgnoreCase))
        {
            return "FFmpeg/FFprobe is missing or not working. Open Tools and update the bundled tools.";
        }

        if (raw.Contains("Requested format is not available", StringComparison.OrdinalIgnoreCase))
        {
            return "The requested quality is not available for this media. Try Best quality or 720p.";
        }

        var firstLine = raw.Split('\n', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault()?.Trim();
        return string.IsNullOrWhiteSpace(firstLine) ? "Download failed." : firstLine;
    }
}
