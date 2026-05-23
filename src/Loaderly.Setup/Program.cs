using System.Diagnostics;
using System.Drawing.Drawing2D;
using System.IO.Compression;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using static Loaderly.Setup.DrawingHelpers;
using Microsoft.Win32;

[assembly: InternalsVisibleTo("Loaderly.Tests")]

namespace Loaderly.Setup;

internal static class Program
{
    private const string ProductName = "Loaderly";
    private const string ProductVersion = "1.1.0";
    private const string RegistryLanguageKey = @"Software\Loaderly";
    private const string UninstallKey = @"Software\Microsoft\Windows\CurrentVersion\Uninstall\Loaderly";

    [STAThread]
    private static void Main(string[] args)
    {
        ApplicationConfiguration.Initialize();
        var installedVersion = InstalledVersion();
        var requestedUninstall = SetupMode.IsUninstallRequest(args);
        var forceInstall = SetupMode.ShouldForceInstall(args);
        var uninstallMode = SetupMode.ShouldUseUninstallMode(requestedUninstall, forceInstall, installedVersion, ProductVersion);
        var updateMode = SetupMode.ShouldUseUpdateMode(args, installedVersion, ProductVersion);
        var requestedInstallDirectory = SetupMode.InstallDirectoryArgument(args);
        var repairMode = !uninstallMode && !updateMode && !string.IsNullOrWhiteSpace(installedVersion);

        using var form = new SetupForm(uninstallMode, requestedInstallDirectory, repairMode, updateMode, installedVersion);
        if (SetupMode.IsQuiet(args))
        {
            form.RunQuiet(SetupMode.ShouldLaunchAfterQuietInstall(args));
            return;
        }

        Application.Run(form);
    }

    private static string? InstalledVersion()
    {
        using var key = Registry.CurrentUser.OpenSubKey(UninstallKey);
        var registryVersion = key?.GetValue("DisplayVersion")?.ToString();
        if (!string.IsNullOrWhiteSpace(registryVersion))
        {
            return registryVersion;
        }

        var installedExe = Path.Combine(InstallDirectory(), "Loaderly.exe");
        if (!File.Exists(installedExe))
        {
            return null;
        }

        var versionInfo = FileVersionInfo.GetVersionInfo(installedExe);
        return string.IsNullOrWhiteSpace(versionInfo.ProductVersion)
            ? versionInfo.FileVersion
            : versionInfo.ProductVersion;
    }

    private static string? InstalledDirectoryFromRegistry()
    {
        using var key = Registry.CurrentUser.OpenSubKey(UninstallKey);
        var value = key?.GetValue("InstallLocation")?.ToString();
        return string.IsNullOrWhiteSpace(value) ? null : value;
    }

