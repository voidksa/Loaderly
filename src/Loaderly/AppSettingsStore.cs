using System.IO;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Loaderly;

internal sealed class AppSettings
{
    public string DownloadFolder { get; set; } = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
        "Downloads",
        "Loaderly");

    public List<string> SavedFolders { get; set; } = [];

    public bool WriteSubtitles { get; set; } = true;

    public string SubtitleLanguages { get; set; } = SubtitleLanguagePreference.DefaultLanguages;

    public bool SubtitlePreferenceConfigured { get; set; }

    public bool EnableNotifications { get; set; } = true;

    public bool UseModernToastNotifications { get; set; } = true;

    public bool MinimizeToTray { get; set; } = true;

    public string ThemeMode { get; set; } = "System";

    public string AppLanguage { get; set; } = string.Empty;

    public bool FirstRunComplete { get; set; } = true;

    public string TrimUndoShortcut { get; set; } = "Ctrl+Z";

    public string TrimRedoShortcut { get; set; } = "Ctrl+Y";

    public string TrimSaveShortcut { get; set; } = "Ctrl+S";

    public string TrimResetShortcut { get; set; } = "Ctrl+R";

    public SubtitleStyle SubtitleStyle { get; set; } = new();

    [JsonIgnore]
    public string OpenRouterApiKey { get; set; } = string.Empty;

    [JsonPropertyName("openRouterApiKey")]
    public string? LegacyOpenRouterApiKey { get; set; }

    public string OpenRouterApiKeyProtected { get; set; } = string.Empty;

    public string OpenRouterModel { get; set; } = string.Empty;

    public string AiSubtitleTargetLanguage { get; set; } = "Arabic";
}

internal sealed class SubtitleStyle
{
    public string FontFamily { get; set; } = "Segoe UI";

    public float FontSize { get; set; } = 24F;

    public bool Bold { get; set; } = true;

    public string TextColor { get; set; } = "#FFFFFF";

    public string BackgroundColor { get; set; } = "#000000";

    public int BackgroundOpacity { get; set; } = 70;

    public SubtitleStyle Clone()
    {
        return new SubtitleStyle
        {
            FontFamily = FontFamily,
            FontSize = FontSize,
            Bold = Bold,
            TextColor = TextColor,
            BackgroundColor = BackgroundColor,
            BackgroundOpacity = BackgroundOpacity
        };
    }
}

internal sealed class AppSettingsStore
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private readonly string settingsPath;

    public AppSettingsStore()
    {
        settingsPath = Path.Combine(AppDataFolder.Path, "settings.json");
    }

    public AppSettings Load()
    {
        if (!File.Exists(settingsPath))
        {
            var settings = new AppSettings { FirstRunComplete = false };
            NormalizeForRuntime(settings);
            return settings;
        }

        try
        {
            var json = File.ReadAllText(settingsPath);
            var settings = JsonSerializer.Deserialize<AppSettings>(json, JsonOptions) ?? new AppSettings();
            NormalizeForRuntime(settings);
            return settings;
        }
        catch
        {
            var settings = new AppSettings();
            NormalizeForRuntime(settings);
            return settings;
        }
    }

    public void Save(AppSettings settings)
    {
        NormalizeForRuntime(settings);
        Directory.CreateDirectory(Path.GetDirectoryName(settingsPath)!);
        var json = JsonSerializer.Serialize(settings, JsonOptions);
        File.WriteAllText(settingsPath, json);
    }

    internal static string SerializeForTest(AppSettings settings)
    {
        NormalizeForRuntime(settings);
        return JsonSerializer.Serialize(settings, JsonOptions);
    }

    internal static AppSettings DeserializeForTest(string json)
    {
        var settings = JsonSerializer.Deserialize<AppSettings>(json, JsonOptions) ?? new AppSettings();
        NormalizeForRuntime(settings);
        return settings;
    }

    internal static void NormalizeForRuntime(AppSettings settings)
    {
        if (string.IsNullOrWhiteSpace(settings.DownloadFolder))
        {
            settings.DownloadFolder = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
                "Downloads",
                "Loaderly");
        }

        settings.SavedFolders = settings.SavedFolders
            .Where(path => !string.IsNullOrWhiteSpace(path))
            .Select(path => path.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (!settings.SavedFolders.Contains(settings.DownloadFolder, StringComparer.OrdinalIgnoreCase))
        {
            settings.SavedFolders.Insert(0, settings.DownloadFolder);
        }

        settings.SubtitleLanguages = SubtitleLanguagePreference.Normalize(settings.SubtitleLanguages);
        if (!settings.SubtitlePreferenceConfigured &&
            settings.SubtitleLanguages.Equals("all,-live_chat", StringComparison.OrdinalIgnoreCase))
        {
            settings.SubtitleLanguages = SubtitleLanguagePreference.DefaultLanguages;
        }

        settings.SubtitleStyle ??= new SubtitleStyle();
        if (string.IsNullOrWhiteSpace(settings.SubtitleStyle.FontFamily))
        {
            settings.SubtitleStyle.FontFamily = "Segoe UI";
        }

        settings.SubtitleStyle.FontSize = Math.Clamp(settings.SubtitleStyle.FontSize, 14F, 52F);
        settings.SubtitleStyle.BackgroundOpacity = Math.Clamp(settings.SubtitleStyle.BackgroundOpacity, 0, 100);
        settings.SubtitleStyle.TextColor = NormalizeColor(settings.SubtitleStyle.TextColor, "#FFFFFF");
        settings.SubtitleStyle.BackgroundColor = NormalizeColor(settings.SubtitleStyle.BackgroundColor, "#000000");
        settings.OpenRouterApiKey = RuntimeOpenRouterApiKey(settings);
        settings.OpenRouterApiKeyProtected = string.IsNullOrWhiteSpace(settings.OpenRouterApiKey)
            ? string.Empty
            : SecretProtector.Protect(settings.OpenRouterApiKey);
        settings.LegacyOpenRouterApiKey = null;
        settings.OpenRouterModel = settings.OpenRouterModel?.Trim() ?? string.Empty;
        settings.AiSubtitleTargetLanguage = string.IsNullOrWhiteSpace(settings.AiSubtitleTargetLanguage)
            ? "Arabic"
            : settings.AiSubtitleTargetLanguage.Trim();
        settings.AppLanguage = string.IsNullOrWhiteSpace(settings.AppLanguage)
            ? LoaderlyLanguage.FromInstallerOrSystem()
            : LoaderlyLanguage.Normalize(settings.AppLanguage);
    }

    internal static AppSettings NewInstallDefaultsForTest()
    {
        var settings = new AppSettings { FirstRunComplete = false };
        NormalizeForRuntime(settings);
        return settings;
    }

    private static string NormalizeColor(string? value, string fallback)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return fallback;
        }

        var trimmed = value.Trim();
        if (!trimmed.StartsWith('#'))
        {
            trimmed = $"#{trimmed}";
        }

        return trimmed.Length == 7 ? trimmed.ToUpperInvariant() : fallback;
    }

    private static string RuntimeOpenRouterApiKey(AppSettings settings)
    {
        if (!string.IsNullOrWhiteSpace(settings.OpenRouterApiKey))
        {
            return settings.OpenRouterApiKey.Trim();
        }

        if (!string.IsNullOrWhiteSpace(settings.OpenRouterApiKeyProtected))
        {
            return SecretProtector.Unprotect(settings.OpenRouterApiKeyProtected);
        }

        return settings.LegacyOpenRouterApiKey?.Trim() ?? string.Empty;
    }
}
