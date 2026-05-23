using System.Diagnostics;
using System.Drawing;
using System.IO;

namespace Loaderly;

internal static class TrimBlurTracker
{
    private const double FramesPerSecond = 2.0;
    private const int PreviewWidth = 320;
    private const int SearchRadius = 56;
    private const int SearchStep = 8;
    private const int RefineStep = 2;
    private const int SampleStep = 6;
    private const int TemplateSamplesX = 14;
    private const int TemplateSamplesY = 10;

    private sealed record TrackingTemplate(Color[,] Colors, double[,] Weights, double SkinRatio);
    private static readonly double[] SearchScaleFactors = [0.72, 0.82, 0.92, 1.0, 1.1, 1.24, 1.42];
    private static readonly double[] RefineScaleFactors = [0.92, 0.96, 1.0, 1.04, 1.1];

    public static async Task<TrimBlurRegion> TrackAsync(
        string sourceFilePath,
        TrimBlurRegion region,
        string ffmpegPath,
        CancellationToken cancellationToken)
    {
        region = region.Normalize();
        if (!File.Exists(sourceFilePath) || region.Duration <= TimeSpan.Zero)
        {
            return region;
        }

        var tempDirectory = Path.Combine(Path.GetTempPath(), $"loaderly-blur-track-{Guid.NewGuid():N}");
        Directory.CreateDirectory(tempDirectory);
        try
        {
            await ExtractFramesAsync(sourceFilePath, ffmpegPath, region.Start, region.Duration, tempDirectory, cancellationToken)
                .ConfigureAwait(false);
            var frames = Directory.GetFiles(tempDirectory, "frame_*.jpg")
                .OrderBy(path => path, StringComparer.OrdinalIgnoreCase)
                .ToList();
            if (frames.Count == 0)
            {
                return region;
            }

            using var first = new Bitmap(frames[0]);
            var firstKeyframe = region.FrameAt(region.Start).Clamp();
            var previous = ToPixelRect(firstKeyframe, first.Width, first.Height);
            var template = CaptureTemplate(first, previous);
            var keyframes = new List<TrimBlurKeyframe> { firstKeyframe };

            for (var index = 1; index < frames.Count; index++)
            {
                cancellationToken.ThrowIfCancellationRequested();
                using var bitmap = new Bitmap(frames[index]);
                var best = FindBestMatch(bitmap, template, previous);
                previous = best;
                template = BlendTemplate(template, CaptureTemplate(bitmap, best), 0.18);
                var time = region.Start + TimeSpan.FromSeconds(index / FramesPerSecond);
                if (time > region.End)
                {
                    time = region.End;
                }

                keyframes.Add(new TrimBlurKeyframe(
                    time,
                    best.X / (double)Math.Max(1, bitmap.Width),
                    best.Y / (double)Math.Max(1, bitmap.Height),
                    best.Width / (double)Math.Max(1, bitmap.Width),
                    best.Height / (double)Math.Max(1, bitmap.Height)).Clamp());
            }

            if (keyframes[^1].Time < region.End)
            {
                keyframes.Add(keyframes[^1] with { Time = region.End });
            }

            return region with { Keyframes = keyframes };
        }
        finally
        {
            try
            {
                Directory.Delete(tempDirectory, recursive: true);
            }
            catch
            {
            }
        }
    }

    private static async Task ExtractFramesAsync(
        string sourceFilePath,
        string ffmpegPath,
        TimeSpan start,
        TimeSpan duration,
        string tempDirectory,
        CancellationToken cancellationToken)
    {
        var startInfo = new ProcessStartInfo
        {
            FileName = ffmpegPath,
            UseShellExecute = false,
            RedirectStandardOutput = false,
            RedirectStandardError = true,
            CreateNoWindow = true
        };
        ToolResolver.AddToolDirectoriesToPath(startInfo);
        foreach (var argument in new[]
                 {
                     "-y",
                     "-ss",
                     FormatTime(start),
                     "-t",
                     FormatTime(duration),
                     "-i",
                     sourceFilePath,
                     "-vf",
                     $"fps={FramesPerSecond.ToString("0.###", System.Globalization.CultureInfo.InvariantCulture)},scale={PreviewWidth}:-1",
                     "-q:v",
                     "4",
                     Path.Combine(tempDirectory, "frame_%04d.jpg")
                 })
        {
            startInfo.ArgumentList.Add(argument);
        }

        using var process = new Process { StartInfo = startInfo };
        var errorClosed = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        process.ErrorDataReceived += (_, e) =>
        {
            if (e.Data is null)
            {
                errorClosed.TrySetResult();
            }
        };
        process.Start();
        process.BeginErrorReadLine();
        await ProcessRunner.WaitForExitAndStreamsAsync(
            process,
            Task.CompletedTask,
            errorClosed.Task,
            cancellationToken).ConfigureAwait(false);
    }

