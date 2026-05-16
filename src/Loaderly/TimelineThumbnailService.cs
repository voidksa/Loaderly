using System.Diagnostics;
using System.Drawing;
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
        if (!File.Exists(sourceFilePath) || duration <= TimeSpan.Zero)
        {
            return [];
        }

        count = NormalizeCount(count);
        var directory = Path.Combine(AppDataFolder.Path, "TimelineThumbs", CacheKey(sourceFilePath, count));
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

            await GenerateFramesAsync(sourceFilePath, duration, count, directory, cancellationToken);
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
        TimeSpan duration,
        int count,
        string outputDirectory,
        CancellationToken cancellationToken)
    {
        var ffmpegPath = ToolResolver.ResolveToolPath("ffmpeg");
        var frameRate = Math.Max(0.05, count / Math.Max(1, duration.TotalSeconds));
        var outputPattern = Path.Combine(outputDirectory, "%02d.jpg");
        var startInfo = new ProcessStartInfo
        {
            FileName = ffmpegPath,
            UseShellExecute = false,
            RedirectStandardOutput = false,
            RedirectStandardError = false,
            CreateNoWindow = true
        };
        ToolResolver.AddToolDirectoriesToPath(startInfo);

        foreach (var argument in new[]
                 {
                     "-y",
                     "-i", sourceFilePath,
                     "-vf", $"fps={frameRate.ToString("0.###", System.Globalization.CultureInfo.InvariantCulture)},scale=160:90:force_original_aspect_ratio=increase,crop=160:90",
                     "-frames:v", count.ToString(System.Globalization.CultureInfo.InvariantCulture),
                     "-start_number", "0",
                     "-q:v", "5",
                     outputPattern
                 })
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
        return Math.Clamp(count, 3, 8);
    }

    internal static int NormalizeCountForTest(int count)
    {
        return NormalizeCount(count);
    }

    private static string CacheKey(string sourceFilePath, int count)
    {
        var info = new FileInfo(sourceFilePath);
        var value = $"{sourceFilePath}|{info.Length}|{info.LastWriteTimeUtc.Ticks}|{count}";
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(value));
        return Convert.ToHexString(bytes).ToLowerInvariant()[..24];
    }
}
