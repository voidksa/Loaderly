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
    SubtitleBurnInOptions? SubtitleBurnIn = null,
    IReadOnlyList<TrimBlurRegion>? BlurRegions = null,
    IReadOnlyList<TrimZoomRegion>? ZoomRegions = null);

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

    public async Task<string> ExportCompositionAsync(
        string sourceFilePath,
        TrimComposition composition,
        string outputFilePath,
        TrimExportOptions options,
        CancellationToken cancellationToken)
    {
        if (!File.Exists(sourceFilePath))
        {
            throw new FileNotFoundException("Source video file was not found.", sourceFilePath);
        }

        composition = TrimComposition.Normalize(composition.Segments, composition.Transitions);
        if (composition.Segments.Count == 0)
        {
            throw new InvalidOperationException("Choose at least one trim range.");
        }

        if (composition.Segments.Count == 1 &&
            TrimBlurRegion.NormalizeMany(options.BlurRegions).Count == 0 &&
            TrimZoomRegion.NormalizeMany(options.ZoomRegions).Count == 0)
        {
            var segment = composition.Segments[0];
            return await ExportTrimAsync(
                sourceFilePath,
                segment.Start,
                segment.End,
                outputFilePath,
                options,
                cancellationToken).ConfigureAwait(false);
        }

        Directory.CreateDirectory(Path.GetDirectoryName(outputFilePath)!);
        if (File.Exists(outputFilePath))
        {
            File.Delete(outputFilePath);
        }

        var ffmpegPath = ToolResolver.ResolveToolPath("ffmpeg");
        var error = new StringBuilder();
        var sourceHasAudio = !options.MuteAudio && await SourceHasAudioStreamAsync(sourceFilePath, cancellationToken)
            .ConfigureAwait(false);
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
            var retimedCues = TrimComposition.RetimeSubtitleCues(
                SrtSubtitleService.LoadFile(subtitleBurnIn.SubtitleFilePath),
                composition);
            assSubtitlePath = SubtitleBurnInService.CreateAssFile(
                retimedCues,
                composition.Duration,
                subtitleBurnIn.Style);
        }

        foreach (var argument in CompositionExportArguments(
                     sourceFilePath,
                     composition,
                     outputFilePath,
                     options,
                     assSubtitlePath,
                     sourceHasAudio))
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
        var name = DefaultFileNameFor(sourceFilePath, TrimComposition.Normalize([new TrimSegment(start, end)]));
        return UniqueOutputPath(folder, name);
    }

    public string SavePathFor(string sourceFilePath, TrimComposition composition)
    {
        var folder = Path.GetDirectoryName(sourceFilePath) ?? Environment.CurrentDirectory;
        var name = DefaultFileNameFor(sourceFilePath, composition);
        return UniqueOutputPath(folder, name);
    }

    public string SavePathFor(string sourceFilePath, TrimComposition composition, string? requestedName)
    {
        var folder = Path.GetDirectoryName(sourceFilePath) ?? Environment.CurrentDirectory;
        var fallback = DefaultFileNameFor(sourceFilePath, composition);
        return UniqueOutputPath(folder, NormalizeOutputFileName(requestedName, fallback));
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

    internal static string DefaultFileNameFor(string sourceFilePath, TrimComposition composition)
    {
        var sourceName = Path.GetFileNameWithoutExtension(sourceFilePath);
        sourceName = string.IsNullOrWhiteSpace(sourceName) ? "clip" : sourceName;
        composition = TrimComposition.Normalize(composition.Segments, composition.Transitions);
        if (composition.Segments.Count == 1)
        {
            var segment = composition.Segments[0];
            return NormalizeOutputFileName(
                $"{sourceName} trim {Math.Round(segment.Start.TotalSeconds)}-{Math.Round(segment.End.TotalSeconds)}s",
                "clip");
        }

        return NormalizeOutputFileName($"{sourceName} trim {Math.Max(1, composition.Segments.Count)} parts", "clip");
    }

    private static string UniqueOutputPath(string folder, string fileName)
    {
        Directory.CreateDirectory(folder);
        var safeName = NormalizeOutputFileName(fileName, "clip");
        var candidate = Path.Combine(folder, $"{safeName}.mp4");
        if (!File.Exists(candidate))
        {
            return candidate;
        }

        for (var index = 2; index < 1000; index++)
        {
            candidate = Path.Combine(folder, $"{safeName} ({index}).mp4");
            if (!File.Exists(candidate))
            {
                return candidate;
            }
        }

        return Path.Combine(folder, $"{safeName} {Guid.NewGuid():N}.mp4");
    }

    private static string NormalizeOutputFileName(string? requestedName, string fallback)
    {
        var value = string.IsNullOrWhiteSpace(requestedName) ? fallback : requestedName.Trim();
        if (value.EndsWith(".mp4", StringComparison.OrdinalIgnoreCase))
        {
            value = Path.GetFileNameWithoutExtension(value);
        }

        var invalid = Path.GetInvalidFileNameChars();
        var builder = new StringBuilder(value.Length);
        foreach (var character in value)
        {
            builder.Append(invalid.Contains(character) ? '_' : character);
        }

        var safe = builder.ToString().Trim().TrimEnd('.');
        return string.IsNullOrWhiteSpace(safe) ? NormalizeOutputFileName(fallback, "clip") : safe;
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

    internal static string DefaultFileNameForTest(string sourceFilePath, TrimComposition composition)
    {
        return DefaultFileNameFor(sourceFilePath, composition);
    }

    internal static string SavePathForNameForTest(string sourceFilePath, string? requestedName, TrimComposition composition)
    {
        var folder = Path.GetDirectoryName(sourceFilePath) ?? Environment.CurrentDirectory;
        var fallback = DefaultFileNameFor(sourceFilePath, composition);
        return Path.Combine(folder, $"{NormalizeOutputFileName(requestedName, fallback)}.mp4");
    }

    internal static IReadOnlyList<string> CompositionExportArgumentsForTest(
        string sourceFilePath,
        TrimComposition composition,
        string outputFilePath,
        TrimExportOptions options,
        string? assSubtitlePath,
        bool sourceHasAudio)
    {
        return CompositionExportArguments(sourceFilePath, composition, outputFilePath, options, assSubtitlePath, sourceHasAudio).ToList();
    }

    internal static string ZoomActiveFilterForTest(TrimZoomRegion region)
    {
        var normalized = region.Normalize();
        var left = normalized.Keyframes[0];
        var right = normalized.Keyframes.Count > 1
            ? normalized.Keyframes[1]
            : left with { Time = normalized.End };
        var filter = ZoomActiveFilter("in", "out", normalized, left, right, 0);
        var start = filter.IndexOf("crop=w=", StringComparison.Ordinal);
        var end = filter.IndexOf(":h=", start, StringComparison.Ordinal);
        return start >= 0 && end > start ? filter[start..end] : filter;
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

    private static IEnumerable<string> CompositionExportArguments(
        string sourceFilePath,
        TrimComposition composition,
        string outputFilePath,
        TrimExportOptions options,
        string? assSubtitlePath,
        bool sourceHasAudio)
    {
        composition = TrimComposition.Normalize(composition.Segments, composition.Transitions);
        var includeAudio = !options.MuteAudio && sourceHasAudio;

        yield return "-y";
        yield return "-i";
        yield return sourceFilePath;
        yield return "-filter_complex";
        yield return BuildCompositionFilter(composition, assSubtitlePath, includeAudio, options.BlurRegions, options.ZoomRegions);
        yield return "-map";
        yield return "[v]";
        if (includeAudio)
        {
            yield return "-map";
            yield return "[a]";
        }

        yield return "-c:v";
        yield return "libx264";
        yield return "-preset";
        yield return "veryfast";
        yield return "-crf";
        yield return CrfFor(options.Quality);
        yield return "-pix_fmt";
        yield return "yuv420p";
        if (includeAudio)
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

    private static string BuildCompositionFilter(
        TrimComposition composition,
        string? assSubtitlePath,
        bool includeAudio,
        IReadOnlyList<TrimBlurRegion>? blurRegions,
        IReadOnlyList<TrimZoomRegion>? zoomRegions)
    {
        var filters = new List<string>();
        var pieces = new List<(string Video, string? Audio)>();
        for (var index = 0; index < composition.Segments.Count; index++)
        {
            var segment = composition.Segments[index];
            var previousTransition = index > 0
                ? TrimComposition.EffectiveTransitionDuration(
                    composition.Segments[index - 1],
                    segment,
                    composition.Transitions[index - 1])
                : TimeSpan.Zero;
            var nextTransition = index < composition.Segments.Count - 1
                ? TrimComposition.EffectiveTransitionDuration(
                    segment,
                    composition.Segments[index + 1],
                    composition.Transitions[index])
                : TimeSpan.Zero;
            var normalStart = segment.Start + previousTransition;
            var normalEnd = segment.End - nextTransition;
            if (normalEnd - normalStart >= TimeSpan.FromMilliseconds(50))
            {
                var videoLabel = $"p{pieces.Count}v";
                var audioLabel = includeAudio ? $"p{pieces.Count}a" : null;
                filters.Add(VideoTrimFilter(normalStart, normalEnd, videoLabel));
                if (includeAudio)
                {
                    filters.Add(AudioTrimFilter(normalStart, normalEnd, audioLabel!));
                }

                pieces.Add((videoLabel, audioLabel));
            }

            if (index >= composition.Segments.Count - 1 || nextTransition <= TimeSpan.Zero)
            {
                continue;
            }

            var next = composition.Segments[index + 1];
            var transitionKind = composition.Transitions[index];
            var transitionVideoLabel = $"p{pieces.Count}v";
            var transitionAudioLabel = includeAudio ? $"p{pieces.Count}a" : null;
            filters.Add(TransitionVideoFilter(
                segment.End - nextTransition,
                segment.End,
                next.Start,
                next.Start + nextTransition,
                nextTransition,
                transitionKind,
                index,
                transitionVideoLabel));
            if (includeAudio)
            {
                filters.Add(TransitionAudioFilter(
                    segment.End - nextTransition,
                    segment.End,
                    next.Start,
                    next.Start + nextTransition,
                    nextTransition,
                    index,
                    transitionAudioLabel!));
            }

            pieces.Add((transitionVideoLabel, transitionAudioLabel));
        }

        if (pieces.Count == 0)
        {
            throw new InvalidOperationException("Choose a longer trim range.");
        }

        var concatInputs = new StringBuilder();
        foreach (var piece in pieces)
        {
            concatInputs.Append('[').Append(piece.Video).Append(']');
            if (includeAudio && piece.Audio is not null)
            {
                concatInputs.Append('[').Append(piece.Audio).Append(']');
            }
        }

        var hasBlur = TrimBlurRegion.NormalizeMany(blurRegions).Count > 0;
        var hasZoom = TrimZoomRegion.NormalizeMany(zoomRegions).Count > 0;
        var concatVideoLabel = string.IsNullOrWhiteSpace(assSubtitlePath) && !hasBlur && !hasZoom ? "v" : "cv";
        concatInputs
            .Append("concat=n=")
            .Append(pieces.Count.ToString(CultureInfo.InvariantCulture))
            .Append(":v=1:a=")
            .Append(includeAudio ? "1" : "0")
            .Append('[')
            .Append(concatVideoLabel)
            .Append(']');
        if (includeAudio)
        {
            concatInputs.Append("[a]");
        }

        filters.Add(concatInputs.ToString());
        var currentVideoLabel = concatVideoLabel;
        if (hasBlur)
        {
            currentVideoLabel = AddBlurFilters(filters, currentVideoLabel, composition, blurRegions);
        }

        if (hasZoom)
        {
            currentVideoLabel = AddZoomFilters(filters, currentVideoLabel, composition, zoomRegions);
        }

        if (!string.IsNullOrWhiteSpace(assSubtitlePath))
        {
            filters.Add($"[{currentVideoLabel}]ass='{EscapeFilterPath(assSubtitlePath)}'[v]");
        }
        else if (!currentVideoLabel.Equals("v", StringComparison.Ordinal))
        {
            filters.Add($"[{currentVideoLabel}]null[v]");
        }

        return string.Join(';', filters);
    }

    private static string AddBlurFilters(
        ICollection<string> filters,
        string inputLabel,
        TrimComposition composition,
        IReadOnlyList<TrimBlurRegion>? blurRegions)
    {
        var currentLabel = inputLabel;
        var retimedRegions = TrimBlurRegion.RetimeForComposition(blurRegions, composition);
        var index = 0;
        foreach (var region in retimedRegions)
        {
            var normalized = region.Normalize();
            var keyframes = normalized.Keyframes;
            for (var keyframeIndex = 0; keyframeIndex < keyframes.Count - 1; keyframeIndex++)
            {
                var left = keyframes[keyframeIndex];
                var right = keyframes[keyframeIndex + 1];
                if (right.Time <= left.Time)
                {
                    continue;
                }

                var outputLabel = $"blur{index}out";
                filters.Add(BlurIntervalFilter(currentLabel, outputLabel, normalized, left, right, index));
                currentLabel = outputLabel;
                index++;
            }
        }

        return currentLabel;
    }

    private static string AddZoomFilters(
        ICollection<string> filters,
        string inputLabel,
        TrimComposition composition,
        IReadOnlyList<TrimZoomRegion>? zoomRegions)
    {
        var currentLabel = inputLabel;
        var retimedRegions = TrimZoomRegion.RetimeForComposition(zoomRegions, composition);
        var index = 0;
        foreach (var region in retimedRegions)
        {
            var normalized = region.Normalize();
            var keyframes = normalized.Keyframes;
            for (var keyframeIndex = 0; keyframeIndex < keyframes.Count - 1; keyframeIndex++)
            {
                var left = keyframes[keyframeIndex];
                var right = keyframes[keyframeIndex + 1];
                if (right.Time <= left.Time)
                {
                    continue;
                }

                var outputLabel = $"zoom{index}out";
                filters.Add(ZoomIntervalFilter(currentLabel, outputLabel, composition.Duration, normalized, left, right, index));
                currentLabel = outputLabel;
                index++;
            }
        }

        return currentLabel;
    }

    private static string ZoomIntervalFilter(
        string inputLabel,
        string outputLabel,
        TimeSpan duration,
        TrimZoomRegion region,
        TrimBlurKeyframe left,
        TrimBlurKeyframe right,
        int index)
    {
        var pieces = new List<string>();
        var filters = new List<string>();
        var splitOutputs = new List<string>();
        var hasBefore = left.Time > TimeSpan.FromMilliseconds(1);
        var hasAfter = right.Time < duration - TimeSpan.FromMilliseconds(1);
        var splitCount = 1 + (hasBefore ? 1 : 0) + (hasAfter ? 1 : 0);
        for (var splitIndex = 0; splitIndex < splitCount; splitIndex++)
        {
            splitOutputs.Add($"zoom{index}s{splitIndex}");
        }

        if (splitCount > 1)
        {
            filters.Add($"[{inputLabel}]split={splitCount}{string.Concat(splitOutputs.Select(label => $"[{label}]"))}");
        }
        else
        {
            splitOutputs.Add(inputLabel);
        }

        var sourceIndex = 0;
        if (hasBefore)
        {
            var beforeLabel = $"zoom{index}pre";
            filters.Add($"[{splitOutputs[sourceIndex++]}]trim=end={FormatTime(left.Time)},setpts=PTS-STARTPTS[{beforeLabel}]");
            pieces.Add(beforeLabel);
        }

        var activeSource = splitCount > 1 ? splitOutputs[sourceIndex++] : inputLabel;
        var activeLabel = $"zoom{index}active";
        filters.Add(ZoomActiveFilter(activeSource, activeLabel, region, left, right, index));
        pieces.Add(activeLabel);

        if (hasAfter)
        {
            var afterLabel = $"zoom{index}post";
            filters.Add($"[{splitOutputs[sourceIndex]}]trim=start={FormatTime(right.Time)},setpts=PTS-STARTPTS[{afterLabel}]");
            pieces.Add(afterLabel);
        }

        if (pieces.Count == 1)
        {
            filters.Add($"[{pieces[0]}]null[{outputLabel}]");
        }
        else
        {
            filters.Add($"{string.Concat(pieces.Select(piece => $"[{piece}]"))}concat=n={pieces.Count}:v=1:a=0[{outputLabel}]");
        }

        return string.Join(';', filters);
    }

    private static string ZoomActiveFilter(
        string inputLabel,
        string outputLabel,
        TrimZoomRegion region,
        TrimBlurKeyframe left,
        TrimBlurKeyframe right,
        int index)
    {
        var centerX = FrameExpression(left.X + left.Width / 2, right.X + right.Width / 2, left.Time, right.Time);
        var centerY = FrameExpression(left.Y + left.Height / 2, right.Y + right.Height / 2, left.Time, right.Time);
        var cropSide = (1.0 / Math.Clamp(region.Scale, 1.1, 4.0)).ToString("0.######", CultureInfo.InvariantCulture);
        var sourceLabel = $"zoom{index}src";
        var refLabel = $"zoom{index}ref";
        var cropLabel = $"zoom{index}crop";
        var scaledLabel = $"zoom{index}scaled";
        var sinkLabel = $"zoom{index}sink";
        return string.Concat(
            "[",
            inputLabel,
            "]trim=start=",
            FormatTime(left.Time),
            ":end=",
            FormatTime(right.Time),
            ",split[",
            sourceLabel,
            "][",
            refLabel,
            "];[",
            sourceLabel,
            "]format=rgba,crop=w='max(2,iw*(",
            cropSide,
            "))':h='max(2,ih*(",
            cropSide,
            "))':x='min(max(0,iw*(",
            centerX,
            ")-(iw*(",
            cropSide,
            "))/2),iw-(iw*(",
            cropSide,
            ")))':y='min(max(0,ih*(",
            centerY,
            ")-(ih*(",
            cropSide,
            "))/2),ih-(ih*(",
            cropSide,
            ")))'[",
            cropLabel,
            "];[",
            cropLabel,
            "][",
            refLabel,
            "]scale2ref=w=rw:h=rh[",
            scaledLabel,
            "][",
            sinkLabel,
            "];[",
            sinkLabel,
            "]nullsink;[",
            scaledLabel,
            "]format=yuv420p,setsar=1,setpts=PTS-STARTPTS[",
            outputLabel,
            "]");
    }

    private static string BlurIntervalFilter(
        string inputLabel,
        string outputLabel,
        TrimBlurRegion region,
        TrimBlurKeyframe left,
        TrimBlurKeyframe right,
        int index)
    {
        var baseLabel = $"blur{index}base";
        var cropLabel = $"blur{index}crop";
        var effectLabel = $"blur{index}fx";
        var xExpr = FrameExpression(left.X, right.X, left.Time, right.Time);
        var yExpr = FrameExpression(left.Y, right.Y, left.Time, right.Time);
        var widthRatio = ClampRatio(Math.Max(left.Width, right.Width)).ToString("0.######", CultureInfo.InvariantCulture);
        var heightRatio = ClampRatio(Math.Max(left.Height, right.Height)).ToString("0.######", CultureInfo.InvariantCulture);
        var enable = $"between(t,{FormatTime(left.Time)},{FormatTime(right.Time)})";
        var crop =
            $"[{inputLabel}]split[{baseLabel}][{cropLabel}];" +
            $"[{cropLabel}]crop=w='max(2,iw*{widthRatio})':h='max(2,ih*{heightRatio})':" +
            $"x='min(max(0,iw*({xExpr})),iw-iw*{widthRatio})':" +
            $"y='min(max(0,ih*({yExpr})),ih-ih*{heightRatio})'," +
            BlurEffectFilter(region.Shape, region.Strength) +
            $"[{effectLabel}];" +
            $"[{baseLabel}][{effectLabel}]overlay=" +
            $"x='min(max(0,main_w*({xExpr})),main_w-overlay_w)':" +
            $"y='min(max(0,main_h*({yExpr})),main_h-overlay_h)':enable='{enable}'[{outputLabel}]";
        return crop;
    }

    private static string BlurEffectFilter(TrimBlurShape shape, int strength)
    {
        var normalizedStrength = Math.Clamp(strength, 1, 40);
        return shape switch
        {
            TrimBlurShape.Pixelate => $"pixelize=w={Math.Clamp(normalizedStrength, 4, 32)}:h={Math.Clamp(normalizedStrength, 4, 32)}:m=avg",
            TrimBlurShape.Soft => $"gblur=sigma={Math.Clamp(normalizedStrength / 2.0, 1, 20).ToString("0.###", CultureInfo.InvariantCulture)}",
            _ => $"boxblur=luma_radius={Math.Clamp((int)Math.Round(normalizedStrength / 4.0), 2, 10)}:luma_power=2"
        };
    }

    private static string FrameExpression(double left, double right, TimeSpan start, TimeSpan end)
    {
        left = ClampRatio(left);
        right = ClampRatio(right);
        if (Math.Abs(left - right) < 0.0001 || end <= start)
        {
            return left.ToString("0.######", CultureInfo.InvariantCulture);
        }

        var duration = Math.Max(0.001, (end - start).TotalSeconds);
        var delta = right - left;
        return string.Create(CultureInfo.InvariantCulture, $"({left:0.######}+({delta:0.######})*(t-{FormatTime(start)})/{duration:0.######})");
    }

    private static double ClampRatio(double value)
    {
        if (double.IsNaN(value) || double.IsInfinity(value))
        {
            return 0;
        }

        return Math.Clamp(value, 0, 1);
    }

    private static string VideoTrimFilter(TimeSpan start, TimeSpan end, string outputLabel)
    {
        return $"[0:v:0]trim=start={FormatTime(start)}:end={FormatTime(end)},setpts=PTS-STARTPTS[{outputLabel}]";
    }

    private static string AudioTrimFilter(TimeSpan start, TimeSpan end, string outputLabel)
    {
        return $"[0:a:0]atrim=start={FormatTime(start)}:end={FormatTime(end)},asetpts=PTS-STARTPTS[{outputLabel}]";
    }

    private static string TransitionVideoFilter(
        TimeSpan firstStart,
        TimeSpan firstEnd,
        TimeSpan secondStart,
        TimeSpan secondEnd,
        TimeSpan duration,
        TrimTransitionKind transitionKind,
        int index,
        string outputLabel)
    {
        var firstLabel = $"t{index}av";
        var secondLabel = $"t{index}bv";
        var firstTransitionInput = firstLabel;
        var secondTransitionInput = secondLabel;
        var builder = new StringBuilder();
        builder.Append(VideoTrimFilter(firstStart, firstEnd, firstLabel));
        builder.Append(';');
        builder.Append(VideoTrimFilter(secondStart, secondEnd, secondLabel));
        if (transitionKind == TrimTransitionKind.Blur)
        {
            firstTransitionInput = $"t{index}avb";
            secondTransitionInput = $"t{index}bvb";
            builder.Append(';')
                .Append('[').Append(firstLabel).Append("]boxblur=luma_radius=10:luma_power=1[")
                .Append(firstTransitionInput).Append(']');
            builder.Append(';')
                .Append('[').Append(secondLabel).Append("]boxblur=luma_radius=10:luma_power=1[")
                .Append(secondTransitionInput).Append(']');
        }

        builder.Append(';')
            .Append('[').Append(firstTransitionInput).Append(']')
            .Append('[').Append(secondTransitionInput).Append(']')
            .Append("xfade=transition=")
            .Append(XFadeName(transitionKind))
            .Append(":duration=")
            .Append(FormatTime(duration))
            .Append(":offset=0[")
            .Append(outputLabel)
            .Append(']');
        return builder.ToString();
    }

    private static string TransitionAudioFilter(
        TimeSpan firstStart,
        TimeSpan firstEnd,
        TimeSpan secondStart,
        TimeSpan secondEnd,
        TimeSpan duration,
        int index,
        string outputLabel)
    {
        var firstLabel = $"t{index}aa";
        var secondLabel = $"t{index}ba";
        return string.Join(
            ';',
            AudioTrimFilter(firstStart, firstEnd, firstLabel),
            AudioTrimFilter(secondStart, secondEnd, secondLabel),
            $"[{firstLabel}][{secondLabel}]acrossfade=d={FormatTime(duration)}:c1=tri:c2=tri[{outputLabel}]");
    }

    private static string XFadeName(TrimTransitionKind transitionKind)
    {
        return transitionKind switch
        {
            TrimTransitionKind.Smooth => "smoothleft",
            TrimTransitionKind.SlideLeft => "slideleft",
            TrimTransitionKind.DipToBlack => "fadeblack",
            TrimTransitionKind.DipToWhite => "fadewhite",
            TrimTransitionKind.Circle => "circleopen",
            _ => "fade"
        };
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

    private static async Task<bool> SourceHasAudioStreamAsync(string sourceFilePath, CancellationToken cancellationToken)
    {
        try
        {
            var ffprobePath = ToolResolver.ResolveToolPath("ffprobe");
            var output = new StringBuilder();
            var startInfo = new ProcessStartInfo
            {
                FileName = ffprobePath,
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true
            };
            ToolResolver.AddToolDirectoriesToPath(startInfo);
            foreach (var argument in new[]
                     {
                         "-v", "error",
                         "-select_streams", "a:0",
                         "-show_entries", "stream=index",
                         "-of", "csv=p=0",
                         sourceFilePath
                     })
            {
                startInfo.ArgumentList.Add(argument);
            }

            using var process = new Process { StartInfo = startInfo };
            var outputClosed = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            var errorClosed = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            process.OutputDataReceived += (_, e) =>
            {
                if (e.Data is null)
                {
                    outputClosed.TrySetResult();
                    return;
                }

                output.AppendLine(e.Data);
            };
            process.ErrorDataReceived += (_, e) =>
            {
                if (e.Data is null)
                {
                    errorClosed.TrySetResult();
                }
            };

            process.Start();
            process.BeginOutputReadLine();
            process.BeginErrorReadLine();
            await ProcessRunner.WaitForExitAndStreamsAsync(
                process,
                outputClosed.Task,
                errorClosed.Task,
                cancellationToken).ConfigureAwait(false);
            return process.ExitCode == 0 && !string.IsNullOrWhiteSpace(output.ToString());
        }
        catch
        {
            return true;
        }
    }

}
