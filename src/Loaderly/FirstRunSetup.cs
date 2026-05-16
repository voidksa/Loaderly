using System.Drawing;
using System.IO;
using System.Windows.Forms;

namespace Loaderly;

internal static class FirstRunSetup
{
    public static void Apply(AppSettings settings, string language, string downloadFolder)
    {
        settings.AppLanguage = LoaderlyLanguage.Normalize(language);
        if (!string.IsNullOrWhiteSpace(downloadFolder))
        {
            settings.DownloadFolder = downloadFolder.Trim();
        }

        if (!settings.SavedFolders.Contains(settings.DownloadFolder, StringComparer.OrdinalIgnoreCase))
        {
            settings.SavedFolders.Insert(0, settings.DownloadFolder);
        }

        settings.FirstRunComplete = true;
        AppSettingsStore.NormalizeForRuntime(settings);
    }

    internal static void ApplyForTest(AppSettings settings, string language, string downloadFolder)
    {
        Apply(settings, language, downloadFolder);
    }
}

internal sealed class FirstRunForm : Form
{
    private readonly AppSettings settings;
    private readonly ModernSelect languageSelect = new();
    private readonly TextBox folderTextBox = new();
    private readonly ModernButton browseButton = new();
    private readonly ModernButton startButton = new();
    private readonly ModernButton cancelButton = new();

    public FirstRunForm(AppSettings settings)
    {
        this.settings = settings;
        Text = LoaderlyLanguage.Text("First run setup");
        AutoScaleMode = AutoScaleMode.Dpi;
        StartPosition = FormStartPosition.CenterParent;
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        MinimizeBox = false;
        ClientSize = new Size(560, 330);
        BackColor = LoaderlyTheme.Window;
        Font = LoaderlyTheme.BodyFont(10F);
        Icon = LoaderlyAssets.AppIcon;
        BuildUi();
        LoaderlyLanguage.ApplyTo(this);
        BindEvents();
    }

    protected override void OnShown(EventArgs e)
    {
        base.OnShown(e);
        WindowsTheme.ApplyTitleBarTheme(this);
    }

    private void BuildUi()
    {
        var root = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            RowCount = 7,
            ColumnCount = 1,
            Padding = new Padding(28),
            BackColor = LoaderlyTheme.Window
        };
        root.RowStyles.Add(new RowStyle(SizeType.Absolute, 52));
        root.RowStyles.Add(new RowStyle(SizeType.Absolute, 34));
        root.RowStyles.Add(new RowStyle(SizeType.Absolute, 52));
        root.RowStyles.Add(new RowStyle(SizeType.Absolute, 34));
        root.RowStyles.Add(new RowStyle(SizeType.Absolute, 52));
        root.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        root.RowStyles.Add(new RowStyle(SizeType.Absolute, 44));
        Controls.Add(root);

        root.Controls.Add(new Label
        {
            Text = "Welcome to Loaderly",
            Dock = DockStyle.Fill,
            ForeColor = LoaderlyTheme.Text,
            Font = LoaderlyTheme.TitleFont(21),
            TextAlign = ContentAlignment.MiddleLeft
        }, 0, 0);

        root.Controls.Add(Label("Language"), 0, 1);
        languageSelect.Dock = DockStyle.Fill;
        languageSelect.SetItems("English", "Arabic");
        SelectLanguage();
        languageSelect.FillColor = LoaderlyTheme.SurfaceMuted;
        languageSelect.BorderColor = LoaderlyTheme.Border;
        languageSelect.ForeColor = LoaderlyTheme.Text;
        root.Controls.Add(languageSelect, 0, 2);

