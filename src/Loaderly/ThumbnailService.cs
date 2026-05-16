using System.Diagnostics;
using System.IO;
using System.Security.Cryptography;
using System.Text;

namespace Loaderly;

internal sealed class ThumbnailService
{
    public async Task<string?> GenerateAsync(string sourceFilePath, CancellationToken cancellationToken)
    {
        if (!File.Exists(sourceFilePath))
        {
            return null;
        }

        var directory = Path.Combine(AppDataFolder.Path, "Thumbnails");
        Directory.CreateDirectory(directory);
        var outputPath = Path.Combine(directory, $"{Hash(sourceFilePath)}.jpg");
        if (File.Exists(outputPath))
        {
            return outputPath;
        }

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

        foreach (var argument in new[]
                 {
                     "-y",
                     "-ss", "1",
                     "-i", sourceFilePath,
                     "-frames:v", "1",
                     "-vf", "scale=320:-2",
                     "-q:v", "4",
                     "-update", "1",
                     outputPath
                 })
        {
            startInfo.ArgumentList.Add(argument);
        }

        using var process = Process.Start(startInfo);
        if (process is null)
        {
            return null;
        }

        await ProcessRunner.WaitForExitAsync(process, cancellationToken).ConfigureAwait(false);
        return process.ExitCode == 0 && File.Exists(outputPath) ? outputPath : null;
    }

    private static string Hash(string value)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(value));
        return Convert.ToHexString(bytes).ToLowerInvariant()[..24];
    }
}
