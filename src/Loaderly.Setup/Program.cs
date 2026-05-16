using System.Diagnostics;
using System.IO.Compression;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using Microsoft.Win32;

[assembly: InternalsVisibleTo("Loaderly.Tests")]

namespace Loaderly.Setup;

internal static class Program
{
    private const string ProductName = "Loaderly";
    private const string ProductVersion = "1.0.0";
    private const string RegistryLanguageKey = @"Software\Loaderly";
    private const string UninstallKey = @"Software\Microsoft\Windows\CurrentVersion\Uninstall\Loaderly";

    [STAThread]
    private static void Main(string[] args)
    {
        ApplicationConfiguration.Initialize();
        var requestedUninstall = args.Any(arg => arg.Equals("--uninstall", StringComparison.OrdinalIgnoreCase));
        var installedVersion = InstalledVersion();
        var uninstallMode = SetupMode.ShouldUseUninstallMode(requestedUninstall, installedVersion, ProductVersion);
        var requestedInstallDirectory = SetupMode.InstallDirectoryArgument(args);
        var repairMode = !uninstallMode && !string.IsNullOrWhiteSpace(installedVersion);
        if (SetupMode.IsQuiet(args))
        {
            using var form = new SetupForm(uninstallMode, requestedInstallDirectory, repairMode);
            form.RunQuiet(SetupMode.ShouldLaunchAfterQuietInstall(args));
            return;
        }

        Application.Run(new SetupForm(uninstallMode, requestedInstallDirectory, repairMode));
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
        private readonly ComboBox languageBox = new();
        private readonly Label titleLabel = new();
        private readonly Label bodyLabel = new();
        private readonly Label installPathLabel = new();
        private readonly TextBox installPathTextBox = new();
        private readonly Button browseInstallPathButton = new();
        private readonly Button primaryButton = new();
        private readonly Button cancelButton = new();
        private readonly CheckBox launchCheckBox = new();
        private readonly TableLayoutPanel root = new();
        private readonly TableLayoutPanel installPathPanel = new();
        private readonly TableLayoutPanel installPathField = new();
        private readonly TableLayoutPanel actions = new();
        private SetupPalette palette;
        private string language = "en";
        private readonly bool repairMode;

        public SetupForm(bool uninstallMode, string? requestedInstallDirectory = null, bool repairMode = false)
        {
            this.uninstallMode = uninstallMode;
            this.repairMode = repairMode;
            language = DefaultLanguage();
            palette = SetupTheme.CurrentPalette();
            Text = uninstallMode ? "Uninstall Loaderly" : repairMode ? "Install / Repair Loaderly" : "Install Loaderly";
            StartPosition = FormStartPosition.CenterScreen;
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MaximizeBox = false;
            MinimizeBox = false;
            ClientSize = uninstallMode ? new Size(520, 310) : new Size(560, 390);
            Font = new Font("Segoe UI", 10F);
            Icon = LoadIcon();
            installPathTextBox.Text = string.IsNullOrWhiteSpace(requestedInstallDirectory)
                ? InstallDirectory()
                : NormalizeInstallDirectory(requestedInstallDirectory);
            BuildUi();
            ApplyTheme();
            ApplyLanguage();
        }

        private void BuildUi()
        {
            root.Dock = DockStyle.Fill;
            root.RowCount = 6;
            root.ColumnCount = 1;
            root.Padding = new Padding(24);
            root.RowStyles.Add(new RowStyle(SizeType.Absolute, 50));
            root.RowStyles.Add(new RowStyle(SizeType.Absolute, 50));
            root.RowStyles.Add(new RowStyle(SizeType.Absolute, uninstallMode ? 92 : 74));
            root.RowStyles.Add(new RowStyle(SizeType.Absolute, uninstallMode ? 0 : 82));
            root.RowStyles.Add(new RowStyle(SizeType.Absolute, 38));
            root.RowStyles.Add(new RowStyle(SizeType.Absolute, 52));
            Controls.Add(root);

            titleLabel.Dock = DockStyle.Fill;
            titleLabel.Font = new Font("Segoe UI", 18F, FontStyle.Bold);
            titleLabel.ForeColor = Color.White;
            titleLabel.TextAlign = ContentAlignment.MiddleLeft;
            root.Controls.Add(titleLabel, 0, 0);

            languageBox.Dock = DockStyle.Fill;
            languageBox.DropDownStyle = ComboBoxStyle.DropDownList;
            languageBox.FlatStyle = FlatStyle.Flat;
            languageBox.DrawMode = DrawMode.OwnerDrawFixed;
            languageBox.ItemHeight = 30;
            languageBox.DropDownHeight = 96;
            languageBox.IntegralHeight = false;
            languageBox.Items.AddRange(["English", "العربية"]);
            languageBox.SelectedIndex = language == "ar" ? 1 : 0;
            languageBox.DrawItem += DrawLanguageItem;
            languageBox.SelectedIndexChanged += (_, _) =>
            {
                language = languageBox.SelectedIndex == 1 ? "ar" : "en";
                ApplyLanguage();
            };
            root.Controls.Add(languageBox, 0, 1);

            bodyLabel.Dock = DockStyle.Fill;
            bodyLabel.ForeColor = Color.FromArgb(194, 207, 232);
            bodyLabel.Font = new Font("Segoe UI", 10.5F);
            bodyLabel.TextAlign = ContentAlignment.TopLeft;
            root.Controls.Add(bodyLabel, 0, 2);

            installPathPanel.Dock = DockStyle.Fill;
            installPathPanel.RowCount = 2;
            installPathPanel.ColumnCount = 1;
            installPathPanel.RowStyles.Add(new RowStyle(SizeType.Absolute, 24));
            installPathPanel.RowStyles.Add(new RowStyle(SizeType.Absolute, 40));
            root.Controls.Add(installPathPanel, 0, 3);

            installPathLabel.Dock = DockStyle.Fill;
            installPathLabel.Font = new Font("Segoe UI", 9.5F);
            installPathLabel.TextAlign = ContentAlignment.BottomLeft;
            installPathPanel.Controls.Add(installPathLabel, 0, 0);

            installPathField.Dock = DockStyle.Fill;
            installPathField.ColumnCount = 2;
            installPathField.RowCount = 1;
            installPathField.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
            installPathField.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 104));
            installPathPanel.Controls.Add(installPathField, 0, 1);