    private static string DefaultInstallDirectory()
    {
        return Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "Programs",
            ProductName);
    }

    private static string InstallDirectory()
    {
        return InstalledDirectoryFromRegistry() ?? DefaultInstallDirectory();
    }

    private sealed class SetupForm : Form
    {
        private const int WmSettingChange = 0x001A;
        private readonly bool uninstallMode;
        private readonly bool repairMode;
        private readonly bool updateMode;
        private readonly string? installedVersion;
        private readonly Label appNameLabel = new();
        private readonly Label titleLabel = new();
        private readonly Label bodyLabel = new();
        private readonly Label installPathLabel = new();
        private readonly Label progressLabel = new();
        private readonly Label installedLocationLabel = new();
        private readonly Label installedLocationValue = new();
        private readonly PictureBox iconBox = new();
        private readonly ModernPill statusPill = new();
        private readonly SetupProgressBar installProgressBar = new();
        private readonly SegmentedToggle languageToggle = new(["English", "العربية"]);
        private readonly RoundedPanel pathPanel = new();
        private readonly RoundedPanel installedLocationPanel = new();
        private readonly TextBox installPathTextBox = new();
        private readonly ModernButton browseButton = new(ButtonRole.Secondary);
        private readonly ModernButton primaryButton = new(ButtonRole.Primary);
        private readonly ModernButton cancelButton = new(ButtonRole.Secondary);
        private readonly ToggleRow launchRow = new();
        private readonly ToggleRow desktopShortcutRow = new();
        private readonly ToggleRow removeShortcutsRow = new();
        private readonly ToggleRow keepDataRow = new();
        private SetupPalette palette;
        private string language = "en";

        public SetupForm(bool uninstallMode, string? requestedInstallDirectory = null, bool repairMode = false, bool updateMode = false, string? installedVersion = null)
        {
            this.uninstallMode = uninstallMode;
            this.repairMode = repairMode;
            this.updateMode = updateMode;
            this.installedVersion = installedVersion;
            language = DefaultLanguage();
            palette = SetupTheme.CurrentPalette();

            Text = uninstallMode ? "Uninstall Loaderly" : updateMode ? "Update Loaderly" : repairMode ? "Repair Loaderly" : "Install Loaderly";
            StartPosition = FormStartPosition.CenterScreen;
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MaximizeBox = false;
            MinimizeBox = false;
            ClientSize = SetupLayoutMetrics.ClientSize(uninstallMode);
            MinimumSize = Size;
            MaximumSize = Size;
            Font = new Font("Segoe UI", 10F);
            Icon = LoadIcon();
            DoubleBuffered = true;

            installPathTextBox.Text = string.IsNullOrWhiteSpace(requestedInstallDirectory)
                ? InstallDirectory()
                : NormalizeInstallDirectory(requestedInstallDirectory);

            BuildUi();
            ApplyTheme();
            ApplyLanguage();
            LayoutUi();
        }

        private void BuildUi()
        {
            appNameLabel.Font = new Font("Segoe UI", 10F, FontStyle.Bold);
            appNameLabel.Text = "Loaderly";
            Controls.Add(appNameLabel);

            var icon = LoadIcon();
            if (icon is not null)
            {
                iconBox.Image = icon.ToBitmap();
                iconBox.SizeMode = PictureBoxSizeMode.StretchImage;
            }
            Controls.Add(iconBox);

            titleLabel.Font = new Font("Segoe UI", 24F, FontStyle.Bold);
            titleLabel.AutoEllipsis = true;
            Controls.Add(titleLabel);

            statusPill.Text = uninstallMode ? "Installed" : repairMode ? "Repair" : "New install";
            Controls.Add(statusPill);

            languageToggle.SelectedIndex = language == "ar" ? 1 : 0;
            languageToggle.SelectedIndexChanged += (_, _) =>
            {
                language = languageToggle.SelectedIndex == 1 ? "ar" : "en";
                ApplyLanguage();
                LayoutUi();
            };
            Controls.Add(languageToggle);

            bodyLabel.Font = new Font("Segoe UI", 10.5F);
            Controls.Add(bodyLabel);

            installPathLabel.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold);
            Controls.Add(installPathLabel);

            pathPanel.Controls.Add(installPathTextBox);
            installPathTextBox.BorderStyle = BorderStyle.None;
            installPathTextBox.Font = new Font("Segoe UI", 10.5F);
            installPathTextBox.RightToLeft = RightToLeft.No;
            Controls.Add(pathPanel);

            browseButton.Click += (_, _) => BrowseInstallPath();
            Controls.Add(browseButton);

            launchRow.Checked = true;
            desktopShortcutRow.Checked = false;
            removeShortcutsRow.Checked = true;
            keepDataRow.Checked = true;
            keepDataRow.CanToggle = false;
            Controls.Add(launchRow);
            Controls.Add(desktopShortcutRow);
            Controls.Add(removeShortcutsRow);
            Controls.Add(keepDataRow);

            installedLocationLabel.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold);
            Controls.Add(installedLocationLabel);
            installedLocationPanel.Controls.Add(installedLocationValue);
            installedLocationValue.AutoEllipsis = true;
            installedLocationValue.Font = new Font("Segoe UI", 10.5F);
            installedLocationValue.TextAlign = ContentAlignment.MiddleLeft;
            installedLocationValue.Text = InstallDirectory();
            Controls.Add(installedLocationPanel);

            progressLabel.Font = new Font("Segoe UI", 9F);
            progressLabel.Visible = false;
            Controls.Add(progressLabel);

            installProgressBar.Visible = false;
            Controls.Add(installProgressBar);

            cancelButton.Click += (_, _) => Close();
            Controls.Add(cancelButton);

            primaryButton.Click += async (_, _) => await RunAsync();
            Controls.Add(primaryButton);
        }

        private void LayoutUi()
        {
            const int margin = 34;
            var width = ClientSize.Width - margin * 2;
            var y = 28;

            iconBox.SetBounds(margin, y + 2, 48, 48);
            appNameLabel.SetBounds(margin + 64, y, 220, 22);
            titleLabel.SetBounds(margin + 62, y + 22, width - 220, 46);
            statusPill.SetBounds(ClientSize.Width - margin - 128, y + 14, 128, 32);

            y += 82;
            languageToggle.SetBounds(margin, y, 264, 40);

            y += 58;
            bodyLabel.SetBounds(margin, y, width, uninstallMode ? 78 : 62);

            if (uninstallMode)
            {
                y += 96;
                installedLocationLabel.SetBounds(margin, y, width, 22);
                installedLocationPanel.SetBounds(margin, y + 28, width, 44);
                installedLocationValue.SetBounds(16, 0, installedLocationPanel.Width - 32, installedLocationPanel.Height);

                y += 90;
                removeShortcutsRow.SetBounds(margin, y, width, 56);
                keepDataRow.SetBounds(margin, y + 62, width, 56);
                launchRow.Visible = false;
                desktopShortcutRow.Visible = false;
                installPathLabel.Visible = false;
                pathPanel.Visible = false;
                browseButton.Visible = false;
            }
            else
            {
                y += 84;
                installPathLabel.SetBounds(margin, y, width, 22);
                pathPanel.SetBounds(margin, y + 28, width - 138, 44);
                installPathTextBox.SetBounds(16, 12, pathPanel.Width - 32, 22);
                browseButton.SetBounds(ClientSize.Width - margin - 118, y + 28, 118, 44);

                y += 94;
                launchRow.SetBounds(margin, y, width, 56);
                desktopShortcutRow.SetBounds(margin, y + 62, width, 56);
                removeShortcutsRow.Visible = false;
                keepDataRow.Visible = false;
                installedLocationLabel.Visible = false;
                installedLocationPanel.Visible = false;
            }

            LayoutActionButtons(margin);
            LayoutProgress(margin);
        }

        private void LayoutProgress(int margin)
        {
            var width = ClientSize.Width - margin * 2;
            var top = SetupLayoutMetrics.ProgressTopForTest(uninstallMode);
            progressLabel.SetBounds(margin, top, width, 18);
            installProgressBar.SetBounds(margin, top + 22, width, 8);
        }

        private void LayoutActionButtons(int margin)
        {
            const int primaryWidth = 150;
            const int cancelWidth = 118;
            const int buttonHeight = 44;
            const int gap = 12;
            var top = ClientSize.Height - 74;

            if (language == "ar")
            {
                primaryButton.SetBounds(margin, top, primaryWidth, buttonHeight);
                cancelButton.SetBounds(primaryButton.Right + gap, top, cancelWidth, buttonHeight);
                return;
            }

            primaryButton.SetBounds(ClientSize.Width - margin - primaryWidth, top, primaryWidth, buttonHeight);
            cancelButton.SetBounds(primaryButton.Left - gap - cancelWidth, top, cancelWidth, buttonHeight);
        }

        protected override void OnHandleCreated(EventArgs e)
        {
            base.OnHandleCreated(e);
            SetupTheme.ApplyTitleBarTheme(this, palette.IsDark);
        }

        protected override void WndProc(ref Message m)
        {
            base.WndProc(ref m);
            if (m.Msg == WmSettingChange)
            {
                ApplyTheme();
            }
        }

        private void ApplyTheme()
        {
            palette = SetupTheme.CurrentPalette();
            BackColor = palette.Window;
            ForeColor = palette.Text;
            appNameLabel.ForeColor = palette.MutedText;
            titleLabel.ForeColor = palette.Text;
            bodyLabel.ForeColor = palette.MutedText;
            installPathLabel.ForeColor = palette.Text;
            progressLabel.ForeColor = palette.MutedText;
            installedLocationLabel.ForeColor = palette.Text;
            installedLocationValue.ForeColor = palette.Text;
            installedLocationValue.BackColor = palette.Control;
            installPathTextBox.BackColor = palette.Control;
            installPathTextBox.ForeColor = palette.Text;
            pathPanel.Palette = palette;
            installedLocationPanel.Palette = palette;
            languageToggle.Palette = palette;
            statusPill.Palette = palette;
            installProgressBar.Palette = palette;
            browseButton.Palette = palette;
            primaryButton.Palette = palette;
            primaryButton.Role = uninstallMode ? ButtonRole.Danger : ButtonRole.Primary;
            cancelButton.Palette = palette;

            foreach (var row in new[] { launchRow, desktopShortcutRow, removeShortcutsRow, keepDataRow })
            {
                row.Palette = palette;
            }

            SetupTheme.ApplyTitleBarTheme(this, palette.IsDark);
            Invalidate(true);
        }

        private void ApplyLanguage()
        {
            var ar = language == "ar";
            RightToLeft = ar ? RightToLeft.Yes : RightToLeft.No;
            RightToLeftLayout = false; // The setup window positions custom controls manually.

            Text = uninstallMode
                ? ar ? "إلغاء تثبيت Loaderly" : "Uninstall Loaderly"
                : updateMode
                    ? ar ? "تحديث Loaderly" : "Update Loaderly"
                    : repairMode
                    ? ar ? "إصلاح Loaderly" : "Repair Loaderly"
                    : ar ? "تثبيت Loaderly" : "Install Loaderly";

            appNameLabel.Text = ar ? "مثبت Loaderly" : "Loaderly Setup";
            titleLabel.Text = Text;
            statusPill.Text = uninstallMode
                ? ar ? "مثبت حاليا" : "Installed"
                : updateMode
                    ? ar ? "تحديث" : "Update"
                    : repairMode
                    ? ar ? "إصلاح" : "Repair"
                    : ar ? "تثبيت جديد" : "New install";

            bodyLabel.Text = uninstallMode
                ? ar
                    ? $"تم العثور على Loaderly مثبتا{InstalledVersionText(ar)}. فتح المثبت الآن سيزيل التطبيق وملفات الاختصارات فقط، ولن يحذف التنزيلات أو الإعدادات."
                    : $"Loaderly is already installed{InstalledVersionText(ar)}. Opening setup now will uninstall the app and shortcuts only; downloads and settings stay in place."
                : updateMode
                    ? ar
                        ? $"سيتم تحديث Loaderly من الإصدار {installedVersion} إلى الإصدار {ProductVersion} مع الحفاظ على تنزيلاتك وإعداداتك."
                        : $"Loaderly will be updated from version {installedVersion} to version {ProductVersion} while keeping your downloads and settings."
                : repairMode
                    ? ar
                        ? "سيتم إصلاح ملفات Loaderly في مجلد التثبيت الحالي. استخدم هذا الوضع فقط عند تشغيل المثبت بخيار إصلاح أو تثبيت صريح."
                        : "Loaderly files will be repaired in the selected folder. This mode is only used when setup is launched with an explicit install or repair option."
                    : ar
                        ? "اختر اللغة ومجلد التثبيت. سيتم نسخ Loaderly والأدوات المطلوبة مع الحفاظ على تنزيلاتك."
                        : "Choose the language and install folder. Loaderly and its bundled tools will be copied without touching your downloads.";

            installPathLabel.Text = ar ? "مجلد التثبيت" : "Install folder";
            installedLocationLabel.Text = ar ? "مجلد Loaderly المثبت" : "Installed location";
            browseButton.Text = ar ? "استعراض" : "Browse";
            launchRow.Title = ar ? "تشغيل Loaderly بعد التثبيت" : "Launch Loaderly after install";
            launchRow.Description = ar ? "يفتح التطبيق مباشرة بعد انتهاء المثبت." : "Open the app immediately after setup finishes.";
            desktopShortcutRow.Title = ar ? "إنشاء اختصار سطح المكتب" : "Create desktop shortcut";
            desktopShortcutRow.Description = ar ? "يضيف اختصارا اختياريا بجانب اختصار قائمة ابدأ." : "Adds an optional desktop shortcut in addition to Start Menu entries.";
            removeShortcutsRow.Title = ar ? "إزالة اختصارات Loaderly" : "Remove Loaderly shortcuts";
            removeShortcutsRow.Description = ar ? "يحذف اختصارات قائمة ابدأ وسطح المكتب التي أنشأها المثبت." : "Deletes Start Menu and desktop shortcuts created by setup.";
            keepDataRow.Title = ar ? "الاحتفاظ بالتنزيلات والإعدادات" : "Keep downloads and settings";
            keepDataRow.Description = ar ? "إلغاء التثبيت لا يحذف ملفاتك أو إعداداتك الشخصية." : "Uninstall keeps your media files and personal settings.";
            cancelButton.Text = ar ? "إلغاء" : "Cancel";
            primaryButton.Text = uninstallMode
                ? ar ? "إلغاء التثبيت" : "Uninstall"
                : updateMode
                    ? ar ? "تحديث" : "Update"
                : repairMode
                    ? ar ? "إصلاح" : "Repair"
                    : ar ? "تثبيت" : "Install";

            foreach (var row in new[] { launchRow, desktopShortcutRow, removeShortcutsRow, keepDataRow })
            {
                row.RightToLeftLayout = ar;
            }

            Invalidate(true);
        }

        private string InstalledVersionText(bool ar)
        {
            return string.IsNullOrWhiteSpace(installedVersion)
                ? string.Empty
                : ar ? $" - الإصدار {installedVersion}" : $" - version {installedVersion}";
        }

        private async Task RunAsync()
        {
            primaryButton.Enabled = false;
            cancelButton.Enabled = false;
            try
            {
                var progress = new Progress<SetupProgressUpdate>(ApplyProgress);
                if (uninstallMode)
                {
                    await Task.Run(() => Uninstall(removeShortcutsRow.Checked, progress));
                    MessageBox.Show(this, language == "ar" ? "تم إلغاء تثبيت Loaderly." : "Loaderly was uninstalled.", Text, MessageBoxButtons.OK, MessageBoxIcon.Information);
                    Close();
                    return;
                }

                var installDir = SelectedInstallDirectory();
                var createDesktopShortcut = desktopShortcutRow.Checked;
                await Task.Run(() => Install(installDir, createDesktopShortcut, progress));
                var launchPath = Path.Combine(installDir, "Loaderly.exe");
                foreach (var step in SetupMode.InstallCompletionSteps(launchRow.Checked))
                {
                    switch (step)
                    {
                        case SetupCompletionStep.ShowSuccessMessage:
                            MessageBox.Show(this, language == "ar" ? "تم تثبيت Loaderly." : "Loaderly was installed.", Text, MessageBoxButtons.OK, MessageBoxIcon.Information);
                            break;
                        case SetupCompletionStep.CloseInstaller:
                            Close();
                            break;
                        case SetupCompletionStep.LaunchApp:
                            LaunchInstalledApp(launchPath);
                            break;
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(this, ex.Message, Text, MessageBoxButtons.OK, MessageBoxIcon.Error);
                primaryButton.Enabled = true;
                cancelButton.Enabled = true;
                installProgressBar.Visible = false;
                progressLabel.Visible = false;
            }
        }

        private void ApplyProgress(SetupProgressUpdate update)
        {
            progressLabel.Visible = true;
            installProgressBar.Visible = true;
            progressLabel.Text = SetupProgress.ProgressText(update.Label, update.Detail, language == "ar");
            installProgressBar.Value = update.Percent;
        }

        private void BrowseInstallPath()
        {
            using var dialog = new FolderBrowserDialog
            {
                Description = language == "ar" ? "اختر مجلد تثبيت Loaderly" : "Choose the Loaderly install folder",
                UseDescriptionForTitle = true,
                SelectedPath = Directory.Exists(installPathTextBox.Text)
                    ? installPathTextBox.Text
                    : Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData)
            };

            if (dialog.ShowDialog(this) == DialogResult.OK)
            {
                installPathTextBox.Text = dialog.SelectedPath;
            }
        }

        public void RunQuiet(bool launchAfterInstall)
        {
            if (uninstallMode)
            {
                Uninstall(removeShortcuts: true, progress: null);
                return;
            }

            var installDir = NormalizeInstallDirectory(installPathTextBox.Text);
            Install(installDir, createDesktopShortcut: false, progress: null);
            if (launchAfterInstall)
            {
                LaunchInstalledApp(Path.Combine(installDir, "Loaderly.exe"));
            }
        }

        private static void LaunchInstalledApp(string launchPath)
        {
            if (File.Exists(launchPath))
            {
                Process.Start(new ProcessStartInfo(launchPath) { UseShellExecute = true });
            }
        }

        private string SelectedInstallDirectory()
        {
            var installDir = NormalizeInstallDirectory(installPathTextBox.Text);
            ValidateInstallDirectory(installDir);
            installPathTextBox.Text = installDir;
            return installDir;
        }

        private static string NormalizeInstallDirectory(string path)
        {
            path = path.Trim().Trim('"');
            if (string.IsNullOrWhiteSpace(path))
            {
                throw new InvalidOperationException("Choose an install folder.");
            }

            return Path.GetFullPath(Environment.ExpandEnvironmentVariables(path));
        }

        private static void ValidateInstallDirectory(string installDir)
        {
            var root = Path.GetPathRoot(installDir);
            if (string.IsNullOrWhiteSpace(root) ||
                installDir.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar)
                    .Equals(root.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar), StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Choose a folder, not a drive root.");
            }

            if (!Directory.Exists(installDir))
            {
                return;
            }

            var entries = Directory.GetFileSystemEntries(installDir);
            if (entries.Length == 0 ||
                File.Exists(Path.Combine(installDir, "Loaderly.exe")) ||
                File.Exists(Path.Combine(installDir, "Loaderly-Uninstall.exe")) ||
                installDir.Equals(InstallDirectory(), StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            throw new InvalidOperationException("Choose an empty folder or an existing Loaderly install folder.");
        }

        private void Install(string installDir, bool createDesktopShortcut, IProgress<SetupProgressUpdate>? progress)
        {
            progress?.Report(SetupProgress.Update(5, SetupProgress.ClosingLoaderly));
            CloseRunningApp();
            progress?.Report(SetupProgress.Update(15, SetupProgress.PreparingFolder));
            ValidateInstallDirectory(installDir);
            Directory.CreateDirectory(installDir);
            foreach (var path in Directory.GetFileSystemEntries(installDir))
            {
                DeletePath(path);
            }

            using var payload = Assembly.GetExecutingAssembly().GetManifestResourceStream("LoaderlyPayload.zip")
                ?? throw new InvalidOperationException("Installer payload is missing.");
            using var archive = new ZipArchive(payload, ZipArchiveMode.Read);
            ExtractPayload(archive, installDir, progress);
            File.Copy(Application.ExecutablePath, Path.Combine(installDir, "Loaderly-Uninstall.exe"), overwrite: true);
            WriteLanguagePreference();
            progress?.Report(SetupProgress.Update(88, SetupProgress.CreatingShortcuts));
            CreateShortcuts(installDir, createDesktopShortcut);
            WriteUninstallEntry(installDir);
            progress?.Report(SetupProgress.Update(100, SetupProgress.Finishing));
        }

        private void Uninstall(bool removeShortcuts, IProgress<SetupProgressUpdate>? progress)
        {
            progress?.Report(SetupProgress.Update(10, SetupProgress.ClosingLoaderly));
            CloseRunningApp();
            progress?.Report(SetupProgress.Update(35, SetupProgress.RemovingFiles));
            if (removeShortcuts)
            {
                DeleteShortcuts();
            }

            Registry.CurrentUser.DeleteSubKeyTree(UninstallKey, throwOnMissingSubKey: false);
            var installDir = InstallDirectory();
            var current = Path.GetFullPath(Application.ExecutablePath);
            foreach (var path in Directory.Exists(installDir) ? Directory.GetFileSystemEntries(installDir) : Array.Empty<string>())
            {
                if (!Path.GetFullPath(path).Equals(current, StringComparison.OrdinalIgnoreCase))
                {
                    DeletePath(path);
                }
            }

            ScheduleDirectoryRemoval(installDir);
            progress?.Report(SetupProgress.Update(100, SetupProgress.Finishing));
        }

        private static void ExtractPayload(ZipArchive archive, string installDir, IProgress<SetupProgressUpdate>? progress)
        {
            var installRoot = Path.GetFullPath(installDir);
            var entries = archive.Entries.Where(entry => !string.IsNullOrWhiteSpace(entry.FullName)).ToList();
            var files = Math.Max(1, entries.Count(entry => !string.IsNullOrEmpty(entry.Name)));
            var copied = 0;
            progress?.Report(SetupProgress.Update(25, SetupProgress.CopyingFiles));

            foreach (var entry in entries)
            {
                var targetPath = Path.GetFullPath(Path.Combine(installRoot, entry.FullName));
                if (!targetPath.StartsWith(installRoot.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar) + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase) &&
                    !targetPath.Equals(installRoot, StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException("Installer payload contains an invalid path.");
                }

                if (string.IsNullOrEmpty(entry.Name))
                {
                    Directory.CreateDirectory(targetPath);
                    continue;
                }

                Directory.CreateDirectory(Path.GetDirectoryName(targetPath) ?? installRoot);
                entry.ExtractToFile(targetPath, overwrite: true);
                copied++;
                var percent = 25 + (int)Math.Round(Math.Min(copied, files) * 55D / files);
                progress?.Report(SetupProgress.Update(percent, SetupProgress.CopyingFiles, entry.Name));
            }
        }

        private void WriteLanguagePreference()
        {
            using var key = Registry.CurrentUser.CreateSubKey(RegistryLanguageKey);
            key?.SetValue("Language", language, RegistryValueKind.String);
        }

        private static void WriteUninstallEntry(string installDir)
        {
            var uninstallPath = Path.Combine(installDir, "Loaderly-Uninstall.exe");
            using var key = Registry.CurrentUser.CreateSubKey(UninstallKey);
            key?.SetValue("DisplayName", Program.ProductName, RegistryValueKind.String);
            key?.SetValue("DisplayVersion", Program.ProductVersion, RegistryValueKind.String);
            key?.SetValue("Publisher", Program.ProductName, RegistryValueKind.String);
            key?.SetValue("InstallLocation", installDir, RegistryValueKind.String);
            key?.SetValue("DisplayIcon", Path.Combine(installDir, "Loaderly.exe"), RegistryValueKind.String);
            key?.SetValue("UninstallString", $"\"{uninstallPath}\" --uninstall", RegistryValueKind.String);
            key?.SetValue("QuietUninstallString", $"\"{uninstallPath}\" --uninstall --quiet", RegistryValueKind.String);
            key?.SetValue("NoModify", 1, RegistryValueKind.DWord);
            key?.SetValue("NoRepair", 1, RegistryValueKind.DWord);
        }

        private static void CreateShortcuts(string installDir, bool createDesktopShortcut)
        {
            var group = StartMenuFolder();
            Directory.CreateDirectory(group);
            CreateShortcut(Path.Combine(group, "Loaderly.lnk"), Path.Combine(installDir, "Loaderly.exe"));
            CreateShortcut(Path.Combine(group, "Uninstall Loaderly.lnk"), Path.Combine(installDir, "Loaderly-Uninstall.exe"), "--uninstall");
            if (createDesktopShortcut)
            {
                CreateShortcut(Path.Combine(DesktopFolder(), "Loaderly.lnk"), Path.Combine(installDir, "Loaderly.exe"));
            }
        }

        private static void DeleteShortcuts()
        {
            var group = StartMenuFolder();
            if (Directory.Exists(group))
            {
                Directory.Delete(group, recursive: true);
            }

            var desktopShortcut = Path.Combine(DesktopFolder(), "Loaderly.lnk");
            if (File.Exists(desktopShortcut))
            {
                File.Delete(desktopShortcut);
            }
        }

        private static void CreateShortcut(string shortcutPath, string targetPath, string arguments = "")
        {
            var shellType = Type.GetTypeFromProgID("WScript.Shell");
            if (shellType is null)
            {
                return;
            }

            dynamic shell = Activator.CreateInstance(shellType)!;
            dynamic shortcut = shell.CreateShortcut(shortcutPath);
            shortcut.TargetPath = targetPath;
            shortcut.Arguments = arguments;
            shortcut.WorkingDirectory = Path.GetDirectoryName(targetPath);
            shortcut.IconLocation = targetPath;
            shortcut.Save();
        }

        private static void CloseRunningApp()
        {
            foreach (var process in Process.GetProcessesByName("Loaderly"))
            {
                try
                {
                    process.CloseMainWindow();
                    if (!process.WaitForExit(5000))
                    {
                        process.Kill(entireProcessTree: true);
                        process.WaitForExit(5000);
                    }
                }
                catch
                {
                }
                finally
                {
                    process.Dispose();
                }
            }
        }

        private static void DeletePath(string path)
        {
            if (Directory.Exists(path))
            {
                Directory.Delete(path, recursive: true);
            }
            else if (File.Exists(path))
            {
                File.Delete(path);
            }
        }

        private static void ScheduleDirectoryRemoval(string installDir)
        {
            if (!Directory.Exists(installDir))
            {
                return;
            }

            Process.Start(new ProcessStartInfo
            {
                FileName = "cmd.exe",
                Arguments = $"/c timeout /t 2 /nobreak > nul & rmdir /s /q \"{installDir}\"",
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden
            });
        }

        private static string DefaultLanguage()
        {
            var registry = Registry.CurrentUser.OpenSubKey(RegistryLanguageKey)?.GetValue("Language")?.ToString();
            if (!string.IsNullOrWhiteSpace(registry))
            {
                return registry.Equals("ar", StringComparison.OrdinalIgnoreCase) ||
                       registry.Contains("arabic", StringComparison.OrdinalIgnoreCase)
                    ? "ar"
                    : "en";
            }

            return Thread.CurrentThread.CurrentUICulture.TwoLetterISOLanguageName.Equals("ar", StringComparison.OrdinalIgnoreCase)
                ? "ar"
                : "en";
        }

        private static string InstallDirectory()
        {
            return Program.InstallDirectory();
        }

        private static string StartMenuFolder()
        {
            return Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "Microsoft",
                "Windows",
                "Start Menu",
                "Programs",
                Program.ProductName);
        }

        private static string DesktopFolder()
        {
            return Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
        }

        private static Icon? LoadIcon()
        {
            var iconPath = Path.Combine(AppContext.BaseDirectory, "assets", "loaderly.ico");
            return File.Exists(iconPath) ? new Icon(iconPath) : null;
        }
    }
}

