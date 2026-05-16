using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net.Http;
using System.Text.Json;
using System.Windows.Forms;

namespace Loaderly;

internal sealed class ToolsForm : Form
{
    private readonly Label ytDlpStatus = new();
    private readonly Label ffmpegStatus = new();
    private readonly Label ffprobeStatus = new();
    private readonly Label operationStatus = new();
    private readonly ModernButton refreshButton = new();
    private readonly ModernButton updateYtDlpButton = new();
    private readonly ModernButton updateAllButton = new();
    private readonly ModernButton closeButton = new();
    private IReadOnlyList<ToolStatusSnapshot> lastSnapshots = [];
    private static readonly HttpClient LatestVersionHttpClient = new()
    {
        Timeout = TimeSpan.FromSeconds(8)
    };

    public ToolsForm()
    {
        Text = LoaderlyLanguage.Text("Tools");
        AutoScaleMode = AutoScaleMode.Dpi;
        StartPosition = FormStartPosition.CenterParent;
        MinimumSize = new Size(760, 640);
        Size = new Size(820, 680);
        BackColor = LoaderlyTheme.Window;
        Font = LoaderlyTheme.BodyFont(10F);

        BuildUi();
        LoaderlyLanguage.ApplyTo(this);
        BindEvents();
    }

    protected override async void OnShown(EventArgs e)
    {
        base.OnShown(e);
        WindowsTheme.ApplyTitleBarTheme(this);
        await RefreshStatusAsync();
    }

    private void BuildUi()
    {
        var root = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            RowCount = 3,
            ColumnCount = 1,
            Padding = new Padding(24),
            BackColor = LoaderlyTheme.Window
        };
        root.RowStyles.Add(new RowStyle(SizeType.Absolute, 64));
        root.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        root.RowStyles.Add(new RowStyle(SizeType.Absolute, 68));
        Controls.Add(root);

        root.Controls.Add(new Label
        {
            Text = "Tools",
            Dock = DockStyle.Fill,
            ForeColor = LoaderlyTheme.Text,
            Font = LoaderlyTheme.TitleFont(20F),
            TextAlign = ContentAlignment.MiddleLeft
        }, 0, 0);

        var panel = new RoundedPanel
        {
            Dock = DockStyle.Fill,
            Radius = 12,
            BackColor = LoaderlyTheme.Surface,
            BorderColor = LoaderlyTheme.Border,
            Padding = new Padding(18)
        };
        root.Controls.Add(panel, 0, 1);

