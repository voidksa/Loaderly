using System.IO;
using System.Globalization;
using System.Drawing;
using Loaderly;
using Loaderly.Setup;

var failures = new List<string>();

Expect(
    "friendly Windows Media Player capability guidance",
    TrimForm.MediaPreviewFailureStatusForTest(
        new InvalidOperationException("Windows Media Player version 10 or later is required.")),
    "Windows Media Player feature is missing. Run as administrator: DISM /Online /Add-Capability /CapabilityName:Media.WindowsMediaPlayer~~~~0.0.12.0");

Expect(
    "preserves unrelated preview failures",
    TrimForm.MediaPreviewFailureStatusForTest(new InvalidOperationException("Unsupported video format")),
    "Unsupported video format");

ExpectTrue(
    "installer explicit uninstall mode",
    SetupMode.ShouldUseUninstallModeForTest(true, null, "1.0.0"));

ExpectTrue(
    "installer opens as uninstall when app is already installed",
    SetupMode.ShouldUseUninstallModeForTest(false, "1.0.0", "1.0.0"));

ExpectFalse(
    "installer can force repair/install mode by argument",
    SetupMode.ShouldUseUninstallModeForTest(false, true, "1.0.0", "1.0.0"));

ExpectTrue(
    "installer recognizes explicit repair argument",
    SetupMode.ShouldForceInstallForTest(["--repair"]));

ExpectFalse(
    "newer installer opens as update instead of uninstall",
    SetupMode.ShouldUseUninstallModeForTest(false, "1.0.0", "1.1.0"));

ExpectTrue(
    "newer installer recognizes update mode",
    SetupMode.ShouldUseUpdateModeForTest([], "1.0.0", "1.1.0"));

ExpectTrue(
    "explicit update argument uses update mode",
    SetupMode.ShouldUseUpdateModeForTest(["--update"], "1.0.0", "1.1.0"));

ExpectTrue(
    "installer uninstall layout keeps actions below toggles",
    SetupLayoutMetrics.OptionButtonGapForTest(uninstallMode: true) >= 24);

ExpectTrue(
    "installer install layout keeps actions below toggles",
    SetupLayoutMetrics.OptionButtonGapForTest(uninstallMode: false) >= 24);

ExpectTrue(
    "installer custom controls avoid square corner backgrounds",
    SetupChrome.UsesTransparentControlBackgroundsForTest());

ExpectTrue(
    "installer rounded hosts use softer corners",
    SetupChrome.RoundedPanelRadiusForTest >= 10);

ExpectTrue(
    "installer buttons match the rounded setup chrome",
    SetupChrome.ButtonRadiusForTest >= 10);

ExpectTrue(
    "installer progress line fits between options and actions",
    SetupLayoutMetrics.ProgressButtonGapForTest(uninstallMode: false) >= 8 &&
    SetupLayoutMetrics.ProgressButtonGapForTest(uninstallMode: true) >= 8);

ExpectSequence(
    "installer exposes visible install progress stages",
    SetupProgress.InstallStageLabelsForTest(),
    ["Closing Loaderly", "Preparing folder", "Copying files", "Creating shortcuts", "Finishing"]);
Expect(
    "installer progress can show the file currently being copied",
    SetupProgress.ProgressTextForTest(SetupProgress.CopyingFiles, "Loaderly.exe", ar: false),
    "Copying files: Loaderly.exe");

var setupSource = File.ReadAllText(Path.Combine(RepositoryRoot(), "src", "Loaderly.Setup", "Program.cs"));
ExpectFalse(
    "installer Arabic layout does not mirror the whole custom drawn window",
    setupSource.Contains("            RightToLeftLayout = ar;", StringComparison.Ordinal));
ExpectFalse(
    "installer buttons avoid unsupported transparent native borders",
    setupSource.Contains("BorderColor = Color.Transparent", StringComparison.Ordinal));
ExpectTrue(
    "installer buttons disable native visual background painting",
    setupSource.Contains("UseVisualStyleBackColor = false", StringComparison.Ordinal));

ExpectSequence(
    "installer launches only after success acknowledgement",
    SetupMode.InstallCompletionStepsForTest(launchAfterInstall: true),
    [
        SetupCompletionStep.ShowSuccessMessage,
        SetupCompletionStep.CloseInstaller,
        SetupCompletionStep.LaunchApp
    ]);

ExpectTrue(
    "installer quiet launch is explicit",
    SetupMode.ShouldLaunchAfterQuietInstallForTest(["--quiet", "--launch"]));

ExpectFalse(
    "installer quiet install does not launch by default",
    SetupMode.ShouldLaunchAfterQuietInstallForTest(["--quiet"]));

Expect(
    "installer accepts custom install directory",
    SetupMode.InstallDirectoryArgumentForTest([@"--install-dir=C:\Apps\Loaderly"]) ?? "",
    @"C:\Apps\Loaderly");

var buildScript = File.ReadAllText(Path.Combine(RepositoryRoot(), "script", "build_windows.ps1"));
ExpectTrue(
    "windows build uses custom setup project",
    buildScript.Contains("Loaderly.Setup", StringComparison.Ordinal) &&
    buildScript.Contains("Loaderly-Setup-$Version.exe", StringComparison.Ordinal));
ExpectFalse(
    "windows build does not use Inno Setup packaging",
    buildScript.Contains("ISCC", StringComparison.OrdinalIgnoreCase) ||
    buildScript.Contains("Loaderly.iss", StringComparison.OrdinalIgnoreCase));
Expect(
    "feature release bumps Loaderly version",
    ProductInfo.Version,
    "1.1.0");
Expect(
    "about support uses Buy Me a Coffee only",
    AboutForm.BuyMeACoffeeSupportUrl,
    "https://buymeacoffee.com/voidksa");
ExpectTrue(
    "windows build emits the 1.1.0 installer",
    buildScript.Contains("$Version = \"1.1.0\"", StringComparison.Ordinal));
Expect(
    "trim export custom file names stay in the source folder",
    TrimExportService.SavePathForNameForTest(
        @"C:\Videos\source.mp4",
        "my clip: first?",
        TrimComposition.Normalize([new TrimSegment(TimeSpan.Zero, TimeSpan.FromSeconds(12))])),
    @"C:\Videos\my clip_ first_.mp4");
Expect(
    "trim export default file name is user readable",
    TrimExportService.DefaultFileNameForTest(
        "source.mp4",
        TrimComposition.Normalize(
            [
                new TrimSegment(TimeSpan.Zero, TimeSpan.FromSeconds(5)),
                new TrimSegment(TimeSpan.FromSeconds(8), TimeSpan.FromSeconds(12))
            ])),
    "source trim 2 parts");
ExpectSequence(
    "export result dialog exposes next actions",
    ExportResultForm.ActionLabelsForTest(copied: false),
    ["Open file", "Open folder", "Copy path", "Close"]);
ExpectSequence(
    "copied export result dialog keeps the same useful actions",
    ExportResultForm.ActionLabelsForTest(copied: true),
    ["Open file", "Open folder", "Copy path", "Close"]);
ExpectSequence(
    "snapshot completion exposes file actions",
    ExportResultForm.SnapshotActionLabelsForTest(),
    ["Open file", "Open folder", "Copy path", "Close"]);
var exportResultSource = File.ReadAllText(Path.Combine(RepositoryRoot(), "src", "Loaderly", "ExportResultForm.cs"));
var exportNameSource = File.ReadAllText(Path.Combine(RepositoryRoot(), "src", "Loaderly", "ExportNameForm.cs"));
ExpectTrue(
    "export result dialog applies the Windows title bar theme",
    exportResultSource.Contains("WindowsTheme.ApplyTitleBarTheme(this)", StringComparison.Ordinal));
ExpectTrue(
    "export name dialog applies the Windows title bar theme",
    exportNameSource.Contains("WindowsTheme.ApplyTitleBarTheme(this)", StringComparison.Ordinal));
ExpectTrue(
    "main window warns before closing with active downloads",
    MainForm.ShouldWarnBeforeClosingForTest(
        minimizeToTray: false,
        exitingFromTray: true,
        hasActiveDownloads: true));
ExpectFalse(
    "main window tray close hides without a destructive warning",
    MainForm.ShouldWarnBeforeClosingForTest(
        minimizeToTray: true,
        exitingFromTray: false,
        hasActiveDownloads: true));
ExpectTrue(
    "trim window warns before closing during export",
    TrimForm.ShouldWarnBeforeClosingForTest(isExporting: true));
ExpectFalse(
    "trim window closes normally when no export is running",
    TrimForm.ShouldWarnBeforeClosingForTest(isExporting: false));

Expect(
    "URL input placeholder explains batch links",
    MainForm.UrlInputPlaceholderForTest,
    "Paste URLs, one per line");
ExpectTrue(
    "URL input has room for multiple pasted links",
    MainForm.UrlInputRowHeightForTest >= 72 &&
    MainForm.CommandPanelRowHeightForTest >= 190);
ExpectTrue(
    "command panel has room for subtitle language choices at normal window width",
    MainForm.CommandPanelRowHeightForTest >= 226 &&
    MainForm.SubtitleLanguageColumnWidthForTest(845) >= 240);
Expect(
    "subtitle options stay on the first options row when actions wrap below",
    string.Join("|", MainForm.CommandOptionsLayoutForTest()),
    "Quality:0,0|QualitySelect:1,0|Playlist:2,0|Subtitles:3,0|SubtitleLanguage:4,0,3|LocalVideo:5,1|AddToQueue:6,1");
ExpectTrue(
    "URL input accepts multiple lines",
    MainForm.UrlInputAcceptsMultipleLinesForTest);
ExpectFalse(
    "plain Enter stays available for a new line",
    MainForm.ShouldSubmitUrlInputShortcutForTest(System.Windows.Forms.Keys.Enter));
ExpectFalse(
    "Shift Enter stays available for a new line",
    MainForm.ShouldSubmitUrlInputShortcutForTest(System.Windows.Forms.Keys.Shift | System.Windows.Forms.Keys.Enter));
ExpectTrue(
    "Ctrl Enter submits the URL batch",
    MainForm.ShouldSubmitUrlInputShortcutForTest(System.Windows.Forms.Keys.Control | System.Windows.Forms.Keys.Enter));
ExpectSequence(
    "updates launched from the app install silently and reopen Loaderly",
    MainForm.UpdateInstallerArgumentsForTest(),
    ["--update", "--quiet", "--launch"]);
ExpectSequence(
    "main navigation keeps the 1.1.0 sidebar actions",
    MainForm.SidebarActionsForTest(),
    ["Updates", "Tools", "Settings", "About", "Logs"]);
ExpectSequence(
    "library details actions use explicit user-facing labels",
    MainForm.DetailsActionLabelsForTest(),
    ["Copy path", "Open file", "Open folder", "Watch / Trim", "Source link", "Remove"]);
ExpectTrue(
    "sidebar gives the Loaderly brand enough width to avoid clipped text",
    MainForm.SidebarBrandTextWidthForTest >= 175);
ExpectTrue(
    "sidebar library badge has the same comfortable width as the navigation buttons",
    MainForm.SidebarSavedItemsBadgeWidthForTest >= 235);
ExpectTrue(
    "sidebar action buttons have enough room for translated labels",
    MainForm.SidebarActionButtonWidthForTest >= 235);
ExpectFalse(
    "main form Arabic layout avoids whole-window mirroring artifacts",
    MainForm.RightToLeftLayoutForLanguageForTest(LoaderlyLanguage.Arabic));
ExpectSequence(
    "main shell places the Arabic sidebar on the right manually",
    MainForm.ShellColumnsForLanguageForTest(LoaderlyLanguage.Arabic),
    ["Content", "Sidebar"]);
ExpectSequence(
    "main header places the Arabic media-library title on the right",
    MainForm.HeaderColumnsForLanguageForTest(LoaderlyLanguage.Arabic),
    ["Status", "Title"]);
ExpectFalse(
    "main Arabic header avoids nested mirroring inside the title stack",
    MainForm.HeaderTitleStackMirrorsForLanguageForTest(LoaderlyLanguage.Arabic));
ExpectSequence(
    "main area keeps Arabic details on the left and library on the right",
    MainForm.MainAreaColumnsForLanguageForTest(LoaderlyLanguage.Arabic),
    ["Details", "History"]);
Expect(
    "Arabic UI prefers Tajawal for cleaner Arabic text",
    LoaderlyTheme.UiFontFamilyForLanguageForTest(LoaderlyLanguage.Arabic),
    "Tajawal");
Expect(
    "primary workspace title stays on the media library",
    MainForm.PrimaryWorkspaceTitleForTest,
    "Media Library");
ExpectTrue(
    "shared chrome uses the 1.1.0 corner scale",
    LoaderlyTheme.PanelRadius >= 14 &&
    LoaderlyTheme.CardRadius >= 12 &&
    LoaderlyTheme.ControlRadius >= 10);

var parsedDownloadProgress = MediaDownloadService.ParseProgressForTest(
    "[download]  43.2% of   65.00MiB at    3.20MiB/s ETA 00:11");
Expect(
    "download progress parser reads percent",
    parsedDownloadProgress.Percent?.ToString("0.0") ?? "",
    "43.2");
Expect(
    "download progress parser reads total bytes",
    parsedDownloadProgress.TotalBytes?.ToString() ?? "",
    (65L * 1024 * 1024).ToString());
Expect(
    "download progress parser estimates downloaded bytes",
    parsedDownloadProgress.DownloadedBytes?.ToString() ?? "",
    ((long)Math.Round(65L * 1024 * 1024 * 0.432)).ToString());
Expect(
    "download progress parser reads speed and eta",
    $"{parsedDownloadProgress.Speed}|{parsedDownloadProgress.Eta}",
    "3.20MiB/s|00:11");

var activeProgressLabel = MainForm.QueueDetailLabelForTest(new DownloadQueueItem
{
    State = DownloadTaskState.Running,
    Percent = 43.2,
    Status = "Downloading",
    Speed = "3.20MiB/s",
    Eta = "00:11",
    DownloadedBytes = (long)Math.Round(65L * 1024 * 1024 * 0.432),
    TotalBytes = 65L * 1024 * 1024
});
ExpectTrue(
    "download card shows full progress counter first",
    activeProgressLabel.StartsWith("28.1 MB / 65.0 MB · 3.20MiB/s · ETA 00:11", StringComparison.Ordinal));

