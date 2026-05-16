using System.Collections.Specialized;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Text.RegularExpressions;
using System.Windows.Forms;

namespace Loaderly;

internal sealed class MainForm : Form
{
    private const int HotKeyMessage = 0x0312;
    private const int ThemeChangedMessage = 0x031A;
    private const int SettingChangedMessage = 0x001A;
    private const int HistoryRenderThrottleMs = 1000;
    private const int ProgressLogThrottleMs = 1200;
    private const int HistoryCardHeight = 108;
    private const int HistoryCardTitleRowHeight = 30;
    private const int HistoryCardMetaRowHeight = 22;
    private const int HistoryCardDetailRowHeight = 24;
    private const int QueueCardVisualThrottleMs = 500;
    private const string QueueTitleLabelName = "queue-title";
    private const string QueueStateLabelName = "queue-state";
    private const string QueueDetailLabelName = "queue-detail";
    private const string QueueProgressBarName = "queue-progress";

    public static int HistoryRenderThrottleMillisecondsForTest => HistoryRenderThrottleMs;
    internal static int HistoryCardHeightForTest => HistoryCardHeight;

    internal static FormWindowState ChildWindowStateForParentForTest(FormWindowState parentWindowState)
    {
        return ChildWindowStateForParent(parentWindowState);
    }

    internal static IReadOnlyList<string> SidebarActionsForTest()
    {
        return ["Updates", "Tools", "Settings", "About", "Logs"];
    }

    internal static string AboutTextForTest()
    {
        return AboutText();
    }

    internal static string FriendlyDownloadErrorForTest(string message)
    {
        return FriendlyDownloadError(message);
    }

    private readonly MediaDownloadService downloadService;
    private readonly TrimExportService trimService;
    private readonly ThumbnailService thumbnailService;
    private readonly UpdateChecker updateChecker;
    private readonly DownloadHistoryStore historyStore;
    private readonly AppSettingsStore settingsStore;
    private readonly DownloadQueueStore queueStore = new();
    private readonly AppSettings settings;
    private readonly List<DownloadItem> history;

    private readonly TextBox urlTextBox = new();
    private readonly TextBox logTextBox = new();
    private readonly TextBox searchTextBox = new();
    private readonly ModernSelect qualityComboBox = new();
    private readonly ModernSelect folderSelect = new();
    private readonly ModernSelect subtitleLanguageSelect = new();
    private readonly CheckBox playlistCheckBox = new ModernCheckBox();
    private readonly CheckBox subtitlesCheckBox = new ModernCheckBox();
    private readonly FlowLayoutPanel historyFlow = new SeamlessFlowPanel();
    private readonly ModernProgressBar progressBar = new();
    private readonly Label statusLabel = new();
    private readonly Label detailsTitle = new();
    private readonly Label detailsMeta = new();
    private readonly Label detailsPath = new();
    private readonly PictureBox detailsThumbnail = new();
    private readonly ModernButton downloadButton = new();
    private readonly ModernButton browseButton = new();
    private readonly ModernButton copyButton = new();
    private readonly ModernButton openFileButton = new();
    private readonly ModernButton revealButton = new();
    private readonly ModernButton watchTrimButton = new();
    private readonly ModernButton sourceButton = new();
    private readonly ModernButton removeButton = new();
    private readonly ModernButton updateButton = new();
    private readonly ModernButton settingsButton = new();
    private readonly ModernButton toolsButton = new();
    private readonly ModernButton aboutButton = new();
    private readonly ModernButton logsButton = new();
    private readonly NotifyIcon trayIcon = new();
    private readonly ContextMenuStrip trayMenu = new();
    private readonly List<DownloadQueueItem> downloadQueue = [];
    private readonly UiUpdateThrottler historyRenderThrottler = new(HistoryRenderThrottleMs);
    private readonly UiUpdateThrottler progressLogThrottler = new(ProgressLogThrottleMs);
    private readonly UiUpdateThrottler queueCardVisualThrottler = new(QueueCardVisualThrottleMs);
    private readonly System.Windows.Forms.Timer historyRenderTimer = new();
    private readonly Dictionary<string, Image> thumbnailImageCache = new(StringComparer.OrdinalIgnoreCase);
    private readonly HashSet<Guid> thumbnailGenerationRequests = [];
    private readonly SemaphoreSlim thumbnailGenerationSemaphore = new(1, 1);

    private CancellationTokenSource? activeDownload;
    private GlobalHotKeyManager? hotKeyManager;
    private Guid? selectedItemId;
    private DownloadQueueItem? activeQueueItem;
    private bool exitingFromTray;
    private bool updatingFolderSelect;
    private bool historyRenderPending;

    private enum TrayMenuIconKind
    {
        Open,
        Exit
    }

    public MainForm(
        MediaDownloadService downloadService,
        TrimExportService trimService,
        ThumbnailService thumbnailService,
        UpdateChecker updateChecker,
        DownloadHistoryStore historyStore,
        AppSettingsStore settingsStore)
    {
        this.downloadService = downloadService;
        this.trimService = trimService;
        this.thumbnailService = thumbnailService;
        this.updateChecker = updateChecker;
        this.historyStore = historyStore;
        this.settingsStore = settingsStore;
        SetStyle(
            ControlStyles.AllPaintingInWmPaint |
            ControlStyles.OptimizedDoubleBuffer |
            ControlStyles.Selectable |
            ControlStyles.ResizeRedraw,
            true);
        DoubleBuffered = true;
        settings = settingsStore.Load();
        LoaderlyLanguage.Set(settings.AppLanguage);
        EnsureSavedFolders();
        history = historyStore.Load();
        downloadQueue.AddRange(queueStore.Load());
        historyRenderTimer.Tick += (_, _) => FlushPendingHistoryRender();

        Text = ProductInfo.Name;
        Icon = LoaderlyAssets.AppIcon;
        AutoScaleMode = AutoScaleMode.Dpi;
        StartPosition = FormStartPosition.CenterScreen;
        MinimumSize = new Size(1024, 680);
        Size = new Size(1220, 780);
        Font = LoaderlyTheme.BodyFont(10F);
        BackColor = LoaderlyTheme.Window;
        AllowDrop = true;
        LoaderlyTheme.SetMode(settings.ThemeMode);

        InitializeTray();
        SelectFirstHistoryItem();
        BuildUi();
        LoaderlyLanguage.ApplyTo(this);
        BindEvents();
        RenderHistory();
    }

    protected override async void OnShown(EventArgs e)
    {
        base.OnShown(e);
        WindowsTheme.ApplyTitleBarTheme(this);
        ShowFirstRunSetupIfNeeded();
        hotKeyManager = new GlobalHotKeyManager(this);
        if (!hotKeyManager.Register())
        {
            AppendLog("Global shortcut Ctrl+Alt+L could not be registered.");
        }

        await CheckDependenciesAsync();
        _ = ProcessQueueAsync();
    }

    protected override void OnFormClosing(FormClosingEventArgs e)
    {
        if (!exitingFromTray && settings.MinimizeToTray)
        {
            e.Cancel = true;
            Hide();
            return;
        }

        activeDownload?.Cancel();
        activeDownload?.Dispose();
        foreach (var item in downloadQueue)
        {
            item.Cancellation?.Cancel();
            item.Cancellation?.Dispose();
        }

        SaveQueue();

        historyRenderTimer.Stop();
        historyRenderTimer.Dispose();
        DisposeThumbnailCache();
        thumbnailGenerationSemaphore.Dispose();

        hotKeyManager?.Dispose();
        trayIcon.Visible = false;
        trayIcon.Dispose();
        trayMenu.Dispose();
        base.OnFormClosing(e);
    }

    protected override void WndProc(ref Message m)
    {
        if (m.Msg == HotKeyMessage && m.WParam.ToInt32() == GlobalHotKeyManager.HotKeyId)
        {
            ShowLoaderly();
        }
        else if (m.Msg == ThemeChangedMessage || m.Msg == SettingChangedMessage)
        {
            if (LoaderlyTheme.RefreshFromSystem())
            {
                RebuildForTheme();
            }
        }

        base.WndProc(ref m);
    }

    private void RebuildForTheme()
    {
        SuspendLayout();
        Controls.Clear();
        BackColor = LoaderlyTheme.Window;
        BuildUi();
        RenderHistory();
        RebuildTrayMenu();
        LoaderlyLanguage.ApplyTo(this);
        ResumeLayout(true);
        WindowsTheme.ApplyTitleBarTheme(this);
    }