internal static class SetupTheme
{
    private const string PersonalizeKey = @"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize";
    private const int DwmUseImmersiveDarkMode = 20;
    private const int DwmUseImmersiveDarkModeBefore20H1 = 19;

    public static SetupPalette CurrentPalette()
    {
        return PaletteForSystemLightMode(AppsUseLightTheme());
    }

    internal static SetupPalette PaletteForSystemLightModeForTest(bool appsUseLightTheme)
    {
        return PaletteForSystemLightMode(appsUseLightTheme);
    }

    public static bool AppsUseLightTheme()
    {
        using var key = Registry.CurrentUser.OpenSubKey(PersonalizeKey);
        var value = key?.GetValue("AppsUseLightTheme");
        return value is not int intValue || intValue != 0;
    }

    public static void ApplyTitleBarTheme(Form form, bool dark)
    {
        if (!form.IsHandleCreated)
        {
            return;
        }

        var value = dark ? 1 : 0;
        _ = DwmSetWindowAttribute(form.Handle, DwmUseImmersiveDarkMode, ref value, sizeof(int));
        _ = DwmSetWindowAttribute(form.Handle, DwmUseImmersiveDarkModeBefore20H1, ref value, sizeof(int));
    }

    private static SetupPalette PaletteForSystemLightMode(bool appsUseLightTheme)
    {
        return appsUseLightTheme
            ? new SetupPalette(
                IsDark: false,
                Window: Color.FromArgb(246, 248, 252),
                Control: Color.FromArgb(255, 255, 255),
                ControlAlt: Color.FromArgb(236, 241, 248),
                Selected: Color.FromArgb(221, 234, 255),
                Border: Color.FromArgb(207, 216, 230),
                Text: Color.FromArgb(18, 24, 38),
                MutedText: Color.FromArgb(75, 88, 109),
                SecondaryButton: Color.FromArgb(235, 241, 249),
                SecondaryHover: Color.FromArgb(224, 233, 246),
                SecondaryPressed: Color.FromArgb(211, 224, 242),
                Accent: Color.FromArgb(52, 118, 245),
                AccentHover: Color.FromArgb(72, 134, 250),
                AccentPressed: Color.FromArgb(38, 96, 214),
                Danger: Color.FromArgb(218, 72, 72),
                DangerHover: Color.FromArgb(229, 86, 86),
                DangerPressed: Color.FromArgb(190, 54, 54))
            : new SetupPalette(
                IsDark: true,
                Window: Color.FromArgb(9, 12, 18),
                Control: Color.FromArgb(20, 25, 35),
                ControlAlt: Color.FromArgb(30, 37, 51),
                Selected: Color.FromArgb(35, 62, 108),
                Border: Color.FromArgb(51, 61, 80),
                Text: Color.FromArgb(244, 247, 252),
                MutedText: Color.FromArgb(178, 190, 210),
                SecondaryButton: Color.FromArgb(31, 39, 55),
                SecondaryHover: Color.FromArgb(39, 48, 67),
                SecondaryPressed: Color.FromArgb(50, 60, 82),
                Accent: Color.FromArgb(82, 147, 247),
                AccentHover: Color.FromArgb(101, 163, 255),
                AccentPressed: Color.FromArgb(56, 121, 222),
                Danger: Color.FromArgb(226, 83, 83),
                DangerHover: Color.FromArgb(238, 97, 97),
                DangerPressed: Color.FromArgb(198, 61, 61));
    }

