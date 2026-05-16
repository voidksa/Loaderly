using System.Globalization;

namespace Loaderly;

internal static class WorldLanguageCatalog
{
    private static readonly string[] Preferred = ["Arabic", "English"];
    private static readonly string[] Required = ["Arabic", "English", "Zulu"];

    public static IReadOnlyList<string> Names { get; } = BuildNames();

    public static string[] Filter(string? query, string? selectedLanguage = null, int maxItems = 90)
    {
        var normalizedQuery = query?.Trim() ?? string.Empty;
        var matches = string.IsNullOrWhiteSpace(normalizedQuery)
            ? Names
            : Names.Where(language => language.Contains(normalizedQuery, StringComparison.OrdinalIgnoreCase)).ToArray();

        var result = matches.Take(maxItems).ToList();
        foreach (var required in Required)
        {
            if ((string.IsNullOrWhiteSpace(normalizedQuery) || required.Contains(normalizedQuery, StringComparison.OrdinalIgnoreCase)) &&
                Names.Contains(required, StringComparer.OrdinalIgnoreCase) &&
                !result.Contains(required, StringComparer.OrdinalIgnoreCase))
            {
                result.Add(required);
            }
        }

        if (!string.IsNullOrWhiteSpace(selectedLanguage) &&
            !result.Contains(selectedLanguage, StringComparer.OrdinalIgnoreCase) &&
            Names.Contains(selectedLanguage, StringComparer.OrdinalIgnoreCase))
        {
            result.Insert(0, selectedLanguage);
        }

        return result.Count > 0 ? [.. result] : [.. Preferred];
    }

    private static string[] BuildNames()
    {
        var names = CultureInfo.GetCultures(CultureTypes.NeutralCultures)
            .Select(culture => CleanLanguageName(culture.EnglishName))
            .Where(name => name.Length > 0 && !name.Equals("Invariant Language", StringComparison.OrdinalIgnoreCase))
            .Concat(Required)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(name => Preferred.Contains(name, StringComparer.OrdinalIgnoreCase) ? 0 : 1)
            .ThenBy(PreferredIndex)
            .ThenBy(name => name, StringComparer.OrdinalIgnoreCase)
            .ToArray();

        return names;
    }

    private static int PreferredIndex(string language)
    {
        var index = Array.FindIndex(Preferred, preferred => preferred.Equals(language, StringComparison.OrdinalIgnoreCase));
        return index >= 0 ? index : int.MaxValue;
    }

    private static string CleanLanguageName(string value)
    {
        var index = value.IndexOf('(');
        return (index >= 0 ? value[..index] : value).Trim();
    }
}