var fallbackProgressLabel = MainForm.QueueDetailLabelForTest(new DownloadQueueItem
{
    State = DownloadTaskState.Running,
    Percent = 12,
    Status = "Downloading",
    Speed = "812.00KiB/s"
});
ExpectTrue(
    "download card falls back when total size is unavailable",
    fallbackProgressLabel.StartsWith("812.00KiB/s", StringComparison.Ordinal));

Expect(
    "settings links users to OpenRouter API keys",
    SettingsForm.OpenRouterApiKeyUrlForTest,
    "https://openrouter.ai/settings/keys");
Expect(
    "settings links users to OpenRouter models",
    SettingsForm.OpenRouterModelsUrlForTest,
    "https://openrouter.ai/models");
Expect(
    "settings content is capped on fullscreen windows",
    SettingsForm.SettingsContentWidthForTest(1872).ToString(),
    "1180");
Expect(
    "settings content stays centered on fullscreen windows",
    SettingsForm.SettingsContentLeftForTest(1872).ToString(),
    "346");
ExpectTrue(
    "OpenRouter fields keep usable width in normal settings windows",
    SettingsForm.OpenRouterInputWidthForTest(420) >= 250);
ExpectTrue(
    "settings left column keeps all toggles visible in normal windows",
    SettingsForm.GeneralColumnFixedHeightForTest <= 540);
ExpectFalse(
    "settings window does not need maximize",
    SettingsForm.WindowAllowsMaximizeForTest);
ExpectFalse(
    "settings window does not need minimize",
    SettingsForm.WindowAllowsMinimizeForTest);
ExpectTrue(
    "settings title keeps enough top room for Arabic and English fonts",
    SettingsForm.TitleTopPaddingForTest >= 10 &&
    SettingsForm.TitleRowHeightForTest >= 82);
ExpectTrue(
    "settings title keeps horizontal breathing room so glyphs are not clipped",
    SettingsForm.TitleHorizontalPaddingForTest >= 12);
ExpectFalse(
    "settings Arabic layout avoids whole-window mirroring artifacts",
    SettingsForm.RightToLeftLayoutForLanguageForTest(LoaderlyLanguage.Arabic));
ExpectSequence(
    "settings Arabic keeps general controls on the right and shortcuts on the left",
    SettingsForm.SettingsColumnsForLanguageForTest(LoaderlyLanguage.Arabic),
    ["Shortcuts", "General"]);
ExpectSequence(
    "settings Arabic text input rows keep labels on the right and links on the left",
    SettingsForm.TextInputColumnsForLanguageForTest(LoaderlyLanguage.Arabic, hasLink: true),
    ["Link", "Input", "Label"]);
var settingsLanguagePopup = SettingsForm.LanguageSuggestionBoundsForTest(
    new Rectangle(475, 648, 405, 42),
    new Size(925, 793),
    itemCount: 2,
    itemHeight: 28,
    rtl: true);
ExpectTrue(
    "settings language suggestions stay fully inside the Arabic settings window",
    settingsLanguagePopup.Left >= 8 &&
    settingsLanguagePopup.Right <= 917 &&
    settingsLanguagePopup.Bottom <= 785);
ExpectFalse(
    "tools window does not need maximize",
    ToolsForm.WindowAllowsMaximizeForTest);
ExpectFalse(
    "tools window does not need minimize",
    ToolsForm.WindowAllowsMinimizeForTest);
ExpectTrue(
    "tools content fits above bottom close button",
    ToolsForm.ContentFixedHeightForTest <= 420);
ExpectTrue(
    "tools window checks versions on open",
    ToolsForm.StartsVersionCheckOnOpenForTest);
ExpectFalse(
    "tools window does not fetch latest releases on open",
    ToolsForm.StartsLatestVersionCheckOnOpenForTest);
ExpectFalse(
    "tools window keeps close available while checking",
    ToolsForm.DisablesCloseWhileBusyForTest);
ExpectTrue(
    "tools updater allows enough time for real tool downloads",
    ToolsForm.ToolCommandTimeoutMillisecondsForTest >= 180000);
ExpectTrue(
    "tools update errors include stderr instead of hiding the real failure",
    ToolsForm.CommandFailureMessageForTest("Skipping yt-dlp.", "winget failed")
        .Contains("winget failed", StringComparison.Ordinal));
ExpectSequence(
    "tools window exposes individual update actions",
    ToolsForm.IndividualToolUpdateNamesForTest(),
    ["yt-dlp", "ffmpeg", "ffprobe", "deno"]);
ExpectSequence(
    "tools window exposes global update choices",
    ToolsForm.GlobalActionLabelsForTest(),
    ["Check versions", "Update available tools", "Install / repair all tools"]);
ExpectSequence(
    "tools install repair all action targets every bundled tool",
    ToolsForm.InstallRepairAllToolNamesForTest(),
    ["yt-dlp", "ffmpeg", "ffprobe", "deno"]);
Expect(
    "tools reads yt-dlp version output from stdout",
    ToolsForm.ParseInstalledVersionForTest("yt-dlp", "2026.03.17"),
    "2026.03.17");
Expect(
    "tools reads deno semantic version output",
    ToolsForm.ParseInstalledVersionForTest("deno", "deno 2.7.14 (stable, release, x86_64-pc-windows-msvc)"),
    "2.7.14");
Expect(
    "tools reads ffmpeg version tokens from -version output",
    ToolsForm.ParseInstalledVersionForTest("ffmpeg", "ffmpeg version 8.0-full_build-www.gyan.dev Copyright"),
    "8.0");
Expect(
    "tools can parse winget package versions",
    ToolsForm.ParseWingetVersionForTest("Name: FFmpeg\r\nId: Gyan.FFmpeg\r\nVersion: 8.1.1"),
    "8.1.1");
Expect(
    "tools compares date-based release versions correctly",
    ToolsForm.ToolVersionStateForTest("2026.03.17", "2026.03.17"),
    "Up to date");
Expect(
    "tools marks older installed releases as updateable",
    ToolsForm.ToolVersionStateForTest("8.0", "8.1.1"),
    "Update available");
ExpectFalse(
    "single tool update is disabled when the tool is installed but latest lookup has not run",
    ToolsForm.CanRunSingleToolUpdateForTest(new ToolStatusSnapshot("yt-dlp", true, "2026.03.17", string.Empty, @"C:\tools\yt-dlp.exe")));
ExpectFalse(
    "single tool update is disabled when the tool is already current",
    ToolsForm.CanRunSingleToolUpdateForTest(new ToolStatusSnapshot("yt-dlp", true, "2026.03.17", "2026.03.17", @"C:\tools\yt-dlp.exe")));
ExpectTrue(
    "single tool update is enabled when an update is available",
    ToolsForm.CanRunSingleToolUpdateForTest(new ToolStatusSnapshot("ffmpeg", true, "8.1", "8.1.1", @"C:\tools\ffmpeg.exe")));
Expect(
    "row action label shows current tools as locked",
    ToolsForm.ToolActionLabelForTest(new ToolStatusSnapshot("deno", true, "2.7.14", "2.7.14", @"C:\tools\deno.exe")),
    "Up to date");
Expect(
    "row action label shows installed tools without a latest check as locked",
    ToolsForm.ToolActionLabelForTest(new ToolStatusSnapshot("ffmpeg", true, "8.1", string.Empty, @"C:\tools\ffmpeg.exe")),
    "Installed");
Expect(
    "row action label only says update when an update is available",
    ToolsForm.ToolActionLabelForTest(new ToolStatusSnapshot("ffprobe", true, "8.1", "8.1.1", @"C:\tools\ffprobe.exe")),
    "Update");
Expect(
    "tools installer writes updates to user data instead of the running app folder",
    ToolsForm.ToolInstallDirectoryForTest(),
    Path.Combine(AppDataFolder.Path, "tools", "windows"));
Expect(
    "tools help points users to the main repair path without version jargon",
    ToolsForm.HelpTextForTest(),
    "Installed tools are locked. Use Check versions for update checks, or Install / repair all tools to fix missing tools.");
Expect(
    "tool resolver checks user-updated tools before bundled tools",
    ToolResolver.FirstCandidateToolDirectoryForTest(),
    Path.Combine(AppDataFolder.Path, "tools", "windows"));
ExpectTrue(
    "available-tools update refreshes latest versions after a local-only open check",
    ToolsForm.NeedsLatestVersionCheckBeforeAvailableUpdateForTest(
    [
        new ToolStatusSnapshot("yt-dlp", true, "2026.03.17", string.Empty, @"C:\tools\yt-dlp.exe")
    ]));
Expect(
    "wide RTL menus are clamped to the visible screen",
    ModernSelect.MenuScreenXForTest(controlScreenX: 40, controlWidth: 200, menuWidth: 360, screenLeft: 0, screenRight: 900, rtl: true).ToString(),
    "0");
Expect(
    "wide LTR menus are clamped before the right screen edge",
    ModernSelect.MenuScreenXForTest(controlScreenX: 720, controlWidth: 200, menuWidth: 360, screenLeft: 0, screenRight: 900, rtl: false).ToString(),
    "540");
Expect(
    "menus open above the control when there is not enough room below",
    ModernSelect.MenuScreenYForTest(controlScreenY: 760, controlHeight: 34, menuHeight: 120, screenTop: 0, screenBottom: 800).ToString(),
    "637");
var toolsScript = File.ReadAllText(Path.Combine(RepositoryRoot(), "script", "install_windows_tools.ps1"));
ExpectFalse(
    "ffmpeg updater does not abort before validating ffmpeg availability",
    toolsScript.Contains("exit $LASTEXITCODE", StringComparison.Ordinal));

var downloadArguments = MediaDownloadService.DownloadArgumentsForTest(
    "https://example.com/video",
    @"C:\Downloads",
    @"C:\Tools\ffmpeg.exe",
    denoPath: null,
    new DownloadOptions(DownloadQuality.Best, AllowPlaylist: false, WriteSubtitles: false, SubtitleLanguages: string.Empty));
ExpectTrue(
    "downloader emits progress updates as separate lines",
    downloadArguments.Contains("--newline", StringComparer.Ordinal) &&
    downloadArguments.Contains("--progress", StringComparer.Ordinal));
ExpectTrue(
    "downloader remuxes mp4 instead of recoding long videos",
    downloadArguments.Contains("--remux-video", StringComparer.Ordinal) &&
    !downloadArguments.Contains("--recode-video", StringComparer.Ordinal));
var formatSelectorIndex = downloadArguments.IndexOf("-f");
var formatSelector = formatSelectorIndex >= 0 && formatSelectorIndex + 1 < downloadArguments.Count
    ? downloadArguments[formatSelectorIndex + 1]
    : string.Empty;
ExpectTrue(
    "downloader prefers Windows-compatible H264 MP4 streams for trimming",
    formatSelector.Contains("vcodec^=avc1", StringComparison.Ordinal) &&
    formatSelector.Contains("ext=mp4", StringComparison.Ordinal) &&
    formatSelector.Contains("ext=m4a", StringComparison.Ordinal));
ExpectFalse(
    "downloader keeps Unicode titles instead of forcing restricted filenames",
    downloadArguments.Contains("--restrict-filenames", StringComparer.Ordinal));

Expect(
    "download progress percent does not move backward when another stream starts",
    MainForm.NextVisibleDownloadPercentForTest(currentPercent: 6, incomingPercent: 5)?.ToString("0.0") ?? "",
    "6.0");
Expect(
    "download progress percent stays below complete until the task finishes",
    MainForm.NextVisibleDownloadPercentForTest(currentPercent: 98, incomingPercent: 100)?.ToString("0") ?? "",
    "99");
Expect(
    "download progress keeps the largest byte counter from split streams",
    MainForm.NextVisibleDownloadBytesForTest(currentBytes: 12_000_000, incomingBytes: 900_000)?.ToString() ?? "",
    "12000000");
var byteBasedProgressTask = new DownloadQueueItem
{
    State = DownloadTaskState.Running,
    Percent = 99,
    Status = "Downloading",
    DownloadedBytes = 107_400_000,
    TotalBytes = 446_100_000
};
Expect(
    "download progress display trusts downloaded bytes over misleading stage percent",
    MainForm.QueueStateTextForTest(byteBasedProgressTask),
    "Running 24% - Downloading");
Expect(
    "download progress bar uses byte-based progress instead of a misleading 99 percent",
    MainForm.QueueProgressBarValueForTest(byteBasedProgressTask).ToString(),
    "24");
Expect(
    "English download progress fills from the left",
    ModernProgressBar.FillBoundsForTest(width: 100, value: 39, rightToLeft: false),
    "0-39");
Expect(
    "Arabic download progress fills from the right",
    ModernProgressBar.FillBoundsForTest(width: 100, value: 39, rightToLeft: true),
    "61-100");

var arabicTitlePath = Path.Combine(Path.GetTempPath(), $"loaderly-arabic-title-{Guid.NewGuid():N} [abc123].mp4");
File.WriteAllBytes(arabicTitlePath, [1]);
try
{
    var arabicTitleResult = MediaDownloadService.ResultsForOutputForTest(
        [
            arabicTitlePath,
            "عنوان عربي صحيح للفيديو"
        ]).Single();
    Expect(
        "download result keeps Arabic titles from downloader output",
        arabicTitleResult.Title,
        "عنوان عربي صحيح للفيديو");

    var warningTitleResult = MediaDownloadService.ResultsForOutputForTest(
        [
            arabicTitlePath,
            "WARNING: temporary provider warning",
            "العنوان الحقيقي بعد التحذير"
        ]).Single();
    Expect(
        "download result ignores warnings before the real title",
        warningTitleResult.Title,
        "العنوان الحقيقي بعد التحذير");
}
finally
{
    File.Delete(arabicTitlePath);
}

var newestMediaFolder = Path.Combine(Path.GetTempPath(), $"loaderly-newest-media-{Guid.NewGuid():N}");
Directory.CreateDirectory(newestMediaFolder);
try
{
    var finalMediaPath = Path.Combine(newestMediaFolder, "long video.mp4");
    var tempMediaPath = Path.Combine(newestMediaFolder, "long video.temp.mp4");
    File.WriteAllBytes(finalMediaPath, [1, 2, 3]);
    File.WriteAllBytes(tempMediaPath, [1, 2, 3, 4]);
    File.SetLastWriteTimeUtc(finalMediaPath, DateTime.UtcNow.AddMinutes(-2));
    File.SetLastWriteTimeUtc(tempMediaPath, DateTime.UtcNow);
    Expect(
        "download fallback ignores temporary mp4 files when choosing the saved media",
        Path.GetFileName(MediaDownloadService.NewestMediaFileForTest(newestMediaFolder, DateTimeOffset.UtcNow.AddMinutes(-10))),
        "long video.mp4");
}
finally
{
    Directory.Delete(newestMediaFolder, recursive: true);
}