    private void BuildUi()
    {
        var shell = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 2,
            RowCount = 1,
            BackColor = LoaderlyTheme.Window
        };
        shell.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 236));
        shell.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        Controls.Add(shell);

        shell.Controls.Add(BuildSidebar(), 0, 0);
        shell.Controls.Add(BuildContent(), 1, 0);
    }

    private Control BuildSidebar()
    {
        var sidebar = new Panel
        {
            Dock = DockStyle.Fill,
            BackColor = LoaderlyTheme.Sidebar,
            Padding = new Padding(22, 24, 22, 18)
        };

        var layout = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            RowCount = 9,
            ColumnCount = 1,
            BackColor = LoaderlyTheme.Sidebar
        };
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 94));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 74));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 44));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 44));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 44));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 44));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 44));
        layout.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 68));
        sidebar.Controls.Add(layout);

        var brand = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 2,
            RowCount = 1,
            BackColor = LoaderlyTheme.Sidebar
        };
        brand.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 58));
        brand.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));

        var logo = new PictureBox
        {
            Dock = DockStyle.Fill,
            Image = LoaderlyAssets.Logo128,
            SizeMode = PictureBoxSizeMode.Zoom,
            Margin = new Padding(0, 0, 12, 22)
        };
        brand.Controls.Add(logo, 0, 0);

        var brandText = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            RowCount = 2,
            ColumnCount = 1,
            BackColor = LoaderlyTheme.Sidebar,
            Margin = new Padding(0, 2, 0, 22)
        };
        brandText.RowStyles.Add(new RowStyle(SizeType.Percent, 58));
        brandText.RowStyles.Add(new RowStyle(SizeType.Percent, 42));
        brand.Controls.Add(brandText, 1, 0);

        brandText.Controls.Add(new Label
        {
            Text = ProductInfo.Name,
            Dock = DockStyle.Fill,
            ForeColor = LoaderlyTheme.SidebarText,
            Font = LoaderlyTheme.TitleFont(21),
            TextAlign = ContentAlignment.BottomLeft
        }, 0, 0);
        brandText.Controls.Add(new Label
        {
            Text = "Media studio",
            Dock = DockStyle.Fill,
            ForeColor = LoaderlyTheme.SidebarMuted,
            Font = LoaderlyTheme.BodyFont(9.5F),
            TextAlign = ContentAlignment.TopLeft
        }, 0, 1);
        layout.Controls.Add(brand, 0, 0);

        var stats = new ModernInfoBadge
        {
            Dock = DockStyle.None,
            Anchor = AnchorStyles.Left | AnchorStyles.Top,
            Size = new Size(186, 60),
            Radius = 14,
            FillColor = LoaderlyTheme.SidebarCard,
            BorderColor = LoaderlyTheme.SidebarCardBorder,
            Text = LoaderlyLanguage.SavedItems(history.Count),
            ForeColor = LoaderlyTheme.SidebarText,
            Font = LoaderlyTheme.BodyFont(12),
            TextPadding = new Padding(16, 0, 16, 0),
            Margin = new Padding(0, 0, 0, 14)
        };
        layout.Controls.Add(stats, 0, 1);

        updateButton.Text = "Updates";
        StyleSidebarButton(updateButton);
        layout.Controls.Add(updateButton, 0, 2);

        toolsButton.Text = "Tools";
        StyleSidebarButton(toolsButton);
        layout.Controls.Add(toolsButton, 0, 3);

        settingsButton.Text = "Settings";
        StyleSidebarButton(settingsButton);
        layout.Controls.Add(settingsButton, 0, 4);

        aboutButton.Text = "About";
        StyleSidebarButton(aboutButton);
        layout.Controls.Add(aboutButton, 0, 5);

        logsButton.Text = "Logs";
        StyleSidebarButton(logsButton);
        layout.Controls.Add(logsButton, 0, 6);

        var footer = new Label
        {
            Dock = DockStyle.Fill,
            Text = ProductInfo.DisplayVersion,
            ForeColor = LoaderlyTheme.SidebarMuted,
            Font = LoaderlyTheme.BodyFont(9),
            TextAlign = ContentAlignment.BottomLeft
        };
        layout.Controls.Add(footer, 0, 8);
        return sidebar;
    }

    private Control BuildContent()
    {
        var content = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            RowCount = 4,
            ColumnCount = 1,
            Padding = new Padding(24),
            BackColor = LoaderlyTheme.Window
        };
        content.RowStyles.Add(new RowStyle(SizeType.Absolute, 90));
        content.RowStyles.Add(new RowStyle(SizeType.Absolute, 154));
        content.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        content.RowStyles.Add(new RowStyle(SizeType.Absolute, 52));

        content.Controls.Add(BuildHeader(), 0, 0);
        content.Controls.Add(BuildCommandPanel(), 0, 1);
        content.Controls.Add(BuildMainArea(), 0, 2);
        content.Controls.Add(BuildLogPanel(), 0, 3);
        return content;
    }

    private Control BuildHeader()
    {
        var header = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 2,
            RowCount = 1,
            BackColor = LoaderlyTheme.Window
        };
        header.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        header.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 180));

        var titleStack = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            RowCount = 2,
            ColumnCount = 1,
            BackColor = LoaderlyTheme.Window
        };
        titleStack.RowStyles.Add(new RowStyle(SizeType.Percent, 60));
        titleStack.RowStyles.Add(new RowStyle(SizeType.Percent, 40));
        header.Controls.Add(titleStack, 0, 0);

        titleStack.Controls.Add(new Label
        {
            Text = "Media Library",
            Dock = DockStyle.Fill,
            ForeColor = LoaderlyTheme.Text,
            Font = LoaderlyTheme.TitleFont(25),
            TextAlign = ContentAlignment.BottomLeft
        }, 0, 0);
        titleStack.Controls.Add(new Label
        {
            Text = "Download, trim, subtitle, and export from YouTube, TikTok, Instagram, X/Twitter, Facebook, Vimeo, Reddit, SoundCloud, and more.",
            Dock = DockStyle.Fill,
            ForeColor = LoaderlyTheme.MutedText,
            Font = LoaderlyTheme.BodyFont(10),
            TextAlign = ContentAlignment.TopLeft
        }, 0, 1);

        statusLabel.Dock = DockStyle.Fill;
        statusLabel.Text = "Ready";
        statusLabel.TextAlign = ContentAlignment.MiddleRight;
        statusLabel.ForeColor = LoaderlyTheme.MutedText;
        statusLabel.Font = LoaderlyTheme.BodyFont(9.5F);
        header.Controls.Add(statusLabel, 1, 0);
        return header;
    }

    private Control BuildCommandPanel()
    {
        var panel = new RoundedPanel
        {
            Dock = DockStyle.Fill,
            Radius = 12,
            BackColor = LoaderlyTheme.Surface,
            BorderColor = LoaderlyTheme.Border,
            Padding = new Padding(16),
            Margin = new Padding(0, 4, 0, 14)
        };

        var layout = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            RowCount = 4,
            ColumnCount = 1,
            BackColor = LoaderlyTheme.Surface
        };
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 38));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 34));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 32));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 8));
        panel.Controls.Add(layout);

        var inputRow = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 1,
            RowCount = 1,
            BackColor = LoaderlyTheme.Surface
        };
        inputRow.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        layout.Controls.Add(inputRow, 0, 0);

        urlTextBox.Dock = DockStyle.Fill;
        urlTextBox.AutoSize = false;
        urlTextBox.PlaceholderText = "Paste one or more media URLs";
        urlTextBox.BorderStyle = BorderStyle.None;
        urlTextBox.Font = LoaderlyTheme.BodyFont(11.5F);
        urlTextBox.BackColor = LoaderlyTheme.SurfaceMuted;
        urlTextBox.ForeColor = LoaderlyTheme.Text;
        urlTextBox.ShortcutsEnabled = true;
        urlTextBox.Cursor = Cursors.IBeam;
        urlTextBox.Margin = new Padding(0, 0, 0, 6);
        inputRow.Controls.Add(urlTextBox, 0, 0);

        var optionsRow = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 6,
            RowCount = 1,
            BackColor = LoaderlyTheme.Surface
        };
        optionsRow.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 86));
        optionsRow.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 156));
        optionsRow.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 164));
        optionsRow.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 128));
        optionsRow.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        optionsRow.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 146));
        layout.Controls.Add(optionsRow, 0, 1);

        optionsRow.Controls.Add(new Label
        {
            Text = "Quality",
            Dock = DockStyle.Fill,
            TextAlign = ContentAlignment.MiddleLeft,
            ForeColor = LoaderlyTheme.MutedText,
            Font = LoaderlyTheme.BodyFont(9.5F)
        }, 0, 0);

        qualityComboBox.Dock = DockStyle.Fill;
        qualityComboBox.SetItems("Best", "1080p", "720p", "Audio only");
        qualityComboBox.SelectedIndex = qualityComboBox.SelectedIndex < 0 ? 0 : qualityComboBox.SelectedIndex;
        qualityComboBox.FillColor = LoaderlyTheme.SurfaceMuted;
        qualityComboBox.BorderColor = LoaderlyTheme.Border;
        qualityComboBox.ForeColor = LoaderlyTheme.Text;
        qualityComboBox.Font = LoaderlyTheme.BodyFont(9.7F);
        qualityComboBox.Margin = new Padding(0, 2, 0, 6);
        optionsRow.Controls.Add(qualityComboBox, 1, 0);

        playlistCheckBox.Text = "Playlists / batch";
        playlistCheckBox.Checked = true;
        StyleOptionCheckBox(playlistCheckBox);
        optionsRow.Controls.Add(playlistCheckBox, 2, 0);

        subtitlesCheckBox.Text = "Subtitles";
        subtitlesCheckBox.Checked = settings.WriteSubtitles;
        StyleOptionCheckBox(subtitlesCheckBox);
        optionsRow.Controls.Add(subtitlesCheckBox, 3, 0);

        subtitleLanguageSelect.Dock = DockStyle.Fill;
        subtitleLanguageSelect.SetItems(SubtitleLanguagePreference.OptionLabels);
        SyncSubtitleLanguageSelect();
        subtitleLanguageSelect.FillColor = LoaderlyTheme.SurfaceMuted;
        subtitleLanguageSelect.BorderColor = LoaderlyTheme.Border;
        subtitleLanguageSelect.ForeColor = LoaderlyTheme.Text;
        subtitleLanguageSelect.Font = LoaderlyTheme.BodyFont(9.2F);
        subtitleLanguageSelect.Margin = new Padding(0, 2, 12, 6);
        subtitleLanguageSelect.Enabled = subtitlesCheckBox.Checked;
        optionsRow.Controls.Add(subtitleLanguageSelect, 4, 0);

        downloadButton.Text = "Add to queue";
        downloadButton.DisplayText = LoaderlyLanguage.Text("Add to queue");
        downloadButton.Dock = DockStyle.Fill;
        downloadButton.Radius = 8;
        downloadButton.FillColor = LoaderlyTheme.Accent;
        downloadButton.HoverColor = LoaderlyTheme.AccentHover;
        downloadButton.PressedColor = LoaderlyTheme.AccentPressed;
        downloadButton.ForeColor = Color.White;
        downloadButton.Font = LoaderlyTheme.BodyFont(10.2F);
        downloadButton.Margin = new Padding(0, 2, 0, 6);
        optionsRow.Controls.Add(downloadButton, 5, 0);

        var folderRow = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 3,
            RowCount = 1,
            BackColor = LoaderlyTheme.Surface
        };
        folderRow.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 92));
        folderRow.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        folderRow.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 116));
        layout.Controls.Add(folderRow, 0, 2);

        folderRow.Controls.Add(new Label
        {
            Text = "Save to",
            Dock = DockStyle.Fill,
            TextAlign = ContentAlignment.MiddleLeft,
            ForeColor = LoaderlyTheme.MutedText,
            Font = LoaderlyTheme.BodyFont(9.5F)
        }, 0, 0);

        folderSelect.Dock = DockStyle.Fill;
        folderSelect.FillColor = LoaderlyTheme.SurfaceMuted;
        folderSelect.BorderColor = LoaderlyTheme.Border;
        folderSelect.ForeColor = LoaderlyTheme.Text;
        folderSelect.Font = LoaderlyTheme.BodyFont(9.4F);
        folderSelect.Margin = new Padding(0, 1, 12, 5);
        RefreshFolderSelect();
        folderRow.Controls.Add(folderSelect, 1, 0);

        browseButton.Text = "Browse";
        StyleSecondaryButton(browseButton);
        browseButton.Dock = DockStyle.Fill;
        browseButton.Margin = new Padding(0, 1, 0, 5);
        folderRow.Controls.Add(browseButton, 2, 0);

        progressBar.Dock = DockStyle.Fill;
        progressBar.Margin = new Padding(0, 8, 0, 0);
        progressBar.Visible = false;
        layout.Controls.Add(progressBar, 0, 3);
        return panel;
    }

    private Control BuildMainArea()
    {
        var split = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 2,
            RowCount = 1,
            BackColor = LoaderlyTheme.Window
        };
        split.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        split.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 332));

        var historyPanel = new RoundedPanel
        {
            Dock = DockStyle.Fill,
            Radius = 12,
            BackColor = LoaderlyTheme.Surface,
            BorderColor = LoaderlyTheme.Border,
            Padding = new Padding(16),
            Margin = new Padding(0, 0, 18, 18)
        };
        var historyLayout = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            RowCount = 2,
            ColumnCount = 1,
            BackColor = LoaderlyTheme.Surface
        };
        historyLayout.RowStyles.Add(new RowStyle(SizeType.Absolute, 44));
        historyLayout.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        historyPanel.Controls.Add(historyLayout);

        var searchHost = new RoundedPanel
        {
            Dock = DockStyle.Fill,
            Radius = 8,
            BackColor = LoaderlyTheme.SurfaceMuted,
            BorderColor = LoaderlyTheme.Border,
            Margin = new Padding(0, 0, 0, 12)
        };
        searchTextBox.Dock = DockStyle.None;
        searchTextBox.AutoSize = false;
        searchTextBox.Height = ModernTextBoxPlacement.TextBoxHeight;
        searchTextBox.PlaceholderText = "Search downloads";
        searchTextBox.BorderStyle = BorderStyle.None;
        searchTextBox.Font = LoaderlyTheme.BodyFont(10F);
        searchTextBox.BackColor = LoaderlyTheme.SurfaceMuted;
        searchTextBox.ForeColor = LoaderlyTheme.Text;
        searchTextBox.Margin = new Padding(0);
        searchHost.Controls.Add(searchTextBox);
        ModernTextBoxPlacement.Attach(searchHost, searchTextBox);
        historyLayout.Controls.Add(searchHost, 0, 0);

        historyFlow.Dock = DockStyle.Fill;
        historyFlow.AutoScroll = true;
        historyFlow.WrapContents = false;
        historyFlow.FlowDirection = FlowDirection.TopDown;
        historyFlow.BackColor = LoaderlyTheme.Surface;
        historyFlow.Padding = new Padding(0, 0, 12, 12);
        historyFlow.TabStop = false;
        historyLayout.Controls.Add(historyFlow, 0, 1);
        split.Controls.Add(historyPanel, 0, 0);

        split.Controls.Add(BuildDetailsPanel(), 1, 0);
        return split;
    }

    private Control BuildDetailsPanel()
    {
        var panel = new RoundedPanel
        {
            Dock = DockStyle.Fill,
            Radius = 12,
            BackColor = LoaderlyTheme.Surface,
            BorderColor = LoaderlyTheme.Border,
            Padding = new Padding(16),
            Margin = new Padding(0, 0, 0, 18)
        };

        var layout = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            RowCount = 7,
            ColumnCount = 1,
            BackColor = LoaderlyTheme.Surface
        };
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 138));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 56));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 30));
        layout.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 38));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 38));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 38));
        panel.Controls.Add(layout);

        detailsThumbnail.Dock = DockStyle.Fill;
        detailsThumbnail.BackColor = LoaderlyTheme.ThumbnailBack;
        detailsThumbnail.SizeMode = PictureBoxSizeMode.Zoom;
        detailsThumbnail.Margin = new Padding(0, 0, 0, 12);
        layout.Controls.Add(detailsThumbnail, 0, 0);

        detailsTitle.Dock = DockStyle.Fill;
        detailsTitle.AutoEllipsis = true;
        detailsTitle.Font = LoaderlyTheme.BodyFont(12.5F);
        detailsTitle.ForeColor = LoaderlyTheme.Text;
        detailsTitle.TextAlign = ContentAlignment.BottomLeft;
        layout.Controls.Add(detailsTitle, 0, 1);

        detailsMeta.Dock = DockStyle.Fill;
        detailsMeta.AutoEllipsis = true;
        detailsMeta.Font = LoaderlyTheme.BodyFont(9.2F);
        detailsMeta.ForeColor = LoaderlyTheme.MutedText;
        detailsMeta.TextAlign = ContentAlignment.MiddleLeft;
        layout.Controls.Add(detailsMeta, 0, 2);

        detailsPath.Dock = DockStyle.Fill;
        detailsPath.AutoEllipsis = true;
        detailsPath.Font = LoaderlyTheme.BodyFont(8.8F);
        detailsPath.ForeColor = LoaderlyTheme.MutedText;
        detailsPath.TextAlign = ContentAlignment.TopLeft;
        layout.Controls.Add(detailsPath, 0, 3);

        var row1 = ButtonRow(copyButton, openFileButton);
        copyButton.Text = "Copy";
        openFileButton.Text = "Open";
        StyleSecondaryButton(copyButton);
        StyleSecondaryButton(openFileButton);
        layout.Controls.Add(row1, 0, 4);

        var row2 = ButtonRow(revealButton, watchTrimButton);
        revealButton.Text = "Show";
        StyleSecondaryButton(revealButton);
        watchTrimButton.Text = "Watch / Trim";
        watchTrimButton.Radius = 8;
        watchTrimButton.FillColor = LoaderlyTheme.TrimSurface;
        watchTrimButton.HoverColor = LoaderlyTheme.TrimHover;
        watchTrimButton.ForeColor = LoaderlyTheme.TrimText;
        layout.Controls.Add(row2, 0, 5);

        var row3 = ButtonRow(sourceButton, removeButton);
        sourceButton.Text = "Source";
        StyleSecondaryButton(sourceButton);
        removeButton.Text = "Remove";
        removeButton.Radius = 8;
        removeButton.FillColor = LoaderlyTheme.DangerSurface;
        removeButton.HoverColor = LoaderlyTheme.DangerHover;
        removeButton.ForeColor = LoaderlyTheme.Danger;
        layout.Controls.Add(row3, 0, 6);
        return panel;
    }

    private static Control ButtonRow(Control left, Control right)
    {
        var row = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 2,
            RowCount = 1,
            BackColor = LoaderlyTheme.Surface
        };
        row.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 50));
        row.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 50));
        left.Dock = DockStyle.Fill;
        left.Margin = new Padding(0, 4, 5, 4);
        right.Dock = DockStyle.Fill;
        right.Margin = new Padding(5, 4, 0, 4);
        row.Controls.Add(left, 0, 0);
        row.Controls.Add(right, 1, 0);
        return row;
    }

    private Control BuildLogPanel()
    {
        var panel = new RoundedPanel
        {
            Dock = DockStyle.Fill,
            Radius = 12,
            BackColor = LoaderlyTheme.Surface,
            BorderColor = LoaderlyTheme.Border,
            Padding = new Padding(14),
            Margin = new Padding(0)
        };
        logTextBox.Dock = DockStyle.Fill;
        logTextBox.Multiline = true;
        logTextBox.ReadOnly = true;
        logTextBox.ScrollBars = ScrollBars.None;
        logTextBox.BorderStyle = BorderStyle.None;
        logTextBox.BackColor = LoaderlyTheme.Surface;
        logTextBox.ForeColor = LoaderlyTheme.MutedText;
        logTextBox.Font = LoaderlyTheme.BodyFont(8.8F);
        panel.Controls.Add(logTextBox);
        return panel;
    }

    private static void StyleSidebarButton(ModernButton button)
    {
        button.Dock = DockStyle.None;
        button.Anchor = AnchorStyles.Left | AnchorStyles.Top;
        button.Size = new Size(186, 34);
        button.Radius = 10;
        button.FillColor = LoaderlyTheme.SidebarButton;
        button.HoverColor = LoaderlyTheme.SidebarButtonHover;
        button.PressedColor = LoaderlyTheme.SidebarButtonPressed;
        button.ForeColor = LoaderlyTheme.SidebarText;
        button.Margin = new Padding(0, 0, 0, 10);
    }

    private static void StyleSecondaryButton(ModernButton button)
    {
        button.Radius = 8;
        button.FillColor = LoaderlyTheme.SurfaceMuted;
        button.HoverColor = Color.Empty;
        button.PressedColor = Color.Empty;
        button.ForeColor = LoaderlyTheme.Text;
        button.Font = LoaderlyTheme.BodyFont(9.5F);
    }

    private static void StyleOptionCheckBox(CheckBox checkBox)
    {
        checkBox.Dock = DockStyle.Fill;
        checkBox.ForeColor = LoaderlyTheme.Text;
        checkBox.BackColor = LoaderlyTheme.Surface;
        checkBox.Font = LoaderlyTheme.BodyFont(9.4F);
        checkBox.Margin = new Padding(14, 5, 12, 4);
        checkBox.AutoEllipsis = true;
    }

    private void BindEvents()
    {
        downloadButton.Click += (_, _) => EnqueueDownloads();
        browseButton.Click += (_, _) => ChooseFolder();
        folderSelect.SelectedIndexChanged += (_, _) => UseSelectedSavedFolder();
        subtitleLanguageSelect.SelectedIndexChanged += (_, _) => UseSelectedSubtitleLanguage();
        subtitlesCheckBox.CheckedChanged += (_, _) =>
        {
            settings.WriteSubtitles = subtitlesCheckBox.Checked;
            subtitleLanguageSelect.Enabled = subtitlesCheckBox.Checked;
            settingsStore.Save(settings);
        };
        copyButton.Click += (_, _) => CopySelectedFile();
        revealButton.Click += (_, _) => RevealSelectedFile();
        openFileButton.Click += (_, _) => OpenSelectedFile();
        watchTrimButton.Click += (_, _) => OpenTrimForm();
        sourceButton.Click += (_, _) => OpenSelectedSource();
        removeButton.Click += (_, _) => RemoveSelectedHistoryItem();
        updateButton.Click += async (_, _) => await CheckForUpdatesAsync();
        toolsButton.Click += (_, _) => OpenTools();
        settingsButton.Click += (_, _) => OpenSettings();
        aboutButton.Click += (_, _) => OpenAbout();
        logsButton.Click += (_, _) => OpenLogsFolder();
        searchTextBox.TextChanged += (_, _) => RenderHistory();
        historyFlow.Resize += (_, _) => SafeRenderHistory(throttle: true);
        urlTextBox.KeyDown += (_, e) =>
        {
            if ((e.Control && e.KeyCode == Keys.V) || (e.Shift && e.KeyCode == Keys.Insert))
            {
                PasteClipboardIntoUrlBox();
                e.SuppressKeyPress = true;
                return;
            }

            if (e.KeyCode == Keys.Enter)
            {
                e.SuppressKeyPress = true;
                EnqueueDownloads();
            }
        };
        DragEnter += (_, e) =>
        {
            if (e.Data?.GetDataPresent(DataFormats.Text) == true)
            {
                e.Effect = DragDropEffects.Copy;
            }
        };
        DragDrop += (_, e) =>
        {
            if (e.Data?.GetData(DataFormats.Text) is string text)
            {
                urlTextBox.Text = text.Trim();
            }
        };
        AttachUrlFocusClearers(this);
    }

    internal string PasteTextIntoUrlBoxForTest(string text)
    {
        urlTextBox.Clear();
        PasteTextIntoUrlBox(text);
        return urlTextBox.Text;
    }

    private void PasteClipboardIntoUrlBox()
    {
        if (!Clipboard.ContainsText())
        {
            return;
        }

        PasteTextIntoUrlBox(Clipboard.GetText());
    }

    private void PasteTextIntoUrlBox(string text)
    {
        var cleaned = text.Trim();
        if (string.IsNullOrWhiteSpace(cleaned))
        {
            return;
        }

        urlTextBox.Focus();
        urlTextBox.SelectedText = cleaned;
        urlTextBox.SelectionStart = urlTextBox.TextLength;
        urlTextBox.SelectionLength = 0;
    }

    internal bool ClearUrlInputFocusForTest()
    {
        return ClearUrlInputFocus();
    }

    private bool ClearUrlInputFocus()
    {
        if (urlTextBox.IsDisposed)
        {
            return true;
        }

        if (urlTextBox.Focused)
        {
            urlTextBox.SelectionLength = 0;
        }

        ActiveControl = null;
        Select();
        return true;
    }

    private void AttachUrlFocusClearers(Control root)
    {
        foreach (Control control in root.Controls)
        {
            AttachUrlFocusClearers(control);
        }

        if (ShouldClearUrlFocusWhenClicked(root))
        {
            root.MouseDown += (_, _) => ClearUrlInputFocus();
        }
    }

    private bool ShouldClearUrlFocusWhenClicked(Control control)
    {
        return control != urlTextBox &&
               control is not TextBox &&
               control is not ButtonBase &&
               control is not ModernSelect &&
               control is not ListBox &&
               control is not ComboBox &&
               control is not NumericUpDown;
    }

    private async Task CheckDependenciesAsync()
    {
        try
        {
            await downloadService.EnsureDependenciesAsync(CancellationToken.None);
            SetStatus("Ready");
        }
        catch (Exception ex)
        {
            SetStatus(ex.Message);
        }
    }

    private async Task CheckForUpdatesAsync()
    {
        updateButton.Enabled = false;
        SetStatus(LoaderlyLanguage.Text("Checking updates..."));
        try
        {
            var result = await updateChecker.CheckAsync(CancellationToken.None);
            await HandleUpdateResultAsync(result);
        }
        catch (Exception ex)
        {
            SetStatus(LoaderlyLanguage.Text("Could not check updates."));
            AppendLog(ex.Message);
        }
        finally
        {
            updateButton.Enabled = true;
        }
    }

    private async Task HandleUpdateResultAsync(UpdateCheckResult result)
    {
        if (result.Status == UpdateStatus.NoRelease)
        {
            SetStatus(LoaderlyLanguage.Text("No releases are published yet."));
            AppendLog($"{LoaderlyLanguage.Text("No releases are published yet.")} {result.ReleaseUrl}");
            return;
        }

        if (result.Status == UpdateStatus.UpToDate)
        {
            SetStatus(LoaderlyLanguage.Text("You are running the latest version."));
            AppendLog($"{LoaderlyLanguage.Text("You are running the latest version.")} {result.LatestVersion}");
            return;
        }

        if (result.Status == UpdateStatus.MissingInstaller)
        {
            SetStatus(LoaderlyLanguage.Text("The latest release does not include a Loaderly installer."));
            AppendLog($"{LoaderlyLanguage.Text("The latest release does not include a Loaderly installer.")} {result.ReleaseUrl}");
            return;
        }

        var version = result.LatestVersion ?? string.Empty;
        var prompt = $"{LoaderlyLanguage.UpdateAvailable(version)}\n\n{LoaderlyLanguage.Text("Download and install now?")}";
        var decision = MessageBox.Show(
            this,
            prompt,
            LoaderlyLanguage.Text("Loaderly update"),
            MessageBoxButtons.YesNo,
            MessageBoxIcon.Information);
        if (decision != DialogResult.Yes)
        {
            SetStatus(LoaderlyLanguage.UpdateAvailable(version));
            return;
        }

        SetStatus(LoaderlyLanguage.Text("Downloading update..."));
        var progress = new Progress<int>(percent => SetStatus($"{LoaderlyLanguage.Text("Downloading update...")} {percent}%"));
        var installerPath = await updateChecker.DownloadInstallerAsync(result, progress, CancellationToken.None);
        SetStatus(LoaderlyLanguage.Text("Update downloaded. Starting installer..."));
        Process.Start(new ProcessStartInfo
        {
            FileName = installerPath,
            UseShellExecute = true
        });
        exitingFromTray = true;
        BeginInvoke(Application.Exit);
    }

    private void EnqueueDownloads()
    {
        var urls = ParseInputUrls().ToList();
        if (urls.Count == 0)
        {
            SetStatus(LoaderlyLanguage.Text("Paste at least one valid web URL."));
            return;
        }

        var options = new DownloadOptions(
            SelectedQuality(),
            playlistCheckBox.Checked,
            subtitlesCheckBox.Checked,
            SubtitleLanguagePreference.ValueForSelection(
                subtitleLanguageSelect.SelectedText,
                settings.SubtitleLanguages));

        foreach (var sourceUrl in urls)
        {
            downloadQueue.Add(new DownloadQueueItem
            {
                SourceUrl = sourceUrl,
                Options = options
            });
        }

        urlTextBox.Clear();
        SetStatus(urls.Count == 1 ? LoaderlyLanguage.Text("Added to queue.") : LoaderlyLanguage.AddedItemsToQueue(urls.Count));
        SaveQueue();
        RenderHistory();
        _ = ProcessQueueAsync();
    }

    private IEnumerable<string> ParseInputUrls()
    {
        var parts = urlTextBox.Text
            .Split(['\r', '\n', '\t', ' '], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var part in parts)
        {
            if (!Uri.TryCreate(part, UriKind.Absolute, out var uri) ||
                (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            {
                continue;
            }

            var normalized = uri.ToString();
            if (seen.Add(normalized))
            {
                yield return normalized;
            }
        }
    }

    private DownloadQuality SelectedQuality()
    {
        return qualityComboBox.SelectedIndex switch
        {
            1 => DownloadQuality.Video1080p,
            2 => DownloadQuality.Video720p,
            3 => DownloadQuality.AudioOnly,
            _ => DownloadQuality.Best
        };
    }

    private void EnsureSavedFolders()
    {
        settings.SavedFolders = settings.SavedFolders
            .Where(path => !string.IsNullOrWhiteSpace(path))
            .Select(path => path.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (!settings.SavedFolders.Contains(settings.DownloadFolder, StringComparer.OrdinalIgnoreCase))
        {
            settings.SavedFolders.Insert(0, settings.DownloadFolder);
        }
    }

    private void AddSavedFolder(string path)
    {
        path = path.Trim();
        settings.SavedFolders.RemoveAll(existing => existing.Equals(path, StringComparison.OrdinalIgnoreCase));
        settings.SavedFolders.Insert(0, path);
    }

    private void RefreshFolderSelect()
    {
        updatingFolderSelect = true;
        EnsureSavedFolders();
        folderSelect.SetItems(settings.SavedFolders.ToArray());
        var selectedIndex = settings.SavedFolders.FindIndex(path =>
            path.Equals(settings.DownloadFolder, StringComparison.OrdinalIgnoreCase));
        folderSelect.SelectedIndex = selectedIndex >= 0 ? selectedIndex : 0;
        updatingFolderSelect = false;
    }

    private void UseSelectedSavedFolder()
    {
        if (updatingFolderSelect || string.IsNullOrWhiteSpace(folderSelect.SelectedText))
        {
            return;
        }

        settings.DownloadFolder = folderSelect.SelectedText;
        AddSavedFolder(settings.DownloadFolder);
        settingsStore.Save(settings);
        RefreshFolderSelect();
        SetStatus("Download folder updated.");
    }

    private void UseSelectedSubtitleLanguage()
    {
        if (string.IsNullOrWhiteSpace(subtitleLanguageSelect.SelectedText))
        {
            return;
        }

        settings.SubtitleLanguages = SubtitleLanguagePreference.ValueForSelection(
            subtitleLanguageSelect.SelectedText,
            settings.SubtitleLanguages);
        settings.SubtitlePreferenceConfigured = true;
        settingsStore.Save(settings);
    }

    private void SyncSubtitleLanguageSelect()
    {
        var selection = SubtitleLanguagePreference.SelectionForValue(settings.SubtitleLanguages);
        var index = subtitleLanguageSelect.Items.FindIndex(item => item.Equals(selection, StringComparison.OrdinalIgnoreCase));
        subtitleLanguageSelect.SelectedIndex = index >= 0 ? index : 0;
        subtitleLanguageSelect.Enabled = subtitlesCheckBox.Checked;
    }

    private async Task ProcessQueueAsync()
    {
        if (activeQueueItem is not null)
        {
            return;
        }

        while (downloadQueue.FirstOrDefault(item => item.State == DownloadTaskState.Queued) is { } task)
        {
            activeQueueItem = task;
            task.State = DownloadTaskState.Running;
            task.Status = "Starting";
            task.Error = null;
            task.Percent = null;
            task.Speed = null;
            task.Eta = null;
            task.Cancellation = new CancellationTokenSource();
            activeDownload = task.Cancellation;
            SaveQueue();
            SetQueueProgress(true);
            SafeRenderHistory();
            AppendLog($"Starting download: {task.SourceUrl}");

            try
            {
                var progress = new Progress<DownloadProgress>(update =>
                {
                    task.Percent = update.Percent;
                    task.Status = update.Status;
                    task.Speed = update.Speed ?? task.Speed;
                    task.Eta = update.Eta ?? task.Eta;
                    task.DownloadedBytes = update.DownloadedBytes ?? task.DownloadedBytes;
                    task.TotalBytes = update.TotalBytes ?? task.TotalBytes;
                    AppendProgressLog(update.Message);

                    RefreshQueueTaskCard(task, throttle: true);
                });

                var results = await DownloadExecution.RunAsync(
                    () => downloadService.DownloadManyAsync(
                        task.SourceUrl,
                        settings.DownloadFolder,
                        task.Options,
                        progress,
                        task.Cancellation.Token),
                    task.Cancellation.Token);

                DownloadItem? firstItem = null;
                foreach (var result in results)
                {
                    var item = new DownloadItem
                    {
                        Title = result.Title,
                        SourceUrl = task.SourceUrl,
                        FilePath = result.FilePath,
                        CreatedAt = DateTimeOffset.Now
                    };
                    history.Insert(0, item);
                    firstItem ??= item;
                    _ = EnsureThumbnailAsync(item);
                    AppendLog($"Saved: {result.FilePath}");
                }

                if (firstItem is not null)
                {
                    CopyFileToClipboard(firstItem.FilePath);
                    historyStore.Save(history);
                    selectedItemId = firstItem.Id;
                }

                task.State = DownloadTaskState.Completed;
                task.Status = "Completed";
                task.Percent = 100;
                downloadQueue.Remove(task);
                SaveQueue();
                SetStatus(results.Count == 1 ? "Download finished." : $"Finished {results.Count} downloads.");
                NotifyDownloadFinished(results.Count);
            }
            catch (OperationCanceledException)
            {
                task.State = DownloadTaskState.Canceled;
                task.Status = "Paused";
                task.Percent = null;
                SaveQueue();
                SetStatus("Download paused.");
                AppendLog("Download paused.");
            }
            catch (Exception ex)
            {
                var friendlyError = FriendlyDownloadError(ex.Message);
                task.State = DownloadTaskState.Failed;
                task.Status = "Failed";
                task.Error = friendlyError;
                SaveQueue();
                SetStatus(friendlyError);
                AppendLog($"{friendlyError} ({ex.Message})");
                NotifyDownloadFailed(friendlyError);
            }
            finally
            {
                task.Cancellation?.Dispose();
                task.Cancellation = null;
                activeDownload = null;
                activeQueueItem = null;
                SetQueueProgress(downloadQueue.Any(item => item.State == DownloadTaskState.Queued || item.State == DownloadTaskState.Running));
                SaveQueue();
                SafeRenderHistory();
            }
        }

        SetQueueProgress(false);
        SetStatus("Ready");
    }

    private void CancelQueueItem(DownloadQueueItem task)
    {
        if (task.State == DownloadTaskState.Running)
        {
            task.Cancellation?.Cancel();
            return;
        }

        if (task.State is DownloadTaskState.Queued or DownloadTaskState.Canceled or DownloadTaskState.Failed)
        {
            downloadQueue.Remove(task);
            SaveQueue();
            SafeRenderHistory();
            SetQueueProgress(downloadQueue.Any(item => item.State == DownloadTaskState.Queued || item.State == DownloadTaskState.Running));
            SetStatus("Removed from queue.");
        }
    }

    private void RetryQueueItem(DownloadQueueItem task)
    {
        task.State = DownloadTaskState.Queued;
        task.Status = "Queued";
        task.Error = null;
        task.Percent = null;
        task.Speed = null;
        task.Eta = null;
        SaveQueue();
        SafeRenderHistory();
        _ = ProcessQueueAsync();
    }

    private void ChooseFolder()
    {
        using var dialog = new FolderBrowserDialog
        {
            Description = "Choose where downloaded videos are saved",
            SelectedPath = Directory.Exists(settings.DownloadFolder)
                ? settings.DownloadFolder
                : Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
            UseDescriptionForTitle = true
        };

        if (dialog.ShowDialog(this) != DialogResult.OK)
        {
            return;
        }

        settings.DownloadFolder = dialog.SelectedPath;
        AddSavedFolder(settings.DownloadFolder);
        settingsStore.Save(settings);
        RefreshFolderSelect();
        SetStatus("Download folder updated.");
    }

    private void RenderHistory()
    {
        historyFlow.SuspendLayout();
        ClearHistoryControls();

        var query = searchTextBox.Text.Trim();
        var filteredHistory = HistoryRenderPolicy.VisibleItems(FilteredHistory(query), query);
        var visibleQueue = downloadQueue
            .Where(item => item.State is not DownloadTaskState.Completed)
            .ToList();

        if (filteredHistory.Count == 0 && visibleQueue.Count == 0)
        {
            historyFlow.Controls.Add(new Label
            {
                Text = string.IsNullOrWhiteSpace(searchTextBox.Text) ? "No saved downloads" : "No results",
                AutoSize = false,
                Width = HistoryCardWidth(),
                Height = 52,
                ForeColor = LoaderlyTheme.MutedText,
                Font = LoaderlyTheme.BodyFont(11),
                TextAlign = ContentAlignment.MiddleCenter
            });
        }

        foreach (var task in visibleQueue)
        {
            historyFlow.Controls.Add(BuildDownloadTaskCard(task));
        }

        foreach (var item in filteredHistory)
        {
            var card = BuildHistoryCard(item);
            historyFlow.Controls.Add(card);
        }

        LoaderlyLanguage.ApplyToControl(historyFlow);
        historyFlow.ResumeLayout();
        UpdateDetails();
    }

    private IEnumerable<DownloadItem> FilteredHistory(string query)
    {
        if (query.Length == 0)
        {
            return history;
        }

        return history.Where(item =>
            item.Title.Contains(query, StringComparison.OrdinalIgnoreCase) ||
            item.SourceUrl.Contains(query, StringComparison.OrdinalIgnoreCase) ||
            item.FilePath.Contains(query, StringComparison.OrdinalIgnoreCase));
    }

    private Control BuildDownloadTaskCard(DownloadQueueItem task)
    {
        var card = new RoundedPanel
        {
            Name = QueueCardName(task.Id),
            Width = HistoryCardWidth(),
            Height = 128,
            Radius = 8,
            BackColor = LoaderlyTheme.SurfaceMuted,
            BorderColor = task.State == DownloadTaskState.Failed
                ? LoaderlyTheme.Danger
                : task.State == DownloadTaskState.Running
                    ? LoaderlyTheme.SelectedBorder
                    : LoaderlyTheme.Border,
            Padding = new Padding(14),
            Margin = new Padding(0, 0, 0, 12)
        };

        var layout = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 2,
            RowCount = 1,
            BackColor = card.BackColor
        };
        layout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        layout.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 190));
        card.Controls.Add(layout);

        var text = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            RowCount = 4,
            ColumnCount = 1,
            BackColor = card.BackColor
        };
        text.RowStyles.Add(new RowStyle(SizeType.Absolute, 30));
        text.RowStyles.Add(new RowStyle(SizeType.Absolute, 24));
        text.RowStyles.Add(new RowStyle(SizeType.Absolute, 22));
        text.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        layout.Controls.Add(text, 0, 0);

        text.Controls.Add(new Label
        {
            Name = QueueTitleLabelName,
            Text = ShortUrl(task.SourceUrl),
            Dock = DockStyle.Fill,
            AutoEllipsis = true,
            ForeColor = LoaderlyTheme.Text,
            Font = LoaderlyTheme.BodyFont(11.2F),
            TextAlign = ContentAlignment.BottomLeft
        }, 0, 0);

        text.Controls.Add(new Label
        {
            Name = QueueStateLabelName,
            Text = QueueStateText(task),
            Dock = DockStyle.Fill,
            AutoEllipsis = true,
            ForeColor = task.State == DownloadTaskState.Failed ? LoaderlyTheme.Danger : LoaderlyTheme.MutedText,
            Font = LoaderlyTheme.BodyFont(9F),
            TextAlign = ContentAlignment.MiddleLeft
        }, 0, 1);

        var progress = new ModernProgressBar
        {
            Name = QueueProgressBarName,
            Dock = DockStyle.Fill,
            IsIndeterminate = task.Percent is null && task.State == DownloadTaskState.Running,
            Value = task.Percent is null ? 0 : Math.Clamp((int)Math.Round(task.Percent.Value), 0, 100),
            Margin = new Padding(0, 7, 12, 7)
        };
        text.Controls.Add(progress, 0, 2);

        text.Controls.Add(new Label
        {
            Name = QueueDetailLabelName,
            Text = task.Error ?? QueueDetailLabel(task),
            Dock = DockStyle.Fill,
            AutoEllipsis = true,
            ForeColor = task.Error is null ? LoaderlyTheme.MutedText : LoaderlyTheme.Danger,
            Font = LoaderlyTheme.BodyFont(8.6F),
            TextAlign = ContentAlignment.TopLeft
        }, 0, 3);

        var actions = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            RowCount = 2,
            ColumnCount = 1,
            BackColor = card.BackColor
        };
        actions.RowStyles.Add(new RowStyle(SizeType.Percent, 50));
        actions.RowStyles.Add(new RowStyle(SizeType.Percent, 50));
        layout.Controls.Add(actions, 1, 0);

        var cancelButton = new ModernButton
        {
            Text = task.State == DownloadTaskState.Running ? "Pause" : "Remove",
            Dock = DockStyle.Fill,
            FillColor = LoaderlyTheme.DangerSurface,
            HoverColor = LoaderlyTheme.DangerHover,
            PressedColor = LoaderlyTheme.DangerHover,
            ForeColor = LoaderlyTheme.Danger,
            Margin = new Padding(0, 4, 0, 6)
        };
        cancelButton.Enabled = task.State is DownloadTaskState.Queued or DownloadTaskState.Running or DownloadTaskState.Canceled or DownloadTaskState.Failed;
        cancelButton.Click += (_, _) => CancelQueueItem(task);
        actions.Controls.Add(cancelButton, 0, 0);

        var retryButton = new ModernButton
        {
            Text = task.State == DownloadTaskState.Canceled ? "Resume" : "Retry",
            Dock = DockStyle.Fill,
            FillColor = LoaderlyTheme.Surface,
            HoverColor = LoaderlyTheme.TrimHover,
            PressedColor = LoaderlyTheme.SelectedSurface,
            ForeColor = LoaderlyTheme.Text,
            Margin = new Padding(0, 6, 0, 4)
        };
        retryButton.Enabled = task.State is DownloadTaskState.Failed or DownloadTaskState.Canceled;
        retryButton.Click += (_, _) => RetryQueueItem(task);
        actions.Controls.Add(retryButton, 0, 1);

        return card;
    }

    private void RefreshQueueTaskCard(DownloadQueueItem task, bool throttle)
    {
        if (IsDisposed)
        {
            return;
        }

        if (InvokeRequired)
        {
            BeginInvoke(() => RefreshQueueTaskCard(task, throttle));
            return;
        }

        if (!queueCardVisualThrottler.ShouldRun(Environment.TickCount64, throttle))
        {
            return;
        }

        var card = historyFlow.Controls.Find(QueueCardName(task.Id), searchAllChildren: false).FirstOrDefault();
        if (card is null)
        {
            SafeRenderHistory(throttle: true);
            return;
        }

        card.BackColor = task.State == DownloadTaskState.Running ? LoaderlyTheme.SurfaceMuted : card.BackColor;
        if (card is RoundedPanel rounded)
        {
            rounded.BorderColor = task.State == DownloadTaskState.Failed
                ? LoaderlyTheme.Danger
                : task.State == DownloadTaskState.Running
                    ? LoaderlyTheme.SelectedBorder
                    : LoaderlyTheme.Border;
            rounded.Invalidate();
        }

        if (card.Controls.Find(QueueStateLabelName, searchAllChildren: true).FirstOrDefault() is Label state)
        {
            state.Text = LoaderlyLanguage.Text(QueueStateText(task));
            state.ForeColor = task.State == DownloadTaskState.Failed ? LoaderlyTheme.Danger : LoaderlyTheme.MutedText;
        }

        if (card.Controls.Find(QueueDetailLabelName, searchAllChildren: true).FirstOrDefault() is Label detail)
        {
            detail.Text = task.Error ?? QueueDetailLabel(task);
            detail.ForeColor = task.Error is null ? LoaderlyTheme.MutedText : LoaderlyTheme.Danger;
        }

        if (card.Controls.Find(QueueProgressBarName, searchAllChildren: true).FirstOrDefault() is ModernProgressBar progress)
        {
            progress.IsIndeterminate = task.Percent is null && task.State == DownloadTaskState.Running;
            progress.Value = task.Percent is null ? 0 : Math.Clamp((int)Math.Round(task.Percent.Value), 0, 100);
            progress.Invalidate();
        }
    }

    private static string QueueCardName(Guid id)
    {
        return $"queue-{id:N}";
    }

    private Control BuildHistoryCard(DownloadItem item)
    {
        var selected = selectedItemId == item.Id;
        var card = new RoundedPanel
        {
            Width = HistoryCardWidth(),
            Height = HistoryCardHeight,
            Radius = 8,
            BackColor = selected ? LoaderlyTheme.SelectedSurface : LoaderlyTheme.SurfaceMuted,
            BorderColor = selected ? LoaderlyTheme.SelectedBorder : LoaderlyTheme.Border,
            Padding = new Padding(10),
            Margin = new Padding(0, 0, 0, 12),
            Cursor = Cursors.Hand
        };

        var layout = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 2,
            RowCount = 1,
            BackColor = card.BackColor
        };
        layout.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 112));
        layout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        card.Controls.Add(layout);

        var thumbnail = new PictureBox
        {
            Dock = DockStyle.Fill,
            BackColor = LoaderlyTheme.ThumbnailBack,
            SizeMode = PictureBoxSizeMode.Zoom,
            Image = LoadItemImage(item),
            Margin = new Padding(0, 0, 12, 0)
        };
        layout.Controls.Add(thumbnail, 0, 0);

        var text = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            RowCount = 5,
            ColumnCount = 1,
            BackColor = card.BackColor
        };
        text.RowStyles.Add(new RowStyle(SizeType.Percent, 50));
        text.RowStyles.Add(new RowStyle(SizeType.Absolute, HistoryCardTitleRowHeight));
        text.RowStyles.Add(new RowStyle(SizeType.Absolute, HistoryCardMetaRowHeight));
        text.RowStyles.Add(new RowStyle(SizeType.Absolute, HistoryCardDetailRowHeight));
        text.RowStyles.Add(new RowStyle(SizeType.Percent, 50));
        layout.Controls.Add(text, 1, 0);

        text.Controls.Add(new Label
        {
            Text = DisplayHistoryTitle(item),
            Dock = DockStyle.Fill,
            AutoEllipsis = true,
            ForeColor = LoaderlyTheme.Text,
            Font = LoaderlyTheme.BodyFont(11.5F),
            TextAlign = HistoryTextAlign()
        }, 0, 1);
        text.Controls.Add(new Label
        {
            Text = item.CreatedAt.LocalDateTime.ToString("yyyy-MM-dd HH:mm"),
            Dock = DockStyle.Fill,
            AutoEllipsis = true,
            ForeColor = LoaderlyTheme.MutedText,
            Font = LoaderlyTheme.BodyFont(9.2F),
            TextAlign = HistoryTextAlign()
        }, 0, 2);
        text.Controls.Add(new Label
        {
            Text = HistoryFileLabel(item),
            Dock = DockStyle.Fill,
            AutoEllipsis = true,
            ForeColor = File.Exists(item.FilePath) ? LoaderlyTheme.MutedText : LoaderlyTheme.Danger,
            Font = LoaderlyTheme.BodyFont(9F),
            TextAlign = HistoryTextAlign()
        }, 0, 3);

        AttachSelectHandler(card, item.Id);

        return card;
    }

    private static ContentAlignment HistoryTextAlign()
    {
        return LoaderlyLanguage.IsArabic ? ContentAlignment.MiddleRight : ContentAlignment.MiddleLeft;
    }

    private int HistoryCardWidth()
    {
        var availableWidth = historyFlow.ClientSize.Width - historyFlow.Padding.Horizontal - 8;
        return Math.Max(360, availableWidth);
    }

    private void AttachSelectHandler(Control control, Guid id)
    {
        control.Click += (_, _) => SelectHistoryItem(id);
        control.DoubleClick += (_, _) =>
        {
            SelectHistoryItem(id);
            OpenTrimForm();
        };

        foreach (Control child in control.Controls)
        {
            AttachSelectHandler(child, id);
        }
    }

    private void SelectHistoryItem(Guid id)
    {
        selectedItemId = id;
        RenderHistory();
        if (SelectedItem() is { } item)
        {
            _ = EnsureThumbnailAsync(item);
        }
    }

    private void SelectFirstHistoryItem()
    {
        if (selectedItemId is null && history.Count > 0)
        {
            selectedItemId = history[0].Id;
        }
    }

    private async Task EnsureThumbnailAsync(DownloadItem item)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(item.FilePath) ||
                !File.Exists(item.FilePath) ||
                !string.IsNullOrWhiteSpace(item.ThumbnailPath) ||
                !thumbnailGenerationRequests.Add(item.Id))
            {
                return;
            }

            await thumbnailGenerationSemaphore.WaitAsync();
            try
            {
                if (!string.IsNullOrWhiteSpace(item.ThumbnailPath))
                {
                    return;
                }

            var thumbnail = await thumbnailService.GenerateAsync(item.FilePath, CancellationToken.None);
            if (thumbnail is null)
            {
                return;
            }

            item.ThumbnailPath = thumbnail;
            historyStore.Save(history);
            BeginInvoke(() => SafeRenderHistory(throttle: true));
            }
            finally
            {
                thumbnailGenerationSemaphore.Release();
            }
        }
        catch
        {
        }
    }

    private void UpdateDetails()
    {
        var item = SelectedItem();
        var hasItem = item is not null;
        copyButton.Enabled = true;
        openFileButton.Enabled = true;
        revealButton.Enabled = true;
        watchTrimButton.Enabled = true;
        sourceButton.Enabled = true;
        removeButton.Enabled = true;
        watchTrimButton.Text = WatchTrimButtonText(hasItem);

        if (item is null)
        {
            detailsTitle.Text = LoaderlyLanguage.Text("Open a video or select a download");
            detailsMeta.Text = LoaderlyLanguage.Text("Watch and trim works with saved downloads and local video files.");
            detailsPath.Text = LoaderlyLanguage.Text("Use Open video... below when you want to edit a file from your PC.");
            detailsThumbnail.Image = LoaderlyAssets.Logo512;
            return;
        }

        detailsTitle.Text = DisplayHistoryTitle(item);
        detailsMeta.Text = item.CreatedAt.LocalDateTime.ToString("yyyy-MM-dd HH:mm");
        detailsPath.Text = DetailsFileLabel(item.FilePath);
        detailsThumbnail.Image = LoadItemImage(item) ?? LoaderlyAssets.Logo512;
    }

    internal static string DisplayHistoryTitleForTest(string? title, string filePath)
    {
        return DisplayHistoryTitle(title, filePath);
    }

    internal static string WatchTrimButtonTextForTest(bool hasItem)
    {
        return WatchTrimButtonText(hasItem);
    }

    private static string WatchTrimButtonText(bool hasItem)
    {
        return LoaderlyLanguage.Text(hasItem ? "Watch / Trim" : "Open video...");
    }

    private static string DisplayHistoryTitle(DownloadItem item)
    {
        return DisplayHistoryTitle(item.Title, item.FilePath);
    }

    private static string DisplayHistoryTitle(string? title, string filePath)
    {
        var fallbackTitle = Path.GetFileNameWithoutExtension(filePath);
        var value = string.IsNullOrWhiteSpace(title)
            ? fallbackTitle
            : title.Trim();

        value = Regex.Replace(value ?? string.Empty, @"\s+", " ");
        value = Regex.Replace(value, @"^(#\s*)+", string.Empty);
        value = value.Trim(' ', '\t', '-', '_', '|', '#');

        if (!string.IsNullOrWhiteSpace(value))
        {
            return value;
        }

        return string.IsNullOrWhiteSpace(fallbackTitle)
            ? LoaderlyLanguage.Text("Untitled media")
            : fallbackTitle;
    }

    private static string HistoryFileLabel(DownloadItem item)
    {
        if (!File.Exists(item.FilePath))
        {
            return LoaderlyLanguage.Text("Missing file");
        }

        var fileName = Path.GetFileName(item.FilePath);
        return string.IsNullOrWhiteSpace(fileName) ? item.FilePath : fileName;
    }

    private static string DetailsFileLabel(string filePath)
    {
        if (string.IsNullOrWhiteSpace(filePath))
        {
            return string.Empty;
        }

        var fileName = Path.GetFileName(filePath);
        var folder = Path.GetDirectoryName(filePath);
        if (string.IsNullOrWhiteSpace(folder))
        {
            return fileName;
        }

        return $"{fileName}{Environment.NewLine}{folder}";
    }

    private DownloadItem? SelectedItem()
    {
        SelectFirstHistoryItem();
        return selectedItemId is null
            ? null
            : history.FirstOrDefault(item => item.Id == selectedItemId.Value);
    }

    private Image? LoadItemImage(DownloadItem item)
    {
        if (!string.IsNullOrWhiteSpace(item.ThumbnailPath) && File.Exists(item.ThumbnailPath))
        {
            if (thumbnailImageCache.TryGetValue(item.ThumbnailPath, out var cachedImage))
            {
                return cachedImage;
            }

            var image = LoadImageWithoutLock(item.ThumbnailPath);
            if (image is not null)
            {
                thumbnailImageCache[item.ThumbnailPath] = image;
                return image;
            }
        }

        return LoaderlyAssets.Logo512;
    }

    private static Image? LoadImageWithoutLock(string path)
    {
        try
        {
            using var stream = File.OpenRead(path);
            using var image = Image.FromStream(stream);
            return new Bitmap(image);
        }
        catch
        {
            return null;
        }
    }

    private void CopySelectedFile()
    {
        var item = SelectedItem();
        if (item is null)
        {
            SetStatus("Select a history item first.");
            return;
        }

        if (!File.Exists(item.FilePath))
        {
            SetStatus("That file no longer exists.");
            return;
        }

        CopyFileToClipboard(item.FilePath);
        SetStatus("File copied to clipboard.");
    }

    private static void CopyFileToClipboard(string filePath)
    {
        var collection = new StringCollection();
        collection.Add(filePath);
        Clipboard.SetFileDropList(collection);
    }

    private void RevealSelectedFile()
    {
        var item = SelectedItem();
        if (item is null)
        {
            SetStatus("Select a history item first.");
            return;
        }

        if (!File.Exists(item.FilePath))
        {
            SetStatus("That file no longer exists.");
            return;
        }

        Process.Start(new ProcessStartInfo
        {
            FileName = "explorer.exe",
            Arguments = $"/select,\"{item.FilePath}\"",
            UseShellExecute = true
        });
    }

    private void OpenSelectedFile()
    {
        var item = SelectedItem();
        if (item is null)
        {
            SetStatus("Select a history item first.");
            return;
        }

        if (!File.Exists(item.FilePath))
        {
            SetStatus("That file no longer exists.");
            return;
        }

        Process.Start(new ProcessStartInfo
        {
            FileName = item.FilePath,
            UseShellExecute = true
        });
    }

    private void OpenSelectedSource()
    {
        var item = SelectedItem();
        if (item is null)
        {
            SetStatus("Select a history item first.");
            return;
        }

        Process.Start(new ProcessStartInfo
        {
            FileName = item.SourceUrl,
            UseShellExecute = true
        });
    }

    private async void OpenTrimForm()
    {
        var item = SelectedItem();
        if (item is null)
        {
            await OpenLocalVideoForTrimAsync();
            return;
        }

        if (!File.Exists(item.FilePath))
        {
            SetStatus("That file no longer exists.");
            return;
        }

        await OpenTrimFormForFileAsync(item.FilePath, item.Title, item.SourceUrl);
    }

    private async Task OpenLocalVideoForTrimAsync()
    {
        using var dialog = new OpenFileDialog
        {
            Title = "Open video",
            Filter = "Video files (*.mp4;*.m4v;*.mov;*.mkv;*.webm)|*.mp4;*.m4v;*.mov;*.mkv;*.webm|All files (*.*)|*.*",
            CheckFileExists = true,
            Multiselect = false
        };

        if (dialog.ShowDialog(this) != DialogResult.OK)
        {
            return;
        }

        var title = Path.GetFileNameWithoutExtension(dialog.FileName);
        await OpenTrimFormForFileAsync(dialog.FileName, title, new Uri(dialog.FileName).AbsoluteUri);
    }

    private async Task OpenTrimFormForFileAsync(string filePath, string title, string sourceUrl)
    {
        try
        {
            using var trimForm = new TrimForm(filePath, title, trimService, settings, () => settingsStore.Save(settings));
            trimForm.Icon = LoaderlyAssets.AppIcon;
            ApplyChildWindowState(trimForm);
            trimForm.ShowDialog(this);

            if (!string.IsNullOrWhiteSpace(trimForm.LastSavedFilePath) && File.Exists(trimForm.LastSavedFilePath))
            {
                var savedItem = new DownloadItem
                {
                    Title = $"{Path.GetFileNameWithoutExtension(filePath)} trim",
                    SourceUrl = sourceUrl,
                    FilePath = trimForm.LastSavedFilePath,
                    CreatedAt = DateTimeOffset.Now,
                    ThumbnailPath = await thumbnailService.GenerateAsync(trimForm.LastSavedFilePath, CancellationToken.None)
                };
                history.Insert(0, savedItem);
                SaveAndRenderHistory(savedItem.Id);
                SetStatus("Trim saved and added to history.");
            }
        }
        catch (Exception ex)
        {
            SetStatus($"Could not open video editor: {ex.Message}");
            AppendLog($"Could not open video editor: {ex.Message}");
        }
    }

    private void ApplyChildWindowState(Form child)
    {
        child.WindowState = ChildWindowStateForParent(WindowState);
    }

    private static FormWindowState ChildWindowStateForParent(FormWindowState parentWindowState)
    {
        return parentWindowState == FormWindowState.Maximized
            ? FormWindowState.Maximized
            : FormWindowState.Normal;
    }

    private void RemoveSelectedHistoryItem()
    {
        var item = SelectedItem();
        if (item is null)
        {
            SetStatus("Select a history item first.");
            return;
        }

        var decision = MessageBox.Show(
            this,
            LoaderlyLanguage.Text("Do you want to delete the file from your PC too?\n\nYes: delete file and remove from history\nNo: remove from history only\nCancel: keep it"),
            LoaderlyLanguage.Text("Remove download"),
            MessageBoxButtons.YesNoCancel,
            MessageBoxIcon.Question);

        if (decision == DialogResult.Cancel)
        {
            return;
        }

        if (decision == DialogResult.Yes && File.Exists(item.FilePath))
        {
            try
            {
                File.Delete(item.FilePath);
            }
            catch (Exception ex)
            {
                SetStatus($"Could not delete file: {ex.Message}");
                return;
            }
        }

        history.RemoveAll(existing => existing.Id == item.Id);
        selectedItemId = history.FirstOrDefault()?.Id;
        SaveAndRenderHistory(selectedItemId);
        SetStatus(decision == DialogResult.Yes ? LoaderlyLanguage.Text("Deleted file and removed from history.") : LoaderlyLanguage.Text("Removed from history."));
    }

    private void SaveAndRenderHistory(Guid? selectedId)
    {
        selectedItemId = selectedId;
        historyStore.Save(history);
        RenderHistory();
    }

    private void SaveQueue()
    {
        queueStore.Save(downloadQueue);
    }

    private void SetDownloading(bool isDownloading)
    {
        downloadButton.Text = LoaderlyLanguage.Text("Add to queue");
        progressBar.Visible = isDownloading;
        progressBar.IsIndeterminate = isDownloading;
        progressBar.Value = 0;
    }

    private void SetQueueProgress(bool active)
    {
        if (IsDisposed)
        {
            return;
        }

        if (InvokeRequired)
        {
            BeginInvoke(() => SetQueueProgress(active));
            return;
        }

        progressBar.Visible = active;
        progressBar.IsIndeterminate = active;
        progressBar.Value = 0;
    }

    private void SafeRenderHistory(bool throttle = false)
    {
        if (IsDisposed)
        {
            return;
        }

        if (InvokeRequired)
        {
            BeginInvoke(() => SafeRenderHistory(throttle));
            return;
        }

        var now = Environment.TickCount64;
        if (historyRenderThrottler.ShouldRun(now, throttle))
        {
            historyRenderTimer.Stop();
            historyRenderPending = false;
            RenderHistory();
            return;
        }

        if (historyRenderPending)
        {
            return;
        }

        historyRenderPending = true;
        historyRenderTimer.Interval = historyRenderThrottler.DelayUntilNextRun(now);
        historyRenderTimer.Start();
    }

    private void FlushPendingHistoryRender()
    {
        historyRenderTimer.Stop();
        historyRenderPending = false;
        if (IsDisposed)
        {
            return;
        }

        historyRenderThrottler.MarkRun(Environment.TickCount64);
        RenderHistory();
    }

    private void ClearHistoryControls()
    {
        while (historyFlow.Controls.Count > 0)
        {
            var control = historyFlow.Controls[0];
            historyFlow.Controls.RemoveAt(0);
            DetachCachedImages(control);
            control.Dispose();
        }
    }

    private static void DetachCachedImages(Control control)
    {
        if (control is PictureBox pictureBox)
        {
            pictureBox.Image = null;
        }

        foreach (Control child in control.Controls)
        {
            DetachCachedImages(child);
        }
    }

    private void DisposeThumbnailCache()
    {
        foreach (var image in thumbnailImageCache.Values)
        {
            image.Dispose();
        }

        thumbnailImageCache.Clear();
    }

    private void InitializeTray()
    {
        RebuildTrayMenu();
        trayIcon.Icon = LoaderlyAssets.AppIcon;
        trayIcon.Text = ProductInfo.Name;
        trayIcon.ContextMenuStrip = trayMenu;
        trayIcon.Visible = true;
        trayIcon.DoubleClick += (_, _) => ShowLoaderly();
    }

    private void RebuildTrayMenu()
    {
        trayMenu.Items.Clear();
        ConfigureTrayMenuAppearance();
        trayMenu.Items.Add(CreateTrayMenuItem(LoaderlyLanguage.Text("Open Loaderly"), TrayMenuIconKind.Open, (_, _) => ShowLoaderly()));
        trayMenu.Items.Add(CreateTrayMenuItem(LoaderlyLanguage.Text("Exit"), TrayMenuIconKind.Exit, (_, _) =>
            {
                exitingFromTray = true;
                Close();
            }));
    }

    private void ConfigureTrayMenuAppearance()
    {
        trayMenu.Renderer = new ModernMenuRenderer();
        trayMenu.BackColor = LoaderlyTheme.SurfaceMuted;
        trayMenu.ForeColor = LoaderlyTheme.Text;
        trayMenu.Font = LoaderlyTheme.BodyFont(9.4F);
        trayMenu.Padding = new Padding(6);
        trayMenu.ShowImageMargin = true;
        trayMenu.ShowCheckMargin = false;
        trayMenu.ImageScalingSize = new Size(16, 16);
        trayMenu.RightToLeft = LoaderlyLanguage.IsArabic ? RightToLeft.Yes : RightToLeft.No;
    }

    private static ToolStripMenuItem CreateTrayMenuItem(string text, TrayMenuIconKind iconKind, EventHandler onClick)
    {
        var item = new ToolStripMenuItem(text, CreateTrayIcon(iconKind), onClick)
        {
            AutoSize = false,
            Width = 154,
            Height = 32,
            BackColor = LoaderlyTheme.SurfaceMuted,
            ForeColor = LoaderlyTheme.Text,
            Font = LoaderlyTheme.BodyFont(9.4F),
            ImageScaling = ToolStripItemImageScaling.None,
            ImageAlign = ContentAlignment.MiddleCenter,
            TextAlign = ContentAlignment.MiddleLeft,
            TextImageRelation = TextImageRelation.ImageBeforeText,
            Padding = new Padding(0, 0, 8, 0)
        };
        return item;
    }

    private static Image CreateTrayIcon(TrayMenuIconKind iconKind)
    {
        var bitmap = new Bitmap(16, 16);
        using var graphics = Graphics.FromImage(bitmap);
        graphics.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
        graphics.Clear(Color.Transparent);
        using var pen = new Pen(LoaderlyTheme.MutedText, 1.7F)
        {
            StartCap = System.Drawing.Drawing2D.LineCap.Round,
            EndCap = System.Drawing.Drawing2D.LineCap.Round,
            LineJoin = System.Drawing.Drawing2D.LineJoin.Round
        };

        switch (iconKind)
        {
            case TrayMenuIconKind.Open:
                return CreateAppTrayIcon();
            case TrayMenuIconKind.Exit:
                graphics.DrawLine(pen, 3, 3, 9, 3);
                graphics.DrawLine(pen, 3, 3, 3, 13);
                graphics.DrawLine(pen, 3, 13, 9, 13);
                graphics.DrawLine(pen, 8, 8, 14, 8);
                graphics.DrawLines(pen, new[] { new Point(11, 5), new Point(14, 8), new Point(11, 11) });
                break;
        }

        return bitmap;
    }

    private static Image CreateAppTrayIcon()
    {
        var bitmap = new Bitmap(16, 16);
        using var graphics = Graphics.FromImage(bitmap);
        graphics.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.HighQuality;
        graphics.Clear(Color.Transparent);

        using var source = LoaderlyAssets.AppIcon?.ToBitmap();
        if (source is not null)
        {
            graphics.DrawImage(source, new Rectangle(0, 0, 16, 16));
            return bitmap;
        }

        using var brush = new SolidBrush(LoaderlyTheme.Accent);
        using var path = LoaderlyTheme.RoundedRect(new Rectangle(2, 2, 12, 12), 4);
        graphics.FillPath(brush, path);
        using var pen = new Pen(Color.White, 1.7F) { StartCap = System.Drawing.Drawing2D.LineCap.Round, EndCap = System.Drawing.Drawing2D.LineCap.Round };
        graphics.DrawLines(pen, new[] { new Point(9, 3), new Point(6, 8), new Point(10, 8), new Point(7, 13) });
        return bitmap;
    }

    private void OpenSettings()
    {
        var previousLanguage = settings.AppLanguage;
        using var form = new SettingsForm(settings);
        form.Icon = LoaderlyAssets.AppIcon;
        if (form.ShowDialog(this) != DialogResult.OK)
        {
            return;
        }

        settingsStore.Save(settings);
        EnsureSavedFolders();
        RefreshFolderSelect();
        subtitlesCheckBox.Checked = settings.WriteSubtitles;
        SyncSubtitleLanguageSelect();
        var languageChanged = !LoaderlyLanguage.Normalize(previousLanguage).Equals(
            LoaderlyLanguage.Normalize(settings.AppLanguage),
            StringComparison.OrdinalIgnoreCase);
        LoaderlyLanguage.Set(settings.AppLanguage);
        var themeChanged = LoaderlyTheme.SetMode(settings.ThemeMode);
        if (themeChanged || languageChanged)
        {
            RebuildForTheme();
        }

        SetStatus(LoaderlyLanguage.Text("Settings saved."));
    }

    private void OpenTools()
    {
        using var form = new ToolsForm();
        form.Icon = LoaderlyAssets.AppIcon;
        form.ShowDialog(this);
    }

    private void ShowFirstRunSetupIfNeeded()
    {
        if (settings.FirstRunComplete)
        {
            return;
        }

        var previousLanguage = settings.AppLanguage;
        using var form = new FirstRunForm(settings);
        if (form.ShowDialog(this) != DialogResult.OK)
        {
            return;
        }

        settingsStore.Save(settings);
        EnsureSavedFolders();
        RefreshFolderSelect();
        var languageChanged = !LoaderlyLanguage.Normalize(previousLanguage).Equals(
            LoaderlyLanguage.Normalize(settings.AppLanguage),
            StringComparison.OrdinalIgnoreCase);
        LoaderlyLanguage.Set(settings.AppLanguage);
        if (LoaderlyTheme.SetMode(settings.ThemeMode) || languageChanged)
        {
            RebuildForTheme();
        }

        SetStatus(LoaderlyLanguage.Text("First run setup saved."));
    }

    private void OpenAbout()
    {
        MessageBox.Show(
            this,
            AboutText(),
            LoaderlyLanguage.Text("About Loaderly"),
            MessageBoxButtons.OK,
            MessageBoxIcon.Information);
    }

    private void OpenLogsFolder()
    {
        var folder = Path.GetDirectoryName(AppLog.LogFilePath)!;
        Directory.CreateDirectory(folder);
        Process.Start(new ProcessStartInfo
        {
            FileName = folder,
            UseShellExecute = true
        });
    }

    private static string AboutText()
    {
        return string.Join(
            Environment.NewLine,
            ProductInfo.Name,
            ProductInfo.DisplayVersion,
            ProductInfo.ReleasesUri,
            AppLog.LogFilePath);
    }

    private void NotifyDownloadFinished(int count)
    {
        if (!settings.EnableNotifications)
        {
            return;
        }

        var message = count == 1 ? LoaderlyLanguage.Text("Download finished.") : LoaderlyLanguage.FinishedDownloads(count);
        if (!settings.UseModernToastNotifications || !WindowsToastNotifier.TryShow(ProductInfo.Name, message))
        {
            trayIcon.ShowBalloonTip(3000, ProductInfo.Name, message, NotificationFallbackIcon());
        }
    }

    private void NotifyDownloadFailed(string message)
    {
        if (settings.EnableNotifications)
        {
            if (!settings.UseModernToastNotifications || !WindowsToastNotifier.TryShow(ProductInfo.Name, message))
            {
                trayIcon.ShowBalloonTip(4000, ProductInfo.Name, message, NotificationFallbackIcon());
            }
        }
    }

    internal static bool ShowsTrayReminderNotificationForTest()
    {
        return false;
    }

    internal static ToolTipIcon NotificationFallbackIconForTest()
    {
        return NotificationFallbackIcon();
    }

    private static ToolTipIcon NotificationFallbackIcon()
    {
        return ToolTipIcon.None;
    }

    private static string ShortUrl(string sourceUrl)
    {
        if (!Uri.TryCreate(sourceUrl, UriKind.Absolute, out var uri))
        {
            return sourceUrl;
        }

        var path = uri.AbsolutePath.Trim('/');
        return string.IsNullOrWhiteSpace(path)
            ? uri.Host
            : $"{uri.Host}/{path}";
    }

    private static string QueueStateText(DownloadQueueItem task)
    {
        var percent = task.Percent is null ? string.Empty : $" {task.Percent.Value:0}%";
        var state = task.State == DownloadTaskState.Canceled ? "Paused" : task.State.ToString();
        return $"{LoaderlyLanguage.Text(state)}{percent} - {LoaderlyLanguage.Text(task.Status)}";
    }

    private static string FriendlyDownloadError(string message)
    {
        if (string.IsNullOrWhiteSpace(message))
        {
            return LoaderlyLanguage.Text("Download failed.");
        }

        if (message.Contains("subtitle", StringComparison.OrdinalIgnoreCase) &&
            (message.Contains("429", StringComparison.OrdinalIgnoreCase) ||
             message.Contains("Too Many Requests", StringComparison.OrdinalIgnoreCase)))
        {
            return LoaderlyLanguage.Text("Subtitles were rate limited. Retry without subtitles or try again later.");
        }

        if (message.Contains("yt-dlp", StringComparison.OrdinalIgnoreCase) &&
            (message.Contains("not recognized", StringComparison.OrdinalIgnoreCase) ||
             message.Contains("not found", StringComparison.OrdinalIgnoreCase) ||
             message.Contains("missing", StringComparison.OrdinalIgnoreCase)))
        {
            return LoaderlyLanguage.Text("Downloader tool is missing. Open Tools and update yt-dlp.");
        }

        if (message.Contains("Download folder did not respond", StringComparison.OrdinalIgnoreCase))
        {
            return LoaderlyLanguage.Text("Download folder is not responding. Choose another folder or reconnect the drive.");
        }

        if (message.Contains("timed out", StringComparison.OrdinalIgnoreCase) ||
            message.Contains("timeout", StringComparison.OrdinalIgnoreCase) ||
            message.Contains("connection", StringComparison.OrdinalIgnoreCase))
        {
            return LoaderlyLanguage.Text("Connection problem. Retry when the site responds.");
        }

        return message.Length <= 220 ? message : $"{message[..217]}...";
    }

    private static string QualityLabel(DownloadOptions options)
    {
        var quality = options.Quality switch
        {
            DownloadQuality.Video1080p => "1080p",
            DownloadQuality.Video720p => "720p",
            DownloadQuality.AudioOnly => "Audio only",
            _ => "Best"
        };
        var playlist = options.AllowPlaylist
            ? (LoaderlyLanguage.IsArabic ? "قائمة التشغيل مفعلة" : "playlist enabled")
            : (LoaderlyLanguage.IsArabic ? "رابط واحد" : "single link");
        var subtitles = options.WriteSubtitles
            ? (LoaderlyLanguage.IsArabic ? "الترجمة مفعلة" : "subtitles on")
            : (LoaderlyLanguage.IsArabic ? "الترجمة متوقفة" : "subtitles off");
        var subtitleLanguages = options.WriteSubtitles && !string.IsNullOrWhiteSpace(options.SubtitleLanguages)
            ? $" - {SubtitleLanguagePreference.Description(options.SubtitleLanguages)}"
            : string.Empty;
        return $"{LoaderlyLanguage.Text(quality)} - {playlist} - {subtitles}{subtitleLanguages}";
    }

    private static string QueueDetailLabel(DownloadQueueItem task)
    {
        var speed = string.IsNullOrWhiteSpace(task.Speed) ? string.Empty : $" - {task.Speed}";
        var eta = string.IsNullOrWhiteSpace(task.Eta) ? string.Empty : $" - ETA {task.Eta}";
        return $"{QualityLabel(task.Options)}{speed}{eta}";
    }

    private void ShowLoaderly()
    {
        if (WindowState == FormWindowState.Minimized)
        {
            WindowState = FormWindowState.Normal;
        }

        Show();
        Activate();
        BringToFront();
        urlTextBox.Focus();
    }

    private void SetStatus(string message)
    {
        statusLabel.Text = LoaderlyLanguage.Text(message);
    }

    private void AppendLog(string message)
    {
        if (string.IsNullOrWhiteSpace(message))
        {
            return;
        }

        logTextBox.AppendText($"[{DateTime.Now:HH:mm:ss}] {message}{Environment.NewLine}");
        AppLog.Write(message);
    }

    private void AppendProgressLog(string? message)
    {
        if (string.IsNullOrWhiteSpace(message))
        {
            return;
        }

        if (progressLogThrottler.ShouldRun(Environment.TickCount64, throttle: true))
        {
            AppendLog(message);
        }
    }
}
