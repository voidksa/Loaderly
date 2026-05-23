using System.Drawing;
using System.Globalization;
using System.IO;
using System.Text;

namespace Loaderly;

internal static class SubtitleBurnInService
{
    public static string? CreateAssFile(
        string subtitleFilePath,
        TimeSpan trimStart,
        TimeSpan trimEnd,
        SubtitleStyle style)
    {
        if (!File.Exists(subtitleFilePath))
        {
            return null;
        }

        var cues = SrtSubtitleService.LoadFile(subtitleFilePath);
        var clipped = ClipCues(cues, trimStart, trimEnd).ToList();
        if (clipped.Count == 0)
        {
            return null;
        }

        var directory = Path.Combine(Path.GetTempPath(), "LoaderlyTrimSubtitles");
        Directory.CreateDirectory(directory);
        var path = Path.Combine(directory, $"{Guid.NewGuid():N}.ass");
        File.WriteAllText(path, BuildAss(clipped, TimeSpan.Zero, trimEnd - trimStart, style), Encoding.UTF8);
        return path;
    }

    public static string? CreateAssFile(
        IEnumerable<SubtitleCue> cues,
        TimeSpan duration,
        SubtitleStyle style)
    {
        var clipped = ClipCues(cues, TimeSpan.Zero, duration).ToList();
        if (clipped.Count == 0)
        {
            return null;
        }

        var directory = Path.Combine(Path.GetTempPath(), "LoaderlyTrimSubtitles");
        Directory.CreateDirectory(directory);
        var path = Path.Combine(directory, $"{Guid.NewGuid():N}.ass");
        File.WriteAllText(path, BuildAss(clipped, TimeSpan.Zero, duration, style), Encoding.UTF8);
        return path;
    }

    public static string BuildAss(
        IEnumerable<SubtitleCue> cues,
        TimeSpan trimStart,
        TimeSpan trimEnd,
        SubtitleStyle style)
    {
        var clipped = ClipCues(cues, trimStart, trimEnd).ToList();
        var fontSize = Math.Clamp((int)Math.Round(style.FontSize * 2), 24, 104);
        var backgroundAlpha = 255 - (int)Math.Round(Math.Clamp(style.BackgroundOpacity, 0, 100) / 100.0 * 255);
        var builder = new StringBuilder();

        builder.AppendLine("[Script Info]");
        builder.AppendLine("ScriptType: v4.00+");
        builder.AppendLine("PlayResX: 1920");
        builder.AppendLine("PlayResY: 1080");
        builder.AppendLine("WrapStyle: 2");
        builder.AppendLine("ScaledBorderAndShadow: yes");
        builder.AppendLine();
        builder.AppendLine("[V4+ Styles]");
        builder.AppendLine("Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding");
        builder.Append("Style: Loaderly,");
        builder.Append(EscapeAssText(style.FontFamily));
        builder.Append(',');
        builder.Append(fontSize.ToString(CultureInfo.InvariantCulture));
        builder.Append(',');
        builder.Append(AssColor(style.TextColor, 0));
        builder.Append(',');
        builder.Append(AssColor("#FFFFFF", 0));
        builder.Append(',');
        builder.Append(AssColor("#000000", 0));
        builder.Append(',');
        builder.Append(AssColor(style.BackgroundColor, backgroundAlpha));
        builder.Append(',');
        builder.Append(style.Bold ? "-1" : "0");
        builder.AppendLine(",0,0,0,100,100,0,0,3,0,0,2,96,96,48,1");
        builder.AppendLine();
        builder.AppendLine("[Events]");
        builder.AppendLine("Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text");

        foreach (var cue in clipped)
        {
            builder.Append("Dialogue: 0,");
            builder.Append(FormatAssTime(cue.Start));
            builder.Append(',');
            builder.Append(FormatAssTime(cue.End));
            builder.Append(",Loaderly,,0,0,48,,");
            builder.AppendLine(EscapeAssText(SubtitleTextDirection.WithAssRtlEmbedding(cue.Text)));
        }

        return builder.ToString();
    }

    private static IEnumerable<SubtitleCue> ClipCues(IEnumerable<SubtitleCue> cues, TimeSpan trimStart, TimeSpan trimEnd)
    {
        foreach (var cue in cues.OrderBy(cue => cue.Start))
        {
            if (cue.End <= trimStart || cue.Start >= trimEnd || string.IsNullOrWhiteSpace(cue.Text))
            {
                continue;
            }

            var start = cue.Start < trimStart ? TimeSpan.Zero : cue.Start - trimStart;
            var end = cue.End > trimEnd ? trimEnd - trimStart : cue.End - trimStart;
            if (end > start)
            {
                yield return new SubtitleCue(start, end, cue.Text);
            }
        }
    }

    private static string FormatAssTime(TimeSpan time)
    {
        return string.Create(
            CultureInfo.InvariantCulture,
            $"{(int)time.TotalHours}:{time.Minutes:00}:{time.Seconds:00}.{time.Milliseconds / 10:00}");
    }

    private static string AssColor(string htmlColor, int alpha)
    {
        var color = ColorTranslator.FromHtml(htmlColor);
        return $"&H{Math.Clamp(alpha, 0, 255):X2}{color.B:X2}{color.G:X2}{color.R:X2}";
    }

    private static string EscapeAssText(string text)
    {
        return text
            .Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("{", "\\{", StringComparison.Ordinal)
            .Replace("}", "\\}", StringComparison.Ordinal)
            .Replace("\r\n", "\\N", StringComparison.Ordinal)
            .Replace("\n", "\\N", StringComparison.Ordinal)
            .Replace("\r", "\\N", StringComparison.Ordinal);
    }
}
