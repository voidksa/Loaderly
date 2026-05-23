using System.Diagnostics;
using System.Drawing;
using System.Globalization;
using System.IO;
using System.Security.Cryptography;
using System.Text;

namespace Loaderly;

internal sealed class TimelineThumbnailService
{
    public async Task<List<Image>> GenerateAsync(
        string sourceFilePath,
        TimeSpan duration,
        int count,
        CancellationToken cancellationToken)
    {
        return await GenerateAsync(sourceFilePath, TimeSpan.Zero, duration, count, cancellationToken)
            .ConfigureAwait(false);
    }

    public async Task<List<Image>> GenerateAsync(
        string sourceFilePath,
        TimeSpan start,
        TimeSpan duration,
        int count,
        CancellationToken cancellationToken)
    {
        if (!File.Exists(sourceFilePath) || duration <= TimeSpan.Zero)
        {
            return [];
        }

        start = start < TimeSpan.Zero ? TimeSpan.Zero : start;
        count = NormalizeCount(count);
        var directory = Path.Combine(AppDataFolder.Path, "TimelineThumbs", CacheKey(sourceFilePath, start, duration, count));
        Directory.CreateDirectory(directory);

        var outputPaths = Enumerable
            .Range(0, count)
            .Select(index => Path.Combine(directory, $"{index:00}.jpg"))
            .ToArray();

        if (!outputPaths.All(File.Exists))
        {
            foreach (var path in outputPaths)
            {
                if (File.Exists(path))
                {
                    File.Delete(path);
                }
            }

            await GenerateFramesAsync(sourceFilePath, start, duration, count, directory, cancellationToken);
        }

        var images = new List<Image>();
        foreach (var path in outputPaths.Where(File.Exists))
        {
            cancellationToken.ThrowIfCancellationRequested();
            using var stream = File.OpenRead(path);
            using var image = Image.FromStream(stream);
            images.Add(new Bitmap(image));
        }

        return images;
    }

    private static async Task GenerateFramesAsync(
        string sourceFilePath,
        TimeSpan start,
        TimeSpan duration,
        int count,
        string outputDirectory,
        CancellationToken cancellationToken)
    {
        var ffmpegPath = ToolResolver.ResolveToolPath("ffmpeg");
        var startInfo = new ProcessStartInfo
        {
            FileName = ffmpegPath,
            UseShellExecute = false,
            RedirectStandardOutput = false,
            RedirectStandardError = false,
            CreateNoWindow = true
        };
        ToolResolver.AddToolDirectoriesToPath(startInfo);

        foreach (var argument in FrameArguments(sourceFilePath, start, duration, count, outputDirectory))
        {
            startInfo.ArgumentList.Add(argument);
        }

        using var process = Process.Start(startInfo);
        if (process is null)
        {
            return;
        }

        await ProcessRunner.WaitForExitAsync(process, cancellationToken).ConfigureAwait(false);
    }

    private static int NormalizeCount(int count)
    {
        return Math.Clamp(count, 3, 24);
    }

    internal static int NormalizeCountForTest(int count)
    {
        return NormalizeCount(count);
    }

    internal static IReadOnlyList<string> FrameArgumentsForTest(
        string sourceFilePath,
        TimeSpan start,
        TimeSpan duration,
        int count,
        string outputDirectory)
    {
        return FrameArguments(sourceFilePath, start, duration, NormalizeCount(count), outputDirectory).ToList();
    }

    internal static string CacheKeyForTest(string sourceFilePath, TimeSpan start, TimeSpan duration, int count)
    {
        return CacheKey(sourceFilePath, start, duration, NormalizeCount(count));
    }

    private static IEnumerable<string> FrameArguments(
        string sourceFilePath,
        TimeSpan start,
        TimeSpan duration,
        int count,
        string outputDirectory)
    {
        var safeStart = start < TimeSpan.Zero ? TimeSpan.Zero : start;
        var safeDuration = duration <= TimeSpan.Zero ? TimeSpan.FromSeconds(1) : duration;
        var frameRate = Math.Max(0.05, count / Math.Max(1, safeDuration.TotalSeconds));
        var outputPattern = Path.Combine(outputDirectory, "%02d.jpg");

        yield return "-y";
        yield return "-ss";
        yield return FormatTime(safeStart);
        yield return "-t";
        yield return FormatTime(safeDuration);
        yield return "-i";
        yield return sourceFilePath;
        yield return "-vf";
        yield return $"fps={frameRate.ToString("0.###", CultureInfo.InvariantCulture)},scale=160:90:force_original_aspect_ratio=increase,crop=160:90";
        yield return "-frames:v";
        yield return count.ToString(CultureInfo.InvariantCulture);
        yield return "-start_number";
        yield return "0";
        yield return "-q:v";
        yield return "5";
        yield return outputPattern;
    }

    private static string FormatTime(TimeSpan time)
    {
        return time.TotalSeconds.ToString("0.000", CultureInfo.InvariantCulture);
    }

    private static string CacheKey(string sourceFilePath, TimeSpan start, TimeSpan duration, int count)
    {
        var info = new FileInfo(sourceFilePath);
        var value = $"{sourceFilePath}|{info.Length}|{info.LastWriteTimeUtc.Ticks}|{FormatTime(start)}|{FormatTime(duration)}|{count}";
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(value));
        return Convert.ToHexString(bytes).ToLowerInvariant()[..24];
    }
}