    private static Rectangle ToPixelRect(TrimBlurKeyframe keyframe, int width, int height)
    {
        var frame = keyframe.Clamp();
        var w = Math.Max(8, (int)Math.Round(frame.Width * width));
        var h = Math.Max(8, (int)Math.Round(frame.Height * height));
        var x = Math.Clamp((int)Math.Round(frame.X * width), 0, Math.Max(0, width - w));
        var y = Math.Clamp((int)Math.Round(frame.Y * height), 0, Math.Max(0, height - h));
        return new Rectangle(x, y, w, h);
    }

    internal static Rectangle TrackRectangleForTest(Bitmap source, Bitmap next, Rectangle previous)
    {
        return FindBestMatch(next, CaptureTemplate(source, previous), previous);
    }

    private static TrackingTemplate CaptureTemplate(Bitmap bitmap, Rectangle rect)
    {
        var samplesX = TemplateSamplesX;
        var samplesY = TemplateSamplesY;
        var colors = new Color[samplesX, samplesY];
        var weights = new double[samplesX, samplesY];
        var skinWeight = 0.0;
        var totalWeight = 0.0;
        for (var y = 0; y < samplesY; y++)
        {
            for (var x = 0; x < samplesX; x++)
            {
                var px = SampleX(rect, x, samplesX, bitmap.Width);
                var py = SampleY(rect, y, samplesY, bitmap.Height);
                var color = bitmap.GetPixel(px, py);
                var weight = TrackingWeight(bitmap, px, py, x, y, samplesX, samplesY, color);
                colors[x, y] = color;
                weights[x, y] = weight;
                totalWeight += weight;
                if (IsLikelySkinTone(color))
                {
                    skinWeight += weight;
                }
            }
        }

        return new TrackingTemplate(colors, weights, skinWeight / Math.Max(0.001, totalWeight));
    }

    private static Rectangle FindBestMatch(Bitmap bitmap, TrackingTemplate template, Rectangle previous)
    {
        previous = ClampRectangleToBitmap(previous, bitmap.Width, bitmap.Height);
        var minX = Math.Max(0, previous.X - SearchRadius);
        var maxX = Math.Min(bitmap.Width - 1, previous.X + SearchRadius);
        var minY = Math.Max(0, previous.Y - SearchRadius);
        var maxY = Math.Min(bitmap.Height - 1, previous.Y + SearchRadius);
        var best = FindBestMatchInWindow(
            bitmap,
            template,
            previous,
            previous,
            minX,
            maxX,
            minY,
            maxY,
            SearchStep,
            SearchScaleFactors);
        var refineMinX = Math.Max(0, best.X - SearchStep);
        var refineMaxX = Math.Min(bitmap.Width - 1, best.X + SearchStep);
        var refineMinY = Math.Max(0, best.Y - SearchStep);
        var refineMaxY = Math.Min(bitmap.Height - 1, best.Y + SearchStep);
        return FindBestMatchInWindow(
            bitmap,
            template,
            best,
            previous,
            refineMinX,
            refineMaxX,
            refineMinY,
            refineMaxY,
            RefineStep,
            RefineScaleFactors);
    }