    [DllImport("dwmapi.dll")]
    private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attribute, ref int attributeValue, int attributeSize);
}

internal sealed record SetupPalette(
    bool IsDark,
    Color Window,
    Color Control,
    Color ControlAlt,
    Color Selected,
    Color Border,
    Color Text,
    Color MutedText,
    Color SecondaryButton,
    Color SecondaryHover,
    Color SecondaryPressed,
    Color Accent,
    Color AccentHover,
    Color AccentPressed,
    Color Danger,
    Color DangerHover,
    Color DangerPressed);

internal static class SetupLayoutMetrics
{
    private const int Top = 28;
    private const int HeaderStep = 82;
    private const int LanguageStep = 58;
    private const int UninstallDetailsStep = 96;
    private const int InstallDetailsStep = 84;
    private const int UninstallOptionsStep = 90;
    private const int InstallOptionsStep = 94;
    private const int RowSpacing = 62;
    private const int RowHeight = 56;
    private const int ButtonBottomInset = 74;
    private const int ProgressBlockHeight = 30;
    private const int ProgressButtonGap = 10;

    public static Size ClientSize(bool uninstallMode)
    {
        return uninstallMode ? new Size(660, 610) : new Size(680, 610);
    }

    public static int ButtonTopForTest(bool uninstallMode)
    {
        return ClientSize(uninstallMode).Height - ButtonBottomInset;
    }

