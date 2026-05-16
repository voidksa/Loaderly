using System.Collections.Specialized;
using System.Drawing;
using System.IO;
using System.Text;
using WinForms = System.Windows.Forms;
using Wpf = System.Windows;
using WpfControls = System.Windows.Controls;
using WpfMedia = System.Windows.Media;

namespace Loaderly;

internal sealed class TrimForm : WinForms.Form
{
    private const int TimeScale = 100;
    private const int MinimumTrimUnits = 25;
    private const int ThemeChangedMessage = 0x031A;
    private const int SettingChangedMessage = 0x001A;
    private const int TimelineThumbnailDelayMilliseconds = 350;
    private const int TransportRowHeight = 66;
    private const int StatusLabelVerticalMargin = 7;

    public static int TimelineThumbnailDelayMillisecondsForTest => TimelineThumbnailDelayMilliseconds;
    internal static int TransportRowHeightForTest => TransportRowHeight;
    internal static int StatusLabelVerticalMarginForTest => StatusLabelVerticalMargin;

    internal static WinForms.FormWindowState SubtitleEditorWindowStateForParentForTest(WinForms.FormWindowState parentWindowState)
    {
        return ChildWindowStateForParent(parentWindowState);
    }

    private readonly string sourceFilePath;
    private readonly string displayTitle;
    private readonly TrimExportService trimService;
    private readonly AppSettings settings;
    private readonly Action? saveSettings;
    private readonly TimelineThumbnailService timelineThumbnailService = new();
    private readonly TrimStateStore trimStateStore = new();
    private readonly System.Windows.Forms.Integration.ElementHost videoHost = new();
    private readonly WpfControls.Grid videoSurface = new();
    private readonly WpfControls.MediaElement player = new();
    private readonly WpfControls.Border subtitleOverlay = new();
    private readonly WpfControls.TextBlock subtitleTextBlock = new();
    private readonly ModernRangeTimeline timeline = new();
    private readonly ModernButton playButton = new();
    private readonly ModernButton setStartButton = new();
    private readonly ModernButton setEndButton = new();
    private readonly ModernButton frameBackButton = new();
    private readonly ModernButton frameForwardButton = new();
    private readonly ModernButton saveButton = new();
    private readonly ModernButton copyButton = new();
    private readonly ModernButton resetButton = new();
    private readonly ModernButton closeButton = new();
    private readonly ModernButton chooseSubtitleButton = new();
    private readonly ModernButton editSubtitleButton = new();
    private readonly ModernButton translateSubtitleButton = new();
    private readonly ModernButton originalSubtitleButton = new();
    private readonly ModernButton removeSubtitleButton = new();
    private readonly ModernButton toggleSubtitleButton = new();
    private readonly ModernSelect exportQualityComboBox = new();
    private readonly ModernSelect subtitleExportComboBox = new();
    private readonly WinForms.CheckBox muteCheckBox = new ModernCheckBox();
    private readonly WinForms.Label startValueLabel = new();
    private readonly WinForms.Label endValueLabel = new();
    private readonly WinForms.Label selectionValueLabel = new();
    private readonly WinForms.Label currentTimeLabel = new();
    private readonly WinForms.Label durationValueLabel = new();
    private readonly WinForms.Label fileNameLabel = new();
    private readonly WinForms.Label statusLabel = new();
    private readonly WinForms.Label subtitleStatusLabel = new();
    private readonly WinForms.Timer playbackTimer = new();
    private readonly Stack<TrimSnapshot> undoStack = new();
    private readonly Stack<TrimSnapshot> redoStack = new();

    private CancellationTokenSource? exportCancellation;
    private CancellationTokenSource? timelineThumbnailCancellation;
    private CancellationTokenSource? copiedFeedbackCancellation;
    private CancellationTokenSource? subtitleTranslationCancellation;
    private bool updatingControls;
    private bool isTimelineInteracting;
    private bool resumeAfterTimelineInteraction;
    private TrimSnapshot? interactionStartSnapshot;
    private TimeSpan duration = TimeSpan.Zero;
    private TimeSpan? pendingSubtitleEditorRestorePosition;
    private bool pendingSubtitleEditorRestorePlayback;
    private IReadOnlyList<SubtitleCue> subtitleCues = [];
    private string? subtitleFilePath;
    private string? originalSubtitleFilePath;
    private bool subtitlesVisible = true;

    public string? LastSavedFilePath { get; private set; }

    public TrimForm(string sourceFilePath, string title, TrimExportService trimService, AppSettings settings, Action? saveSettings = null)
    {
        this.sourceFilePath = sourceFilePath;
        displayTitle = title;
        this.trimService = trimService;
        this.settings = settings;
        this.saveSettings = saveSettings;

        SetStyle(
            WinForms.ControlStyles.AllPaintingInWmPaint |
            WinForms.ControlStyles.OptimizedDoubleBuffer |
            WinForms.ControlStyles.ResizeRedraw,
            true);
        DoubleBuffered = true;
        Text = $"{LoaderlyLanguage.Text("Watch / Trim")} - {title}";
        AutoScaleMode = WinForms.AutoScaleMode.Dpi;
        StartPosition = WinForms.FormStartPosition.CenterParent;
        MinimumSize = new Size(980, 680);
        Size = new Size(1120, 740);
        Font = LoaderlyTheme.BodyFont(10F);
        BackColor = LoaderlyTheme.Window;
        KeyPreview = true;

        BuildUi();
        LoaderlyLanguage.ApplyTo(this);
        BindEvents();
    }

    protected override void OnShown(EventArgs e)
    {
        base.OnShown(e);
        WindowsTheme.ApplyTitleBarTheme(this);

        player.LoadedBehavior = WpfControls.MediaState.Manual;
        player.UnloadedBehavior = WpfControls.MediaState.Manual;
        player.Stretch = WpfMedia.Stretch.Uniform;
        player.ScrubbingEnabled = true;
        player.Source = new Uri(sourceFilePath);
        player.Play();
    }

    protected override void OnFormClosing(WinForms.FormClosingEventArgs e)
    {
        SaveTrimState();
        exportCancellation?.Cancel();
        timelineThumbnailCancellation?.Cancel();
        timelineThumbnailCancellation?.Dispose();
        copiedFeedbackCancellation?.Cancel();
        copiedFeedbackCancellation?.Dispose();
        subtitleTranslationCancellation?.Cancel();
        subtitleTranslationCancellation?.Dispose();
        playbackTimer.Stop();
        player.Stop();
        player.Source = null;
        base.OnFormClosing(e);
    }

    protected override bool ProcessCmdKey(ref WinForms.Message msg, WinForms.Keys keyData)
    {
        return HandleShortcut(keyData) || base.ProcessCmdKey(ref msg, keyData);
    }

    protected override void WndProc(ref WinForms.Message m)
    {
        if ((m.Msg == ThemeChangedMessage || m.Msg == SettingChangedMessage) && LoaderlyTheme.RefreshFromSystem())
        {
            RebuildForTheme();
        }

        base.WndProc(ref m);
    }

    private void RebuildForTheme()
    {
        SuspendLayout();
        Controls.Clear();
        BackColor = LoaderlyTheme.Window;
        BuildUi();
        RefreshTimeLabels();
        LoaderlyLanguage.ApplyTo(this);
        ResumeLayout(true);
        WindowsTheme.ApplyTitleBarTheme(this);
    }

