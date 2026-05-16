using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace Loaderly;

internal sealed class OpenRouterSubtitleTranslator
{
    private const int BatchSize = 35;
    private static readonly Uri CompletionEndpoint = new("https://openrouter.ai/api/v1/chat/completions");
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly HttpClient httpClient;

    public OpenRouterSubtitleTranslator()
        : this(new HttpClient { Timeout = TimeSpan.FromMinutes(4) })
    {
    }

    public OpenRouterSubtitleTranslator(HttpClient httpClient)
    {
        this.httpClient = httpClient;
    }

    public async Task<IReadOnlyList<SubtitleCue>> TranslateAsync(
        IReadOnlyList<SubtitleCue> cues,
        string apiKey,
        string model,
        string targetLanguage,
        IProgress<string>? progress,
        CancellationToken cancellationToken)
    {
        if (cues.Count == 0)
        {
            return [];
        }

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new InvalidOperationException("OpenRouter API key is required.");
        }

        if (string.IsNullOrWhiteSpace(model))
        {
            throw new InvalidOperationException("OpenRouter model is required.");
        }

        if (string.IsNullOrWhiteSpace(targetLanguage))
        {
            throw new InvalidOperationException("Target subtitle language is required.");
        }

        var translated = new List<SubtitleCue>(cues.Count);
        for (var offset = 0; offset < cues.Count; offset += BatchSize)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var batch = cues.Skip(offset).Take(BatchSize).ToList();
            progress?.Report($"Translating subtitles {offset + 1}-{offset + batch.Count} of {cues.Count}...");
            var response = await TranslateBatchAsync(batch, apiKey.Trim(), model.Trim(), targetLanguage.Trim(), cancellationToken);
            translated.AddRange(ApplyTranslations(batch, response));
        }

        return translated;
    }

    public static IReadOnlyList<SubtitleCue> ApplyTranslationsForTest(IReadOnlyList<SubtitleCue> cues, string assistantContent)
    {
        return ApplyTranslations(cues, assistantContent);
    }

    private async Task<string> TranslateBatchAsync(
        IReadOnlyList<SubtitleCue> batch,
        string apiKey,
        string model,
        string targetLanguage,
        CancellationToken cancellationToken)
    {
        var payload = new Dictionary<string, object?>
        {
            ["model"] = model,
            ["temperature"] = 0,
            ["messages"] = new object[]
            {
                new
                {
                    role = "system",
                    content = """
You translate subtitle cue text only.
Return only a JSON array of objects with the same id values and the translated text.
Do not add, remove, merge, reorder, summarize, explain, censor, or rewrite meaning.
Preserve names, punctuation, line breaks, bracket characters, and numbers as much as possible.
Translate the words inside brackets literally instead of deleting or inventing them.
"""
                },
                new
                {
                    role = "user",
                    content = JsonSerializer.Serialize(new
                    {
                        targetLanguage,
                        cues = batch.Select((cue, index) => new
                        {
                            id = index,
                            text = cue.Text
                        })
                    }, JsonOptions)
                }
            }
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, CompletionEndpoint);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        request.Headers.TryAddWithoutValidation("HTTP-Referer", "https://loaderly.local");
        request.Headers.TryAddWithoutValidation("X-Title", "Loaderly");
        request.Content = new StringContent(JsonSerializer.Serialize(payload, JsonOptions), Encoding.UTF8, "application/json");

        using var response = await httpClient.SendAsync(request, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"AI subtitle translation failed: {(int)response.StatusCode} {Shorten(body)}");
        }

        return ExtractAssistantContent(body);
    }

    private static IReadOnlyList<SubtitleCue> ApplyTranslations(IReadOnlyList<SubtitleCue> cues, string assistantContent)
    {
        var json = ExtractJsonArray(assistantContent);
        using var document = JsonDocument.Parse(json);
        if (document.RootElement.ValueKind != JsonValueKind.Array)
        {
            throw InvalidStructure();
        }

        var translatedTexts = new List<string>();
        var expectedId = 0;
        foreach (var item in document.RootElement.EnumerateArray())
        {
            if (item.ValueKind != JsonValueKind.Object ||
                !item.TryGetProperty("id", out var idProperty) ||
                idProperty.ValueKind != JsonValueKind.Number ||
                !idProperty.TryGetInt32(out var id) ||
                id != expectedId ||
                !item.TryGetProperty("text", out var textProperty) ||
                textProperty.ValueKind != JsonValueKind.String)
            {
                throw InvalidStructure();
            }

            translatedTexts.Add((textProperty.GetString() ?? string.Empty).Trim());
            expectedId++;
        }

        if (translatedTexts.Count != cues.Count)
        {
            throw InvalidStructure();
        }

        return cues
            .Select((cue, index) => cue with { Text = translatedTexts[index] })
            .ToList();
    }

    private static string ExtractAssistantContent(string responseBody)
    {
        try
        {
            using var document = JsonDocument.Parse(responseBody);
            var choices = document.RootElement.GetProperty("choices");
            if (choices.ValueKind != JsonValueKind.Array || choices.GetArrayLength() == 0)
            {
                throw InvalidStructure();
            }

            return choices[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString() ?? string.Empty;
        }
        catch (Exception ex) when (ex is KeyNotFoundException or InvalidOperationException or JsonException)
        {
            throw new InvalidOperationException("AI subtitle translation returned an unreadable response.", ex);
        }
    }

    private static string ExtractJsonArray(string content)
    {
        var trimmed = content.Trim();
        if (trimmed.StartsWith("```", StringComparison.Ordinal))
        {
            var firstNewLine = trimmed.IndexOf('\n');
            var lastFence = trimmed.LastIndexOf("```", StringComparison.Ordinal);
            if (firstNewLine >= 0 && lastFence > firstNewLine)
            {
                trimmed = trimmed[(firstNewLine + 1)..lastFence].Trim();
            }
        }

        var start = trimmed.IndexOf('[');
        var end = trimmed.LastIndexOf(']');
        if (start < 0 || end < start)
        {
            throw InvalidStructure();
        }

        return trimmed[start..(end + 1)];
    }

    private static InvalidOperationException InvalidStructure()
    {
        return new InvalidOperationException("AI translation returned an invalid subtitle structure.");
    }

    private static string Shorten(string value)
    {
        var trimmed = value.Trim();
        return trimmed.Length <= 240 ? trimmed : $"{trimmed[..240]}...";
    }
}