    private static Rectangle FindBestMatchInWindow(
        Bitmap bitmap,
        TrackingTemplate template,
        Rectangle fallback,
        Rectangle distanceAnchor,
        int minX,
        int maxX,
        int minY,
        int maxY,
        int step,
        IReadOnlyList<double> scaleFactors)
    {
        var best = fallback;
        var bestScore = double.MaxValue;
        foreach (var scale in scaleFactors)
        {
            var width = Math.Clamp((int)Math.Round(fallback.Width * scale), 8, bitmap.Width);
            var height = Math.Clamp((int)Math.Round(fallback.Height * scale), 8, bitmap.Height);
            var startX = Math.Clamp(minX, 0, Math.Max(0, bitmap.Width - width));
            var endX = Math.Clamp(maxX, 0, Math.Max(0, bitmap.Width - width));
            var startY = Math.Clamp(minY, 0, Math.Max(0, bitmap.Height - height));
            var endY = Math.Clamp(maxY, 0, Math.Max(0, bitmap.Height - height));
            if (endX < startX || endY < startY)
            {
                continue;
            }

            for (var y = startY; y <= endY; y += step)
            {
                for (var x = startX; x <= endX; x += step)
                {
                    var candidate = new Rectangle(x, y, width, height);
                    var score = Score(bitmap, template, candidate, distanceAnchor);
                    if (score < bestScore)
                    {
                        bestScore = score;
                        best = candidate;
                    }
                }
            }
        }

        return ClampRectangleToBitmap(best, bitmap.Width, bitmap.Height);
    }

    private static double Score(Bitmap bitmap, TrackingTemplate template, Rectangle candidate, Rectangle previous)
    {
        var score = 0.0;
        var totalWeight = 0.0;
        var skinWeight = 0.0;
        for (var y = 0; y < template.Colors.GetLength(1); y++)
        {
            for (var x = 0; x < template.Colors.GetLength(0); x++)
            {
                var expected = template.Colors[x, y];
                var actual = bitmap.GetPixel(
                    SampleX(candidate, x, template.Colors.GetLength(0), bitmap.Width),
                    SampleY(candidate, y, template.Colors.GetLength(1), bitmap.Height));
                var weight = template.Weights[x, y];
                score += weight * (
                    Math.Abs(expected.R - actual.R) +
                    Math.Abs(expected.G - actual.G) +
                    Math.Abs(expected.B - actual.B));
                totalWeight += weight;
                if (IsLikelySkinTone(actual))
                {
                    skinWeight += weight;
                }
            }
        }

        var colorScore = score / Math.Max(0.001, totalWeight);
        var skinRatio = skinWeight / Math.Max(0.001, totalWeight);
        var skinPenalty = template.SkinRatio >= 0.18
            ? Math.Abs(template.SkinRatio - skinRatio) * 38.0
            : 0.0;
        var candidateCenterX = candidate.Left + candidate.Width / 2.0;
        var candidateCenterY = candidate.Top + candidate.Height / 2.0;
        var previousCenterX = previous.Left + previous.Width / 2.0;
        var previousCenterY = previous.Top + previous.Height / 2.0;
        var distance = Math.Sqrt(
            Math.Pow(candidateCenterX - previousCenterX, 2) +
            Math.Pow(candidateCenterY - previousCenterY, 2));
        var distancePenalty = Math.Min(75.0, distance / Math.Max(1.0, SearchRadius) * 52.0);
        var widthScale = candidate.Width / (double)Math.Max(1, previous.Width);
        var heightScale = candidate.Height / (double)Math.Max(1, previous.Height);
        var aspectScale = widthScale / Math.Max(0.001, heightScale);
        var scalePenalty =
            (Math.Abs(Math.Log(Math.Max(0.001, widthScale))) +
             Math.Abs(Math.Log(Math.Max(0.001, heightScale)))) * 18.0 +
            Math.Abs(Math.Log(Math.Max(0.001, aspectScale))) * 22.0;
        return colorScore + skinPenalty + distancePenalty + scalePenalty;
    }

