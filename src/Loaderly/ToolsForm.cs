using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net.Http;
using System.Text.Json;
using System.Windows.Forms;

namespace Loaderly;

internal sealed class ToolsForm : Form
{
    private static readonly TimeSpan ToolCommandTimeout = TimeSpan.FromMinutes(5);
    private static readonly string[] ToolNames = ["yt-dlp", "ffmpeg", "ffprobe", "deno"];
    private const int ToolRowHeight = 78;
    private const int ToolStatusRowHeight = 36;
    private const int ToolActionsRowHeight = 54;
    private const string HelpText = "Installed tools are locked. Use Check versions for update checks, or Install / repair all tools to fix missing tools.";
    private readonly Label ytDlpStatus = new();
    private readonly Label ffmpegStatus = new();
    private readonly Label ffprobeStatus = new();
    private readonly Label denoStatus = new();
    private readonly Label operationStatus = new();
    private readonly ModernButton refreshButton = new();
    private readonly ModernButton updateYtDlpButton = new();
    private readonly ModernButton updateAllButton = new();
    private readonly ModernButton closeButton = new();
    private readonly Dictionary<string, ModernButton> toolUpdateButtons = new(StringComparer.OrdinalIgnoreCase);
    private IReadOnlyList<ToolStatusSnapshot> lastSnapshots = [];
    private static readonly HttpClient LatestVersionHttpClient = new()
    {
        Timeout = TimeSpan.FromSeconds(8)
    };
    internal static int ToolCommandTimeoutMillisecondsForTest => (int)ToolCommandTimeout.TotalMilliseconds;
    internal static int ContentFixedHeightForTest => ToolRowHeight * 4 + ToolStatusRowHeight + ToolActionsRowHeight;
    internal static bool WindowAllowsMaximizeForTest => false;
    internal static bool WindowAllowsMinimizeForTest => false;
    internal static bool StartsVersionCheckOnOpenForTest => true;
    internal static bool StartsLatestVersionCheckOnOpenForTest => false;
    internal static bool DisablesCloseWhileBusyForTest => false;
    internal static IReadOnlyList<string> IndividualToolUpdateNamesForTest()
    {
        return ToolNames;
    }

    internal static IReadOnlyList<string> GlobalActionLabelsForTest()
    {
        return ["Check versions", "Update available tools", "Install / repair all tools"];
    }

    internal static IReadOnlyList<string> InstallRepairAllToolNamesForTest()
    {
        return ToolNames;
    }

    public ToolsForm()
    {
        SetStyle(
            ControlStyles.AllPaintingInWmPaint |
            ControlStyles.OptimizedDoubleBuffer |
            ControlStyles.ResizeRedraw,
            true);
        DoubleBuffered = true;
        Text = LoaderlyLanguage.Text("Tools");
        AutoScaleMode = AutoScaleMode.Dpi;
        StartPosition = FormStartPosition.CenterParent;
        MinimumSize = new Size(760, 640);
        Size = new Size(820, 680);
        MaximizeBox = false;
        MinimizeBox = false;
        FormBorderStyle = FormBorderStyle.FixedSingle;
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
        await Task.Yield();
        if (!IsDisposed)
        {
            await RefreshLocalStatusAsync();
        }
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
            Radius = LoaderlyTheme.PanelRadius,
            BackColor = LoaderlyTheme.Surface,
            BorderColor = LoaderlyTheme.Border,
            Padding = new Padding(18)
        };
        root.Controls.Add(panel, 0, 1);

