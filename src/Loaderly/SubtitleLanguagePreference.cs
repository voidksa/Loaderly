namespace Loaderly;

internal static class SubtitleLanguagePreference
{
    public const string Original = "Same as video";
    public const string Arabic = "Arabic";
    public const string English = "English";
    public const string ArabicEnglish = "Arabic + English";
    public const string All = "All";
    public const string Custom = "Custom code";

    private const string OriginalSourceValue = "original,-live_chat";

    public static string[] OptionLabels { get; } = [Original, Arabic, English, ArabicEnglish, All, Custom];

    public static string DefaultLanguages => OriginalSourceValue;

    public static string ValueForSelection(string selection, string customValue)
    {
        return LoaderlyLanguage.EnglishFor(selection) switch
        {
            Original => DefaultLanguages,
            Arabic => "ar,-live_chat",
            English => "en,-live_chat",
            ArabicEnglish => "ar,en,-live_chat",
            All => "all,-live_chat",
            Custom => NormalizeCustom(customValue),
            _ => DefaultLanguages
        };
    }

    public static string SelectionForValue(string? value)
    {
        return Normalize(value) switch
        {
            OriginalSourceValue => Original,
            "ar,-live_chat" => Arabic,
            "en,-live_chat" => English,
            "ar,en,-live_chat" or "en,ar,-live_chat" => ArabicEnglish,
            "all,-live_chat" => All,
            _ => Custom
        };
    }

    public static string Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return DefaultLanguages;
        }

        var parts = value
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(part => part.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        if (parts.Count == 0)
        {
            return DefaultLanguages;
        }

        if (parts.Contains("original", StringComparer.OrdinalIgnoreCase))
        {
            return DefaultLanguages;
        }

        if (!parts.Contains("-live_chat", StringComparer.OrdinalIgnoreCase))
        {
            parts.Add("-live_chat");
        }

        return string.Join(',', parts);
    }

    public static bool IsOriginalSource(string? value)
    {
        return Normalize(value).Equals(DefaultLanguages, StringComparison.OrdinalIgnoreCase);
    }

    public static string CustomTextForValue(string? value)
    {
        var normalized = Normalize(value);
        return SelectionForValue(normalized) == Custom
            ? string.Join(',', normalized
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Where(part => !part.Equals("-live_chat", StringComparison.OrdinalIgnoreCase)))
            : string.Empty;
    }

    public static string Description(string? value)
    {
        var selection = SelectionForValue(value);
        return selection == Custom ? Normalize(value) : LoaderlyLanguage.Text(selection);
    }

    private static string NormalizeCustom(string customValue)
    {
        return Normalize(customValue);
    }
}