    private static TrackingTemplate BlendTemplate(TrackingTemplate current, TrackingTemplate observed, double observedWeight)
    {
        if (current.Colors.GetLength(0) != observed.Colors.GetLength(0) ||
            current.Colors.GetLength(1) != observed.Colors.GetLength(1))
        {
            return observed;
        }

        var keepWeight = 1.0 - Math.Clamp(observedWeight, 0, 1);
        observedWeight = Math.Clamp(observedWeight, 0, 1);
        var samplesX = current.Colors.GetLength(0);
        var samplesY = current.Colors.GetLength(1);
        var colors = new Color[samplesX, samplesY];
        var weights = new double[samplesX, samplesY];
        for (var y = 0; y < samplesY; y++)
        {
            for (var x = 0; x < samplesX; x++)
            {
                var left = current.Colors[x, y];
                var right = observed.Colors[x, y];
                colors[x, y] = Color.FromArgb(
                    BlendChannel(left.R, right.R, keepWeight, observedWeight),
                    BlendChannel(left.G, right.G, keepWeight, observedWeight),
                    BlendChannel(left.B, right.B, keepWeight, observedWeight));
                weights[x, y] = current.Weights[x, y] * keepWeight + observed.Weights[x, y] * observedWeight;
            }
        }

        return new TrackingTemplate(
            colors,
            weights,
            current.SkinRatio * keepWeight + observed.SkinRatio * observedWeight);
    }

    private static int BlendChannel(int left, int right, double keepWeight, double observedWeight)
    {
        return Math.Clamp((int)Math.Round(left * keepWeight + right * observedWeight), 0, 255);
    }

    private static int SampleX(Rectangle rect, int sample, int sampleCount, int bitmapWidth)
    {
        return Math.Clamp(
            (int)Math.Round(rect.X + ((sample + 0.5) / Math.Max(1, sampleCount)) * rect.Width),
            0,
            bitmapWidth - 1);
    }

    private static int SampleY(Rectangle rect, int sample, int sampleCount, int bitmapHeight)
    {
        return Math.Clamp(
            (int)Math.Round(rect.Y + ((sample + 0.5) / Math.Max(1, sampleCount)) * rect.Height),
            0,
            bitmapHeight - 1);
    }

    private static Rectangle ClampRectangleToBitmap(Rectangle rect, int bitmapWidth, int bitmapHeight)
    {
        var width = Math.Clamp(rect.Width, 8, Math.Max(8, bitmapWidth));
        var height = Math.Clamp(rect.Height, 8, Math.Max(8, bitmapHeight));
        var x = Math.Clamp(rect.X, 0, Math.Max(0, bitmapWidth - width));
        var y = Math.Clamp(rect.Y, 0, Math.Max(0, bitmapHeight - height));
        return new Rectangle(x, y, width, height);
    }

    private static double TrackingWeight(Bitmap bitmap, int px, int py, int sampleX, int sampleY, int samplesX, int samplesY, Color color)
    {
        var centerX = samplesX <= 1 ? 0.5 : sampleX / (double)(samplesX - 1);
        var centerY = samplesY <= 1 ? 0.5 : sampleY / (double)(samplesY - 1);
        var dx = centerX - 0.5;
        var dy = centerY - 0.5;
        var centerBias = Math.Max(0.25, 1.0 - Math.Sqrt(dx * dx + dy * dy) * 1.35);
        var contrast = LocalContrast(bitmap, px, py) / 255.0;
        var skinBias = IsLikelySkinTone(color) ? 0.85 : 0.0;
        return 0.35 + centerBias * 1.35 + contrast * 0.9 + skinBias;
    }

    private static bool IsLikelySkinTone(Color color)
    {
        var max = Math.Max(color.R, Math.Max(color.G, color.B));
        var min = Math.Min(color.R, Math.Min(color.G, color.B));
        return color.R > 95 &&
               color.G > 40 &&
               color.B > 20 &&
               max - min > 15 &&
               Math.Abs(color.R - color.G) > 10 &&
               color.R > color.G &&
               color.R > color.B;
    }

    private static double LocalContrast(Bitmap bitmap, int x, int y)
    {
        var center = bitmap.GetPixel(x, y);
        var right = bitmap.GetPixel(Math.Min(bitmap.Width - 1, x + SampleStep), y);
        var down = bitmap.GetPixel(x, Math.Min(bitmap.Height - 1, y + SampleStep));
        return (
            Math.Abs(center.R - right.R) +
            Math.Abs(center.G - right.G) +
            Math.Abs(center.B - right.B) +
            Math.Abs(center.R - down.R) +
            Math.Abs(center.G - down.G) +
            Math.Abs(center.B - down.B)) / 6.0;
    }

    private static string FormatTime(TimeSpan time)
    {
        return time.TotalSeconds.ToString("0.###", System.Globalization.CultureInfo.InvariantCulture);
    }
}
