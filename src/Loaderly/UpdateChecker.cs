using System.Net;
using System.Net.Http;
using System.IO;
using System.Text.Json;

namespace Loaderly;

internal enum UpdateStatus
{
    UpToDate,
    UpdateAvailable,
    NoRelease,
    MissingInstaller
}

internal sealed record UpdateCheckResult(
    UpdateStatus Status,
    string CurrentVersion,
    string? LatestVersion,
    string? InstallerUrl,
    string? InstallerFileName,
    string? ReleaseUrl);

internal sealed class UpdateChecker
{
    private readonly HttpClient httpClient;

    public UpdateChecker()
        : this(new HttpClient())
    {
    }

    public UpdateChecker(HttpClient httpClient)
    {
        this.httpClient = httpClient;
    }

    public async Task<UpdateCheckResult> CheckAsync(CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, ProductInfo.LatestReleaseApiUri);
        request.Headers.UserAgent.ParseAdd($"{ProductInfo.Name}/{ProductInfo.Version}");
        request.Headers.Accept.ParseAdd("application/vnd.github+json");
        request.Headers.TryAddWithoutValidation("X-GitHub-Api-Version", "2022-11-28");

        using var response = await httpClient.SendAsync(request, cancellationToken);
        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return NoRelease();
        }

        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        var release = ParseRelease(json);
        if (release is null || string.IsNullOrWhiteSpace(release.TagName))
        {
            return NoRelease();
        }

        if (!TryParseVersion(release.TagName, out var latest) ||
            !TryParseVersion(ProductInfo.Version, out var current) ||
            latest.CompareTo(current) <= 0)
        {
            return new UpdateCheckResult(
                UpdateStatus.UpToDate,
                ProductInfo.Version,
                release.TagName,
                null,
                null,
                release.HtmlUrl);
        }

        var installer = release.Assets.FirstOrDefault(IsInstallerAsset);
        if (installer is null)
        {
            return new UpdateCheckResult(
                UpdateStatus.MissingInstaller,
                ProductInfo.Version,
                release.TagName,
                null,
                null,
                release.HtmlUrl);
        }

        return new UpdateCheckResult(
            UpdateStatus.UpdateAvailable,
            ProductInfo.Version,
            release.TagName,
            installer.BrowserDownloadUrl,
            installer.Name,
            release.HtmlUrl);
    }

    public async Task<string> DownloadInstallerAsync(UpdateCheckResult update, IProgress<int>? progress, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(update.InstallerUrl))
        {
            throw new InvalidOperationException("Installer URL is missing.");
        }

        var fileName = SafeFileName(string.IsNullOrWhiteSpace(update.InstallerFileName)
            ? $"{ProductInfo.InstallerAssetPrefix}{update.LatestVersion ?? ProductInfo.Version}.exe"
            : update.InstallerFileName);
        var updateFolder = Path.Combine(AppDataFolder.Path, "Updates");
        Directory.CreateDirectory(updateFolder);
        var destination = Path.Combine(updateFolder, fileName);

        using var request = new HttpRequestMessage(HttpMethod.Get, update.InstallerUrl);
        request.Headers.UserAgent.ParseAdd($"{ProductInfo.Name}/{ProductInfo.Version}");
        using var response = await httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        response.EnsureSuccessStatusCode();

        var total = response.Content.Headers.ContentLength;
        await using var input = await response.Content.ReadAsStreamAsync(cancellationToken);
        await using var output = File.Create(destination);
        var buffer = new byte[128 * 1024];
        long readTotal = 0;
        while (true)
        {
            var read = await input.ReadAsync(buffer, cancellationToken);
            if (read == 0)
            {
                break;
            }

            await output.WriteAsync(buffer.AsMemory(0, read), cancellationToken);
            readTotal += read;
            if (total is > 0)
            {
                progress?.Report((int)Math.Clamp(readTotal * 100 / total.Value, 0, 100));
            }
        }

        progress?.Report(100);
        return destination;
    }

    internal static bool TryParseVersion(string? tag, out Version version)
    {
        version = new Version(0, 0, 0);
        if (string.IsNullOrWhiteSpace(tag))
        {
            return false;
        }

        var value = tag.Trim();
        if (value.StartsWith('v') || value.StartsWith('V'))
        {
            value = value[1..];
        }

        if (Version.TryParse(value, out var parsed))
        {
            version = parsed;
            return true;
        }

        return false;
    }

    internal static GitHubRelease? ParseReleaseForTest(string json)
    {
        return ParseRelease(json);
    }

    private static UpdateCheckResult NoRelease()
    {
        return new UpdateCheckResult(
            UpdateStatus.NoRelease,
            ProductInfo.Version,
            null,
            null,
            null,
            ProductInfo.ReleasesUri.ToString());
    }

    private static bool IsInstallerAsset(GitHubReleaseAsset asset)
    {
        return asset.Name.EndsWith(".exe", StringComparison.OrdinalIgnoreCase) &&
               (asset.Name.Contains("setup", StringComparison.OrdinalIgnoreCase) ||
                asset.Name.Contains("installer", StringComparison.OrdinalIgnoreCase) ||
                asset.Name.StartsWith(ProductInfo.InstallerAssetPrefix, StringComparison.OrdinalIgnoreCase)) &&
               !string.IsNullOrWhiteSpace(asset.BrowserDownloadUrl);
    }

    private static GitHubRelease? ParseRelease(string json)
    {
        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;
        var tagName = StringProperty(root, "tag_name");
        var htmlUrl = StringProperty(root, "html_url");
        var assets = new List<GitHubReleaseAsset>();
        if (root.TryGetProperty("assets", out var assetArray) && assetArray.ValueKind == JsonValueKind.Array)
        {
            foreach (var asset in assetArray.EnumerateArray())
            {
                assets.Add(new GitHubReleaseAsset(
                    StringProperty(asset, "name") ?? string.Empty,
                    StringProperty(asset, "browser_download_url") ?? string.Empty));
            }
        }

        return new GitHubRelease(tagName, htmlUrl, assets);
    }

    private static string? StringProperty(JsonElement element, string name)
    {
        return element.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;
    }

    private static string SafeFileName(string fileName)
    {
        var invalid = Path.GetInvalidFileNameChars();
        var cleaned = new string(fileName.Select(character => invalid.Contains(character) ? '-' : character).ToArray());
        return string.IsNullOrWhiteSpace(cleaned) ? $"{ProductInfo.InstallerAssetPrefix}{ProductInfo.Version}.exe" : cleaned;
    }
}

internal sealed record GitHubRelease(string? TagName, string? HtmlUrl, IReadOnlyList<GitHubReleaseAsset> Assets);

internal sealed record GitHubReleaseAsset(string Name, string BrowserDownloadUrl);