    public static int LastOptionBottomForTest(bool uninstallMode)
    {
        var y = Top + HeaderStep + LanguageStep;
        y += uninstallMode ? UninstallDetailsStep : InstallDetailsStep;
        y += uninstallMode ? UninstallOptionsStep : InstallOptionsStep;
        return y + RowSpacing + RowHeight;
    }

    public static int OptionButtonGapForTest(bool uninstallMode)
    {
        return ButtonTopForTest(uninstallMode) - LastOptionBottomForTest(uninstallMode);
    }

    public static int ProgressTopForTest(bool uninstallMode)
    {
        return ButtonTopForTest(uninstallMode) - ProgressButtonGap - ProgressBlockHeight;
    }

    public static int ProgressButtonGapForTest(bool uninstallMode)
    {
        return ButtonTopForTest(uninstallMode) - (ProgressTopForTest(uninstallMode) + ProgressBlockHeight);
    }
}

internal static class SetupChrome
{
    public const int ButtonRadius = 10;
    public const int SegmentedToggleRadius = 12;
    public const int SegmentedSelectionRadius = 9;
    public const int ToggleRowRadius = 12;
    public const int RoundedPanelRadius = 12;

    public static int ButtonRadiusForTest => ButtonRadius;
    public static int RoundedPanelRadiusForTest => RoundedPanelRadius;

    public static bool UsesTransparentControlBackgroundsForTest()
    {
        return true;
    }