ExpectTrue(
    "history card keeps compact text rows inside the card",
    MainForm.HistoryCardTextRowsFitForTest());
ExpectFalse(
    "history card does not render a clipped file-name row",
    MainForm.HistoryCardShowsFileNameRowForTest());
ExpectTrue(
    "history card text starts near the thumbnail top",
    MainForm.HistoryCardTopSpacerForTest <= 8);
ExpectFalse(
    "history card selection does not draw a side accent beside the thumbnail",
    MainForm.HistoryCardUsesSideAccentForTest());
ExpectTrue(
    "history card fits long mixed Arabic and English titles in a normal window",
    MainForm.HistoryTitleFitsNormalCardForTest("كيفية اضافة بوت اغاني في ديسكورد | Discord [qmVD7v8uksY]"));
ExpectFalse(
    "details file label stays on one line in normal windows",
    MainForm.DetailsFileLabelForTest(@"C:\Users\voidk\Downloads\Loaderly\video-name.mp4").Contains(Environment.NewLine));
ExpectTrue(
    "details panel reserves a fixed compact path row before action buttons",
    MainForm.DetailsPathRowHeightForTest <= 28);
Expect(
    "history meta marks videos with saved edits",
    MainForm.HistoryMetaLabelForTest(
        new DownloadItem
        {
            FilePath = @"C:\Videos\clip.mp4",
            CreatedAt = new DateTimeOffset(2026, 5, 18, 7, 25, 0, TimeSpan.FromHours(3))
        },
        hasSavedTrim: true),
    "2026-05-18 7:25 AM  -  MP4  -  Edited");
ExpectFalse(
    "history meta stays unchanged without saved edits",
    MainForm.HistoryMetaLabelForTest(
        new DownloadItem
        {
            FilePath = @"C:\Videos\clip.mp4",
            CreatedAt = new DateTimeOffset(2026, 5, 18, 7, 25, 0, TimeSpan.FromHours(3))
        },
        hasSavedTrim: false).Contains("Edited", StringComparison.Ordinal));
Expect(
    "main workspace exposes an explicit local video import action",
    MainForm.LocalVideoButtonLabelForTest,
    "Add local video");
ExpectTrue(
    "local video chooser includes the common desktop video formats",
    MainForm.LocalVideoDialogFilterForTest.Contains("*.mp4", StringComparison.Ordinal) &&
    MainForm.LocalVideoDialogFilterForTest.Contains("*.mov", StringComparison.Ordinal) &&
    MainForm.LocalVideoDialogFilterForTest.Contains("*.mkv", StringComparison.Ordinal) &&
    MainForm.LocalVideoDialogFilterForTest.Contains("*.webm", StringComparison.Ordinal));
var importedLocalVideo = MainForm.LocalVideoHistoryItemForTest(
    @"C:\Videos\My Local Clip.mp4",
    new DateTimeOffset(2026, 5, 19, 13, 15, 0, TimeSpan.FromHours(3)));
Expect(
    "local video import keeps the real file title",
    importedLocalVideo.Title,
    "My Local Clip");
ExpectTrue(
    "local video import marks the library item as a local file",
    importedLocalVideo.IsLocalFile);
ExpectFalse(
    "local video import does not offer the source-link action",
    MainForm.SourceActionEnabledForTest(importedLocalVideo));
ExpectFalse(
    "local video import remove flow does not offer deleting the original file",
    MainForm.ShouldOfferDeleteFileForHistoryItemForTest(importedLocalVideo));
ExpectTrue(
    "selected cut overlay refreshes while the range is dragged",
    TrimForm.ShouldRefreshSelectedCutOverlayForTest(applyingSegmentSelection: false, selectedSegmentIndex: 0, segmentCount: 1));

ExpectFalse(
    "trim timeline keeps the editing lane clean without thumbnail strips",
    TrimForm.TimelineShowsThumbnailsForTest);
ExpectFalse(
    "subtitle editor timeline keeps the editing lane clean without thumbnail strips",
    SubtitleEditorForm.TimelineShowsThumbnailsForTest);
ExpectTrue(
    "subtitle editor window uses the Loaderly app icon",
    SubtitleEditorForm.WindowUsesAppIconForTest);
