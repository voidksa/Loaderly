using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Windows.Forms;

namespace Loaderly;

internal sealed class SettingsForm : Form
{
    private const int LanguageSuggestionLimit = 8;
    private const int SaveFolderListRowHeight = 118;
    private const int SaveFolderItemHeight = 34;

    private readonly AppSettings settings;
    private readonly TextBox folderTextBox = new();
    private readonly ModernScrollPanel folderScrollPanel = new();
    private readonly Panel folderListPanel = new();
    private readonly ModernSelect themeComboBox = new();
    private readonly ModernSelect languageComboBox = new();
    private readonly ModernSelect subtitleLanguageComboBox = new();
    private readonly TextBox subtitleLanguageTextBox = new();
    private readonly RoundedPanel customSubtitleHost = new();
    private readonly Label customSubtitleCodeLabel = new();
    private readonly ModernSelect undoShortcutComboBox = new();
    private readonly ModernSelect redoShortcutComboBox = new();
    private readonly ModernSelect saveShortcutComboBox = new();
    private readonly ModernSelect resetShortcutComboBox = new();
    private readonly TextBox openRouterApiKeyTextBox = new();
    private readonly TextBox openRouterModelTextBox = new();
    private readonly TextBox aiLanguageTextBox = new();
    private readonly Label aiLanguageDropButton = new();
    private readonly RoundedPanel aiLanguageSuggestionPanel = new();
    private readonly ListBox aiLanguageListBox = new();
    private readonly CheckBox subtitlesCheckBox = new ModernCheckBox();
    private readonly CheckBox notificationsCheckBox = new ModernCheckBox();
    private readonly CheckBox modernToastCheckBox = new ModernCheckBox();
    private readonly CheckBox trayCheckBox = new ModernCheckBox();
    private readonly Label browseButton = new();
    private readonly ModernButton addFolderButton = new();
    private readonly ModernButton removeFolderButton = new();
    private readonly ModernButton saveButton = new();
    private readonly ModernButton cancelButton = new();
    private readonly List<string> folderItems = [];
    private RoundedPanel? aiLanguageHost;
    private bool applyingLanguageSelection;
    private string? selectedFolder;

    internal static int SaveFolderListRowHeightForTest => SaveFolderListRowHeight;

    internal static int SaveFolderItemHeightForTest => SaveFolderItemHeight;

    public SettingsForm(AppSettings settings)
    {
        this.settings = settings;
        SetStyle(
            ControlStyles.AllPaintingInWmPaint |
            ControlStyles.OptimizedDoubleBuffer |
            ControlStyles.ResizeRedraw,
            true);
        DoubleBuffered = true;
        Text = LoaderlyLanguage.Text("Settings");
        AutoScaleMode = AutoScaleMode.Dpi;
        StartPosition = FormStartPosition.CenterParent;
        MinimumSize = new Size(860, 720);
        Size = new Size(940, 800);
        BackColor = LoaderlyTheme.Window;
        Font = LoaderlyTheme.BodyFont(10F);
        BuildUi();
        LoaderlyLanguage.ApplyTo(this);
        ConfigureLanguageSuggestionPanel();
        BindEvents();
    }

