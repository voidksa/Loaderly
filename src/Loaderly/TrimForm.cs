using System.Collections.Specialized;
using System.Diagnostics;
using System.Drawing;
using System.Globalization;
using System.IO;
using System.Text;
using WinForms = System.Windows.Forms;
using Wpf = System.Windows;
using WpfControls = System.Windows.Controls;
using WpfEffects = System.Windows.Media.Effects;
using WpfImaging = System.Windows.Media.Imaging;
using WpfInput = System.Windows.Input;
using WpfMedia = System.Windows.Media;
using WpfShapes = System.Windows.Shapes;

namespace Loaderly;

internal sealed class TrimForm : WinForms.Form
{
    private const int TimeScale = 100;
    private const int MinimumTrimUnits = 25;
    private const int ThemeChangedMessage = 0x031A;
    private const int SettingChangedMessage = 0x001A;
    private const int TimelineThumbnailDelayMilliseconds = 350;
    private const int KeyboardSeekDebounceMilliseconds = 90;
    private const int TimelineRowHeight = 146;
    private const int TransportRowHeight = 66;
    private const int StatusLabelVerticalMargin = 7;
    private const int EditTabsVerticalMargin = 8;
    private const int EditTabsPadding = 6;
    private const int EditTabsHeaderHeight = 32;
    private const int EffectOptionsPanelVerticalMargin = 8;
    private const int EffectOptionsVerticalPadding = 8;
    private static readonly int[] EffectOptionsRowHeights = [24, 24, 34, 34, 52];
    private const bool TrimPanelClipToRoundedRegion = true;
    private const bool TrimScrollHostClipToRoundedRegion = true;
    private const double DefaultTimelineItemSeconds = 3;
    private const double BlurHandleSize = 12;
    private const double BlurHandleHitSize = 20;
    private const double MinimumBlurRegionRatio = 0.03;
    private const int BlurPreviewThrottleMilliseconds = 260;
    private const int BlurPlaybackPreviewThrottleMilliseconds = 900;
    private const double TransitionPreviewHandleSeconds = 1.2;
    private const string WindowsMediaPlayerCapabilityCommand = "DISM /Online /Add-Capability /CapabilityName:Media.WindowsMediaPlayer~~~~0.0.12.0";
    private const string WindowsMediaPlayerMissingStatus = "Windows Media Player feature is missing. Run as administrator: DISM /Online /Add-Capability /CapabilityName:Media.WindowsMediaPlayer~~~~0.0.12.0";

    public static int TimelineThumbnailDelayMillisecondsForTest => TimelineThumbnailDelayMilliseconds;
    internal static bool TimelineShowsThumbnailsForTest => false;
    public static int KeyboardSeekDebounceMillisecondsForTest => KeyboardSeekDebounceMilliseconds;
    internal static int TimelineRowHeightForTest => TimelineRowHeight;
    internal static int TransportRowHeightForTest => TransportRowHeight;
    internal static int StatusLabelVerticalMarginForTest => StatusLabelVerticalMargin;
    internal static bool TrimPanelClipsRoundedRegionForTest => TrimPanelClipToRoundedRegion;
    internal static bool TrimScrollHostClipsRoundedViewportForTest => TrimScrollHostClipToRoundedRegion;
    internal static IReadOnlyList<string> TrimEditTabLabelsForTest()
    {
        return TrimEditTabLabels();
    }
    internal static bool TrimEditTabsUseNativeControlForTest => false;
    internal static int TrimEditTabRadiusForTest => LoaderlyTheme.ControlRadius;
    internal static bool EffectOptionsFitWithinEditTabForTest(int editTabRowHeight)
    {
        return EffectOptionsSpareHeight(editTabRowHeight) >= 0;
    }

    internal static int EffectOptionsSpareHeightForTest(int editTabRowHeight)
    {
        return EffectOptionsSpareHeight(editTabRowHeight);
    }

    internal static bool EffectOptionsTextRowsAreReadableForTest()
    {
        return EffectOptionsRowHeights.Length >= 2 &&
            EffectOptionsRowHeights[0] >= 24 &&
            EffectOptionsRowHeights[1] >= 24;
    }

    private static int EffectOptionsSpareHeight(int editTabRowHeight)
    {
        var available = editTabRowHeight -
            EditTabsVerticalMargin -
            (EditTabsPadding * 2) -
            EditTabsHeaderHeight -
            EffectOptionsPanelVerticalMargin -
            EffectOptionsVerticalPadding;
        return available - EffectOptionsRowHeights.Sum();
    }

    internal static WinForms.FormWindowState SubtitleEditorWindowStateForParentForTest(WinForms.FormWindowState parentWindowState)
    {
        return ChildWindowStateForParent(parentWindowState);
    }

    internal static string MediaPreviewFailureStatusForTest(Exception? exception)
    {
        return MediaPreviewFailureStatus(exception);
    }

    internal static IReadOnlyList<string> DurationProbeArgumentsForTest(string sourceFilePath)
    {
        return DurationProbeArguments(sourceFilePath).ToList();
    }

    internal static string DurationFromFfprobeOutputForTest(string output)
    {
        var duration = ParseFfprobeDuration(output);
        return duration is null ? string.Empty : duration.Value.TotalSeconds.ToString("0.0", CultureInfo.InvariantCulture);
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
    private readonly WpfControls.Canvas blurOverlayCanvas = new();
    private readonly WpfShapes.Rectangle blurPreviewBox = new();
    private readonly WpfShapes.Rectangle blurOverlayBox = new();
    private readonly List<WpfShapes.Rectangle> blurOverlayHandles = [];
    private readonly List<WpfShapes.Rectangle> inactiveBlurOverlayBoxes = [];
    private readonly WpfControls.Border subtitleOverlay = new();
    private readonly WpfControls.TextBlock subtitleTextBlock = new();
    private readonly ModernRangeTimeline timeline = new();
    private readonly ModernButton playButton = new();
    private readonly ModernButton setStartButton = new();
    private readonly ModernButton setEndButton = new();
    private readonly ModernButton frameBackButton = new();
    private readonly ModernButton frameForwardButton = new();
    private readonly ModernButton undoButton = new();
    private readonly ModernButton redoButton = new();
    private readonly ModernButton snapshotButton = new();
    private readonly ModernButton saveButton = new();
    private readonly ModernButton copyButton = new();
    private readonly ModernButton resetButton = new();
    private readonly ModernButton closeButton = new();
    private readonly ModernButton addSegmentButton = new();
    private readonly ModernButton keepOnlyButton = new();
    private readonly ModernButton previousSegmentButton = new();
    private readonly ModernButton nextSegmentButton = new();
    private readonly ModernButton removeSegmentButton = new();
    private readonly ModernButton addBlurButton = new();
    private readonly ModernButton blurStartAtPlayheadButton = new();
    private readonly ModernButton blurEndAtPlayheadButton = new();
    private readonly ModernButton blurPreviewButton = new();
    private readonly ModernButton keyframeBlurButton = new();
    private readonly ModernButton autoFollowBlurButton = new();
    private readonly ModernButton removeBlurButton = new();
    private readonly ModernButton addZoomButton = new();
    private readonly ModernButton zoomStartAtPlayheadButton = new();
    private readonly ModernButton zoomEndAtPlayheadButton = new();
    private readonly ModernButton zoomPreviewButton = new();
    private readonly ModernButton keyframeZoomButton = new();
    private readonly ModernButton autoFollowZoomButton = new();
    private readonly ModernButton removeZoomButton = new();
    private readonly ModernButton chooseSubtitleButton = new();
    private readonly ModernButton editSubtitleButton = new();
    private readonly ModernButton translateSubtitleButton = new();
    private readonly ModernButton originalSubtitleButton = new();
    private readonly ModernButton removeSubtitleButton = new();
    private readonly ModernButton toggleSubtitleButton = new();
    private readonly ModernSelect exportQualityComboBox = new();
    private readonly ModernSelect subtitleExportComboBox = new();
    private readonly ModernSelect blurShapeComboBox = new();
    private readonly ModernSelect blurStrengthComboBox = new();
    private readonly ModernSelect zoomScaleComboBox = new();
    private readonly WinForms.CheckBox muteCheckBox = new ModernCheckBox();
    private readonly WinForms.Label startValueLabel = new();
    private readonly WinForms.Label endValueLabel = new();
    private readonly WinForms.Label selectionValueLabel = new();
    private readonly WinForms.Label currentTimeLabel = new();
    private readonly WinForms.Label durationValueLabel = new();
    private readonly WinForms.Label segmentStatusLabel = new();
    private readonly WinForms.Label blurStatusLabel = new();
    private readonly WinForms.Label blurTimingLabel = new();
    private readonly WinForms.Label zoomStatusLabel = new();
    private readonly WinForms.Label zoomTimingLabel = new();
    private readonly WinForms.Label fileNameLabel = new();
    private readonly WinForms.Label statusLabel = new();
    private readonly WinForms.Label subtitleStatusLabel = new();
    private readonly WinForms.ToolTip trimToolTip = new();
    private readonly WinForms.Timer playbackTimer = new();
    private readonly WinForms.Timer keyboardSeekTimer = new();
    private readonly WinForms.ContextMenuStrip cutContextMenu = new()
    {
        ShowImageMargin = false,
        ShowCheckMargin = false,
        Padding = new Padding(4)
    };
    private readonly Stack<TrimSnapshot> undoStack = new();
    private readonly Stack<TrimSnapshot> redoStack = new();
    private readonly List<EditableTrimSegment> trimSegments = [];
    private readonly List<EditableBlurRegion> blurRegions = [];
    private readonly List<EditableZoomRegion> zoomRegions = [];

    private CancellationTokenSource? exportCancellation;
    private CancellationTokenSource? timelineThumbnailCancellation;
    private CancellationTokenSource? copiedFeedbackCancellation;
    private CancellationTokenSource? subtitleTranslationCancellation;
    private CancellationTokenSource? blurPreviewCancellation;
    private bool updatingControls;
    private bool isTimelineInteracting;
    private bool applyingSegmentSelection;
    private bool resumeAfterTimelineInteraction;
    private bool resumeAfterKeyboardSeek;
    private TrimSnapshot? interactionStartSnapshot;
    private TimeSpan duration = TimeSpan.Zero;
    private TimeSpan? effectPreviewStopAt;
    private TimeSpan? pendingKeyboardSeek;
    private TimeSpan? pendingSubtitleEditorRestorePosition;
    private bool pendingSubtitleEditorRestorePlayback;
    private IReadOnlyList<SubtitleCue> subtitleCues = [];
    private string? subtitleFilePath;
    private string? originalSubtitleFilePath;
    private bool subtitlesVisible = true;
    private bool mediaFeatureWarningShown;
    private bool draggingBlurOverlay;
    private bool isEditingBlurRegion;
    private bool isEditingZoomRegion;
    private DateTime blurPreviewLastRequestUtc = DateTime.MinValue;
    private WpfMedia.ImageBrush? blurPreviewRenderedBrush;
    private BlurPreviewKey? blurPreviewRenderedKey;
    private string? blurPreviewImagePath;
    private int blurPreviewGeneration;
    private BlurOverlayDragMode blurDragMode = BlurOverlayDragMode.None;
    private Wpf.Point blurDragStart;
    private TrimBlurKeyframe? blurDragInitialKeyframe;
    private int selectedSegmentIndex = -1;
    private int selectedBlurIndex = -1;
    private int selectedZoomIndex = -1;

    public string? LastSavedFilePath { get; private set; }
    public string? LastSnapshotFilePath { get; private set; }

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
        cutContextMenu.Renderer = new ModernMenuRenderer();
        LoaderlyLanguage.ApplyTo(this);
        ConfigureTrimToolTips();
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
        if (ShouldWarnBeforeClosing(exportCancellation is not null) && !ConfirmCloseDuringExport())
        {
            e.Cancel = true;
            return;
        }

        SaveTrimState();
        exportCancellation?.Cancel();
        timelineThumbnailCancellation?.Cancel();
        timelineThumbnailCancellation?.Dispose();
        copiedFeedbackCancellation?.Cancel();
        copiedFeedbackCancellation?.Dispose();
        subtitleTranslationCancellation?.Cancel();
        subtitleTranslationCancellation?.Dispose();
        blurPreviewCancellation?.Cancel();
        blurPreviewCancellation?.Dispose();
        DeleteTemporaryFile(blurPreviewImagePath);
        keyboardSeekTimer.Stop();
        playbackTimer.Stop();
        player.Stop();
        player.Source = null;
        base.OnFormClosing(e);
    }

    protected override bool ProcessCmdKey(ref WinForms.Message msg, WinForms.Keys keyData)
    {
        return HandleShortcut(keyData) || base.ProcessCmdKey(ref msg, keyData);
    }

