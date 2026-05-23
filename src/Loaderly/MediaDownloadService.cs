using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Text.RegularExpressions;
using System.Text;

namespace Loaderly;

internal sealed class MediaDownloadService
{
    private static readonly TimeSpan DestinationFolderProbeTimeout = TimeSpan.FromSeconds(5);
    private static readonly string[] RequiredBundledTools = ["yt-dlp", "ffmpeg", "ffprobe"];
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
        await Task.WhenAll(
            ToolLookup.ResolveAsync("yt-dlp", cancellationToken),
            ToolLookup.ResolveAsync("ffmpeg", cancellationToken),
            ToolLookup.ResolveAsync("ffprobe", cancellationToken)).ConfigureAwait(false);
    }

    public Task EnsureBundledDependenciesAsync(CancellationToken cancellationToken)
    {
        return ToolLookup.RunForTest(() =>
        {
            foreach (var tool in RequiredBundledTools)
            {
                cancellationToken.ThrowIfCancellationRequested();
                if (ToolResolver.TryResolveBundledToolPath(tool) is null)
                {
                    throw new InvalidOperationException(
                        $"{tool} was not found in Loaderly tools. Open Tools and run Install / repair all tools.");
                }
            }

            return string.Empty;
        }, cancellationToken);
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
        var denoPath = ToolResolver.TryResolveBundledToolPath("deno");
        var effectiveOptions = await ResolveSubtitleOptionsAsync(
            ytDlpPath,
            denoPath,
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

        foreach (var argument in DownloadArguments(sourceUrl, destinationFolder, ffmpegPath, denoPath, effectiveOptions))
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
        string? denoPath,
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
        var originalLanguage = await OriginalSubtitleLanguageResolver.ResolveAsync(ytDlpPath, denoPath, sourceUrl, cancellationToken)
            .ConfigureAwait(false);
        if (string.IsNullOrWhiteSpace(originalLanguage))
        {
            progress?.Report(new DownloadProgress(null, "No original subtitles", "No original video subtitles were found; downloading video only."));
            return options with { WriteSubtitles = false, SubtitleLanguages = string.Empty };
        }

        progress?.Report(new DownloadProgress(null, "Original subtitles", $"Original subtitles: {originalLanguage}"));
        return options with { SubtitleLanguages = SubtitleLanguagePreference.Normalize(originalLanguage) };
    }

    internal static List<string> DownloadArgumentsForTest(
        string sourceUrl,
        string destinationFolder,
        string ffmpegPath,
        string? denoPath,
        DownloadOptions options)
    {
        return DownloadArguments(sourceUrl, destinationFolder, ffmpegPath, denoPath, options).ToList();
    }

    internal static DownloadProgress ParseProgressForTest(string line)
    {
        return ParseProgress(line);
    }

    internal static string NewestMediaFileForTest(string folder, DateTimeOffset after)
    {
        return NewestMediaFile(folder, after);
    }

    internal static string FriendlyErrorForTest(string raw)
    {
        return FriendlyError(raw);
    }

    private static IEnumerable<string> DownloadArguments(
        string sourceUrl,
        string destinationFolder,
        string ffmpegPath,
        string? denoPath,
        DownloadOptions options)
    {
        yield return options.AllowPlaylist ? "--yes-playlist" : "--no-playlist";
        if (options.AllowPlaylist)
        {
            yield return "--ignore-errors";
        }

        yield return "--newline";
        yield return "--progress";
        yield return "--continue";
        if (!string.IsNullOrWhiteSpace(denoPath))
        {
            yield return "--js-runtimes";
            yield return $"deno:{denoPath}";
        }

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
            yield return "--remux-video";
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
            DownloadQuality.Video1080p => "bv*[height<=1080][ext=mp4][vcodec^=avc1]+ba[ext=m4a]/b[height<=1080][ext=mp4][vcodec^=avc1]/best[height<=1080][ext=mp4]/best[height<=1080]",
            DownloadQuality.Video720p => "bv*[height<=720][ext=mp4][vcodec^=avc1]+ba[ext=m4a]/b[height<=720][ext=mp4][vcodec^=avc1]/best[height<=720][ext=mp4]/best[height<=720]",
            _ => "bv*[ext=mp4][vcodec^=avc1]+ba[ext=m4a]/b[ext=mp4][vcodec^=avc1]/best[ext=mp4]/best"
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
            var totalBytes = TotalBytesFromProgressLine(line);
            var downloadedBytes = totalBytes is null
                ? null
                : (long?)Math.Clamp((long)Math.Round(totalBytes.Value * (percent / 100D)), 0, totalBytes.Value);
            return new DownloadProgress(percent, "Downloading", line, speed, eta, downloadedBytes, totalBytes);
        }

        if (line.Contains("Deleting original file", StringComparison.OrdinalIgnoreCase) ||
            line.Contains("Merging formats", StringComparison.OrdinalIgnoreCase) ||
            line.Contains("ExtractAudio", StringComparison.OrdinalIgnoreCase))
        {
            return new DownloadProgress(null, "Processing", line);
        }

        return new DownloadProgress(null, "Working", line);
    }

    private static long? TotalBytesFromProgressLine(string line)
    {
        var match = Regex.Match(
            line,
            @"\bof\s+~?\s*(?<value>\d+(?:\.\d+)?)\s*(?<unit>[KMGTPE]?i?B|[KMGTPE]?B)\b",
            RegexOptions.IgnoreCase);
        if (!match.Success ||
            !double.TryParse(match.Groups["value"].Value, NumberStyles.Float, CultureInfo.InvariantCulture, out var value))
        {
            return null;
        }

        var multiplier = match.Groups["unit"].Value.ToUpperInvariant() switch
        {
            "B" => 1D,
            "KB" => 1_000D,
            "MB" => 1_000_000D,
            "GB" => 1_000_000_000D,
            "TB" => 1_000_000_000_000D,
            "KIB" => 1024D,
            "MIB" => 1024D * 1024D,
            "GIB" => 1024D * 1024D * 1024D,
            "TIB" => 1024D * 1024D * 1024D * 1024D,
            _ => 0D
        };
        return multiplier <= 0D ? null : (long)Math.Round(value * multiplier);
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
                AddResult(pendingPath, CleanTitleFromFilePath(pendingPath));
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
            ? CleanTitleFromFilePath(filePath)
            : title;
    }

    private static bool IsLikelyTitle(string line, string filePath)
    {
        var value = line.Trim();
        return value.Length > 0 &&
               !IsDownloaderLogLine(value) &&
               !IsDownloaderDiagnosticLine(value) &&
               !Path.IsPathFullyQualified(value) &&
               !string.Equals(value, filePath, StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsDownloaderLogLine(string value)
    {
        var end = value.IndexOf(']');
        if (!value.StartsWith("[", StringComparison.Ordinal) || end <= 1)
        {
            return false;
        }

        var tag = value[1..end].Trim();
        return tag.Equals("download", StringComparison.OrdinalIgnoreCase) ||
               tag.Equals("Merger", StringComparison.OrdinalIgnoreCase) ||
               tag.Equals("ExtractAudio", StringComparison.OrdinalIgnoreCase) ||
               tag.Equals("MoveFiles", StringComparison.OrdinalIgnoreCase) ||
               tag.Equals("Metadata", StringComparison.OrdinalIgnoreCase) ||
               tag.Equals("info", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsDownloaderDiagnosticLine(string value)
    {
        return value.StartsWith("WARNING:", StringComparison.OrdinalIgnoreCase) ||
               value.StartsWith("ERROR:", StringComparison.OrdinalIgnoreCase) ||
               value.StartsWith("Deleting original file", StringComparison.OrdinalIgnoreCase) ||
               value.StartsWith("Merging formats", StringComparison.OrdinalIgnoreCase) ||
               value.StartsWith("Destination:", StringComparison.OrdinalIgnoreCase);
    }

    private static string CleanTitleFromFilePath(string filePath)
    {
        var title = Path.GetFileNameWithoutExtension(filePath);
        title = Regex.Replace(title, @"\s+\[[^\[\]]{4,64}\]$", string.Empty);
        return string.IsNullOrWhiteSpace(title) ? Path.GetFileName(filePath) : title.Trim();
    }

    private static string NewestMediaFile(string folder, DateTimeOffset after)
    {
        var candidate = Directory
            .EnumerateFiles(folder)
            .Where(path => !IsTemporaryMediaPath(path))
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

    private static bool IsTemporaryMediaPath(string path)
    {
        var fileName = Path.GetFileName(path);
        return fileName.Contains(".temp.", StringComparison.OrdinalIgnoreCase) ||
               fileName.EndsWith(".part", StringComparison.OrdinalIgnoreCase) ||
               fileName.EndsWith(".ytdl", StringComparison.OrdinalIgnoreCase);
    }

    private static string FriendlyError(string raw)
    {
        if (raw.Contains("Unsupported URL", StringComparison.OrdinalIgnoreCase) &&
            raw.Contains("tiktok.com", StringComparison.OrdinalIgnoreCase) &&
            raw.Contains("/photo/", StringComparison.OrdinalIgnoreCase))
        {
            return LoaderlyLanguage.Text("TikTok photo posts are image carousels. Loaderly can download TikTok videos, but image sets are not available yet.");
        }

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