        root.Controls.Add(Label("Save to"), 0, 3);
        var folderRow = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 2,
            RowCount = 1,
            BackColor = LoaderlyTheme.Window
        };
        folderRow.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        folderRow.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 118));
        root.Controls.Add(folderRow, 0, 4);

        var folderHost = new RoundedPanel
        {
            Dock = DockStyle.Fill,
            Radius = LoaderlyTheme.ControlRadius,
            BackColor = LoaderlyTheme.SurfaceMuted,
            BorderColor = LoaderlyTheme.Border,
            Margin = new Padding(0, 0, 10, 0)
        };
        folderTextBox.BorderStyle = BorderStyle.None;
        folderTextBox.BackColor = LoaderlyTheme.SurfaceMuted;
        folderTextBox.ForeColor = LoaderlyTheme.Text;
        folderTextBox.Text = settings.DownloadFolder;
        folderHost.Controls.Add(folderTextBox);
        ModernTextBoxPlacement.Attach(folderHost, folderTextBox);
        folderRow.Controls.Add(folderHost, 0, 0);

        browseButton.Text = "Browse";
        StyleButton(browseButton, primary: false);
        folderRow.Controls.Add(browseButton, 1, 0);

        var help = new Label
        {
            Text = "Choose your language and where Loaderly saves downloads. You can change both later in Settings.",
            Dock = DockStyle.Fill,
            ForeColor = LoaderlyTheme.MutedText,
            Font = LoaderlyTheme.BodyFont(9.2F),
            TextAlign = ContentAlignment.TopLeft
        };
        root.Controls.Add(help, 0, 5);

        var actions = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 3,
            RowCount = 1,
            BackColor = LoaderlyTheme.Window
        };
        actions.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        actions.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 118));
        actions.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 130));
        root.Controls.Add(actions, 0, 6);

        cancelButton.Text = "Cancel";
        StyleButton(cancelButton, primary: false);
        actions.Controls.Add(cancelButton, 1, 0);

        startButton.Text = "Start";
        StyleButton(startButton, primary: true);
        actions.Controls.Add(startButton, 2, 0);
    }

    private void BindEvents()
    {
        browseButton.Click += (_, _) => ChooseFolder();
        cancelButton.Click += (_, _) => DialogResult = DialogResult.Cancel;
        startButton.Click += (_, _) => ApplyAndClose();
    }

    private void ChooseFolder()
    {
        using var dialog = new FolderBrowserDialog
        {
            Description = LoaderlyLanguage.Text("Choose where downloads are saved"),
            SelectedPath = Directory.Exists(folderTextBox.Text)
                ? folderTextBox.Text
                : Environment.GetFolderPath(Environment.SpecialFolder.UserProfile)
        };

        if (dialog.ShowDialog(this) == DialogResult.OK)
        {
            folderTextBox.Text = dialog.SelectedPath;
        }
    }

    private void ApplyAndClose()
    {
        FirstRunSetup.Apply(settings, LoaderlyLanguage.EnglishFor(languageSelect.SelectedText), folderTextBox.Text);
        DialogResult = DialogResult.OK;
    }

    private void SelectLanguage()
    {
        var preferred = LoaderlyLanguage.Normalize(settings.AppLanguage) == LoaderlyLanguage.Arabic ? "Arabic" : "English";
        languageSelect.SelectedIndex = languageSelect.Items.IndexOf(preferred);
    }

    private static Label Label(string text)
    {
        return new Label
        {
            Text = text,
            Dock = DockStyle.Fill,
            ForeColor = LoaderlyTheme.MutedText,
            Font = LoaderlyTheme.BodyFont(9.2F),
            TextAlign = ContentAlignment.BottomLeft
        };
    }

    private static void StyleButton(ModernButton button, bool primary)
    {
        button.Dock = DockStyle.Fill;
        button.Radius = LoaderlyTheme.ControlRadius;
        button.FillColor = primary ? LoaderlyTheme.Accent : LoaderlyTheme.SurfaceMuted;
        button.HoverColor = primary ? LoaderlyTheme.AccentHover : LoaderlyTheme.ControlHover;
        button.PressedColor = primary ? LoaderlyTheme.AccentPressed : LoaderlyTheme.ControlPressed;
        button.ForeColor = primary ? Color.White : LoaderlyTheme.Text;
        button.Font = LoaderlyTheme.BodyFont(9.5F);
        button.Margin = new Padding(6, 2, 0, 2);
    }
}