        var layout = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            RowCount = 6,
            ColumnCount = 1,
            BackColor = LoaderlyTheme.Surface
        };
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 104));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 104));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 104));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 48));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 70));
        layout.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        panel.Controls.Add(layout);

        layout.Controls.Add(ToolRow("yt-dlp", ytDlpStatus), 0, 0);
        layout.Controls.Add(ToolRow("ffmpeg", ffmpegStatus), 0, 1);
        layout.Controls.Add(ToolRow("ffprobe", ffprobeStatus), 0, 2);

        operationStatus.Dock = DockStyle.Fill;
        operationStatus.Text = "Ready.";
        operationStatus.ForeColor = LoaderlyTheme.MutedText;
        operationStatus.Font = LoaderlyTheme.BodyFont(9.4F);
        operationStatus.TextAlign = ContentAlignment.MiddleLeft;
        layout.Controls.Add(operationStatus, 0, 3);

        var actions = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 3,
            RowCount = 1,
            BackColor = LoaderlyTheme.Surface
        };
        actions.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 33.33F));
        actions.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 33.33F));
        actions.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 33.33F));
        layout.Controls.Add(actions, 0, 4);

        ConfigureButton(refreshButton, "Check versions", primary: false);
        ConfigureButton(updateYtDlpButton, "Update yt-dlp only", primary: false);
        ConfigureButton(updateAllButton, "Install / repair all tools", primary: true);
        refreshButton.Dock = DockStyle.Fill;
        updateYtDlpButton.Dock = DockStyle.Fill;
        updateAllButton.Dock = DockStyle.Fill;
        refreshButton.Margin = new Padding(0, 12, 8, 12);
        updateYtDlpButton.Margin = new Padding(8, 12, 8, 12);
        updateAllButton.Margin = new Padding(8, 12, 0, 12);
        actions.Controls.Add(refreshButton, 0, 0);
        actions.Controls.Add(updateYtDlpButton, 1, 0);
        actions.Controls.Add(updateAllButton, 2, 0);

        layout.Controls.Add(new Label
        {
            Dock = DockStyle.Fill,
            Text = "The installer includes these tools when the release is built with tools\\windows. Use Install / repair all tools if one is missing, and update yt-dlp only when a site stops working.",
            ForeColor = LoaderlyTheme.MutedText,
            Font = LoaderlyTheme.BodyFont(9.3F),
            TextAlign = ContentAlignment.TopLeft
        }, 0, 5);

        var bottom = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 2,
            RowCount = 1,
            BackColor = LoaderlyTheme.Window
        };
        bottom.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        bottom.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 128));
        root.Controls.Add(bottom, 0, 2);

        ConfigureButton(closeButton, "Close", primary: false);
        closeButton.Dock = DockStyle.Fill;
        closeButton.Margin = new Padding(0, 14, 0, 6);
        bottom.Controls.Add(closeButton, 1, 0);
    }

    private void BindEvents()
    {
        closeButton.Click += (_, _) => Close();
        refreshButton.Click += async (_, _) => await RefreshStatusAsync();
        updateYtDlpButton.Click += async (_, _) => await RunYtDlpUpdateAsync();
        updateAllButton.Click += async (_, _) => await RunToolInstallScriptAsync();
    }

    private static Control ToolRow(string name, Label statusLabel)
    {
        var row = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 2,
            RowCount = 1,
            BackColor = LoaderlyTheme.Surface,
            Margin = new Padding(0, 0, 0, 10)
        };
        row.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 120));
        row.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        row.Controls.Add(new Label
        {
            Text = name,
            Dock = DockStyle.Fill,
            ForeColor = LoaderlyTheme.Text,
            Font = LoaderlyTheme.BodyFont(11F),
            TextAlign = ContentAlignment.MiddleLeft
        }, 0, 0);

        statusLabel.Dock = DockStyle.Fill;
        statusLabel.Text = "Checking...";
        statusLabel.ForeColor = LoaderlyTheme.MutedText;
        statusLabel.Font = LoaderlyTheme.BodyFont(9.2F);
        statusLabel.TextAlign = LoaderlyLanguage.IsArabic ? ContentAlignment.MiddleRight : ContentAlignment.MiddleLeft;
        statusLabel.AutoEllipsis = true;
        row.Controls.Add(statusLabel, 1, 0);
        return row;
    }

    private async Task RefreshStatusAsync()
    {
        SetBusy(true, "Checking tools...");
        var statuses = await GetToolSnapshotsAsync();
        lastSnapshots = statuses;
        ytDlpStatus.Text = FormatStatus(statuses[0]);
        ffmpegStatus.Text = FormatStatus(statuses[1]);
        ffprobeStatus.Text = FormatStatus(statuses[2]);
        SetBusy(false, "Ready.");
    }

    private static async Task<IReadOnlyList<ToolStatusSnapshot>> GetToolSnapshotsAsync()
    {
        var statuses = await Task.WhenAll(
            ToolStatusSnapshotAsync("yt-dlp"),
            ToolStatusSnapshotAsync("ffmpeg"),
            ToolStatusSnapshotAsync("ffprobe"));
        return statuses;
    }

    private static async Task<ToolStatusSnapshot> ToolStatusSnapshotAsync(string tool)
    {
        try
        {
            var path = ToolResolver.ResolveToolPath(tool);
            var output = await RunProcessAsync(path, VersionArgument(tool));
            var installedVersion = ParseInstalledVersion(tool, output);
            var latestVersion = await LatestVersionAsync(tool);
            return new ToolStatusSnapshot(tool, Installed: true, installedVersion, latestVersion, path);
        }
        catch (Exception ex)
        {
            return new ToolStatusSnapshot(tool, Installed: false, string.Empty, string.Empty, ex.Message);
        }
    }

    private async Task RunYtDlpUpdateAsync()
    {
        try
        {
            SetBusy(true, "Updating yt-dlp...");
            var path = ToolResolver.ResolveToolPath("yt-dlp");
            var output = await RunProcessAsync(path, "-U");
            operationStatus.Text = LoaderlyLanguage.Text(string.IsNullOrWhiteSpace(output) ? "yt-dlp update finished." : "yt-dlp update finished.");
            await RefreshStatusAsync();
        }
        catch (Exception ex)
        {
            SetBusy(false, $"Could not update yt-dlp: {ex.Message}");
        }
    }

    private async Task RunToolInstallScriptAsync()
    {
        var scriptPath = FindInstallScript();
        if (scriptPath is null)
        {
            operationStatus.Text = LoaderlyLanguage.Text("Tool installer script was not found in this build.");
            return;
        }

        try
        {
            SetBusy(true, "Checking required tools...");
            var snapshots = lastSnapshots.Count == 0 ? await GetToolSnapshotsAsync() : lastSnapshots;
            var plan = RepairPlan(snapshots);
            if (plan.ToolsToRepair.Count == 0)
            {
                SetBusy(false, "All tools are already up to date.");
                return;
            }

            SetBusy(true, "Updating required tools...");
            var toolArguments = string.Join(" ", plan.ToolsToRepair);
            var output = await RunProcessAsync("powershell.exe", $"-ExecutionPolicy Bypass -File \"{scriptPath}\" -Tools {toolArguments}");
            CopyUpdatedToolsToAppFolder(scriptPath);
            await RefreshStatusAsync();
            operationStatus.Text = RepairSummary(plan);
        }
        catch (Exception ex)
        {
            SetBusy(false, $"Could not update tools: {ex.Message}");
        }
    }

    private static string? FindInstallScript()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null)
        {
            var candidate = Path.Combine(directory.FullName, "script", "install_windows_tools.ps1");
            if (File.Exists(candidate))
            {
                return candidate;
            }

            directory = directory.Parent;
        }

        return null;
    }

    private static void CopyUpdatedToolsToAppFolder(string scriptPath)
    {
        var root = Directory.GetParent(Path.GetDirectoryName(scriptPath)!)?.FullName;
        if (root is null)
        {
            return;
        }

        var sourceTools = Path.Combine(root, "tools", "windows");
        if (!Directory.Exists(sourceTools))
        {
            return;
        }

        var appTools = Path.Combine(AppContext.BaseDirectory, "tools", "windows");
        Directory.CreateDirectory(appTools);
        foreach (var file in Directory.GetFiles(sourceTools, "*.exe"))
        {
            File.Copy(file, Path.Combine(appTools, Path.GetFileName(file)), overwrite: true);
        }
    }

    private static async Task<string> RunProcessAsync(string fileName, string arguments)
    {
        var output = new List<string>();
        using var process = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = fileName,
                Arguments = arguments,
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true
            }
        };
        ToolResolver.AddToolDirectoriesToPath(process.StartInfo);
        var outputClosed = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var errorClosed = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        process.OutputDataReceived += (_, e) =>
        {
            if (e.Data is null)
            {
                outputClosed.TrySetResult();
                return;
            }

            if (!string.IsNullOrWhiteSpace(e.Data))
            {
                lock (output)
                {
                    output.Add(e.Data);
                }
            }
        };
        process.ErrorDataReceived += (_, e) =>
        {
            if (e.Data is null)
            {
                errorClosed.TrySetResult();
                return;
            }

            if (!string.IsNullOrWhiteSpace(e.Data))
            {
                lock (output)
                {
                    output.Add(e.Data);
                }
            }
        };

        process.Start();
        process.BeginOutputReadLine();
        process.BeginErrorReadLine();
        await ProcessRunner.WaitForExitAndStreamsAsync(
            process,
            outputClosed.Task,
            errorClosed.Task,
            CancellationToken.None).ConfigureAwait(false);

        string text;
        lock (output)
        {
            text = string.Join(Environment.NewLine, output);
        }
        if (process.ExitCode != 0)
        {
            throw new InvalidOperationException(string.IsNullOrWhiteSpace(text) ? "Tool command failed." : text);
        }

        return text;
    }

    private void SetBusy(bool busy, string message)
    {
        refreshButton.Enabled = !busy;
        updateYtDlpButton.Enabled = !busy;
        updateAllButton.Enabled = !busy;
        closeButton.Enabled = !busy;
        operationStatus.Text = LoaderlyLanguage.Text(message);
    }

    internal static string VersionArgumentForTest(string tool)
    {
        return VersionArgument(tool);
    }

    internal static string ParseInstalledVersionForTest(string tool, string output)
    {
        return ParseInstalledVersion(tool, output);
    }

    internal static string FormatStatusForTest(string tool, bool installed, string installedVersion, string latestVersion, string pathOrMessage)
    {
        return FormatStatus(tool, installed, installedVersion, latestVersion, pathOrMessage);
    }

    internal static ToolRepairPlan RepairPlanForTest(IReadOnlyList<ToolStatusSnapshot> snapshots)
    {
        return RepairPlan(snapshots);
    }

    private static string VersionArgument(string tool)
    {
        return tool.Equals("ffmpeg", StringComparison.OrdinalIgnoreCase) ||
               tool.Equals("ffprobe", StringComparison.OrdinalIgnoreCase)
            ? "-version"
            : "--version";
    }

    private static string ParseInstalledVersion(string tool, string output)
    {
        var firstLine = output.Split(Environment.NewLine, StringSplitOptions.RemoveEmptyEntries)
            .FirstOrDefault(line => line.Contains("version", StringComparison.OrdinalIgnoreCase)) ??
            output.Split(Environment.NewLine, StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ??
            string.Empty;

        if (tool.Equals("ffmpeg", StringComparison.OrdinalIgnoreCase) ||
            tool.Equals("ffprobe", StringComparison.OrdinalIgnoreCase))
        {
            var parts = firstLine.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            var versionIndex = Array.FindIndex(parts, part => part.Equals("version", StringComparison.OrdinalIgnoreCase));
            if (versionIndex >= 0 && versionIndex + 1 < parts.Length)
            {
                return NormalizeVersionToken(parts[versionIndex + 1]);
            }
        }

        return NormalizeVersionToken(firstLine);
    }

    private static async Task<string> LatestVersionAsync(string tool)
    {
        try
        {
            var repository = tool.Equals("yt-dlp", StringComparison.OrdinalIgnoreCase)
                ? "yt-dlp/yt-dlp"
                : "GyanD/codexffmpeg";
            using var request = new HttpRequestMessage(HttpMethod.Get, $"https://api.github.com/repos/{repository}/releases/latest");
            request.Headers.UserAgent.ParseAdd($"{ProductInfo.Name}/{ProductInfo.Version}");
            request.Headers.Accept.ParseAdd("application/vnd.github+json");
            using var response = await LatestVersionHttpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();
            var json = await response.Content.ReadAsStringAsync();
            using var document = JsonDocument.Parse(json);
            var tag = document.RootElement.TryGetProperty("tag_name", out var tagElement)
                ? tagElement.GetString()
                : string.Empty;
            return NormalizeVersionToken(tag ?? string.Empty);
        }
        catch
        {
            return string.Empty;
        }
    }

    private static string FormatStatus(string tool, bool installed, string installedVersion, string latestVersion, string pathOrMessage)
    {
        if (!installed)
        {
            return $"{LoaderlyLanguage.Text("Not installed")} | {LoaderlyLanguage.Text("Action")}: {LoaderlyLanguage.Text("Install / repair all tools")}\r\n{pathOrMessage}";
        }

        var latestText = string.IsNullOrWhiteSpace(latestVersion)
            ? LoaderlyLanguage.Text("Latest unavailable")
            : latestVersion;
        var status = ToolVersionState(installedVersion, latestVersion);
        return $"{LoaderlyLanguage.Text("Installed")}: {installedVersion} | {LoaderlyLanguage.Text("Latest")}: {latestText} | {LoaderlyLanguage.Text("Status")}: {LoaderlyLanguage.Text(status)}\r\n{pathOrMessage}";
    }

    private static string FormatStatus(ToolStatusSnapshot snapshot)
    {
        return FormatStatus(snapshot.Name, snapshot.Installed, snapshot.InstalledVersion, snapshot.LatestVersion, snapshot.PathOrMessage);
    }

    private static ToolRepairPlan RepairPlan(IReadOnlyList<ToolStatusSnapshot> snapshots)
    {
        var byName = snapshots.ToDictionary(snapshot => snapshot.Name, StringComparer.OrdinalIgnoreCase);
        var toolsToRepair = new List<string>();
        var skipped = new List<string>();

        if (byName.TryGetValue("yt-dlp", out var ytDlp) && NeedsRepair(ytDlp))
        {
            toolsToRepair.Add("yt-dlp");
        }
        else
        {
            skipped.Add("yt-dlp");
        }

        var ffmpegNeedsRepair = byName.TryGetValue("ffmpeg", out var ffmpeg) && NeedsRepair(ffmpeg);
        var ffprobeNeedsRepair = byName.TryGetValue("ffprobe", out var ffprobe) && NeedsRepair(ffprobe);
        if (ffmpegNeedsRepair || ffprobeNeedsRepair)
        {
            toolsToRepair.Add("ffmpeg");
        }
        else
        {
            skipped.Add("ffmpeg");
            skipped.Add("ffprobe");
        }

        return new ToolRepairPlan(toolsToRepair, skipped);
    }

    private static bool NeedsRepair(ToolStatusSnapshot snapshot)
    {
        if (!snapshot.Installed)
        {
            return true;
        }

        return ToolVersionState(snapshot.InstalledVersion, snapshot.LatestVersion).Equals("Update available", StringComparison.Ordinal);
    }

    private static string RepairSummary(ToolRepairPlan plan)
    {
        var updated = plan.ToolsToRepair.Count == 0
            ? LoaderlyLanguage.Text("None")
            : string.Join(", ", plan.ToolsToRepair);
        var skipped = plan.SkippedTools.Count == 0
            ? LoaderlyLanguage.Text("None")
            : string.Join(", ", plan.SkippedTools);
        return $"{LoaderlyLanguage.Text("Updated")}: {updated}. {LoaderlyLanguage.Text("Skipped")}: {skipped}.";
    }

    private static string ToolVersionState(string installedVersion, string latestVersion)
    {
        if (string.IsNullOrWhiteSpace(latestVersion))
        {
            return "Latest unavailable";
        }

        if (!TryParseComparableVersion(installedVersion, out var installed) ||
            !TryParseComparableVersion(latestVersion, out var latest))
        {
            return installedVersion.Equals(latestVersion, StringComparison.OrdinalIgnoreCase)
                ? "Up to date"
                : "Check manually";
        }

        return installed >= latest ? "Up to date" : "Update available";
    }

    private static string NormalizeVersionToken(string value)
    {
        var trimmed = value.Trim().TrimStart('v', 'V', 'n', 'N');
        var chars = new List<char>();
        foreach (var character in trimmed)
        {
            if (char.IsDigit(character) || character == '.')
            {
                chars.Add(character);
                continue;
            }

            if (chars.Count > 0)
            {
                break;
            }
        }

        var normalized = new string(chars.ToArray()).Trim('.');
        return string.IsNullOrWhiteSpace(normalized) ? trimmed : normalized;
    }

    private static bool TryParseComparableVersion(string value, out Version version)
    {
        var normalized = NormalizeVersionToken(value);
        version = new Version(0, 0);
        if (Version.TryParse(normalized, out var parsed))
        {
            version = parsed;
            return true;
        }

        return false;
    }

    private static void ConfigureButton(ModernButton button, string text, bool primary)
    {
        button.Text = text;
        button.Radius = 8;
        button.FillColor = primary ? LoaderlyTheme.Accent : LoaderlyTheme.SurfaceMuted;
        button.HoverColor = primary ? LoaderlyTheme.AccentHover : Color.Empty;
        button.PressedColor = primary ? LoaderlyTheme.AccentPressed : Color.Empty;
        button.ForeColor = primary ? Color.White : LoaderlyTheme.Text;
    }
}

internal sealed record ToolStatusSnapshot(
    string Name,
    bool Installed,
    string InstalledVersion,
    string LatestVersion,
    string PathOrMessage);

internal sealed record ToolRepairPlan(
    IReadOnlyList<string> ToolsToRepair,
    IReadOnlyList<string> SkippedTools);