    protected override void OnShown(EventArgs e)
    {
        base.OnShown(e);
        folderTextBox.SelectionStart = 0;
        folderTextBox.SelectionLength = 0;
        WindowsTheme.ApplyTitleBarTheme(this);
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
        root.RowStyles.Add(new RowStyle(SizeType.Absolute, 68));
        root.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        root.RowStyles.Add(new RowStyle(SizeType.Absolute, 58));
        Controls.Add(root);

        root.Controls.Add(new Label
        {
            Text = "Settings",
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

        var content = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 2,
            RowCount = 1,
            BackColor = LoaderlyTheme.Surface
        };
        content.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        content.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 50));
        content.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 50));
        panel.Controls.Add(content);

        var general = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            RowCount = 14,
            ColumnCount = 1,
            BackColor = LoaderlyTheme.Surface,
            Margin = new Padding(0, 0, 12, 0)
        };
        general.RowStyles.Add(new RowStyle(SizeType.Absolute, 28));
        general.RowStyles.Add(new RowStyle(SizeType.Absolute, SaveFolderListRowHeight));
        general.RowStyles.Add(new RowStyle(SizeType.Absolute, 38));
        general.RowStyles.Add(new RowStyle(SizeType.Absolute, 24));
        general.RowStyles.Add(new RowStyle(SizeType.Absolute, 62));
        general.RowStyles.Add(new RowStyle(SizeType.Absolute, 24));
        general.RowStyles.Add(new RowStyle(SizeType.Absolute, 60));
        general.RowStyles.Add(new RowStyle(SizeType.Absolute, 24));
        general.RowStyles.Add(new RowStyle(SizeType.Absolute, 60));
        general.RowStyles.Add(new RowStyle(SizeType.Absolute, 38));
        general.RowStyles.Add(new RowStyle(SizeType.Absolute, 38));
        general.RowStyles.Add(new RowStyle(SizeType.Absolute, 38));
        general.RowStyles.Add(new RowStyle(SizeType.Absolute, 38));
        general.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        content.Controls.Add(general, 0, 0);

        var shortcuts = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            RowCount = 12,
            ColumnCount = 1,
            BackColor = LoaderlyTheme.Surface,
            Margin = new Padding(12, 0, 0, 0)
        };
        shortcuts.RowStyles.Add(new RowStyle(SizeType.Absolute, 32));
        shortcuts.RowStyles.Add(new RowStyle(SizeType.Absolute, 48));
        shortcuts.RowStyles.Add(new RowStyle(SizeType.Absolute, 48));
        shortcuts.RowStyles.Add(new RowStyle(SizeType.Absolute, 48));
        shortcuts.RowStyles.Add(new RowStyle(SizeType.Absolute, 48));
        shortcuts.RowStyles.Add(new RowStyle(SizeType.Absolute, 70));
        shortcuts.RowStyles.Add(new RowStyle(SizeType.Absolute, 34));
        shortcuts.RowStyles.Add(new RowStyle(SizeType.Absolute, 66));
        shortcuts.RowStyles.Add(new RowStyle(SizeType.Absolute, 66));
        shortcuts.RowStyles.Add(new RowStyle(SizeType.Absolute, 24));
        shortcuts.RowStyles.Add(new RowStyle(SizeType.Absolute, 66));
        shortcuts.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        content.Controls.Add(shortcuts, 1, 0);

        general.Controls.Add(Label("Save folders"), 0, 0);
        var folderListHost = new RoundedPanel
        {
            Dock = DockStyle.Fill,
            Radius = LoaderlyTheme.ControlRadius,
            BackColor = LoaderlyTheme.SurfaceMuted,
            BorderColor = LoaderlyTheme.Border,
            Padding = new Padding(8),
            Margin = new Padding(0, 5, 0, 7)
        };
        general.Controls.Add(folderListHost, 0, 1);

        folderScrollPanel.Dock = DockStyle.Fill;
        folderScrollPanel.BackColor = LoaderlyTheme.SurfaceMuted;
        folderScrollPanel.Padding = new Padding(0, 0, 10, 0);
        folderScrollPanel.Resize += (_, _) => LayoutFolderItems();
        folderListPanel.Dock = DockStyle.Top;
        folderListPanel.BackColor = LoaderlyTheme.SurfaceMuted;
        folderScrollPanel.Controls.Add(folderListPanel);
        folderListHost.Controls.Add(folderScrollPanel);

        var folderActions = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 2,
            RowCount = 1,
            BackColor = LoaderlyTheme.Surface
        };
        folderActions.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        folderActions.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 50));
        folderActions.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 50));
        general.Controls.Add(folderActions, 0, 2);

        ConfigureButton(addFolderButton, "Add folder", primary: false);
        ConfigureButton(removeFolderButton, "Remove", primary: false);
        addFolderButton.Dock = DockStyle.Fill;
        removeFolderButton.Dock = DockStyle.Fill;
        addFolderButton.Margin = new Padding(0, 4, 6, 8);
        removeFolderButton.Margin = new Padding(6, 4, 0, 8);
        folderActions.Controls.Add(addFolderButton, 0, 0);
        folderActions.Controls.Add(removeFolderButton, 1, 0);

        general.Controls.Add(Label("Active folder"), 0, 3);
        var folderRow = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 2,
            RowCount = 1,
            BackColor = LoaderlyTheme.Surface
        };
        folderRow.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        folderRow.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        folderRow.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 112));
        general.Controls.Add(folderRow, 0, 4);

        var folderHost = new RoundedPanel
        {
            Dock = DockStyle.Fill,
            Radius = LoaderlyTheme.ControlRadius,
            BackColor = LoaderlyTheme.SurfaceMuted,
            BorderColor = LoaderlyTheme.Border,
            Margin = new Padding(0, 5, 12, 7)
        };
        folderRow.Controls.Add(folderHost, 0, 0);

        ConfigureTextBox(folderTextBox, settings.DownloadFolder, string.Empty);
        folderTextBox.ReadOnly = true;
        folderTextBox.TabStop = false;
        folderHost.Controls.Add(folderTextBox);
        ModernTextBoxPlacement.Attach(folderHost, folderTextBox);
        RefreshFolderList();

        var browseHost = new RoundedPanel
        {
            Dock = DockStyle.Fill,
            Radius = LoaderlyTheme.ControlRadius,
            BackColor = LoaderlyTheme.SurfaceMuted,
            BorderColor = Color.Transparent,
            Margin = new Padding(0, 4, 0, 7),
            Cursor = Cursors.Hand
        };
        ConfigureBrowseLabel(browseButton);
        browseHost.Controls.Add(browseButton);
        browseHost.Click += (_, _) => ChooseFolder();
        folderRow.Controls.Add(browseHost, 1, 0);

        general.Controls.Add(Label("Theme / Language"), 0, 5);
        var themeLanguageRow = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 2,
            RowCount = 1,
            BackColor = LoaderlyTheme.Surface
        };
        themeLanguageRow.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        themeLanguageRow.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 50));
        themeLanguageRow.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 50));
        themeComboBox.Dock = DockStyle.Fill;
        themeComboBox.SetItems("System", "Light", "Dark");
        SelectModernValue(themeComboBox, string.IsNullOrWhiteSpace(settings.ThemeMode) ? "System" : settings.ThemeMode);
        themeComboBox.FillColor = LoaderlyTheme.SurfaceMuted;
        themeComboBox.BorderColor = LoaderlyTheme.Border;
        themeComboBox.ForeColor = LoaderlyTheme.Text;
        themeComboBox.Margin = new Padding(0, 5, 6, 7);
        themeLanguageRow.Controls.Add(themeComboBox, 0, 0);

        languageComboBox.Dock = DockStyle.Fill;
        languageComboBox.SetItems("English", "Arabic");
        SelectModernValue(languageComboBox, LoaderlyLanguage.Normalize(settings.AppLanguage) == LoaderlyLanguage.Arabic ? "Arabic" : "English");
        languageComboBox.FillColor = LoaderlyTheme.SurfaceMuted;
        languageComboBox.BorderColor = LoaderlyTheme.Border;
        languageComboBox.ForeColor = LoaderlyTheme.Text;
        languageComboBox.Margin = new Padding(6, 5, 0, 7);
        themeLanguageRow.Controls.Add(languageComboBox, 1, 0);
        general.Controls.Add(themeLanguageRow, 0, 6);

        general.Controls.Add(Label("Download subtitles in"), 0, 7);
        var subtitleRow = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 3,
            RowCount = 1,
            BackColor = LoaderlyTheme.Surface
        };
        subtitleRow.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        subtitleRow.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 154));
        subtitleRow.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 92));
        subtitleRow.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        subtitleLanguageComboBox.Dock = DockStyle.Fill;
        subtitleLanguageComboBox.SetItems(SubtitleLanguagePreference.OptionLabels);
        SelectModernValue(subtitleLanguageComboBox, SubtitleLanguagePreference.SelectionForValue(settings.SubtitleLanguages));
        subtitleLanguageComboBox.FillColor = LoaderlyTheme.SurfaceMuted;
        subtitleLanguageComboBox.BorderColor = LoaderlyTheme.Border;
        subtitleLanguageComboBox.ForeColor = LoaderlyTheme.Text;
        subtitleLanguageComboBox.Margin = new Padding(0, 5, 8, 7);
        subtitleRow.Controls.Add(subtitleLanguageComboBox, 0, 0);

        customSubtitleCodeLabel.Text = "Code e.g. ar";
        customSubtitleCodeLabel.Dock = DockStyle.Fill;
        customSubtitleCodeLabel.TextAlign = ContentAlignment.MiddleLeft;
        customSubtitleCodeLabel.ForeColor = LoaderlyTheme.MutedText;
        customSubtitleCodeLabel.Font = LoaderlyTheme.BodyFont(9F);
        subtitleRow.Controls.Add(customSubtitleCodeLabel, 1, 0);

        customSubtitleHost.Dock = DockStyle.Fill;
        customSubtitleHost.Radius = LoaderlyTheme.ControlRadius;
        customSubtitleHost.BackColor = LoaderlyTheme.SurfaceMuted;
        customSubtitleHost.BorderColor = LoaderlyTheme.Border;
        customSubtitleHost.Margin = new Padding(0, 5, 0, 7);
        ConfigureTextBox(subtitleLanguageTextBox, SubtitleLanguagePreference.CustomTextForValue(settings.SubtitleLanguages), "Codes like ar, en, ja");
        customSubtitleHost.Controls.Add(subtitleLanguageTextBox);
        ModernTextBoxPlacement.Attach(customSubtitleHost, subtitleLanguageTextBox);
        subtitleRow.Controls.Add(customSubtitleHost, 2, 0);
        general.Controls.Add(subtitleRow, 0, 8);
        UpdateSubtitleCustomState();

        ConfigureCheckBox(subtitlesCheckBox, "Download subtitles when available", settings.WriteSubtitles);
        ConfigureCheckBox(notificationsCheckBox, "Windows notifications when downloads finish", settings.EnableNotifications);
        ConfigureCheckBox(modernToastCheckBox, "Use Windows toast notifications when available", settings.UseModernToastNotifications);
        ConfigureCheckBox(trayCheckBox, "Keep Loaderly in the system tray when closed", settings.MinimizeToTray);
        general.Controls.Add(subtitlesCheckBox, 0, 9);
        general.Controls.Add(notificationsCheckBox, 0, 10);
        general.Controls.Add(modernToastCheckBox, 0, 11);
        general.Controls.Add(trayCheckBox, 0, 12);

        shortcuts.Controls.Add(new Label
        {
            Dock = DockStyle.Fill,
            Text = "Trim shortcuts",
            ForeColor = LoaderlyTheme.MutedText,
            Font = LoaderlyTheme.BodyFont(9.5F),
            TextAlign = ContentAlignment.BottomLeft
        }, 0, 0);

        shortcuts.Controls.Add(ShortcutRow("Undo", undoShortcutComboBox, settings.TrimUndoShortcut, new[] { "Ctrl+Z", "Ctrl+Backspace" }), 0, 1);
        shortcuts.Controls.Add(ShortcutRow("Redo", redoShortcutComboBox, settings.TrimRedoShortcut, new[] { "Ctrl+Y", "Ctrl+Shift+Z" }), 0, 2);
        shortcuts.Controls.Add(ShortcutRow("Save", saveShortcutComboBox, settings.TrimSaveShortcut, new[] { "Ctrl+S", "Ctrl+Enter" }), 0, 3);
        shortcuts.Controls.Add(ShortcutRow("Reset", resetShortcutComboBox, settings.TrimResetShortcut, new[] { "Ctrl+R", "Ctrl+Delete" }), 0, 4);

        shortcuts.Controls.Add(new Label
        {
            Dock = DockStyle.Fill,
            Text = "Fixed trim shortcuts: Space play/pause, arrows step, Shift+arrows 5s, Ctrl+Shift+arrows frame step, M mute, Esc close.",
            ForeColor = LoaderlyTheme.MutedText,
            Font = LoaderlyTheme.BodyFont(8.8F),
            TextAlign = ContentAlignment.TopLeft
        }, 0, 5);

        shortcuts.Controls.Add(new Label
        {
            Dock = DockStyle.Fill,
            Text = "AI subtitle translation",
            ForeColor = LoaderlyTheme.MutedText,
            Font = LoaderlyTheme.BodyFont(9.5F),
            TextAlign = ContentAlignment.BottomLeft
        }, 0, 6);

        shortcuts.Controls.Add(TextInputRow("API key", openRouterApiKeyTextBox, settings.OpenRouterApiKey, "OpenRouter API key", password: true), 0, 7);
        shortcuts.Controls.Add(TextInputRow("Model", openRouterModelTextBox, settings.OpenRouterModel, "OpenRouter model"), 0, 8);

        shortcuts.Controls.Add(new Label
        {
            Dock = DockStyle.Fill,
            Text = "Translate subtitles to",
            ForeColor = LoaderlyTheme.MutedText,
            Font = LoaderlyTheme.BodyFont(9.2F),
            TextAlign = ContentAlignment.BottomLeft
        }, 0, 9);
        shortcuts.Controls.Add(LanguagePickerRow(), 0, 10);

        var actions = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 3,
            RowCount = 1,
            BackColor = LoaderlyTheme.Window
        };
        actions.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        actions.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        actions.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 124));
        actions.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 124));
        root.Controls.Add(actions, 0, 2);

        ConfigureButton(cancelButton, "Cancel", primary: false);
        ConfigureButton(saveButton, "Save", primary: true);
        cancelButton.Dock = DockStyle.Fill;
        saveButton.Dock = DockStyle.Fill;
        cancelButton.Margin = new Padding(0, 12, 10, 0);
        saveButton.Margin = new Padding(10, 12, 0, 0);
        actions.Controls.Add(cancelButton, 1, 0);
        actions.Controls.Add(saveButton, 2, 0);
    }

    private void BindEvents()
    {
        browseButton.Click += (_, _) => ChooseFolder();
        addFolderButton.Click += (_, _) => ChooseFolder();
        removeFolderButton.Click += (_, _) => RemoveSelectedFolder();
        subtitleLanguageComboBox.SelectedIndexChanged += (_, _) => UpdateSubtitleCustomState();
        aiLanguageTextBox.TextChanged += (_, _) => RefreshAiLanguageChoices(aiLanguageTextBox.Text);
        aiLanguageTextBox.Click += (_, _) => ShowAiLanguageSuggestions();
        aiLanguageTextBox.Enter += (_, _) => ShowAiLanguageSuggestions();
        aiLanguageTextBox.KeyDown += AiLanguageTextBoxKeyDown;
        aiLanguageDropButton.Click += (_, _) => ShowAiLanguageSuggestions();
        aiLanguageListBox.Click += (_, _) => SelectAiLanguageFromList();
        aiLanguageListBox.KeyDown += AiLanguageListBoxKeyDown;
        aiLanguageTextBox.Leave += (_, _) => BeginInvoke(new Action(HideAiLanguageSuggestionsIfFocusLeft));
        aiLanguageListBox.Leave += (_, _) => BeginInvoke(new Action(HideAiLanguageSuggestionsIfFocusLeft));
        cancelButton.Click += (_, _) => DialogResult = DialogResult.Cancel;
        saveButton.Click += (_, _) => SaveAndClose();
    }

    private void ChooseFolder()
    {
        using var dialog = new FolderBrowserDialog
        {
            Description = "Choose where downloads are saved",
            SelectedPath = Directory.Exists(folderTextBox.Text)
                ? folderTextBox.Text
                : Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
            UseDescriptionForTitle = true
        };

        if (dialog.ShowDialog(this) == DialogResult.OK)
        {
            SetActiveFolder(dialog.SelectedPath, addToTop: true);
        }
    }

    private void SaveAndClose()
    {
        if (string.IsNullOrWhiteSpace(folderTextBox.Text))
        {
            MessageBox.Show(this, LoaderlyLanguage.Text("Choose a save folder first."), LoaderlyLanguage.Text("Settings"), MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return;
        }

        settings.DownloadFolder = folderTextBox.Text.Trim();
        settings.SavedFolders = FolderListItems();
        settings.ThemeMode = string.IsNullOrWhiteSpace(themeComboBox.SelectedText) ? "System" : LoaderlyLanguage.EnglishFor(themeComboBox.SelectedText);
        settings.AppLanguage = LoaderlyLanguage.Normalize(LoaderlyLanguage.EnglishFor(languageComboBox.SelectedText));
        settings.WriteSubtitles = subtitlesCheckBox.Checked;
        settings.SubtitleLanguages = SubtitleLanguagePreference.ValueForSelection(
            subtitleLanguageComboBox.SelectedText,
            subtitleLanguageTextBox.Text);
        settings.SubtitlePreferenceConfigured = true;
        settings.EnableNotifications = notificationsCheckBox.Checked;
        settings.UseModernToastNotifications = modernToastCheckBox.Checked;
        settings.MinimizeToTray = trayCheckBox.Checked;
        settings.TrimUndoShortcut = SelectedShortcut(undoShortcutComboBox, "Ctrl+Z");
        settings.TrimRedoShortcut = SelectedShortcut(redoShortcutComboBox, "Ctrl+Y");
        settings.TrimSaveShortcut = SelectedShortcut(saveShortcutComboBox, "Ctrl+S");
        settings.TrimResetShortcut = SelectedShortcut(resetShortcutComboBox, "Ctrl+R");
        settings.OpenRouterApiKey = openRouterApiKeyTextBox.Text.Trim();
        settings.OpenRouterModel = openRouterModelTextBox.Text.Trim();
        settings.AiSubtitleTargetLanguage = string.IsNullOrWhiteSpace(aiLanguageTextBox.Text)
            ? "Arabic"
            : aiLanguageTextBox.Text.Trim();
        DialogResult = DialogResult.OK;
    }

    private void RefreshFolderList()
    {
        var folders = settings.SavedFolders
            .Where(path => !string.IsNullOrWhiteSpace(path))
            .Select(path => path.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        if (!folders.Contains(settings.DownloadFolder, StringComparer.OrdinalIgnoreCase))
        {
            folders.Insert(0, settings.DownloadFolder);
        }

        folderItems.Clear();
        folderItems.AddRange(folders);
        selectedFolder = folders.FirstOrDefault(path =>
            path.Equals(folderTextBox.Text, StringComparison.OrdinalIgnoreCase));
        if (selectedFolder is null && folders.Count > 0)
        {
            selectedFolder = folders[0];
        }

        RenderFolderList();
        UseSelectedFolder();
    }

    private void SetActiveFolder(string path, bool addToTop)
    {
        path = path.Trim();
        if (string.IsNullOrWhiteSpace(path))
        {
            return;
        }

        var folders = FolderListItems();
        folders.RemoveAll(existing => existing.Equals(path, StringComparison.OrdinalIgnoreCase));
        if (addToTop)
        {
            folders.Insert(0, path);
        }
        else
        {
            folders.Add(path);
        }

        folderTextBox.Text = path;
        settings.DownloadFolder = path;
        settings.SavedFolders = folders;
        folderTextBox.SelectionStart = 0;
        folderTextBox.SelectionLength = 0;
        RefreshFolderList();
    }

    private void UseSelectedFolder()
    {
        if (selectedFolder is { } selected && !selected.Equals(folderTextBox.Text, StringComparison.OrdinalIgnoreCase))
        {
            folderTextBox.Text = selected;
            settings.DownloadFolder = selected;
            folderTextBox.SelectionStart = 0;
            folderTextBox.SelectionLength = 0;
        }
    }

    private void RemoveSelectedFolder()
    {
        if (selectedFolder is not { } selected)
        {
            return;
        }

        var folders = FolderListItems();
        if (folders.Count <= 1)
        {
            MessageBox.Show(this, LoaderlyLanguage.Text("Keep at least one save folder."), LoaderlyLanguage.Text("Settings"), MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        folders.RemoveAll(path => path.Equals(selected, StringComparison.OrdinalIgnoreCase));
        settings.SavedFolders = folders;
        if (selected.Equals(folderTextBox.Text, StringComparison.OrdinalIgnoreCase))
        {
            folderTextBox.Text = folders[0];
            settings.DownloadFolder = folders[0];
        }

        RefreshFolderList();
    }

    private List<string> FolderListItems()
    {
        return folderItems
            .Where(path => !string.IsNullOrWhiteSpace(path))
            .Select(path => path.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private void SelectFolderItem(string folder)
    {
        selectedFolder = folder;
        UseSelectedFolder();
        RenderFolderList();
    }

    private void RenderFolderList()
    {
        folderListPanel.SuspendLayout();
        folderListPanel.Controls.Clear();

        var top = 0;
        foreach (var folder in folderItems)
        {
            var item = new FolderListItem
            {
                Text = folder,
                Selected = selectedFolder is not null && selectedFolder.Equals(folder, StringComparison.OrdinalIgnoreCase),
                Height = SaveFolderItemHeight,
                Left = 0,
                Top = top
            };
            item.Click += (_, _) => SelectFolderItem(folder);
            folderListPanel.Controls.Add(item);
            top += item.Height;
        }

        folderListPanel.Height = Math.Max(top, folderScrollPanel.Height);
        LayoutFolderItems();
        folderListPanel.ResumeLayout();
        folderScrollPanel.Invalidate();
    }

    private void LayoutFolderItems()
    {
        var width = Math.Max(1, folderScrollPanel.ClientSize.Width - 12);
        foreach (Control control in folderListPanel.Controls)
        {
            control.Width = width;
        }

        folderListPanel.Width = width;
        folderListPanel.Height = Math.Max(folderListPanel.Controls.Count * SaveFolderItemHeight, folderScrollPanel.Height);
        folderScrollPanel.Invalidate();
    }

    private static Control ShortcutRow(string label, ModernSelect comboBox, string value, IEnumerable<string> options)
    {
        var row = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 2,
            RowCount = 1,
            BackColor = LoaderlyTheme.Surface
        };
        row.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        row.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 82));
        row.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        row.Controls.Add(new Label
        {
            Text = label,
            Dock = DockStyle.Fill,
            ForeColor = LoaderlyTheme.MutedText,
            Font = LoaderlyTheme.BodyFont(9.2F),
            TextAlign = ContentAlignment.MiddleLeft
        }, 0, 0);

        comboBox.Dock = DockStyle.Fill;
        comboBox.SetItems(options.ToArray());
        SelectModernValue(comboBox, value);
        comboBox.FillColor = LoaderlyTheme.SurfaceMuted;
        comboBox.BorderColor = LoaderlyTheme.Border;
        comboBox.ForeColor = LoaderlyTheme.Text;
        comboBox.Margin = new Padding(0, 5, 0, 5);
        row.Controls.Add(comboBox, 1, 0);
        return row;
    }

    private static Control TextInputRow(string label, TextBox textBox, string value, string placeholder, bool password = false)
    {
        var row = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 2,
            RowCount = 1,
            BackColor = LoaderlyTheme.Surface
        };
        row.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        row.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 82));
        row.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        row.Controls.Add(new Label
        {
            Text = label,
            Dock = DockStyle.Fill,
            ForeColor = LoaderlyTheme.MutedText,
            Font = LoaderlyTheme.BodyFont(9.2F),
            TextAlign = ContentAlignment.MiddleLeft
        }, 0, 0);

        var host = new RoundedPanel
        {
            Dock = DockStyle.Fill,
            Radius = LoaderlyTheme.ControlRadius,
            BackColor = LoaderlyTheme.SurfaceMuted,
            BorderColor = LoaderlyTheme.Border,
            Margin = new Padding(0, 5, 0, 5)
        };
        ConfigureTextBox(textBox, value, placeholder);
        textBox.UseSystemPasswordChar = password;
        host.Controls.Add(textBox);
        ModernTextBoxPlacement.Attach(host, textBox);
        row.Controls.Add(host, 1, 0);
        return row;
    }

    private Control LanguagePickerRow()
    {
        var host = new RoundedPanel
        {
            Dock = DockStyle.Fill,
            Radius = LoaderlyTheme.ControlRadius,
            BackColor = LoaderlyTheme.SurfaceMuted,
            BorderColor = LoaderlyTheme.Border,
            Margin = new Padding(0, 5, 0, 5)
        };

        aiLanguageHost = host;
        ConfigureTextBox(aiLanguageTextBox, string.IsNullOrWhiteSpace(settings.AiSubtitleTargetLanguage) ? "Arabic" : settings.AiSubtitleTargetLanguage, "Type a language");
        ConfigureLanguageDropButton(aiLanguageDropButton);
        host.Controls.Add(aiLanguageTextBox);
        host.Controls.Add(aiLanguageDropButton);
        AttachLanguagePicker(host, aiLanguageTextBox, aiLanguageDropButton);
        RefreshAiLanguageChoices(aiLanguageTextBox.Text);
        return host;
    }

    private void ConfigureLanguageSuggestionPanel()
    {
        aiLanguageSuggestionPanel.Radius = LoaderlyTheme.ControlRadius;
        aiLanguageSuggestionPanel.BackColor = LoaderlyTheme.SurfaceMuted;
        aiLanguageSuggestionPanel.BorderColor = LoaderlyTheme.Border;
        aiLanguageSuggestionPanel.Visible = false;
        aiLanguageSuggestionPanel.Padding = new Padding(1);
        aiLanguageListBox.BorderStyle = BorderStyle.None;
        aiLanguageListBox.BackColor = LoaderlyTheme.SurfaceMuted;
        aiLanguageListBox.ForeColor = LoaderlyTheme.Text;
        aiLanguageListBox.Font = LoaderlyTheme.BodyFont(9.5F);
        aiLanguageListBox.DrawMode = DrawMode.OwnerDrawFixed;
        aiLanguageListBox.ItemHeight = 28;
        aiLanguageListBox.IntegralHeight = false;
        aiLanguageListBox.DrawItem += DrawLanguageListItem;
        aiLanguageListBox.Dock = DockStyle.Fill;
        aiLanguageSuggestionPanel.Controls.Add(aiLanguageListBox);
        Controls.Add(aiLanguageSuggestionPanel);
        aiLanguageSuggestionPanel.BringToFront();
    }

    private static void AttachLanguagePicker(RoundedPanel host, TextBox textBox, Label dropButton, int horizontalPadding = 10)
    {
        const int buttonWidth = 28;
        textBox.Dock = DockStyle.None;
        textBox.Anchor = AnchorStyles.Left | AnchorStyles.Top | AnchorStyles.Right;
        dropButton.Dock = DockStyle.None;
        dropButton.Anchor = AnchorStyles.Top | AnchorStyles.Right | AnchorStyles.Bottom;

        void LayoutPicker()
        {
            var buttonX = Math.Max(horizontalPadding, host.ClientSize.Width - horizontalPadding - buttonWidth);
            var textWidth = Math.Max(1, buttonX - horizontalPadding - 4);
            var textTop = Math.Max(0, (host.ClientSize.Height - textBox.Height) / 2);
            textBox.SetBounds(horizontalPadding, textTop, textWidth, textBox.Height);
            dropButton.SetBounds(buttonX, 0, buttonWidth, host.ClientSize.Height);
        }

        host.Resize += (_, _) => LayoutPicker();
        textBox.HandleCreated += (_, _) => LayoutPicker();
        LayoutPicker();
    }

    private static void ConfigureTextBox(TextBox textBox, string value, string placeholder)
    {
        textBox.Dock = DockStyle.None;
        textBox.AutoSize = false;
        textBox.Height = ModernTextBoxPlacement.TextBoxHeight;
        textBox.Text = value;
        textBox.PlaceholderText = placeholder;
        textBox.BorderStyle = BorderStyle.None;
        textBox.BackColor = LoaderlyTheme.SurfaceMuted;
        textBox.ForeColor = LoaderlyTheme.Text;
        textBox.Font = LoaderlyTheme.BodyFont(9F);
        textBox.Margin = new Padding(0);
    }

    private static string SelectedShortcut(ModernSelect comboBox, string fallback)
    {
        return string.IsNullOrWhiteSpace(comboBox.SelectedText) ? fallback : comboBox.SelectedText;
    }

    private static void SelectModernValue(ModernSelect select, string? value)
    {
        var index = string.IsNullOrWhiteSpace(value)
            ? -1
            : select.Items.FindIndex(item => item.Equals(value, StringComparison.OrdinalIgnoreCase));
        select.SelectedIndex = index >= 0 ? index : 0;
    }

    private void UpdateSubtitleCustomState()
    {
        var custom = LoaderlyLanguage.EnglishFor(subtitleLanguageComboBox.SelectedText) == SubtitleLanguagePreference.Custom;
        customSubtitleCodeLabel.Visible = custom;
        customSubtitleHost.Visible = custom;
        subtitleLanguageTextBox.Visible = custom;
        subtitleLanguageTextBox.Enabled = custom;
        subtitleLanguageTextBox.ForeColor = custom ? LoaderlyTheme.Text : LoaderlyTheme.MutedText;
        subtitleLanguageTextBox.BackColor = LoaderlyTheme.SurfaceMuted;
    }

    private void RefreshAiLanguageChoices(string? query)
    {
        if (applyingLanguageSelection)
        {
            return;
        }

        var choices = WorldLanguageCatalog
            .Filter(query, aiLanguageTextBox.Text, maxItems: LanguageSuggestionLimit)
            .Take(LanguageSuggestionLimit)
            .ToArray();
        aiLanguageListBox.BeginUpdate();
        aiLanguageListBox.Items.Clear();
        aiLanguageListBox.Items.AddRange(choices);
        aiLanguageListBox.SelectedIndex = aiLanguageListBox.Items.Count > 0 ? 0 : -1;
        aiLanguageListBox.EndUpdate();
        if (aiLanguageTextBox.Focused)
        {
            ShowAiLanguageSuggestions();
        }
    }

    private void ShowAiLanguageSuggestions()
    {
        if (aiLanguageHost is null || aiLanguageListBox.Items.Count == 0)
        {
            return;
        }

        var width = Math.Max(220, aiLanguageHost.Width);
        var height = aiLanguageListBox.Items.Count * aiLanguageListBox.ItemHeight + 2;
        var below = PointToClient(aiLanguageHost.PointToScreen(new Point(0, aiLanguageHost.Height + 3)));
        var above = PointToClient(aiLanguageHost.PointToScreen(new Point(0, -height - 3)));
        var y = below.Y + height <= ClientSize.Height - 8
            ? below.Y
            : Math.Max(8, above.Y);
        aiLanguageSuggestionPanel.SetBounds(below.X, y, width, height);
        aiLanguageSuggestionPanel.Visible = true;
        aiLanguageSuggestionPanel.BringToFront();

        if (!aiLanguageTextBox.Focused)
        {
            aiLanguageTextBox.Focus();
        }
    }

    private void HideAiLanguageSuggestionsIfFocusLeft()
    {
        if (aiLanguageTextBox.Focused || aiLanguageListBox.Focused)
        {
            return;
        }

        aiLanguageSuggestionPanel.Visible = false;
    }

    private void SelectAiLanguageFromList()
    {
        if (aiLanguageListBox.SelectedItem is not string selected)
        {
            return;
        }

        applyingLanguageSelection = true;
        aiLanguageTextBox.Text = selected;
        aiLanguageTextBox.SelectionStart = aiLanguageTextBox.Text.Length;
        aiLanguageTextBox.SelectionLength = 0;
        applyingLanguageSelection = false;
        aiLanguageSuggestionPanel.Visible = false;
        aiLanguageTextBox.Focus();
    }

    private void AiLanguageTextBoxKeyDown(object? sender, KeyEventArgs e)
    {
        if (e.KeyCode == Keys.Down)
        {
            ShowAiLanguageSuggestions();
            aiLanguageListBox.Focus();
            e.Handled = true;
        }
        else if (e.KeyCode == Keys.Escape)
        {
            aiLanguageSuggestionPanel.Visible = false;
            e.Handled = true;
        }
    }

    private void AiLanguageListBoxKeyDown(object? sender, KeyEventArgs e)
    {
        if (e.KeyCode == Keys.Enter)
        {
            SelectAiLanguageFromList();
            e.Handled = true;
        }
        else if (e.KeyCode == Keys.Escape)
        {
            aiLanguageSuggestionPanel.Visible = false;
            aiLanguageTextBox.Focus();
            e.Handled = true;
        }
    }

    private static void DrawLanguageListItem(object? sender, DrawItemEventArgs e)
    {
        if (e.Index < 0 || sender is not ListBox listBox)
        {
            return;
        }

        var selected = (e.State & DrawItemState.Selected) == DrawItemState.Selected;
        using var background = new SolidBrush(selected ? LoaderlyTheme.ControlHover : LoaderlyTheme.SurfaceMuted);
        e.Graphics.FillRectangle(background, e.Bounds);
        TextRenderer.DrawText(
            e.Graphics,
            listBox.Items[e.Index]?.ToString() ?? string.Empty,
            listBox.Font,
            new Rectangle(e.Bounds.X + 8, e.Bounds.Y, Math.Max(1, e.Bounds.Width - 16), e.Bounds.Height),
            LoaderlyTheme.Text,
            TextFormatFlags.Left | TextFormatFlags.VerticalCenter | TextFormatFlags.EndEllipsis | TextFormatFlags.NoPrefix);
    }

    private sealed class FolderListItem : Control
    {
        private bool selected;
        private bool hovered;

        public bool Selected
        {
            get => selected;
            set
            {
                selected = value;
                Invalidate();
            }
        }

        public FolderListItem()
        {
            SetStyle(
                ControlStyles.AllPaintingInWmPaint |
                ControlStyles.OptimizedDoubleBuffer |
                ControlStyles.ResizeRedraw |
                ControlStyles.UserPaint,
                true);
            Cursor = Cursors.Hand;
            Font = LoaderlyTheme.BodyFont(9.2F);
            TabStop = false;
        }

        protected override void OnMouseEnter(EventArgs e)
        {
            hovered = true;
            Invalidate();
            base.OnMouseEnter(e);
        }

        protected override void OnMouseLeave(EventArgs e)
        {
            hovered = false;
            Invalidate();
            base.OnMouseLeave(e);
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            e.Graphics.Clear(Parent?.BackColor ?? LoaderlyTheme.SurfaceMuted);

            var bounds = ClientRectangle;
            bounds.Width -= 1;
            bounds.Height -= 1;
            var fill = selected
                ? LoaderlyTheme.SelectedSurface
                : hovered
                    ? LoaderlyTheme.ControlHover
                    : LoaderlyTheme.SurfaceMuted;

            using var brush = new SolidBrush(fill);
            using var path = LoaderlyTheme.RoundedRect(bounds, 5);
            e.Graphics.FillPath(brush, path);

            TextRenderer.DrawText(
                e.Graphics,
                Text,
                Font,
                new Rectangle(10, 0, Math.Max(1, Width - 18), Height),
                selected ? LoaderlyTheme.Text : LoaderlyTheme.MutedText,
                TextFormatFlags.Left | TextFormatFlags.VerticalCenter | TextFormatFlags.EndEllipsis | TextFormatFlags.NoPrefix);
        }

        protected override void OnTextChanged(EventArgs e)
        {
            Invalidate();
            base.OnTextChanged(e);
        }
    }

    private static Label Label(string text)
    {
        return new Label
        {
            Text = text,
            Dock = DockStyle.Fill,
            ForeColor = LoaderlyTheme.MutedText,
            Font = LoaderlyTheme.BodyFont(9.5F),
            TextAlign = ContentAlignment.BottomLeft
        };
    }

    private static void ConfigureCheckBox(CheckBox checkBox, string text, bool isChecked)
    {
        checkBox.Text = text;
        checkBox.Checked = isChecked;
        checkBox.Dock = DockStyle.None;
        checkBox.Anchor = LoaderlyLanguage.IsArabic ? AnchorStyles.Right : AnchorStyles.Left;
        checkBox.AutoSize = false;
        checkBox.Width = TextRenderer.MeasureText(text, LoaderlyTheme.BodyFont(9.5F)).Width + 38;
        checkBox.Height = 30;
        checkBox.BackColor = LoaderlyTheme.Surface;
        checkBox.ForeColor = LoaderlyTheme.Text;
        checkBox.FlatStyle = FlatStyle.Flat;
        checkBox.Font = LoaderlyTheme.BodyFont(9.5F);
        checkBox.Margin = new Padding(0, 4, 0, 4);
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

    private static void ConfigureLanguageDropButton(Label label)
    {
        label.Text = "v";
        label.Dock = DockStyle.None;
        label.TextAlign = ContentAlignment.MiddleCenter;
        label.BackColor = Color.Transparent;
        label.ForeColor = LoaderlyTheme.MutedText;
        label.Font = LoaderlyTheme.BodyFont(8.5F);
        label.Cursor = Cursors.Hand;
    }

    private static void ConfigureBrowseLabel(Label label)
    {
        label.Text = "Browse";
        label.Dock = DockStyle.Fill;
        label.TextAlign = ContentAlignment.TopCenter;
        label.Padding = new Padding(0, 9, 0, 0);
        label.BackColor = Color.Transparent;
        label.ForeColor = LoaderlyTheme.Text;
        label.Font = LoaderlyTheme.BodyFont(9.5F);
        label.Cursor = Cursors.Hand;
    }
}