        var layout = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            RowCount = 7,
            ColumnCount = 1,
            BackColor = LoaderlyTheme.Surface
        };
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, ToolRowHeight));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, ToolRowHeight));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, ToolRowHeight));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, ToolRowHeight));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, ToolStatusRowHeight));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, ToolActionsRowHeight));
        layout.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        panel.Controls.Add(layout);

        layout.Controls.Add(ToolRow("yt-dlp", ytDlpStatus, CreateToolUpdateButton("yt-dlp")), 0, 0);
        layout.Controls.Add(ToolRow("ffmpeg", ffmpegStatus, CreateToolUpdateButton("ffmpeg")), 0, 1);
        layout.Controls.Add(ToolRow("ffprobe", ffprobeStatus, CreateToolUpdateButton("ffprobe")), 0, 2);
        layout.Controls.Add(ToolRow("deno", denoStatus, CreateToolUpdateButton("deno")), 0, 3);

        operationStatus.Dock = DockStyle.Fill;
        operationStatus.Text = "Ready.";
        operationStatus.ForeColor = LoaderlyTheme.MutedText;
        operationStatus.Font = LoaderlyTheme.BodyFont(9.4F);
        operationStatus.TextAlign = ContentAlignment.MiddleLeft;
        layout.Controls.Add(operationStatus, 0, 4);

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
        layout.Controls.Add(actions, 0, 5);

        ConfigureButton(refreshButton, "Check versions", primary: false);
        ConfigureButton(updateYtDlpButton, "Update available tools", primary: false);
        ConfigureButton(updateAllButton, "Install / repair all tools", primary: true);
        refreshButton.Dock = DockStyle.Fill;
        updateYtDlpButton.Dock = DockStyle.Fill;
        updateAllButton.Dock = DockStyle.Fill;
        refreshButton.Margin = new Padding(0, 8, 8, 8);
        updateYtDlpButton.Margin = new Padding(8, 8, 8, 8);
        updateAllButton.Margin = new Padding(8, 8, 0, 8);
        actions.Controls.Add(refreshButton, 0, 0);
        actions.Controls.Add(updateYtDlpButton, 1, 0);
        actions.Controls.Add(updateAllButton, 2, 0);

        layout.Controls.Add(new Label
        {
            Dock = DockStyle.Fill,
            Text = HelpText,
            ForeColor = LoaderlyTheme.MutedText,
            Font = LoaderlyTheme.BodyFont(9.3F),
            TextAlign = ContentAlignment.TopLeft
        }, 0, 6);

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
        updateYtDlpButton.Click += async (_, _) => await RunAvailableToolUpdatesAsync();
        updateAllButton.Click += async (_, _) => await RunToolInstallScriptAsync();
    }

    private ModernButton CreateToolUpdateButton(string tool)
    {
        var button = new ModernButton
        {
            Dock = DockStyle.Fill,
            Margin = new Padding(8, 12, 0, 12),
            Enabled = false
        };
        ConfigureButton(button, "Update", primary: false);
        button.Click += async (_, _) => await RunSingleToolUpdateAsync(tool);
        toolUpdateButtons[tool] = button;
        return button;
    }

    private static Control ToolRow(string name, Label statusLabel, Control updateButton)
    {
        var rowHost = new RoundedPanel
        {
            Dock = DockStyle.Fill,
            Radius = LoaderlyTheme.CardRadius,
            BackColor = LoaderlyTheme.SurfaceMuted,
            BorderColor = LoaderlyTheme.Border,
            Padding = new Padding(14, 8, 14, 8),
            Margin = new Padding(0, 0, 0, 10)
        };

        var row = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 3,
            RowCount = 1,
            BackColor = LoaderlyTheme.SurfaceMuted
        };
        row.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 120));
        row.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        row.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 116));
        row.Controls.Add(new Label
        {
            Text = name,
            Dock = DockStyle.Fill,
            ForeColor = LoaderlyTheme.Text,
            Font = LoaderlyTheme.BodyFont(11F),
            TextAlign = ContentAlignment.MiddleLeft
        }, 0, 0);

        statusLabel.Dock = DockStyle.Fill;
        statusLabel.Text = LoaderlyLanguage.Text("Not checked yet");
        statusLabel.ForeColor = LoaderlyTheme.MutedText;
        statusLabel.Font = LoaderlyTheme.BodyFont(9.2F);
        statusLabel.TextAlign = LoaderlyLanguage.IsArabic ? ContentAlignment.MiddleRight : ContentAlignment.MiddleLeft;
        statusLabel.AutoEllipsis = true;
        row.Controls.Add(statusLabel, 1, 0);
        row.Controls.Add(updateButton, 2, 0);
        rowHost.Controls.Add(row);
        return rowHost;
    }

    private async Task RefreshStatusAsync()
    {
        SetBusy(true, "Checking tools...");
        var statuses = await GetToolSnapshotsAsync(includeLatestVersions: true);
        if (IsDisposed)
        {
            return;
        }

        lastSnapshots = statuses;
        ApplyToolStatuses(statuses);
        SetBusy(false, "Ready.");
        UpdateToolButtons();
    }

    private async Task RefreshLocalStatusAsync()
    {
        SetBusy(true, "Checking required tools...");
        var statuses = await GetToolSnapshotsAsync(includeLatestVersions: false);
        if (IsDisposed)
        {
            return;
        }

        lastSnapshots = statuses;
        ApplyToolStatuses(statuses);
        SetBusy(false, "Installed tools checked.");
        UpdateToolButtons();
    }

    private void ApplyToolStatuses(IReadOnlyList<ToolStatusSnapshot> statuses)
    {
        ytDlpStatus.Text = FormatStatus(statuses.First(snapshot => snapshot.Name.Equals("yt-dlp", StringComparison.OrdinalIgnoreCase)));
        ffmpegStatus.Text = FormatStatus(statuses.First(snapshot => snapshot.Name.Equals("ffmpeg", StringComparison.OrdinalIgnoreCase)));
        ffprobeStatus.Text = FormatStatus(statuses.First(snapshot => snapshot.Name.Equals("ffprobe", StringComparison.OrdinalIgnoreCase)));
        denoStatus.Text = FormatStatus(statuses.First(snapshot => snapshot.Name.Equals("deno", StringComparison.OrdinalIgnoreCase)));
    }

    private static async Task<IReadOnlyList<ToolStatusSnapshot>> GetToolSnapshotsAsync(bool includeLatestVersions)
    {
        var statuses = await Task.WhenAll(
            ToolStatusSnapshotAsync("yt-dlp", includeLatestVersions),
            ToolStatusSnapshotAsync("ffmpeg", includeLatestVersions),
            ToolStatusSnapshotAsync("ffprobe", includeLatestVersions),
            ToolStatusSnapshotAsync("deno", includeLatestVersions));
        return statuses;
    }

    private static async Task<ToolStatusSnapshot> ToolStatusSnapshotAsync(string tool, bool includeLatestVersion)
    {
        try
        {
            var path = await ToolLookup.ResolveAsync(tool, CancellationToken.None).ConfigureAwait(false);
            var output = await RunProcessAsync(path, VersionArgument(tool)).ConfigureAwait(false);
            var installedVersion = ParseInstalledVersion(tool, output);
            var latestVersion = includeLatestVersion
                ? await LatestVersionAsync(tool).ConfigureAwait(false)
                : string.Empty;
            return new ToolStatusSnapshot(tool, Installed: true, installedVersion, latestVersion, path);
        }
        catch (Exception ex)
        {
            return new ToolStatusSnapshot(tool, Installed: false, string.Empty, string.Empty, ex.Message);
        }
    }

    private async Task RunAvailableToolUpdatesAsync()
    {
        try
        {
            SetBusy(true, "Updating required tools...");
            var snapshots = lastSnapshots.Count == 0 || NeedsLatestVersionCheckBeforeAvailableUpdate(lastSnapshots)
                ? await GetToolSnapshotsAsync(includeLatestVersions: true)
                : lastSnapshots;
            lastSnapshots = snapshots;
            if (!IsDisposed)
            {
                ApplyToolStatuses(snapshots);
                UpdateToolButtons();
            }

            var plan = RepairPlan(snapshots);
            if (plan.ToolsToRepair.Count == 0)
            {
                SetBusy(false, "All tools are already up to date.");
                return;
            }

            await RunToolInstallScriptForToolsAsync(plan.ToolsToRepair);
            if (IsDisposed)
            {
                return;
            }

            await RefreshStatusAsync();
            if (IsDisposed)
            {
                return;
            }

            operationStatus.Text = RepairSummary(plan);
        }
        catch (Exception ex)
        {
            SetBusy(false, $"Could not update tools: {ex.Message}");
        }
    }

    private async Task RunSingleToolUpdateAsync(string tool)
    {
        try
        {
            SetBusy(true, $"Updating {tool}...");
            await RunToolInstallScriptForToolsAsync([tool]);
            if (IsDisposed)
            {
                return;
            }

            await RefreshStatusAsync();
            if (IsDisposed)
            {
                return;
            }

            operationStatus.Text = $"{LoaderlyLanguage.Text("Updated")}: {tool}.";
        }
        catch (Exception ex)
        {
            SetBusy(false, $"Could not update {tool}: {ex.Message}");
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
            SetBusy(true, "Updating required tools...");
            await RunToolInstallScriptForToolsAsync(ToolNames);
            if (IsDisposed)
            {
                return;
            }

            await RefreshStatusAsync();
            if (IsDisposed)
            {
                return;
            }

            operationStatus.Text = LoaderlyLanguage.Text("Tools update finished.");
        }
        catch (Exception ex)
        {
            SetBusy(false, $"Could not update tools: {ex.Message}");
        }
    }

    private static async Task RunToolInstallScriptForToolsAsync(IReadOnlyList<string> tools)
    {
        var scriptPath = FindInstallScript();
        if (scriptPath is null)
        {
            throw new InvalidOperationException(LoaderlyLanguage.Text("Tool installer script was not found in this build."));
        }

        var toolArguments = string.Join(" ", tools.Select(QuotePowerShellArgument));
        var installDirectory = ToolInstallDirectory();
        await RunProcessAsync(
            "powershell.exe",
            $"-NoProfile -ExecutionPolicy Bypass -File {QuotePowerShellArgument(scriptPath)} -InstallPath {QuotePowerShellArgument(installDirectory)} -Tools {toolArguments}");
        ToolResolver.ClearCache();
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

    private static string ToolInstallDirectory()
    {
        return ToolResolver.UserToolDirectory;
    }

    private static string QuotePowerShellArgument(string value)
    {
        return $"\"{value.Replace("\"", "`\"")}\"";
    }

    private static async Task<string> RunProcessAsync(string fileName, string arguments, TimeSpan? commandTimeout = null)
    {
        using var timeout = new CancellationTokenSource(commandTimeout ?? ToolCommandTimeout);
        var output = new List<string>();
        var error = new List<string>();
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
                lock (error)
                {
                    error.Add(e.Data);
                }
            }
        };

        try
        {
            process.Start();
            process.BeginOutputReadLine();
            process.BeginErrorReadLine();
            await ProcessRunner.WaitForExitAndStreamsAsync(
                process,
                outputClosed.Task,
                errorClosed.Task,
                timeout.Token).ConfigureAwait(false);
        }
        catch (OperationCanceledException)
        {
            throw new TimeoutException("Tool command timed out.");
        }

        string text;
        lock (output)
        {
            text = string.Join(Environment.NewLine, output);
        }

        string errorText;
        lock (error)
        {
            errorText = string.Join(Environment.NewLine, error);
        }

        if (process.ExitCode != 0)
        {
            throw new InvalidOperationException(CommandFailureMessage(text, errorText));
        }

        return text;
    }

    private static string CommandFailureMessage(string standardOutput, string standardError)
    {
        var message = string.Join(
            Environment.NewLine,
            new[] { standardError, standardOutput }
                .Where(part => !string.IsNullOrWhiteSpace(part))
                .Select(part => part.Trim()));
        return string.IsNullOrWhiteSpace(message) ? "Tool command failed." : message;
    }

    private void SetBusy(bool busy, string message)
    {
        refreshButton.Enabled = !busy;
        updateYtDlpButton.Enabled = !busy;
        updateAllButton.Enabled = !busy;
        closeButton.Enabled = true;
        foreach (var button in toolUpdateButtons.Values)
        {
            button.Enabled = !busy && button.Tag is ToolStatusSnapshot snapshot && CanRunSingleToolUpdate(snapshot);
        }

        operationStatus.Text = LoaderlyLanguage.Text(message);
    }

    private void UpdateToolButtons()
    {
        foreach (var snapshot in lastSnapshots)
        {
            if (!toolUpdateButtons.TryGetValue(snapshot.Name, out var button))
            {
                continue;
            }

            button.Tag = snapshot;
            button.Text = LoaderlyLanguage.Text(ToolActionLabel(snapshot));
            button.Enabled = CanRunSingleToolUpdate(snapshot);
        }
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

    internal static string ToolVersionStateForTest(string installedVersion, string latestVersion)
    {
        return ToolVersionState(installedVersion, latestVersion);
    }

    internal static bool CanRunSingleToolUpdateForTest(ToolStatusSnapshot snapshot)
    {
        return CanRunSingleToolUpdate(snapshot);
    }

    internal static string ToolActionLabelForTest(ToolStatusSnapshot snapshot)
    {
        return ToolActionLabel(snapshot);
    }

    internal static string ToolInstallDirectoryForTest()
    {
        return ToolInstallDirectory();
    }

    internal static string HelpTextForTest()
    {
        return HelpText;
    }

    internal static bool NeedsLatestVersionCheckBeforeAvailableUpdateForTest(IReadOnlyList<ToolStatusSnapshot> snapshots)
    {
        return NeedsLatestVersionCheckBeforeAvailableUpdate(snapshots);
    }

    internal static string ParseWingetVersionForTest(string output)
    {
        return ParseWingetVersion(output);
    }

    internal static string CommandFailureMessageForTest(string standardOutput, string standardError)
    {
        return CommandFailureMessage(standardOutput, standardError);
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
            if (tool.Equals("ffmpeg", StringComparison.OrdinalIgnoreCase) ||
                tool.Equals("ffprobe", StringComparison.OrdinalIgnoreCase))
            {
                return await LatestWingetVersionAsync("Gyan.FFmpeg").ConfigureAwait(false);
            }

            var repository = tool.Equals("yt-dlp", StringComparison.OrdinalIgnoreCase)
                ? "yt-dlp/yt-dlp"
                : tool.Equals("deno", StringComparison.OrdinalIgnoreCase)
                    ? "denoland/deno"
                    : string.Empty;
            if (string.IsNullOrWhiteSpace(repository))
            {
                return string.Empty;
            }

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

    private static async Task<string> LatestWingetVersionAsync(string packageId)
    {
        try
        {
            var output = await RunProcessAsync("winget", $"show --id {packageId} -e --accept-source-agreements", TimeSpan.FromSeconds(20)).ConfigureAwait(false);
            return ParseWingetVersion(output);
        }
        catch
        {
            return string.Empty;
        }
    }

    private static string ParseWingetVersion(string output)
    {
        foreach (var line in output.Split(Environment.NewLine, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            const string prefix = "Version:";
            if (line.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            {
                return NormalizeVersionToken(line[prefix.Length..]);
            }
        }

        return string.Empty;
    }

    private static string FormatStatus(string tool, bool installed, string installedVersion, string latestVersion, string pathOrMessage)
    {
        if (!installed)
        {
            return $"{LoaderlyLanguage.Text("Not installed")} | {LoaderlyLanguage.Text("Action")}: {LoaderlyLanguage.Text("Install / repair all tools")}\r\n{pathOrMessage}";
        }

        if (string.IsNullOrWhiteSpace(latestVersion))
        {
            return $"{LoaderlyLanguage.Text("Installed")}: {installedVersion} | {LoaderlyLanguage.Text("Status")}: {LoaderlyLanguage.Text("Installed")}\r\n{pathOrMessage}";
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

        if (byName.TryGetValue("deno", out var deno))
        {
            if (NeedsRepair(deno))
            {
                toolsToRepair.Add("deno");
            }
            else
            {
                skipped.Add("deno");
            }
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

    private static bool CanRunSingleToolUpdate(ToolStatusSnapshot snapshot)
    {
        if (string.IsNullOrWhiteSpace(snapshot.Name))
        {
            return false;
        }

        if (!snapshot.Installed)
        {
            return true;
        }

        return ToolVersionState(snapshot.InstalledVersion, snapshot.LatestVersion)
            .Equals("Update available", StringComparison.Ordinal);
    }

    private static string ToolActionLabel(ToolStatusSnapshot snapshot)
    {
        if (!snapshot.Installed)
        {
            return "Install";
        }

        if (string.IsNullOrWhiteSpace(snapshot.LatestVersion))
        {
            return "Installed";
        }

        return ToolVersionState(snapshot.InstalledVersion, snapshot.LatestVersion) switch
        {
            "Update available" => "Update",
            "Up to date" => "Up to date",
            "Check manually" => "Check manually",
            _ => "Installed"
        };
    }

    private static bool NeedsLatestVersionCheckBeforeAvailableUpdate(IReadOnlyList<ToolStatusSnapshot> snapshots)
    {
        return snapshots.Any(snapshot => snapshot.Installed && string.IsNullOrWhiteSpace(snapshot.LatestVersion));
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
        button.Radius = LoaderlyTheme.ControlRadius;
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
