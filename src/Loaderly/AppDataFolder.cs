namespace Loaderly;

internal static class AppDataFolder
{
    public static string Path { get; } = ResolvePath();

    private static string ResolvePath()
    {
        var overridePath = Environment.GetEnvironmentVariable("LOADERLY_APPDATA_PATH");
        if (!string.IsNullOrWhiteSpace(overridePath))
        {
            return overridePath;
        }

        return System.IO.Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "Loaderly");
    }
}
