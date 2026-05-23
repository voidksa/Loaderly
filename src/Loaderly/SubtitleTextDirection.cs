namespace Loaderly;

internal static class SubtitleTextDirection
{
    private const char RightToLeftEmbedding = '\u202B';
    private const char PopDirectionalFormatting = '\u202C';

    public static bool ContainsRtlText(string? text)
    {
        if (string.IsNullOrEmpty(text))
        {
            return false;
        }

        foreach (var character in text)
        {
            var code = character;
            if ((code >= 0x0590 && code <= 0x08FF) ||
                (code >= 0xFB1D && code <= 0xFDFF) ||
                (code >= 0xFE70 && code <= 0xFEFF))
            {
                return true;
            }
        }

        return false;
    }

    public static string WithAssRtlEmbedding(string text)
    {
        if (string.IsNullOrEmpty(text) || !ContainsRtlText(text))
        {
            return text;
        }

        var lines = NormalizeLineEndings(text).Split('\n');
        for (var index = 0; index < lines.Length; index++)
        {
            lines[index] = WithLineRtlEmbedding(lines[index]);
        }

        return string.Join('\n', lines);
    }

    private static string WithLineRtlEmbedding(string line)
    {
        if (!ContainsRtlText(line) || IsWrappedWithDirectionalEmbedding(line))
        {
            return line;
        }

        return $"{RightToLeftEmbedding}{line}{PopDirectionalFormatting}";
    }

    private static bool IsWrappedWithDirectionalEmbedding(string line)
    {
        return line.Length >= 2 &&
               line[0] == RightToLeftEmbedding &&
               line[^1] == PopDirectionalFormatting;
    }

    private static string NormalizeLineEndings(string text)
    {
        return text
            .Replace("\r\n", "\n", StringComparison.Ordinal)
            .Replace('\r', '\n');
    }
}