    private bool ConfirmCloseDuringExport()
    {
        var decision = WinForms.MessageBox.Show(
            this,
            LoaderlyLanguage.Text("A clip is still exporting. Cancel export and close?"),
            LoaderlyLanguage.Text("Exporting clip"),
            WinForms.MessageBoxButtons.YesNo,
            WinForms.MessageBoxIcon.Warning);
        return decision == WinForms.DialogResult.Yes;
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
        ConfigureTrimToolTips();
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
        area.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Absolute, TimelineRowHeight));
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
            Radius = LoaderlyTheme.PanelRadius,
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
            ColumnCount = 6,
            RowCount = 1,
            BackColor = LoaderlyTheme.Window,
            Margin = new WinForms.Padding(0, 10, 0, 0)
        };
        transport.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Absolute, 142));
        transport.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Percent, 100));
        transport.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Absolute, 54));
        transport.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Absolute, 54));
        transport.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Absolute, 116));
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

        ConfigureButton(undoButton, "Undo", primary: false);
        undoButton.Dock = WinForms.DockStyle.Fill;
        undoButton.Margin = new WinForms.Padding(0, 6, 6, 6);
        undoButton.Font = LoaderlyTheme.BodyFont(7.8F);
        transport.Controls.Add(undoButton, 2, 0);

        ConfigureButton(redoButton, "Redo", primary: false);
        redoButton.Dock = WinForms.DockStyle.Fill;
        redoButton.Margin = new WinForms.Padding(0, 6, 8, 6);
        redoButton.Font = LoaderlyTheme.BodyFont(7.8F);
        transport.Controls.Add(redoButton, 3, 0);

        ConfigureButton(snapshotButton, "Snapshot", primary: false);
        snapshotButton.Dock = WinForms.DockStyle.Fill;
        snapshotButton.Margin = new WinForms.Padding(0, 6, 12, 6);
        snapshotButton.Font = LoaderlyTheme.BodyFont(8.8F);
        transport.Controls.Add(snapshotButton, 4, 0);

        currentTimeLabel.Dock = WinForms.DockStyle.Fill;
        currentTimeLabel.TextAlign = ContentAlignment.MiddleRight;
        currentTimeLabel.Font = LoaderlyTheme.BodyFont(9F);
        currentTimeLabel.ForeColor = LoaderlyTheme.MutedText;
        currentTimeLabel.Margin = new WinForms.Padding(0, StatusLabelVerticalMargin, 0, StatusLabelVerticalMargin);
        transport.Controls.Add(currentTimeLabel, 5, 0);
        UpdateUndoRedoButtons();

        return area;
    }

    private WinForms.Control BuildTrimPanel()
    {
        var panel = new RoundedPanel
        {
            Dock = WinForms.DockStyle.Fill,
            Radius = LoaderlyTheme.PanelRadius,
            BackColor = LoaderlyTheme.Surface,
            BorderColor = LoaderlyTheme.Border,
            ClipToRoundedRegion = TrimPanelClipToRoundedRegion,
            Padding = new WinForms.Padding(1)
        };

        var scrollHost = new ModernScrollPanel
        {
            Dock = WinForms.DockStyle.Fill,
            Radius = Math.Max(1, LoaderlyTheme.PanelRadius - 1),
            ClipToRoundedRegion = TrimScrollHostClipToRoundedRegion,
            BackColor = LoaderlyTheme.Surface,
            Padding = new WinForms.Padding(12)
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
            Font = LoaderlyTheme.TitleFont(14F),
            ForeColor = LoaderlyTheme.Text
        }, 0, 0);

        layout.Controls.Add(BuildSelectionSummary(), 0, 1);

        ConfigureButton(setStartButton, "Set start", primary: false);
        ConfigureButton(setEndButton, "Set end", primary: false);
        AddActionButton(layout, setStartButton, 2);
        AddActionButton(layout, setEndButton, 3);

        layout.Controls.Add(BuildFrameStepRow(), 0, 4);
        layout.Controls.Add(BuildEditTabs(), 0, 5);
        layout.Controls.Add(BuildExportOptions(), 0, 6);

        ConfigureButton(saveButton, "Save clip", primary: true);
        ConfigureButton(copyButton, "Copy clip", primary: false);
        ConfigureButton(resetButton, "Reset trim", primary: false);
        ConfigureButton(closeButton, "Close", primary: false);
        AddActionButton(layout, saveButton, 7);
        AddActionButton(layout, copyButton, 8);
        AddActionButton(layout, resetButton, 9);
        AddActionButton(layout, closeButton, 10);

        return panel;
    }

    private WinForms.Control BuildEditTabs()
    {
        var shell = new RoundedPanel
        {
            Dock = WinForms.DockStyle.Fill,
            BackColor = LoaderlyTheme.Surface,
            BorderColor = LoaderlyTheme.Border,
            Radius = LoaderlyTheme.CardRadius,
            Padding = new WinForms.Padding(EditTabsPadding),
            Margin = new WinForms.Padding(0, 3, 0, 5)
        };

        var layout = new WinForms.TableLayoutPanel
        {
            Dock = WinForms.DockStyle.Fill,
            ColumnCount = 1,
            RowCount = 2,
            BackColor = LoaderlyTheme.Surface
        };
        layout.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Absolute, EditTabsHeaderHeight));
        layout.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Percent, 100));
        shell.Controls.Add(layout);

        var tabRow = new WinForms.TableLayoutPanel
        {
            Dock = WinForms.DockStyle.Fill,
            ColumnCount = TrimEditTabLabels().Count,
            RowCount = 1,
            BackColor = LoaderlyTheme.Surface,
            Margin = new WinForms.Padding(0, 0, 0, 6)
        };
        for (var index = 0; index < TrimEditTabLabels().Count; index++)
        {
            tabRow.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Percent, 100F / TrimEditTabLabels().Count));
        }
        layout.Controls.Add(tabRow, 0, 0);

        var body = new WinForms.Panel
        {
            Dock = WinForms.DockStyle.Fill,
            BackColor = LoaderlyTheme.Surface
        };
        layout.Controls.Add(body, 0, 1);

        var pages = new[]
        {
            BuildSegmentOptions(),
            BuildSubtitleOptions(),
            BuildBlurOptions(),
            BuildZoomOptions()
        };
        foreach (var page in pages)
        {
            page.Dock = WinForms.DockStyle.Fill;
            page.Margin = new WinForms.Padding(0);
            page.Visible = false;
            body.Controls.Add(page);
        }

        var buttons = new ModernButton[pages.Length];
        for (var index = 0; index < buttons.Length; index++)
        {
            var capturedIndex = index;
            var button = new ModernButton();
            ConfigureButton(button, TrimEditTabLabels()[index], primary: false);
            button.Dock = WinForms.DockStyle.Fill;
            button.Margin = new WinForms.Padding(index == 0 ? 0 : 4, 0, index == buttons.Length - 1 ? 0 : 4, 0);
            button.Font = LoaderlyTheme.BodyFont(8.6F);
            button.Click += (_, _) => SelectEditTab(capturedIndex);
            buttons[index] = button;
            tabRow.Controls.Add(button, index, 0);
        }

        SelectEditTab(0);
        return shell;

        void SelectEditTab(int selectedIndex)
        {
            for (var index = 0; index < pages.Length; index++)
            {
                var selected = index == selectedIndex;
                pages[index].Visible = selected;
                buttons[index].FillColor = selected ? LoaderlyTheme.SurfaceMuted : LoaderlyTheme.Window;
                buttons[index].HoverColor = selected ? LoaderlyTheme.ControlHover : LoaderlyTheme.SurfaceMuted;
                buttons[index].PressedColor = selected ? LoaderlyTheme.ControlPressed : LoaderlyTheme.ControlHover;
                buttons[index].BorderColor = selected ? LoaderlyTheme.Accent : LoaderlyTheme.Border;
                buttons[index].ForeColor = selected ? LoaderlyTheme.Text : LoaderlyTheme.MutedText;
            }
        }
    }

    private WinForms.Control BuildSegmentOptions()
    {
        var panel = new RoundedPanel
        {
            Dock = WinForms.DockStyle.Fill,
            Radius = LoaderlyTheme.CardRadius,
            BackColor = LoaderlyTheme.SurfaceMuted,
            BorderColor = LoaderlyTheme.Border,
            Padding = new WinForms.Padding(10, 4, 10, 4),
            Margin = new WinForms.Padding(0, 3, 0, 5)
        };

        var layout = new WinForms.TableLayoutPanel
        {
            Dock = WinForms.DockStyle.Fill,
            ColumnCount = 1,
            RowCount = 2,
            BackColor = LoaderlyTheme.SurfaceMuted
        };
        layout.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Absolute, 22));
        layout.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Percent, 100));
        panel.Controls.Add(layout);

        var header = new WinForms.TableLayoutPanel
        {
            Dock = WinForms.DockStyle.Fill,
            ColumnCount = 2,
            RowCount = 1,
            BackColor = LoaderlyTheme.SurfaceMuted
        };
        header.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Absolute, 82));
        header.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Percent, 100));
        layout.Controls.Add(header, 0, 0);

        header.Controls.Add(new WinForms.Label
        {
            Text = LoaderlyLanguage.Text("Cuts"),
            Dock = WinForms.DockStyle.Fill,
            TextAlign = ContentAlignment.MiddleLeft,
            ForeColor = LoaderlyTheme.MutedText,
            Font = LoaderlyTheme.BodyFont(8.8F)
        }, 0, 0);

        segmentStatusLabel.Dock = WinForms.DockStyle.Fill;
        segmentStatusLabel.AutoEllipsis = true;
        segmentStatusLabel.TextAlign = ContentAlignment.MiddleRight;
        segmentStatusLabel.ForeColor = LoaderlyTheme.MutedText;
        segmentStatusLabel.Font = LoaderlyTheme.BodyFont(8.4F);
        header.Controls.Add(segmentStatusLabel, 1, 0);

        var actions = new WinForms.TableLayoutPanel
        {
            Dock = WinForms.DockStyle.Fill,
            ColumnCount = 6,
            RowCount = 2,
            BackColor = LoaderlyTheme.SurfaceMuted
        };
        for (var index = 0; index < 6; index++)
        {
            actions.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Percent, 100F / 6F));
        }

        actions.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Percent, 50));
        actions.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Percent, 50));

        var cutActions = CutActionLabels();
        ConfigureButton(addSegmentButton, cutActions[0], primary: false);
        ConfigureButton(keepOnlyButton, cutActions[1], primary: false);
        ConfigureButton(previousSegmentButton, cutActions[2], primary: false);
        ConfigureButton(nextSegmentButton, cutActions[3], primary: false);
        ConfigureButton(removeSegmentButton, cutActions[4], primary: false);
        foreach (var button in new[] { addSegmentButton, keepOnlyButton, previousSegmentButton, nextSegmentButton, removeSegmentButton })
        {
            button.Dock = WinForms.DockStyle.Fill;
            button.Margin = new WinForms.Padding(2, 3, 2, 3);
            button.Font = LoaderlyTheme.BodyFont(7.8F);
        }

        addSegmentButton.Margin = new WinForms.Padding(0, 3, 2, 3);
        keepOnlyButton.Margin = new WinForms.Padding(2, 3, 0, 3);
        previousSegmentButton.Margin = new WinForms.Padding(0, 3, 2, 3);
        removeSegmentButton.Margin = new WinForms.Padding(2, 3, 0, 3);
        actions.Controls.Add(addSegmentButton, 0, 0);
        actions.SetColumnSpan(addSegmentButton, 3);
        actions.Controls.Add(keepOnlyButton, 3, 0);
        actions.SetColumnSpan(keepOnlyButton, 3);
        actions.Controls.Add(previousSegmentButton, 0, 1);
        actions.SetColumnSpan(previousSegmentButton, 2);
        actions.Controls.Add(nextSegmentButton, 2, 1);
        actions.SetColumnSpan(nextSegmentButton, 2);
        actions.Controls.Add(removeSegmentButton, 4, 1);
        actions.SetColumnSpan(removeSegmentButton, 2);
        layout.Controls.Add(actions, 0, 1);

        UpdateSegmentControls();
        return panel;
    }

    private WinForms.Control BuildSubtitleOptions()
    {
        var panel = new RoundedPanel
        {
            Dock = WinForms.DockStyle.Fill,
            Radius = LoaderlyTheme.CardRadius,
            BackColor = LoaderlyTheme.SurfaceMuted,
            BorderColor = LoaderlyTheme.Border,
            Padding = new WinForms.Padding(10, 6, 10, 6),
            Margin = new WinForms.Padding(0, 3, 0, 5)
        };

        var layout = new WinForms.TableLayoutPanel
        {
            Dock = WinForms.DockStyle.Fill,
            ColumnCount = 1,
            RowCount = 2,
            BackColor = LoaderlyTheme.SurfaceMuted
        };
        layout.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Absolute, 24));
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

    private WinForms.Control BuildBlurOptions()
    {
        var panel = new RoundedPanel
        {
            Dock = WinForms.DockStyle.Fill,
            Radius = LoaderlyTheme.CardRadius,
            BackColor = LoaderlyTheme.SurfaceMuted,
            BorderColor = LoaderlyTheme.Border,
            Padding = new WinForms.Padding(10, 6, 10, 6),
            Margin = new WinForms.Padding(0, 3, 0, 5)
        };

        var layout = new WinForms.TableLayoutPanel
        {
            Dock = WinForms.DockStyle.Fill,
            ColumnCount = 1,
            RowCount = 5,
            BackColor = LoaderlyTheme.SurfaceMuted
        };
        foreach (var rowHeight in EffectOptionsRowHeights)
        {
            layout.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Absolute, rowHeight));
        }
        panel.Controls.Add(layout);

        var header = new WinForms.TableLayoutPanel
        {
            Dock = WinForms.DockStyle.Fill,
            ColumnCount = 2,
            RowCount = 1,
            BackColor = LoaderlyTheme.SurfaceMuted
        };
        header.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Percent, 50));
        header.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Percent, 50));
        header.Controls.Add(new WinForms.Label
        {
            Text = LoaderlyLanguage.Text("Blur"),
            Dock = WinForms.DockStyle.Fill,
            TextAlign = ContentAlignment.MiddleLeft,
            ForeColor = LoaderlyTheme.MutedText,
            Font = LoaderlyTheme.BodyFont(8.8F)
        }, 0, 0);
        blurStatusLabel.Dock = WinForms.DockStyle.Fill;
        blurStatusLabel.TextAlign = ContentAlignment.MiddleRight;
        blurStatusLabel.ForeColor = LoaderlyTheme.MutedText;
        blurStatusLabel.Font = LoaderlyTheme.BodyFont(8.2F);
        blurStatusLabel.AutoEllipsis = true;
        header.Controls.Add(blurStatusLabel, 1, 0);
        layout.Controls.Add(header, 0, 0);

        blurTimingLabel.Dock = WinForms.DockStyle.Fill;
        blurTimingLabel.TextAlign = ContentAlignment.MiddleLeft;
        blurTimingLabel.ForeColor = LoaderlyTheme.MutedText;
        blurTimingLabel.Font = LoaderlyTheme.BodyFont(8.1F);
        blurTimingLabel.AutoEllipsis = true;
        layout.Controls.Add(blurTimingLabel, 0, 1);

        var selects = new WinForms.TableLayoutPanel
        {
            Dock = WinForms.DockStyle.Fill,
            ColumnCount = 2,
            RowCount = 1,
            BackColor = LoaderlyTheme.SurfaceMuted
        };
        selects.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Percent, 58));
        selects.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Percent, 42));
        blurShapeComboBox.SetItems(BlurShapeOptions().Select(LoaderlyLanguage.Text).ToArray());
        blurShapeComboBox.SelectedIndex = 0;
        blurShapeComboBox.Dock = WinForms.DockStyle.Fill;
        blurShapeComboBox.FillColor = LoaderlyTheme.Surface;
        blurShapeComboBox.BorderColor = LoaderlyTheme.Border;
        blurShapeComboBox.ForeColor = LoaderlyTheme.Text;
        blurShapeComboBox.Font = LoaderlyTheme.BodyFont(8.4F);
        selects.Controls.Add(blurShapeComboBox, 0, 0);
        blurStrengthComboBox.SetItems(BlurStrengthOptions());
        blurStrengthComboBox.SelectedIndex = 2;
        blurStrengthComboBox.Dock = WinForms.DockStyle.Fill;
        blurStrengthComboBox.FillColor = LoaderlyTheme.Surface;
        blurStrengthComboBox.BorderColor = LoaderlyTheme.Border;
        blurStrengthComboBox.ForeColor = LoaderlyTheme.Text;
        blurStrengthComboBox.Font = LoaderlyTheme.BodyFont(8.4F);
        blurStrengthComboBox.Margin = new WinForms.Padding(6, 0, 0, 0);
        selects.Controls.Add(blurStrengthComboBox, 1, 0);
        layout.Controls.Add(selects, 0, 2);

        var timingActions = new WinForms.TableLayoutPanel
        {
            Dock = WinForms.DockStyle.Fill,
            ColumnCount = 3,
            RowCount = 1,
            BackColor = LoaderlyTheme.SurfaceMuted
        };
        for (var index = 0; index < 3; index++)
        {
            timingActions.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Percent, 33.333F));
        }

        ConfigureButton(blurStartAtPlayheadButton, "Start", primary: false);
        ConfigureButton(blurEndAtPlayheadButton, "End", primary: false);
        ConfigureButton(blurPreviewButton, "Preview", primary: false);
        foreach (var button in new[] { blurStartAtPlayheadButton, blurEndAtPlayheadButton, blurPreviewButton })
        {
            button.Dock = WinForms.DockStyle.Fill;
            button.Margin = new WinForms.Padding(2, 1, 2, 1);
            button.Font = LoaderlyTheme.BodyFont(7.2F);
        }

        timingActions.Controls.Add(blurStartAtPlayheadButton, 0, 0);
        timingActions.Controls.Add(blurEndAtPlayheadButton, 1, 0);
        timingActions.Controls.Add(blurPreviewButton, 2, 0);
        layout.Controls.Add(timingActions, 0, 3);

        var actions = new WinForms.TableLayoutPanel
        {
            Dock = WinForms.DockStyle.Fill,
            ColumnCount = 4,
            RowCount = 1,
            BackColor = LoaderlyTheme.SurfaceMuted
        };
        for (var index = 0; index < 4; index++)
        {
            actions.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Percent, 25));
        }

        ConfigureButton(addBlurButton, "Add", primary: false);
        ConfigureButton(keyframeBlurButton, "Edit", primary: false);
        ConfigureButton(autoFollowBlurButton, "Track", primary: false);
        ConfigureButton(removeBlurButton, "Remove", primary: false);
        foreach (var button in new[] { addBlurButton, keyframeBlurButton, autoFollowBlurButton, removeBlurButton })
        {
            button.Dock = WinForms.DockStyle.Fill;
            button.Margin = new WinForms.Padding(2, 1, 2, 1);
            button.Font = LoaderlyTheme.BodyFont(7.2F);
        }

        actions.Controls.Add(addBlurButton, 0, 0);
        actions.Controls.Add(keyframeBlurButton, 1, 0);
        actions.Controls.Add(autoFollowBlurButton, 2, 0);
        actions.Controls.Add(removeBlurButton, 3, 0);
        layout.Controls.Add(actions, 0, 4);

        return panel;
    }

    private WinForms.Control BuildZoomOptions()
    {
        var panel = new RoundedPanel
        {
            Dock = WinForms.DockStyle.Fill,
            Radius = LoaderlyTheme.CardRadius,
            BackColor = LoaderlyTheme.SurfaceMuted,
            BorderColor = LoaderlyTheme.Border,
            Padding = new WinForms.Padding(10, 4, 10, 4),
            Margin = new WinForms.Padding(0, 3, 0, 5)
        };

        var layout = new WinForms.TableLayoutPanel
        {
            Dock = WinForms.DockStyle.Fill,
            ColumnCount = 1,
            RowCount = 5,
            BackColor = LoaderlyTheme.SurfaceMuted
        };
        foreach (var rowHeight in EffectOptionsRowHeights)
        {
            layout.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Absolute, rowHeight));
        }
        panel.Controls.Add(layout);

        var header = new WinForms.TableLayoutPanel
        {
            Dock = WinForms.DockStyle.Fill,
            ColumnCount = 2,
            RowCount = 1,
            BackColor = LoaderlyTheme.SurfaceMuted
        };
        header.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Percent, 45));
        header.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Percent, 55));
        header.Controls.Add(new WinForms.Label
        {
            Text = LoaderlyLanguage.Text("Zoom"),
            Dock = WinForms.DockStyle.Fill,
            TextAlign = ContentAlignment.MiddleLeft,
            ForeColor = LoaderlyTheme.MutedText,
            Font = LoaderlyTheme.BodyFont(8.8F)
        }, 0, 0);
        zoomStatusLabel.Dock = WinForms.DockStyle.Fill;
        zoomStatusLabel.TextAlign = ContentAlignment.MiddleRight;
        zoomStatusLabel.ForeColor = LoaderlyTheme.MutedText;
        zoomStatusLabel.Font = LoaderlyTheme.BodyFont(8.2F);
        zoomStatusLabel.AutoEllipsis = true;
        header.Controls.Add(zoomStatusLabel, 1, 0);
        layout.Controls.Add(header, 0, 0);

        zoomTimingLabel.Dock = WinForms.DockStyle.Fill;
        zoomTimingLabel.TextAlign = ContentAlignment.MiddleLeft;
        zoomTimingLabel.ForeColor = LoaderlyTheme.MutedText;
        zoomTimingLabel.Font = LoaderlyTheme.BodyFont(8.1F);
        zoomTimingLabel.AutoEllipsis = true;
        layout.Controls.Add(zoomTimingLabel, 0, 1);

        zoomScaleComboBox.SetItems(["1.5x", "2x", "2.5x", "3x", "4x"]);
        zoomScaleComboBox.SelectedIndex = 1;
        zoomScaleComboBox.Dock = WinForms.DockStyle.Fill;
        zoomScaleComboBox.FillColor = LoaderlyTheme.Surface;
        zoomScaleComboBox.BorderColor = LoaderlyTheme.Border;
        zoomScaleComboBox.ForeColor = LoaderlyTheme.Text;
        zoomScaleComboBox.Font = LoaderlyTheme.BodyFont(8.4F);
        layout.Controls.Add(zoomScaleComboBox, 0, 2);

        var timingActions = new WinForms.TableLayoutPanel
        {
            Dock = WinForms.DockStyle.Fill,
            ColumnCount = 3,
            RowCount = 1,
            BackColor = LoaderlyTheme.SurfaceMuted
        };
        for (var index = 0; index < 3; index++)
        {
            timingActions.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Percent, 33.333F));
        }

        ConfigureButton(zoomStartAtPlayheadButton, "Start", primary: false);
        ConfigureButton(zoomEndAtPlayheadButton, "End", primary: false);
        ConfigureButton(zoomPreviewButton, "Preview", primary: false);
        foreach (var button in new[] { zoomStartAtPlayheadButton, zoomEndAtPlayheadButton, zoomPreviewButton })
        {
            button.Dock = WinForms.DockStyle.Fill;
            button.Margin = new WinForms.Padding(2, 1, 2, 1);
            button.Font = LoaderlyTheme.BodyFont(7.2F);
        }

        timingActions.Controls.Add(zoomStartAtPlayheadButton, 0, 0);
        timingActions.Controls.Add(zoomEndAtPlayheadButton, 1, 0);
        timingActions.Controls.Add(zoomPreviewButton, 2, 0);
        layout.Controls.Add(timingActions, 0, 3);

        var actions = new WinForms.TableLayoutPanel
        {
            Dock = WinForms.DockStyle.Fill,
            ColumnCount = 4,
            RowCount = 1,
            BackColor = LoaderlyTheme.SurfaceMuted
        };
        for (var index = 0; index < 4; index++)
        {
            actions.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Percent, 25));
        }

        ConfigureButton(addZoomButton, "Add", primary: false);
        ConfigureButton(keyframeZoomButton, "Edit", primary: false);
        ConfigureButton(autoFollowZoomButton, "Follow", primary: false);
        ConfigureButton(removeZoomButton, "Remove", primary: false);
        foreach (var button in new[] { addZoomButton, keyframeZoomButton, autoFollowZoomButton, removeZoomButton })
        {
            button.Dock = WinForms.DockStyle.Fill;
            button.Margin = new WinForms.Padding(2, 1, 2, 1);
            button.Font = LoaderlyTheme.BodyFont(7.2F);
        }

        actions.Controls.Add(addZoomButton, 0, 0);
        actions.Controls.Add(keyframeZoomButton, 1, 0);
        actions.Controls.Add(autoFollowZoomButton, 2, 0);
        actions.Controls.Add(removeZoomButton, 3, 0);
        layout.Controls.Add(actions, 0, 4);

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
            Radius = LoaderlyTheme.CardRadius,
            BackColor = LoaderlyTheme.SurfaceMuted,
            BorderColor = LoaderlyTheme.Border,
            Padding = new WinForms.Padding(10, 6, 10, 6),
            Margin = new WinForms.Padding(0, 4, 0, 4)
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
            Radius = LoaderlyTheme.CardRadius,
            BackColor = LoaderlyTheme.SurfaceMuted,
            BorderColor = LoaderlyTheme.Border,
            Padding = new WinForms.Padding(10, 6, 10, 6),
            Margin = new WinForms.Padding(0, 3, 0, 5)
        };

        panel.Controls.Add(new WinForms.Label
        {
            Dock = WinForms.DockStyle.Fill,
            Text = ShortcutHelpText(),
            TextAlign = LoaderlyLanguage.IsArabic ? ContentAlignment.MiddleRight : ContentAlignment.MiddleLeft,
            ForeColor = LoaderlyTheme.MutedText,
            Font = LoaderlyTheme.BodyFont(7.8F),
            AutoEllipsis = true
        });

        return panel;
    }

    private string ShortcutHelpText()
    {
        return LoaderlyLanguage.IsArabic
            ? $"الاختصارات\r\nSpace تشغيل/إيقاف    الأسهم 0.25ث    Shift+الأسهم 1ث\r\nCtrl+الأسهم بداية/نهاية    Ctrl+Shift+الأسهم إطار\r\nتراجع {settings.TrimUndoShortcut}    إعادة Ctrl+Shift+Z    Snapshot لقطة"
            : $"Shortcuts\r\nSpace play/pause    Arrows 0.25s    Shift+arrows 1s\r\nCtrl+arrows set start/end    Ctrl+Shift+arrows frame\r\nUndo {settings.TrimUndoShortcut}    Redo Ctrl+Shift+Z    Snapshot frame";
    }

    private WinForms.Control BuildSelectionSummary()
    {
        var summary = new RoundedPanel
        {
            Dock = WinForms.DockStyle.Fill,
            Radius = LoaderlyTheme.CardRadius,
            BackColor = LoaderlyTheme.SurfaceMuted,
            BorderColor = LoaderlyTheme.Border,
            Padding = new WinForms.Padding(12, 8, 12, 8),
            Margin = new WinForms.Padding(0, 0, 0, 6)
        };

        var layout = new WinForms.TableLayoutPanel
        {
            Dock = WinForms.DockStyle.Fill,
            ColumnCount = 2,
            RowCount = 2,
            BackColor = LoaderlyTheme.SurfaceMuted
        };
        layout.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Percent, 50));
        layout.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Percent, 50));
        layout.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Percent, 50));
        layout.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Percent, 50));
        summary.Controls.Add(layout);

        ConfigureStatValue(startValueLabel, alignRight: false);
        ConfigureStatValue(endValueLabel, alignRight: true);
        ConfigureStatValue(selectionValueLabel, alignRight: false);
        ConfigureStatValue(durationValueLabel, alignRight: true);
        layout.Controls.Add(StatCell("Start", startValueLabel, alignRight: false), 0, 0);
        layout.Controls.Add(StatCell("End", endValueLabel, alignRight: true), 1, 0);
        layout.Controls.Add(StatCell("Selected", selectionValueLabel, alignRight: false), 0, 1);
        layout.Controls.Add(StatCell("Total", durationValueLabel, alignRight: true), 1, 1);

        return summary;
    }

    private static WinForms.Control StatCell(string labelText, WinForms.Label valueLabel, bool alignRight)
    {
        var cell = new WinForms.TableLayoutPanel
        {
            Dock = WinForms.DockStyle.Fill,
            ColumnCount = 1,
            RowCount = 2,
            BackColor = LoaderlyTheme.SurfaceMuted,
            Margin = new WinForms.Padding(0)
        };
        cell.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Absolute, 16));
        cell.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Percent, 100));
        cell.Controls.Add(StatLabel(labelText, alignRight), 0, 0);
        cell.Controls.Add(valueLabel, 0, 1);
        return cell;
    }

    private static WinForms.Label StatLabel(string text, bool alignRight)
    {
        return new WinForms.Label
        {
            Text = text,
            Dock = WinForms.DockStyle.Fill,
            TextAlign = alignRight ? ContentAlignment.BottomRight : ContentAlignment.BottomLeft,
            Font = LoaderlyTheme.BodyFont(7.4F),
            ForeColor = LoaderlyTheme.MutedText
        };
    }

    private static void ConfigureStatValue(WinForms.Label label, bool alignRight)
    {
        label.Dock = WinForms.DockStyle.Fill;
        label.TextAlign = alignRight ? ContentAlignment.TopRight : ContentAlignment.TopLeft;
        label.Font = LoaderlyTheme.TitleFont(10.8F);
        label.ForeColor = LoaderlyTheme.Text;
    }

    private static void AddActionButton(WinForms.TableLayoutPanel parent, ModernButton button, int row)
    {
        button.Dock = WinForms.DockStyle.Fill;
        button.Margin = new WinForms.Padding(0, 3, 0, 3);
        parent.Controls.Add(button, 0, row);
    }

    private static void ConfigureButton(ModernButton button, string text, bool primary)
    {
        button.Text = LoaderlyLanguage.Text(text);
        button.Radius = LoaderlyTheme.ControlRadius;
        button.FillColor = primary ? LoaderlyTheme.Accent : LoaderlyTheme.SurfaceMuted;
        button.HoverColor = primary ? LoaderlyTheme.AccentHover : Color.Empty;
        button.PressedColor = primary ? LoaderlyTheme.AccentPressed : Color.Empty;
        button.ForeColor = primary ? Color.White : LoaderlyTheme.Text;
        button.Font = LoaderlyTheme.BodyFont(9.5F);
    }

    private void ConfigureTrimToolTips()
    {
        trimToolTip.RemoveAll();
        trimToolTip.AutoPopDelay = 8000;
        trimToolTip.InitialDelay = 350;
        trimToolTip.ReshowDelay = 120;
        trimToolTip.ShowAlways = true;
        trimToolTip.SetToolTip(undoButton, LoaderlyLanguage.Text("Undo the last trim edit."));
        trimToolTip.SetToolTip(redoButton, LoaderlyLanguage.Text("Redo the last undone trim edit."));
        trimToolTip.SetToolTip(addBlurButton, LoaderlyLanguage.Text("Add a blur at the playhead. Drag the box on the video, then press Done."));
        trimToolTip.SetToolTip(blurStartAtPlayheadButton, LoaderlyLanguage.Text("Move the selected blur start to the playhead."));
        trimToolTip.SetToolTip(blurEndAtPlayheadButton, LoaderlyLanguage.Text("Move the selected blur end to the playhead."));
        trimToolTip.SetToolTip(blurPreviewButton, LoaderlyLanguage.Text("Play only the selected blur range."));
        trimToolTip.SetToolTip(keyframeBlurButton, LoaderlyLanguage.Text("Edit the selected blur box. Press Done when it is in place."));
        trimToolTip.SetToolTip(autoFollowBlurButton, LoaderlyLanguage.Text("Track the selected blur, or fix a tracked blur at the current frame."));
        trimToolTip.SetToolTip(removeBlurButton, LoaderlyLanguage.Text("Remove the selected blur."));
        trimToolTip.SetToolTip(addZoomButton, LoaderlyLanguage.Text("Add a zoom area at the playhead. Drag the box on the video, then press Done."));
        trimToolTip.SetToolTip(zoomStartAtPlayheadButton, LoaderlyLanguage.Text("Move the selected zoom start to the playhead."));
        trimToolTip.SetToolTip(zoomEndAtPlayheadButton, LoaderlyLanguage.Text("Move the selected zoom end to the playhead."));
        trimToolTip.SetToolTip(zoomPreviewButton, LoaderlyLanguage.Text("Play only the selected zoom range."));
        trimToolTip.SetToolTip(keyframeZoomButton, LoaderlyLanguage.Text("Edit the selected zoom area. Press Done when it is in place."));
        trimToolTip.SetToolTip(autoFollowZoomButton, LoaderlyLanguage.Text("Follow the selected zoom area, or fix a followed zoom at the current frame."));
        trimToolTip.SetToolTip(removeZoomButton, LoaderlyLanguage.Text("Remove the selected zoom."));
        trimToolTip.SetToolTip(snapshotButton, LoaderlyLanguage.Text("Save the current preview frame as an image."));
    }

    private void ConfigureVideoSurface()
    {
        videoSurface.Children.Clear();
        videoSurface.Background = WpfMedia.Brushes.Black;

        player.Stretch = WpfMedia.Stretch.Uniform;
        player.RenderTransformOrigin = new Wpf.Point(0, 0);
        WpfControls.Panel.SetZIndex(player, 0);
        videoSurface.Children.Add(player);
        videoSurface.ClipToBounds = true;

        blurOverlayCanvas.Background = WpfMedia.Brushes.Transparent;
        blurOverlayCanvas.Visibility = Wpf.Visibility.Collapsed;
        blurPreviewBox.Fill = WpfMedia.Brushes.Transparent;
        blurPreviewBox.Stroke = WpfMedia.Brushes.Transparent;
        blurPreviewBox.RadiusX = 6;
        blurPreviewBox.RadiusY = 6;
        blurPreviewBox.IsHitTestVisible = false;
        blurOverlayBox.Fill = new WpfMedia.SolidColorBrush(WpfMedia.Color.FromArgb(58, 96, 165, 250));
        blurOverlayBox.Stroke = new WpfMedia.SolidColorBrush(WpfMedia.Color.FromArgb(230, 96, 165, 250));
        blurOverlayBox.StrokeThickness = 2;
        blurOverlayBox.RadiusX = 6;
        blurOverlayBox.RadiusY = 6;
        blurOverlayBox.IsHitTestVisible = false;
        blurOverlayCanvas.Children.Clear();
        blurOverlayCanvas.Children.Add(blurPreviewBox);
        blurOverlayCanvas.Children.Add(blurOverlayBox);
        blurOverlayHandles.Clear();
        for (var index = 0; index < 4; index++)
        {
            var handle = new WpfShapes.Rectangle
            {
                Width = BlurHandleSize,
                Height = BlurHandleSize,
                RadiusX = 3,
                RadiusY = 3,
                Fill = new WpfMedia.SolidColorBrush(WpfMedia.Color.FromRgb(96, 165, 250)),
                Stroke = WpfMedia.Brushes.White,
                StrokeThickness = 1.5,
                Visibility = Wpf.Visibility.Collapsed,
                Cursor = index is 0 or 3 ? WpfInput.Cursors.SizeNWSE : WpfInput.Cursors.SizeNESW
            };
            blurOverlayHandles.Add(handle);
            blurOverlayCanvas.Children.Add(handle);
        }

        WpfControls.Panel.SetZIndex(blurOverlayCanvas, 1);
        videoSurface.Children.Add(blurOverlayCanvas);

        subtitleTextBlock.Text = string.Empty;
        subtitleTextBlock.Foreground = WpfMedia.Brushes.White;
        subtitleTextBlock.FontSize = 24;
        subtitleTextBlock.FontWeight = Wpf.FontWeights.SemiBold;
        subtitleTextBlock.TextAlignment = Wpf.TextAlignment.Center;
        subtitleTextBlock.TextWrapping = Wpf.TextWrapping.Wrap;
        subtitleTextBlock.FlowDirection = Wpf.FlowDirection.LeftToRight;
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
        WpfControls.Panel.SetZIndex(subtitleOverlay, 2);
        videoSurface.Children.Add(subtitleOverlay);
        ApplySubtitleStyle();

        blurOverlayCanvas.MouseLeftButtonDown += BlurOverlayMouseDown;
        blurOverlayCanvas.MouseMove += BlurOverlayMouseMove;
        blurOverlayCanvas.MouseLeftButtonUp += BlurOverlayMouseUp;
        blurOverlayCanvas.MouseWheel += BlurOverlayMouseWheel;
        blurOverlayCanvas.SizeChanged += (_, _) => UpdateBlurOverlay();
        videoHost.Child = videoSurface;
    }

    private void BindEvents()
    {
        player.MediaOpened += async (_, _) =>
        {
            if (RestorePreviewAfterSubtitleEditorMediaOpened())
            {
                return;
            }

            await InitializeDurationAsync();
        };
        player.MediaFailed += (_, args) => HandleMediaPreviewFailure(args.ErrorException);
        player.MediaEnded += (_, _) =>
        {
            StopPlayback();
        };
        playbackTimer.Interval = 80;
        playbackTimer.Tick += (_, _) => UpdatePlaybackPosition();
        keyboardSeekTimer.Interval = KeyboardSeekDebounceMilliseconds;
        keyboardSeekTimer.Tick += (_, _) => CommitPendingKeyboardSeek();

        timeline.InteractionStarted += (_, _) =>
        {
            CommitPendingKeyboardSeek();
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
            UpdateSelectedSegmentFromTimeline();
            RefreshTimeLabels();
            SeekTo(TimeSpan.FromSeconds(timeline.PositionValue / (double)TimeScale));
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
            if (ShouldSeekPreviewOnTimelinePositionChange(updatingControls, isTimelineInteracting))
            {
                SeekTo(TimeSpan.FromSeconds(timeline.PositionValue / (double)TimeScale));
            }
        };
        timeline.BlurClicked += (_, args) => SelectEffectFromTimeline(args.BlurIndex);
        timeline.BlurRangeChanged += (_, args) => UpdateEffectRangeFromTimeline(args.BlurIndex, args.Start, args.End);

        playButton.Click += (_, _) => TogglePlayback();
        undoButton.Click += (_, _) => UndoTrimChange();
        redoButton.Click += (_, _) => RedoTrimChange();
        setStartButton.Click += (_, _) => SetStartAtPlayhead();
        setEndButton.Click += (_, _) => SetEndAtPlayhead();
        frameBackButton.Click += (_, _) => StepFrame(-1);
        frameForwardButton.Click += (_, _) => StepFrame(1);
        snapshotButton.Click += async (_, _) => await SaveSnapshotAsync();
        saveButton.Click += async (_, _) => await ExportAsync(copyToClipboard: false);
        copyButton.Click += async (_, _) => await ExportAsync(copyToClipboard: true);
        resetButton.Click += (_, _) => ResetTrim();
        addSegmentButton.Click += (_, _) => CutOutSelection();
        keepOnlyButton.Click += (_, _) => KeepOnlySelection();
        previousSegmentButton.Click += (_, _) => SelectSegment(selectedSegmentIndex - 1);
        nextSegmentButton.Click += (_, _) => SelectSegment(selectedSegmentIndex + 1);
        removeSegmentButton.Click += (_, _) => RemoveSelectedCut();
        addBlurButton.Click += (_, _) => AddBlurRegion();
        blurStartAtPlayheadButton.Click += (_, _) => SetSelectedEffectStartAtPlayhead();
        blurEndAtPlayheadButton.Click += (_, _) => SetSelectedEffectEndAtPlayhead();
        blurPreviewButton.Click += (_, _) => PreviewSelectedEffect();
        keyframeBlurButton.Click += (_, _) => ToggleBlurEditMode();
        autoFollowBlurButton.Click += async (_, _) => await AutoFollowSelectedBlurAsync();
        removeBlurButton.Click += (_, _) => RemoveSelectedBlur();
        blurShapeComboBox.SelectedIndexChanged += (_, _) => UpdateSelectedBlurSettings();
        blurStrengthComboBox.SelectedIndexChanged += (_, _) => UpdateSelectedBlurSettings();
        addZoomButton.Click += (_, _) => AddZoomRegion();
        zoomStartAtPlayheadButton.Click += (_, _) => SetSelectedEffectStartAtPlayhead();
        zoomEndAtPlayheadButton.Click += (_, _) => SetSelectedEffectEndAtPlayhead();
        zoomPreviewButton.Click += (_, _) => PreviewSelectedEffect();
        keyframeZoomButton.Click += (_, _) => ToggleZoomEditMode();
        autoFollowZoomButton.Click += async (_, _) => await AutoFollowSelectedZoomAsync();
        removeZoomButton.Click += (_, _) => RemoveSelectedZoom();
        zoomScaleComboBox.SelectedIndexChanged += (_, _) => UpdateSelectedZoomSettings();
        timeline.SegmentClicked += (_, args) => SelectSegment(args.SegmentIndex);
        timeline.SegmentContextRequested += (_, args) => ShowCutContextMenu(args.SegmentIndex, args.Location);
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

    private async Task InitializeDurationAsync()
    {
        var detectedDuration = player.NaturalDuration.HasTimeSpan
            ? player.NaturalDuration.TimeSpan
            : await ProbeDurationWithFfprobeAsync(sourceFilePath, CancellationToken.None).ConfigureAwait(true);
        if (detectedDuration is null || detectedDuration <= TimeSpan.Zero)
        {
            SetStatus("Could not read video duration.");
            return;
        }

        InitializeDuration(detectedDuration.Value, usedFallback: !player.NaturalDuration.HasTimeSpan);
    }

    private void InitializeDuration(TimeSpan detectedDuration, bool usedFallback)
    {
        duration = detectedDuration;
        var maximum = Math.Max(MinimumTrimUnits, (int)Math.Ceiling(duration.TotalSeconds * TimeScale));
        var saved = LoadSavedTrim(maximum);

        updatingControls = true;
        timeline.Maximum = maximum;
        timeline.MinimumRange = MinimumTrimUnits;
        timeline.SetRange(saved.Start, saved.End);
        timeline.PositionValue = saved.Position;
        trimSegments.Clear();
        trimSegments.AddRange(saved.Cuts.Select(segment => segment.Clone()));
        blurRegions.Clear();
        blurRegions.AddRange(saved.Blurs.Select(blur => blur.Clone()));
        zoomRegions.Clear();
        zoomRegions.AddRange(saved.Zooms.Select(zoom => zoom.Clone()));
        selectedSegmentIndex = saved.SelectedCutIndex >= 0 && saved.SelectedCutIndex < trimSegments.Count
            ? saved.SelectedCutIndex
            : trimSegments.Count == 0 ? -1 : 0;
        selectedBlurIndex = saved.SelectedBlurIndex >= 0 && saved.SelectedBlurIndex < blurRegions.Count
            ? saved.SelectedBlurIndex
            : blurRegions.Count == 0 ? -1 : 0;
        selectedZoomIndex = saved.SelectedZoomIndex >= 0 && saved.SelectedZoomIndex < zoomRegions.Count
            ? saved.SelectedZoomIndex
            : zoomRegions.Count == 0 ? -1 : 0;
        isEditingBlurRegion = false;
        isEditingZoomRegion = false;
        updatingControls = false;

        player.Pause();
        SeekTo(TimeSpan.FromSeconds(saved.Position / (double)TimeScale));
        LoadSubtitles();
        UpdateSegmentControls();
        UpdateBlurControls();
        UpdateZoomControls();
        RefreshTimeLabels();
        var status = saved.Restored
            ? "Last trim restored."
            : usedFallback ? "Ready. Duration read with FFprobe." : "Ready.";
        SetStatus(ReadyStatus(status));
        timeline.SetThumbnailImages([]);
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

        var openRouterApiKey = AppSettingsStore.OpenRouterApiKeyForRuntime(settings);
        if (string.IsNullOrWhiteSpace(openRouterApiKey) || string.IsNullOrWhiteSpace(settings.OpenRouterModel))
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
                openRouterApiKey,
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

    private (int Start, int End, int Position, IReadOnlyList<EditableTrimSegment> Cuts, int SelectedCutIndex, IReadOnlyList<EditableBlurRegion> Blurs, int SelectedBlurIndex, IReadOnlyList<EditableZoomRegion> Zooms, int SelectedZoomIndex, bool Restored) LoadSavedTrim(int maximum)
    {
        var fallback = (
            Start: 0,
            End: maximum,
            Position: 0,
            Cuts: (IReadOnlyList<EditableTrimSegment>)[],
            SelectedCutIndex: -1,
            Blurs: (IReadOnlyList<EditableBlurRegion>)[],
            SelectedBlurIndex: -1,
            Zooms: (IReadOnlyList<EditableZoomRegion>)[],
            SelectedZoomIndex: -1,
            Restored: false);
        var saved = trimStateStore.Load(sourceFilePath);
        if (saved is null)
        {
            return fallback;
        }

        var cuts = saved.Cuts
            .Select(cut => new EditableTrimSegment(
                SecondsToUnits(cut.StartSeconds, maximum),
                SecondsToUnits(cut.EndSeconds, maximum),
                TransitionFromSavedValue(cut.TransitionAfter)))
            .Where(cut => cut.End - cut.Start >= MinimumTrimUnits)
            .OrderBy(cut => cut.Start)
            .ThenBy(cut => cut.End)
            .ToList();
        var blurs = saved.BlurRegions
            .Select(blur => new EditableBlurRegion(
                SecondsToUnits(blur.StartSeconds, maximum),
                SecondsToUnits(blur.EndSeconds, maximum),
                BlurShapeFromSavedValue(blur.Shape),
                blur.Strength,
                blur.Keyframes.Select(keyframe => new EditableBlurKeyframe(
                    SecondsToUnits(keyframe.TimeSeconds, maximum),
                    keyframe.X,
                    keyframe.Y,
                    keyframe.Width,
                    keyframe.Height)).ToList()))
            .Where(blur => blur.End - blur.Start >= MinimumTrimUnits)
            .OrderBy(blur => blur.Start)
            .ThenBy(blur => blur.End)
            .ToList();
        var zooms = saved.ZoomRegions
            .Select(zoom => new EditableZoomRegion(
                SecondsToUnits(zoom.StartSeconds, maximum),
                SecondsToUnits(zoom.EndSeconds, maximum),
                zoom.Scale,
                zoom.Keyframes.Select(keyframe => new EditableBlurKeyframe(
                    SecondsToUnits(keyframe.TimeSeconds, maximum),
                    keyframe.X,
                    keyframe.Y,
                    keyframe.Width,
                    keyframe.Height)).ToList()))
            .Where(zoom => zoom.End - zoom.Start >= MinimumTrimUnits)
            .OrderBy(zoom => zoom.Start)
            .ThenBy(zoom => zoom.End)
            .ToList();
        var selectedCut = saved.SelectedCutIndex >= 0 && saved.SelectedCutIndex < cuts.Count
            ? cuts[saved.SelectedCutIndex]
            : null;
        var start = SecondsToUnits(saved.StartSeconds, maximum);
        var end = SecondsToUnits(saved.EndSeconds, maximum);
        if (end - start < MinimumTrimUnits)
        {
            if (selectedCut is not null)
            {
                start = selectedCut.Start;
                end = selectedCut.End;
            }
            else
            {
                start = fallback.Start;
                end = fallback.End;
            }
        }

        var position = Math.Clamp(SecondsToUnits(saved.PositionSeconds, maximum), start, end);
        var selectedCutIndex = selectedCut is null ? (cuts.Count == 0 ? -1 : 0) : cuts.IndexOf(selectedCut);
        var selectedBlurIndex = saved.SelectedBlurIndex >= 0 && saved.SelectedBlurIndex < blurs.Count
            ? saved.SelectedBlurIndex
            : blurs.Count == 0 ? -1 : 0;
        var selectedZoomIndex = saved.SelectedZoomIndex >= 0 && saved.SelectedZoomIndex < zooms.Count
            ? saved.SelectedZoomIndex
            : zooms.Count == 0 ? -1 : 0;
        return (start, end, position, cuts, selectedCutIndex, blurs, selectedBlurIndex, zooms, selectedZoomIndex, true);
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
            if (ShouldSeekPreviewForTimelineRangeChange(
                    updatingControls,
                    isTimelineInteracting,
                    timeline.PositionValue,
                    timeline.StartValue,
                    timeline.EndValue))
            {
                SeekTo(StartTime);
            }
            else
            {
                updatingControls = true;
                timeline.PositionValue = Math.Clamp(timeline.PositionValue, timeline.StartValue, timeline.EndValue);
                updatingControls = false;
            }
        }

        UpdateSelectedSegmentFromTimeline();
        if (ShouldRefreshTimelineLabels(updatingControls, isTimelineInteracting))
        {
            RefreshTimeLabels();
        }

        if (!isTimelineInteracting)
        {
            SaveTrimState();
        }
    }

    private void CutOutSelection()
    {
        if (duration <= TimeSpan.Zero || timeline.Maximum < MinimumTrimUnits)
        {
            return;
        }

        CancelTransitionPreviewWork();
        PushUndoSnapshot(CaptureSnapshot());
        var range = NewTimelineItemRangeAtPlayhead(
            CurrentUnits(),
            timeline.Maximum,
            trimSegments.Select(segment => (Start: segment.Start, End: segment.End)));
        var segment = new EditableTrimSegment(range.Start, range.End, TrimTransitionKind.None);
        trimSegments.Add(segment);
        selectedSegmentIndex = SortSegmentsAndIndexOf(segment);
        ApplySegmentToTimeline(selectedSegmentIndex);
        UpdateSegmentControls();
        SaveTrimState();
        SetStatus("Cut added.");
    }

    private void KeepOnlySelection()
    {
        if (duration <= TimeSpan.Zero || timeline.EndValue - timeline.StartValue < MinimumTrimUnits)
        {
            return;
        }

        CancelTransitionPreviewWork();
        PushUndoSnapshot(CaptureSnapshot());
        trimSegments.Clear();
        blurRegions.Clear();
        zoomRegions.Clear();
        selectedSegmentIndex = -1;
        selectedBlurIndex = -1;
        selectedZoomIndex = -1;
        UpdateSegmentControls();
        UpdateBlurControls();
        UpdateZoomControls();
        RefreshTimeLabels();
        SaveTrimState();
        SetStatus("Keeping selected range only.");
    }

    private void RemoveSelectedCut()
    {
        if (selectedSegmentIndex < 0 || selectedSegmentIndex >= trimSegments.Count)
        {
            return;
        }

        CancelTransitionPreviewWork();
        PushUndoSnapshot(CaptureSnapshot());
        trimSegments.RemoveAt(selectedSegmentIndex);
        selectedSegmentIndex = trimSegments.Count == 0 ? -1 : Math.Min(selectedSegmentIndex, trimSegments.Count - 1);
        if (selectedSegmentIndex >= 0)
        {
            ApplySegmentToTimeline(selectedSegmentIndex);
        }
        else
        {
            UpdateSegmentControls();
            timeline.SetSegments([], -1);
            RefreshTimeLabels();
        }

        SaveTrimState();
        SetStatus("Cut removed.");
    }

    private void AddBlurRegion()
    {
        if (duration <= TimeSpan.Zero)
        {
            return;
        }

        PushUndoSnapshot(CaptureSnapshot());
        var range = NewTimelineItemRangeAtPlayhead(
            CurrentUnits(),
            timeline.Maximum,
            blurRegions.Select(region => (Start: region.Start, End: region.End)));
        var start = range.Start;
        var end = range.End;

        var keyframe = DefaultBlurKeyframe(TimeFromUnits(start));
        var region = new EditableBlurRegion(start, end, CurrentBlurShape(), CurrentBlurStrength(), [ToEditableBlurKeyframe(keyframe)]);
        blurRegions.Add(region);
        selectedBlurIndex = blurRegions.Count - 1;
        selectedZoomIndex = -1;
        selectedSegmentIndex = -1;
        isEditingBlurRegion = true;
        isEditingZoomRegion = false;
        UpdateSegmentControls();
        UpdateBlurControls();
        UpdateZoomControls();
        UpdateBlurOverlay();
        InvalidateGeneratedPreview();
        if (CurrentUnits() != start)
        {
            SeekTo(TimeFromUnits(start));
        }

        SaveTrimState();
        SetStatus("Blur added. Drag it, then press Done.");
    }

    private void ToggleBlurEditMode()
    {
        if (selectedBlurIndex < 0 || selectedBlurIndex >= blurRegions.Count)
        {
            SetStatus("Add a blur first.");
            return;
        }

        if (isEditingBlurRegion)
        {
            AddBlurKeyframeAtPlayhead(announce: false);
            isEditingBlurRegion = false;
            UpdateBlurControls();
            SaveTrimState();
            SetStatus("Blur fixed. Press Edit to adjust or Add for another blur.");
            return;
        }

        isEditingBlurRegion = true;
        AddBlurKeyframeAtPlayhead(announce: false);
        UpdateBlurControls();
        SetStatus("Editing blur. Drag the box or its corners, then press Done.");
    }

    private void AddBlurKeyframeAtPlayhead(bool announce = true)
    {
        if (selectedBlurIndex < 0 || selectedBlurIndex >= blurRegions.Count)
        {
            return;
        }

        var region = blurRegions[selectedBlurIndex];
        var time = TimeFromUnits(Math.Clamp(CurrentUnits(), region.Start, region.End));
        var keyframe = CurrentOverlayKeyframe(time, region);
        region.UpsertKeyframe(keyframe);
        UpdateBlurOverlay();
        InvalidateGeneratedPreview();
        SaveTrimState();
        if (announce)
        {
            SetStatus("Blur point saved.");
        }
    }

    private void RemoveSelectedBlur()
    {
        if (selectedBlurIndex < 0 || selectedBlurIndex >= blurRegions.Count)
        {
            return;
        }

        PushUndoSnapshot(CaptureSnapshot());
        blurRegions.RemoveAt(selectedBlurIndex);
        selectedBlurIndex = blurRegions.Count == 0 ? -1 : Math.Min(selectedBlurIndex, blurRegions.Count - 1);
        isEditingBlurRegion = false;
        UpdateBlurControls();
        UpdateZoomControls();
        InvalidateGeneratedPreview();
        SaveTrimState();
        SetStatus("Blur removed.");
    }

    private void SelectBlurFromTimeline(int index)
    {
        if (index < 0 || index >= blurRegions.Count)
        {
            ClearBlurSelection();
            return;
        }

        selectedBlurIndex = index;
        selectedZoomIndex = -1;
        selectedSegmentIndex = -1;
        isEditingBlurRegion = false;
        isEditingZoomRegion = false;
        UpdateSegmentControls();
        UpdateBlurControls();
        UpdateZoomControls();
        if (ShouldSeekToBlurStartOnSelection())
        {
            var region = blurRegions[index];
            SeekTo(TimeFromUnits(region.Start));
        }

        SetStatus(BlurSelectedStatus(index));
    }

    private void ClearBlurSelection()
    {
        if (selectedBlurIndex < 0 && !isEditingBlurRegion)
        {
            return;
        }

        selectedBlurIndex = -1;
        isEditingBlurRegion = false;
        UpdateBlurControls();
        UpdateZoomControls();
        UpdateBlurOverlay();
        SetStatus("Blur unselected.");
    }

    private void UpdateBlurRangeFromTimeline(int index, int start, int end)
    {
        if (index < 0 || index >= blurRegions.Count)
        {
            return;
        }

        selectedBlurIndex = index;
        selectedZoomIndex = -1;
        selectedSegmentIndex = -1;
        isEditingBlurRegion = false;
        isEditingZoomRegion = false;
        var nextStart = Math.Clamp(Math.Min(start, end - MinimumTrimUnits), 0, Math.Max(0, timeline.Maximum - MinimumTrimUnits));
        var nextEnd = Math.Clamp(Math.Max(end, nextStart + MinimumTrimUnits), Math.Min(timeline.Maximum, nextStart + MinimumTrimUnits), timeline.Maximum);
        var region = blurRegions[index];
        region.Start = nextStart;
        region.End = nextEnd;
        UpdateBlurControls();
        UpdateZoomControls();
        UpdateBlurOverlay();
        InvalidateGeneratedPreview();
        if (!isTimelineInteracting)
        {
            SaveTrimState();
        }

        SetStatus(BlurTimingUpdatedStatus(index, EffectRangeTouchesPlayhead(nextStart, nextEnd, CurrentUnits())));
    }

    private void UpdateSelectedBlurSettings()
    {
        if (updatingControls ||
            selectedBlurIndex < 0 ||
            selectedBlurIndex >= blurRegions.Count)
        {
            return;
        }

        var region = blurRegions[selectedBlurIndex];
        region.Shape = CurrentBlurShape();
        region.Strength = CurrentBlurStrength();
        UpdateBlurControls();
        InvalidateGeneratedPreview();
        SaveTrimState();
    }

    private async Task AutoFollowSelectedBlurAsync()
    {
        if (selectedBlurIndex < 0 || selectedBlurIndex >= blurRegions.Count)
        {
            SetStatus("Add a blur first.");
            return;
        }

        var region = blurRegions[selectedBlurIndex];
        if (HasMovingKeyframes(region.Keyframes))
        {
            FixSelectedBlurAtPlayhead();
            return;
        }

        try
        {
            SetStatus("Tracking selected face or object...");
            SetBlurTrackingBusy(true);
            var tracked = await TrimBlurTracker.TrackAsync(
                sourceFilePath,
                region.ToRegion().Normalize(),
                ToolResolver.ResolveToolPath("ffmpeg"),
                CancellationToken.None);
            region.Keyframes.Clear();
            region.Keyframes.AddRange(tracked.Keyframes.Select(ToEditableBlurKeyframe));
            isEditingBlurRegion = false;
            UpdateBlurOverlay();
            UpdateBlurControls();
            InvalidateGeneratedPreview();
            SaveTrimState();
            SetStatus("Tracking ready. Press Edit to adjust.");
        }
        catch
        {
            SetStatus("Could not auto follow. Add a few keyframes manually.");
        }
        finally
        {
            SetBlurTrackingBusy(false);
        }
    }

    private void SetBlurTrackingBusy(bool busy)
    {
        addBlurButton.Enabled = !busy;
        blurStartAtPlayheadButton.Enabled = !busy && selectedBlurIndex >= 0;
        blurEndAtPlayheadButton.Enabled = !busy && selectedBlurIndex >= 0;
        blurPreviewButton.Enabled = !busy && selectedBlurIndex >= 0;
        keyframeBlurButton.Enabled = !busy && selectedBlurIndex >= 0;
        autoFollowBlurButton.Enabled = !busy && selectedBlurIndex >= 0;
        removeBlurButton.Enabled = !busy && selectedBlurIndex >= 0;
    }

    private void FixSelectedBlurAtPlayhead()
    {
        if (selectedBlurIndex < 0 || selectedBlurIndex >= blurRegions.Count)
        {
            SetStatus("Add a blur first.");
            return;
        }

        var region = blurRegions[selectedBlurIndex];
        PushUndoSnapshot(CaptureSnapshot());
        var time = TimeFromUnits(Math.Clamp(CurrentUnits(), region.Start, region.End));
        region.ReplaceWithFixedKeyframe(CurrentOverlayKeyframe(time, region));
        isEditingBlurRegion = false;
        UpdateBlurOverlay();
        UpdateBlurControls();
        InvalidateGeneratedPreview();
        SaveTrimState();
        SetStatus("Blur fixed to the current frame.");
    }

    private void AddZoomRegion()
    {
        if (duration <= TimeSpan.Zero)
        {
            return;
        }

        PushUndoSnapshot(CaptureSnapshot());
        var range = NewTimelineItemRangeAtPlayhead(
            CurrentUnits(),
            timeline.Maximum,
            zoomRegions.Select(region => (Start: region.Start, End: region.End)));
        var start = range.Start;
        var end = range.End;

        var keyframe = DefaultBlurKeyframe(TimeFromUnits(start));
        var region = new EditableZoomRegion(start, end, CurrentZoomScale(), [ToEditableBlurKeyframe(keyframe)]);
        zoomRegions.Add(region);
        selectedZoomIndex = zoomRegions.Count - 1;
        selectedBlurIndex = -1;
        selectedSegmentIndex = -1;
        isEditingZoomRegion = true;
        isEditingBlurRegion = false;
        UpdateSegmentControls();
        UpdateBlurControls();
        UpdateZoomControls();
        UpdateBlurOverlay();
        InvalidateGeneratedPreview();
        if (CurrentUnits() != start)
        {
            SeekTo(TimeFromUnits(start));
        }

        SaveTrimState();
        SetStatus("Zoom added. Drag it, then press Done.");
    }

    private void ToggleZoomEditMode()
    {
        if (selectedZoomIndex < 0 || selectedZoomIndex >= zoomRegions.Count)
        {
            SetStatus("Add a zoom first.");
            return;
        }

        if (isEditingZoomRegion)
        {
            isEditingZoomRegion = false;
            UpdateZoomControls();
            SaveTrimState();
            SetStatus("Zoom fixed. Press Edit to adjust or Add for another zoom.");
            return;
        }

        isEditingZoomRegion = true;
        isEditingBlurRegion = false;
        selectedBlurIndex = -1;
        UpdateBlurControls();
        UpdateZoomControls();
        SetStatus("Editing zoom. Drag the box or its corners, then press Done.");
    }

    private void RemoveSelectedZoom()
    {
        if (selectedZoomIndex < 0 || selectedZoomIndex >= zoomRegions.Count)
        {
            return;
        }

        PushUndoSnapshot(CaptureSnapshot());
        zoomRegions.RemoveAt(selectedZoomIndex);
        selectedZoomIndex = zoomRegions.Count == 0 ? -1 : Math.Min(selectedZoomIndex, zoomRegions.Count - 1);
        isEditingZoomRegion = false;
        UpdateZoomControls();
        UpdateBlurControls();
        InvalidateGeneratedPreview();
        SaveTrimState();
        SetStatus("Zoom removed.");
    }

    private void SelectZoomFromTimeline(int index)
    {
        if (index < 0 || index >= zoomRegions.Count)
        {
            ClearZoomSelection();
            return;
        }

        selectedZoomIndex = index;
        selectedBlurIndex = -1;
        selectedSegmentIndex = -1;
        isEditingZoomRegion = false;
        isEditingBlurRegion = false;
        UpdateSegmentControls();
        UpdateBlurControls();
        UpdateZoomControls();
        SetStatus(ZoomSelectedStatus(index));
    }

    private void SelectEffectFromTimeline(int index)
    {
        if (index < 0)
        {
            ClearBlurSelection();
            ClearZoomSelection();
            return;
        }

        if (index < blurRegions.Count)
        {
            SelectBlurFromTimeline(index);
            return;
        }

        SelectZoomFromTimeline(index - blurRegions.Count);
    }

    private void ClearZoomSelection()
    {
        if (selectedZoomIndex < 0 && !isEditingZoomRegion)
        {
            return;
        }

        selectedZoomIndex = -1;
        isEditingZoomRegion = false;
        UpdateZoomControls();
        UpdateBlurControls();
        UpdateBlurOverlay();
        SetStatus("Zoom unselected.");
    }

    private void UpdateZoomRangeFromTimeline(int index, int start, int end)
    {
        if (index < 0 || index >= zoomRegions.Count)
        {
            return;
        }

        selectedZoomIndex = index;
        selectedBlurIndex = -1;
        selectedSegmentIndex = -1;
        isEditingZoomRegion = false;
        isEditingBlurRegion = false;
        var nextStart = Math.Clamp(Math.Min(start, end - MinimumTrimUnits), 0, Math.Max(0, timeline.Maximum - MinimumTrimUnits));
        var nextEnd = Math.Clamp(Math.Max(end, nextStart + MinimumTrimUnits), Math.Min(timeline.Maximum, nextStart + MinimumTrimUnits), timeline.Maximum);
        var region = zoomRegions[index];
        region.Start = nextStart;
        region.End = nextEnd;
        UpdateZoomControls();
        UpdateBlurControls();
        UpdateBlurOverlay();
        InvalidateGeneratedPreview();
        if (!isTimelineInteracting)
        {
            SaveTrimState();
        }

        SetStatus(ZoomTimingUpdatedStatus(index, EffectRangeTouchesPlayhead(nextStart, nextEnd, CurrentUnits())));
    }

    private void UpdateEffectRangeFromTimeline(int index, int start, int end)
    {
        if (index < 0)
        {
            return;
        }

        if (index < blurRegions.Count)
        {
            UpdateBlurRangeFromTimeline(index, start, end);
            return;
        }

        UpdateZoomRangeFromTimeline(index - blurRegions.Count, start, end);
    }

    private void UpdateSelectedZoomSettings()
    {
        if (updatingControls ||
            selectedZoomIndex < 0 ||
            selectedZoomIndex >= zoomRegions.Count)
        {
            return;
        }

        zoomRegions[selectedZoomIndex].Scale = CurrentZoomScale();
        UpdateZoomControls();
        InvalidateGeneratedPreview();
        SaveTrimState();
    }

    private async Task AutoFollowSelectedZoomAsync()
    {
        if (selectedZoomIndex < 0 || selectedZoomIndex >= zoomRegions.Count)
        {
            SetStatus("Add a zoom first.");
            return;
        }

        var region = zoomRegions[selectedZoomIndex];
        if (HasMovingKeyframes(region.Keyframes))
        {
            FixSelectedZoomAtPlayhead();
            return;
        }

        try
        {
            SetStatus("Tracking selected area...");
            SetZoomTrackingBusy(true);
            var tracked = await TrimBlurTracker.TrackAsync(
                sourceFilePath,
                region.ToTrackingRegion().Normalize(),
                ToolResolver.ResolveToolPath("ffmpeg"),
                CancellationToken.None);
            region.Keyframes.Clear();
            region.Keyframes.AddRange(tracked.Keyframes.Select(ToEditableBlurKeyframe));
            isEditingZoomRegion = false;
            UpdateBlurOverlay();
            UpdateZoomControls();
            InvalidateGeneratedPreview();
            SaveTrimState();
            SetStatus("Zoom tracking ready. Press Edit to adjust.");
        }
        catch
        {
            SetStatus("Could not auto follow. Add a few keyframes manually.");
        }
        finally
        {
            SetZoomTrackingBusy(false);
        }
    }

    private void SetZoomTrackingBusy(bool busy)
    {
        addZoomButton.Enabled = !busy;
        zoomStartAtPlayheadButton.Enabled = !busy && selectedZoomIndex >= 0;
        zoomEndAtPlayheadButton.Enabled = !busy && selectedZoomIndex >= 0;
        zoomPreviewButton.Enabled = !busy && selectedZoomIndex >= 0;
        keyframeZoomButton.Enabled = !busy && selectedZoomIndex >= 0;
        autoFollowZoomButton.Enabled = !busy && selectedZoomIndex >= 0;
        removeZoomButton.Enabled = !busy && selectedZoomIndex >= 0;
    }

    private void FixSelectedZoomAtPlayhead()
    {
        if (selectedZoomIndex < 0 || selectedZoomIndex >= zoomRegions.Count)
        {
            SetStatus("Add a zoom first.");
            return;
        }

        var region = zoomRegions[selectedZoomIndex];
        PushUndoSnapshot(CaptureSnapshot());
        var time = TimeFromUnits(Math.Clamp(CurrentUnits(), region.Start, region.End));
        region.ReplaceWithFixedKeyframe(CurrentZoomOverlayKeyframe(time, region));
        isEditingZoomRegion = false;
        UpdateBlurOverlay();
        UpdateZoomControls();
        InvalidateGeneratedPreview();
        SaveTrimState();
        SetStatus("Zoom fixed to the current frame.");
    }

    private void SetSelectedEffectStartAtPlayhead()
    {
        if (selectedBlurIndex >= 0 && selectedBlurIndex < blurRegions.Count)
        {
            SetEffectStartAtPlayhead(
                blurRegions[selectedBlurIndex],
                () =>
                {
                    UpdateBlurControls();
                    UpdateZoomControls();
                    UpdateBlurOverlay();
                },
                $"Blur {selectedBlurIndex + 1} start set.");
            return;
        }

        if (selectedZoomIndex >= 0 && selectedZoomIndex < zoomRegions.Count)
        {
            SetEffectStartAtPlayhead(
                zoomRegions[selectedZoomIndex],
                () =>
                {
                    UpdateZoomControls();
                    UpdateBlurControls();
                    UpdateBlurOverlay();
                },
                $"Zoom {selectedZoomIndex + 1} start set.");
            return;
        }

        SetStatus("Select a blur or zoom first.");
    }

    private void SetSelectedEffectEndAtPlayhead()
    {
        if (selectedBlurIndex >= 0 && selectedBlurIndex < blurRegions.Count)
        {
            SetEffectEndAtPlayhead(
                blurRegions[selectedBlurIndex],
                () =>
                {
                    UpdateBlurControls();
                    UpdateZoomControls();
                    UpdateBlurOverlay();
                },
                $"Blur {selectedBlurIndex + 1} end set.");
            return;
        }

        if (selectedZoomIndex >= 0 && selectedZoomIndex < zoomRegions.Count)
        {
            SetEffectEndAtPlayhead(
                zoomRegions[selectedZoomIndex],
                () =>
                {
                    UpdateZoomControls();
                    UpdateBlurControls();
                    UpdateBlurOverlay();
                },
                $"Zoom {selectedZoomIndex + 1} end set.");
            return;
        }

        SetStatus("Select a blur or zoom first.");
    }

    private void SetEffectStartAtPlayhead(EditableBlurRegion region, Action refreshUi, string status)
    {
        var nextStart = Math.Clamp(CurrentUnits(), 0, Math.Max(0, region.End - MinimumTrimUnits));
        if (nextStart == region.Start)
        {
            SetStatus("Effect start is already at the playhead.");
            return;
        }

        PushUndoSnapshot(CaptureSnapshot());
        region.Start = nextStart;
        isEditingBlurRegion = false;
        isEditingZoomRegion = false;
        refreshUi();
        InvalidateGeneratedPreview();
        SaveTrimState();
        SetStatus(status);
    }

    private void SetEffectStartAtPlayhead(EditableZoomRegion region, Action refreshUi, string status)
    {
        var nextStart = Math.Clamp(CurrentUnits(), 0, Math.Max(0, region.End - MinimumTrimUnits));
        if (nextStart == region.Start)
        {
            SetStatus("Effect start is already at the playhead.");
            return;
        }

        PushUndoSnapshot(CaptureSnapshot());
        region.Start = nextStart;
        isEditingBlurRegion = false;
        isEditingZoomRegion = false;
        refreshUi();
        InvalidateGeneratedPreview();
        SaveTrimState();
        SetStatus(status);
    }

    private void SetEffectEndAtPlayhead(EditableBlurRegion region, Action refreshUi, string status)
    {
        var nextEnd = Math.Clamp(CurrentUnits(), Math.Min(timeline.Maximum, region.Start + MinimumTrimUnits), timeline.Maximum);
        if (nextEnd == region.End)
        {
            SetStatus("Effect end is already at the playhead.");
            return;
        }

        PushUndoSnapshot(CaptureSnapshot());
        region.End = nextEnd;
        isEditingBlurRegion = false;
        isEditingZoomRegion = false;
        refreshUi();
        InvalidateGeneratedPreview();
        SaveTrimState();
        SetStatus(status);
    }

    private void SetEffectEndAtPlayhead(EditableZoomRegion region, Action refreshUi, string status)
    {
        var nextEnd = Math.Clamp(CurrentUnits(), Math.Min(timeline.Maximum, region.Start + MinimumTrimUnits), timeline.Maximum);
        if (nextEnd == region.End)
        {
            SetStatus("Effect end is already at the playhead.");
            return;
        }

        PushUndoSnapshot(CaptureSnapshot());
        region.End = nextEnd;
        isEditingBlurRegion = false;
        isEditingZoomRegion = false;
        refreshUi();
        InvalidateGeneratedPreview();
        SaveTrimState();
        SetStatus(status);
    }

    private void PreviewSelectedEffect()
    {
        if (selectedBlurIndex >= 0 && selectedBlurIndex < blurRegions.Count)
        {
            var region = blurRegions[selectedBlurIndex];
            PreviewEffectRange(region.Start, region.End, $"blur {selectedBlurIndex + 1}");
            return;
        }

        if (selectedZoomIndex >= 0 && selectedZoomIndex < zoomRegions.Count)
        {
            var region = zoomRegions[selectedZoomIndex];
            PreviewEffectRange(region.Start, region.End, $"zoom {selectedZoomIndex + 1}");
            return;
        }

        SetStatus("Select a blur or zoom first.");
    }

    private void PreviewEffectRange(int start, int end, string label)
    {
        if (duration <= TimeSpan.Zero)
        {
            SetStatus("Video is not ready yet.");
            return;
        }

        var startTime = TimeFromUnits(Math.Clamp(start, 0, timeline.Maximum));
        var endTime = TimeFromUnits(Math.Clamp(Math.Max(end, start + MinimumTrimUnits), 0, timeline.Maximum));
        effectPreviewStopAt = endTime;
        SeekTo(startTime);
        player.Play();
        playbackTimer.Start();
        playButton.Text = LoaderlyLanguage.Text("Pause");
        SetStatus($"Previewing {label}.");
    }

    private void UpdateBlurControls()
    {
        var hasBlur = selectedBlurIndex >= 0 && selectedBlurIndex < blurRegions.Count;
        if (!hasBlur)
        {
            isEditingBlurRegion = false;
        }

        RefreshTimelineBlurRegions();
        blurStatusLabel.Text = BlurStatusDisplayText(blurRegions.Count, selectedBlurIndex, isEditingBlurRegion);
        blurStatusLabel.ForeColor = hasBlur && isEditingBlurRegion ? LoaderlyTheme.Accent : LoaderlyTheme.MutedText;
        keyframeBlurButton.Text = LoaderlyLanguage.Text(BlurEditButtonText(isEditingBlurRegion));
        keyframeBlurButton.FillColor = isEditingBlurRegion ? LoaderlyTheme.Accent : LoaderlyTheme.SurfaceMuted;
        keyframeBlurButton.HoverColor = isEditingBlurRegion ? LoaderlyTheme.AccentHover : Color.Empty;
        keyframeBlurButton.PressedColor = isEditingBlurRegion ? LoaderlyTheme.AccentPressed : Color.Empty;
        keyframeBlurButton.ForeColor = isEditingBlurRegion ? Color.White : LoaderlyTheme.Text;
        keyframeBlurButton.Enabled = hasBlur;
        blurStartAtPlayheadButton.Enabled = hasBlur;
        blurEndAtPlayheadButton.Enabled = hasBlur;
        blurPreviewButton.Enabled = hasBlur;
        autoFollowBlurButton.Enabled = hasBlur;
        removeBlurButton.Enabled = hasBlur;
        autoFollowBlurButton.Text = LoaderlyLanguage.Text("Track");
        blurTimingLabel.Text = LoaderlyLanguage.Text(hasBlur ? "Select a blur." : "No blur selected.");
        if (hasBlur)
        {
            var region = blurRegions[selectedBlurIndex];
            var hasMovingKeyframes = HasMovingKeyframes(region.Keyframes);
            blurTimingLabel.Text = EffectTimingText(region.Start, region.End, hasMovingKeyframes);
            autoFollowBlurButton.Text = LoaderlyLanguage.Text(EffectFollowButtonText(hasMovingKeyframes, zoom: false));
            updatingControls = true;
            blurShapeComboBox.SelectedIndex = Math.Max(0, Array.IndexOf(BlurShapeOptions(), BlurShapeLabel(region.Shape)));
            blurStrengthComboBox.SelectedIndex = Math.Max(0, blurStrengthComboBox.Items.IndexOf(BlurStrengthLabel(region.Strength)));
            updatingControls = false;
        }

        UpdateBlurOverlay();
    }

    private void UpdateZoomControls()
    {
        var hasZoom = selectedZoomIndex >= 0 && selectedZoomIndex < zoomRegions.Count;
        if (!hasZoom)
        {
            isEditingZoomRegion = false;
        }

        RefreshTimelineBlurRegions();
        zoomStatusLabel.Text = ZoomStatusDisplayText(zoomRegions.Count, selectedZoomIndex, isEditingZoomRegion);
        zoomStatusLabel.ForeColor = hasZoom && isEditingZoomRegion ? LoaderlyTheme.Accent : LoaderlyTheme.MutedText;
        keyframeZoomButton.Text = LoaderlyLanguage.Text(ZoomEditButtonText(isEditingZoomRegion));
        keyframeZoomButton.FillColor = isEditingZoomRegion ? LoaderlyTheme.Accent : LoaderlyTheme.SurfaceMuted;
        keyframeZoomButton.HoverColor = isEditingZoomRegion ? LoaderlyTheme.AccentHover : Color.Empty;
        keyframeZoomButton.PressedColor = isEditingZoomRegion ? LoaderlyTheme.AccentPressed : Color.Empty;
        keyframeZoomButton.ForeColor = isEditingZoomRegion ? Color.White : LoaderlyTheme.Text;
        keyframeZoomButton.Enabled = hasZoom;
        zoomStartAtPlayheadButton.Enabled = hasZoom;
        zoomEndAtPlayheadButton.Enabled = hasZoom;
        zoomPreviewButton.Enabled = hasZoom;
        autoFollowZoomButton.Enabled = hasZoom;
        removeZoomButton.Enabled = hasZoom;
        zoomScaleComboBox.Enabled = hasZoom;
        autoFollowZoomButton.Text = LoaderlyLanguage.Text("Follow");
        zoomTimingLabel.Text = LoaderlyLanguage.Text(hasZoom ? "Select a zoom." : "No zoom selected.");
        if (hasZoom)
        {
            var region = zoomRegions[selectedZoomIndex];
            var hasMovingKeyframes = HasMovingKeyframes(region.Keyframes);
            zoomTimingLabel.Text = EffectTimingText(region.Start, region.End, hasMovingKeyframes);
            autoFollowZoomButton.Text = LoaderlyLanguage.Text(EffectFollowButtonText(hasMovingKeyframes, zoom: true));
            updatingControls = true;
            zoomScaleComboBox.SelectedIndex = Math.Max(0, Array.IndexOf(ZoomScaleOptions(), ZoomScaleLabel(region.Scale)));
            updatingControls = false;
        }

        UpdateBlurOverlay();
    }

    private void UpdateBlurOverlay()
    {
        if (!blurOverlayCanvas.IsInitialized)
        {
            return;
        }

        var videoBounds = VideoDisplayBounds();
        if (videoBounds.Width <= 1 || videoBounds.Height <= 1)
        {
            CollapseAllBlurOverlays();
            ResetZoomPreviewTransform();
            return;
        }

        ApplyZoomPreviewTransform(videoBounds);
        var visibleInactive = UpdateInactiveBlurOverlays(videoBounds);
        if (selectedBlurIndex >= 0 && selectedBlurIndex < blurRegions.Count)
        {
            var region = blurRegions[selectedBlurIndex];
            var currentUnits = CurrentUnits();
            if (!ShouldShowSelectedBlurOverlay(currentUnits, region.Start, region.End))
            {
                blurPreviewBox.Visibility = Wpf.Visibility.Collapsed;
                blurOverlayBox.Visibility = Wpf.Visibility.Collapsed;
                HideBlurOverlayHandles();
                blurOverlayCanvas.Visibility = visibleInactive > 0 ? Wpf.Visibility.Visible : Wpf.Visibility.Collapsed;
                return;
            }

            var current = TimeFromUnits(currentUnits);
            var frame = region.ToRegion().FrameAt(current);
            blurOverlayCanvas.Visibility = Wpf.Visibility.Visible;
            blurPreviewBox.Visibility = Wpf.Visibility.Visible;
            blurOverlayBox.Visibility = Wpf.Visibility.Visible;
            var overlayBounds = BlurFrameRect(frame, videoBounds);
            var previewKey = BlurPreviewKeyFor(region.Shape, region.Strength, frame, currentUnits);
            UpdateBlurOverlayAppearance(region.Shape, region.Strength, overlayBounds, isEditingBlurRegion, previewKey);
            PositionBlurBox(blurPreviewBox, overlayBounds);
            PositionBlurBox(blurOverlayBox, overlayBounds);
            QueueBlurPreviewFrame(region.Shape, region.Strength, frame, currentUnits, previewKey);
            if (isEditingBlurRegion)
            {
                PositionBlurHandles(overlayBounds.Left, overlayBounds.Top, overlayBounds.Width, overlayBounds.Height);
            }
            else
            {
                HideBlurOverlayHandles();
            }

            return;
        }

        if (selectedZoomIndex >= 0 && selectedZoomIndex < zoomRegions.Count)
        {
            var region = zoomRegions[selectedZoomIndex];
            var currentUnits = CurrentUnits();
            if (!ShouldShowSelectedBlurOverlay(currentUnits, region.Start, region.End))
            {
                blurPreviewBox.Visibility = Wpf.Visibility.Collapsed;
                blurOverlayBox.Visibility = Wpf.Visibility.Collapsed;
                HideBlurOverlayHandles();
                blurOverlayCanvas.Visibility = visibleInactive > 0 ? Wpf.Visibility.Visible : Wpf.Visibility.Collapsed;
                return;
            }

            var current = TimeFromUnits(currentUnits);
            var frame = region.ToRegion().FrameAt(current);
            blurOverlayCanvas.Visibility = Wpf.Visibility.Visible;
            blurPreviewBox.Visibility = Wpf.Visibility.Collapsed;
            if (!isEditingZoomRegion)
            {
                blurOverlayBox.Visibility = Wpf.Visibility.Collapsed;
                HideBlurOverlayHandles();
                blurOverlayCanvas.Visibility = visibleInactive > 0 ? Wpf.Visibility.Visible : Wpf.Visibility.Collapsed;
                return;
            }

            blurOverlayBox.Visibility = Wpf.Visibility.Visible;
            var overlayBounds = BlurFrameRect(frame, videoBounds);
            UpdateZoomOverlayAppearance(isEditingZoomRegion);
            PositionBlurBox(blurOverlayBox, overlayBounds);
            PositionBlurHandles(overlayBounds.Left, overlayBounds.Top, overlayBounds.Width, overlayBounds.Height);

            return;
        }

        blurPreviewBox.Visibility = Wpf.Visibility.Collapsed;
        blurOverlayBox.Visibility = Wpf.Visibility.Collapsed;
        HideBlurOverlayHandles();
        blurOverlayCanvas.Visibility = visibleInactive > 0 ? Wpf.Visibility.Visible : Wpf.Visibility.Collapsed;
    }

    private void UpdateZoomOverlayAppearance(bool editing)
    {
        var fill = editing
            ? WpfMedia.Color.FromArgb(58, 168, 85, 247)
            : WpfMedia.Color.FromArgb(42, 168, 85, 247);
        var stroke = editing
            ? WpfMedia.Color.FromRgb(168, 85, 247)
            : WpfMedia.Color.FromRgb(196, 181, 253);
        blurOverlayBox.Fill = new WpfMedia.SolidColorBrush(fill);
        blurOverlayBox.Stroke = new WpfMedia.SolidColorBrush(stroke);
        blurOverlayBox.StrokeThickness = editing ? 2.2 : 1.8;
        blurOverlayBox.StrokeDashArray = new WpfMedia.DoubleCollection { 7, 3 };
    }

    private void ApplyZoomPreviewTransform(Wpf.Rect videoBounds)
    {
        if (isEditingZoomRegion)
        {
            ResetZoomPreviewTransform();
            return;
        }

        var transform = ZoomPreviewTransform(
            TimeFromUnits(CurrentUnits()),
            CurrentZoomRegions(),
            videoBounds);
        if (Math.Abs(transform.Scale - 1) < 0.0001)
        {
            ResetZoomPreviewTransform();
            return;
        }

        var group = new WpfMedia.TransformGroup();
        group.Children.Add(new WpfMedia.ScaleTransform(transform.Scale, transform.Scale));
        group.Children.Add(new WpfMedia.TranslateTransform(transform.TranslateX, transform.TranslateY));
        player.RenderTransform = group;
    }

    private void ResetZoomPreviewTransform()
    {
        if (player.RenderTransform == WpfMedia.Transform.Identity)
        {
            return;
        }

        player.RenderTransform = WpfMedia.Transform.Identity;
    }

    private static (double Scale, double TranslateX, double TranslateY) ZoomPreviewTransform(
        TimeSpan position,
        IEnumerable<TrimZoomRegion> zoomRegions,
        Wpf.Rect bounds)
    {
        if (bounds.Width <= 1 || bounds.Height <= 1)
        {
            return (1, 0, 0);
        }

        var active = TrimZoomRegion.NormalizeMany(zoomRegions)
            .Where(region => position >= region.Start && position <= region.End)
            .OrderBy(region => region.Start)
            .LastOrDefault();
        if (active is null)
        {
            return (1, 0, 0);
        }

        var frame = active.FrameAt(position).Clamp();
        var scale = Math.Clamp(active.Scale, 1.1, 4.0);
        var focusX = (frame.X + frame.Width / 2) * bounds.Width;
        var focusY = (frame.Y + frame.Height / 2) * bounds.Height;
        var targetX = bounds.Width / 2;
        var targetY = bounds.Height / 2;
        return (
            scale,
            targetX - focusX * scale,
            targetY - focusY * scale);
    }

    private BlurPreviewKey? BlurPreviewKeyFor(TrimBlurShape shape, int strength, TrimBlurKeyframe frame, int currentUnits)
    {
        if (player.NaturalVideoWidth <= 0 || player.NaturalVideoHeight <= 0)
        {
            return null;
        }

        var sourceWidth = Math.Max(2, player.NaturalVideoWidth);
        var sourceHeight = Math.Max(2, player.NaturalVideoHeight);
        var crop = BlurSourceCropRect(frame, sourceWidth, sourceHeight);
        if (crop.Width < 2 || crop.Height < 2)
        {
            return null;
        }

        var timeBucket = playbackTimer.Enabled
            ? (currentUnits / 25) * 25
            : currentUnits;
        return new BlurPreviewKey(
            shape,
            Math.Clamp(strength, 1, 40),
            timeBucket,
            sourceWidth,
            sourceHeight,
            crop.X,
            crop.Y,
            crop.Width,
            crop.Height);
    }

    private int UpdateInactiveBlurOverlays(Wpf.Rect videoBounds)
    {
        var currentUnits = CurrentUnits();
        var visibleCount = 0;
        for (var index = 0; index < blurRegions.Count; index++)
        {
            if (index == selectedBlurIndex)
            {
                continue;
            }

            var region = blurRegions[index];
            if (currentUnits < region.Start || currentUnits > region.End)
            {
                continue;
            }

            EnsureInactiveBlurOverlayCount(visibleCount + 1);
            var overlay = inactiveBlurOverlayBoxes[visibleCount];
            var current = TimeFromUnits(Math.Clamp(currentUnits, region.Start, region.End));
            var bounds = BlurFrameRect(region.ToRegion().FrameAt(current), videoBounds);
            overlay.Visibility = Wpf.Visibility.Visible;
            overlay.Fill = new WpfMedia.SolidColorBrush(WpfMedia.Color.FromArgb(54, 96, 165, 250));
            overlay.Stroke = new WpfMedia.SolidColorBrush(WpfMedia.Color.FromArgb(180, 125, 211, 252));
            overlay.StrokeThickness = 1.5;
            overlay.StrokeDashArray = new WpfMedia.DoubleCollection { 4, 3 };
            PositionBlurBox(overlay, bounds);
            visibleCount++;
        }

        for (var index = 0; index < zoomRegions.Count; index++)
        {
            if (index == selectedZoomIndex)
            {
                continue;
            }

            var region = zoomRegions[index];
            if (currentUnits < region.Start || currentUnits > region.End)
            {
                continue;
            }

            EnsureInactiveBlurOverlayCount(visibleCount + 1);
            var overlay = inactiveBlurOverlayBoxes[visibleCount];
            var current = TimeFromUnits(Math.Clamp(currentUnits, region.Start, region.End));
            var bounds = BlurFrameRect(region.ToRegion().FrameAt(current), videoBounds);
            overlay.Visibility = Wpf.Visibility.Visible;
            overlay.Fill = new WpfMedia.SolidColorBrush(WpfMedia.Color.FromArgb(38, 168, 85, 247));
            overlay.Stroke = new WpfMedia.SolidColorBrush(WpfMedia.Color.FromArgb(180, 196, 181, 253));
            overlay.StrokeThickness = 1.5;
            overlay.StrokeDashArray = new WpfMedia.DoubleCollection { 7, 3 };
            PositionBlurBox(overlay, bounds);
            visibleCount++;
        }

        for (var index = visibleCount; index < inactiveBlurOverlayBoxes.Count; index++)
        {
            inactiveBlurOverlayBoxes[index].Visibility = Wpf.Visibility.Collapsed;
        }

        return visibleCount;
    }

    private void EnsureInactiveBlurOverlayCount(int count)
    {
        while (inactiveBlurOverlayBoxes.Count < count)
        {
            var overlay = new WpfShapes.Rectangle
            {
                RadiusX = 6,
                RadiusY = 6,
                IsHitTestVisible = false,
                Visibility = Wpf.Visibility.Collapsed
            };
            inactiveBlurOverlayBoxes.Add(overlay);
            blurOverlayCanvas.Children.Insert(0, overlay);
        }
    }

    private void CollapseAllBlurOverlays()
    {
        blurOverlayCanvas.Visibility = Wpf.Visibility.Collapsed;
        blurPreviewBox.Visibility = Wpf.Visibility.Collapsed;
        blurOverlayBox.Visibility = Wpf.Visibility.Collapsed;
        foreach (var overlay in inactiveBlurOverlayBoxes)
        {
            overlay.Visibility = Wpf.Visibility.Collapsed;
        }

        HideBlurOverlayHandles();
    }

    private void UpdateBlurOverlayAppearance(
        TrimBlurShape shape,
        int strength,
        Wpf.Rect overlayBounds,
        bool editing,
        BlurPreviewKey? previewKey)
    {
        var hasRenderedPreview =
            previewKey is { } key &&
            blurPreviewRenderedKey == key &&
            blurPreviewRenderedBrush is not null;
        var alpha = hasRenderedPreview
            ? (byte)(editing ? 28 : 18)
            : (byte)Math.Clamp((editing ? 52 : 34) + strength * 4, editing ? 72 : 54, editing ? 184 : 140);
        var stroke = editing ? WpfMedia.Color.FromRgb(96, 165, 250) : WpfMedia.Color.FromRgb(52, 211, 153);
        var fill = shape switch
        {
            TrimBlurShape.Pixelate => WpfMedia.Color.FromArgb(alpha, 36, 47, 64),
            TrimBlurShape.Soft => WpfMedia.Color.FromArgb((byte)Math.Min(150, (int)alpha), 210, 226, 246),
            _ => WpfMedia.Color.FromArgb(alpha, 86, 124, 156)
        };

        if (hasRenderedPreview)
        {
            blurPreviewBox.Fill = blurPreviewRenderedBrush!;
            blurPreviewBox.Opacity = 1;
            blurPreviewBox.Effect = null;
        }
        else if (player.ActualWidth > 1 && player.ActualHeight > 1)
        {
            blurPreviewBox.Fill = new WpfMedia.VisualBrush(player)
            {
                Stretch = WpfMedia.Stretch.Fill,
                ViewboxUnits = WpfMedia.BrushMappingMode.Absolute,
                Viewbox = overlayBounds,
                ViewportUnits = WpfMedia.BrushMappingMode.RelativeToBoundingBox,
                Viewport = new Wpf.Rect(0, 0, 1, 1)
            };
            blurPreviewBox.Opacity = editing
                ? shape == TrimBlurShape.Pixelate ? 0.84 : 0.92
                : shape == TrimBlurShape.Pixelate ? 0.62 : 0.72;
        }
        else
        {
            blurPreviewBox.Fill = WpfMedia.Brushes.Transparent;
            blurPreviewBox.Opacity = 1;
        }

        if (!hasRenderedPreview)
        {
            blurPreviewBox.Effect = shape == TrimBlurShape.Pixelate
                ? null
                : new WpfEffects.BlurEffect
                {
                    Radius = shape == TrimBlurShape.Soft
                        ? Math.Clamp(strength / 1.7, 4, 18)
                        : Math.Clamp(strength / 2.4, 3, 14),
                    KernelType = WpfEffects.KernelType.Gaussian
                };
        }

        blurOverlayBox.Fill = new WpfMedia.SolidColorBrush(fill);
        blurOverlayBox.Stroke = new WpfMedia.SolidColorBrush(stroke);
        blurOverlayBox.StrokeThickness = editing ? shape == TrimBlurShape.Pixelate ? 2.4 : 2 : 1.8;
        blurOverlayBox.StrokeDashArray = shape == TrimBlurShape.Pixelate
            ? new WpfMedia.DoubleCollection { 5, 3 }
            : null;
    }

    private void QueueBlurPreviewFrame(
        TrimBlurShape shape,
        int strength,
        TrimBlurKeyframe frame,
        int currentUnits,
        BlurPreviewKey? previewKey)
    {
        if (previewKey is not { } key ||
            blurPreviewRenderedKey == key && blurPreviewRenderedBrush is not null ||
            draggingBlurOverlay ||
            !File.Exists(sourceFilePath))
        {
            return;
        }

        var now = DateTime.UtcNow;
        var throttle = playbackTimer.Enabled
            ? BlurPlaybackPreviewThrottleMilliseconds
            : BlurPreviewThrottleMilliseconds;
        if (now - blurPreviewLastRequestUtc < TimeSpan.FromMilliseconds(throttle))
        {
            return;
        }

        blurPreviewLastRequestUtc = now;
        blurPreviewCancellation?.Cancel();
        blurPreviewCancellation?.Dispose();
        blurPreviewCancellation = new CancellationTokenSource();
        var generation = ++blurPreviewGeneration;
        var renderTime = TimeFromUnits(key.TimeUnits);
        _ = RenderBlurPreviewFrameAsync(key, renderTime, blurPreviewCancellation.Token, generation);
    }

    private async Task RenderBlurPreviewFrameAsync(
        BlurPreviewKey key,
        TimeSpan time,
        CancellationToken cancellationToken,
        int generation)
    {
        var outputPath = Path.Combine(
            Path.GetTempPath(),
            "Loaderly",
            "BlurPreview",
            $"preview-{Guid.NewGuid():N}.png");
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(outputPath)!);
            await RunFfmpegFrameAsync(
                time,
                outputPath,
                PreviewBlurFilter(key),
                cancellationToken).ConfigureAwait(false);

            if (cancellationToken.IsCancellationRequested || generation != blurPreviewGeneration)
            {
                DeleteTemporaryFile(outputPath);
                return;
            }

            if (!IsHandleCreated || IsDisposed)
            {
                DeleteTemporaryFile(outputPath);
                return;
            }

            try
            {
                BeginInvoke((Action)(() => ApplyRenderedBlurPreview(key, outputPath, generation)));
            }
            catch
            {
                DeleteTemporaryFile(outputPath);
            }
        }
        catch (OperationCanceledException)
        {
            DeleteTemporaryFile(outputPath);
        }
        catch
        {
            DeleteTemporaryFile(outputPath);
        }
    }

    private void ApplyRenderedBlurPreview(BlurPreviewKey key, string imagePath, int generation)
    {
        if (generation != blurPreviewGeneration || IsDisposed)
        {
            DeleteTemporaryFile(imagePath);
            return;
        }

        var brush = LoadImageBrush(imagePath);
        var oldImagePath = blurPreviewImagePath;
        blurPreviewRenderedKey = key;
        blurPreviewRenderedBrush = brush;
        blurPreviewImagePath = imagePath;
        DeleteTemporaryFile(oldImagePath);
        UpdateBlurOverlay();
    }

    private static WpfMedia.ImageBrush LoadImageBrush(string imagePath)
    {
        var bitmap = new WpfImaging.BitmapImage();
        bitmap.BeginInit();
        bitmap.CacheOption = WpfImaging.BitmapCacheOption.OnLoad;
        bitmap.UriSource = new Uri(imagePath);
        bitmap.EndInit();
        bitmap.Freeze();

        var brush = new WpfMedia.ImageBrush(bitmap)
        {
            Stretch = WpfMedia.Stretch.Fill,
            AlignmentX = WpfMedia.AlignmentX.Left,
            AlignmentY = WpfMedia.AlignmentY.Top
        };
        brush.Freeze();
        return brush;
    }

    private static string PreviewBlurFilter(BlurPreviewKey key)
    {
        return string.Concat(
            "crop=",
            key.Width.ToString(CultureInfo.InvariantCulture),
            ':',
            key.Height.ToString(CultureInfo.InvariantCulture),
            ':',
            key.X.ToString(CultureInfo.InvariantCulture),
            ':',
            key.Y.ToString(CultureInfo.InvariantCulture),
            ',',
            PreviewBlurEffectFilter(key.Shape, key.Strength, key.Width, key.Height),
            ",format=rgba");
    }

    private static string PreviewBlurEffectFilter(TrimBlurShape shape, int strength, int width, int height)
    {
        var normalizedStrength = Math.Clamp(strength, 1, 40);
        return shape switch
        {
            TrimBlurShape.Pixelate => PixelatePreviewFilter(normalizedStrength, width, height),
            TrimBlurShape.Soft => $"gblur=sigma={Math.Clamp(normalizedStrength / 1.25, 2, 28).ToString("0.###", CultureInfo.InvariantCulture)}",
            _ => $"boxblur=luma_radius={Math.Clamp((int)Math.Round(normalizedStrength / 2.4), 3, 18)}:luma_power=2"
        };
    }

    private static string PixelatePreviewFilter(int strength, int width, int height)
    {
        var block = Math.Clamp(strength, 4, 36);
        var smallWidth = Math.Max(2, width / block);
        var smallHeight = Math.Max(2, height / block);
        return string.Create(
            CultureInfo.InvariantCulture,
            $"scale={smallWidth}:{smallHeight}:flags=neighbor,scale={width}:{height}:flags=neighbor");
    }

    private static Rectangle BlurSourceCropRect(TrimBlurKeyframe keyframe, int sourceWidth, int sourceHeight)
    {
        var frame = keyframe.Clamp();
        var width = Math.Clamp((int)Math.Round(frame.Width * sourceWidth), 2, sourceWidth);
        var height = Math.Clamp((int)Math.Round(frame.Height * sourceHeight), 2, sourceHeight);
        var x = Math.Clamp((int)Math.Round(frame.X * sourceWidth), 0, Math.Max(0, sourceWidth - width));
        var y = Math.Clamp((int)Math.Round(frame.Y * sourceHeight), 0, Math.Max(0, sourceHeight - height));
        return new Rectangle(x, y, width, height);
    }

    private static void PositionBlurBox(WpfShapes.Rectangle box, Wpf.Rect bounds)
    {
        WpfControls.Canvas.SetLeft(box, bounds.Left);
        WpfControls.Canvas.SetTop(box, bounds.Top);
        box.Width = bounds.Width;
        box.Height = bounds.Height;
    }

    private void PositionBlurHandles(double left, double top, double width, double height)
    {
        if (blurOverlayHandles.Count < 4)
        {
            return;
        }

        PositionBlurHandle(blurOverlayHandles[0], left, top);
        PositionBlurHandle(blurOverlayHandles[1], left + width, top);
        PositionBlurHandle(blurOverlayHandles[2], left, top + height);
        PositionBlurHandle(blurOverlayHandles[3], left + width, top + height);
    }

    private static void PositionBlurHandle(WpfShapes.Rectangle handle, double x, double y)
    {
        handle.Visibility = Wpf.Visibility.Visible;
        WpfControls.Canvas.SetLeft(handle, x - BlurHandleSize / 2);
        WpfControls.Canvas.SetTop(handle, y - BlurHandleSize / 2);
    }

    private void HideBlurOverlayHandles()
    {
        foreach (var handle in blurOverlayHandles)
        {
            handle.Visibility = Wpf.Visibility.Collapsed;
        }
    }

    private static bool ShouldShowSelectedBlurOverlay(int currentUnits, int start, int end)
    {
        return currentUnits >= Math.Min(start, end) && currentUnits <= Math.Max(start, end);
    }

    private static bool ShouldSeekToBlurStartOnSelection()
    {
        return false;
    }

    private Wpf.Rect VideoDisplayBounds()
    {
        var width = blurOverlayCanvas.ActualWidth;
        var height = blurOverlayCanvas.ActualHeight;
        if (width <= 0 || height <= 0)
        {
            width = videoHost.Width;
            height = videoHost.Height;
        }

        if (width <= 0 || height <= 0)
        {
            return Wpf.Rect.Empty;
        }

        var naturalWidth = player.NaturalVideoWidth > 0 ? player.NaturalVideoWidth : 16;
        var naturalHeight = player.NaturalVideoHeight > 0 ? player.NaturalVideoHeight : 9;
        var aspect = naturalWidth / Math.Max(1.0, naturalHeight);
        var containerAspect = width / Math.Max(1.0, height);
        double displayWidth;
        double displayHeight;
        if (containerAspect > aspect)
        {
            displayHeight = height;
            displayWidth = displayHeight * aspect;
        }
        else
        {
            displayWidth = width;
            displayHeight = displayWidth / aspect;
        }

        return new Wpf.Rect((width - displayWidth) / 2, (height - displayHeight) / 2, displayWidth, displayHeight);
    }

    private void BlurOverlayMouseDown(object sender, WpfInput.MouseButtonEventArgs e)
    {
        var bounds = VideoDisplayBounds();
        if (bounds.Width <= 1 || bounds.Height <= 1)
        {
            return;
        }

        var pointer = e.GetPosition(blurOverlayCanvas);
        if (!isEditingBlurRegion && !isEditingZoomRegion)
        {
            var hitIndex = BlurRegionIndexAtPointer(pointer, bounds);
            if (hitIndex >= 0)
            {
                SelectEffectFromTimeline(hitIndex);
                e.Handled = true;
            }
            else
            {
                ClearBlurSelection();
                ClearZoomSelection();
                e.Handled = true;
            }

            return;
        }

        var time = TimeFromUnits(CurrentUnits());
        TrimBlurKeyframe initial;
        if (isEditingBlurRegion && selectedBlurIndex >= 0 && selectedBlurIndex < blurRegions.Count)
        {
            var region = blurRegions[selectedBlurIndex];
            time = TimeFromUnits(Math.Clamp(CurrentUnits(), region.Start, region.End));
            initial = CurrentOverlayKeyframe(time, region);
        }
        else if (isEditingZoomRegion && selectedZoomIndex >= 0 && selectedZoomIndex < zoomRegions.Count)
        {
            var region = zoomRegions[selectedZoomIndex];
            time = TimeFromUnits(Math.Clamp(CurrentUnits(), region.Start, region.End));
            initial = CurrentZoomOverlayKeyframe(time, region);
        }
        else
        {
            return;
        }

        blurDragMode = BlurDragModeForPointer(pointer, initial, bounds);
        if (blurDragMode == BlurOverlayDragMode.Recenter)
        {
            initial = CenterBlurKeyframeAtPointer(initial, pointer, bounds);
            UpsertActiveOverlayKeyframe(initial);
            UpdateBlurOverlay();
            InvalidateGeneratedPreview();
            blurDragMode = BlurOverlayDragMode.Move;
        }

        if (blurDragMode == BlurOverlayDragMode.None)
        {
            return;
        }

        PushUndoSnapshot(CaptureSnapshot());
        draggingBlurOverlay = true;
        blurDragStart = pointer;
        blurDragInitialKeyframe = initial;
        blurOverlayCanvas.CaptureMouse();
        e.Handled = true;
    }

    private void BlurOverlayMouseMove(object sender, WpfInput.MouseEventArgs e)
    {
        if (!draggingBlurOverlay)
        {
            UpdateBlurOverlayCursor(e.GetPosition(blurOverlayCanvas));
            return;
        }

        if (!draggingBlurOverlay ||
            blurDragInitialKeyframe is not { } initial)
        {
            return;
        }

        var bounds = VideoDisplayBounds();
        if (bounds.Width <= 1 || bounds.Height <= 1)
        {
            return;
        }

        var position = e.GetPosition(blurOverlayCanvas);
        var moved = DragBlurKeyframe(initial, blurDragStart, position, bounds, blurDragMode).Clamp();
        UpsertActiveOverlayKeyframe(moved);
        UpdateBlurOverlay();
        InvalidateGeneratedPreview();
        e.Handled = true;
    }

    private void BlurOverlayMouseUp(object sender, WpfInput.MouseButtonEventArgs e)
    {
        if (!draggingBlurOverlay)
        {
            return;
        }

        draggingBlurOverlay = false;
        blurDragMode = BlurOverlayDragMode.None;
        blurDragInitialKeyframe = null;
        blurOverlayCanvas.ReleaseMouseCapture();
        UpdateBlurOverlayCursor(e.GetPosition(blurOverlayCanvas));
        SaveTrimState();
        e.Handled = true;
    }

    private void BlurOverlayMouseWheel(object sender, WpfInput.MouseWheelEventArgs e)
    {
        var activeFrame = ActiveOverlayKeyframeAtPlayhead();
        if (activeFrame is not { } current)
        {
            return;
        }

        var factor = e.Delta > 0 ? 1.08 : 0.92;
        var resized = current with
        {
            Width = current.Width * factor,
            Height = current.Height * factor,
            X = current.X - current.Width * (factor - 1) / 2,
            Y = current.Y - current.Height * (factor - 1) / 2
        };
        UpsertActiveOverlayKeyframe(resized.Clamp());
        UpdateBlurOverlay();
        InvalidateGeneratedPreview();
        SaveTrimState();
        e.Handled = true;
    }

    private TrimBlurKeyframe CurrentOverlayKeyframe(TimeSpan time, EditableBlurRegion region)
    {
        return region.ToRegion().FrameAt(time);
    }

    private TrimBlurKeyframe CurrentZoomOverlayKeyframe(TimeSpan time, EditableZoomRegion region)
    {
        return region.ToRegion().FrameAt(time);
    }

    private TrimBlurKeyframe? ActiveOverlayKeyframeAtPlayhead()
    {
        if (isEditingBlurRegion && selectedBlurIndex >= 0 && selectedBlurIndex < blurRegions.Count)
        {
            var region = blurRegions[selectedBlurIndex];
            var time = TimeFromUnits(Math.Clamp(CurrentUnits(), region.Start, region.End));
            return CurrentOverlayKeyframe(time, region);
        }

        if (isEditingZoomRegion && selectedZoomIndex >= 0 && selectedZoomIndex < zoomRegions.Count)
        {
            var region = zoomRegions[selectedZoomIndex];
            var time = TimeFromUnits(Math.Clamp(CurrentUnits(), region.Start, region.End));
            return CurrentZoomOverlayKeyframe(time, region);
        }

        return null;
    }

    private void UpsertActiveOverlayKeyframe(TrimBlurKeyframe keyframe)
    {
        if (isEditingBlurRegion && selectedBlurIndex >= 0 && selectedBlurIndex < blurRegions.Count)
        {
            blurRegions[selectedBlurIndex].UpsertKeyframe(keyframe);
            return;
        }

        if (isEditingZoomRegion && selectedZoomIndex >= 0 && selectedZoomIndex < zoomRegions.Count)
        {
            UpsertZoomOverlayKeyframe(zoomRegions[selectedZoomIndex], keyframe);
        }
    }

    private static void UpsertZoomOverlayKeyframe(EditableZoomRegion region, TrimBlurKeyframe keyframe)
    {
        region.UpsertKeyframe(keyframe);
    }

    private void UpdateBlurOverlayCursor(Wpf.Point pointer)
    {
        var frame = ActiveOverlayKeyframeAtPlayhead();
        if (frame is null)
        {
            blurOverlayCanvas.Cursor = WpfInput.Cursors.Arrow;
            return;
        }

        var bounds = VideoDisplayBounds();
        if (bounds.Width <= 1 || bounds.Height <= 1)
        {
            blurOverlayCanvas.Cursor = WpfInput.Cursors.Arrow;
            return;
        }

        blurOverlayCanvas.Cursor = BlurDragModeForPointer(pointer, frame, bounds) switch
        {
            BlurOverlayDragMode.Move => WpfInput.Cursors.SizeAll,
            BlurOverlayDragMode.ResizeNorthWest or BlurOverlayDragMode.ResizeSouthEast => WpfInput.Cursors.SizeNWSE,
            BlurOverlayDragMode.ResizeNorthEast or BlurOverlayDragMode.ResizeSouthWest => WpfInput.Cursors.SizeNESW,
            BlurOverlayDragMode.Recenter => WpfInput.Cursors.Cross,
            _ => WpfInput.Cursors.Arrow
        };
    }

    private int BlurRegionIndexAtPointer(Wpf.Point pointer, Wpf.Rect bounds)
    {
        var currentUnits = CurrentUnits();
        for (var index = blurRegions.Count - 1; index >= 0; index--)
        {
            var region = blurRegions[index];
            if (!ShouldShowSelectedBlurOverlay(currentUnits, region.Start, region.End))
            {
                continue;
            }

            var time = TimeFromUnits(Math.Clamp(currentUnits, region.Start, region.End));
            if (BlurFrameRect(region.ToRegion().FrameAt(time), bounds).Contains(pointer))
            {
                return index;
            }
        }

        for (var index = zoomRegions.Count - 1; index >= 0; index--)
        {
            var region = zoomRegions[index];
            if (!ShouldShowSelectedBlurOverlay(currentUnits, region.Start, region.End))
            {
                continue;
            }

            var time = TimeFromUnits(Math.Clamp(currentUnits, region.Start, region.End));
            if (BlurFrameRect(region.ToRegion().FrameAt(time), bounds).Contains(pointer))
            {
                return blurRegions.Count + index;
            }
        }

        return -1;
    }

    private static BlurOverlayDragMode BlurDragModeForPointer(
        Wpf.Point pointer,
        TrimBlurKeyframe keyframe,
        Wpf.Rect bounds)
    {
        if (!bounds.Contains(pointer))
        {
            return BlurOverlayDragMode.None;
        }

        var rect = BlurFrameRect(keyframe, bounds);
        if (NearPoint(pointer, rect.Left, rect.Top, BlurHandleHitSize))
        {
            return BlurOverlayDragMode.ResizeNorthWest;
        }

        if (NearPoint(pointer, rect.Right, rect.Top, BlurHandleHitSize))
        {
            return BlurOverlayDragMode.ResizeNorthEast;
        }

        if (NearPoint(pointer, rect.Left, rect.Bottom, BlurHandleHitSize))
        {
            return BlurOverlayDragMode.ResizeSouthWest;
        }

        if (NearPoint(pointer, rect.Right, rect.Bottom, BlurHandleHitSize))
        {
            return BlurOverlayDragMode.ResizeSouthEast;
        }

        return rect.Contains(pointer) ? BlurOverlayDragMode.Move : BlurOverlayDragMode.Recenter;
    }

    private static TrimBlurKeyframe DragBlurKeyframe(
        TrimBlurKeyframe initial,
        Wpf.Point dragStart,
        Wpf.Point position,
        Wpf.Rect bounds,
        BlurOverlayDragMode mode)
    {
        var deltaX = (position.X - dragStart.X) / Math.Max(1, bounds.Width);
        var deltaY = (position.Y - dragStart.Y) / Math.Max(1, bounds.Height);
        var left = initial.X;
        var top = initial.Y;
        var right = initial.X + initial.Width;
        var bottom = initial.Y + initial.Height;

        switch (mode)
        {
            case BlurOverlayDragMode.Move:
                return initial with { X = initial.X + deltaX, Y = initial.Y + deltaY };
            case BlurOverlayDragMode.ResizeNorthWest:
                left = Math.Clamp(left + deltaX, 0, right - MinimumBlurRegionRatio);
                top = Math.Clamp(top + deltaY, 0, bottom - MinimumBlurRegionRatio);
                break;
            case BlurOverlayDragMode.ResizeNorthEast:
                right = Math.Clamp(right + deltaX, left + MinimumBlurRegionRatio, 1);
                top = Math.Clamp(top + deltaY, 0, bottom - MinimumBlurRegionRatio);
                break;
            case BlurOverlayDragMode.ResizeSouthWest:
                left = Math.Clamp(left + deltaX, 0, right - MinimumBlurRegionRatio);
                bottom = Math.Clamp(bottom + deltaY, top + MinimumBlurRegionRatio, 1);
                break;
            case BlurOverlayDragMode.ResizeSouthEast:
                right = Math.Clamp(right + deltaX, left + MinimumBlurRegionRatio, 1);
                bottom = Math.Clamp(bottom + deltaY, top + MinimumBlurRegionRatio, 1);
                break;
            default:
                return initial;
        }

        return BlurKeyframeFromEdges(initial.Time, left, top, right, bottom);
    }

    private static TrimBlurKeyframe CenterBlurKeyframeAtPointer(
        TrimBlurKeyframe current,
        Wpf.Point pointer,
        Wpf.Rect bounds)
    {
        return current with
        {
            X = RatioX(pointer, bounds) - current.Width / 2,
            Y = RatioY(pointer, bounds) - current.Height / 2
        };
    }

    private static TrimBlurKeyframe BlurKeyframeFromEdges(
        TimeSpan time,
        double left,
        double top,
        double right,
        double bottom)
    {
        return new TrimBlurKeyframe(
            time,
            left,
            top,
            Math.Max(MinimumBlurRegionRatio, right - left),
            Math.Max(MinimumBlurRegionRatio, bottom - top)).Clamp();
    }

    private static Wpf.Rect BlurFrameRect(TrimBlurKeyframe keyframe, Wpf.Rect bounds)
    {
        var frame = keyframe.Clamp();
        return new Wpf.Rect(
            bounds.Left + frame.X * bounds.Width,
            bounds.Top + frame.Y * bounds.Height,
            frame.Width * bounds.Width,
            frame.Height * bounds.Height);
    }

    private static bool NearPoint(Wpf.Point point, double x, double y, double distance)
    {
        return Math.Abs(point.X - x) <= distance && Math.Abs(point.Y - y) <= distance;
    }

    private static double RatioX(Wpf.Point point, Wpf.Rect bounds)
    {
        return Math.Clamp((point.X - bounds.Left) / Math.Max(1, bounds.Width), 0, 1);
    }

    private static double RatioY(Wpf.Point point, Wpf.Rect bounds)
    {
        return Math.Clamp((point.Y - bounds.Top) / Math.Max(1, bounds.Height), 0, 1);
    }

    private static TrimBlurKeyframe DefaultBlurKeyframe(TimeSpan time)
    {
        return new TrimBlurKeyframe(time, 0.36, 0.28, 0.28, 0.22);
    }

    private TrimBlurShape CurrentBlurShape()
    {
        return BlurShapeFromLabel(LoaderlyLanguage.EnglishFor(blurShapeComboBox.SelectedText));
    }

    private int CurrentBlurStrength()
    {
        return BlurStrengthFromLabel(LoaderlyLanguage.EnglishFor(blurStrengthComboBox.SelectedText));
    }

    private double CurrentZoomScale()
    {
        return ZoomScaleFromLabel(LoaderlyLanguage.EnglishFor(zoomScaleComboBox.SelectedText));
    }

    private static EditableBlurKeyframe ToEditableBlurKeyframe(TrimBlurKeyframe keyframe)
    {
        return new EditableBlurKeyframe(
            SecondsToUnits(keyframe.Time.TotalSeconds, int.MaxValue),
            keyframe.X,
            keyframe.Y,
            keyframe.Width,
            keyframe.Height);
    }

    private void SelectSegment(int index)
    {
        if (trimSegments.Count == 0)
        {
            return;
        }

        if (index < 0)
        {
            index = trimSegments.Count - 1;
        }
        else if (index >= trimSegments.Count)
        {
            index = 0;
        }

        selectedSegmentIndex = index;
        ApplySegmentToTimeline(index);
        statusLabel.Text = CutStatusDisplayText(trimSegments.Count, selectedSegmentIndex);
    }

    private void ApplySegmentToTimeline(int index)
    {
        if (index < 0 || index >= trimSegments.Count)
        {
            return;
        }

        var segment = trimSegments[index];
        applyingSegmentSelection = true;
        updatingControls = true;
        timeline.SetRange(segment.Start, segment.End);
        timeline.PositionValue = segment.Start;
        updatingControls = false;
        applyingSegmentSelection = false;
        SeekTo(TimeSpan.FromSeconds(segment.Start / (double)TimeScale));
        UpdateSegmentControls();
        RefreshTimeLabels();
    }

    private void UpdateSelectedSegmentFromTimeline()
    {
        if (!ShouldRefreshSelectedCutOverlay(applyingSegmentSelection, selectedSegmentIndex, trimSegments.Count))
        {
            return;
        }

        var segment = trimSegments[selectedSegmentIndex];
        segment.Start = timeline.StartValue;
        segment.End = timeline.EndValue;
        selectedSegmentIndex = SortSegmentsAndIndexOf(segment);
        RefreshTimelineSegments();
        InvalidateGeneratedPreview();
        if (!isTimelineInteracting)
        {
            UpdateSegmentControls();
        }
    }

    private void ShowCutContextMenu(int segmentIndex, Point location)
    {
        if (segmentIndex < 0 || segmentIndex >= trimSegments.Count)
        {
            return;
        }

        SelectSegment(segmentIndex);
        BuildCutContextMenu();
        cutContextMenu.Show(timeline, location);
    }

    private void BuildCutContextMenu()
    {
        cutContextMenu.Items.Clear();
        cutContextMenu.BackColor = LoaderlyTheme.SurfaceMuted;
        cutContextMenu.ForeColor = LoaderlyTheme.Text;
        cutContextMenu.RightToLeft = RightToLeft;

        cutContextMenu.Items.Add(CreateCutMenuItem("Remove cut", (_, _) => RemoveSelectedCut()));
    }

    private static WinForms.ToolStripMenuItem CreateCutMenuItem(string text, EventHandler? onClick = null)
    {
        var item = new WinForms.ToolStripMenuItem(LoaderlyLanguage.Text(text))
        {
            AutoSize = false,
            Width = Math.Max(190, WinForms.TextRenderer.MeasureText(LoaderlyLanguage.Text(text), LoaderlyTheme.BodyFont(9F)).Width + 48),
            Height = 30,
            BackColor = LoaderlyTheme.SurfaceMuted,
            ForeColor = LoaderlyTheme.Text,
            Font = LoaderlyTheme.BodyFont(9F)
        };
        if (onClick is not null)
        {
            item.Click += onClick;
        }

        return item;
    }

    private int SortSegmentsAndIndexOf(EditableTrimSegment selectedSegment)
    {
        trimSegments.Sort((left, right) =>
        {
            var startCompare = left.Start.CompareTo(right.Start);
            return startCompare != 0 ? startCompare : left.End.CompareTo(right.End);
        });
        return trimSegments.IndexOf(selectedSegment);
    }

    private void UpdateSegmentControls()
    {
        if (segmentStatusLabel.IsDisposed)
        {
            return;
        }

        segmentStatusLabel.Text = CutStatusDisplayText(trimSegments.Count, selectedSegmentIndex);
        previousSegmentButton.Enabled = trimSegments.Count > 1;
        nextSegmentButton.Enabled = trimSegments.Count > 1;
        removeSegmentButton.Enabled = trimSegments.Count > 0 && selectedSegmentIndex >= 0;
        RefreshTimelineSegments();
    }

    private void RefreshTimelineSegments()
    {
        timeline.SetSegments(
            trimSegments.Select((segment, index) => new TimelineSegmentDisplay(
                segment.Start,
                segment.End,
                HasTransitionAfter: false,
                IsRemoved: true)),
            selectedSegmentIndex);
        RefreshTimelineBlurRegions();
    }

    private void RefreshTimelineBlurRegions()
    {
        var effectRegions = blurRegions
            .Select((region, index) => new TimelineBlurDisplay(
                region.Start,
                region.End,
                isEditingBlurRegion && index == selectedBlurIndex,
                $"Blur {index + 1}",
                Lane: 0))
            .Concat(zoomRegions.Select((region, index) => new TimelineBlurDisplay(
                region.Start,
                region.End,
                isEditingZoomRegion && index == selectedZoomIndex,
                $"Zoom {index + 1}",
                Lane: 1)))
            .ToList();
        var selectedEffectIndex = selectedBlurIndex >= 0 && selectedBlurIndex < blurRegions.Count
            ? selectedBlurIndex
            : selectedZoomIndex >= 0 && selectedZoomIndex < zoomRegions.Count
                ? blurRegions.Count + selectedZoomIndex
                : -1;
        timeline.SetBlurRegions(
            effectRegions,
            selectedEffectIndex);
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
        UpdateSelectedSegmentFromTimeline();
        RefreshTimeLabels();
        InvalidateGeneratedPreview();
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
        UpdateSelectedSegmentFromTimeline();
        RefreshTimeLabels();
        InvalidateGeneratedPreview();
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
            effectPreviewStopAt = null;
            StopPlayback();
            return;
        }

        effectPreviewStopAt = null;
        var resumePosition = player.Position;
        if (trimSegments.Count > 0)
        {
            resumePosition = PlaybackStartAfterCutsFor(resumePosition);
        }
        else if (resumePosition < StartTime || resumePosition >= EndTime)
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
        effectPreviewStopAt = null;
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
        if (effectPreviewStopAt is { } previewEnd && player.Position >= previewEnd)
        {
            effectPreviewStopAt = null;
            StopPlayback();
            SeekTo(previewEnd);
            return;
        }

        if (trimSegments.Count > 0)
        {
            if (NextPlaybackPositionAfterCuts(player.Position) is { } nextPosition)
            {
                SeekTo(nextPosition);
                return;
            }

            if (player.Position >= duration)
            {
                StopPlayback();
                return;
            }

            updatingControls = true;
            timeline.PositionValue = Math.Clamp(CurrentUnits(), 0, timeline.Maximum);
            updatingControls = false;
            RefreshTimeLabels();
            return;
        }

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
        var bounded = ClampTimelinePosition(position, duration);
        player.Position = bounded;

        updatingControls = true;
        timeline.PositionValue = Math.Clamp((int)Math.Round(bounded.TotalSeconds * TimeScale), 0, timeline.Maximum);
        updatingControls = false;
        RefreshTimeLabels();
    }

    private async Task RunFfmpegFrameAsync(
        TimeSpan time,
        string outputPath,
        string? videoFilter,
        CancellationToken cancellationToken)
    {
        var ffmpegPath = ToolResolver.ResolveToolPath("ffmpeg");
        var error = new StringBuilder();
        var startInfo = new ProcessStartInfo
        {
            FileName = ffmpegPath,
            UseShellExecute = false,
            RedirectStandardOutput = false,
            RedirectStandardError = true,
            CreateNoWindow = true
        };
        ToolResolver.AddToolDirectoriesToPath(startInfo);
        foreach (var argument in FrameCaptureArguments(time, outputPath, videoFilter))
        {
            startInfo.ArgumentList.Add(argument);
        }

        using var process = new Process { StartInfo = startInfo };
        var errorClosed = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
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
                    error.AppendLine(e.Data);
                }
            }
        };

        process.Start();
        process.BeginErrorReadLine();
        await ProcessRunner.WaitForExitAndStreamsAsync(
            process,
            Task.CompletedTask,
            errorClosed.Task,
            cancellationToken).ConfigureAwait(false);

        if (process.ExitCode != 0)
        {
            string message;
            lock (error)
            {
                message = error.Length == 0 ? "Could not save video frame." : error.ToString().Trim();
            }

            throw new InvalidOperationException(message);
        }
    }

    private IEnumerable<string> FrameCaptureArguments(TimeSpan time, string outputPath, string? videoFilter)
    {
        yield return "-v";
        yield return "error";
        yield return "-y";
        yield return "-ss";
        yield return FfmpegTime(time);
        yield return "-i";
        yield return sourceFilePath;
        yield return "-frames:v";
        yield return "1";
        if (!string.IsNullOrWhiteSpace(videoFilter))
        {
            yield return "-vf";
            yield return videoFilter;
        }

        yield return "-update";
        yield return "1";
        yield return outputPath;
    }

    private async Task SaveSnapshotAsync()
    {
        if (duration <= TimeSpan.Zero || exportCancellation is not null)
        {
            SetStatus("Video is not ready yet.");
            return;
        }

        var captureTime = ClampTimelinePosition(player.Position, duration);
        var outputPath = SnapshotPathFor(sourceFilePath, captureTime);
        snapshotButton.Enabled = false;
        SetStatus("Saving snapshot...");
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(outputPath)!);
            await RunFfmpegFrameAsync(captureTime, outputPath, SnapshotBlurFilter(captureTime), CancellationToken.None);
            LastSnapshotFilePath = outputPath;
            SetStatus(SnapshotSavedStatus(outputPath));
            ShowExportResult(outputPath, copied: false, snapshot: true);
        }
        catch (Exception ex)
        {
            DeleteTemporaryFile(outputPath);
            SetStatus(ex.Message);
        }
        finally
        {
            snapshotButton.Enabled = exportCancellation is null;
        }
    }

    private static string SnapshotPathFor(string sourceFilePath, TimeSpan time)
    {
        var folder = Path.GetDirectoryName(sourceFilePath) ?? Environment.CurrentDirectory;
        var baseName = SanitizeFileName(Path.GetFileNameWithoutExtension(sourceFilePath));
        var seconds = Math.Max(0, (int)Math.Round(time.TotalSeconds));
        var candidate = Path.Combine(folder, $"{baseName} snapshot {seconds}s.png");
        if (!File.Exists(candidate))
        {
            return candidate;
        }

        for (var index = 2; index < 1000; index++)
        {
            candidate = Path.Combine(folder, $"{baseName} snapshot {seconds}s ({index}).png");
            if (!File.Exists(candidate))
            {
                return candidate;
            }
        }

        return Path.Combine(folder, $"{baseName} snapshot {seconds}s {Guid.NewGuid():N}.png");
    }

    private static string SanitizeFileName(string fileName)
    {
        var invalid = Path.GetInvalidFileNameChars();
        var builder = new StringBuilder(fileName.Length);
        foreach (var character in fileName)
        {
            builder.Append(invalid.Contains(character) ? '_' : character);
        }

        return builder.Length == 0 ? "snapshot" : builder.ToString();
    }

    private string? SnapshotBlurFilter(TimeSpan time)
    {
        var activeRegions = TrimBlurRegion.NormalizeMany(CurrentBlurRegions())
            .Where(region => time >= region.Start && time <= region.End)
            .ToList();
        if (activeRegions.Count == 0)
        {
            return null;
        }

        var filters = new List<string>();
        var currentLabel = string.Empty;
        for (var index = 0; index < activeRegions.Count; index++)
        {
            var region = activeRegions[index];
            var frame = region.FrameAt(time).Clamp();
            var baseLabel = $"snap{index}base";
            var cropLabel = $"snap{index}crop";
            var effectLabel = $"snap{index}fx";
            var outputLabel = index == activeRegions.Count - 1 ? string.Empty : $"[snap{index}out]";
            var input = currentLabel.Length == 0 ? string.Empty : $"[{currentLabel}]";
            filters.Add(string.Concat(
                input,
                "split[",
                baseLabel,
                "][",
                cropLabel,
                "];[",
                cropLabel,
                "]crop=w='max(2,iw*",
                FilterRatio(frame.Width),
                ")':h='max(2,ih*",
                FilterRatio(frame.Height),
                ")':x='min(max(0,iw*",
                FilterRatio(frame.X),
                "),iw-iw*",
                FilterRatio(frame.Width),
                ")':y='min(max(0,ih*",
                FilterRatio(frame.Y),
                "),ih-ih*",
                FilterRatio(frame.Height),
                ")',",
                SnapshotBlurEffectFilter(region.Shape, region.Strength),
                "[",
                effectLabel,
                "];[",
                baseLabel,
                "][",
                effectLabel,
                "]overlay=x='min(max(0,main_w*",
                FilterRatio(frame.X),
                "),main_w-overlay_w)':y='min(max(0,main_h*",
                FilterRatio(frame.Y),
                "),main_h-overlay_h)'",
                outputLabel));
            currentLabel = $"snap{index}out";
        }

        return string.Join(';', filters);
    }

    private static string SnapshotBlurEffectFilter(TrimBlurShape shape, int strength)
    {
        var normalizedStrength = Math.Clamp(strength, 1, 40);
        return shape switch
        {
            TrimBlurShape.Pixelate => $"pixelize=w={Math.Clamp(normalizedStrength, 4, 32)}:h={Math.Clamp(normalizedStrength, 4, 32)}:m=avg",
            TrimBlurShape.Soft => $"gblur=sigma={Math.Clamp(normalizedStrength / 1.25, 2, 28).ToString("0.###", CultureInfo.InvariantCulture)}",
            _ => $"boxblur=luma_radius={Math.Clamp((int)Math.Round(normalizedStrength / 2.4), 3, 18)}:luma_power=2"
        };
    }

    private static string FilterRatio(double value)
    {
        if (double.IsNaN(value) || double.IsInfinity(value))
        {
            return "0";
        }

        return Math.Clamp(value, 0, 1).ToString("0.######", CultureInfo.InvariantCulture);
    }

    private async Task ExportAsync(bool copyToClipboard)
    {
        if (duration <= TimeSpan.Zero)
        {
            SetStatus("Video is not ready yet.");
            return;
        }

        var copiedClip = false;
        string? completedPath = null;
        var completedCopy = false;
        var composition = CurrentComposition();
        var outputPath = copyToClipboard
            ? trimService.TemporaryPathForCopy()
            : PromptExportOutputPath(composition);
        if (string.IsNullOrWhiteSpace(outputPath))
        {
            return;
        }

        PausePreviewForExport();
        exportCancellation = new CancellationTokenSource();
        SetExporting(true);

        try
        {
            var exportedPath = await trimService.ExportCompositionAsync(
                sourceFilePath,
                composition,
                outputPath,
                CurrentExportOptions(),
                exportCancellation.Token);
            var sidecarPath = WriteSidecarSubtitlesIfNeeded(exportedPath, composition);

            if (copyToClipboard)
            {
                CopyFilesToClipboard(sidecarPath is null ? [exportedPath] : [exportedPath, sidecarPath]);
                copiedClip = true;
                completedCopy = true;
                completedPath = exportedPath;
                SetStatus("Clip exported and copied.");
            }
            else
            {
                LastSavedFilePath = exportedPath;
                completedPath = exportedPath;
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

        if (!string.IsNullOrWhiteSpace(completedPath) && File.Exists(completedPath))
        {
            ShowExportResult(completedPath, completedCopy, snapshot: false);
        }
    }

    private string? PromptExportOutputPath(TrimComposition composition)
    {
        var defaultName = TrimExportService.DefaultFileNameFor(sourceFilePath, composition);
        using var form = new ExportNameForm(defaultName);
        form.Icon = LoaderlyAssets.AppIcon;
        if (form.ShowDialog(this) != WinForms.DialogResult.OK)
        {
            return null;
        }

        return trimService.SavePathFor(sourceFilePath, composition, form.ExportName);
    }

    private void ShowExportResult(string filePath, bool copied, bool snapshot)
    {
        using var form = new ExportResultForm(filePath, copied, snapshot);
        form.Icon = LoaderlyAssets.AppIcon;
        form.ShowDialog(this);
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
        undoButton.Enabled = !isExporting && undoStack.Count > 0;
        redoButton.Enabled = !isExporting && redoStack.Count > 0;
        snapshotButton.Enabled = !isExporting;
        setStartButton.Enabled = !isExporting;
        setEndButton.Enabled = !isExporting;
        frameBackButton.Enabled = !isExporting;
        frameForwardButton.Enabled = !isExporting;
        resetButton.Enabled = !isExporting;
        addSegmentButton.Enabled = !isExporting;
        keepOnlyButton.Enabled = !isExporting;
        previousSegmentButton.Enabled = !isExporting && trimSegments.Count > 1;
        nextSegmentButton.Enabled = !isExporting && trimSegments.Count > 1;
        removeSegmentButton.Enabled = !isExporting && trimSegments.Count > 0 && selectedSegmentIndex >= 0;
        addBlurButton.Enabled = !isExporting;
        blurStartAtPlayheadButton.Enabled = !isExporting && selectedBlurIndex >= 0 && selectedBlurIndex < blurRegions.Count;
        blurEndAtPlayheadButton.Enabled = !isExporting && selectedBlurIndex >= 0 && selectedBlurIndex < blurRegions.Count;
        blurPreviewButton.Enabled = !isExporting && selectedBlurIndex >= 0 && selectedBlurIndex < blurRegions.Count;
        keyframeBlurButton.Enabled = !isExporting && selectedBlurIndex >= 0 && selectedBlurIndex < blurRegions.Count;
        autoFollowBlurButton.Enabled = !isExporting && selectedBlurIndex >= 0 && selectedBlurIndex < blurRegions.Count;
        removeBlurButton.Enabled = !isExporting && selectedBlurIndex >= 0 && selectedBlurIndex < blurRegions.Count;
        blurShapeComboBox.Enabled = !isExporting && selectedBlurIndex >= 0 && selectedBlurIndex < blurRegions.Count;
        blurStrengthComboBox.Enabled = !isExporting && selectedBlurIndex >= 0 && selectedBlurIndex < blurRegions.Count;
        addZoomButton.Enabled = !isExporting;
        zoomStartAtPlayheadButton.Enabled = !isExporting && selectedZoomIndex >= 0 && selectedZoomIndex < zoomRegions.Count;
        zoomEndAtPlayheadButton.Enabled = !isExporting && selectedZoomIndex >= 0 && selectedZoomIndex < zoomRegions.Count;
        zoomPreviewButton.Enabled = !isExporting && selectedZoomIndex >= 0 && selectedZoomIndex < zoomRegions.Count;
        keyframeZoomButton.Enabled = !isExporting && selectedZoomIndex >= 0 && selectedZoomIndex < zoomRegions.Count;
        autoFollowZoomButton.Enabled = !isExporting && selectedZoomIndex >= 0 && selectedZoomIndex < zoomRegions.Count;
        removeZoomButton.Enabled = !isExporting && selectedZoomIndex >= 0 && selectedZoomIndex < zoomRegions.Count;
        zoomScaleComboBox.Enabled = !isExporting && selectedZoomIndex >= 0 && selectedZoomIndex < zoomRegions.Count;
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
        else
        {
            UpdateSegmentControls();
            UpdateBlurControls();
            UpdateZoomControls();
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

    private void InvalidateGeneratedPreview()
    {
        InvalidateBlurPreview();
        blurPreviewLastRequestUtc = DateTime.MinValue;
        if (!IsHandleCreated || IsDisposed)
        {
            return;
        }

        try
        {
            BeginInvoke((Action)UpdateBlurOverlay);
        }
        catch
        {
        }
    }

    private void CancelTransitionPreviewWork()
    {
    }

    private void InvalidateBlurPreview()
    {
        blurPreviewCancellation?.Cancel();
        blurPreviewRenderedKey = null;
        blurPreviewRenderedBrush = null;
        blurPreviewGeneration++;
        DeleteTemporaryFile(blurPreviewImagePath);
        blurPreviewImagePath = null;
    }

    internal static bool ShouldCreateSubtitlePreviewClipForTest(TimeSpan start, TimeSpan end, TimeSpan duration)
    {
        return ShouldCreateSubtitlePreviewClip(start, end, duration);
    }

    internal static TrimComposition? TransitionPreviewCompositionForTest(
        TimeSpan cutStart,
        TimeSpan cutEnd,
        TimeSpan sourceDuration,
        TrimTransitionKind transition)
    {
        return BuildTransitionPreviewComposition(cutStart, cutEnd, sourceDuration, transition);
    }

    private static bool ShouldCreateSubtitlePreviewClip(TimeSpan start, TimeSpan end, TimeSpan duration)
    {
        return false;
    }

    private static TrimComposition? BuildTransitionPreviewComposition(
        TimeSpan cutStart,
        TimeSpan cutEnd,
        TimeSpan sourceDuration,
        TrimTransitionKind transition)
    {
        if (transition == TrimTransitionKind.None ||
            sourceDuration <= TimeSpan.Zero ||
            cutStart <= TimeSpan.Zero ||
            cutEnd >= sourceDuration ||
            cutEnd <= cutStart)
        {
            return null;
        }

        var handle = TimeSpan.FromSeconds(TransitionPreviewHandleSeconds);
        var firstStart = cutStart - handle;
        if (firstStart < TimeSpan.Zero)
        {
            firstStart = TimeSpan.Zero;
        }

        var secondEnd = cutEnd + handle;
        if (secondEnd > sourceDuration)
        {
            secondEnd = sourceDuration;
        }

        var first = new TrimSegment(firstStart, cutStart);
        var second = new TrimSegment(cutEnd, secondEnd);
        if (first.Duration < TimeSpan.FromMilliseconds(250) ||
            second.Duration < TimeSpan.FromMilliseconds(250) ||
            TrimComposition.EffectiveTransitionDuration(first, second, transition) <= TimeSpan.Zero)
        {
            return null;
        }

        return TrimComposition.Normalize([first, second], [transition]);
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

        if (ShouldRedoShortcut(keyData, settings.TrimRedoShortcut))
        {
            RedoTrimChange();
            return true;
        }

        if (ShouldRemoveSelectedBlurShortcut(keyData, selectedBlurIndex, blurRegions.Count))
        {
            RemoveSelectedBlur();
            return true;
        }

        if (ShouldRemoveSelectedZoomShortcut(keyData, selectedZoomIndex, zoomRegions.Count))
        {
            RemoveSelectedZoom();
            return true;
        }

        if (ShouldRemoveSelectedCutShortcut(keyData, selectedSegmentIndex, trimSegments.Count))
        {
            RemoveSelectedCut();
            return true;
        }

        if (ShouldSetSelectedEffectStartShortcut(
            keyData,
            selectedBlurIndex,
            blurRegions.Count,
            selectedZoomIndex,
            zoomRegions.Count))
        {
            SetSelectedEffectStartAtPlayhead();
            return true;
        }

        if (ShouldSetSelectedEffectEndShortcut(
            keyData,
            selectedBlurIndex,
            blurRegions.Count,
            selectedZoomIndex,
            zoomRegions.Count))
        {
            SetSelectedEffectEndAtPlayhead();
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
                StepFrame(-1, deferPreviewSeek: true);
            }
            else if (ctrl)
            {
                SetStartAtPlayhead();
            }
            else
            {
                SeekRelative(KeyboardSeekSecondsForShortcut(keyData) ?? -0.25, deferPreviewSeek: true);
            }

            return true;
        }

        if (keyCode == WinForms.Keys.Right)
        {
            if (ctrl && shift)
            {
                StepFrame(1, deferPreviewSeek: true);
            }
            else if (ctrl)
            {
                SetEndAtPlayhead();
            }
            else
            {
                SeekRelative(KeyboardSeekSecondsForShortcut(keyData) ?? 0.25, deferPreviewSeek: true);
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

    private void SeekRelative(double seconds, bool deferPreviewSeek = false)
    {
        if (duration <= TimeSpan.Zero)
        {
            return;
        }

        var nextPosition = KeyboardSeekTarget(player.Position, pendingKeyboardSeek, TimeSpan.FromSeconds(seconds), duration);
        if (deferPreviewSeek)
        {
            QueueKeyboardSeek(nextPosition);
            return;
        }

        SeekTo(nextPosition);
    }

    private void StepFrame(int direction, bool deferPreviewSeek = false)
    {
        if (duration <= TimeSpan.Zero)
        {
            return;
        }

        if (!deferPreviewSeek && playbackTimer.Enabled)
        {
            PausePreviewForRangeEdit();
        }

        var nextPosition = KeyboardSeekTarget(player.Position, pendingKeyboardSeek, TimeSpan.FromSeconds(direction / 30.0), duration);
        if (deferPreviewSeek)
        {
            QueueKeyboardSeek(nextPosition);
            return;
        }

        SeekTo(nextPosition);
    }

    private void ResetTrim()
    {
        if (duration <= TimeSpan.Zero)
        {
            return;
        }

        PushUndoSnapshot(CaptureSnapshot());
        trimSegments.Clear();
        blurRegions.Clear();
        zoomRegions.Clear();
        selectedSegmentIndex = -1;
        selectedBlurIndex = -1;
        selectedZoomIndex = -1;
        updatingControls = true;
        timeline.SetRange(0, timeline.Maximum);
        timeline.PositionValue = 0;
        updatingControls = false;
        SeekTo(TimeSpan.Zero);
        UpdateSegmentControls();
        UpdateBlurControls();
        UpdateZoomControls();
        InvalidateGeneratedPreview();
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
        return new TrimExportOptions(
            muteCheckBox.Checked,
            quality,
            CurrentSubtitleBurnInOptions(),
            CurrentBlurRegions(),
            CurrentZoomRegions());
    }

    private TrimComposition CurrentComposition()
    {
        if (trimSegments.Count == 0)
        {
            return TrimComposition.Normalize([new TrimSegment(StartTime, EndTime)]);
        }

        return TrimComposition.FromDeletedRanges(
            TimeSpan.Zero,
            duration,
            trimSegments.Select(cut => new TrimCutRange(
                TimeFromUnits(cut.Start),
                TimeFromUnits(cut.End),
                TrimTransitionKind.None)));
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

    private string? WriteSidecarSubtitlesIfNeeded(string exportedPath, TrimComposition composition)
    {
        if (!IsSidecarSubtitleMode(subtitleExportComboBox.SelectedText) ||
            subtitleCues.Count == 0 ||
            string.IsNullOrWhiteSpace(subtitleFilePath))
        {
            return null;
        }

        var sidecarPath = Path.ChangeExtension(exportedPath, ".srt");
        var sidecarText = composition.Segments.Count == 1
            ? BuildSidecarSubtitleText(subtitleCues, composition.Segments[0].Start, composition.Segments[0].End, sidecarPath)
            : SrtSubtitleService.FormatForPath(
                TrimComposition.RetimeSubtitleCues(subtitleCues, composition),
                sidecarPath);
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
        if (SnapshotsEqual(before, after))
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

        if (undoStack.Count > 0 && SnapshotsEqual(undoStack.Peek(), snapshot))
        {
            return;
        }

        undoStack.Push(snapshot);
        redoStack.Clear();
        UpdateUndoRedoButtons();
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
        UpdateUndoRedoButtons();
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
        UpdateUndoRedoButtons();
        SetStatus("Redo.");
    }

    private void UpdateUndoRedoButtons()
    {
        if (undoButton.IsDisposed || redoButton.IsDisposed)
        {
            return;
        }

        var canEdit = exportCancellation is null;
        undoButton.Enabled = canEdit && undoStack.Count > 0;
        redoButton.Enabled = canEdit && redoStack.Count > 0;
    }

    private TrimSnapshot CaptureSnapshot()
    {
        return new TrimSnapshot(
            timeline.StartValue,
            timeline.EndValue,
            timeline.PositionValue,
            trimSegments.Select(segment => segment.Clone()).ToList(),
            selectedSegmentIndex,
            blurRegions.Select(region => region.Clone()).ToList(),
            selectedBlurIndex,
            zoomRegions.Select(region => region.Clone()).ToList(),
            selectedZoomIndex);
    }

    private IReadOnlyList<TrimBlurRegion> CurrentBlurRegions()
    {
        return blurRegions
            .Select(region => region.ToRegion())
            .ToList();
    }

    private IReadOnlyList<TrimZoomRegion> CurrentZoomRegions()
    {
        return zoomRegions
            .Select(region => region.ToRegion())
            .ToList();
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
        trimSegments.Clear();
        trimSegments.AddRange(snapshot.Segments.Select(segment => segment.Clone()));
        blurRegions.Clear();
        blurRegions.AddRange(snapshot.BlurRegions.Select(region => region.Clone()));
        zoomRegions.Clear();
        zoomRegions.AddRange(snapshot.ZoomRegions.Select(region => region.Clone()));
        selectedSegmentIndex = snapshot.SelectedSegmentIndex >= 0 && snapshot.SelectedSegmentIndex < trimSegments.Count
            ? snapshot.SelectedSegmentIndex
            : trimSegments.Count == 0 ? -1 : 0;
        selectedBlurIndex = snapshot.SelectedBlurIndex >= 0 && snapshot.SelectedBlurIndex < blurRegions.Count
            ? snapshot.SelectedBlurIndex
            : blurRegions.Count == 0 ? -1 : 0;
        selectedZoomIndex = snapshot.SelectedZoomIndex >= 0 && snapshot.SelectedZoomIndex < zoomRegions.Count
            ? snapshot.SelectedZoomIndex
            : zoomRegions.Count == 0 ? -1 : 0;
        isEditingBlurRegion = false;
        isEditingZoomRegion = false;
        updatingControls = false;
        SeekTo(TimeSpan.FromSeconds(snapshot.Position / (double)TimeScale));
        UpdateSegmentControls();
        UpdateBlurControls();
        UpdateZoomControls();
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
        if (trimSegments.Count > 0)
        {
            resumePosition = PlaybackStartAfterCutsFor(resumePosition);
        }
        else if (resumePosition < StartTime || resumePosition >= EndTime)
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

    private void QueueKeyboardSeek(TimeSpan position)
    {
        if (duration <= TimeSpan.Zero)
        {
            return;
        }

        if (playbackTimer.Enabled && !resumeAfterKeyboardSeek)
        {
            PausePreviewForRangeEdit();
            resumeAfterKeyboardSeek = true;
        }

        var bounded = ClampTimelinePosition(position, duration);
        pendingKeyboardSeek = bounded;

        updatingControls = true;
        timeline.PositionValue = Math.Clamp((int)Math.Round(bounded.TotalSeconds * TimeScale), 0, timeline.Maximum);
        updatingControls = false;
        RefreshTimeLabels();

        keyboardSeekTimer.Stop();
        keyboardSeekTimer.Start();
    }

    private void CommitPendingKeyboardSeek()
    {
        keyboardSeekTimer.Stop();
        if (pendingKeyboardSeek is not { } position)
        {
            return;
        }

        var shouldResume = resumeAfterKeyboardSeek;
        pendingKeyboardSeek = null;
        resumeAfterKeyboardSeek = false;
        SeekTo(position);
        SaveTrimState();

        if (shouldResume && exportCancellation is null)
        {
            ResumePreviewAfterRangeEdit();
        }
    }

    private static bool SnapshotsEqual(TrimSnapshot left, TrimSnapshot right)
    {
        if (left.Start != right.Start ||
            left.End != right.End ||
            left.Position != right.Position ||
            left.SelectedSegmentIndex != right.SelectedSegmentIndex ||
            left.SelectedBlurIndex != right.SelectedBlurIndex ||
            left.SelectedZoomIndex != right.SelectedZoomIndex ||
            left.Segments.Count != right.Segments.Count)
        {
            return false;
        }

        for (var index = 0; index < left.Segments.Count; index++)
        {
            if (!left.Segments[index].SameAs(right.Segments[index]))
            {
                return false;
            }
        }

        if (left.BlurRegions.Count != right.BlurRegions.Count)
        {
            return false;
        }

        for (var index = 0; index < left.BlurRegions.Count; index++)
        {
            if (!left.BlurRegions[index].SameAs(right.BlurRegions[index]))
            {
                return false;
            }
        }

        if (left.ZoomRegions.Count != right.ZoomRegions.Count)
        {
            return false;
        }

        for (var index = 0; index < left.ZoomRegions.Count; index++)
        {
            if (!left.ZoomRegions[index].SameAs(right.ZoomRegions[index]))
            {
                return false;
            }
        }

        return true;
    }

    private TimeSpan PlaybackStartAfterCutsFor(TimeSpan position)
    {
        if (trimSegments.Count == 0)
        {
            return StartTime;
        }

        if (position >= duration)
        {
            return TimeSpan.Zero;
        }

        if (IsInsideAnyCut(position) && NextPlaybackPositionAfterCuts(position) is { } nextPosition)
        {
            return nextPosition;
        }

        return position < TimeSpan.Zero ? TimeSpan.Zero : position;
    }

    private bool IsInsideAnyCut(TimeSpan position)
    {
        var units = SecondsToUnits(position.TotalSeconds, timeline.Maximum);
        return trimSegments.Any(segment => units >= segment.Start && units < segment.End);
    }

    private TimeSpan? NextPlaybackPositionAfterCuts(TimeSpan position)
    {
        var units = SecondsToUnits(position.TotalSeconds, timeline.Maximum);
        foreach (var cut in trimSegments)
        {
            if (units >= cut.Start && units < cut.End)
            {
                return TimeFromUnits(cut.End);
            }
        }

        return null;
    }

    private void RefreshTimeLabels()
    {
        var timelinePosition = TimeFromUnits(timeline.PositionValue);
        var displayPosition = pendingKeyboardSeek ?? (playbackTimer.Enabled ? player.Position : timelinePosition);
        startValueLabel.Text = FormatDuration(StartTime);
        endValueLabel.Text = FormatDuration(EndTime);
        selectionValueLabel.Text = trimSegments.Count == 0
            ? FormatDuration(EndTime - StartTime)
            : FormatDuration(CurrentComposition().Duration);
        durationValueLabel.Text = duration > TimeSpan.Zero ? FormatDuration(duration) : "--:--";
        currentTimeLabel.Text = duration > TimeSpan.Zero
            ? $"{FormatDuration(displayPosition)} / {FormatDuration(duration)}"
            : "0:00 / --:--";
        UpdateSubtitleOverlay(displayPosition);
        UpdateBlurOverlay();
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
        ApplySubtitleOverlayDirection(text);
        subtitleTextBlock.Text = text;
        subtitleOverlay.Visibility = string.IsNullOrWhiteSpace(text)
            ? Wpf.Visibility.Collapsed
            : Wpf.Visibility.Visible;
    }

    private int CurrentUnits()
    {
        var position = pendingKeyboardSeek ?? player.Position;
        return Math.Clamp((int)Math.Round(position.TotalSeconds * TimeScale), 0, timeline.Maximum);
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
            trimStateStore.Save(
                sourceFilePath,
                StartTime,
                EndTime,
                TimeSpan.FromSeconds(positionSeconds),
                trimSegments.Select(cut => new TrimCutRange(
                    TimeFromUnits(cut.Start),
                    TimeFromUnits(cut.End),
                    TrimTransitionKind.None)),
                selectedSegmentIndex,
                CurrentBlurRegions(),
                selectedBlurIndex,
                sourceDuration: duration,
                zoomRegions: CurrentZoomRegions(),
                selectedZoomIndex: selectedZoomIndex);
        }
        catch
        {
        }
    }

    private static TrimTransitionKind TransitionFromSavedValue(string? value)
    {
        return TrimTransitionKind.None;
    }

    private static TrimBlurShape BlurShapeFromSavedValue(string? value)
    {
        return Enum.TryParse<TrimBlurShape>(value, ignoreCase: true, out var shape)
            ? shape
            : TrimBlurShape.Box;
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

    private static TimeSpan TimeFromUnits(int units)
    {
        return TimeSpan.FromSeconds(units / (double)TimeScale);
    }

    internal static IReadOnlyList<string> TransitionOptionsForTest()
    {
        return TransitionOptions();
    }

    internal static bool ShouldSeekPreviewOnTimelinePositionChangeForTest(bool updatingControls, bool isTimelineInteracting)
    {
        return ShouldSeekPreviewOnTimelinePositionChange(updatingControls, isTimelineInteracting);
    }

    internal static bool ShouldSeekPreviewForTimelineRangeChangeForTest(
        bool updatingControls,
        bool isTimelineInteracting,
        int position,
        int start,
        int end)
    {
        return ShouldSeekPreviewForTimelineRangeChange(updatingControls, isTimelineInteracting, position, start, end);
    }

    internal static bool ShouldRefreshTimelineLabelsForTest(bool updatingControls, bool isTimelineInteracting)
    {
        return ShouldRefreshTimelineLabels(updatingControls, isTimelineInteracting);
    }

    internal static string KeyboardSeekTargetForTest(
        TimeSpan currentPosition,
        TimeSpan? pendingPosition,
        TimeSpan delta,
        TimeSpan duration)
    {
        return FormatDuration(KeyboardSeekTarget(currentPosition, pendingPosition, delta, duration));
    }

    internal static string NewCutRangeAtPlayheadForTest(
        int playhead,
        int maximum,
        IEnumerable<TimelineSegmentDisplay> existingCuts)
    {
        var range = NewTimelineItemRangeAtPlayhead(
            playhead,
            maximum,
            existingCuts
                .Where(cut => cut.IsRemoved || cut.BlocksSelection)
                .Select(cut => (cut.Start, cut.End)));
        return $"{range.Start}-{range.End}";
    }

    internal static string NewBlurRangeAtPlayheadForTest(
        int playhead,
        int maximum,
        IEnumerable<TimelineBlurDisplay> existingBlurs)
    {
        var range = NewTimelineItemRangeAtPlayhead(
            playhead,
            maximum,
            existingBlurs.Select(blur => (blur.Start, blur.End)));
        return $"{range.Start}-{range.End}";
    }

    internal static string NewZoomRangeAtPlayheadForTest(
        int playhead,
        int maximum,
        IEnumerable<TimelineBlurDisplay> existingZooms)
    {
        var range = NewTimelineItemRangeAtPlayhead(
            playhead,
            maximum,
            existingZooms.Select(zoom => (zoom.Start, zoom.End)));
        return $"{range.Start}-{range.End}";
    }

    internal static double KeyboardSeekSecondsForShortcutForTest(WinForms.Keys keyData)
    {
        return KeyboardSeekSecondsForShortcut(keyData) ?? 0;
    }

    internal static bool ShouldRemoveSelectedCutShortcutForTest(
        WinForms.Keys keyData,
        int selectedSegmentIndex,
        int segmentCount)
    {
        return ShouldRemoveSelectedCutShortcut(keyData, selectedSegmentIndex, segmentCount);
    }

    internal static bool ShouldWarnBeforeClosingForTest(bool isExporting)
    {
        return ShouldWarnBeforeClosing(isExporting);
    }

    internal static bool ShouldRemoveSelectedBlurShortcutForTest(
        WinForms.Keys keyData,
        int selectedBlurIndex,
        int blurCount)
    {
        return ShouldRemoveSelectedBlurShortcut(keyData, selectedBlurIndex, blurCount);
    }

    internal static bool ShouldRemoveSelectedZoomShortcutForTest(
        WinForms.Keys keyData,
        int selectedZoomIndex,
        int zoomCount)
    {
        return ShouldRemoveSelectedZoomShortcut(keyData, selectedZoomIndex, zoomCount);
    }

    internal static bool ShouldSetSelectedEffectStartShortcutForTest(
        WinForms.Keys keyData,
        int selectedBlurIndex,
        int blurCount,
        int selectedZoomIndex,
        int zoomCount)
    {
        return ShouldSetSelectedEffectStartShortcut(keyData, selectedBlurIndex, blurCount, selectedZoomIndex, zoomCount);
    }

    internal static bool ShouldSetSelectedEffectEndShortcutForTest(
        WinForms.Keys keyData,
        int selectedBlurIndex,
        int blurCount,
        int selectedZoomIndex,
        int zoomCount)
    {
        return ShouldSetSelectedEffectEndShortcut(keyData, selectedBlurIndex, blurCount, selectedZoomIndex, zoomCount);
    }

    internal static bool ShouldRedoShortcutForTest(WinForms.Keys keyData, string? configured)
    {
        return ShouldRedoShortcut(keyData, configured);
    }

    internal static bool ShouldShowSelectedBlurOverlayForTest(int currentUnits, int start, int end)
    {
        return ShouldShowSelectedBlurOverlay(currentUnits, start, end);
    }

    internal static bool ShouldSeekToBlurStartOnSelectionForTest()
    {
        return ShouldSeekToBlurStartOnSelection();
    }

    internal static bool ShouldAutoPreviewTransitionForTest(TrimTransitionKind transition)
    {
        return ShouldAutoPreviewTransition(transition);
    }

    internal static IReadOnlyList<string> TransitionControlLabelsForTest()
    {
        return [];
    }

    internal static IReadOnlyList<string> BlurControlLabelsForTest()
    {
        return ["Blur", "Start", "End", "Preview", "Add", "Edit", "Done", "Track", "Fix", "Remove"];
    }

    internal static IReadOnlyList<string> ZoomControlLabelsForTest()
    {
        return ["Zoom", "Start", "End", "Preview", "Add", "Edit", "Done", "Follow", "Fix", "Remove"];
    }

    internal static IReadOnlyList<string> TransportActionLabelsForTest()
    {
        return ["Play selection", "Undo", "Redo", "Snapshot"];
    }

    internal static string EffectTimingTextForTest(int start, int end, bool hasMovingKeyframes)
    {
        return EffectTimingText(start, end, hasMovingKeyframes);
    }

    internal static string EffectFollowButtonTextForTest(bool hasMovingKeyframes, bool zoom)
    {
        return EffectFollowButtonText(hasMovingKeyframes, zoom);
    }

    internal static IReadOnlyList<string> EffectPresetLabelsForTest()
    {
        return [BlurStrengthOptions()[0], BlurStrengthOptions()[2], BlurStrengthOptions()[^1], ZoomScaleOptions()[0], ZoomScaleOptions()[1], ZoomScaleOptions()[^1]];
    }

    internal static string EffectPreviewRangeForTest(int start, int end)
    {
        return $"{FormatEffectTime(TimeFromUnits(start))}-{FormatEffectTime(TimeFromUnits(end))}";
    }

    internal static string BlurStatusTextForTest(int count, int selectedIndex, bool editing)
    {
        return BlurStatusDisplayText(count, selectedIndex, editing);
    }

    internal static string ZoomStatusTextForTest(int count, int selectedIndex, bool editing)
    {
        return ZoomStatusDisplayText(count, selectedIndex, editing);
    }

    internal static string BlurEditButtonTextForTest(bool editing)
    {
        return BlurEditButtonText(editing);
    }

    internal static string ZoomEditButtonTextForTest(bool editing)
    {
        return ZoomEditButtonText(editing);
    }

    internal static string ZoomPreviewTransformForTest(
        TimeSpan playhead,
        TimeSpan start,
        TimeSpan end,
        double scale,
        double x,
        double y,
        double width,
        double height,
        double boundsWidth,
        double boundsHeight)
    {
        var transform = ZoomPreviewTransform(
            playhead,
            [
                new TrimZoomRegion(
                    start,
                    end,
                    scale,
                    [new TrimBlurKeyframe(start, x, y, width, height)])
            ],
            new Wpf.Rect(0, 0, boundsWidth, boundsHeight));
        return string.Create(
            CultureInfo.InvariantCulture,
            $"{transform.Scale:0.00},{transform.TranslateX:0.00},{transform.TranslateY:0.00}");
    }

    internal static string ZoomPreviewTransformWithBoundsForTest(
        TimeSpan playhead,
        TimeSpan start,
        TimeSpan end,
        double scale,
        double x,
        double y,
        double width,
        double height,
        double boundsLeft,
        double boundsTop,
        double boundsWidth,
        double boundsHeight)
    {
        var transform = ZoomPreviewTransform(
            playhead,
            [
                new TrimZoomRegion(
                    start,
                    end,
                    scale,
                    [new TrimBlurKeyframe(start, x, y, width, height)])
            ],
            new Wpf.Rect(boundsLeft, boundsTop, boundsWidth, boundsHeight));
        return string.Create(
            CultureInfo.InvariantCulture,
            $"{transform.Scale:0.00},{transform.TranslateX:0.00},{transform.TranslateY:0.00}");
    }

    internal static string ZoomManualEditFramesForTest()
    {
        var region = new EditableZoomRegion(
            SecondsToUnits(3, int.MaxValue),
            SecondsToUnits(6, int.MaxValue),
            1.5,
            [
                new EditableBlurKeyframe(SecondsToUnits(3, int.MaxValue), 0.10, 0.20, 0.20, 0.20),
                new EditableBlurKeyframe(SecondsToUnits(4, int.MaxValue), 0.55, 0.60, 0.10, 0.10),
                new EditableBlurKeyframe(SecondsToUnits(6, int.MaxValue), 0.65, 0.70, 0.10, 0.10)
            ]);
        region.ReplaceWithFixedKeyframe(new TrimBlurKeyframe(TimeSpan.FromSeconds(4.5), 0.37, 0.38, 0.26, 0.21));
        var normalized = region.ToRegion();
        return string.Join(
            "|",
            new[] { 3.0, 4.5, 6.0 }.Select(seconds =>
            {
                var frame = normalized.FrameAt(TimeSpan.FromSeconds(seconds));
                return string.Create(
                    CultureInfo.InvariantCulture,
                    $"{frame.X:0.00},{frame.Y:0.00},{frame.Width:0.00},{frame.Height:0.00}");
            }));
    }

    internal static string ZoomManualMoveFramesForTest()
    {
        var region = new EditableZoomRegion(
            SecondsToUnits(3, int.MaxValue),
            SecondsToUnits(6, int.MaxValue),
            1.5,
            [
                new EditableBlurKeyframe(SecondsToUnits(3, int.MaxValue), 0.10, 0.20, 0.20, 0.20),
                new EditableBlurKeyframe(SecondsToUnits(6, int.MaxValue), 0.65, 0.70, 0.10, 0.10)
            ]);
        UpsertZoomOverlayKeyframe(region, new TrimBlurKeyframe(TimeSpan.FromSeconds(4.5), 0.37, 0.38, 0.26, 0.21));
        var normalized = region.ToRegion();
        return string.Join(
            "|",
            new[] { 3.0, 4.5, 6.0 }.Select(seconds =>
            {
                var frame = normalized.FrameAt(TimeSpan.FromSeconds(seconds));
                return string.Create(
                    CultureInfo.InvariantCulture,
                    $"{frame.X:0.00},{frame.Y:0.00},{frame.Width:0.00},{frame.Height:0.00}");
            }));
    }

    internal static string BlurManualEditFramesForTest()
    {
        var region = new EditableBlurRegion(
            SecondsToUnits(3, int.MaxValue),
            SecondsToUnits(6, int.MaxValue),
            TrimBlurShape.Box,
            22,
            [
                new EditableBlurKeyframe(SecondsToUnits(3, int.MaxValue), 0.10, 0.20, 0.20, 0.20),
                new EditableBlurKeyframe(SecondsToUnits(4, int.MaxValue), 0.55, 0.60, 0.10, 0.10),
                new EditableBlurKeyframe(SecondsToUnits(6, int.MaxValue), 0.65, 0.70, 0.10, 0.10)
            ]);
        region.ReplaceWithFixedKeyframe(new TrimBlurKeyframe(TimeSpan.FromSeconds(4.5), 0.37, 0.38, 0.26, 0.21));
        var normalized = region.ToRegion();
        return string.Join(
            "|",
            new[] { 3.0, 4.5, 6.0 }.Select(seconds =>
            {
                var frame = normalized.FrameAt(TimeSpan.FromSeconds(seconds));
                return string.Create(
                    CultureInfo.InvariantCulture,
                    $"{frame.X:0.00},{frame.Y:0.00},{frame.Width:0.00},{frame.Height:0.00}");
            }));
    }

    internal static string BlurDragModeForTest(double pointerX, double pointerY, double x, double y, double width, double height)
    {
        return BlurDragModeForPointer(
            new Wpf.Point(pointerX, pointerY),
            new TrimBlurKeyframe(TimeSpan.Zero, x, y, width, height),
            new Wpf.Rect(0, 0, 1000, 1000)).ToString();
    }

    internal static string BlurDragKeyframeForTest(
        string mode,
        double dragStartX,
        double dragStartY,
        double pointerX,
        double pointerY)
    {
        var keyframe = DragBlurKeyframe(
            new TrimBlurKeyframe(TimeSpan.Zero, 0.2, 0.25, 0.3, 0.2),
            new Wpf.Point(dragStartX, dragStartY),
            new Wpf.Point(pointerX, pointerY),
            new Wpf.Rect(0, 0, 1000, 1000),
            Enum.Parse<BlurOverlayDragMode>(mode));
        return string.Create(
            CultureInfo.InvariantCulture,
            $"{keyframe.X:0.00},{keyframe.Y:0.00},{keyframe.Width:0.00},{keyframe.Height:0.00}");
    }

    internal static string BlurPreviewFilterForTest(TrimBlurShape shape, int strength, int width, int height)
    {
        return PreviewBlurFilter(new BlurPreviewKey(
            shape,
            strength,
            TimeUnits: 0,
            SourceWidth: width,
            SourceHeight: height,
            X: 10,
            Y: 20,
            Width: width,
            Height: height));
    }

    internal static bool ShouldRefreshSelectedCutOverlayForTest(bool applyingSegmentSelection, int selectedSegmentIndex, int segmentCount)
    {
        return ShouldRefreshSelectedCutOverlay(applyingSegmentSelection, selectedSegmentIndex, segmentCount);
    }

    internal static string CutStatusTextForTest(int cutCount, int selectedIndex)
    {
        return CutStatusText(cutCount, selectedIndex);
    }

    internal static IReadOnlyList<string> CutActionLabelsForTest()
    {
        return CutActionLabels();
    }

    internal static IReadOnlyList<string> CutContextRootActionLabelsForTest()
    {
        return CutContextRootActionLabels();
    }

    internal static IReadOnlyList<string> CutContextTransitionLabelsForTest()
    {
        return [];
    }

    private static IReadOnlyList<string> TrimEditTabLabels()
    {
        return ["Cuts", "Subtitles", "Blur", "Zoom"];
    }

    internal static string CutContextTransitionHeaderForTest(TrimTransitionKind transition)
    {
        return CutContextTransitionHeader(transition);
    }

    private static string[] TransitionOptions()
    {
        return [TrimComposition.TransitionLabel(TrimTransitionKind.None)];
    }

    private static string[] BlurShapeOptions()
    {
        return ["Box blur", "Soft blur", "Pixelate"];
    }

    private static string[] BlurStrengthOptions()
    {
        return ["Light 8", "Soft 14", "Clean 22", "Strong 32", "Heavy 40"];
    }

    private static string[] ZoomScaleOptions()
    {
        return ["1.5x", "2x", "2.5x", "3x", "4x"];
    }

    private static string BlurStatusDisplayText(int count, int selectedIndex, bool editing)
    {
        if (count <= 0)
        {
            return LoaderlyLanguage.Text("No blur");
        }

        if (selectedIndex < 0 || selectedIndex >= count)
        {
            if (LoaderlyLanguage.IsArabic)
            {
                return count == 1 ? "بلور واحد" : $"{count} بلور";
            }

            return count == 1 ? "1 blur" : $"{count} blurs";
        }

        var normalizedIndex = selectedIndex >= 0 && selectedIndex < count ? selectedIndex : 0;
        if (LoaderlyLanguage.IsArabic)
        {
            return $"بلور {normalizedIndex + 1}/{count} - {(editing ? "تعديل" : "ثابت")}";
        }

        return $"Blur {normalizedIndex + 1} of {count} - {(editing ? "editing" : "fixed")}";
    }

    private static string ZoomStatusDisplayText(int count, int selectedIndex, bool editing)
    {
        if (count <= 0)
        {
            return LoaderlyLanguage.Text("No zoom");
        }

        if (selectedIndex < 0 || selectedIndex >= count)
        {
            if (LoaderlyLanguage.IsArabic)
            {
                return count == 1 ? "Ø²ÙˆÙ… ÙˆØ§Ø­Ø¯" : $"{count} Ø²ÙˆÙ…";
            }

            return count == 1 ? "1 zoom" : $"{count} zooms";
        }

        var normalizedIndex = selectedIndex >= 0 && selectedIndex < count ? selectedIndex : 0;
        if (LoaderlyLanguage.IsArabic)
        {
            return $"Ø²ÙˆÙ… {normalizedIndex + 1}/{count} - {(editing ? "ØªØ¹Ø¯ÙŠÙ„" : "Ø«Ø§Ø¨Øª")}";
        }

        return $"Zoom {normalizedIndex + 1} of {count} - {(editing ? "editing" : "fixed")}";
    }

    private static string BlurSelectedStatus(int index)
    {
        return LoaderlyLanguage.IsArabic
            ? $"تم تحديد بلور {index + 1}. اضغط {LoaderlyLanguage.Text("Edit")} لتحريكه فوق الفيديو."
            : $"Blur {index + 1} selected. Press Edit to move it on the video.";
    }

    private static string ZoomSelectedStatus(int index)
    {
        return LoaderlyLanguage.IsArabic
            ? $"ØªÙ… ØªØ­Ø¯ÙŠØ¯ Ø²ÙˆÙ… {index + 1}. Ø§Ø¶ØºØ· {LoaderlyLanguage.Text("Edit")} Ù„ØªØ­Ø±ÙŠÙƒÙ‡ ÙÙˆÙ‚ Ø§Ù„ÙÙŠØ¯ÙŠÙˆ."
            : $"Zoom {index + 1} selected. Press Edit to move it on the video.";
    }

    private static string BlurTimingUpdatedStatus(int index, bool snappedToPlayhead = false)
    {
        if (snappedToPlayhead)
        {
            return LoaderlyLanguage.IsArabic
                ? $"تم تثبيت بلور {index + 1} على خط التشغيل."
                : $"Blur {index + 1} snapped to the playhead.";
        }

        return LoaderlyLanguage.IsArabic
            ? $"تم تحديث توقيت بلور {index + 1}."
            : $"Blur {index + 1} timing updated.";
    }

    private static string ZoomTimingUpdatedStatus(int index, bool snappedToPlayhead = false)
    {
        if (snappedToPlayhead)
        {
            return LoaderlyLanguage.IsArabic
                ? $"تم تثبيت زوم {index + 1} على خط التشغيل."
                : $"Zoom {index + 1} snapped to the playhead.";
        }

        return LoaderlyLanguage.IsArabic
            ? $"ØªÙ… ØªØ­Ø¯ÙŠØ« ØªÙˆÙ‚ÙŠØª Ø²ÙˆÙ… {index + 1}."
            : $"Zoom {index + 1} timing updated.";
    }

    private static string SnapshotSavedStatus(string outputPath)
    {
        return LoaderlyLanguage.IsArabic
            ? $"تم حفظ اللقطة: {outputPath}"
            : $"Snapshot saved: {outputPath}";
    }

    private static string BlurEditButtonText(bool editing)
    {
        return editing ? "Done" : "Edit";
    }

    private static string ZoomEditButtonText(bool editing)
    {
        return editing ? "Done" : "Edit";
    }

    private static string BlurShapeLabel(TrimBlurShape shape)
    {
        return shape switch
        {
            TrimBlurShape.Soft => "Soft blur",
            TrimBlurShape.Pixelate => "Pixelate",
            _ => "Box blur"
        };
    }

    private static TrimBlurShape BlurShapeFromLabel(string? label)
    {
        return label switch
        {
            "Soft blur" => TrimBlurShape.Soft,
            "Pixelate" => TrimBlurShape.Pixelate,
            _ => TrimBlurShape.Box
        };
    }

    private static string BlurStrengthLabel(int strength)
    {
        return Math.Clamp(strength, 1, 40) switch
        {
            <= 10 => "Light 8",
            <= 18 => "Soft 14",
            <= 27 => "Clean 22",
            <= 36 => "Strong 32",
            _ => "Heavy 40"
        };
    }

    private static int BlurStrengthFromLabel(string? label)
    {
        if (string.IsNullOrWhiteSpace(label))
        {
            return 22;
        }

        var number = label
            .Where(char.IsDigit)
            .ToArray();
        return int.TryParse(new string(number), NumberStyles.Integer, CultureInfo.InvariantCulture, out var strength)
            ? Math.Clamp(strength, 1, 40)
            : 22;
    }

    private static string ZoomScaleLabel(double scale)
    {
        var normalized = Math.Clamp(scale, 1.1, 4.0);
        return normalized switch
        {
            < 1.75 => "1.5x",
            < 2.25 => "2x",
            < 2.75 => "2.5x",
            < 3.5 => "3x",
            _ => "4x"
        };
    }

    private static double ZoomScaleFromLabel(string? label)
    {
        return label switch
        {
            "1.5x" => 1.5,
            "2.5x" => 2.5,
            "3x" => 3.0,
            "4x" => 4.0,
            _ => 2.0
        };
    }

    private static bool ShouldSeekPreviewOnTimelinePositionChange(bool updatingControls, bool isTimelineInteracting)
    {
        return !updatingControls && !isTimelineInteracting;
    }

    private static bool ShouldRefreshTimelineLabels(bool updatingControls, bool isTimelineInteracting)
    {
        return !updatingControls && !isTimelineInteracting;
    }

    private static bool ShouldWarnBeforeClosing(bool isExporting)
    {
        return isExporting;
    }

    private static bool ShouldRefreshSelectedCutOverlay(bool applyingSegmentSelection, int selectedSegmentIndex, int segmentCount)
    {
        return !applyingSegmentSelection && selectedSegmentIndex >= 0 && selectedSegmentIndex < segmentCount;
    }

    private static bool ShouldSeekPreviewForTimelineRangeChange(
        bool updatingControls,
        bool isTimelineInteracting,
        int position,
        int start,
        int end)
    {
        return !updatingControls && !isTimelineInteracting && (position < start || position > end);
    }

    private static bool ShouldRemoveSelectedCutShortcut(
        WinForms.Keys keyData,
        int selectedSegmentIndex,
        int segmentCount)
    {
        var keyCode = keyData & WinForms.Keys.KeyCode;
        var ctrl = keyData.HasFlag(WinForms.Keys.Control);
        var shift = keyData.HasFlag(WinForms.Keys.Shift);
        var alt = keyData.HasFlag(WinForms.Keys.Alt);
        return !ctrl &&
            !shift &&
            !alt &&
            keyCode == WinForms.Keys.Delete &&
            selectedSegmentIndex >= 0 &&
            selectedSegmentIndex < segmentCount;
    }

    private static bool ShouldRedoShortcut(WinForms.Keys keyData, string? configured)
    {
        return ShortcutMatches(keyData, configured, WinForms.Keys.Control | WinForms.Keys.Y) ||
            keyData == (WinForms.Keys.Control | WinForms.Keys.Shift | WinForms.Keys.Z);
    }

    private static bool ShouldRemoveSelectedBlurShortcut(
        WinForms.Keys keyData,
        int selectedBlurIndex,
        int blurCount)
    {
        var keyCode = keyData & WinForms.Keys.KeyCode;
        var ctrl = keyData.HasFlag(WinForms.Keys.Control);
        var shift = keyData.HasFlag(WinForms.Keys.Shift);
        var alt = keyData.HasFlag(WinForms.Keys.Alt);
        return !ctrl &&
            !shift &&
            !alt &&
            keyCode == WinForms.Keys.Delete &&
            selectedBlurIndex >= 0 &&
            selectedBlurIndex < blurCount;
    }

    private static bool ShouldRemoveSelectedZoomShortcut(
        WinForms.Keys keyData,
        int selectedZoomIndex,
        int zoomCount)
    {
        var keyCode = keyData & WinForms.Keys.KeyCode;
        var ctrl = keyData.HasFlag(WinForms.Keys.Control);
        var shift = keyData.HasFlag(WinForms.Keys.Shift);
        var alt = keyData.HasFlag(WinForms.Keys.Alt);
        return !ctrl &&
            !shift &&
            !alt &&
            keyCode == WinForms.Keys.Delete &&
            selectedZoomIndex >= 0 &&
            selectedZoomIndex < zoomCount;
    }

    private static bool ShouldSetSelectedEffectStartShortcut(
        WinForms.Keys keyData,
        int selectedBlurIndex,
        int blurCount,
        int selectedZoomIndex,
        int zoomCount)
    {
        return ShouldSetSelectedEffectBoundaryShortcut(
            keyData,
            WinForms.Keys.OemOpenBrackets,
            selectedBlurIndex,
            blurCount,
            selectedZoomIndex,
            zoomCount);
    }

    private static bool ShouldSetSelectedEffectEndShortcut(
        WinForms.Keys keyData,
        int selectedBlurIndex,
        int blurCount,
        int selectedZoomIndex,
        int zoomCount)
    {
        return ShouldSetSelectedEffectBoundaryShortcut(
            keyData,
            WinForms.Keys.OemCloseBrackets,
            selectedBlurIndex,
            blurCount,
            selectedZoomIndex,
            zoomCount);
    }

    private static bool ShouldSetSelectedEffectBoundaryShortcut(
        WinForms.Keys keyData,
        WinForms.Keys boundaryKey,
        int selectedBlurIndex,
        int blurCount,
        int selectedZoomIndex,
        int zoomCount)
    {
        var keyCode = keyData & WinForms.Keys.KeyCode;
        var ctrl = keyData.HasFlag(WinForms.Keys.Control);
        var shift = keyData.HasFlag(WinForms.Keys.Shift);
        var alt = keyData.HasFlag(WinForms.Keys.Alt);
        return !ctrl &&
            !shift &&
            !alt &&
            keyCode == boundaryKey &&
            ((selectedBlurIndex >= 0 && selectedBlurIndex < blurCount) ||
                (selectedZoomIndex >= 0 && selectedZoomIndex < zoomCount));
    }

    private static bool ShouldAutoPreviewTransition(TrimTransitionKind transition)
    {
        return false;
    }

    private static TimeSpan KeyboardSeekTarget(
        TimeSpan currentPosition,
        TimeSpan? pendingPosition,
        TimeSpan delta,
        TimeSpan duration)
    {
        return ClampTimelinePosition((pendingPosition ?? currentPosition) + delta, duration);
    }

    private static double? KeyboardSeekSecondsForShortcut(WinForms.Keys keyData)
    {
        var keyCode = keyData & WinForms.Keys.KeyCode;
        var ctrl = keyData.HasFlag(WinForms.Keys.Control);
        var shift = keyData.HasFlag(WinForms.Keys.Shift);
        var alt = keyData.HasFlag(WinForms.Keys.Alt);
        if (ctrl || alt)
        {
            return null;
        }

        return keyCode switch
        {
            WinForms.Keys.Left => shift ? -1D : -0.25D,
            WinForms.Keys.Right => shift ? 1D : 0.25D,
            _ => null
        };
    }

    private static (int Start, int End) NewTimelineItemRangeAtPlayhead(
        int playhead,
        int maximum,
        IEnumerable<(int Start, int End)> existingRanges)
    {
        maximum = Math.Max(MinimumTrimUnits, maximum);
        playhead = Math.Clamp(playhead, 0, maximum);
        var preferredLength = Math.Clamp(
            SecondsToUnits(DefaultTimelineItemSeconds, maximum),
            MinimumTrimUnits,
            maximum);
        var intervals = TimelineAvailableIntervals(maximum, NormalizeTimelineBlockers(existingRanges, maximum))
            .Where(interval => interval.End - interval.Start >= preferredLength)
            .ToList();
        if (intervals.Count == 0)
        {
            var fallbackStart = Math.Clamp(playhead, 0, Math.Max(0, maximum - preferredLength));
            return (fallbackStart, fallbackStart + preferredLength);
        }

        foreach (var interval in intervals)
        {
            if (playhead >= interval.Start && playhead <= interval.End)
            {
                var start = Math.Clamp(playhead, interval.Start, interval.End - preferredLength);
                return (start, start + preferredLength);
            }
        }

        var next = intervals
            .Where(interval => interval.Start >= playhead || interval.End > playhead)
            .OrderBy(interval => Math.Abs(interval.Start - playhead))
            .FirstOrDefault();
        if (next.End > next.Start)
        {
            return (next.Start, next.Start + preferredLength);
        }

        var previous = intervals
            .Where(interval => interval.End <= playhead)
            .OrderByDescending(interval => interval.End)
            .First();
        return (previous.End - preferredLength, previous.End);
    }

    private static IReadOnlyList<(int Start, int End)> NormalizeTimelineBlockers(
        IEnumerable<(int Start, int End)> ranges,
        int maximum)
    {
        var blockers = ranges
            .Select(range => (Start: Math.Clamp(Math.Min(range.Start, range.End), 0, maximum), End: Math.Clamp(Math.Max(range.Start, range.End), 0, maximum)))
            .Where(range => range.End > range.Start)
            .OrderBy(range => range.Start)
            .ThenBy(range => range.End)
            .ToList();
        if (blockers.Count <= 1)
        {
            return blockers;
        }

        var merged = new List<(int Start, int End)>();
        foreach (var blocker in blockers)
        {
            if (merged.Count == 0 || blocker.Start > merged[^1].End)
            {
                merged.Add(blocker);
                continue;
            }

            var previous = merged[^1];
            merged[^1] = (previous.Start, Math.Max(previous.End, blocker.End));
        }

        return merged;
    }

    private static IReadOnlyList<(int Start, int End)> TimelineAvailableIntervals(
        int maximum,
        IReadOnlyList<(int Start, int End)> blockers)
    {
        var intervals = new List<(int Start, int End)>();
        var cursor = 0;
        foreach (var blocker in blockers)
        {
            if (blocker.Start > cursor)
            {
                intervals.Add((cursor, blocker.Start));
            }

            cursor = Math.Max(cursor, blocker.End);
        }

        if (cursor < maximum)
        {
            intervals.Add((cursor, maximum));
        }

        return intervals;
    }

    private static TimeSpan ClampTimelinePosition(TimeSpan position, TimeSpan duration)
    {
        if (position < TimeSpan.Zero)
        {
            return TimeSpan.Zero;
        }

        return position > duration ? duration : position;
    }

    private static string FfmpegTime(TimeSpan time)
    {
        return Math.Max(0, time.TotalSeconds).ToString("0.###", CultureInfo.InvariantCulture);
    }

    private static void DeleteTemporaryFile(string? filePath)
    {
        if (string.IsNullOrWhiteSpace(filePath))
        {
            return;
        }

        try
        {
            if (File.Exists(filePath))
            {
                File.Delete(filePath);
            }
        }
        catch
        {
        }
    }

    private static string[] CutActionLabels()
    {
        return
        [
            "Cut out",
            "Keep only",
            "Prev cut",
            "Next cut",
            "Remove cut"
        ];
    }

    private static string[] CutContextRootActionLabels()
    {
        return
        [
            "Remove cut"
        ];
    }

    private static string CutContextTransitionHeader(TrimTransitionKind transition)
    {
        return $"Transition: {TrimComposition.TransitionLabel(transition)}";
    }

    private static string CutStatusText(int cutCount, int selectedIndex)
    {
        if (cutCount <= 0)
        {
            return "No cuts";
        }

        var displayIndex = Math.Clamp(selectedIndex, 0, cutCount - 1) + 1;
        return $"Cut {displayIndex} of {cutCount}";
    }

    private static string CutStatusDisplayText(int cutCount, int selectedIndex)
    {
        if (!LoaderlyLanguage.IsArabic)
        {
            return CutStatusText(cutCount, selectedIndex);
        }

        if (cutCount <= 0)
        {
            return LoaderlyLanguage.Text("No cuts");
        }

        var displayIndex = Math.Clamp(selectedIndex, 0, cutCount - 1) + 1;
        return $"قص {displayIndex} من {cutCount}";
    }

    private static string SegmentStatusDisplayText(int segmentCount, int selectedIndex)
    {
        if (!LoaderlyLanguage.IsArabic)
        {
            return CutStatusText(segmentCount, selectedIndex);
        }

        if (segmentCount <= 0)
        {
            return LoaderlyLanguage.Text("Current range only");
        }

        var displayIndex = Math.Clamp(selectedIndex, 0, segmentCount - 1) + 1;
        return $"الجزء {displayIndex} من {segmentCount}";
    }

    private static string FormatDuration(TimeSpan value)
    {
        return value.TotalHours >= 1
            ? value.ToString(@"h\:mm\:ss")
            : value.ToString(@"m\:ss");
    }

    private static string FormatEffectTime(TimeSpan value)
    {
        return value.TotalHours >= 1
            ? value.ToString(@"h\:mm\:ss\.ff", CultureInfo.InvariantCulture)
            : value.ToString(@"m\:ss\.ff", CultureInfo.InvariantCulture);
    }

    private static string EffectTimingText(int start, int end, bool hasMovingKeyframes)
    {
        var startTime = TimeFromUnits(start);
        var endTime = TimeFromUnits(end);
        var duration = endTime > startTime ? endTime - startTime : TimeSpan.Zero;
        var mode = hasMovingKeyframes ? "Follow" : "Fixed";
        return $"{FormatEffectTime(startTime)} - {FormatEffectTime(endTime)} | {FormatEffectTime(duration)} | {mode}";
    }

    private static string EffectFollowButtonText(bool hasMovingKeyframes, bool zoom)
    {
        if (hasMovingKeyframes)
        {
            return "Fix";
        }

        return zoom ? "Follow" : "Track";
    }

    private static bool HasMovingKeyframes(IReadOnlyCollection<EditableBlurKeyframe> keyframes)
    {
        return keyframes.Count > 1;
    }

    private static bool EffectRangeTouchesPlayhead(int start, int end, int playhead)
    {
        return Math.Abs(start - playhead) <= 1 ||
            Math.Abs(end - playhead) <= 1 ||
            Math.Abs(start + ((end - start) / 2) - playhead) <= 1;
    }

    private static async Task<TimeSpan?> ProbeDurationWithFfprobeAsync(string sourceFilePath, CancellationToken cancellationToken)
    {
        try
        {
            var ffprobePath = ToolResolver.ResolveToolPath("ffprobe");
            var output = new StringBuilder();
            var startInfo = new ProcessStartInfo
            {
                FileName = ffprobePath,
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true
            };
            ToolResolver.AddToolDirectoriesToPath(startInfo);
            foreach (var argument in DurationProbeArguments(sourceFilePath))
            {
                startInfo.ArgumentList.Add(argument);
            }

            using var process = new Process { StartInfo = startInfo };
            var outputClosed = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            var errorClosed = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            process.OutputDataReceived += (_, e) =>
            {
                if (e.Data is null)
                {
                    outputClosed.TrySetResult();
                    return;
                }

                output.AppendLine(e.Data);
            };
            process.ErrorDataReceived += (_, e) =>
            {
                if (e.Data is null)
                {
                    errorClosed.TrySetResult();
                }
            };

            process.Start();
            process.BeginOutputReadLine();
            process.BeginErrorReadLine();
            await ProcessRunner.WaitForExitAndStreamsAsync(
                process,
                outputClosed.Task,
                errorClosed.Task,
                cancellationToken).ConfigureAwait(false);
            return process.ExitCode == 0 ? ParseFfprobeDuration(output.ToString()) : null;
        }
        catch
        {
            return null;
        }
    }

    private static IEnumerable<string> DurationProbeArguments(string sourceFilePath)
    {
        yield return "-v";
        yield return "error";
        yield return "-show_entries";
        yield return "format=duration";
        yield return "-of";
        yield return "default=noprint_wrappers=1:nokey=1";
        yield return sourceFilePath;
    }

    private static TimeSpan? ParseFfprobeDuration(string output)
    {
        var line = output
            .Split(['\r', '\n'], StringSplitOptions.RemoveEmptyEntries)
            .FirstOrDefault();
        if (line is null ||
            !double.TryParse(line.Trim(), NumberStyles.Float, CultureInfo.InvariantCulture, out var seconds) ||
            seconds <= 0 ||
            double.IsNaN(seconds) ||
            double.IsInfinity(seconds))
        {
            return null;
        }

        return TimeSpan.FromSeconds(seconds);
    }

    private static int SecondsToUnits(double seconds, int maximum)
    {
        return Math.Clamp((int)Math.Round(seconds * TimeScale), 0, maximum);
    }

    private void SetStatus(string message)
    {
        statusLabel.Text = LoaderlyLanguage.Text(message);
    }

    private void HandleMediaPreviewFailure(Exception? exception)
    {
        var status = MediaPreviewFailureStatus(exception);
        SetStatus(status);
        if (!IsWindowsMediaPlayerCapabilityFailure(exception) || mediaFeatureWarningShown)
        {
            return;
        }

        mediaFeatureWarningShown = true;
        WinForms.MessageBox.Show(
            this,
            $"{LoaderlyLanguage.Text("Windows Media Player feature is missing.")}\n\n{LoaderlyLanguage.Text("Open PowerShell or Command Prompt as administrator and run:")}\n\n{WindowsMediaPlayerCapabilityCommand}\n\n{LoaderlyLanguage.Text("Restart Windows after the command finishes.")}",
            LoaderlyLanguage.Text("Watch / Trim preview"),
            WinForms.MessageBoxButtons.OK,
            WinForms.MessageBoxIcon.Warning);
    }

    private static string MediaPreviewFailureStatus(Exception? exception)
    {
        if (IsWindowsMediaPlayerCapabilityFailure(exception))
        {
            return WindowsMediaPlayerMissingStatus;
        }

        return string.IsNullOrWhiteSpace(exception?.Message)
            ? "Could not load video preview."
            : exception.Message;
    }

    private static bool IsWindowsMediaPlayerCapabilityFailure(Exception? exception)
    {
        var message = exception?.Message;
        return !string.IsNullOrWhiteSpace(message) &&
            message.Contains("Windows Media Player version 10", StringComparison.OrdinalIgnoreCase);
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

    private void ApplySubtitleOverlayDirection(string text)
    {
        var direction = SubtitleTextDirection.ContainsRtlText(text)
            ? Wpf.FlowDirection.RightToLeft
            : Wpf.FlowDirection.LeftToRight;
        subtitleTextBlock.FlowDirection = direction;
        subtitleOverlay.FlowDirection = direction;
    }

    private static WpfMedia.Color ToWpfColor(string htmlColor, int alpha)
    {
        var color = ColorTranslator.FromHtml(htmlColor);
        return WpfMedia.Color.FromArgb((byte)Math.Clamp(alpha, 0, 255), color.R, color.G, color.B);
    }

    private sealed record TrimSnapshot(
        int Start,
        int End,
        int Position,
        IReadOnlyList<EditableTrimSegment> Segments,
        int SelectedSegmentIndex,
        IReadOnlyList<EditableBlurRegion> BlurRegions,
        int SelectedBlurIndex,
        IReadOnlyList<EditableZoomRegion> ZoomRegions,
        int SelectedZoomIndex);

    private sealed class EditableTrimSegment(int start, int end, TrimTransitionKind transitionAfter)
    {
        public int Start { get; set; } = start;

        public int End { get; set; } = end;

        public TrimTransitionKind TransitionAfter { get; set; } = transitionAfter;

        public EditableTrimSegment Clone()
        {
            return new EditableTrimSegment(Start, End, TransitionAfter);
        }

        public bool SameAs(EditableTrimSegment other)
        {
            return Start == other.Start &&
                End == other.End &&
                TransitionAfter == other.TransitionAfter;
        }
    }

    private enum BlurOverlayDragMode
    {
        None,
        Move,
        ResizeNorthWest,
        ResizeNorthEast,
        ResizeSouthWest,
        ResizeSouthEast,
        Recenter
    }

    private readonly record struct BlurPreviewKey(
        TrimBlurShape Shape,
        int Strength,
        int TimeUnits,
        int SourceWidth,
        int SourceHeight,
        int X,
        int Y,
        int Width,
        int Height);

    private sealed class EditableBlurRegion(
        int start,
        int end,
        TrimBlurShape shape,
        int strength,
        IReadOnlyList<EditableBlurKeyframe> keyframes)
    {
        public int Start { get; set; } = start;

        public int End { get; set; } = end;

        public TrimBlurShape Shape { get; set; } = shape;

        public int Strength { get; set; } = Math.Clamp(strength, 1, 40);

        public List<EditableBlurKeyframe> Keyframes { get; } = keyframes.Select(keyframe => keyframe.Clone()).ToList();

        public EditableBlurRegion Clone()
        {
            return new EditableBlurRegion(Start, End, Shape, Strength, Keyframes.Select(keyframe => keyframe.Clone()).ToList());
        }

        public TrimBlurRegion ToRegion()
        {
            var startTime = TimeFromUnits(Start);
            var endTime = TimeFromUnits(End);
            return new TrimBlurRegion(
                startTime,
                endTime,
                Shape,
                Strength,
                Keyframes.Select(keyframe => keyframe.ToKeyframe()).ToList()).Normalize();
        }

        public void UpsertKeyframe(TrimBlurKeyframe keyframe)
        {
            var units = SecondsToUnits(keyframe.Time.TotalSeconds, int.MaxValue);
            var replacement = new EditableBlurKeyframe(units, keyframe.X, keyframe.Y, keyframe.Width, keyframe.Height);
            var existing = Keyframes.FindIndex(item => Math.Abs(item.Units - units) <= 8);
            if (existing >= 0)
            {
                Keyframes[existing] = replacement;
            }
            else
            {
                Keyframes.Add(replacement);
            }

            Keyframes.Sort((left, right) => left.Units.CompareTo(right.Units));
        }

        public void ReplaceWithFixedKeyframe(TrimBlurKeyframe keyframe)
        {
            var frame = keyframe.Clamp();
            Keyframes.Clear();
            Keyframes.Add(new EditableBlurKeyframe(Start, frame.X, frame.Y, frame.Width, frame.Height));
        }

        public bool SameAs(EditableBlurRegion other)
        {
            if (Start != other.Start ||
                End != other.End ||
                Shape != other.Shape ||
                Strength != other.Strength ||
                Keyframes.Count != other.Keyframes.Count)
            {
                return false;
            }

            for (var index = 0; index < Keyframes.Count; index++)
            {
                if (!Keyframes[index].SameAs(other.Keyframes[index]))
                {
                    return false;
                }
            }

            return true;
        }
    }

    private sealed class EditableZoomRegion(
        int start,
        int end,
        double scale,
        IReadOnlyList<EditableBlurKeyframe> keyframes)
    {
        public int Start { get; set; } = start;

        public int End { get; set; } = end;

        public double Scale { get; set; } = Math.Clamp(scale, 1.1, 4.0);

        public List<EditableBlurKeyframe> Keyframes { get; } = keyframes.Select(keyframe => keyframe.Clone()).ToList();

        public EditableZoomRegion Clone()
        {
            return new EditableZoomRegion(Start, End, Scale, Keyframes.Select(keyframe => keyframe.Clone()).ToList());
        }

        public TrimZoomRegion ToRegion()
        {
            var startTime = TimeFromUnits(Start);
            var endTime = TimeFromUnits(End);
            return new TrimZoomRegion(
                startTime,
                endTime,
                Scale,
                Keyframes.Select(keyframe => keyframe.ToKeyframe()).ToList()).Normalize();
        }

        public TrimBlurRegion ToTrackingRegion()
        {
            var startTime = TimeFromUnits(Start);
            var endTime = TimeFromUnits(End);
            return new TrimBlurRegion(
                startTime,
                endTime,
                TrimBlurShape.Box,
                1,
                Keyframes.Select(keyframe => keyframe.ToKeyframe()).ToList()).Normalize();
        }

        public void UpsertKeyframe(TrimBlurKeyframe keyframe)
        {
            var units = SecondsToUnits(keyframe.Time.TotalSeconds, int.MaxValue);
            var replacement = new EditableBlurKeyframe(units, keyframe.X, keyframe.Y, keyframe.Width, keyframe.Height);
            var existing = Keyframes.FindIndex(item => Math.Abs(item.Units - units) <= 8);
            if (existing >= 0)
            {
                Keyframes[existing] = replacement;
            }
            else
            {
                Keyframes.Add(replacement);
            }

            Keyframes.Sort((left, right) => left.Units.CompareTo(right.Units));
        }

        public void ReplaceWithFixedKeyframe(TrimBlurKeyframe keyframe)
        {
            var frame = keyframe.Clamp();
            Keyframes.Clear();
            Keyframes.Add(new EditableBlurKeyframe(Start, frame.X, frame.Y, frame.Width, frame.Height));
        }

        public bool SameAs(EditableZoomRegion other)
        {
            if (Start != other.Start ||
                End != other.End ||
                Math.Abs(Scale - other.Scale) > 0.0001 ||
                Keyframes.Count != other.Keyframes.Count)
            {
                return false;
            }

            for (var index = 0; index < Keyframes.Count; index++)
            {
                if (!Keyframes[index].SameAs(other.Keyframes[index]))
                {
                    return false;
                }
            }

            return true;
        }
    }

    private sealed class EditableBlurKeyframe(int units, double x, double y, double width, double height)
    {
        public int Units { get; set; } = units;

        public double X { get; set; } = x;

        public double Y { get; set; } = y;

        public double Width { get; set; } = width;

        public double Height { get; set; } = height;

        public EditableBlurKeyframe Clone()
        {
            return new EditableBlurKeyframe(Units, X, Y, Width, Height);
        }

        public TrimBlurKeyframe ToKeyframe()
        {
            return new TrimBlurKeyframe(TimeFromUnits(Units), X, Y, Width, Height).Clamp();
        }

        public bool SameAs(EditableBlurKeyframe other)
        {
            return Units == other.Units &&
                Math.Abs(X - other.X) < 0.0001 &&
                Math.Abs(Y - other.Y) < 0.0001 &&
                Math.Abs(Width - other.Width) < 0.0001 &&
                Math.Abs(Height - other.Height) < 0.0001;
        }
    }
}