    public static void PaintTransparentBackground(Control control, PaintEventArgs e)
    {
        var parentBackColor = control.Parent?.BackColor;
        if (parentBackColor is { A: > 0 } color)
        {
            e.Graphics.Clear(color);
            return;
        }

        e.Graphics.Clear(SetupTheme.CurrentPalette().Window);
    }
}

internal sealed record SetupProgressUpdate(int Percent, string Label, string? Detail = null);

internal static class SetupProgress
{
    public const string ClosingLoaderly = "Closing Loaderly";
    public const string PreparingFolder = "Preparing folder";
    public const string CopyingFiles = "Copying files";
    public const string CreatingShortcuts = "Creating shortcuts";
    public const string RemovingFiles = "Removing files";
    public const string Finishing = "Finishing";

    public static SetupProgressUpdate Update(int percent, string label, string? detail = null)
    {
        return new SetupProgressUpdate(Math.Clamp(percent, 0, 100), label, detail);
    }

    public static IReadOnlyList<string> InstallStageLabels()
    {
        return [ClosingLoaderly, PreparingFolder, CopyingFiles, CreatingShortcuts, Finishing];
    }

    internal static IReadOnlyList<string> InstallStageLabelsForTest()
    {
        return InstallStageLabels();
    }

    public static string LocalizedLabel(string label, bool ar)
    {
        if (!ar)
        {
            return label;
        }

        return label switch
        {
            ClosingLoaderly => "إغلاق Loaderly",
            PreparingFolder => "تجهيز مجلد التثبيت",
            CopyingFiles => "نسخ الملفات",
            CreatingShortcuts => "إنشاء الاختصارات",
            RemovingFiles => "إزالة الملفات",
            Finishing => "إنهاء التثبيت",
            _ => label
        };
    }

    public static string ProgressText(string label, string? detail, bool ar)
    {
        var localized = LocalizedLabel(label, ar);
        return string.IsNullOrWhiteSpace(detail) ? localized : $"{localized}: {detail}";
    }

    internal static string ProgressTextForTest(string label, string? detail, bool ar)
    {
        return ProgressText(label, detail, ar);
    }
}

internal enum ButtonRole
{
    Primary,
    Secondary,
    Danger
}

internal sealed class ModernButton : Button
{
    private bool hovering;
    private bool pressing;
    private SetupPalette palette = SetupTheme.CurrentPalette();
    private ButtonRole role;

    public ModernButton(ButtonRole role)
    {
        this.role = role;
        FlatStyle = FlatStyle.Flat;
        FlatAppearance.BorderSize = 0;
        FlatAppearance.MouseDownBackColor = Color.Transparent;
        FlatAppearance.MouseOverBackColor = Color.Transparent;
        UseVisualStyleBackColor = false;
        SetStyle(
            ControlStyles.UserPaint |
            ControlStyles.AllPaintingInWmPaint |
            ControlStyles.OptimizedDoubleBuffer |
            ControlStyles.ResizeRedraw |
            ControlStyles.SupportsTransparentBackColor,
            true);
        BackColor = Color.Transparent;
        Cursor = Cursors.Hand;
        Font = new Font("Segoe UI", 10F, FontStyle.Bold);
    }

    public SetupPalette Palette
    {
        get => palette;
        set
        {
            palette = value;
            Invalidate();
        }
    }

    public ButtonRole Role
    {
        get => role;
        set
        {
            role = value;
            Invalidate();
        }
    }

    protected override void OnMouseEnter(EventArgs e)
    {
        hovering = true;
        Invalidate();
        base.OnMouseEnter(e);
    }

    protected override void OnMouseLeave(EventArgs e)
    {
        hovering = false;
        pressing = false;
        Invalidate();
        base.OnMouseLeave(e);
    }

    protected override void OnMouseDown(MouseEventArgs mevent)
    {
        pressing = true;
        Invalidate();
        base.OnMouseDown(mevent);
    }

    protected override void OnMouseUp(MouseEventArgs mevent)
    {
        pressing = false;
        Invalidate();
        base.OnMouseUp(mevent);
    }

    protected override void OnResize(EventArgs e)
    {
        base.OnResize(e);
        UpdateRoundedRegion();
    }

    protected override void OnPaintBackground(PaintEventArgs pevent)
    {
        SetupChrome.PaintTransparentBackground(this, pevent);
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
        var (back, fore, border) = Colors();
        using var path = RoundedRect(new Rectangle(0, 0, Width - 1, Height - 1), SetupChrome.ButtonRadius);
        using var brush = new SolidBrush(back);
        using var pen = new Pen(border);
        e.Graphics.FillPath(brush, path);
        e.Graphics.DrawPath(pen, path);
        TextRenderer.DrawText(
            e.Graphics,
            Text,
            Font,
            ClientRectangle,
            Enabled ? fore : Color.FromArgb(120, palette.MutedText),
            TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.EndEllipsis);
    }

    private (Color Back, Color Fore, Color Border) Colors()
    {
        if (role == ButtonRole.Secondary)
        {
            return (pressing ? palette.SecondaryPressed : hovering ? palette.SecondaryHover : palette.SecondaryButton, palette.Text, palette.Border);
        }

        if (role == ButtonRole.Danger)
        {
            return (pressing ? palette.DangerPressed : hovering ? palette.DangerHover : palette.Danger, Color.White, Color.Transparent);
        }

        return (pressing ? palette.AccentPressed : hovering ? palette.AccentHover : palette.Accent, Color.White, Color.Transparent);
    }

    private void UpdateRoundedRegion()
    {
        var oldRegion = Region;
        if (Width <= 0 || Height <= 0)
        {
            Region = null;
            oldRegion?.Dispose();
            return;
        }

        using var path = RoundedRect(new Rectangle(0, 0, Width, Height), SetupChrome.ButtonRadius);
        Region = new Region(path);
        oldRegion?.Dispose();
    }
}

internal sealed class SegmentedToggle : Control
{
    private readonly string[] items;
    private SetupPalette palette = SetupTheme.CurrentPalette();
    private int selectedIndex;

    public SegmentedToggle(string[] items)
    {
        this.items = items;
        SetStyle(
            ControlStyles.UserPaint |
            ControlStyles.AllPaintingInWmPaint |
            ControlStyles.OptimizedDoubleBuffer |
            ControlStyles.ResizeRedraw |
            ControlStyles.SupportsTransparentBackColor,
            true);
        BackColor = Color.Transparent;
        Cursor = Cursors.Hand;
        Font = new Font("Segoe UI", 10F, FontStyle.Bold);
    }

    public event EventHandler? SelectedIndexChanged;

    public SetupPalette Palette
    {
        get => palette;
        set
        {
            palette = value;
            Invalidate();
        }
    }

    public int SelectedIndex
    {
        get => selectedIndex;
        set
        {
            var next = Math.Clamp(value, 0, items.Length - 1);
            if (selectedIndex == next)
            {
                return;
            }

            selectedIndex = next;
            Invalidate();
            SelectedIndexChanged?.Invoke(this, EventArgs.Empty);
        }
    }

    protected override void OnMouseDown(MouseEventArgs e)
    {
        var segmentWidth = Width / items.Length;
        SelectedIndex = Math.Min(items.Length - 1, Math.Max(0, e.X / Math.Max(1, segmentWidth)));
        base.OnMouseDown(e);
    }

