using System.IO;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;

namespace Loaderly;

internal sealed record SubtitleCue(TimeSpan Start, TimeSpan End, string Text);

internal static class SrtSubtitleService
{
    private static readonly string[] SupportedSubtitleExtensions = [".srt", ".vtt"];

    private static readonly Regex TimeLinePattern = new(
        @"^(?<start>(?:\d{1,2}:)?\d{2}:\d{2}[,.]\d{1,3})\s*-->\s*(?<end>(?:\d{1,2}:)?\d{2}:\d{2}[,.]\d{1,3})",
        RegexOptions.Compiled);

    private static readonly Regex InlineTimeLinePattern = new(
        @"(?<![\d:])(?<index>\d{1,6})?(?<start>\d{2}:\d{2}:\d{2}[,.]\d{1,3}|\d{2}:\d{2}[,.]\d{1,3})\s*-->\s*(?<end>\d{2}:\d{2}:\d{2}[,.]\d{1,3}|\d{2}:\d{2}[,.]\d{1,3})",
        RegexOptions.Compiled);

    private static readonly Regex TagPattern = new("<[^>]+>", RegexOptions.Compiled);

    public static IReadOnlyList<SubtitleCue> LoadForMedia(string mediaFilePath, string preferredLanguages)
    {
        var subtitlePath = FindSubtitleFile(mediaFilePath, preferredLanguages);
        return subtitlePath is null ? [] : LoadFile(subtitlePath);
    }

    public static IReadOnlyList<SubtitleCue> LoadFile(string subtitleFilePath)
    {
        return Parse(File.ReadAllText(subtitleFilePath, Encoding.UTF8));
    }

    public static string? FindSubtitleFile(string mediaFilePath, string preferredLanguages)
    {
        var directory = Path.GetDirectoryName(mediaFilePath);
        if (string.IsNullOrWhiteSpace(directory) || !Directory.Exists(directory))
        {
            return null;
        }

        var baseName = Path.GetFileNameWithoutExtension(mediaFilePath);
        foreach (var extension in SupportedSubtitleExtensions)
        {
            var directPath = Path.Combine(directory, $"{baseName}{extension}");
            if (File.Exists(directPath))
            {
                return directPath;
            }
        }

        var candidates = Directory
            .EnumerateFiles(directory, $"{baseName}*.*")
            .Where(IsSupportedSubtitlePath)
            .OrderBy(SubtitleFormatRank)
            .ThenBy(path => path, StringComparer.OrdinalIgnoreCase)
            .ToList();
        if (candidates.Count == 0)
        {
            return null;
        }

        foreach (var language in PreferredLanguageCodes(preferredLanguages))
        {
            var match = candidates.FirstOrDefault(path =>
                FileNameMatchesLanguage(path, language));
            if (match is not null)
            {
                return match;
            }
        }

        return candidates[0];
    }