ExpectSequence(
    "trim duration fallback probes the media duration with ffprobe",
    TrimForm.DurationProbeArgumentsForTest(@"C:\Videos\long.mp4"),
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", @"C:\Videos\long.mp4"]);
Expect(
    "trim duration fallback parses ffprobe seconds",
    TrimForm.DurationFromFfprobeOutputForTest("611.512000"),
    "611.5");
ExpectSequence(
    "subtitle editor exposes manual timing actions",
    SubtitleEditorForm.ManualCueActionLabelsForTest(),
    ["Add at playhead", "Set start", "Set end", "Play cue"]);
Expect(
    "subtitle editor shows selected cue start end and duration",
    SubtitleEditorForm.CueTimingSummaryForTest(
        new SubtitleCue(TimeSpan.FromSeconds(2.5), TimeSpan.FromSeconds(5), "Manual text"),
        TimeSpan.Zero),
    "Start 0:02.5 | End 0:05.0 | Duration 2.5s");
LoaderlyLanguage.Set(LoaderlyLanguage.Arabic);
try
{
    Expect(
        "subtitle editor localizes selected cue timing labels",
        SubtitleEditorForm.CueTimingSummaryForTest(
            new SubtitleCue(TimeSpan.FromSeconds(2.5), TimeSpan.FromSeconds(5), "Manual text"),
            TimeSpan.Zero),
        "\u0627\u0644\u0628\u062F\u0627\u064A\u0629 0:02.5 | \u0627\u0644\u0646\u0647\u0627\u064A\u0629 0:05.0 | \u0627\u0644\u0645\u062F\u0629 2.5s");
}
finally
{
    LoaderlyLanguage.Set(LoaderlyLanguage.English);
}
Expect(
    "subtitle editor cue list labels include full range and text",
    SubtitleEditorForm.CueListLabelForTest(
        new SubtitleCue(TimeSpan.FromSeconds(2.5), TimeSpan.FromSeconds(5), "Manual text"),
        TimeSpan.Zero),
    "0:02.5 - 0:05.0  Manual text");
ExpectTrue(
    "subtitle editor virtualizes large cue lists",
    SubtitleEditorForm.ShouldVirtualizeCueListForTest(1802));
var largeCueWindow = SubtitleEditorForm.CueListRenderWindowForTest(1802, scrollY: 0, viewportHeight: 750);
ExpectTrue(
    "subtitle editor renders only visible cue rows for large subtitles",
    largeCueWindow.First == 0 &&
    largeCueWindow.Count <= 40 &&
    largeCueWindow.Last < 60);
ExpectTrue(
    "subtitle editor keeps full virtual cue scroll height",
    SubtitleEditorForm.CueListVirtualHeightForTest(1802, 750) > 1802 * 40);
var arabicCueText = "\u062B\u0645 \u0633\u0627\u0641\u0631\u0646\u0627 \u0625\u0644\u0649 \u0645\u0648\u0642\u0639 \u0645\u0634\u0631\u0648\u0639 \u0645\u064A\u0627\u0647 \u0646\u0638\u064A\u0641\u0629 \u0642\u0627\u0626\u0645.";
ExpectTrue(
    "subtitle direction detects Arabic cue text",
    SubtitleTextDirection.ContainsRtlText(arabicCueText));
Expect(
    "subtitle direction leaves English ASS text unwrapped",
    SubtitleTextDirection.WithAssRtlEmbedding("Clean water."),
    "Clean water.");
Expect(
    "subtitle direction wraps Arabic ASS text so punctuation stays at the RTL sentence end",
    SubtitleTextDirection.WithAssRtlEmbedding(arabicCueText),
    $"\u202B{arabicCueText}\u202C");
ExpectTrue(
    "subtitle burn-in ASS applies RTL embedding to Arabic dialogue",
    SubtitleBurnInService.BuildAss(
        [new SubtitleCue(TimeSpan.Zero, TimeSpan.FromSeconds(2), arabicCueText)],
        TimeSpan.Zero,
        TimeSpan.FromSeconds(2),
        new SubtitleStyle())
        .Contains($"\u202B{arabicCueText}\u202C", StringComparison.Ordinal));
var cueAtPlayhead = SubtitleEditorForm.NewCueRangeAtPlayheadForTest(
    TimeSpan.FromSeconds(8),
    TimeSpan.Zero,
    TimeSpan.FromSeconds(11));
Expect(
    "subtitle editor creates a cue from the white playhead",
    $"{cueAtPlayhead.Start.TotalSeconds:0.0}-{cueAtPlayhead.End.TotalSeconds:0.0}",
    "8.0-11.0");
var cueNearEnd = SubtitleEditorForm.NewCueRangeAtPlayheadForTest(
    TimeSpan.FromSeconds(10.4),
    TimeSpan.Zero,
    TimeSpan.FromSeconds(11));
Expect(
    "subtitle editor keeps new cues inside the clip",
    $"{cueNearEnd.Start.TotalSeconds:0.0}-{cueNearEnd.End.TotalSeconds:0.0}",
    "8.0-11.0");
var cueAfterExisting = SubtitleEditorForm.NewCueRangeAtPlayheadForTest(
    TimeSpan.FromSeconds(3.2),
    TimeSpan.Zero,
    TimeSpan.FromSeconds(12),
    existingCues: [new SubtitleCue(TimeSpan.Zero, TimeSpan.FromSeconds(4.1), "previous")]);
Expect(
    "subtitle editor adds manual cues in the next open subtitle slot",
    $"{cueAfterExisting.Start.TotalSeconds:0.0}-{cueAfterExisting.End.TotalSeconds:0.0}",
    "4.2-7.2");
Expect(
    "subtitle editor clamps an edited cue between neighboring subtitles",
    SubtitleEditorForm.CueRangeClampedToNeighborsForTest(
        proposedStart: TimeSpan.FromSeconds(3.2),
        proposedEnd: TimeSpan.FromSeconds(8.4),
        trimStart: TimeSpan.Zero,
        trimEnd: TimeSpan.FromSeconds(12),
        cues: [
            new SubtitleCue(TimeSpan.Zero, TimeSpan.FromSeconds(4.1), "previous"),
            new SubtitleCue(TimeSpan.FromSeconds(4.2), TimeSpan.FromSeconds(6), "selected"),
            new SubtitleCue(TimeSpan.FromSeconds(8), TimeSpan.FromSeconds(10), "next")
        ],
        selectedIndex: 1),
    "4.2-7.9");
ExpectSequence(
    "subtitle editor marks neighboring cues as timeline blockers without removed-cut styling",
    SubtitleEditorForm.CueTimelineSegmentsForTest(
            cues: [
                new SubtitleCue(TimeSpan.Zero, TimeSpan.FromSeconds(4), "previous"),
                new SubtitleCue(TimeSpan.FromSeconds(4.2), TimeSpan.FromSeconds(7), "selected"),
                new SubtitleCue(TimeSpan.FromSeconds(7.2), TimeSpan.FromSeconds(9), "next")
            ],
            trimStart: TimeSpan.Zero,
            trimEnd: TimeSpan.FromSeconds(10),
            selectedIndex: 1)
        .Select(segment => $"{segment.Start}-{segment.End}-{segment.BlocksSelection}-{segment.IsRemoved}")
        .ToList(),
    ["0-400-True-False", "420-700-False-False", "720-900-True-False"]);
Expect(
    "subtitle editor can set selected cue start at playhead",
    SubtitleEditorForm.SetCueStartAtPlayheadForTest(
        new SubtitleCue(TimeSpan.FromSeconds(2), TimeSpan.FromSeconds(5), "Manual text"),
        TimeSpan.FromSeconds(4.8),
        TimeSpan.Zero,
        TimeSpan.FromSeconds(12)),
    "4.8-5.3");
Expect(
    "subtitle editor can set selected cue end at playhead",
    SubtitleEditorForm.SetCueEndAtPlayheadForTest(
        new SubtitleCue(TimeSpan.FromSeconds(2), TimeSpan.FromSeconds(5), "Manual text"),
        TimeSpan.FromSeconds(3.4),
        TimeSpan.Zero,
        TimeSpan.FromSeconds(12)),
    "2.0-3.4");
ExpectTrue(
    "subtitle editor Ctrl Enter adds the next manual cue",
    SubtitleEditorForm.ShouldAddNextCueShortcutForTest(System.Windows.Forms.Keys.Control | System.Windows.Forms.Keys.Enter));
ExpectTrue(
    "subtitle editor bracket shortcut sets cue start",
    SubtitleEditorForm.ShouldSetCueStartShortcutForTest(System.Windows.Forms.Keys.OemOpenBrackets));
ExpectTrue(
    "subtitle editor bracket shortcut sets cue end",
    SubtitleEditorForm.ShouldSetCueEndShortcutForTest(System.Windows.Forms.Keys.OemCloseBrackets));
ExpectTrue(
    "subtitle editor clears text focus when the cue timeline is clicked",
    SubtitleEditorForm.ShouldClearTextInputFocusForControlForTest("cueTimeline"));
ExpectTrue(
    "subtitle editor clears text focus when the preview is clicked",
    SubtitleEditorForm.ShouldClearTextInputFocusForControlForTest("videoHost"));
ExpectTrue(
    "subtitle editor clears text focus when subtitle preview surface is clicked",
    SubtitleEditorForm.ShouldClearTextInputFocusForControlForTest("videoSurface"));
ExpectFalse(
    "subtitle editor keeps focus when cue text is clicked",
    SubtitleEditorForm.ShouldClearTextInputFocusForControlForTest("cueTextBox"));
ExpectFalse(
    "subtitle editor keeps focus when font search is clicked",
    SubtitleEditorForm.ShouldClearTextInputFocusForControlForTest("fontSearchTextBox"));

var frameArguments = TimelineThumbnailService.FrameArgumentsForTest(
    "sample.mp4",
    TimeSpan.FromSeconds(12.345),
    TimeSpan.FromSeconds(4),
    20,
    @"C:\Thumbs");
ExpectSequence(
    "timeline thumbnail arguments seek to the requested clip range",
    frameArguments.Take(7).ToList(),
    ["-y", "-ss", "12.345", "-t", "4.000", "-i", "sample.mp4"]);
ExpectTrue(
    "timeline thumbnail arguments normalize requested frame count",
    frameArguments.Contains("20", StringComparer.Ordinal));
var cacheSource = Path.Combine(Path.GetTempPath(), $"loaderly-cache-test-{Guid.NewGuid():N}.mp4");
File.WriteAllBytes(cacheSource, [1, 2, 3]);
ExpectFalse(
    "timeline thumbnail cache separates different clip starts",
    TimelineThumbnailService.CacheKeyForTest(cacheSource, TimeSpan.Zero, TimeSpan.FromSeconds(10), 6) ==
    TimelineThumbnailService.CacheKeyForTest(cacheSource, TimeSpan.FromSeconds(5), TimeSpan.FromSeconds(10), 6));
ExpectFalse(
    "timeline thumbnail cache separates different clip durations",
    TimelineThumbnailService.CacheKeyForTest(cacheSource, TimeSpan.Zero, TimeSpan.FromSeconds(10), 6) ==
    TimelineThumbnailService.CacheKeyForTest(cacheSource, TimeSpan.Zero, TimeSpan.FromSeconds(20), 6));
File.Delete(cacheSource);

var composition = TrimComposition.Normalize(
    [
        new TrimSegment(TimeSpan.FromSeconds(8), TimeSpan.FromSeconds(12)),
        new TrimSegment(TimeSpan.FromSeconds(2), TimeSpan.FromSeconds(5))
    ],
    [
        TrimTransitionKind.Blur,
        TrimTransitionKind.Fade
    ]);
Expect(
    "trim composition sorts segments by source time",
    string.Join("|", composition.Segments.Select(segment => $"{segment.Start.TotalSeconds:0}-{segment.End.TotalSeconds:0}")),
    "2-5|8-12");
ExpectSequence(
    "trim composition forces hard cuts between selected ranges",
    composition.Transitions,
    [TrimTransitionKind.None]);

var compositionArguments = TrimExportService.CompositionExportArgumentsForTest(
    "source.mp4",
    composition,
    "output.mp4",
    new TrimExportOptions(MuteAudio: false, Quality: TrimExportQuality.Balanced),
    assSubtitlePath: null,
    sourceHasAudio: true).ToList();
var filter = compositionArguments[compositionArguments.IndexOf("-filter_complex") + 1];
ExpectTrue(
    "composition export trims both selected source ranges",
    filter.Contains("trim=start=2.000:end=5.000", StringComparison.Ordinal) &&
    filter.Contains("trim=start=8.000:end=12.000", StringComparison.Ordinal) &&
    !filter.Contains("xfade=", StringComparison.Ordinal));
ExpectTrue(
    "composition export maps filtered audio and video",
    compositionArguments.Contains("[v]", StringComparer.Ordinal) &&
    compositionArguments.Contains("[a]", StringComparer.Ordinal));
var blurredArguments = TrimExportService.CompositionExportArgumentsForTest(
    "source.mp4",
    composition,
    "output.mp4",
    new TrimExportOptions(
        MuteAudio: true,
        Quality: TrimExportQuality.Small,
        SubtitleBurnIn: null,
        BlurRegions:
        [
            new TrimBlurRegion(
                TimeSpan.FromSeconds(2.2),
                TimeSpan.FromSeconds(4.8),
                TrimBlurShape.Box,
                18,
                [
                    new TrimBlurKeyframe(TimeSpan.FromSeconds(2.2), 0.1, 0.2, 0.3, 0.25),
                    new TrimBlurKeyframe(TimeSpan.FromSeconds(4.8), 0.4, 0.25, 0.3, 0.25)
                ])
        ]),
    assSubtitlePath: null,
    sourceHasAudio: false).ToList();
var blurredFilter = blurredArguments[blurredArguments.IndexOf("-filter_complex") + 1];
ExpectTrue(
    "composition export applies moving blur regions",
    blurredFilter.Contains("boxblur=", StringComparison.Ordinal) &&
    blurredFilter.Contains("overlay=", StringComparison.Ordinal) &&
    blurredFilter.Contains("between(t,", StringComparison.Ordinal));
var zoomedArguments = TrimExportService.CompositionExportArgumentsForTest(
    "source.mp4",
    composition,
    "output.mp4",
    new TrimExportOptions(
        MuteAudio: true,
        Quality: TrimExportQuality.Small,
        SubtitleBurnIn: null,
        BlurRegions: null,
        ZoomRegions:
        [
            new TrimZoomRegion(
                TimeSpan.FromSeconds(2.2),
                TimeSpan.FromSeconds(4.8),
                2.0,
                [
                    new TrimBlurKeyframe(TimeSpan.FromSeconds(2.2), 0.1, 0.2, 0.3, 0.25),
                    new TrimBlurKeyframe(TimeSpan.FromSeconds(4.8), 0.4, 0.25, 0.3, 0.25)
                ])
        ]),
    assSubtitlePath: null,
    sourceHasAudio: false).ToList();
var zoomedFilter = zoomedArguments[zoomedArguments.IndexOf("-filter_complex") + 1];
ExpectTrue(
    "composition export applies scale-label zoom regions focused on the selected area",
    zoomedFilter.Contains("crop=w='max(2,iw*(0.5))", StringComparison.Ordinal) &&
    zoomedFilter.Contains("scale2ref=w=rw:h=rh", StringComparison.Ordinal) &&
    zoomedFilter.Contains("concat=n=", StringComparison.Ordinal));
var sourceBlurRegion = new TrimBlurRegion(
    TimeSpan.FromSeconds(1.5),
    TimeSpan.FromSeconds(3.5),
    TrimBlurShape.Soft,
    24,
    [
        new TrimBlurKeyframe(TimeSpan.FromSeconds(1.5), 0.1, 0.2, 0.2, 0.2),
        new TrimBlurKeyframe(TimeSpan.FromSeconds(3.5), 0.5, 0.3, 0.2, 0.2)
    ]);
var retimedBlurRegions = TrimBlurRegion.RetimeForComposition(
    [sourceBlurRegion],
    TrimComposition.Normalize(
        [
            new TrimSegment(TimeSpan.FromSeconds(0), TimeSpan.FromSeconds(2)),
            new TrimSegment(TimeSpan.FromSeconds(3), TimeSpan.FromSeconds(4))
        ],
        [TrimTransitionKind.Fade]));
Expect(
    "blur regions retime onto exported clip pieces",
    string.Join("|", retimedBlurRegions.Select(region => $"{region.Start.TotalSeconds:0.0}-{region.End.TotalSeconds:0.0}:{region.Shape}")),
    "1.5-2.0:Soft|2.0-2.5:Soft");
Expect(
    "moving blur keyframes interpolate at the playhead",
    sourceBlurRegion.FrameAt(TimeSpan.FromSeconds(2.5)).X.ToString("0.00", CultureInfo.InvariantCulture),
    "0.30");
var sourceZoomRegion = new TrimZoomRegion(
    TimeSpan.FromSeconds(1.5),
    TimeSpan.FromSeconds(3.5),
    2.5,
    [
        new TrimBlurKeyframe(TimeSpan.FromSeconds(1.5), 0.1, 0.2, 0.2, 0.2),
        new TrimBlurKeyframe(TimeSpan.FromSeconds(3.5), 0.5, 0.3, 0.2, 0.2)
    ]);
var retimedZoomRegions = TrimZoomRegion.RetimeForComposition(
    [sourceZoomRegion],
    TrimComposition.Normalize(
        [
            new TrimSegment(TimeSpan.FromSeconds(0), TimeSpan.FromSeconds(2)),
            new TrimSegment(TimeSpan.FromSeconds(3), TimeSpan.FromSeconds(4))
        ],
        [TrimTransitionKind.Fade]));
Expect(
    "zoom regions retime onto exported clip pieces",
    string.Join("|", retimedZoomRegions.Select(region => $"{region.Start.TotalSeconds:0.0}-{region.End.TotalSeconds:0.0}:{region.Scale:0.0}")),
    "1.5-2.0:2.5|2.0-2.5:2.5");
Expect(
    "moving zoom keyframes interpolate at the playhead",
    sourceZoomRegion.FrameAt(TimeSpan.FromSeconds(2.5)).X.ToString("0.00", CultureInfo.InvariantCulture),
    "0.30");
Expect(
    "zoom crop uses the scale label and keeps the selected box as the focus",
    TrimExportService.ZoomActiveFilterForTest(
        new TrimZoomRegion(
            TimeSpan.Zero,
            TimeSpan.FromSeconds(1),
            2.0,
            [new TrimBlurKeyframe(TimeSpan.Zero, 0.10, 0.20, 0.20, 0.30)])),
    "crop=w='max(2,iw*(0.5))'");

var hardCutArguments = TrimExportService.CompositionExportArgumentsForTest(
    "source.mp4",
    TrimComposition.Normalize(
        [
            new TrimSegment(TimeSpan.FromSeconds(0), TimeSpan.FromSeconds(3)),
            new TrimSegment(TimeSpan.FromSeconds(9), TimeSpan.FromSeconds(11))
        ],
        [TrimTransitionKind.None]),
    "output.mp4",
    new TrimExportOptions(MuteAudio: true, Quality: TrimExportQuality.Small),
    assSubtitlePath: null,
    sourceHasAudio: false).ToList();
var hardCutFilter = hardCutArguments[hardCutArguments.IndexOf("-filter_complex") + 1];
ExpectTrue(
    "hard cut composition concatenates without transition filters",
    hardCutFilter.Contains("concat=n=2:v=1:a=0", StringComparison.Ordinal) &&
    !hardCutFilter.Contains("xfade=", StringComparison.Ordinal));

var retimedCues = TrimComposition.RetimeSubtitleCues(
    [
        new SubtitleCue(TimeSpan.FromSeconds(2), TimeSpan.FromSeconds(4), "first"),
        new SubtitleCue(TimeSpan.FromSeconds(9), TimeSpan.FromSeconds(10), "second")
    ],
    TrimComposition.Normalize(
        [
            new TrimSegment(TimeSpan.FromSeconds(1), TimeSpan.FromSeconds(5)),
            new TrimSegment(TimeSpan.FromSeconds(8), TimeSpan.FromSeconds(12))
        ],
        [TrimTransitionKind.Fade]));
Expect(
    "composition subtitle retiming keeps cues on the exported timeline",
    string.Join("|", retimedCues.Select(cue => $"{cue.Start.TotalSeconds:0.0}-{cue.End.TotalSeconds:0.0}:{cue.Text}")),
    "1.0-3.0:first|5.0-6.0:second");
var cutComposition = TrimComposition.FromDeletedRanges(
    TimeSpan.Zero,
    TimeSpan.FromSeconds(12),
    [
        new TrimCutRange(TimeSpan.FromSeconds(8), TimeSpan.FromSeconds(9), TrimTransitionKind.Blur),
        new TrimCutRange(TimeSpan.FromSeconds(3), TimeSpan.FromSeconds(5), TrimTransitionKind.Fade)
    ]);
Expect(
    "deleted ranges export the remaining timeline pieces",
    string.Join("|", cutComposition.Segments.Select(segment => $"{segment.Start.TotalSeconds:0}-{segment.End.TotalSeconds:0}")),
    "0-3|5-8|9-12");
ExpectSequence(
    "deleted ranges use hard cuts at cut boundaries",
    cutComposition.Transitions,
    [TrimTransitionKind.None, TrimTransitionKind.None]);
ExpectSequence(
    "trim form exposes hard cut only",
    TrimForm.TransitionOptionsForTest(),
    ["None"]);
Expect(
    "trim form describes no deleted cuts",
    TrimForm.CutStatusTextForTest(0, -1),
    "No cuts");
Expect(
    "trim form describes selected deleted cut",
    TrimForm.CutStatusTextForTest(3, 1),
    "Cut 2 of 3");
ExpectSequence(
    "trim form exposes direct professional cut actions",
    TrimForm.CutActionLabelsForTest(),
    ["Cut out", "Keep only", "Prev cut", "Next cut", "Remove cut"]);
ExpectSequence(
    "trim form keeps the cut context menu compact",
    TrimForm.CutContextRootActionLabelsForTest(),
    ["Remove cut"]);
ExpectSequence(
    "trim form hides transition choices",
    TrimForm.CutContextTransitionLabelsForTest(),
    []);
ExpectFalse(
    "timeline drag does not seek preview on every position change",
    TrimForm.ShouldSeekPreviewOnTimelinePositionChangeForTest(updatingControls: false, isTimelineInteracting: true));
ExpectFalse(
    "timeline drag does not seek preview when range temporarily moves past the playhead",
    TrimForm.ShouldSeekPreviewForTimelineRangeChangeForTest(
        updatingControls: false,
        isTimelineInteracting: true,
        position: 20,
        start: 40,
        end: 60));
ExpectTrue(
    "timeline click still seeks preview when not dragging",
    TrimForm.ShouldSeekPreviewOnTimelinePositionChangeForTest(updatingControls: false, isTimelineInteracting: false));
ExpectFalse(
    "trim timeline drag defers heavy label refresh",
    TrimForm.ShouldRefreshTimelineLabelsForTest(updatingControls: false, isTimelineInteracting: true));
ExpectTrue(
    "trim timeline release refreshes labels",
    TrimForm.ShouldRefreshTimelineLabelsForTest(updatingControls: false, isTimelineInteracting: false));
ExpectFalse(
    "choosing a cut transition does not auto-build a heavy preview",
    TrimForm.ShouldAutoPreviewTransitionForTest(TrimTransitionKind.Fade));
ExpectSequence(
    "trim form removes transition preview controls",
    TrimForm.TransitionControlLabelsForTest(),
    []);
ExpectTrue(
    "trim keyboard seek uses a short debounce instead of seeking on every repeat",
    TrimForm.KeyboardSeekDebounceMillisecondsForTest >= 80);
Expect(
    "trim keyboard seek accumulates repeated arrows from the pending target",
    TrimForm.KeyboardSeekTargetForTest(
        currentPosition: TimeSpan.FromSeconds(10),
        pendingPosition: TimeSpan.FromSeconds(11),
        delta: TimeSpan.FromSeconds(1),
        duration: TimeSpan.FromSeconds(30)),
    "0:12");
Expect(
    "trim keyboard seek clamps to the clip duration",
    TrimForm.KeyboardSeekTargetForTest(
        currentPosition: TimeSpan.FromSeconds(29),
        pendingPosition: TimeSpan.FromSeconds(30),
        delta: TimeSpan.FromSeconds(1),
        duration: TimeSpan.FromSeconds(30)),
    "0:30");
ExpectTrue(
    "trim Delete shortcut removes the selected cut",
    TrimForm.ShouldRemoveSelectedCutShortcutForTest(
        System.Windows.Forms.Keys.Delete,
        selectedSegmentIndex: 0,
        segmentCount: 1));
ExpectFalse(
    "trim Delete shortcut ignores empty cut selection",
    TrimForm.ShouldRemoveSelectedCutShortcutForTest(
        System.Windows.Forms.Keys.Delete,
        selectedSegmentIndex: -1,
        segmentCount: 0));
ExpectTrue(
    "trim Delete shortcut removes the selected blur",
    TrimForm.ShouldRemoveSelectedBlurShortcutForTest(
        System.Windows.Forms.Keys.Delete,
        selectedBlurIndex: 0,
        blurCount: 1));
ExpectFalse(
    "trim Delete shortcut ignores blur when none is selected",
    TrimForm.ShouldRemoveSelectedBlurShortcutForTest(
        System.Windows.Forms.Keys.Delete,
        selectedBlurIndex: -1,
        blurCount: 1));
ExpectTrue(
    "trim Delete shortcut removes the selected zoom",
    TrimForm.ShouldRemoveSelectedZoomShortcutForTest(
        System.Windows.Forms.Keys.Delete,
        selectedZoomIndex: 0,
        zoomCount: 1));
ExpectFalse(
    "trim Delete shortcut ignores zoom when none is selected",
    TrimForm.ShouldRemoveSelectedZoomShortcutForTest(
        System.Windows.Forms.Keys.Delete,
        selectedZoomIndex: -1,
        zoomCount: 1));
ExpectTrue(
    "trim open bracket sets selected blur start to the playhead",
    TrimForm.ShouldSetSelectedEffectStartShortcutForTest(
        System.Windows.Forms.Keys.OemOpenBrackets,
        selectedBlurIndex: 0,
        blurCount: 1,
        selectedZoomIndex: -1,
        zoomCount: 0));
ExpectTrue(
    "trim close bracket sets selected zoom end to the playhead",
    TrimForm.ShouldSetSelectedEffectEndShortcutForTest(
        System.Windows.Forms.Keys.OemCloseBrackets,
        selectedBlurIndex: -1,
        blurCount: 0,
        selectedZoomIndex: 0,
        zoomCount: 1));
ExpectFalse(
    "trim effect bracket shortcuts ignore modifier combinations",
    TrimForm.ShouldSetSelectedEffectStartShortcutForTest(
        System.Windows.Forms.Keys.Control | System.Windows.Forms.Keys.OemOpenBrackets,
        selectedBlurIndex: 0,
        blurCount: 1,
        selectedZoomIndex: -1,
        zoomCount: 0));
ExpectTrue(
    "trim redo accepts Ctrl+Shift+Z in addition to the configured shortcut",
    TrimForm.ShouldRedoShortcutForTest(
        System.Windows.Forms.Keys.Control | System.Windows.Forms.Keys.Shift | System.Windows.Forms.Keys.Z,
        configured: "Ctrl+Y"));
ExpectFalse(
    "cut transitions wait for explicit preview when an effect is selected",
    TrimForm.ShouldAutoPreviewTransitionForTest(TrimTransitionKind.Fade));
ExpectFalse(
    "hard cuts do not auto preview a transition",
    TrimForm.ShouldAutoPreviewTransitionForTest(TrimTransitionKind.None));
ExpectFalse(
    "subtitle editor timeline drag does not seek preview on every position change",
    SubtitleEditorForm.ShouldSeekPreviewOnTimelinePositionChangeForTest(updatingControls: false, isTimelineInteracting: true));
ExpectFalse(
    "subtitle editor timeline drag defers cue list refresh",
    SubtitleEditorForm.ShouldRefreshCueTimelineUiForTest(updatingControls: false, isTimelineInteracting: true));
ExpectTrue(
    "subtitle editor timeline release refreshes cue UI",
    SubtitleEditorForm.ShouldRefreshCueTimelineUiForTest(updatingControls: false, isTimelineInteracting: false));
ExpectTrue(
    "subtitle editor keyboard seek uses the same debounce",
    SubtitleEditorForm.KeyboardSeekDebounceMillisecondsForTest >= 80);
Expect(
    "subtitle editor keyboard seek accumulates repeated arrows from the pending target",
    SubtitleEditorForm.KeyboardSeekTargetForTest(
        currentPosition: TimeSpan.FromSeconds(12),
        pendingPosition: TimeSpan.FromSeconds(13),
        delta: TimeSpan.FromSeconds(1),
        trimStart: TimeSpan.FromSeconds(10),
        trimEnd: TimeSpan.FromSeconds(30)),
    "0:14");
ExpectFalse(
    "timeline ignores duplicate drag values",
    ModernRangeTimeline.ShouldProcessDragValueForTest(currentValue: 42, previousValue: 42));
ExpectTrue(
    "timeline processes changed drag values",
    ModernRangeTimeline.ShouldProcessDragValueForTest(currentValue: 43, previousValue: 42));
Expect(
    "timeline finds the cut segment under a right click",
    ModernRangeTimeline.SegmentIndexAtValueForTest(
        value: 45,
        segments: [
            new TimelineSegmentDisplay(20, 30, HasTransitionAfter: false, IsRemoved: true),
            new TimelineSegmentDisplay(40, 60, HasTransitionAfter: true, IsRemoved: true)
        ]).ToString(),
    "1");
Expect(
    "timeline ignores clipped zero-length subtitle segments",
    ModernRangeTimeline.SegmentIndexAtValueForTest(
        value: 0,
        segments: [
            new TimelineSegmentDisplay(0, 0, HasTransitionAfter: false, BlocksSelection: true)
        ]).ToString(),
    "-1");
Expect(
    "timeline finds the blur region under the blur lane",
    ModernRangeTimeline.BlurIndexAtValueForTest(
        value: 45,
        regions: [
            new TimelineBlurDisplay(10, 20),
            new TimelineBlurDisplay(40, 60, IsEditing: true)
        ]).ToString(),
    "1");
Expect(
    "timeline labels zoom regions as zoom instead of blur",
    ModernRangeTimeline.EffectLabelForTest(new TimelineBlurDisplay(40, 60, IsEditing: true, Label: "Zoom 1"), 0),
    "Zoom 1");
Expect(
    "timeline blur lane drags the selected blur body",
    ModernRangeTimeline.BlurHitTargetForTest(
        pointerValue: 50,
        regions: [new TimelineBlurDisplay(40, 60, IsEditing: true)],
        selectedIndex: 0),
    "BlurRange");
Expect(
    "timeline blur lane resizes the selected blur edge",
    ModernRangeTimeline.BlurHitTargetForTest(
        pointerValue: 60,
        regions: [new TimelineBlurDisplay(40, 60, IsEditing: true)],
        selectedIndex: 0),
    "BlurEnd");
ExpectTrue(
    "timeline effect lane sits below the trim lane on the trim editor height",
    ModernRangeTimeline.EffectLaneIsSeparateForTest(1500, TrimForm.TimelineRowHeightForTest));
ExpectTrue(
    "timeline effect lanes share the same 0:00 x position as the trim lane",
    ModernRangeTimeline.EffectLaneStartXForTest(1500, TrimForm.TimelineRowHeightForTest) ==
    ModernRangeTimeline.TrackStartXForTest(1500, TrimForm.TimelineRowHeightForTest));
Expect(
    "timeline grabs a zero-start blur from the effect lane",
    ModernRangeTimeline.BlurHitTargetForLocationForTest(
        controlWidth: 1500,
        controlHeight: TrimForm.TimelineRowHeightForTest,
        pointerX: ModernRangeTimeline.TrackStartXForTest(1500, TrimForm.TimelineRowHeightForTest),
        pointerY: ModernRangeTimeline.EffectLaneCenterYForTest(1500, TrimForm.TimelineRowHeightForTest),
        maximum: 3900,
        regions: [new TimelineBlurDisplay(0, 500, IsEditing: true)],
        selectedIndex: 0),
    "BlurStart");
Expect(
    "timeline does not treat the main trim lane as the blur drag lane",
    ModernRangeTimeline.BlurHitTargetForLocationForTest(
        controlWidth: 1500,
        controlHeight: TrimForm.TimelineRowHeightForTest,
        pointerX: ModernRangeTimeline.EffectLaneStartXForTest(1500, TrimForm.TimelineRowHeightForTest),
        pointerY: ModernRangeTimeline.TrackCenterYForTest(1500, TrimForm.TimelineRowHeightForTest),
        maximum: 3900,
        regions: [new TimelineBlurDisplay(0, 500, IsEditing: true)],
        selectedIndex: 0),
    "None");
var crossLaneMove = ModernRangeTimeline.MoveEffectRangeForTest(
    start: 200,
    end: 500,
    pointerValue: 0,
    pointerOffset: 0,
    maximum: 1000,
    regions:
    [
        new TimelineBlurDisplay(200, 500, IsEditing: true, Label: "Blur 1", Lane: 0),
        new TimelineBlurDisplay(0, 300, IsEditing: true, Label: "Zoom 1", Lane: 1)
    ],
    selectedIndex: 0);
Expect(
    "timeline lets a blur return to 0:00 even when zoom occupies another lane",
    $"{crossLaneMove.Start}-{crossLaneMove.End}",
    "0-300");
var sameLaneMove = ModernRangeTimeline.MoveEffectRangeForTest(
    start: 200,
    end: 500,
    pointerValue: 0,
    pointerOffset: 0,
    maximum: 1000,
    regions:
    [
        new TimelineBlurDisplay(200, 500, IsEditing: true, Label: "Blur 1", Lane: 0),
        new TimelineBlurDisplay(0, 150, IsEditing: true, Label: "Blur 2", Lane: 0)
    ],
    selectedIndex: 0);
Expect(
    "timeline still prevents same-lane effects from covering each other",
    $"{sameLaneMove.Start}-{sameLaneMove.End}",
    "150-450");
var snappedEffectStart = ModernRangeTimeline.MoveEffectRangeWithPlayheadSnapForTest(
    start: 200,
    end: 500,
    pointerValue: 598,
    pointerOffset: 0,
    maximum: 1000,
    playhead: 600,
    snapTolerance: 8,
    regions:
    [
        new TimelineBlurDisplay(200, 500, IsEditing: true, Label: "Zoom 1", Lane: 1)
    ],
    selectedIndex: 0);
Expect(
    "timeline snaps moved effect start to the playhead",
    $"{snappedEffectStart.Start}-{snappedEffectStart.End}",
    "600-900");
var snappedEffectEnd = ModernRangeTimeline.MoveEffectRangeWithPlayheadSnapForTest(
    start: 200,
    end: 500,
    pointerValue: 302,
    pointerOffset: 0,
    maximum: 1000,
    playhead: 600,
    snapTolerance: 8,
    regions:
    [
        new TimelineBlurDisplay(200, 500, IsEditing: true, Label: "Zoom 1", Lane: 1)
    ],
    selectedIndex: 0);
Expect(
    "timeline snaps moved effect end to the playhead",
    $"{snappedEffectEnd.Start}-{snappedEffectEnd.End}",
    "300-600");
Expect(
    "timeline snaps resized effect start to the playhead",
    ModernRangeTimeline.ResizeEffectStartWithPlayheadSnapForTest(
        currentEnd: 900,
        proposedStart: 603,
        maximum: 1000,
        minimumRange: 30,
        playhead: 600,
        snapTolerance: 8,
        regions: [new TimelineBlurDisplay(200, 900, IsEditing: true, Label: "Zoom 1", Lane: 1)],
        selectedIndex: 0),
    "600-900");
Expect(
    "timeline snaps resized effect end to the playhead",
    ModernRangeTimeline.ResizeEffectEndWithPlayheadSnapForTest(
        currentStart: 300,
        proposedEnd: 596,
        maximum: 1000,
        minimumRange: 30,
        playhead: 600,
        snapTolerance: 8,
        regions: [new TimelineBlurDisplay(300, 900, IsEditing: true, Label: "Zoom 1", Lane: 1)],
        selectedIndex: 0),
    "300-600");
Expect(
    "timeline disables effect snapping while Alt is held",
    ModernRangeTimeline.EffectSnapToleranceForModifierForTest(
        System.Windows.Forms.Keys.Alt,
        normalTolerance: 12).ToString(),
    "0");
ExpectTrue(
    "timeline gives blur and zoom separate effect lanes",
    ModernRangeTimeline.EffectLaneCenterYForTest(1500, TrimForm.TimelineRowHeightForTest, lane: 0) !=
    ModernRangeTimeline.EffectLaneCenterYForTest(1500, TrimForm.TimelineRowHeightForTest, lane: 1));
Expect(
    "timeline selects the blur lane when blur and zoom overlap",
    ModernRangeTimeline.BlurHitIndexForLocationForTest(
        controlWidth: 1500,
        controlHeight: TrimForm.TimelineRowHeightForTest,
        pointerX: ModernRangeTimeline.EffectLaneStartXForTest(1500, TrimForm.TimelineRowHeightForTest, lane: 0) + 80,
        pointerY: ModernRangeTimeline.EffectLaneCenterYForTest(1500, TrimForm.TimelineRowHeightForTest, lane: 0),
        maximum: 1000,
        regions:
        [
            new TimelineBlurDisplay(0, 300, IsEditing: true, Label: "Blur 1", Lane: 0),
            new TimelineBlurDisplay(0, 300, IsEditing: true, Label: "Zoom 1", Lane: 1)
        ],
        selectedIndex: -1),
    "0:BlurRange");
Expect(
    "timeline selects the zoom lane when blur and zoom overlap",
    ModernRangeTimeline.BlurHitIndexForLocationForTest(
        controlWidth: 1500,
        controlHeight: TrimForm.TimelineRowHeightForTest,
        pointerX: ModernRangeTimeline.EffectLaneStartXForTest(1500, TrimForm.TimelineRowHeightForTest, lane: 1) + 80,
        pointerY: ModernRangeTimeline.EffectLaneCenterYForTest(1500, TrimForm.TimelineRowHeightForTest, lane: 1),
        maximum: 1000,
        regions:
        [
            new TimelineBlurDisplay(0, 300, IsEditing: true, Label: "Blur 1", Lane: 0),
            new TimelineBlurDisplay(0, 300, IsEditing: true, Label: "Zoom 1", Lane: 1)
        ],
        selectedIndex: -1),
    "1:BlurRange");
ExpectFalse(
    "timeline first effect click selects without changing effect timing",
    ModernRangeTimeline.ShouldApplyEffectMouseDownForTest());
ExpectTrue(
    "timeline effect drag starts only after an intentional pointer move",
    ModernRangeTimeline.ShouldActivateDeferredDragForTest(
        startX: 120,
        startY: ModernRangeTimeline.EffectLaneCenterYForTest(1500, TrimForm.TimelineRowHeightForTest, lane: 0),
        currentX: 128,
        currentY: ModernRangeTimeline.EffectLaneCenterYForTest(1500, TrimForm.TimelineRowHeightForTest, lane: 0)));
ExpectFalse(
    "timeline right click opens cut actions instead of starting a drag",
    ModernRangeTimeline.ShouldStartDragForButtonForTest(System.Windows.Forms.MouseButtons.Right));
ExpectTrue(
    "timeline left click still starts a drag",
    ModernRangeTimeline.ShouldStartDragForButtonForTest(System.Windows.Forms.MouseButtons.Left));
ExpectFalse(
    "timeline range click waits instead of dragging on tiny pointer movement",
    ModernRangeTimeline.ShouldActivateDeferredDragForTest(
        startX: 100,
        startY: 20,
        currentX: 102,
        currentY: 21));
ExpectTrue(
    "timeline range drag starts after intentional pointer movement",
    ModernRangeTimeline.ShouldActivateDeferredDragForTest(
        startX: 100,
        startY: 20,
        currentX: 107,
        currentY: 20));
Expect(
    "timeline selected-range click seeks to the clicked position",
    ModernRangeTimeline.PositionAfterPrimaryClickForTest(
        start: 10,
        end: 90,
        position: 45,
        pointerValue: 60,
        maximum: 100,
        trackWidth: 640).ToString(),
    "60");
Expect(
    "timeline grabs the white playhead inside the selected range",
    ModernRangeTimeline.HitTargetForTest(
        start: 10,
        end: 90,
        position: 45,
        pointerValue: 45,
        maximum: 100,
        trackWidth: 640),
    "Position");
Expect(
    "timeline still moves the selected range away from the playhead",
    ModernRangeTimeline.HitTargetForTest(
        start: 10,
        end: 90,
        position: 45,
        pointerValue: 60,
        maximum: 100,
        trackWidth: 640),
    "Range");
Expect(
    "timeline keeps body dragging available near a selected cut edge",
    ModernRangeTimeline.HitTargetForTest(
        start: 40,
        end: 60,
        position: 0,
        pointerValue: 42,
        maximum: 100,
        trackWidth: 640),
    "Range");
Expect(
    "timeline still resizes from the visible selected cut handle",
    ModernRangeTimeline.HitTargetForTest(
        start: 40,
        end: 60,
        position: 0,
        pointerValue: 41,
        maximum: 100,
        trackWidth: 640),
    "Start");
Expect(
    "timeline full-media range click seeks instead of grabbing the whole clip",
    ModernRangeTimeline.HitTargetForTest(
        start: 0,
        end: 100,
        position: 12,
        pointerValue: 60,
        maximum: 100,
        trackWidth: 640),
    "Position");
ExpectFalse(
    "timeline does not paint the full media range as an active purple selection",
    ModernRangeTimeline.ShouldDrawSelectedRangeOverlayForTest(
        start: 0,
        end: 100,
        maximum: 100));
ExpectTrue(
    "timeline still paints a real trimmed range as selected",
    ModernRangeTimeline.ShouldDrawSelectedRangeOverlayForTest(
        start: 15,
        end: 80,
        maximum: 100));
ExpectFalse(
    "timeline hides stale selected-range chrome when deleted cuts exist but no cut is selected",
    ModernRangeTimeline.ShouldDrawSelectedRangeChromeForTest(
        start: 0,
        end: 2500,
        maximum: 4500,
        segmentCount: 3,
        selectedSegmentIndex: -1));
ExpectTrue(
    "timeline keeps selected cut chrome while editing a deleted cut",
    ModernRangeTimeline.ShouldDrawSelectedRangeChromeForTest(
        start: 3200,
        end: 3500,
        maximum: 4500,
        segmentCount: 3,
        selectedSegmentIndex: 0));
Expect(
    "timeline ignores stale selected-range body when deleted cuts exist and no cut is selected",
    ModernRangeTimeline.HitTargetForSegmentsForTest(
        start: 0,
        end: 2500,
        position: 2800,
        pointerValue: 1200,
        maximum: 4500,
        trackWidth: 1440,
        segmentCount: 3,
        selectedSegmentIndex: -1),
    "Position");
Expect(
    "timeline keeps full-range trim handles active when no cuts are selected",
    ModernRangeTimeline.HitTargetForSegmentsForTest(
        start: 0,
        end: 4500,
        position: 2800,
        pointerValue: 0,
        maximum: 4500,
        trackWidth: 1440,
        segmentCount: 0,
        selectedSegmentIndex: -1),
    "Start");
Expect(
    "transition preview composition is disabled",
    TrimForm.TransitionPreviewCompositionForTest(
        TimeSpan.FromSeconds(3),
        TimeSpan.FromSeconds(5),
        TimeSpan.FromSeconds(10),
        TrimTransitionKind.DipToBlack) is null ? "null" : "enabled",
    "null");
var movedRange = ModernRangeTimeline.MoveRangeForTest(
    start: 40,
    end: 60,
    pointerValue: 75,
    pointerOffset: 10,
    maximum: 100,
    segments: [],
    selectedIndex: -1);
Expect(
    "timeline dragging inside the selection moves the full range",
    $"{movedRange.Start}-{movedRange.End}",
    "65-85");
var blockedMove = ModernRangeTimeline.MoveRangeForTest(
    start: 40,
    end: 60,
    pointerValue: 80,
    pointerOffset: 10,
    maximum: 100,
    segments: [new TimelineSegmentDisplay(70, 85, HasTransitionAfter: false, IsRemoved: true)],
    selectedIndex: -1);
Expect(
    "timeline move stops before another deleted cut",
    $"{blockedMove.Start}-{blockedMove.End}",
    "50-70");
var blockedCueMove = ModernRangeTimeline.MoveRangeForTest(
    start: 40,
    end: 60,
    pointerValue: 80,
    pointerOffset: 10,
    maximum: 100,
    segments: [new TimelineSegmentDisplay(70, 85, HasTransitionAfter: false, BlocksSelection: true)],
    selectedIndex: -1);
Expect(
    "timeline move stops before a neighboring subtitle cue without removed-cut styling",
    $"{blockedCueMove.Start}-{blockedCueMove.End}-{new TimelineSegmentDisplay(70, 85, HasTransitionAfter: false, BlocksSelection: true).IsRemoved}",
    "50-70-False");
var blockedResize = ModernRangeTimeline.ResizeEndForTest(
    currentStart: 40,
    proposedEnd: 75,
    maximum: 100,
    minimumRange: 5,
    segments: [new TimelineSegmentDisplay(70, 85, HasTransitionAfter: false, IsRemoved: true)],
    selectedIndex: -1);
Expect(
    "timeline resize stops before another deleted cut",
    $"{blockedResize.Start}-{blockedResize.End}",
    "40-70");
var selectedCutResize = ModernRangeTimeline.ResizeEndForTest(
    currentStart: 40,
    proposedEnd: 75,
    maximum: 100,
    minimumRange: 5,
    segments: [new TimelineSegmentDisplay(40, 60, HasTransitionAfter: false, IsRemoved: true)],
    selectedIndex: 0);
Expect(
    "timeline allows editing the selected deleted cut itself",
    $"{selectedCutResize.Start}-{selectedCutResize.End}",
    "40-75");
var movedBlurRange = ModernRangeTimeline.MoveBlurRangeForTest(
    start: 40,
    end: 60,
    pointerValue: 72,
    pointerOffset: 10,
    maximum: 100);
Expect(
    "timeline dragging a blur marker moves the blur time range",
    $"{movedBlurRange.Start}-{movedBlurRange.End}",
    "62-82");
ExpectTrue(
    "trim timeline is larger so blur timing markers are easier to use",
    TrimForm.TimelineRowHeightForTest >= 140);
ExpectTrue(
    "trim side panel clips its scroll host to the rounded outer corners",
    TrimForm.TrimPanelClipsRoundedRegionForTest);
ExpectTrue(
    "trim side panel also clips the scrolling viewport so Watch / Trim corners stay rounded",
    TrimForm.TrimScrollHostClipsRoundedViewportForTest);
ExpectTrue(
    "trim panel uses available desktop sidebar height so effect controls do not collapse",
    TrimPanelLayout.RowHeights.Count == 11 &&
    TrimPanelLayout.RowHeights[1] >= 100 &&
    TrimPanelLayout.RowHeights[5] >= 270 &&
    TrimPanelLayout.RowHeights[6] >= 96 &&
    TrimPanelLayout.ContentHeight <= 760 &&
    !TrimPanelLayout.NeedsScrolling(840) &&
    !TrimPanelLayout.NeedsScrolling(760) &&
    TrimPanelLayout.NeedsScrolling(640));
ExpectTrue(
    "trim blur and zoom tab headers have enough height for text",
    TrimForm.EffectOptionsTextRowsAreReadableForTest());
ExpectTrue(
    "trim blur and zoom tab bodies keep safety space below the action buttons",
    TrimForm.EffectOptionsSpareHeightForTest(TrimPanelLayout.RowHeights[5]) >= 32);
ExpectSequence(
    "trim advanced edit groups are focused into tabs",
    TrimForm.TrimEditTabLabelsForTest(),
    ["Cuts", "Subtitles", "Blur", "Zoom"]);
ExpectFalse(
    "trim edit tabs avoid native white TabControl chrome in dark mode",
    TrimForm.TrimEditTabsUseNativeControlForTest);
ExpectTrue(
    "trim edit tabs use rounded Loaderly chrome",
    TrimForm.TrimEditTabRadiusForTest >= LoaderlyTheme.ControlRadius);
ExpectSequence(
    "trim form exposes blur controls",
    TrimForm.BlurControlLabelsForTest(),
    ["Blur", "Start", "End", "Preview", "Add", "Edit", "Done", "Track", "Fix", "Remove"]);
ExpectSequence(
    "trim form exposes zoom controls",
    TrimForm.ZoomControlLabelsForTest(),
    ["Zoom", "Start", "End", "Preview", "Add", "Edit", "Done", "Follow", "Fix", "Remove"]);
ExpectSequence(
    "trim transport exposes visible undo and redo controls",
    TrimForm.TransportActionLabelsForTest(),
    ["Play selection", "Undo", "Redo", "Snapshot"]);
Expect(
    "selected effect detail shows start end duration and mode",
    TrimForm.EffectTimingTextForTest(
        start: 748,
        end: 1048,
        hasMovingKeyframes: false),
    "0:07.48 - 0:10.48 | 0:03.00 | Fixed");
Expect(
    "selected moving effect detail calls out follow mode",
    TrimForm.EffectTimingTextForTest(
        start: 748,
        end: 1048,
        hasMovingKeyframes: true),
    "0:07.48 - 0:10.48 | 0:03.00 | Follow");
Expect(
    "tracked effects use Fix instead of offering another follow action",
    TrimForm.EffectFollowButtonTextForTest(hasMovingKeyframes: true, zoom: true),
    "Fix");
ExpectSequence(
    "trim effect presets stay compact",
    TrimForm.EffectPresetLabelsForTest(),
    ["Light 8", "Clean 22", "Heavy 40", "1.5x", "2x", "4x"]);
Expect(
    "zoom status makes an empty state obvious",
    TrimForm.ZoomStatusTextForTest(0, -1, editing: false),
    "No zoom");
Expect(
    "zoom status shows the selected fixed zoom",
    TrimForm.ZoomStatusTextForTest(2, 0, editing: false),
    "Zoom 1 of 2 - fixed");
Expect(
    "zoom edit button becomes Done while editing",
    TrimForm.ZoomEditButtonTextForTest(editing: true),
    "Done");
var trimFormSource = File.ReadAllText(Path.Combine(RepositoryRoot(), "src", "Loaderly", "TrimForm.cs"))
    .Replace("\r\n", "\n", StringComparison.Ordinal);
ExpectFalse(
    "zoom edit mode waits for an actual change before adding a keyframe",
    trimFormSource.Contains(
        "isEditingZoomRegion = true;\n        isEditingBlurRegion = false;\n        selectedBlurIndex = -1;\n        AddZoomKeyframeAtPlayhead(announce: false);",
        StringComparison.Ordinal));
Expect(
    "manual zoom edit keeps the selected area fixed across the zoom duration",
    TrimForm.ZoomManualEditFramesForTest(),
    "0.37,0.38,0.26,0.21|0.37,0.38,0.26,0.21|0.37,0.38,0.26,0.21");
Expect(
    "manual blur fix keeps the selected area fixed across the blur duration",
    TrimForm.BlurManualEditFramesForTest(),
    "0.37,0.38,0.26,0.21|0.37,0.38,0.26,0.21|0.37,0.38,0.26,0.21");
Expect(
    "effect preview range uses the selected effect timing",
    TrimForm.EffectPreviewRangeForTest(start: 748, end: 1048),
    "0:07.48-0:10.48");
Expect(
    "zoom preview transforms the video while the playhead is inside the zoom",
    TrimForm.ZoomPreviewTransformForTest(
        playhead: TimeSpan.FromSeconds(2),
        start: TimeSpan.FromSeconds(1),
        end: TimeSpan.FromSeconds(3),
        scale: 2,
        x: 0.25,
        y: 0.25,
        width: 0.5,
        height: 0.5,
        boundsWidth: 1000,
        boundsHeight: 1000),
    "2.00,-500.00,-500.00");
Expect(
    "zoom preview uses the scale label and the selected box as the focus",
    TrimForm.ZoomPreviewTransformForTest(
        playhead: TimeSpan.FromSeconds(2),
        start: TimeSpan.FromSeconds(1),
        end: TimeSpan.FromSeconds(3),
        scale: 2,
        x: 0.10,
        y: 0.20,
        width: 0.20,
        height: 0.30,
        boundsWidth: 1000,
        boundsHeight: 1000),
    "2.00,100.00,-200.00");
Expect(
    "zoom preview does not include letterbox offsets in the media transform",
    TrimForm.ZoomPreviewTransformWithBoundsForTest(
        playhead: TimeSpan.FromSeconds(2),
        start: TimeSpan.FromSeconds(1),
        end: TimeSpan.FromSeconds(3),
        scale: 4,
        x: 0.43274436090225565,
        y: 0.40631578947368424,
        width: 0.11251879699248113,
        height: 0.06962406015037592,
        boundsLeft: 160,
        boundsTop: 0,
        boundsWidth: 1200,
        boundsHeight: 675),
    "4.00,-1747.22,-853.55");
Expect(
    "zoom preview resets when the playhead is outside the zoom",
    TrimForm.ZoomPreviewTransformForTest(
        playhead: TimeSpan.FromSeconds(4),
        start: TimeSpan.FromSeconds(1),
        end: TimeSpan.FromSeconds(3),
        scale: 2,
        x: 0.25,
        y: 0.25,
        width: 0.5,
        height: 0.5,
        boundsWidth: 1000,
        boundsHeight: 1000),
    "1.00,0.00,0.00");
Expect(
    "blur status makes an empty state obvious",
    TrimForm.BlurStatusTextForTest(0, -1, editing: false),
    "No blur");
Expect(
    "blur status shows the selected fixed blur",
    TrimForm.BlurStatusTextForTest(2, 0, editing: false),
    "Blur 1 of 2 - fixed");
Expect(
    "blur status shows when the selected blur is being edited",
    TrimForm.BlurStatusTextForTest(2, 1, editing: true),
    "Blur 2 of 2 - editing");
Expect(
    "blur status shows count when no blur is selected",
    TrimForm.BlurStatusTextForTest(2, -1, editing: false),
    "2 blurs");
Expect(
    "blur edit button becomes Done while editing",
    TrimForm.BlurEditButtonTextForTest(editing: true),
    "Done");
LoaderlyLanguage.Set(LoaderlyLanguage.Arabic);
try
{
    Expect(
        "Arabic trim blur labels are localized",
        string.Join("|", new[]
        {
            LoaderlyLanguage.Text("Snapshot"),
            LoaderlyLanguage.Text("Add"),
            LoaderlyLanguage.Text("Done"),
            LoaderlyLanguage.Text("Track"),
            LoaderlyLanguage.Text("Box blur"),
            LoaderlyLanguage.Text("Pixelate")
        }),
        "لقطة|إضافة|تثبيت|تتبع|بلور عادي|بكسلة");
    Expect(
        "Arabic blur status is compact and clear",
        TrimForm.BlurStatusTextForTest(2, 1, editing: true),
        "بلور 2/2 - تعديل");
}
finally
{
    LoaderlyLanguage.Set(LoaderlyLanguage.English);
}
ExpectTrue(
    "selected blur overlay shows while the playhead is inside its time range",
    TrimForm.ShouldShowSelectedBlurOverlayForTest(currentUnits: 50, start: 40, end: 60));
ExpectFalse(
    "selected blur overlay hides after the playhead leaves its time range",
    TrimForm.ShouldShowSelectedBlurOverlayForTest(currentUnits: 70, start: 40, end: 60));
Expect(
    "blur overlay drags when pressing inside the selected box",
    TrimForm.BlurDragModeForTest(pointerX: 320, pointerY: 350, x: 0.2, y: 0.25, width: 0.3, height: 0.2),
    "Move");
Expect(
    "blur overlay resizes from the south east corner",
    TrimForm.BlurDragModeForTest(pointerX: 500, pointerY: 450, x: 0.2, y: 0.25, width: 0.3, height: 0.2),
    "ResizeSouthEast");
Expect(
    "blur overlay recenters when pressing a new video area",
    TrimForm.BlurDragModeForTest(pointerX: 700, pointerY: 500, x: 0.2, y: 0.25, width: 0.3, height: 0.2),
    "Recenter");
Expect(
    "blur overlay movement updates position without changing size",
    TrimForm.BlurDragKeyframeForTest("Move", dragStartX: 300, dragStartY: 350, pointerX: 400, pointerY: 450),
    "0.30,0.35,0.30,0.20");
Expect(
    "blur overlay corner resize updates width and height",
    TrimForm.BlurDragKeyframeForTest("ResizeSouthEast", dragStartX: 500, dragStartY: 450, pointerX: 600, pointerY: 550),
    "0.20,0.25,0.40,0.30");
Expect(
    "blur boxes can reach the full video width",
    new TrimBlurKeyframe(TimeSpan.Zero, 0, 0.25, 1.20, 0.20).Clamp().Width.ToString("0.00", CultureInfo.InvariantCulture),
    "1.00");
Expect(
    "blur boxes can reach the full video height",
    new TrimBlurKeyframe(TimeSpan.Zero, 0.20, 0, 0.30, 1.20).Clamp().Height.ToString("0.00", CultureInfo.InvariantCulture),
    "1.00");
ExpectTrue(
    "preview soft blur uses a real ffmpeg blur filter",
    TrimForm.BlurPreviewFilterForTest(TrimBlurShape.Soft, strength: 32, width: 240, height: 160)
        .Contains("gblur=", StringComparison.Ordinal));
ExpectTrue(
    "preview pixelate uses real nearest-neighbor scaling",
    TrimForm.BlurPreviewFilterForTest(TrimBlurShape.Pixelate, strength: 32, width: 240, height: 160)
        .Contains("flags=neighbor", StringComparison.Ordinal));
using (var trackingSource = BuildTrackingFrame(faceX: 70))
using (var trackingNext = BuildTrackingFrame(faceX: 92))
{
    var tracked = TrimBlurTracker.TrackRectangleForTest(
        trackingSource,
        trackingNext,
        new Rectangle(30, 18, 70, 42));
ExpectTrue(
    "blur tracker follows the moving subject instead of the static background",
    tracked.X >= 48);
}
using (var trackingSource = BuildTrackingDistractorFrame(targetFaceX: 34, distractorFaceX: 82, targetShifted: false))
using (var trackingNext = BuildTrackingDistractorFrame(targetFaceX: 46, distractorFaceX: 82, targetShifted: true))
{
    var tracked = TrimBlurTracker.TrackRectangleForTest(
        trackingSource,
        trackingNext,
        new Rectangle(30, 18, 42, 42));
ExpectTrue(
    "blur tracker prefers the nearby selected face instead of jumping to a similar face",
    tracked.X >= 38 && tracked.X <= 58);
}
using (var trackingSource = BuildScalingObjectFrame(objectX: 40, objectY: 26, objectWidth: 36, objectHeight: 28))
using (var trackingNext = BuildScalingObjectFrame(objectX: 70, objectY: 18, objectWidth: 58, objectHeight: 44))
{
    var tracked = TrimBlurTracker.TrackRectangleForTest(
        trackingSource,
        trackingNext,
        new Rectangle(40, 26, 36, 28));
ExpectTrue(
    "blur tracker follows a selected object while resizing the blur box",
    tracked.X >= 60 &&
    tracked.X <= 82 &&
    tracked.Y >= 12 &&
    tracked.Y <= 26 &&
    tracked.Width >= 48 &&
    tracked.Height >= 36);
}
ExpectFalse(
    "selecting an existing blur keeps the current playhead time",
    TrimForm.ShouldSeekToBlurStartOnSelectionForTest());
Expect(
    "timeline ctrl wheel zooms in around the pointer",
    ModernRangeTimeline.ZoomViewportForTest(
        viewStart: 0,
        viewEnd: 1000,
        maximum: 1000,
        anchor: 600,
        wheelDelta: 120),
    "150-900");
Expect(
    "timeline ctrl wheel zooms back out around the pointer",
    ModernRangeTimeline.ZoomViewportForTest(
        viewStart: 150,
        viewEnd: 900,
        maximum: 1000,
        anchor: 600,
        wheelDelta: -120),
    "0-1000");
Expect(
    "timeline thumbnail tiles keep their image aspect while zooming",
    ModernRangeTimeline.ThumbnailTileWidthForTest(trackHeight: 82, imageWidth: 160, imageHeight: 90).ToString(CultureInfo.InvariantCulture),
    "146");
Expect(
    "timeline thumbnails map to exact time segments in the visible viewport",
    ModernRangeTimeline.ThumbnailSegmentBoundsForTest(thumbnailCount: 4, maximum: 1000, viewStart: 250, viewEnd: 750, trackWidth: 500),
    "1:0-250|2:250-500");
var fullTimelineLabels = ModernRangeTimeline.TimeRulerLabelsForTest(
    viewStart: 0,
    viewEnd: 93300,
    maximum: 93300,
    trackWidth: 1440);
ExpectTrue(
    "timeline ruler labels show the visible video time",
    fullTimelineLabels.StartsWith("0:00@0", StringComparison.Ordinal) &&
    fullTimelineLabels.Contains("15:00@1389", StringComparison.Ordinal));
var zoomedTimelineLabels = ModernRangeTimeline.TimeRulerLabelsForTest(
    viewStart: 76000,
    viewEnd: 79000,
    maximum: 93300,
    trackWidth: 600);
ExpectTrue(
    "timeline ruler labels follow the zoomed viewport",
    zoomedTimelineLabels.StartsWith("12:40@0", StringComparison.Ordinal) &&
    zoomedTimelineLabels.Contains("13:00@400", StringComparison.Ordinal));
Expect(
    "timeline can pan right after zooming in",
    ModernRangeTimeline.PanViewportForTest(
        viewStart: 150,
        viewEnd: 650,
        maximum: 1000,
        delta: 200),
    "350-850");
Expect(
    "timeline clamps panning at the media end",
    ModernRangeTimeline.PanViewportForTest(
        viewStart: 650,
        viewEnd: 950,
        maximum: 1000,
        delta: 200),
    "700-1000");
Expect(
    "new cut starts at the playhead instead of the old selected range",
    TrimForm.NewCutRangeAtPlayheadForTest(
        playhead: 600,
        maximum: 2000,
        existingCuts: []),
    "600-900");
Expect(
    "new cut is placed in the next free timeline space",
    TrimForm.NewCutRangeAtPlayheadForTest(
        playhead: 600,
        maximum: 2000,
        existingCuts:
        [
            new TimelineSegmentDisplay(580, 900, HasTransitionAfter: false, IsRemoved: true)
        ]),
    "900-1200");
Expect(
    "new blur starts at the playhead and avoids existing blur regions",
    TrimForm.NewBlurRangeAtPlayheadForTest(
        playhead: 600,
        maximum: 2000,
        existingBlurs:
        [
            new TimelineBlurDisplay(580, 900)
        ]),
    "900-1200");
Expect(
    "new zoom starts at the playhead and avoids existing zoom regions",
    TrimForm.NewZoomRangeAtPlayheadForTest(
        playhead: 600,
        maximum: 2000,
        existingZooms:
        [
            new TimelineBlurDisplay(580, 900)
        ]),
    "900-1200");
Expect(
    "plain trim arrow seek uses a precise quarter-second step",
    TrimForm.KeyboardSeekSecondsForShortcutForTest(System.Windows.Forms.Keys.Right).ToString("0.00", CultureInfo.InvariantCulture),
    "0.25");
Expect(
    "shift trim arrow seek uses a one-second step",
    TrimForm.KeyboardSeekSecondsForShortcutForTest(System.Windows.Forms.Keys.Shift | System.Windows.Forms.Keys.Left).ToString("0.00", CultureInfo.InvariantCulture),
    "-1.00");

var trimStatePath = Path.Combine(Path.GetTempPath(), $"loaderly-trim-state-{Guid.NewGuid():N}.json");
var trimStateSource = Path.Combine(Path.GetTempPath(), $"loaderly-trim-source-{Guid.NewGuid():N}.mp4");
File.WriteAllBytes(trimStateSource, [1, 2, 3, 4]);
try
{
    var trimStateStore = new TrimStateStore(trimStatePath);
    trimStateStore.Save(
        trimStateSource,
        TimeSpan.Zero,
        TimeSpan.FromSeconds(12),
        TimeSpan.FromSeconds(6),
        [
            new TrimCutRange(TimeSpan.FromSeconds(2), TimeSpan.FromSeconds(3), TrimTransitionKind.Fade),
            new TrimCutRange(TimeSpan.FromSeconds(8), TimeSpan.FromSeconds(9), TrimTransitionKind.Blur)
        ],
        selectedCutIndex: 1,
        blurRegions:
        [
            new TrimBlurRegion(
                TimeSpan.FromSeconds(4),
                TimeSpan.FromSeconds(7),
                TrimBlurShape.Pixelate,
                32,
                [
                    new TrimBlurKeyframe(TimeSpan.FromSeconds(4), 0.2, 0.3, 0.2, 0.2),
                    new TrimBlurKeyframe(TimeSpan.FromSeconds(7), 0.5, 0.4, 0.2, 0.2)
                ])
        ],
        selectedBlurIndex: 0,
        zoomRegions:
        [
            new TrimZoomRegion(
                TimeSpan.FromSeconds(1),
                TimeSpan.FromSeconds(3),
                2.0,
                [
                    new TrimBlurKeyframe(TimeSpan.FromSeconds(1), 0.35, 0.28, 0.28, 0.22),
                    new TrimBlurKeyframe(TimeSpan.FromSeconds(3), 0.50, 0.35, 0.28, 0.22)
                ])
        ],
        selectedZoomIndex: 0);
    var savedTrim = trimStateStore.Load(trimStateSource);
    Expect(
        "trim state restores deleted cut count",
        (savedTrim?.Cuts.Count ?? -1).ToString(),
        "2");
    Expect(
        "trim state restores selected deleted cut",
        (savedTrim?.SelectedCutIndex ?? -1).ToString(),
        "1");
    Expect(
        "trim state stores hard cuts only",
        string.Join("|", savedTrim?.Cuts.Select(cut => $"{cut.StartSeconds:0}-{cut.EndSeconds:0}:{cut.TransitionAfter}") ?? []),
        "2-3:None|8-9:None");
    Expect(
        "trim state restores blur regions",
        string.Join("|", savedTrim?.BlurRegions.Select(blur => $"{blur.StartSeconds:0}-{blur.EndSeconds:0}:{blur.Shape}:{blur.Strength}") ?? []),
        "4-7:Pixelate:32");
    Expect(
        "trim state restores selected blur",
        (savedTrim?.SelectedBlurIndex ?? -1).ToString(CultureInfo.InvariantCulture),
        "0");
    Expect(
        "trim state restores zoom regions",
        string.Join("|", savedTrim?.ZoomRegions.Select(zoom => $"{zoom.StartSeconds:0}-{zoom.EndSeconds:0}:{zoom.Scale:0.0}") ?? []),
        "1-3:2.0");
    Expect(
        "trim state restores selected zoom",
        (savedTrim?.SelectedZoomIndex ?? -1).ToString(CultureInfo.InvariantCulture),
        "0");
    ExpectTrue(
        "trim state store reports saved edits for a source file",
        trimStateStore.HasSavedState(trimStateSource));
}
finally
{
    if (File.Exists(trimStatePath))
    {
        File.Delete(trimStatePath);
    }

    if (File.Exists(trimStateSource))
    {
        File.Delete(trimStateSource);
    }
}

if (CanResolveTool("ffmpeg") && CanResolveTool("ffprobe"))
{
    var tempDirectory = Path.Combine(Path.GetTempPath(), $"loaderly-composition-test-{Guid.NewGuid():N}");
    Directory.CreateDirectory(tempDirectory);
    try
    {
        var sourcePath = Path.Combine(tempDirectory, "source.mp4");
        var outputPath = Path.Combine(tempDirectory, "output.mp4");
        await RunProcessAsync(
            ToolResolver.ResolveToolPath("ffmpeg"),
            [
                "-y",
                "-f", "lavfi",
                "-i", "testsrc2=size=160x90:rate=30:duration=5",
                "-f", "lavfi",
                "-i", "sine=frequency=440:duration=5",
                "-shortest",
                "-pix_fmt", "yuv420p",
                sourcePath
            ]);
        await new TrimExportService().ExportCompositionAsync(
            sourcePath,
            TrimComposition.Normalize(
                [
                    new TrimSegment(TimeSpan.FromSeconds(0.4), TimeSpan.FromSeconds(2.1)),
                    new TrimSegment(TimeSpan.FromSeconds(2.6), TimeSpan.FromSeconds(4.5))
                ],
                [TrimTransitionKind.Blur]),
            outputPath,
            new TrimExportOptions(MuteAudio: false, Quality: TrimExportQuality.Small),
            CancellationToken.None);
        ExpectTrue(
            "composition export writes a playable hard-cut file",
            File.Exists(outputPath) && new FileInfo(outputPath).Length > 0);

        foreach (var shape in new[] { TrimBlurShape.Box, TrimBlurShape.Soft, TrimBlurShape.Pixelate })
        {
            var blurOutputPath = Path.Combine(tempDirectory, $"blur-{shape}.mp4");
            var blurRegion = new TrimBlurRegion(
                TimeSpan.FromSeconds(0.8),
                TimeSpan.FromSeconds(3.8),
                shape,
                18,
                [
                    new TrimBlurKeyframe(TimeSpan.FromSeconds(0.8), 0.1, 0.1, 0.25, 0.25),
                    new TrimBlurKeyframe(TimeSpan.FromSeconds(3.8), 0.55, 0.35, 0.25, 0.25)
                ]);
            await new TrimExportService().ExportCompositionAsync(
                sourcePath,
                TrimComposition.Normalize(
                    [
                        new TrimSegment(TimeSpan.FromSeconds(0.2), TimeSpan.FromSeconds(4.6))
                    ]),
                blurOutputPath,
                new TrimExportOptions(
                    MuteAudio: true,
                    Quality: TrimExportQuality.Small,
                    SubtitleBurnIn: null,
                    BlurRegions:
                    [
                        blurRegion
                    ]),
                CancellationToken.None);
            ExpectTrue(
                $"blur export works for {shape}",
                File.Exists(blurOutputPath) && new FileInfo(blurOutputPath).Length > 0);

            var sourceFramePath = Path.Combine(tempDirectory, $"source-{shape}.png");
            var blurFramePath = Path.Combine(tempDirectory, $"blur-{shape}.png");
            await ExtractFrameForTestAsync(sourcePath, sourceFramePath, TimeSpan.FromSeconds(1.2));
            await ExtractFrameForTestAsync(blurOutputPath, blurFramePath, TimeSpan.FromSeconds(1.0));
            using var sourceFrame = new Bitmap(sourceFramePath);
            using var blurFrame = new Bitmap(blurFramePath);
            var frame = blurRegion.FrameAt(TimeSpan.FromSeconds(1.2));
            var regionRect = RectFromBlurFrame(frame, blurFrame.Width, blurFrame.Height);
            var gradientRatio = MeanGradient(blurFrame, regionRect) / Math.Max(0.001, MeanGradient(sourceFrame, regionRect));
            ExpectTrue(
                $"{shape} blur visibly reduces detail in the target region",
                gradientRatio < (shape == TrimBlurShape.Pixelate ? 0.98 : 0.86));
        }

        var zoomOutputPath = Path.Combine(tempDirectory, "zoom.mp4");
        await new TrimExportService().ExportCompositionAsync(
            sourcePath,
            TrimComposition.Normalize(
                [
                    new TrimSegment(TimeSpan.FromSeconds(0.2), TimeSpan.FromSeconds(4.6))
                ]),
            zoomOutputPath,
            new TrimExportOptions(
                MuteAudio: true,
                Quality: TrimExportQuality.Small,
                SubtitleBurnIn: null,
                BlurRegions: null,
                ZoomRegions:
                [
                    new TrimZoomRegion(
                        TimeSpan.FromSeconds(0.8),
                        TimeSpan.FromSeconds(3.8),
                        1.5,
                        [
                            new TrimBlurKeyframe(TimeSpan.FromSeconds(0.8), 0.1, 0.1, 0.3, 0.3),
                            new TrimBlurKeyframe(TimeSpan.FromSeconds(3.8), 0.55, 0.35, 0.3, 0.3)
                        ])
                ]),
            CancellationToken.None);
        ExpectTrue(
            "zoom export writes a playable file",
            File.Exists(zoomOutputPath) && new FileInfo(zoomOutputPath).Length > 0);

        var trackingVideoPath = Path.Combine(tempDirectory, "tracking-source.mp4");
        for (var index = 0; index < 6; index++)
        {
            using var frame = BuildTrackingFrame(faceX: 70 + index * 7);
            frame.Save(Path.Combine(tempDirectory, $"tracking_{index + 1:000}.png"));
        }

        await RunProcessAsync(
            ToolResolver.ResolveToolPath("ffmpeg"),
            [
                "-y",
                "-framerate", "2",
                "-i", Path.Combine(tempDirectory, "tracking_%03d.png"),
                "-pix_fmt", "yuv420p",
                trackingVideoPath
            ]);
        var trackedRegion = await TrimBlurTracker.TrackAsync(
            trackingVideoPath,
            new TrimBlurRegion(
                TimeSpan.Zero,
                TimeSpan.FromSeconds(2.5),
                TrimBlurShape.Box,
                22,
                [new TrimBlurKeyframe(TimeSpan.Zero, 30 / 140.0, 18 / 82.0, 70 / 140.0, 42 / 82.0)]),
            ToolResolver.ResolveToolPath("ffmpeg"),
            CancellationToken.None);
        ExpectTrue(
            "blur tracker end-to-end follows a moving face through extracted video frames",
            trackedRegion.Keyframes.Count >= 3 &&
            trackedRegion.Keyframes[^1].X > trackedRegion.Keyframes[0].X + 0.08);
    }
    finally
    {
        Directory.Delete(tempDirectory, recursive: true);
    }
}

if (failures.Count > 0)
{
    foreach (var failure in failures)
    {
        Console.Error.WriteLine(failure);
    }

    Environment.Exit(1);
}

Console.WriteLine("Loaderly tests passed.");

void Expect(string name, string actual, string expected)
{
    if (!string.Equals(actual, expected, StringComparison.Ordinal))
    {
        failures.Add($"{name}: expected '{expected}', got '{actual}'");
    }
}

void ExpectTrue(string name, bool actual)
{
    if (!actual)
    {
        failures.Add($"{name}: expected true");
    }
}

void ExpectFalse(string name, bool actual)
{
    if (actual)
    {
        failures.Add($"{name}: expected false");
    }
}

void ExpectSequence<T>(string name, IReadOnlyList<T> actual, IReadOnlyList<T> expected)
{
    if (!actual.SequenceEqual(expected))
    {
        failures.Add($"{name}: expected '{string.Join(", ", expected)}', got '{string.Join(", ", actual)}'");
    }
}

string RepositoryRoot()
{
    var directory = new DirectoryInfo(AppContext.BaseDirectory);
    while (directory is not null)
    {
        if (File.Exists(Path.Combine(directory.FullName, "script", "build_windows.ps1")))
        {
            return directory.FullName;
        }

        directory = directory.Parent;
    }

    throw new DirectoryNotFoundException("Could not find the Loaderly repository root.");
}

bool CanResolveTool(string toolName)
{
    try
    {
        ToolResolver.ResolveToolPath(toolName);
        return true;
    }
    catch
    {
        return false;
    }
}

async Task RunProcessAsync(string fileName, IReadOnlyList<string> arguments)
{
    var startInfo = new System.Diagnostics.ProcessStartInfo
    {
        FileName = fileName,
        UseShellExecute = false,
        RedirectStandardOutput = true,
        RedirectStandardError = true,
        CreateNoWindow = true
    };
    foreach (var argument in arguments)
    {
        startInfo.ArgumentList.Add(argument);
    }

    using var process = System.Diagnostics.Process.Start(startInfo);
    if (process is null)
    {
        failures.Add($"could not start {fileName}");
        return;
    }

    var error = await process.StandardError.ReadToEndAsync();
    await process.WaitForExitAsync();
    if (process.ExitCode != 0)
    {
        failures.Add($"{Path.GetFileName(fileName)} failed: {error}");
    }
}

async Task ExtractFrameForTestAsync(string videoPath, string outputPath, TimeSpan time)
{
    await RunProcessAsync(
        ToolResolver.ResolveToolPath("ffmpeg"),
        [
            "-y",
            "-ss", time.TotalSeconds.ToString("0.###", CultureInfo.InvariantCulture),
            "-i", videoPath,
            "-frames:v", "1",
            outputPath
        ]);
}

static Rectangle RectFromBlurFrame(TrimBlurKeyframe frame, int width, int height)
{
    var normalized = frame.Clamp();
    var w = Math.Clamp((int)Math.Round(normalized.Width * width), 2, width);
    var h = Math.Clamp((int)Math.Round(normalized.Height * height), 2, height);
    var x = Math.Clamp((int)Math.Round(normalized.X * width), 0, Math.Max(0, width - w));
    var y = Math.Clamp((int)Math.Round(normalized.Y * height), 0, Math.Max(0, height - h));
    return new Rectangle(x, y, w, h);
}

static double MeanGradient(Bitmap bitmap, Rectangle rect)
{
    var total = 0.0;
    var count = 0;
    for (var y = rect.Top; y < rect.Bottom - 1; y++)
    {
        for (var x = rect.Left; x < rect.Right - 1; x++)
        {
            var color = bitmap.GetPixel(x, y);
            var right = bitmap.GetPixel(x + 1, y);
            var down = bitmap.GetPixel(x, y + 1);
            total +=
                Math.Abs(color.R - right.R) + Math.Abs(color.G - right.G) + Math.Abs(color.B - right.B) +
                Math.Abs(color.R - down.R) + Math.Abs(color.G - down.G) + Math.Abs(color.B - down.B);
            count++;
        }
    }

    return total / Math.Max(1, count);
}

static Bitmap BuildTrackingFrame(int faceX)
{
    var bitmap = new Bitmap(140, 82);
    using var graphics = Graphics.FromImage(bitmap);
    graphics.Clear(Color.FromArgb(42, 120, 52));
    using var treeBrush = new SolidBrush(Color.FromArgb(82, 65, 48));
    graphics.FillRectangle(treeBrush, 28, 0, 24, 82);
    using var skinBrush = new SolidBrush(Color.FromArgb(230, 172, 138));
    graphics.FillEllipse(skinBrush, faceX, 18, 32, 36);
    using var shirtBrush = new SolidBrush(Color.FromArgb(80, 170, 230));
    graphics.FillRectangle(shirtBrush, faceX - 6, 54, 44, 24);
    return bitmap;
}

static Bitmap BuildTrackingDistractorFrame(int targetFaceX, int distractorFaceX, bool targetShifted)
{
    var bitmap = new Bitmap(150, 86);
    using var graphics = Graphics.FromImage(bitmap);
    graphics.Clear(Color.FromArgb(36, 112, 64));
    using var treeBrush = new SolidBrush(Color.FromArgb(82, 65, 48));
    graphics.FillRectangle(treeBrush, 4, 0, 18, 86);
    graphics.FillRectangle(treeBrush, 122, 0, 20, 86);
    using var originalSkinBrush = new SolidBrush(Color.FromArgb(230, 172, 138));
    using var shiftedSkinBrush = new SolidBrush(Color.FromArgb(222, 164, 132));
    using var shirtBrush = new SolidBrush(Color.FromArgb(78, 168, 229));
    graphics.FillEllipse(targetShifted ? shiftedSkinBrush : originalSkinBrush, targetFaceX, 18, 30, 34);
    graphics.FillRectangle(shirtBrush, targetFaceX - 5, 52, 40, 24);
    graphics.FillEllipse(originalSkinBrush, distractorFaceX, 18, 30, 34);
    graphics.FillRectangle(shirtBrush, distractorFaceX - 5, 52, 40, 24);
    return bitmap;
}

static Bitmap BuildScalingObjectFrame(int objectX, int objectY, int objectWidth, int objectHeight)
{
    var bitmap = new Bitmap(180, 110);
    using var graphics = Graphics.FromImage(bitmap);
    graphics.Clear(Color.FromArgb(38, 55, 68));
    using var gridPen = new Pen(Color.FromArgb(58, 74, 88), 2);
    for (var x = 0; x < bitmap.Width; x += 20)
    {
        graphics.DrawLine(gridPen, x, 0, x + 14, bitmap.Height);
    }

    using var objectBrush = new SolidBrush(Color.FromArgb(236, 116, 62));
    using var objectPen = new Pen(Color.FromArgb(255, 224, 125), 3);
    graphics.FillRectangle(objectBrush, objectX, objectY, objectWidth, objectHeight);
    graphics.DrawRectangle(objectPen, objectX + 1, objectY + 1, objectWidth - 2, objectHeight - 2);
    using var markerPen = new Pen(Color.FromArgb(55, 38, 26), 3);
    graphics.DrawLine(markerPen, objectX + objectWidth / 4, objectY + objectHeight / 2, objectX + objectWidth * 3 / 4, objectY + objectHeight / 2);
    graphics.DrawLine(markerPen, objectX + objectWidth / 2, objectY + objectHeight / 4, objectX + objectWidth / 2, objectY + objectHeight * 3 / 4);
    return bitmap;
}
