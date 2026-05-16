using System.Diagnostics;
using System.Text;
using System.Text.Json;

namespace Loaderly;

internal static class OriginalSubtitleLanguageResolver
{
    public static async Task<string?> ResolveAsync(string ytDlpPath, string sourceUrl, CancellationToken cancellationToken)
    {
        return await ResolveAsync(ytDlpPath, null, sourceUrl, cancellationToken).ConfigureAwait(false);
    }

    public static async Task<string?> ResolveAsync(string ytDlpPath, string? denoPath, string sourceUrl, CancellationToken cancellationToken)
    {
        try
        {
            var startInfo = new ProcessStartInfo
            {
                FileName = ytDlpPath,
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true
            };
            ToolResolver.AddToolDirectoriesToPath(startInfo);
            startInfo.ArgumentList.Add("--skip-download");
            startInfo.ArgumentList.Add("--dump-json");
            startInfo.ArgumentList.Add("--no-playlist");
            if (!string.IsNullOrWhiteSpace(denoPath))
            {
                startInfo.ArgumentList.Add("--js-runtimes");
                startInfo.ArgumentList.Add($"deno:{denoPath}");
            }

            startInfo.ArgumentList.Add(sourceUrl);

            var output = new StringBuilder();
            using var process = new Process
            {
                StartInfo = startInfo,
                EnableRaisingEvents = true
            };
            var outputClosed = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            var errorClosed = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);

            process.OutputDataReceived += (_, e) =>
            {
                if (e.Data is null)
                {
                    outputClosed.TrySetResult();
                    return;
                }

                if (!string.IsNullOrWhiteSpace(e.Data))
                {
                    lock (output)
                    {
                        output.AppendLine(e.Data);
                    }
                }
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

            string json;
            lock (output)
            {
                json = output.ToString();
            }

            return process.ExitCode == 0 ? ResolveFromJson(json) : null;
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch
        {
            return null;
        }
    }

    public static string? ResolveFromJsonForTest(string json)
    {
        return ResolveFromJson(json);
    }

    private static string? ResolveFromJson(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return null;
        }

        foreach (var candidateJson in CandidateJsonDocuments(json))
        {
            try
            {
                using var document = JsonDocument.Parse(candidateJson);
                var root = document.RootElement;
                var fromRoot = ResolveFromVideoElement(root);
                if (!string.IsNullOrWhiteSpace(fromRoot))
                {
                    return fromRoot;
                }

                if (root.ValueKind == JsonValueKind.Object &&
                    root.TryGetProperty("entries", out var entries) &&
                    entries.ValueKind == JsonValueKind.Array)
                {
                    foreach (var entry in entries.EnumerateArray())
                    {
                        var fromEntry = ResolveFromVideoElement(entry);
                        if (!string.IsNullOrWhiteSpace(fromEntry))
                        {
                            return fromEntry;
                        }
                    }
                }
            }
            catch (JsonException)
            {
            }
        }

        return null;
    }

    private static string? ResolveFromVideoElement(JsonElement element)
    {
        if (element.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        var manualSubtitles = LanguageKeys(element, "subtitles").ToList();
        var automaticCaptions = LanguageKeys(element, "automatic_captions").ToList();
        var available = manualSubtitles.Count > 0 ? manualSubtitles : automaticCaptions;

        foreach (var videoLanguage in VideoLanguageCandidates(element))
        {
            var match = MatchAvailableLanguage(videoLanguage, manualSubtitles);
            if (!string.IsNullOrWhiteSpace(match))
            {
                return match;
            }

            match = MatchAvailableLanguage(videoLanguage, automaticCaptions);
            if (!string.IsNullOrWhiteSpace(match))
            {
                return match;
            }
        }

        return available.FirstOrDefault();
    }

    private static IEnumerable<string> CandidateJsonDocuments(string output)
    {
        var trimmed = output.Trim();
        if (trimmed.StartsWith('{') || trimmed.StartsWith('['))
        {
            yield return trimmed;
        }

        foreach (var line in output.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (line.StartsWith('{') || line.StartsWith('['))
            {
                yield return line;
            }
        }
    }

    private static IEnumerable<string> VideoLanguageCandidates(JsonElement element)
    {
        foreach (var propertyName in new[] { "language", "original_language", "audio_language" })
        {
            if (element.TryGetProperty(propertyName, out var property) &&
                property.ValueKind == JsonValueKind.String &&
                !string.IsNullOrWhiteSpace(property.GetString()))
            {
                yield return property.GetString()!.Trim();
            }
        }
    }

    private static IEnumerable<string> LanguageKeys(JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var container) ||
            container.ValueKind != JsonValueKind.Object)
        {
            yield break;
        }

        foreach (var property in container.EnumerateObject())
        {
            var language = property.Name.Trim();
            if (language.Length == 0 || language.Equals("live_chat", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            yield return language;
        }
    }

    private static string? MatchAvailableLanguage(string videoLanguage, IReadOnlyList<string> availableLanguages)
    {
        if (availableLanguages.Count == 0 || string.IsNullOrWhiteSpace(videoLanguage))
        {
            return null;
        }

        var normalized = NormalizeLanguage(videoLanguage);
        return availableLanguages.FirstOrDefault(language =>
            NormalizeLanguage(language).Equals(normalized, StringComparison.OrdinalIgnoreCase)) ??
               availableLanguages.FirstOrDefault(language =>
                   NormalizeLanguage(language).StartsWith($"{normalized}-", StringComparison.OrdinalIgnoreCase) ||
                   normalized.StartsWith($"{NormalizeLanguage(language)}-", StringComparison.OrdinalIgnoreCase));
    }

    private static string NormalizeLanguage(string value)
    {
        return value.Trim().Replace('_', '-').ToLowerInvariant();
    }
}
