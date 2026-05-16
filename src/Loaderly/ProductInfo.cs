namespace Loaderly;

internal static class ProductInfo
{
    public const string Name = "Loaderly";
    public const string Version = "1.0.0";
    public const string GitHubOwner = "voidksa";
    public const string GitHubRepository = "Loaderly";
    public const string InstallerAssetPrefix = "Loaderly-Setup-";
    public const string SingleInstanceMutexName = "Loaderly.Loaderly";

    public static string DisplayVersion => $"v{Version}";

    public static Uri LatestReleaseApiUri { get; } =
        new($"https://api.github.com/repos/{GitHubOwner}/{GitHubRepository}/releases/latest");

    public static Uri ReleasesUri { get; } =
        new($"https://github.com/{GitHubOwner}/{GitHubRepository}/releases");
}