            installPathTextBox.Dock = DockStyle.Fill;
            installPathTextBox.BorderStyle = BorderStyle.FixedSingle;
            installPathTextBox.RightToLeft = RightToLeft.No;
            installPathTextBox.Margin = new Padding(0, 4, 10, 4);
            installPathField.Controls.Add(installPathTextBox, 0, 0);

            browseInstallPathButton.Dock = DockStyle.Fill;
            browseInstallPathButton.FlatStyle = FlatStyle.Flat;
            browseInstallPathButton.Margin = new Padding(0, 4, 0, 4);
            browseInstallPathButton.Click += (_, _) => BrowseInstallPath();
            installPathField.Controls.Add(browseInstallPathButton, 1, 0);

            launchCheckBox.Dock = DockStyle.Fill;
            launchCheckBox.FlatStyle = FlatStyle.Flat;
            launchCheckBox.Checked = !uninstallMode;
            root.Controls.Add(launchCheckBox, 0, 4);

            actions.Dock = DockStyle.Fill;
            actions.ColumnCount = 3;
            actions.RowCount = 1;
            actions.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
            actions.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 118));
            actions.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 118));
            root.Controls.Add(actions, 0, 5);

            cancelButton.Dock = DockStyle.Fill;
            cancelButton.FlatStyle = FlatStyle.Flat;
            cancelButton.Click += (_, _) => Close();
            actions.Controls.Add(cancelButton, 1, 0);

            primaryButton.Dock = DockStyle.Fill;
            primaryButton.FlatStyle = FlatStyle.Flat;
            primaryButton.Click += async (_, _) => await RunAsync();
            actions.Controls.Add(primaryButton, 2, 0);
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
            root.BackColor = palette.Window;
            installPathPanel.BackColor = palette.Window;
            installPathField.BackColor = palette.Window;
            actions.BackColor = palette.Window;
            titleLabel.ForeColor = palette.Text;
            bodyLabel.ForeColor = palette.MutedText;
            installPathLabel.ForeColor = palette.Text;
            installPathTextBox.BackColor = palette.Control;
            installPathTextBox.ForeColor = palette.Text;
            launchCheckBox.BackColor = palette.Window;
            launchCheckBox.ForeColor = palette.Text;
            launchCheckBox.FlatAppearance.BorderColor = palette.Border;
            launchCheckBox.FlatAppearance.CheckedBackColor = palette.Accent;
            languageBox.BackColor = palette.Control;
            languageBox.ForeColor = palette.Text;
            browseInstallPathButton.BackColor = palette.SecondaryButton;
            browseInstallPathButton.ForeColor = palette.Text;
            browseInstallPathButton.FlatAppearance.BorderColor = palette.Border;
            browseInstallPathButton.FlatAppearance.MouseOverBackColor = palette.SecondaryHover;
            browseInstallPathButton.FlatAppearance.MouseDownBackColor = palette.SecondaryPressed;
            cancelButton.BackColor = palette.SecondaryButton;
            cancelButton.ForeColor = palette.Text;
            cancelButton.FlatAppearance.BorderColor = palette.Border;
            cancelButton.FlatAppearance.MouseOverBackColor = palette.SecondaryHover;
            cancelButton.FlatAppearance.MouseDownBackColor = palette.SecondaryPressed;
            primaryButton.BackColor = palette.Accent;
            primaryButton.ForeColor = Color.White;
            primaryButton.FlatAppearance.BorderColor = palette.Accent;
            primaryButton.FlatAppearance.MouseOverBackColor = palette.AccentHover;
            primaryButton.FlatAppearance.MouseDownBackColor = palette.AccentPressed;
            SetupTheme.ApplyTitleBarTheme(this, palette.IsDark);
            languageBox.Invalidate();
        }

        private void DrawLanguageItem(object? sender, DrawItemEventArgs e)
        {
            if (e.Index < 0)
            {
                return;
            }

            var selected = (e.State & DrawItemState.Selected) == DrawItemState.Selected;
            using var background = new SolidBrush(selected ? palette.Selected : palette.Control);
            e.Graphics.FillRectangle(background, e.Bounds);
            var textBounds = new Rectangle(e.Bounds.Left + 10, e.Bounds.Top, e.Bounds.Width - 20, e.Bounds.Height);
            var flags = TextFormatFlags.VerticalCenter | TextFormatFlags.EndEllipsis;
            flags |= language == "ar" ? TextFormatFlags.RightToLeft | TextFormatFlags.Right : TextFormatFlags.Left;
            TextRenderer.DrawText(
                e.Graphics,
                languageBox.Items[e.Index]?.ToString() ?? string.Empty,
                e.Font ?? Font,
                textBounds,
                palette.Text,
                flags);
        }

        private void ApplyLanguage()
        {
            var ar = language == "ar";
            RightToLeft = ar ? RightToLeft.Yes : RightToLeft.No;
            RightToLeftLayout = ar;
            Text = uninstallMode
                ? ar ? "إزالة Loaderly" : "Uninstall Loaderly"
                : repairMode
                    ? ar ? "تثبيت / إصلاح Loaderly" : "Install / Repair Loaderly"
                    : ar ? "تثبيت Loaderly" : "Install Loaderly";
            titleLabel.Text = Text;
            bodyLabel.Text = uninstallMode
                ? ar
                    ? "سيتم إغلاق Loaderly إذا كان يعمل ثم إزالة ملفات البرنامج. لن يتم حذف تنزيلاتك."
                    : "Loaderly will be closed if it is running, then the app files will be removed. Your downloads will not be deleted."
                : ar
                    ? "اختر اللغة ومجلد التثبيت. سيتم استبدال ملفات Loaderly في هذا المجلد فقط، ولن يتم حذف تنزيلاتك."
                    : "Choose a language and install folder. Loaderly files in that folder will be replaced, and your downloads will not be deleted.";
            installPathLabel.Text = ar ? "مجلد التثبيت" : "Install folder";
            browseInstallPathButton.Text = ar ? "استعراض" : "Browse";
            installPathPanel.Visible = !uninstallMode;
            launchCheckBox.Text = ar ? "تشغيل Loaderly بعد التثبيت" : "Launch Loaderly after install";
            launchCheckBox.Visible = !uninstallMode;
            cancelButton.Text = ar ? "إلغاء" : "Cancel";
            primaryButton.Text = uninstallMode
                ? ar ? "إزالة" : "Uninstall"
                : repairMode
                    ? ar ? "تثبيت / إصلاح" : "Install / Repair"
                    : ar ? "تثبيت" : "Install";
        }

        private async Task RunAsync()
        {
            primaryButton.Enabled = false;
            cancelButton.Enabled = false;
            try
            {
                if (uninstallMode)
                {
                    await Task.Run(Uninstall);
                    MessageBox.Show(this, language == "ar" ? "تمت إزالة Loaderly." : "Loaderly was uninstalled.", Text, MessageBoxButtons.OK, MessageBoxIcon.Information);
                    Close();
                    return;
                }

                var installDir = SelectedInstallDirectory();
                await Task.Run(() => Install(installDir));
                var launchPath = Path.Combine(installDir, "Loaderly.exe");
                foreach (var step in SetupMode.InstallCompletionSteps(launchCheckBox.Checked))
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
            }
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
                Uninstall();
                return;
            }

            var installDir = NormalizeInstallDirectory(installPathTextBox.Text);
            Install(installDir);
            if (launchAfterInstall)
            {
                LaunchInstalledApp(Path.Combine(installDir, "Loaderly.exe"));
            }
        }

        private static void LaunchInstalledApp(string launchPath)
        {
            if (!File.Exists(launchPath))
            {
                return;
            }

            Process.Start(new ProcessStartInfo(launchPath) { UseShellExecute = true });
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

        private void Install(string installDir)
        {
            CloseRunningApp();
            ValidateInstallDirectory(installDir);
            Directory.CreateDirectory(installDir);
            foreach (var path in Directory.GetFileSystemEntries(installDir))
            {
                DeletePath(path);
            }

            using var payload = Assembly.GetExecutingAssembly().GetManifestResourceStream("LoaderlyPayload.zip")
                ?? throw new InvalidOperationException("Installer payload is missing.");
            using var archive = new ZipArchive(payload, ZipArchiveMode.Read);
            archive.ExtractToDirectory(installDir, overwriteFiles: true);
            File.Copy(Application.ExecutablePath, Path.Combine(installDir, "Loaderly-Uninstall.exe"), overwrite: true);
            WriteLanguagePreference();
            CreateShortcuts(installDir);
            WriteUninstallEntry(installDir);
        }

        private void Uninstall()
        {
            CloseRunningApp();
            DeleteShortcuts();
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

        private static void CreateShortcuts(string installDir)
        {
            var group = StartMenuFolder();
            Directory.CreateDirectory(group);
            CreateShortcut(Path.Combine(group, "Loaderly.lnk"), Path.Combine(installDir, "Loaderly.exe"));
            CreateShortcut(Path.Combine(group, "Uninstall Loaderly.lnk"), Path.Combine(installDir, "Loaderly-Uninstall.exe"), "--uninstall");
        }

        private static void DeleteShortcuts()
        {
            var group = StartMenuFolder();
            if (Directory.Exists(group))
            {
                Directory.Delete(group, recursive: true);
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
                Window: Color.FromArgb(246, 247, 251),
                Control: Color.FromArgb(239, 243, 249),
                Selected: Color.FromArgb(225, 234, 250),
                Border: Color.FromArgb(211, 218, 232),
                Text: Color.FromArgb(21, 26, 37),
                MutedText: Color.FromArgb(72, 84, 105),
                SecondaryButton: Color.FromArgb(235, 239, 247),
                SecondaryHover: Color.FromArgb(224, 231, 243),
                SecondaryPressed: Color.FromArgb(212, 222, 238),
                Accent: Color.FromArgb(68, 139, 246),
                AccentHover: Color.FromArgb(82, 151, 250),
                AccentPressed: Color.FromArgb(53, 119, 218))
            : new SetupPalette(
                IsDark: true,
                Window: Color.FromArgb(12, 14, 20),
                Control: Color.FromArgb(31, 36, 49),
                Selected: Color.FromArgb(28, 45, 78),
                Border: Color.FromArgb(48, 55, 72),
                Text: Color.FromArgb(239, 243, 250),
                MutedText: Color.FromArgb(194, 207, 232),
                SecondaryButton: Color.FromArgb(31, 39, 55),
                SecondaryHover: Color.FromArgb(39, 46, 64),
                SecondaryPressed: Color.FromArgb(50, 58, 80),
                Accent: Color.FromArgb(75, 145, 245),
                AccentHover: Color.FromArgb(93, 158, 255),
                AccentPressed: Color.FromArgb(51, 122, 224));
    }

    [DllImport("dwmapi.dll")]
    private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attribute, ref int attributeValue, int attributeSize);
}

internal sealed record SetupPalette(
    bool IsDark,
    Color Window,
    Color Control,
    Color Selected,
    Color Border,
    Color Text,
    Color MutedText,
    Color SecondaryButton,
    Color SecondaryHover,
    Color SecondaryPressed,
    Color Accent,
    Color AccentHover,
    Color AccentPressed);

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
        _ = installedVersion;
        _ = installerVersion;
        return requestedUninstall;
    }

    internal static bool ShouldUseUninstallModeForTest(bool requestedUninstall, string? installedVersion, string installerVersion)
    {
        return ShouldUseUninstallMode(requestedUninstall, installedVersion, installerVersion);
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

}