    public static IReadOnlyList<SubtitleCue> Parse(string srtText)
    {
        var normalized = NormalizeSubtitleText(srtText);
        var blocks = normalized.Split("\n\n", StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var cues = new List<SubtitleCue>();

        foreach (var block in blocks)
        {
            var lines = block
                .Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .ToList();
            var timeLineIndex = lines.FindIndex(line => TimeLinePattern.IsMatch(line));
            if (timeLineIndex < 0)
            {
                continue;
            }

            var match = TimeLinePattern.Match(lines[timeLineIndex]);
            if (!TryParseTime(match.Groups["start"].Value, out var start) ||
                !TryParseTime(match.Groups["end"].Value, out var end) ||
                end <= start)
            {
                continue;
            }

            var text = CleanText(string.Join(Environment.NewLine, lines.Skip(timeLineIndex + 1)));
            if (text.Length == 0)
            {
                continue;
            }

            cues.Add(new SubtitleCue(start, end, text));
        }

        var inlineCues = ParseInline(normalized);
        return (inlineCues.Count > cues.Count ? inlineCues : cues)
            .OrderBy(cue => cue.Start)
            .ToList();
    }

    public static string TextAt(IReadOnlyList<SubtitleCue> cues, TimeSpan position)
    {
        return cues.FirstOrDefault(cue => position >= cue.Start && position < cue.End)?.Text ?? string.Empty;
    }

    public static IReadOnlyList<SubtitleCue> CuesForRange(
        IEnumerable<SubtitleCue> cues,
        TimeSpan rangeStart,
        TimeSpan rangeEnd)
    {
        if (rangeStart < TimeSpan.Zero)
        {
            rangeStart = TimeSpan.Zero;
        }

        if (rangeEnd <= rangeStart || rangeEnd == TimeSpan.MaxValue)
        {
            return cues
                .Where(cue => cue.End > cue.Start && !string.IsNullOrWhiteSpace(cue.Text))
                .OrderBy(cue => cue.Start)
                .ToList();
        }

        return cues
            .Where(cue => cue.End > rangeStart && cue.Start < rangeEnd && !string.IsNullOrWhiteSpace(cue.Text))
            .Select(cue =>
            {
                var start = cue.Start < rangeStart ? rangeStart : cue.Start;
                var end = cue.End > rangeEnd ? rangeEnd : cue.End;
                return cue with { Start = start, End = end };
            })
            .Where(cue => cue.End > cue.Start)
            .OrderBy(cue => cue.Start)
            .ToList();
    }

    public static string FormatForPath(IEnumerable<SubtitleCue> cues, string subtitleFilePath)
    {
        return Path.GetExtension(subtitleFilePath).Equals(".vtt", StringComparison.OrdinalIgnoreCase)
            ? FormatWebVtt(cues)
            : FormatSrt(cues);
    }

    public static string FormatSrt(IEnumerable<SubtitleCue> cues)
    {
        var builder = new StringBuilder();
        var index = 1;
        foreach (var cue in cues.OrderBy(cue => cue.Start))
        {
            if (cue.End <= cue.Start || string.IsNullOrWhiteSpace(cue.Text))
            {
                continue;
            }

            builder.AppendLine(index.ToString());
            builder.Append(FormatSrtTime(cue.Start));
            builder.Append(" --> ");
            builder.AppendLine(FormatSrtTime(cue.End));
            builder.AppendLine(NormalizeCueText(cue.Text));
            builder.AppendLine();
            index++;
        }

        return builder.ToString();
    }

    public static string FormatWebVtt(IEnumerable<SubtitleCue> cues)
    {
        var builder = new StringBuilder();
        builder.AppendLine("WEBVTT");
        builder.AppendLine();
        foreach (var cue in cues.OrderBy(cue => cue.Start))
        {
            if (cue.End <= cue.Start || string.IsNullOrWhiteSpace(cue.Text))
            {
                continue;
            }

            builder.Append(FormatVttTime(cue.Start));
            builder.Append(" --> ");
            builder.AppendLine(FormatVttTime(cue.End));
            builder.AppendLine(NormalizeCueText(cue.Text));
            builder.AppendLine();
        }

        return builder.ToString();
    }

    private static IReadOnlyList<SubtitleCue> ParseInline(string normalized)
    {
        var matches = InlineTimeLinePattern.Matches(normalized);
        if (matches.Count == 0)
        {
            return [];
        }

        var cues = new List<SubtitleCue>();
        for (var i = 0; i < matches.Count; i++)
        {
            var match = matches[i];
            if (!TryParseTime(match.Groups["start"].Value, out var start) ||
                !TryParseTime(match.Groups["end"].Value, out var end) ||
                end <= start)
            {
                continue;
            }

            var textStart = match.Index + match.Length;
            var textEnd = i + 1 < matches.Count ? matches[i + 1].Index : normalized.Length;
            if (textEnd <= textStart)
            {
                continue;
            }

            var text = CleanText(normalized[textStart..textEnd]);
            if (text.Length == 0 || text.Equals("WEBVTT", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            cues.Add(new SubtitleCue(start, end, text));
        }

        return cues;
    }

    private static IEnumerable<string> PreferredLanguageCodes(string preferredLanguages)
    {
        return SubtitleLanguagePreference.Normalize(preferredLanguages)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(part => !part.StartsWith("-", StringComparison.Ordinal))
            .Select(part => part.Split('-', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)[0])
            .Distinct(StringComparer.OrdinalIgnoreCase);
    }

    private static bool TryParseTime(string value, out TimeSpan result)
    {
        value = value.Replace(",", ".", StringComparison.Ordinal);
        return TimeSpan.TryParseExact(value, @"h\:mm\:ss\.fff", null, out result) ||
               TimeSpan.TryParseExact(value, @"hh\:mm\:ss\.fff", null, out result) ||
               TimeSpan.TryParseExact(value, @"m\:ss\.fff", null, out result) ||
               TimeSpan.TryParseExact(value, @"mm\:ss\.fff", null, out result) ||
               TimeSpan.TryParseExact(value, @"h\:mm\:ss\.ff", null, out result) ||
               TimeSpan.TryParseExact(value, @"hh\:mm\:ss\.ff", null, out result) ||
               TimeSpan.TryParseExact(value, @"m\:ss\.ff", null, out result) ||
               TimeSpan.TryParseExact(value, @"mm\:ss\.ff", null, out result) ||
               TimeSpan.TryParseExact(value, @"h\:mm\:ss\.f", null, out result) ||
               TimeSpan.TryParseExact(value, @"hh\:mm\:ss\.f", null, out result) ||
               TimeSpan.TryParseExact(value, @"m\:ss\.f", null, out result) ||
               TimeSpan.TryParseExact(value, @"mm\:ss\.f", null, out result);
    }

    private static string NormalizeSubtitleText(string text)
    {
        return text
            .Replace("\r\n", "\n", StringComparison.Ordinal)
            .Replace('\r', '\n')
            .Replace("\\r\\n", "\n", StringComparison.Ordinal)
            .Replace("\\n", "\n", StringComparison.Ordinal);
    }

    private static string NormalizeCueText(string text)
    {
        return NormalizeSubtitleText(text).Trim();
    }

    private static string FormatSrtTime(TimeSpan time)
    {
        return $"{(int)time.TotalHours:00}:{time.Minutes:00}:{time.Seconds:00},{time.Milliseconds:000}";
    }

    private static string FormatVttTime(TimeSpan time)
    {
        return $"{(int)time.TotalHours:00}:{time.Minutes:00}:{time.Seconds:00}.{time.Milliseconds:000}";
    }

    private static bool IsSupportedSubtitlePath(string path)
    {
        return SupportedSubtitleExtensions.Contains(Path.GetExtension(path), StringComparer.OrdinalIgnoreCase);
    }

    private static int SubtitleFormatRank(string path)
    {
        return Path.GetExtension(path).Equals(".srt", StringComparison.OrdinalIgnoreCase) ? 0 : 1;
    }

    private static bool FileNameMatchesLanguage(string path, string language)
    {
        var fileName = Path.GetFileNameWithoutExtension(path);
        var languageStart = fileName.LastIndexOf('.');
        if (languageStart < 0 || languageStart == fileName.Length - 1)
        {
            return false;
        }

        var suffix = fileName[(languageStart + 1)..];
        return suffix.Equals(language, StringComparison.OrdinalIgnoreCase) ||
               suffix.StartsWith($"{language}-", StringComparison.OrdinalIgnoreCase);
    }

    private static string CleanText(string text)
    {
        var normalized = NormalizeSubtitleText(text);
        var withoutTags = TagPattern.Replace(normalized, string.Empty);
        return WebUtility.HtmlDecode(withoutTags).Trim();
    }
}