    private void BuildUi()
    {
        var root = new WinForms.TableLayoutPanel
        {
            Dock = WinForms.DockStyle.Fill,
            ColumnCount = 1,
            RowCount = 2,
            Padding = new WinForms.Padding(22),
            BackColor = LoaderlyTheme.Window
        };
        root.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Absolute, 76));
        root.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Percent, 100));
        Controls.Add(root);

        root.Controls.Add(BuildHeader(), 0, 0);

        var content = new WinForms.TableLayoutPanel
        {
            Dock = WinForms.DockStyle.Fill,
            ColumnCount = 2,
            RowCount = 1,
            BackColor = LoaderlyTheme.Window
        };
        content.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Percent, 100));
        content.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Absolute, 352));
        root.Controls.Add(content, 0, 1);

        content.Controls.Add(BuildPreviewArea(), 0, 0);
        content.Controls.Add(BuildTrimPanel(), 1, 0);
    }

    private WinForms.Control BuildHeader()
    {
        var header = new WinForms.TableLayoutPanel
        {
            Dock = WinForms.DockStyle.Fill,
            ColumnCount = 1,
            RowCount = 2,
            BackColor = LoaderlyTheme.Window,
            Margin = new WinForms.Padding(0, 0, 0, 12)
        };
        header.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Percent, 58));
        header.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Percent, 42));

        header.Controls.Add(new WinForms.Label
        {
            Text = displayTitle,
            Dock = WinForms.DockStyle.Fill,
            AutoEllipsis = true,
            TextAlign = ContentAlignment.BottomLeft,
            Font = LoaderlyTheme.TitleFont(18F),
            ForeColor = LoaderlyTheme.Text
        }, 0, 0);

        fileNameLabel.Text = Path.GetFileName(sourceFilePath);
        fileNameLabel.Dock = WinForms.DockStyle.Fill;
        fileNameLabel.AutoEllipsis = true;
        fileNameLabel.TextAlign = ContentAlignment.TopLeft;
        fileNameLabel.Font = LoaderlyTheme.BodyFont(9.3F);
        fileNameLabel.ForeColor = LoaderlyTheme.MutedText;
        header.Controls.Add(fileNameLabel, 0, 1);

        return header;
    }

    private WinForms.Control BuildPreviewArea()
    {
        var area = new WinForms.TableLayoutPanel
        {
            Dock = WinForms.DockStyle.Fill,
            ColumnCount = 1,
            RowCount = 3,
            BackColor = LoaderlyTheme.Window,
            Margin = new WinForms.Padding(0, 0, 18, 0)
        };
        area.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Percent, 100));
        area.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Absolute, 108));
        area.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Absolute, TransportRowHeight));

        var videoFrame = new WinForms.Panel
        {
            Dock = WinForms.DockStyle.Fill,
            BackColor = LoaderlyTheme.ThumbnailBack,
            Padding = new WinForms.Padding(0),
            Margin = new WinForms.Padding(0, 0, 0, 6)
        };
        videoHost.Dock = WinForms.DockStyle.Fill;
        videoHost.BackColor = LoaderlyTheme.ThumbnailBack;
        ConfigureVideoSurface();
        videoFrame.Controls.Add(videoHost);
        area.Controls.Add(videoFrame, 0, 0);

        var timelinePanel = new RoundedPanel
        {
            Dock = WinForms.DockStyle.Fill,
            Radius = 10,
            BackColor = LoaderlyTheme.Surface,
            BorderColor = LoaderlyTheme.Border,
            Padding = new WinForms.Padding(10),
            Margin = new WinForms.Padding(0, 14, 0, 0)
        };
        timeline.Dock = WinForms.DockStyle.Fill;
        timelinePanel.Controls.Add(timeline);
        area.Controls.Add(timelinePanel, 0, 1);

        var transport = new WinForms.TableLayoutPanel
        {
            Dock = WinForms.DockStyle.Fill,
            ColumnCount = 3,
            RowCount = 1,
            BackColor = LoaderlyTheme.Window,
            Margin = new WinForms.Padding(0, 10, 0, 0)
        };
        transport.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Absolute, 142));
        transport.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Percent, 100));
        transport.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Absolute, 126));
        area.Controls.Add(transport, 0, 2);

        ConfigureButton(playButton, "Play selection", primary: true);
        playButton.Dock = WinForms.DockStyle.Fill;
        playButton.Margin = new WinForms.Padding(0, 6, 12, 6);
        transport.Controls.Add(playButton, 0, 0);

        statusLabel.Dock = WinForms.DockStyle.Fill;
        statusLabel.Text = "Loading video...";
        statusLabel.TextAlign = ContentAlignment.MiddleLeft;
        statusLabel.Font = LoaderlyTheme.BodyFont(9F);
        statusLabel.ForeColor = LoaderlyTheme.MutedText;
        statusLabel.AutoEllipsis = true;
        statusLabel.Margin = new WinForms.Padding(4, StatusLabelVerticalMargin, 12, StatusLabelVerticalMargin);
        transport.Controls.Add(statusLabel, 1, 0);

        currentTimeLabel.Dock = WinForms.DockStyle.Fill;
        currentTimeLabel.TextAlign = ContentAlignment.MiddleRight;
        currentTimeLabel.Font = LoaderlyTheme.BodyFont(9F);
        currentTimeLabel.ForeColor = LoaderlyTheme.MutedText;
        currentTimeLabel.Margin = new WinForms.Padding(0, StatusLabelVerticalMargin, 0, StatusLabelVerticalMargin);
        transport.Controls.Add(currentTimeLabel, 2, 0);

        return area;
    }

    private WinForms.Control BuildTrimPanel()
    {
        var panel = new RoundedPanel
        {
            Dock = WinForms.DockStyle.Fill,
            Radius = 10,
            BackColor = LoaderlyTheme.Surface,
            BorderColor = LoaderlyTheme.Border,
            Padding = new WinForms.Padding(1)
        };

        var scrollHost = new ModernScrollPanel
        {
            Dock = WinForms.DockStyle.Fill,
            BackColor = LoaderlyTheme.Surface,
            Padding = new WinForms.Padding(17)
        };
        panel.Controls.Add(scrollHost);

        var layout = new WinForms.TableLayoutPanel
        {
            Dock = WinForms.DockStyle.Top,
            AutoSize = true,
            AutoSizeMode = WinForms.AutoSizeMode.GrowAndShrink,
            ColumnCount = 1,
            RowCount = TrimPanelLayout.RowHeights.Count,
            BackColor = LoaderlyTheme.Surface
        };
        foreach (var rowHeight in TrimPanelLayout.RowHeights)
        {
            layout.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Absolute, rowHeight));
        }

        scrollHost.Controls.Add(layout);

        layout.Controls.Add(new WinForms.Label
        {
            Text = "Clip",
            Dock = WinForms.DockStyle.Fill,
            TextAlign = ContentAlignment.MiddleLeft,
            Font = LoaderlyTheme.TitleFont(15F),
            ForeColor = LoaderlyTheme.Text
        }, 0, 0);

        layout.Controls.Add(BuildSelectionSummary(), 0, 1);

        ConfigureButton(setStartButton, "Set start", primary: false);
        ConfigureButton(setEndButton, "Set end", primary: false);
        AddActionButton(layout, setStartButton, 2);
        AddActionButton(layout, setEndButton, 3);

        layout.Controls.Add(BuildFrameStepRow(), 0, 4);
        layout.Controls.Add(BuildExportOptions(), 0, 5);
        layout.Controls.Add(BuildSubtitleOptions(), 0, 6);
        layout.Controls.Add(BuildShortcutList(), 0, 7);

        ConfigureButton(saveButton, "Save clip", primary: true);
        ConfigureButton(copyButton, "Copy clip", primary: false);
        ConfigureButton(resetButton, "Reset trim", primary: false);
        ConfigureButton(closeButton, "Close", primary: false);
        AddActionButton(layout, saveButton, 8);
        AddActionButton(layout, copyButton, 9);
        AddActionButton(layout, resetButton, 10);
        AddActionButton(layout, closeButton, 11);

        return panel;
    }

    private WinForms.Control BuildSubtitleOptions()
    {
        var panel = new RoundedPanel
        {
            Dock = WinForms.DockStyle.Fill,
            Radius = 10,
            BackColor = LoaderlyTheme.SurfaceMuted,
            BorderColor = LoaderlyTheme.Border,
            Padding = new WinForms.Padding(12, 8, 12, 8),
            Margin = new WinForms.Padding(0, 4, 0, 8)
        };

        var layout = new WinForms.TableLayoutPanel
        {
            Dock = WinForms.DockStyle.Fill,
            ColumnCount = 1,
            RowCount = 2,
            BackColor = LoaderlyTheme.SurfaceMuted
        };
        layout.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Absolute, 28));
        layout.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Percent, 100));
        panel.Controls.Add(layout);

        var header = new WinForms.TableLayoutPanel
        {
            Dock = WinForms.DockStyle.Fill,
            ColumnCount = 2,
            RowCount = 1,
            BackColor = LoaderlyTheme.SurfaceMuted
        };
        header.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Absolute, 76));
        header.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Percent, 100));
        layout.Controls.Add(header, 0, 0);

        header.Controls.Add(new WinForms.Label
        {
            Text = "Subtitles",
            Dock = WinForms.DockStyle.Fill,
            TextAlign = ContentAlignment.MiddleLeft,
            ForeColor = LoaderlyTheme.MutedText,
            Font = LoaderlyTheme.BodyFont(8.8F)
        }, 0, 0);

        subtitleStatusLabel.Dock = WinForms.DockStyle.Fill;
        subtitleStatusLabel.AutoEllipsis = true;
        subtitleStatusLabel.TextAlign = ContentAlignment.MiddleRight;
        subtitleStatusLabel.ForeColor = LoaderlyTheme.MutedText;
        subtitleStatusLabel.Font = LoaderlyTheme.BodyFont(8.4F);
        header.Controls.Add(subtitleStatusLabel, 1, 0);

        var actions = new WinForms.TableLayoutPanel
        {
            Dock = WinForms.DockStyle.Fill,
            ColumnCount = 3,
            RowCount = 2,
            BackColor = LoaderlyTheme.SurfaceMuted
        };
        actions.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Percent, 33.33F));
        actions.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Percent, 33.33F));
        actions.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Percent, 33.34F));
        actions.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Percent, 50));
        actions.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Percent, 50));
        layout.Controls.Add(actions, 0, 1);

        ConfigureButton(chooseSubtitleButton, "Choose", primary: false);
        ConfigureButton(editSubtitleButton, "Edit", primary: false);
        ConfigureButton(translateSubtitleButton, "Translate", primary: false);
        ConfigureButton(originalSubtitleButton, "Original", primary: false);
        ConfigureButton(removeSubtitleButton, "Remove", primary: false);
        ConfigureButton(toggleSubtitleButton, "Hide", primary: false);
        foreach (var button in new[] { chooseSubtitleButton, editSubtitleButton, translateSubtitleButton, originalSubtitleButton, removeSubtitleButton, toggleSubtitleButton })
        {
            button.Dock = WinForms.DockStyle.Fill;
            button.Margin = new WinForms.Padding(3, 3, 3, 3);
        }

        chooseSubtitleButton.Margin = new WinForms.Padding(0, 3, 3, 3);
        translateSubtitleButton.Margin = new WinForms.Padding(3, 3, 0, 3);
        originalSubtitleButton.Margin = new WinForms.Padding(0, 3, 3, 2);
        toggleSubtitleButton.Margin = new WinForms.Padding(3, 3, 0, 2);
        actions.Controls.Add(chooseSubtitleButton, 0, 0);
        actions.Controls.Add(editSubtitleButton, 1, 0);
        actions.Controls.Add(translateSubtitleButton, 2, 0);
        actions.Controls.Add(originalSubtitleButton, 0, 1);
        actions.Controls.Add(removeSubtitleButton, 1, 1);
        actions.Controls.Add(toggleSubtitleButton, 2, 1);
        UpdateSubtitleControls();

        return panel;
    }

    private WinForms.Control BuildFrameStepRow()
    {
        var row = new WinForms.TableLayoutPanel
        {
            Dock = WinForms.DockStyle.Fill,
            ColumnCount = 2,
            RowCount = 1,
            BackColor = LoaderlyTheme.Surface
        };
        row.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Percent, 50));
        row.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Percent, 50));
        ConfigureButton(frameBackButton, "- frame", primary: false);
        ConfigureButton(frameForwardButton, "+ frame", primary: false);
        frameBackButton.Dock = WinForms.DockStyle.Fill;
        frameForwardButton.Dock = WinForms.DockStyle.Fill;
        frameBackButton.Margin = new WinForms.Padding(0, 4, 5, 4);
        frameForwardButton.Margin = new WinForms.Padding(5, 4, 0, 4);
        row.Controls.Add(frameBackButton, 0, 0);
        row.Controls.Add(frameForwardButton, 1, 0);
        return row;
    }

    private WinForms.Control BuildExportOptions()
    {
        var panel = new RoundedPanel
        {
            Dock = WinForms.DockStyle.Fill,
            Radius = 10,
            BackColor = LoaderlyTheme.SurfaceMuted,
            BorderColor = LoaderlyTheme.Border,
            Padding = new WinForms.Padding(12, 8, 12, 8),
            Margin = new WinForms.Padding(0, 6, 0, 6)
        };

        var layout = new WinForms.TableLayoutPanel
        {
            Dock = WinForms.DockStyle.Fill,
            ColumnCount = 2,
            RowCount = 3,
            BackColor = LoaderlyTheme.SurfaceMuted
        };
        layout.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Percent, 45));
        layout.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Percent, 55));
        layout.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Percent, 33.33F));
        layout.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Percent, 33.33F));
        layout.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Percent, 33.34F));
        panel.Controls.Add(layout);

        layout.Controls.Add(new WinForms.Label
        {
            Text = "Export",
            Dock = WinForms.DockStyle.Fill,
            TextAlign = ContentAlignment.MiddleLeft,
            ForeColor = LoaderlyTheme.MutedText,
            Font = LoaderlyTheme.BodyFont(8.8F)
        }, 0, 0);

        var previousQuality = exportQualityComboBox.SelectedIndex;
        exportQualityComboBox.SetItems("High", "Balanced", "Small");
        exportQualityComboBox.SelectedIndex = previousQuality >= 0 ? previousQuality : 0;
        exportQualityComboBox.Dock = WinForms.DockStyle.Fill;
        exportQualityComboBox.FillColor = LoaderlyTheme.Surface;
        exportQualityComboBox.BorderColor = LoaderlyTheme.Border;
        exportQualityComboBox.ForeColor = LoaderlyTheme.Text;
        exportQualityComboBox.Font = LoaderlyTheme.BodyFont(8.8F);
        layout.Controls.Add(exportQualityComboBox, 1, 0);

        layout.Controls.Add(new WinForms.Label
        {
            Text = "Subtitle export",
            Dock = WinForms.DockStyle.Fill,
            TextAlign = ContentAlignment.MiddleLeft,
            ForeColor = LoaderlyTheme.MutedText,
            Font = LoaderlyTheme.BodyFont(8.8F)
        }, 0, 1);

        var previousSubtitleMode = subtitleExportComboBox.SelectedIndex;
        subtitleExportComboBox.SetItems("Burn in subtitles", "Sidecar SRT", "No subtitles");
        subtitleExportComboBox.SelectedIndex = previousSubtitleMode >= 0 ? previousSubtitleMode : 0;
        subtitleExportComboBox.Dock = WinForms.DockStyle.Fill;
        subtitleExportComboBox.FillColor = LoaderlyTheme.Surface;
        subtitleExportComboBox.BorderColor = LoaderlyTheme.Border;
        subtitleExportComboBox.ForeColor = LoaderlyTheme.Text;
        subtitleExportComboBox.Font = LoaderlyTheme.BodyFont(8.8F);
        layout.Controls.Add(subtitleExportComboBox, 1, 1);

        muteCheckBox.Text = "Mute audio";
        muteCheckBox.Dock = WinForms.DockStyle.Fill;
        muteCheckBox.BackColor = LoaderlyTheme.SurfaceMuted;
        muteCheckBox.ForeColor = LoaderlyTheme.Text;
        muteCheckBox.FlatStyle = WinForms.FlatStyle.Flat;
        muteCheckBox.Font = LoaderlyTheme.BodyFont(8.8F);
        layout.Controls.Add(muteCheckBox, 0, 2);
        layout.SetColumnSpan(muteCheckBox, 2);

        return panel;
    }

    private WinForms.Control BuildShortcutList()
    {
        var panel = new RoundedPanel
        {
            Dock = WinForms.DockStyle.Fill,
            Radius = 10,
            BackColor = LoaderlyTheme.SurfaceMuted,
            BorderColor = LoaderlyTheme.Border,
            Padding = new WinForms.Padding(12, 8, 12, 8),
            Margin = new WinForms.Padding(0, 4, 0, 8)
        };

        panel.Controls.Add(new WinForms.Label
        {
            Dock = WinForms.DockStyle.Fill,
            Text = ShortcutHelpText(),
            TextAlign = LoaderlyLanguage.IsArabic ? ContentAlignment.MiddleRight : ContentAlignment.MiddleLeft,
            ForeColor = LoaderlyTheme.MutedText,
            Font = LoaderlyTheme.BodyFont(8.4F),
            AutoEllipsis = true
        });

        return panel;
    }

    private string ShortcutHelpText()
    {
        return LoaderlyLanguage.IsArabic
            ? $"الاختصارات\r\nSpace تشغيل/إيقاف    الأسهم 1ث    Shift+الأسهم 5ث\r\nCtrl+Shift+الأسهم إطار    تراجع {settings.TrimUndoShortcut}\r\nحفظ {settings.TrimSaveShortcut}    ضبط {settings.TrimResetShortcut}    M كتم"
            : $"Shortcuts\r\nSpace play/pause    Arrows 1s    Shift+arrows 5s\r\nCtrl+Shift+arrows frame    Undo {settings.TrimUndoShortcut}\r\nSave {settings.TrimSaveShortcut}    Reset {settings.TrimResetShortcut}    M mute";
    }

    private WinForms.Control BuildSelectionSummary()
    {
        var summary = new RoundedPanel
        {
            Dock = WinForms.DockStyle.Fill,
            Radius = 10,
            BackColor = LoaderlyTheme.SurfaceMuted,
            BorderColor = LoaderlyTheme.Border,
            Padding = new WinForms.Padding(14, 10, 14, 10),
            Margin = new WinForms.Padding(0, 0, 0, 12)
        };

        var layout = new WinForms.TableLayoutPanel
        {
            Dock = WinForms.DockStyle.Fill,
            ColumnCount = 2,
            RowCount = 4,
            BackColor = LoaderlyTheme.SurfaceMuted
        };
        layout.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Percent, 50));
        layout.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Percent, 50));
        layout.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Absolute, 22));
        layout.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Absolute, 32));
        layout.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Absolute, 22));
        layout.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Absolute, 32));
        summary.Controls.Add(layout);

        layout.Controls.Add(StatLabel("Start", alignRight: false), 0, 0);
        layout.Controls.Add(StatLabel("End", alignRight: true), 1, 0);
        ConfigureStatValue(startValueLabel, alignRight: false);
        ConfigureStatValue(endValueLabel, alignRight: true);
        layout.Controls.Add(startValueLabel, 0, 1);
        layout.Controls.Add(endValueLabel, 1, 1);

        layout.Controls.Add(StatLabel("Selected", alignRight: false), 0, 2);
        layout.Controls.Add(StatLabel("Total", alignRight: true), 1, 2);
        ConfigureStatValue(selectionValueLabel, alignRight: false);
        ConfigureStatValue(durationValueLabel, alignRight: true);
        layout.Controls.Add(selectionValueLabel, 0, 3);
        layout.Controls.Add(durationValueLabel, 1, 3);

        return summary;
    }

    private static WinForms.Label StatLabel(string text, bool alignRight)
    {
        return new WinForms.Label
        {
            Text = text,
            Dock = WinForms.DockStyle.Fill,
            TextAlign = alignRight ? ContentAlignment.BottomRight : ContentAlignment.BottomLeft,
            Font = LoaderlyTheme.BodyFont(8.8F),
            ForeColor = LoaderlyTheme.MutedText
        };
    }

    private static void ConfigureStatValue(WinForms.Label label, bool alignRight)
    {
        label.Dock = WinForms.DockStyle.Fill;
        label.TextAlign = alignRight ? ContentAlignment.TopRight : ContentAlignment.TopLeft;
        label.Font = LoaderlyTheme.TitleFont(13F);
        label.ForeColor = LoaderlyTheme.Text;
    }

    private static void AddActionButton(WinForms.TableLayoutPanel parent, ModernButton button, int row)
    {
        button.Dock = WinForms.DockStyle.Fill;
        button.Margin = new WinForms.Padding(0, 5, 0, 5);
        parent.Controls.Add(button, 0, row);
    }

    private static void ConfigureButton(ModernButton button, string text, bool primary)
    {
        button.Text = LoaderlyLanguage.Text(text);
        button.Radius = 8;
        button.FillColor = primary ? LoaderlyTheme.Accent : LoaderlyTheme.SurfaceMuted;
        button.HoverColor = primary ? LoaderlyTheme.AccentHover : Color.Empty;
        button.PressedColor = primary ? LoaderlyTheme.AccentPressed : Color.Empty;
        button.ForeColor = primary ? Color.White : LoaderlyTheme.Text;
        button.Font = LoaderlyTheme.BodyFont(9.5F);
    }

    private void ConfigureVideoSurface()
    {
        videoSurface.Children.Clear();
        videoSurface.Background = WpfMedia.Brushes.Black;

        player.Stretch = WpfMedia.Stretch.Uniform;
        WpfControls.Panel.SetZIndex(player, 0);
        videoSurface.Children.Add(player);

        subtitleTextBlock.Text = string.Empty;
        subtitleTextBlock.Foreground = WpfMedia.Brushes.White;
        subtitleTextBlock.FontSize = 24;
        subtitleTextBlock.FontWeight = Wpf.FontWeights.SemiBold;
        subtitleTextBlock.TextAlignment = Wpf.TextAlignment.Center;
        subtitleTextBlock.TextWrapping = Wpf.TextWrapping.Wrap;
        subtitleTextBlock.LineHeight = 31;
        subtitleTextBlock.MaxWidth = 980;

        subtitleOverlay.Child = subtitleTextBlock;
        subtitleOverlay.Background = new WpfMedia.SolidColorBrush(WpfMedia.Color.FromArgb(178, 0, 0, 0));
        subtitleOverlay.CornerRadius = new Wpf.CornerRadius(7);
        subtitleOverlay.Padding = new Wpf.Thickness(14, 7, 14, 8);
        subtitleOverlay.Margin = new Wpf.Thickness(24, 0, 24, 24);
        subtitleOverlay.HorizontalAlignment = Wpf.HorizontalAlignment.Center;
        subtitleOverlay.VerticalAlignment = Wpf.VerticalAlignment.Bottom;
        subtitleOverlay.Visibility = Wpf.Visibility.Collapsed;
        WpfControls.Panel.SetZIndex(subtitleOverlay, 1);
        videoSurface.Children.Add(subtitleOverlay);
        ApplySubtitleStyle();

        videoHost.Child = videoSurface;
    }

    private void BindEvents()
    {
        player.MediaOpened += (_, _) =>
        {
            if (RestorePreviewAfterSubtitleEditorMediaOpened())
            {
                return;
            }

            InitializeDuration();
        };
        player.MediaFailed += (_, args) => SetStatus(args.ErrorException?.Message ?? "Could not load video preview.");
        player.MediaEnded += (_, _) => StopPlayback();
        playbackTimer.Interval = 80;
        playbackTimer.Tick += (_, _) => UpdatePlaybackPosition();

        timeline.InteractionStarted += (_, _) =>
        {
            isTimelineInteracting = true;
            interactionStartSnapshot = CaptureSnapshot();
            resumeAfterTimelineInteraction = playbackTimer.Enabled;
            if (resumeAfterTimelineInteraction)
            {
                PausePreviewForRangeEdit();
            }
        };
        timeline.InteractionCompleted += (_, _) =>
        {
            RegisterTimelineInteractionUndo();
            isTimelineInteracting = false;
            SaveTrimState();
            if (!resumeAfterTimelineInteraction || exportCancellation is not null)
            {
                resumeAfterTimelineInteraction = false;
                return;
            }

            resumeAfterTimelineInteraction = false;
            ResumePreviewAfterRangeEdit();
        };
        timeline.RangeChanged += (_, _) => UpdateSelectionFromTimeline();
        timeline.PositionChanged += (_, _) =>
        {
            if (!updatingControls)
            {
                SeekTo(TimeSpan.FromSeconds(timeline.PositionValue / (double)TimeScale));
            }
        };

        playButton.Click += (_, _) => TogglePlayback();
        setStartButton.Click += (_, _) => SetStartAtPlayhead();
        setEndButton.Click += (_, _) => SetEndAtPlayhead();
        frameBackButton.Click += (_, _) => StepFrame(-1);
        frameForwardButton.Click += (_, _) => StepFrame(1);
        saveButton.Click += async (_, _) => await ExportAsync(copyToClipboard: false);
        copyButton.Click += async (_, _) => await ExportAsync(copyToClipboard: true);
        resetButton.Click += (_, _) => ResetTrim();
        chooseSubtitleButton.Click += (_, _) => ChooseSubtitleFile();
        editSubtitleButton.Click += async (_, _) => await EditSubtitlesAsync();
        translateSubtitleButton.Click += async (_, _) => await TranslateSubtitlesAsync();
        originalSubtitleButton.Click += (_, _) => RestoreOriginalSubtitles();
        removeSubtitleButton.Click += (_, _) => RemoveSubtitles();
        toggleSubtitleButton.Click += (_, _) => ToggleSubtitles();
        closeButton.Click += (_, _) =>
        {
            if (exportCancellation is not null)
            {
                exportCancellation.Cancel();
                SetStatus("Canceling export...");
                return;
            }

            Close();
        };
    }

    private void InitializeDuration()
    {
        if (!player.NaturalDuration.HasTimeSpan)
        {
            SetStatus("Could not read video duration.");
            return;
        }

        duration = player.NaturalDuration.TimeSpan;
        var maximum = Math.Max(MinimumTrimUnits, (int)Math.Ceiling(duration.TotalSeconds * TimeScale));
        var saved = LoadSavedTrim(maximum);

        updatingControls = true;
        timeline.Maximum = maximum;
        timeline.MinimumRange = MinimumTrimUnits;
        timeline.SetRange(saved.Start, saved.End);
        timeline.PositionValue = saved.Position;
        updatingControls = false;

        player.Pause();
        SeekTo(TimeSpan.FromSeconds(saved.Position / (double)TimeScale));
        LoadSubtitles();
        RefreshTimeLabels();
        SetStatus(ReadyStatus(saved.Restored ? "Last trim restored." : "Ready."));
        _ = LoadTimelineThumbnailsAsync();
    }

    private void LoadSubtitles(string? preferredPath = null)
    {
        try
        {
            subtitleFilePath = preferredPath;
            subtitleFilePath ??= SrtSubtitleService.FindSubtitleFile(sourceFilePath, settings.SubtitleLanguages);
            subtitleCues = subtitleFilePath is null ? [] : SrtSubtitleService.LoadFile(subtitleFilePath);
            TrackOriginalSubtitleFile(subtitleFilePath);
        }
        catch
        {
            subtitleCues = [];
            subtitleFilePath = null;
        }

        UpdateSubtitleControls();
        UpdateSubtitleOverlay(player.Position);
    }

    private void ChooseSubtitleFile()
    {
        using var dialog = new WinForms.OpenFileDialog
        {
            Title = "Choose subtitles",
            Filter = "Subtitle files (*.srt;*.vtt)|*.srt;*.vtt|SRT subtitles (*.srt)|*.srt|WebVTT subtitles (*.vtt)|*.vtt|All files (*.*)|*.*",
            InitialDirectory = Directory.Exists(Path.GetDirectoryName(sourceFilePath))
                ? Path.GetDirectoryName(sourceFilePath)
                : Environment.GetFolderPath(Environment.SpecialFolder.MyVideos),
            CheckFileExists = true,
            Multiselect = false
        };

        if (dialog.ShowDialog(this) != WinForms.DialogResult.OK)
        {
            return;
        }

        subtitlesVisible = true;
        LoadSubtitles(dialog.FileName);
        SetStatus(ReadyStatus("Ready."));
    }

    private async Task EditSubtitlesAsync()
    {
        var path = EnsureEditableSubtitleFile();
        var restorePosition = player.Position;
        var restorePlayback = playbackTimer.Enabled;
        var dialogResult = WinForms.DialogResult.Cancel;
        SubtitleStyle? updatedStyle = null;
        string? failureStatus = null;

        ReleasePreviewForSubtitleEditor();
        editSubtitleButton.Enabled = false;
        try
        {
            await Task.Yield();
            using var editor = new SubtitleEditorForm(path, sourceFilePath, settings.SubtitleStyle, StartTime, EndTime);
            ApplyChildWindowState(editor);
            dialogResult = editor.ShowDialog(this);
            if (dialogResult == WinForms.DialogResult.OK)
            {
                updatedStyle = editor.SubtitleStyle.Clone();
            }
        }
        catch (Exception ex)
        {
            failureStatus = ex.Message;
        }
        finally
        {
            editSubtitleButton.Enabled = true;
            RestorePreviewAfterSubtitleEditor(restorePosition, restorePlayback);
        }

        if (!string.IsNullOrWhiteSpace(failureStatus))
        {
            SetStatus(failureStatus);
            return;
        }

        if (dialogResult != WinForms.DialogResult.OK || updatedStyle is null)
        {
            SetStatus(ReadyStatus("Ready."));
            return;
        }

        settings.SubtitleStyle = updatedStyle;
        AppSettingsStore.NormalizeForRuntime(settings);
        saveSettings?.Invoke();
        ApplySubtitleStyle();
        subtitlesVisible = true;
        LoadSubtitles(path);
        SetStatus(ReadyStatus("Subtitles saved."));
    }

    private async Task TranslateSubtitlesAsync()
    {
        if (string.IsNullOrWhiteSpace(subtitleFilePath) || !File.Exists(subtitleFilePath) || subtitleCues.Count == 0)
        {
            SetStatus("Choose subtitles first.");
            return;
        }

        AppSettingsStore.NormalizeForRuntime(settings);
        if (IsCurrentSubtitleTargetTranslation())
        {
            SetStatus(ReadyStatus("Already translated."));
            UpdateSubtitleControls();
            return;
        }

        if (ExistingTranslatedSubtitlePathForCurrentSelection() is { } existingTranslatedPath)
        {
            subtitlesVisible = true;
            LoadSubtitles(existingTranslatedPath);
            SetStatus(ReadyStatus($"Loaded saved {TargetTranslationLanguage()} translation."));
            return;
        }

        if (string.IsNullOrWhiteSpace(settings.OpenRouterApiKey) || string.IsNullOrWhiteSpace(settings.OpenRouterModel))
        {
            WinForms.MessageBox.Show(
                this,
                "Add your OpenRouter API key and model in Settings first.",
                "AI subtitles",
                WinForms.MessageBoxButtons.OK,
                WinForms.MessageBoxIcon.Information);
            SetStatus("OpenRouter settings needed.");
            return;
        }

        subtitleTranslationCancellation?.Cancel();
        subtitleTranslationCancellation?.Dispose();
        subtitleTranslationCancellation = new CancellationTokenSource();
        var tokenSource = subtitleTranslationCancellation;
        var token = tokenSource.Token;
        SetSubtitleTranslating(true);

        try
        {
            var translateOnlySelection = ShouldTranslateOnlyCurrentSelection();
            var cuesToTranslate = translateOnlySelection
                ? SrtSubtitleService.CuesForRange(subtitleCues, StartTime, EndTime)
                : subtitleCues;
            if (cuesToTranslate.Count == 0)
            {
                SetStatus("No subtitles inside selected clip.");
                return;
            }

            var translator = new OpenRouterSubtitleTranslator();
            var translatedCues = await translator.TranslateAsync(
                cuesToTranslate,
                settings.OpenRouterApiKey,
                settings.OpenRouterModel,
                settings.AiSubtitleTargetLanguage,
                new Progress<string>(SetStatus),
                token);

            var translatedPath = translateOnlySelection
                ? TranslatedSubtitlePathFor(subtitleFilePath, settings.AiSubtitleTargetLanguage, StartTime, EndTime)
                : TranslatedSubtitlePathFor(subtitleFilePath, settings.AiSubtitleTargetLanguage);
            await File.WriteAllTextAsync(translatedPath, SrtSubtitleService.FormatForPath(translatedCues, translatedPath), Encoding.UTF8, token);
            subtitlesVisible = true;
            LoadSubtitles(translatedPath);
            SetStatus(ReadyStatus($"Translated to {settings.AiSubtitleTargetLanguage}."));
        }
        catch (OperationCanceledException)
        {
            SetStatus("Subtitle translation canceled.");
        }
        catch (Exception ex)
        {
            SetStatus(ex.Message);
        }
        finally
        {
            if (ReferenceEquals(subtitleTranslationCancellation, tokenSource))
            {
                subtitleTranslationCancellation.Dispose();
                subtitleTranslationCancellation = null;
            }

            SetSubtitleTranslating(false);
        }
    }

    private void ApplyChildWindowState(WinForms.Form child)
    {
        child.WindowState = ChildWindowStateForParent(WindowState);
    }

    private static WinForms.FormWindowState ChildWindowStateForParent(WinForms.FormWindowState parentWindowState)
    {
        return parentWindowState == WinForms.FormWindowState.Maximized
            ? WinForms.FormWindowState.Maximized
            : WinForms.FormWindowState.Normal;
    }

    internal static bool IsTargetAiSubtitlePathForTest(string subtitlePath, string targetLanguage)
    {
        return IsTargetAiSubtitlePath(subtitlePath, targetLanguage);
    }

    internal static string? OriginalSubtitlePathFromTranslationForTest(string subtitlePath)
    {
        return OriginalSubtitlePathFromTranslation(subtitlePath);
    }

    internal static (string Text, bool Enabled) TranslateButtonStateForTest(
        bool hasSubtitles,
        bool loadedTranslation,
        bool savedTranslationExists)
    {
        return TranslateButtonState(hasSubtitles, loadedTranslation, savedTranslationExists);
    }

    private bool IsCurrentSubtitleTargetTranslation()
    {
        return !string.IsNullOrWhiteSpace(subtitleFilePath) &&
            IsTargetAiSubtitlePath(subtitleFilePath, TargetTranslationLanguage());
    }

    private string? ExistingTranslatedSubtitlePathForCurrentSelection()
    {
        if (string.IsNullOrWhiteSpace(subtitleFilePath) ||
            !File.Exists(subtitleFilePath) ||
            IsCurrentSubtitleTargetTranslation())
        {
            return null;
        }

        var translateOnlySelection = ShouldTranslateOnlyCurrentSelection();
        var translatedPath = translateOnlySelection
            ? TranslatedSubtitlePathFor(subtitleFilePath, TargetTranslationLanguage(), StartTime, EndTime)
            : TranslatedSubtitlePathFor(subtitleFilePath, TargetTranslationLanguage());
        return File.Exists(translatedPath) ? translatedPath : null;
    }

    private string TargetTranslationLanguage()
    {
        return string.IsNullOrWhiteSpace(settings.AiSubtitleTargetLanguage)
            ? "Arabic"
            : settings.AiSubtitleTargetLanguage.Trim();
    }

    private static bool IsTargetAiSubtitlePath(string subtitlePath, string targetLanguage)
    {
        if (string.IsNullOrWhiteSpace(subtitlePath) || string.IsNullOrWhiteSpace(targetLanguage))
        {
            return false;
        }

        var safeLanguage = SafeFileNamePart(targetLanguage);
        var name = Path.GetFileNameWithoutExtension(subtitlePath);
        return name.EndsWith($".ai-{safeLanguage}", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsAiSubtitlePath(string subtitlePath)
    {
        return Path.GetFileNameWithoutExtension(subtitlePath)
            .Contains(".ai-", StringComparison.OrdinalIgnoreCase);
    }

    private static string? OriginalSubtitlePathFromTranslation(string subtitlePath)
    {
        if (string.IsNullOrWhiteSpace(subtitlePath))
        {
            return null;
        }

        var directory = Path.GetDirectoryName(subtitlePath);
        var extension = Path.GetExtension(subtitlePath);
        var name = Path.GetFileNameWithoutExtension(subtitlePath);
        var aiIndex = name.LastIndexOf(".ai-", StringComparison.OrdinalIgnoreCase);
        if (aiIndex <= 0)
        {
            return null;
        }

        name = name[..aiIndex];
        var clipIndex = name.LastIndexOf(".clip-", StringComparison.OrdinalIgnoreCase);
        if (clipIndex > 0)
        {
            name = name[..clipIndex];
        }

        return string.IsNullOrWhiteSpace(directory)
            ? $"{name}{extension}"
            : Path.Combine(directory, $"{name}{extension}");
    }

    private static (string Text, bool Enabled) TranslateButtonState(
        bool hasSubtitles,
        bool loadedTranslation,
        bool savedTranslationExists)
    {
        if (!hasSubtitles)
        {
            return ("Translate", false);
        }

        if (loadedTranslation)
        {
            return ("Translated", false);
        }

        return savedTranslationExists
            ? ("Use saved", true)
            : ("Translate", true);
    }

    private bool ShouldTranslateOnlyCurrentSelection()
    {
        if (duration <= TimeSpan.Zero)
        {
            return false;
        }

        var tolerance = TimeSpan.FromMilliseconds(250);
        return StartTime > tolerance || EndTime < duration - tolerance;
    }

    private string EnsureEditableSubtitleFile()
    {
        if (!string.IsNullOrWhiteSpace(subtitleFilePath) && File.Exists(subtitleFilePath))
        {
            return subtitleFilePath;
        }

        var directory = Path.GetDirectoryName(sourceFilePath);
        if (string.IsNullOrWhiteSpace(directory) || !Directory.Exists(directory))
        {
            directory = Environment.GetFolderPath(Environment.SpecialFolder.MyVideos);
        }

        var path = Path.Combine(directory, $"{Path.GetFileNameWithoutExtension(sourceFilePath)}.srt");
        if (!File.Exists(path))
        {
            File.WriteAllText(path, string.Empty);
        }

        subtitleFilePath = path;
        TrackOriginalSubtitleFile(path);
        return path;
    }

    private static string TranslatedSubtitlePathFor(string subtitlePath, string targetLanguage)
    {
        return TranslatedSubtitlePathFor(subtitlePath, targetLanguage, null, null);
    }

    private static string TranslatedSubtitlePathFor(
        string subtitlePath,
        string targetLanguage,
        TimeSpan? clipStart,
        TimeSpan? clipEnd)
    {
        var directory = Path.GetDirectoryName(subtitlePath);
        if (string.IsNullOrWhiteSpace(directory))
        {
            directory = Environment.GetFolderPath(Environment.SpecialFolder.MyVideos);
        }

        var safeLanguage = SafeFileNamePart(targetLanguage);
        var baseName = Path.GetFileNameWithoutExtension(subtitlePath);
        var clipPart = clipStart.HasValue && clipEnd.HasValue
            ? $".clip-{SafeTimePart(clipStart.Value)}-{SafeTimePart(clipEnd.Value)}"
            : string.Empty;
        return Path.Combine(directory, $"{baseName}{clipPart}.ai-{safeLanguage}.srt");
    }

    private static string SafeFileNamePart(string value)
    {
        var invalid = Path.GetInvalidFileNameChars().ToHashSet();
        var builder = new StringBuilder(value.Length);
        foreach (var character in value.Trim().ToLowerInvariant())
        {
            builder.Append(invalid.Contains(character) || char.IsWhiteSpace(character) ? '-' : character);
        }

        var result = builder.ToString().Trim('-');
        return result.Length == 0 ? "translated" : result;
    }

    private static string SafeTimePart(TimeSpan value)
    {
        var totalSeconds = Math.Max(0, (int)Math.Round(value.TotalSeconds));
        return $"{totalSeconds / 3600:00}{totalSeconds / 60 % 60:00}{totalSeconds % 60:00}";
    }

    private void TrackOriginalSubtitleFile(string? path)
    {
        if (!string.IsNullOrWhiteSpace(path) && !IsAiSubtitlePath(path))
        {
            originalSubtitleFilePath = path;
        }
    }

    private string? FindOriginalSubtitleFile()
    {
        if (!string.IsNullOrWhiteSpace(originalSubtitleFilePath) && File.Exists(originalSubtitleFilePath))
        {
            return originalSubtitleFilePath;
        }

        if (!string.IsNullOrWhiteSpace(subtitleFilePath) &&
            OriginalSubtitlePathFromTranslation(subtitleFilePath) is { } fromTranslation &&
            File.Exists(fromTranslation))
        {
            return fromTranslation;
        }

        var discovered = SrtSubtitleService.FindSubtitleFile(sourceFilePath, settings.SubtitleLanguages);
        return !string.IsNullOrWhiteSpace(discovered) && !IsAiSubtitlePath(discovered)
            ? discovered
            : null;
    }

    private bool CanRestoreOriginalSubtitle()
    {
        return FindOriginalSubtitleFile() is { } originalPath &&
            (string.IsNullOrWhiteSpace(subtitleFilePath) || !SamePath(originalPath, subtitleFilePath));
    }

    private static bool SamePath(string first, string second)
    {
        try
        {
            first = Path.GetFullPath(first);
            second = Path.GetFullPath(second);
        }
        catch
        {
        }

        return string.Equals(first, second, StringComparison.OrdinalIgnoreCase);
    }

    private void RestoreOriginalSubtitles()
    {
        var originalPath = FindOriginalSubtitleFile();
        if (string.IsNullOrWhiteSpace(originalPath) || !File.Exists(originalPath))
        {
            SetStatus("No original subtitles found.");
            return;
        }

        subtitlesVisible = true;
        LoadSubtitles(originalPath);
        SetStatus(ReadyStatus("Original subtitles restored."));
    }

    private void RemoveSubtitles()
    {
        subtitleFilePath = null;
        subtitleCues = [];
        subtitlesVisible = false;
        UpdateSubtitleControls();
        UpdateSubtitleOverlay(player.Position);
        SetStatus("Subtitles removed.");
    }

    private void ToggleSubtitles()
    {
        subtitlesVisible = !subtitlesVisible;
        UpdateSubtitleControls();
        UpdateSubtitleOverlay(player.Position);
        SetStatus(subtitlesVisible ? ReadyStatus("Ready.") : "Subtitles hidden.");
    }

    private (int Start, int End, int Position, bool Restored) LoadSavedTrim(int maximum)
    {
        var fallback = (Start: 0, End: maximum, Position: 0, Restored: false);
        var saved = trimStateStore.Load(sourceFilePath);
        if (saved is null)
        {
            return fallback;
        }

        var start = SecondsToUnits(saved.StartSeconds, maximum);
        var end = SecondsToUnits(saved.EndSeconds, maximum);
        if (end - start < MinimumTrimUnits)
        {
            return fallback;
        }

        var position = Math.Clamp(SecondsToUnits(saved.PositionSeconds, maximum), start, end);
        return (start, end, position, true);
    }

    private async Task LoadTimelineThumbnailsAsync()
    {
        timelineThumbnailCancellation?.Cancel();
        timelineThumbnailCancellation?.Dispose();
        timelineThumbnailCancellation = new CancellationTokenSource();
        var token = timelineThumbnailCancellation.Token;

        try
        {
            await Task.Delay(TimelineThumbnailDelayMilliseconds, token);
            if (token.IsCancellationRequested || IsDisposed)
            {
                return;
            }

            SetStatus("Building timeline...");
            var count = TimelineThumbnailPlan.CountForWidth(timeline.Width);
            var images = await timelineThumbnailService.GenerateAsync(sourceFilePath, duration, count, token);
            if (token.IsCancellationRequested || IsDisposed)
            {
                foreach (var image in images)
                {
                    image.Dispose();
                }

                return;
            }

            timeline.SetThumbnailImages(images);
            SetStatus(ReadyStatus("Ready."));
        }
        catch (OperationCanceledException)
        {
        }
        catch
        {
            SetStatus(ReadyStatus("Ready."));
        }
    }

    private void UpdateSelectionFromTimeline()
    {
        if (updatingControls)
        {
            return;
        }

        if (timeline.PositionValue < timeline.StartValue || timeline.PositionValue > timeline.EndValue)
        {
            SeekTo(StartTime);
        }

        RefreshTimeLabels();
        if (!isTimelineInteracting)
        {
            SaveTrimState();
        }
    }

    private void SetStartAtPlayhead()
    {
        var wasPlaying = playbackTimer.Enabled;
        if (wasPlaying)
        {
            PausePreviewForRangeEdit();
        }

        var current = CurrentUnits();
        var end = timeline.EndValue;
        if (end - current < MinimumTrimUnits)
        {
            end = Math.Min(timeline.Maximum, current + MinimumTrimUnits);
            current = Math.Max(0, end - MinimumTrimUnits);
        }

        PushUndoSnapshot(CaptureSnapshot());
        updatingControls = true;
        timeline.SetRange(current, end);
        timeline.PositionValue = current;
        updatingControls = false;
        SeekTo(StartTime);
        RefreshTimeLabels();
        SaveTrimState();
        if (wasPlaying)
        {
            ResumePreviewAfterRangeEdit();
        }
    }

    private void SetEndAtPlayhead()
    {
        var wasPlaying = playbackTimer.Enabled;
        if (wasPlaying)
        {
            PausePreviewForRangeEdit();
        }

        var current = CurrentUnits();
        var start = timeline.StartValue;
        if (current - start < MinimumTrimUnits)
        {
            start = Math.Max(0, current - MinimumTrimUnits);
            current = Math.Min(timeline.Maximum, start + MinimumTrimUnits);
        }

        PushUndoSnapshot(CaptureSnapshot());
        updatingControls = true;
        timeline.SetRange(start, current);
        timeline.PositionValue = current;
        updatingControls = false;
        SeekTo(EndTime);
        RefreshTimeLabels();
        SaveTrimState();
        if (wasPlaying)
        {
            ResumePreviewAfterRangeEdit();
        }
    }

    private void TogglePlayback()
    {
        if (playbackTimer.Enabled)
        {
            StopPlayback();
            return;
        }

        var resumePosition = player.Position;
        if (resumePosition < StartTime || resumePosition >= EndTime)
        {
            resumePosition = StartTime;
        }

        player.Position = resumePosition;
        player.Play();
        playbackTimer.Start();
        playButton.Text = LoaderlyLanguage.Text("Pause");
        SetStatus("Playing selection.");
    }

    private void StopPlayback()
    {
        player.Pause();
        playbackTimer.Stop();
        playButton.Text = player.Position > StartTime && player.Position < EndTime
            ? "Resume"
            : "Play selection";
        RefreshTimeLabels();
        SaveTrimState();
    }

    private void UpdatePlaybackPosition()
    {
        if (player.Position >= EndTime)
        {
            StopPlayback();
            SeekTo(EndTime);
            return;
        }

        updatingControls = true;
        timeline.PositionValue = Math.Clamp(CurrentUnits(), 0, timeline.Maximum);
        updatingControls = false;
        RefreshTimeLabels();
    }

    private void SeekTo(TimeSpan position)
    {
        var bounded = position < TimeSpan.Zero
            ? TimeSpan.Zero
            : position > duration
                ? duration
                : position;
        player.Position = bounded;

        updatingControls = true;
        timeline.PositionValue = Math.Clamp((int)Math.Round(bounded.TotalSeconds * TimeScale), 0, timeline.Maximum);
        updatingControls = false;
        RefreshTimeLabels();
    }

    private async Task ExportAsync(bool copyToClipboard)
    {
        if (duration <= TimeSpan.Zero)
        {
            SetStatus("Video is not ready yet.");
            return;
        }

        var copiedClip = false;
        PausePreviewForExport();
        exportCancellation = new CancellationTokenSource();
        SetExporting(true);

        try
        {
            var outputPath = copyToClipboard
                ? trimService.TemporaryPathForCopy()
                : trimService.SavePathFor(sourceFilePath, StartTime, EndTime);

            var exportedPath = await trimService.ExportTrimAsync(
                sourceFilePath,
                StartTime,
                EndTime,
                outputPath,
                CurrentExportOptions(),
                exportCancellation.Token);
            var sidecarPath = WriteSidecarSubtitlesIfNeeded(exportedPath);

            if (copyToClipboard)
            {
                CopyFilesToClipboard(sidecarPath is null ? [exportedPath] : [exportedPath, sidecarPath]);
                copiedClip = true;
                SetStatus("Clip exported and copied.");
            }
            else
            {
                LastSavedFilePath = exportedPath;
                SetStatus(sidecarPath is null ? $"Clip saved: {exportedPath}" : $"Clip saved with subtitles: {exportedPath}");
            }
        }
        catch (OperationCanceledException)
        {
            SetStatus("Clip export canceled.");
        }
        catch (Exception ex)
        {
            SetStatus(ex.Message);
        }
        finally
        {
            exportCancellation.Dispose();
            exportCancellation = null;
            SetExporting(false);
            if (copiedClip)
            {
                ShowCopiedFeedback();
            }
        }
    }

    private static void CopyFileToClipboard(string filePath)
    {
        CopyFilesToClipboard([filePath]);
    }

    private static void CopyFilesToClipboard(IEnumerable<string> filePaths)
    {
        var collection = new StringCollection();
        foreach (var filePath in filePaths.Where(File.Exists))
        {
            collection.Add(filePath);
        }

        WinForms.Clipboard.SetFileDropList(collection);
    }

    private void SetExporting(bool isExporting)
    {
        saveButton.Enabled = !isExporting;
        copyButton.Enabled = !isExporting;
        closeButton.Enabled = true;
        closeButton.Text = LoaderlyLanguage.Text(isExporting ? "Cancel" : "Close");
        playButton.Enabled = !isExporting;
        setStartButton.Enabled = !isExporting;
        setEndButton.Enabled = !isExporting;
        frameBackButton.Enabled = !isExporting;
        frameForwardButton.Enabled = !isExporting;
        resetButton.Enabled = !isExporting;
        exportQualityComboBox.Enabled = !isExporting;
        subtitleExportComboBox.Enabled = !isExporting;
        muteCheckBox.Enabled = !isExporting;
        chooseSubtitleButton.Enabled = !isExporting;
        editSubtitleButton.Enabled = !isExporting;
        translateSubtitleButton.Enabled = !isExporting;
        originalSubtitleButton.Enabled = !isExporting && CanRestoreOriginalSubtitle();
        removeSubtitleButton.Enabled = !isExporting && subtitleCues.Count > 0;
        toggleSubtitleButton.Enabled = !isExporting && subtitleCues.Count > 0;
        timeline.Enabled = !isExporting;
        if (isExporting)
        {
            SetStatus("Exporting clip...");
        }
    }

    private void SetSubtitleTranslating(bool isTranslating)
    {
        chooseSubtitleButton.Enabled = !isTranslating;
        editSubtitleButton.Enabled = !isTranslating;
        translateSubtitleButton.Enabled = !isTranslating;
        originalSubtitleButton.Enabled = !isTranslating && CanRestoreOriginalSubtitle();
        removeSubtitleButton.Enabled = !isTranslating && subtitleCues.Count > 0;
        toggleSubtitleButton.Enabled = !isTranslating && subtitleCues.Count > 0;
        translateSubtitleButton.Text = LoaderlyLanguage.Text(isTranslating ? "Working" : "Translate");
        if (!isTranslating)
        {
            UpdateSubtitleControls();
        }
    }

    private void PausePreviewForExport()
    {
        player.Pause();
        playbackTimer.Stop();
        playButton.Text = player.Position > StartTime && player.Position < EndTime
            ? "Resume"
            : "Play selection";
        RefreshTimeLabels();
    }

    private void PausePreviewForRangeEdit()
    {
        player.Pause();
        playbackTimer.Stop();
        playButton.Text = LoaderlyLanguage.Text("Resume");
        SetStatus("Adjusting clip...");
        RefreshTimeLabels();
    }

    private void ReleasePreviewForSubtitleEditor()
    {
        playbackTimer.Stop();
        player.LoadedBehavior = WpfControls.MediaState.Manual;
        player.UnloadedBehavior = WpfControls.MediaState.Manual;
        player.Stop();
        player.Source = null;
        playButton.Text = LoaderlyLanguage.Text("Play selection");
        SetStatus("Editing subtitles...");
        RefreshTimeLabels();
    }

    private void RestorePreviewAfterSubtitleEditor(TimeSpan position, bool restorePlayback)
    {
        if (IsDisposed || !File.Exists(sourceFilePath))
        {
            return;
        }

        pendingSubtitleEditorRestorePosition = position;
        pendingSubtitleEditorRestorePlayback = restorePlayback;
        player.Source = new Uri(sourceFilePath);
    }

    internal static bool ShouldCreateSubtitlePreviewClipForTest(TimeSpan start, TimeSpan end, TimeSpan duration)
    {
        return ShouldCreateSubtitlePreviewClip(start, end, duration);
    }

    private static bool ShouldCreateSubtitlePreviewClip(TimeSpan start, TimeSpan end, TimeSpan duration)
    {
        return false;
    }

    private bool RestorePreviewAfterSubtitleEditorMediaOpened()
    {
        if (pendingSubtitleEditorRestorePosition is not { } position)
        {
            return false;
        }

        var restorePlayback = pendingSubtitleEditorRestorePlayback;
        pendingSubtitleEditorRestorePosition = null;
        pendingSubtitleEditorRestorePlayback = false;

        SeekTo(position);
        if (restorePlayback)
        {
            ResumePreviewAfterRangeEdit();
        }
        else
        {
            player.Pause();
            playButton.Text = player.Position > StartTime && player.Position < EndTime
                ? "Resume"
                : "Play selection";
            RefreshTimeLabels();
        }

        return true;
    }

    private bool HandleShortcut(WinForms.Keys keyData)
    {
        var keyCode = keyData & WinForms.Keys.KeyCode;
        var ctrl = keyData.HasFlag(WinForms.Keys.Control);
        var shift = keyData.HasFlag(WinForms.Keys.Shift);
        var alt = keyData.HasFlag(WinForms.Keys.Alt);

        if (alt)
        {
            return false;
        }

        if (keyCode == WinForms.Keys.Escape)
        {
            if (exportCancellation is not null)
            {
                exportCancellation.Cancel();
                SetStatus("Canceling export...");
                return true;
            }

            Close();
            return true;
        }

        if (exportCancellation is not null)
        {
            return false;
        }

        if (ShortcutMatches(keyData, settings.TrimUndoShortcut, WinForms.Keys.Control | WinForms.Keys.Z))
        {
            UndoTrimChange();
            return true;
        }

        if (ShortcutMatches(keyData, settings.TrimRedoShortcut, WinForms.Keys.Control | WinForms.Keys.Y))
        {
            RedoTrimChange();
            return true;
        }

        if (!ctrl && !shift && keyCode == WinForms.Keys.Space)
        {
            TogglePlayback();
            return true;
        }

        if (keyCode == WinForms.Keys.Left)
        {
            if (ctrl && shift)
            {
                StepFrame(-1);
            }
            else if (ctrl)
            {
                SetStartAtPlayhead();
            }
            else
            {
                SeekRelative(shift ? -5 : -1);
            }

            return true;
        }

        if (keyCode == WinForms.Keys.Right)
        {
            if (ctrl && shift)
            {
                StepFrame(1);
            }
            else if (ctrl)
            {
                SetEndAtPlayhead();
            }
            else
            {
                SeekRelative(shift ? 5 : 1);
            }

            return true;
        }

        if (!ctrl && keyCode == WinForms.Keys.Home)
        {
            SeekTo(StartTime);
            return true;
        }

        if (!ctrl && keyCode == WinForms.Keys.End)
        {
            SeekTo(EndTime);
            return true;
        }

        if (ShortcutMatches(keyData, settings.TrimSaveShortcut, WinForms.Keys.Control | WinForms.Keys.S))
        {
            _ = ExportAsync(copyToClipboard: false);
            return true;
        }

        if (ctrl && !shift && keyCode == WinForms.Keys.C)
        {
            _ = ExportAsync(copyToClipboard: true);
            return true;
        }

        if (ShortcutMatches(keyData, settings.TrimResetShortcut, WinForms.Keys.Control | WinForms.Keys.R))
        {
            ResetTrim();
            return true;
        }

        if (!ctrl && !shift && keyCode == WinForms.Keys.M)
        {
            muteCheckBox.Checked = !muteCheckBox.Checked;
            SetStatus(muteCheckBox.Checked ? "Audio muted for export." : "Audio enabled for export.");
            return true;
        }

        return false;
    }

    private static bool ShortcutMatches(WinForms.Keys actual, string? configured, WinForms.Keys fallback)
    {
        return NormalizeShortcut(actual) == NormalizeShortcut(ParseShortcut(configured, fallback));
    }

    private static WinForms.Keys ParseShortcut(string? shortcut, WinForms.Keys fallback)
    {
        if (string.IsNullOrWhiteSpace(shortcut))
        {
            return fallback;
        }

        var result = WinForms.Keys.None;
        foreach (var rawPart in shortcut.Split('+', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (rawPart.Equals("Ctrl", StringComparison.OrdinalIgnoreCase) ||
                rawPart.Equals("Control", StringComparison.OrdinalIgnoreCase))
            {
                result |= WinForms.Keys.Control;
                continue;
            }

            if (rawPart.Equals("Shift", StringComparison.OrdinalIgnoreCase))
            {
                result |= WinForms.Keys.Shift;
                continue;
            }

            if (rawPart.Equals("Alt", StringComparison.OrdinalIgnoreCase))
            {
                result |= WinForms.Keys.Alt;
                continue;
            }

            if (Enum.TryParse(rawPart, ignoreCase: true, out WinForms.Keys key))
            {
                result |= key;
            }
        }

        return result == WinForms.Keys.None ? fallback : result;
    }

    private static WinForms.Keys NormalizeShortcut(WinForms.Keys keys)
    {
        var keyCode = keys & WinForms.Keys.KeyCode;
        var modifiers = keys & (WinForms.Keys.Control | WinForms.Keys.Shift | WinForms.Keys.Alt);
        return keyCode | modifiers;
    }

    private void SeekRelative(int seconds)
    {
        if (duration <= TimeSpan.Zero)
        {
            return;
        }

        SeekTo(player.Position + TimeSpan.FromSeconds(seconds));
    }

    private void StepFrame(int direction)
    {
        if (duration <= TimeSpan.Zero)
        {
            return;
        }

        var wasPlaying = playbackTimer.Enabled;
        if (wasPlaying)
        {
            PausePreviewForRangeEdit();
        }

        SeekTo(player.Position + TimeSpan.FromSeconds(direction / 30.0));
    }

    private void ResetTrim()
    {
        if (duration <= TimeSpan.Zero)
        {
            return;
        }

        PushUndoSnapshot(CaptureSnapshot());
        updatingControls = true;
        timeline.SetRange(0, timeline.Maximum);
        timeline.PositionValue = 0;
        updatingControls = false;
        SeekTo(TimeSpan.Zero);
        RefreshTimeLabels();
        SaveTrimState();
        SetStatus("Trim reset.");
    }

    private TrimExportOptions CurrentExportOptions()
    {
        var quality = exportQualityComboBox.SelectedIndex switch
        {
            1 => TrimExportQuality.Balanced,
            2 => TrimExportQuality.Small,
            _ => TrimExportQuality.High
        };
        return new TrimExportOptions(muteCheckBox.Checked, quality, CurrentSubtitleBurnInOptions());
    }

    private SubtitleBurnInOptions? CurrentSubtitleBurnInOptions()
    {
        var path = subtitleFilePath;
        if (!ShouldBurnInSubtitles(
                subtitleExportComboBox.SelectedText,
                subtitlesVisible,
                subtitleCues.Count > 0,
                !string.IsNullOrWhiteSpace(path) && File.Exists(path)))
        {
            return null;
        }

        return new SubtitleBurnInOptions(path!, settings.SubtitleStyle.Clone());
    }

    private string? WriteSidecarSubtitlesIfNeeded(string exportedPath)
    {
        if (!IsSidecarSubtitleMode(subtitleExportComboBox.SelectedText) ||
            subtitleCues.Count == 0 ||
            string.IsNullOrWhiteSpace(subtitleFilePath))
        {
            return null;
        }

        var sidecarPath = Path.ChangeExtension(exportedPath, ".srt");
        var sidecarText = BuildSidecarSubtitleText(subtitleCues, StartTime, EndTime, sidecarPath);
        if (string.IsNullOrWhiteSpace(sidecarText))
        {
            return null;
        }

        File.WriteAllText(sidecarPath, sidecarText);
        return sidecarPath;
    }

    internal static bool ShouldBurnInSubtitlesForTest(string subtitleExportMode, bool subtitlesVisible, bool hasCues, bool hasSubtitleFile)
    {
        return ShouldBurnInSubtitles(subtitleExportMode, subtitlesVisible, hasCues, hasSubtitleFile);
    }

    internal static string BuildSidecarSubtitleTextForTest(
        IEnumerable<SubtitleCue> cues,
        TimeSpan start,
        TimeSpan end,
        string subtitleFilePath)
    {
        return BuildSidecarSubtitleText(cues, start, end, subtitleFilePath);
    }

    private static bool ShouldBurnInSubtitles(string subtitleExportMode, bool subtitlesVisible, bool hasCues, bool hasSubtitleFile)
    {
        return IsBurnInSubtitleMode(subtitleExportMode) && subtitlesVisible && hasCues && hasSubtitleFile;
    }

    private static bool IsBurnInSubtitleMode(string subtitleExportMode)
    {
        return LoaderlyLanguage.EnglishFor(subtitleExportMode).Equals("Burn in subtitles", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsSidecarSubtitleMode(string subtitleExportMode)
    {
        return LoaderlyLanguage.EnglishFor(subtitleExportMode).Equals("Sidecar SRT", StringComparison.OrdinalIgnoreCase);
    }

    private static string BuildSidecarSubtitleText(
        IEnumerable<SubtitleCue> cues,
        TimeSpan start,
        TimeSpan end,
        string subtitleFilePath)
    {
        var clipped = SrtSubtitleService.CuesForRange(cues, start, end)
            .Select(cue => cue with
            {
                Start = cue.Start - start < TimeSpan.Zero ? TimeSpan.Zero : cue.Start - start,
                End = cue.End - start < TimeSpan.Zero ? TimeSpan.Zero : cue.End - start
            })
            .Where(cue => cue.End > cue.Start)
            .ToList();
        return SrtSubtitleService.FormatForPath(clipped, subtitleFilePath);
    }

    private void RegisterTimelineInteractionUndo()
    {
        if (interactionStartSnapshot is not { } before)
        {
            return;
        }

        interactionStartSnapshot = null;
        var after = CaptureSnapshot();
        if (before.Start == after.Start && before.End == after.End)
        {
            return;
        }

        PushUndoSnapshot(before);
    }

    private void PushUndoSnapshot(TrimSnapshot snapshot)
    {
        if (duration <= TimeSpan.Zero)
        {
            return;
        }

        if (undoStack.Count > 0 && undoStack.Peek().Equals(snapshot))
        {
            return;
        }

        undoStack.Push(snapshot);
        redoStack.Clear();
    }

    private void UndoTrimChange()
    {
        if (undoStack.Count == 0)
        {
            SetStatus("Nothing to undo.");
            return;
        }

        var current = CaptureSnapshot();
        var previous = undoStack.Pop();
        redoStack.Push(current);
        ApplySnapshot(previous);
        SetStatus("Undo.");
    }

    private void RedoTrimChange()
    {
        if (redoStack.Count == 0)
        {
            SetStatus("Nothing to redo.");
            return;
        }

        var current = CaptureSnapshot();
        var next = redoStack.Pop();
        undoStack.Push(current);
        ApplySnapshot(next);
        SetStatus("Redo.");
    }

    private TrimSnapshot CaptureSnapshot()
    {
        return new TrimSnapshot(timeline.StartValue, timeline.EndValue, timeline.PositionValue);
    }

    private void ApplySnapshot(TrimSnapshot snapshot)
    {
        var wasPlaying = playbackTimer.Enabled;
        if (wasPlaying)
        {
            PausePreviewForRangeEdit();
        }

        updatingControls = true;
        timeline.SetRange(snapshot.Start, snapshot.End);
        timeline.PositionValue = snapshot.Position;
        updatingControls = false;
        SeekTo(TimeSpan.FromSeconds(snapshot.Position / (double)TimeScale));
        RefreshTimeLabels();
        SaveTrimState();

        if (wasPlaying)
        {
            ResumePreviewAfterRangeEdit();
        }
    }

    private void ResumePreviewAfterRangeEdit()
    {
        var resumePosition = player.Position;
        if (resumePosition < StartTime || resumePosition >= EndTime)
        {
            resumePosition = StartTime;
        }

        player.Position = resumePosition;
        player.Play();
        playbackTimer.Start();
        playButton.Text = LoaderlyLanguage.Text("Pause");
        SetStatus("Playing selection.");
        RefreshTimeLabels();
    }

    private void RefreshTimeLabels()
    {
        startValueLabel.Text = FormatDuration(StartTime);
        endValueLabel.Text = FormatDuration(EndTime);
        selectionValueLabel.Text = FormatDuration(EndTime - StartTime);
        durationValueLabel.Text = duration > TimeSpan.Zero ? FormatDuration(duration) : "--:--";
        currentTimeLabel.Text = duration > TimeSpan.Zero
            ? $"{FormatDuration(player.Position)} / {FormatDuration(duration)}"
            : "0:00 / --:--";
        UpdateSubtitleOverlay(player.Position);
    }

    private void UpdateSubtitleOverlay(TimeSpan position)
    {
        if (!subtitlesVisible || subtitleCues.Count == 0)
        {
            subtitleTextBlock.Text = string.Empty;
            subtitleOverlay.Visibility = Wpf.Visibility.Collapsed;
            return;
        }

        var text = SrtSubtitleService.TextAt(subtitleCues, position);
        subtitleTextBlock.Text = text;
        subtitleOverlay.Visibility = string.IsNullOrWhiteSpace(text)
            ? Wpf.Visibility.Collapsed
            : Wpf.Visibility.Visible;
    }

    private int CurrentUnits()
    {
        return Math.Clamp((int)Math.Round(player.Position.TotalSeconds * TimeScale), 0, timeline.Maximum);
    }

    private void SaveTrimState()
    {
        if (duration <= TimeSpan.Zero || updatingControls)
        {
            return;
        }

        try
        {
            var positionSeconds = Math.Clamp(player.Position.TotalSeconds, 0, duration.TotalSeconds);
            trimStateStore.Save(sourceFilePath, StartTime, EndTime, TimeSpan.FromSeconds(positionSeconds));
        }
        catch
        {
        }
    }

    private async void ShowCopiedFeedback()
    {
        copiedFeedbackCancellation?.Cancel();
        copiedFeedbackCancellation?.Dispose();
        var tokenSource = new CancellationTokenSource();
        copiedFeedbackCancellation = tokenSource;

        copyButton.Text = LoaderlyLanguage.Text("Copied");
        copyButton.FillColor = LoaderlyTheme.Accent;
        copyButton.HoverColor = LoaderlyTheme.AccentHover;
        copyButton.PressedColor = LoaderlyTheme.AccentPressed;
        copyButton.ForeColor = Color.White;
        copyButton.Invalidate();

        try
        {
            await Task.Delay(1400, tokenSource.Token);
            if (IsDisposed || tokenSource.IsCancellationRequested)
            {
                return;
            }

            ConfigureButton(copyButton, "Copy clip", primary: false);
            copyButton.Invalidate();
        }
        catch (OperationCanceledException)
        {
        }
        finally
        {
            if (ReferenceEquals(copiedFeedbackCancellation, tokenSource))
            {
                copiedFeedbackCancellation = null;
            }

            tokenSource.Dispose();
        }
    }

    private TimeSpan StartTime => TimeSpan.FromSeconds(timeline.StartValue / (double)TimeScale);

    private TimeSpan EndTime => TimeSpan.FromSeconds(timeline.EndValue / (double)TimeScale);

    private static string FormatDuration(TimeSpan value)
    {
        return value.TotalHours >= 1
            ? value.ToString(@"h\:mm\:ss")
            : value.ToString(@"m\:ss");
    }

    private static int SecondsToUnits(double seconds, int maximum)
    {
        return Math.Clamp((int)Math.Round(seconds * TimeScale), 0, maximum);
    }

    private void SetStatus(string message)
    {
        statusLabel.Text = LoaderlyLanguage.Text(message);
    }

    private string ReadyStatus(string baseMessage)
    {
        if (!subtitlesVisible && subtitleCues.Count > 0)
        {
            return $"{LoaderlyLanguage.Text(baseMessage)} {LoaderlyLanguage.Text("Subtitles hidden.")}";
        }

        return subtitleCues.Count == 0
            ? $"{LoaderlyLanguage.Text(baseMessage)} {LoaderlyLanguage.Text("No subtitles.")}"
            : $"{LoaderlyLanguage.Text(baseMessage)} {LoaderlyLanguage.Text("Subtitles loaded.")}";
    }

    private void UpdateSubtitleControls()
    {
        if (subtitleStatusLabel.IsDisposed)
        {
            return;
        }

        subtitleStatusLabel.Text = subtitleFilePath is null
            ? LoaderlyLanguage.Text("No file")
            : $"{LoaderlyLanguage.Text(IsCurrentSubtitleTargetTranslation() ? "Translated" : subtitlesVisible ? "Loaded" : "Hidden")} {subtitleCues.Count}";
        toggleSubtitleButton.Text = LoaderlyLanguage.Text(subtitlesVisible ? "Hide" : "Show");
        editSubtitleButton.Enabled = true;
        originalSubtitleButton.Enabled = CanRestoreOriginalSubtitle();
        removeSubtitleButton.Enabled = subtitleCues.Count > 0 || !string.IsNullOrWhiteSpace(subtitleFilePath);
        var translateState = TranslateButtonState(
            subtitleCues.Count > 0 && !string.IsNullOrWhiteSpace(subtitleFilePath),
            IsCurrentSubtitleTargetTranslation(),
            ExistingTranslatedSubtitlePathForCurrentSelection() is not null);
        translateSubtitleButton.Text = LoaderlyLanguage.Text(translateState.Text);
        translateSubtitleButton.Enabled = translateState.Enabled;
        toggleSubtitleButton.Enabled = subtitleCues.Count > 0;
    }

    private void ApplySubtitleStyle()
    {
        AppSettingsStore.NormalizeForRuntime(settings);
        var style = settings.SubtitleStyle;
        subtitleTextBlock.FontFamily = new WpfMedia.FontFamily(style.FontFamily);
        subtitleTextBlock.FontSize = style.FontSize;
        subtitleTextBlock.FontWeight = style.Bold ? Wpf.FontWeights.SemiBold : Wpf.FontWeights.Normal;
        subtitleTextBlock.Foreground = new WpfMedia.SolidColorBrush(ToWpfColor(style.TextColor, 255));
        subtitleOverlay.Background = new WpfMedia.SolidColorBrush(ToWpfColor(
            style.BackgroundColor,
            (int)Math.Round(style.BackgroundOpacity / 100.0 * 255)));
    }

    private static WpfMedia.Color ToWpfColor(string htmlColor, int alpha)
    {
        var color = ColorTranslator.FromHtml(htmlColor);
        return WpfMedia.Color.FromArgb((byte)Math.Clamp(alpha, 0, 255), color.R, color.G, color.B);
    }

    private readonly record struct TrimSnapshot(int Start, int End, int Position);
}