    protected override void OnPaintBackground(PaintEventArgs pevent)
    {
        SetupChrome.PaintTransparentBackground(this, pevent);
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
        using var outer = RoundedRect(new Rectangle(0, 0, Width - 1, Height - 1), SetupChrome.SegmentedToggleRadius);
        using var back = new SolidBrush(palette.ControlAlt);
        using var border = new Pen(palette.Border);
        e.Graphics.FillPath(back, outer);
        e.Graphics.DrawPath(border, outer);

        var segmentWidth = Width / items.Length;
        var selectedBounds = new Rectangle(selectedIndex * segmentWidth + 4, 4, segmentWidth - 8, Height - 8);
        using var selected = RoundedRect(selectedBounds, SetupChrome.SegmentedSelectionRadius);
        using var selectedBrush = new SolidBrush(palette.Selected);
        e.Graphics.FillPath(selectedBrush, selected);

        for (var i = 0; i < items.Length; i++)
        {
            var bounds = new Rectangle(i * segmentWidth, 0, segmentWidth, Height);
            TextRenderer.DrawText(
                e.Graphics,
                items[i],
                Font,
                bounds,
                i == selectedIndex ? palette.Text : palette.MutedText,
                TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.EndEllipsis);
        }
    }
}

internal sealed class ToggleRow : Control
{
    private bool isChecked;
    private SetupPalette palette = SetupTheme.CurrentPalette();

    public ToggleRow()
    {
        SetStyle(
            ControlStyles.UserPaint |
            ControlStyles.AllPaintingInWmPaint |
            ControlStyles.OptimizedDoubleBuffer |
            ControlStyles.ResizeRedraw |
            ControlStyles.SupportsTransparentBackColor,
            true);
        BackColor = Color.Transparent;
        Cursor = Cursors.Hand;
        Font = new Font("Segoe UI", 10F, FontStyle.Bold);
    }

    public SetupPalette Palette
    {
        get => palette;
        set
        {
            palette = value;
            Invalidate();
        }
    }

    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool RightToLeftLayout { get; set; }
    public bool CanToggle { get; set; } = true;

    public bool Checked
    {
        get => isChecked;
        set
        {
            if (isChecked == value)
            {
                return;
            }

            isChecked = value;
            Invalidate();
        }
    }

    protected override void OnClick(EventArgs e)
    {
        if (CanToggle)
        {
            Checked = !Checked;
        }

        base.OnClick(e);
    }

    protected override void OnPaintBackground(PaintEventArgs pevent)
    {
        SetupChrome.PaintTransparentBackground(this, pevent);
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
        using var outer = RoundedRect(new Rectangle(0, 0, Width - 1, Height - 1), SetupChrome.ToggleRowRadius);
        using var back = new SolidBrush(palette.Control);
        using var border = new Pen(palette.Border);
        e.Graphics.FillPath(back, outer);
        e.Graphics.DrawPath(border, outer);

        var toggleBounds = RightToLeftLayout
            ? new Rectangle(16, 14, 50, 28)
            : new Rectangle(Width - 66, 14, 50, 28);
        DrawSwitch(e.Graphics, toggleBounds);

        var textLeft = RightToLeftLayout ? 80 : 18;
        var textWidth = Width - 98;
        var titleBounds = new Rectangle(textLeft, 9, textWidth, 22);
        var descBounds = new Rectangle(textLeft, 31, textWidth, 18);
        var flags = TextFormatFlags.EndEllipsis | (RightToLeftLayout ? TextFormatFlags.RightToLeft | TextFormatFlags.Right : TextFormatFlags.Left);
        TextRenderer.DrawText(e.Graphics, Title, Font, titleBounds, palette.Text, flags);
        TextRenderer.DrawText(e.Graphics, Description, new Font("Segoe UI", 8.8F), descBounds, palette.MutedText, flags);
    }

    private void DrawSwitch(Graphics graphics, Rectangle bounds)
    {
        using var track = RoundedRect(bounds, bounds.Height / 2);
        using var trackBrush = new SolidBrush(Checked ? palette.Accent : palette.ControlAlt);
        using var trackPen = new Pen(Checked ? palette.Accent : palette.Border);
        graphics.FillPath(trackBrush, track);
        graphics.DrawPath(trackPen, track);

        var knobSize = bounds.Height - 8;
        var knobX = Checked ? bounds.Right - knobSize - 4 : bounds.Left + 4;
        var knobBounds = new Rectangle(knobX, bounds.Top + 4, knobSize, knobSize);
        using var knob = new SolidBrush(Color.White);
        graphics.FillEllipse(knob, knobBounds);
    }
}

internal sealed class ModernPill : Control
{
    private SetupPalette palette = SetupTheme.CurrentPalette();

    public ModernPill()
    {
        SetStyle(
            ControlStyles.UserPaint |
            ControlStyles.AllPaintingInWmPaint |
            ControlStyles.OptimizedDoubleBuffer |
            ControlStyles.ResizeRedraw |
            ControlStyles.SupportsTransparentBackColor,
            true);
        BackColor = Color.Transparent;
        Font = new Font("Segoe UI", 9F, FontStyle.Bold);
    }

    public SetupPalette Palette
    {
        get => palette;
        set
        {
            palette = value;
            Invalidate();
        }
    }

    protected override void OnPaintBackground(PaintEventArgs pevent)
    {
        SetupChrome.PaintTransparentBackground(this, pevent);
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
        using var path = RoundedRect(new Rectangle(0, 0, Width - 1, Height - 1), Height / 2);
        using var back = new SolidBrush(palette.ControlAlt);
        using var border = new Pen(palette.Border);
        e.Graphics.FillPath(back, path);
        e.Graphics.DrawPath(border, path);
        TextRenderer.DrawText(e.Graphics, Text, Font, ClientRectangle, palette.Text, TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.EndEllipsis);
    }
}

internal sealed class SetupProgressBar : Control
{
    private SetupPalette palette = SetupTheme.CurrentPalette();
    private int value;

    public SetupPalette Palette
    {
        get => palette;
        set
        {
            palette = value;
            Invalidate();
        }
    }

    public int Value
    {
        get => value;
        set
        {
            var next = Math.Clamp(value, 0, 100);
            if (this.value == next)
            {
                return;
            }

            this.value = next;
            Invalidate();
        }
    }

    public SetupProgressBar()
    {
        SetStyle(
            ControlStyles.UserPaint |
            ControlStyles.AllPaintingInWmPaint |
            ControlStyles.OptimizedDoubleBuffer |
            ControlStyles.ResizeRedraw |
            ControlStyles.SupportsTransparentBackColor,
            true);
        BackColor = Color.Transparent;
    }

    protected override void OnPaintBackground(PaintEventArgs e)
    {
        SetupChrome.PaintTransparentBackground(this, e);
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
        var track = new Rectangle(0, 1, Width - 1, Math.Max(2, Height - 2));
        if (track.Width <= 0)
        {
            return;
        }

        using (var trackPath = RoundedRect(track, track.Height / 2))
        using (var trackBrush = new SolidBrush(palette.ControlAlt))
        {
            e.Graphics.FillPath(trackBrush, trackPath);
        }

        var fillWidth = Math.Max(track.Height, (int)Math.Round(track.Width * value / 100D));
        var fill = new Rectangle(track.Left, track.Top, Math.Min(track.Width, fillWidth), track.Height);
        using var fillPath = RoundedRect(fill, fill.Height / 2);
        using var fillBrush = new SolidBrush(palette.Accent);
        e.Graphics.FillPath(fillBrush, fillPath);
    }
}

internal sealed class RoundedPanel : Panel
{
    private SetupPalette palette = SetupTheme.CurrentPalette();

    public RoundedPanel()
    {
        SetStyle(
            ControlStyles.UserPaint |
            ControlStyles.AllPaintingInWmPaint |
            ControlStyles.OptimizedDoubleBuffer |
            ControlStyles.ResizeRedraw |
            ControlStyles.SupportsTransparentBackColor,
            true);
        BackColor = Color.Transparent;
    }

    public SetupPalette Palette
    {
        get => palette;
        set
        {
            palette = value;
            Invalidate();
        }
    }

    protected override void OnPaintBackground(PaintEventArgs e)
    {
        SetupChrome.PaintTransparentBackground(this, e);
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
        using var path = RoundedRect(new Rectangle(0, 0, Width - 1, Height - 1), SetupChrome.RoundedPanelRadius);
        using var back = new SolidBrush(palette.Control);
        using var border = new Pen(palette.Border);
        e.Graphics.FillPath(back, path);
        e.Graphics.DrawPath(border, path);
    }
}

internal enum SetupCompletionStep
{
    ShowSuccessMessage,
    CloseInstaller,
    LaunchApp
}

internal static class SetupMode
{
    public static bool ShouldUseUninstallMode(bool requestedUninstall, string? installedVersion, string installerVersion)
    {
        return ShouldUseUninstallMode(requestedUninstall, forceInstall: false, installedVersion, installerVersion);
    }

    public static bool ShouldUseUninstallMode(bool requestedUninstall, bool forceInstall, string? installedVersion, string installerVersion)
    {
        if (requestedUninstall)
        {
            return true;
        }

        if (forceInstall || IsNewerInstaller(installedVersion, installerVersion))
        {
            return false;
        }

        return !string.IsNullOrWhiteSpace(installedVersion);
    }

    internal static bool ShouldUseUninstallModeForTest(bool requestedUninstall, string? installedVersion, string installerVersion)
    {
        return ShouldUseUninstallMode(requestedUninstall, installedVersion, installerVersion);
    }

    internal static bool ShouldUseUninstallModeForTest(bool requestedUninstall, bool forceInstall, string? installedVersion, string installerVersion)
    {
        return ShouldUseUninstallMode(requestedUninstall, forceInstall, installedVersion, installerVersion);
    }

    public static bool IsUninstallRequest(IEnumerable<string> args)
    {
        return args.Any(arg => arg.Equals("--uninstall", StringComparison.OrdinalIgnoreCase) ||
                               arg.Equals("/uninstall", StringComparison.OrdinalIgnoreCase));
    }

    public static bool ShouldForceInstall(IEnumerable<string> args)
    {
        return args.Any(arg => arg.Equals("--install", StringComparison.OrdinalIgnoreCase) ||
                               arg.Equals("--repair", StringComparison.OrdinalIgnoreCase) ||
                               arg.Equals("--update", StringComparison.OrdinalIgnoreCase) ||
                               arg.Equals("/install", StringComparison.OrdinalIgnoreCase) ||
                               arg.Equals("/repair", StringComparison.OrdinalIgnoreCase) ||
                               arg.Equals("/update", StringComparison.OrdinalIgnoreCase));
    }

    internal static bool ShouldForceInstallForTest(IEnumerable<string> args)
    {
        return ShouldForceInstall(args);
    }

    public static bool ShouldUseUpdateMode(IEnumerable<string> args, string? installedVersion, string installerVersion)
    {
        if (string.IsNullOrWhiteSpace(installedVersion))
        {
            return false;
        }

        return args.Any(arg => arg.Equals("--update", StringComparison.OrdinalIgnoreCase) ||
                               arg.Equals("/update", StringComparison.OrdinalIgnoreCase)) ||
               IsNewerInstaller(installedVersion, installerVersion);
    }

    internal static bool ShouldUseUpdateModeForTest(IEnumerable<string> args, string? installedVersion, string installerVersion)
    {
        return ShouldUseUpdateMode(args, installedVersion, installerVersion);
    }

    public static bool IsQuiet(IEnumerable<string> args)
    {
        return args.Any(arg => arg.Equals("--quiet", StringComparison.OrdinalIgnoreCase) ||
                               arg.Equals("/quiet", StringComparison.OrdinalIgnoreCase) ||
                               arg.Equals("/qn", StringComparison.OrdinalIgnoreCase));
    }

    internal static bool IsQuietForTest(IEnumerable<string> args)
    {
        return IsQuiet(args);
    }

    public static bool ShouldLaunchAfterQuietInstall(IEnumerable<string> args)
    {
        return args.Any(arg => arg.Equals("--launch", StringComparison.OrdinalIgnoreCase));
    }

    internal static bool ShouldLaunchAfterQuietInstallForTest(IEnumerable<string> args)
    {
        return ShouldLaunchAfterQuietInstall(args);
    }

    public static string? InstallDirectoryArgument(IReadOnlyList<string> args)
    {
        for (var i = 0; i < args.Count; i++)
        {
            var arg = args[i];
            if (arg.Equals("--install-dir", StringComparison.OrdinalIgnoreCase) ||
                arg.Equals("/install-dir", StringComparison.OrdinalIgnoreCase))
            {
                return i + 1 < args.Count ? args[i + 1] : null;
            }

            const string longPrefix = "--install-dir=";
            const string slashPrefix = "/install-dir=";
            if (arg.StartsWith(longPrefix, StringComparison.OrdinalIgnoreCase))
            {
                return arg[longPrefix.Length..];
            }

            if (arg.StartsWith(slashPrefix, StringComparison.OrdinalIgnoreCase))
            {
                return arg[slashPrefix.Length..];
            }
        }

        return null;
    }

    internal static string? InstallDirectoryArgumentForTest(IReadOnlyList<string> args)
    {
        return InstallDirectoryArgument(args);
    }

    public static IReadOnlyList<SetupCompletionStep> InstallCompletionSteps(bool launchAfterInstall)
    {
        return launchAfterInstall
            ? [SetupCompletionStep.ShowSuccessMessage, SetupCompletionStep.CloseInstaller, SetupCompletionStep.LaunchApp]
            : [SetupCompletionStep.ShowSuccessMessage, SetupCompletionStep.CloseInstaller];
    }

    internal static IReadOnlyList<SetupCompletionStep> InstallCompletionStepsForTest(bool launchAfterInstall)
    {
        return InstallCompletionSteps(launchAfterInstall);
    }

    private static bool IsNewerInstaller(string? installedVersion, string installerVersion)
    {
        return TryParseVersion(installedVersion, out var installed) &&
               TryParseVersion(installerVersion, out var installer) &&
               installer.CompareTo(installed) > 0;
    }

    private static bool TryParseVersion(string? value, out Version version)
    {
        version = new Version(0, 0, 0);
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        var cleaned = value.Trim();
        if (cleaned.StartsWith('v') || cleaned.StartsWith('V'))
        {
            cleaned = cleaned[1..];
        }

        if (Version.TryParse(cleaned, out var parsed))
        {
            version = parsed;
            return true;
        }

        return false;
    }
}

internal static class DrawingHelpers
{
    public static GraphicsPath RoundedRect(Rectangle bounds, int radius)
    {
        var diameter = radius * 2;
        var path = new GraphicsPath();
        if (diameter <= 0)
        {
            path.AddRectangle(bounds);
            return path;
        }

        path.AddArc(bounds.Left, bounds.Top, diameter, diameter, 180, 90);
        path.AddArc(bounds.Right - diameter, bounds.Top, diameter, diameter, 270, 90);
        path.AddArc(bounds.Right - diameter, bounds.Bottom - diameter, diameter, diameter, 0, 90);
        path.AddArc(bounds.Left, bounds.Bottom - diameter, diameter, diameter, 90, 90);
        path.CloseFigure();
        return path;
    }
}
