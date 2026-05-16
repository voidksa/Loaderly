using System.Drawing;
using System.Drawing.Text;
using System.IO;
using WinForms = System.Windows.Forms;
using Wpf = System.Windows;
using WpfControls = System.Windows.Controls;
using WpfMedia = System.Windows.Media;

namespace Loaderly;

internal sealed class SubtitleEditorForm : WinForms.Form
{
    private const int TimeScale = 100;
    private const int PreviewPrimeDelayMilliseconds = 300;
    private const int PreviewLoadTimeoutMilliseconds = 4500;
    private const int MaxPreviewLoadRetries = 1;
    private static readonly string[] FontSizes = ["18", "22", "24", "28", "32", "36", "42", "48"];
    private static readonly string[] BackgroundOpacities = ["0%", "25%", "50%", "70%", "85%", "100%"];
    private static readonly StylePreset[] StylePresets =
    [
        new("Default", "Segoe UI", 24F, true, "#FFFFFF", "#000000", 70),
        new("Cinematic", "Arial", 28F, true, "#FFFFFF", "#000000", 50),
        new("Arabic large", "Segoe UI", 34F, true, "#FFFFFF", "#000000", 85),
        new("Caption box", "Segoe UI", 24F, true, "#FFFFFF", "#000000", 100)
    ];

    private readonly string subtitleFilePath;
    private readonly string mediaFilePath;
    private readonly TimeSpan trimStart;
    private readonly TimeSpan mediaOffset;
    private TimeSpan trimEnd;
    private TimeSpan clipDuration;
    private readonly bool useFullSubtitleRange;
    private readonly List<string> installedFonts;
    private readonly WinForms.Label clipRangeLabel = new();
    private readonly WinForms.Label cueRangeLabel = new();
    private readonly WinForms.Label playbackLabel = new();
    private readonly WinForms.TextBox cueTextBox = new();
    private readonly WinForms.TextBox fontSearchTextBox = new();
    private readonly WinForms.Panel cueListPanel = new();
    private readonly WinForms.Panel fontListPanel = new();
    private readonly ModernScrollPanel cueScrollPanel = new();
    private readonly ModernScrollPanel fontScrollPanel = new();
    private readonly ModernRangeTimeline cueTimeline = new();
    private readonly System.Windows.Forms.Integration.ElementHost videoHost = new();
    private readonly WpfControls.Grid videoSurface = new();
    private readonly WpfControls.MediaElement player = new();
    private readonly WpfControls.Border subtitleOverlay = new();
    private readonly WpfControls.TextBlock subtitleTextBlock = new();
    private readonly ModernButton playButton = new();
    private readonly ModernButton addCueButton = new();
    private readonly ModernButton deleteCueButton = new();
    private readonly ModernButton textColorButton = new();
    private readonly ModernButton backgroundColorButton = new();
    private readonly ModernButton saveButton = new();
    private readonly ModernButton cancelButton = new();
    private readonly ModernSelect stylePresetSelect = new();
    private readonly ModernSelect fontSizeSelect = new();
    private readonly ModernSelect opacitySelect = new();
    private readonly WinForms.CheckBox boldCheckBox = new ModernCheckBox();
    private readonly WinForms.Timer previewTimer = new();
    private readonly WinForms.Timer previewPrimeTimer = new();
    private readonly WinForms.Timer previewLoadTimer = new();

    private List<SubtitleCue> cues = [];
    private readonly HashSet<int> selectedCueIndices = [];
    private int selectedCueIndex = -1;
    private int selectionAnchorCueIndex = -1;
    private bool updatingControls;
    private bool mediaReady;
    private TimeSpan? pendingSeek;
    private int previewLoadRetries;

    public SubtitleEditorForm(string subtitleFilePath, string mediaFilePath, SubtitleStyle style)
        : this(subtitleFilePath, mediaFilePath, style, TimeSpan.Zero, TimeSpan.MaxValue)
    {
    }

    public SubtitleEditorForm(
        string subtitleFilePath,
        string mediaFilePath,
        SubtitleStyle style,
        TimeSpan trimStart,
        TimeSpan trimEnd)
        : this(subtitleFilePath, mediaFilePath, style, trimStart, trimEnd, TimeSpan.Zero)
    {
    }

    public SubtitleEditorForm(
        string subtitleFilePath,
        string mediaFilePath,
        SubtitleStyle style,
        TimeSpan trimStart,
        TimeSpan trimEnd,
        TimeSpan mediaOffset)
    {
        this.subtitleFilePath = subtitleFilePath;
        this.mediaFilePath = mediaFilePath;
        this.trimStart = trimStart < TimeSpan.Zero ? TimeSpan.Zero : trimStart;
        this.mediaOffset = NormalizeMediaOffset(mediaOffset);
        useFullSubtitleRange = trimEnd <= this.trimStart || trimEnd == TimeSpan.MaxValue;
        this.trimEnd = useFullSubtitleRange ? this.trimStart + TimeSpan.FromMinutes(10) : trimEnd;
        clipDuration = this.trimEnd - this.trimStart;
        SubtitleStyle = style.Clone();
        AppSettingsStore.NormalizeForRuntime(new AppSettings { SubtitleStyle = SubtitleStyle });
        installedFonts = LoadInstalledFonts();

        SetStyle(
            WinForms.ControlStyles.AllPaintingInWmPaint |
            WinForms.ControlStyles.OptimizedDoubleBuffer |
            WinForms.ControlStyles.ResizeRedraw,
            true);
        DoubleBuffered = true;
        Text = $"{LoaderlyLanguage.Text("Edit subtitles")} - {Path.GetFileName(subtitleFilePath)}";
        AutoScaleMode = WinForms.AutoScaleMode.Dpi;
        StartPosition = WinForms.FormStartPosition.CenterParent;
        MinimumSize = new Size(1080, 700);
        Size = new Size(1320, 780);
        Font = LoaderlyTheme.BodyFont(10F);
        BackColor = LoaderlyTheme.Window;
        KeyPreview = true;

        BuildUi();
        LoaderlyLanguage.ApplyTo(this);
        BindEvents();
        LoadSubtitleFile();
        ApplyStyleControls();
        ApplySubtitleStyle();
    }

    public SubtitleStyle SubtitleStyle { get; private set; }

    public static int PreviewPrimeDelayMillisecondsForTest => PreviewPrimeDelayMilliseconds;
    public static int PreviewLoadTimeoutMillisecondsForTest => PreviewLoadTimeoutMilliseconds;
    public static int MaxPreviewLoadRetriesForTest => MaxPreviewLoadRetries;

    internal static bool StartsManualMediaLoadForTest => true;

    internal readonly record struct CueSelectionState(IReadOnlyList<int> SelectedIndices, int AnchorIndex, int PrimaryIndex);

    internal static CueSelectionState CueSelectionAfterClickForTest(
        IEnumerable<int> selectedIndices,
        int anchorIndex,
        int primaryIndex,
        int clickedIndex,
        bool ctrl,
        bool shift,
        IReadOnlyList<int> visibleIndices)
    {
        return CueSelectionAfterClick(selectedIndices, anchorIndex, primaryIndex, clickedIndex, ctrl, shift, visibleIndices);
    }

    internal static IReadOnlyList<int> RemainingCueIndicesAfterDeleteForTest(IEnumerable<int> cueIndices, IEnumerable<int> selectedIndices)
    {
        var selected = selectedIndices.ToHashSet();
        return cueIndices.Where(index => !selected.Contains(index)).ToList();
    }

    internal static bool IsPlaybackShortcutForTest(WinForms.Keys keyData)
    {
        return IsPlaybackShortcut(keyData);
    }

    internal static TimeSpan MediaPositionForTest(TimeSpan timelinePosition, TimeSpan mediaOffset)
    {
        return MediaPositionFromTimelinePosition(timelinePosition, mediaOffset);
    }

    internal static TimeSpan AbsolutePositionForTest(TimeSpan mediaPosition, TimeSpan mediaOffset)
    {
        return TimelinePositionFromMediaPosition(mediaPosition, mediaOffset);
    }

    internal static SubtitleStyle ApplyStylePresetForTest(string presetName, SubtitleStyle style)
    {
        return ApplyStylePreset(presetName, style);
    }

    private static CueSelectionState CueSelectionAfterClick(
        IEnumerable<int> selectedIndices,
        int anchorIndex,
        int primaryIndex,
        int clickedIndex,
        bool ctrl,
        bool shift,
        IReadOnlyList<int> visibleIndices)
    {
        var visible = visibleIndices.ToList();
        if (!visible.Contains(clickedIndex))
        {
            return NormalizeSelection(selectedIndices, anchorIndex, primaryIndex, visible);
        }

        if (shift)
        {
            var anchor = visible.Contains(anchorIndex)
                ? anchorIndex
                : visible.Contains(primaryIndex) ? primaryIndex : clickedIndex;
            var anchorPosition = visible.IndexOf(anchor);
            var clickedPosition = visible.IndexOf(clickedIndex);
            var first = Math.Min(anchorPosition, clickedPosition);
            var last = Math.Max(anchorPosition, clickedPosition);
            return new CueSelectionState(visible.Skip(first).Take(last - first + 1).ToList(), anchor, clickedIndex);
        }

        if (ctrl)
        {
            var selected = selectedIndices.ToHashSet();
            if (!selected.Add(clickedIndex))
            {
                selected.Remove(clickedIndex);
            }

            if (selected.Count == 0)
            {
                selected.Add(clickedIndex);
            }

            var normalized = visible.Where(selected.Contains).ToList();
            var primary = selected.Contains(clickedIndex) ? clickedIndex : normalized.LastOrDefault();
            var anchor = visible.Contains(anchorIndex) ? anchorIndex : clickedIndex;
            return new CueSelectionState(normalized, anchor, primary);
        }

        return new CueSelectionState([clickedIndex], clickedIndex, clickedIndex);
    }

    private static CueSelectionState NormalizeSelection(
        IEnumerable<int> selectedIndices,
        int anchorIndex,
        int primaryIndex,
        IReadOnlyList<int> visibleIndices)
    {
        var selected = selectedIndices.ToHashSet();
        var normalized = visibleIndices.Where(selected.Contains).ToList();
        if (normalized.Count == 0 && visibleIndices.Count > 0)
        {
            normalized.Add(visibleIndices[0]);
        }

        var primary = normalized.Contains(primaryIndex) ? primaryIndex : normalized.FirstOrDefault();
        var anchor = visibleIndices.Contains(anchorIndex) ? anchorIndex : primary;
        return new CueSelectionState(normalized, anchor, primary);
    }

    protected override bool ProcessCmdKey(ref WinForms.Message msg, WinForms.Keys keyData)
    {
        return HandleShortcut(keyData) || base.ProcessCmdKey(ref msg, keyData);
    }

    protected override void OnShown(EventArgs e)
    {
        base.OnShown(e);
        WindowsTheme.ApplyTitleBarTheme(this);

        BeginInvoke(new Action(LoadVideoPreview));
    }

    private void LoadVideoPreview()
    {
        if (IsDisposed)
        {
            return;
        }

        previewLoadTimer.Stop();
        player.LoadedBehavior = WpfControls.MediaState.Manual;
        player.UnloadedBehavior = WpfControls.MediaState.Manual;
        player.Stretch = WpfMedia.Stretch.Uniform;
        player.ScrubbingEnabled = true;
        if (File.Exists(mediaFilePath))
        {
            mediaReady = false;
            previewLoadRetries = 0;
            playButton.Enabled = false;
            playbackLabel.Text = LoaderlyLanguage.Text("Loading preview...");
            player.Source = new Uri(mediaFilePath);
            SeekTo(trimStart);
            player.Play();
            previewLoadTimer.Start();
        }
        else
        {
            playButton.Enabled = false;
            playbackLabel.Text = LoaderlyLanguage.Text("Preview unavailable");
            UpdatePreviewSubtitle(trimStart + RelativePosition());
        }
    }

    protected override void OnFormClosing(WinForms.FormClosingEventArgs e)
    {
        previewTimer.Stop();
        previewPrimeTimer.Stop();
        previewLoadTimer.Stop();
        player.Stop();
        player.Source = null;
        mediaReady = false;
        base.OnFormClosing(e);
    }

    private void BuildUi()
    {
        var root = new WinForms.TableLayoutPanel
        {
            Dock = WinForms.DockStyle.Fill,
            ColumnCount = 1,
            RowCount = 3,
            Padding = new WinForms.Padding(18),
            BackColor = LoaderlyTheme.Window
        };
        root.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Absolute, 46));
        root.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Percent, 100));
        root.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Absolute, 58));
        Controls.Add(root);

        var header = new WinForms.TableLayoutPanel
        {
            Dock = WinForms.DockStyle.Fill,
            ColumnCount = 2,
            RowCount = 1,
            BackColor = LoaderlyTheme.Window
        };
        header.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Percent, 100));
        header.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Absolute, 240));
        root.Controls.Add(header, 0, 0);

        header.Controls.Add(new WinForms.Label
        {
            Dock = WinForms.DockStyle.Fill,
            Text = Path.GetFileName(subtitleFilePath),
            AutoEllipsis = true,
            TextAlign = ContentAlignment.MiddleLeft,
            ForeColor = LoaderlyTheme.Text,
            Font = LoaderlyTheme.TitleFont(14F)
        }, 0, 0);

        clipRangeLabel.Dock = WinForms.DockStyle.Fill;
        clipRangeLabel.Text = $"{LoaderlyLanguage.Text("Clip")} {FormatDisplayTime(this.trimStart)} - {FormatDisplayTime(this.trimEnd)}";
        clipRangeLabel.TextAlign = ContentAlignment.MiddleRight;
        clipRangeLabel.ForeColor = LoaderlyTheme.MutedText;
        clipRangeLabel.Font = LoaderlyTheme.BodyFont(9.2F);
        header.Controls.Add(clipRangeLabel, 1, 0);

        var body = new WinForms.TableLayoutPanel
        {
            Dock = WinForms.DockStyle.Fill,
            ColumnCount = 3,
            RowCount = 1,
            BackColor = LoaderlyTheme.Window
        };
        body.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Absolute, 318));
        body.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Percent, 100));
        body.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Absolute, 292));
        root.Controls.Add(body, 0, 1);

        body.Controls.Add(BuildCuePanel(), 0, 0);
        body.Controls.Add(BuildPreviewPanel(), 1, 0);
        body.Controls.Add(BuildStylePanel(), 2, 0);

        var actions = new WinForms.TableLayoutPanel
        {
            Dock = WinForms.DockStyle.Fill,
            ColumnCount = 3,
            RowCount = 1,
            BackColor = LoaderlyTheme.Window
        };
        actions.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Percent, 100));
        actions.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Absolute, 126));
        actions.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Absolute, 126));
        root.Controls.Add(actions, 0, 2);

        ConfigureButton(cancelButton, "Cancel", primary: false);
        ConfigureButton(saveButton, "Save", primary: true);
        cancelButton.Dock = WinForms.DockStyle.Fill;
        saveButton.Dock = WinForms.DockStyle.Fill;
        cancelButton.Margin = new WinForms.Padding(0, 10, 10, 4);
        saveButton.Margin = new WinForms.Padding(10, 10, 0, 4);
        actions.Controls.Add(cancelButton, 1, 0);
        actions.Controls.Add(saveButton, 2, 0);
    }

    private WinForms.Control BuildCuePanel()
    {
        var panel = SectionPanel(new WinForms.Padding(0, 0, 14, 0));
        var layout = SectionLayout(3);
        layout.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Absolute, 34));
        layout.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Percent, 100));
        layout.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Absolute, 44));
        panel.Controls.Add(layout);

        layout.Controls.Add(SectionTitle("Cues"), 0, 0);

        cueScrollPanel.Dock = WinForms.DockStyle.Fill;
        cueScrollPanel.BackColor = LoaderlyTheme.SurfaceMuted;
        cueScrollPanel.Padding = new WinForms.Padding(0, 0, 10, 0);
        cueListPanel.Dock = WinForms.DockStyle.Top;
        cueListPanel.AutoSize = true;
        cueListPanel.BackColor = LoaderlyTheme.SurfaceMuted;
        cueScrollPanel.Controls.Add(cueListPanel);
        layout.Controls.Add(cueScrollPanel, 0, 1);

        var row = new WinForms.TableLayoutPanel
        {
            Dock = WinForms.DockStyle.Fill,
            ColumnCount = 2,
            RowCount = 1,
            BackColor = LoaderlyTheme.Surface
        };
        row.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Percent, 50));
        row.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Percent, 50));
        ConfigureButton(addCueButton, "Add cue", primary: false);
        ConfigureButton(deleteCueButton, "Delete", primary: false);
        addCueButton.Dock = WinForms.DockStyle.Fill;
        deleteCueButton.Dock = WinForms.DockStyle.Fill;
        addCueButton.Margin = new WinForms.Padding(0, 8, 5, 0);
        deleteCueButton.Margin = new WinForms.Padding(5, 8, 0, 0);
        row.Controls.Add(addCueButton, 0, 0);
        row.Controls.Add(deleteCueButton, 1, 0);
        layout.Controls.Add(row, 0, 2);

        return panel;
    }

    private WinForms.Control BuildPreviewPanel()
    {
        var panel = SectionPanel(new WinForms.Padding(0, 0, 14, 0));
        var layout = SectionLayout(5);
        layout.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Absolute, 34));
        layout.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Percent, 100));
        layout.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Absolute, 92));
        layout.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Absolute, 34));
        layout.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Absolute, 142));
        panel.Controls.Add(layout);

        layout.Controls.Add(SectionTitle("Preview"), 0, 0);
        layout.Controls.Add(BuildVideoPreview(), 0, 1);
        layout.Controls.Add(BuildTimelinePanel(), 0, 2);
        layout.Controls.Add(BuildMetaRow(), 0, 3);
        layout.Controls.Add(BuildCueTextEditor(), 0, 4);

        return panel;
    }

    private WinForms.Control BuildVideoPreview()
    {
        var frame = new RoundedPanel
        {
            Dock = WinForms.DockStyle.Fill,
            Radius = LoaderlyTheme.ControlRadius,
            BackColor = Color.Black,
            BorderColor = LoaderlyTheme.Border,
            Padding = new WinForms.Padding(1),
            Margin = new WinForms.Padding(0, 0, 0, 10)
        };

        videoSurface.Background = WpfMedia.Brushes.Black;
        WpfControls.Panel.SetZIndex(player, 0);
        videoSurface.Children.Add(player);

        subtitleTextBlock.TextWrapping = Wpf.TextWrapping.Wrap;
        subtitleTextBlock.TextAlignment = Wpf.TextAlignment.Center;
        subtitleTextBlock.MaxWidth = 780;
        subtitleOverlay.Child = subtitleTextBlock;
        subtitleOverlay.HorizontalAlignment = Wpf.HorizontalAlignment.Center;
        subtitleOverlay.VerticalAlignment = Wpf.VerticalAlignment.Bottom;
        subtitleOverlay.Margin = new Wpf.Thickness(20, 0, 20, 20);
        subtitleOverlay.Padding = new Wpf.Thickness(14, 7, 14, 8);
        subtitleOverlay.CornerRadius = new Wpf.CornerRadius(7);
        WpfControls.Panel.SetZIndex(subtitleOverlay, 1);
        videoSurface.Children.Add(subtitleOverlay);

        videoHost.Dock = WinForms.DockStyle.Fill;
        videoHost.Child = videoSurface;
        frame.Controls.Add(videoHost);
        return frame;
    }

    private WinForms.Control BuildTimelinePanel()
    {
        var panel = new RoundedPanel
        {
            Dock = WinForms.DockStyle.Fill,
            Radius = LoaderlyTheme.ControlRadius,
            BackColor = LoaderlyTheme.SurfaceMuted,
            BorderColor = LoaderlyTheme.Border,
            Padding = new WinForms.Padding(10),
            Margin = new WinForms.Padding(0, 0, 0, 8)
        };

        cueTimeline.Dock = WinForms.DockStyle.Fill;
        cueTimeline.Maximum = Math.Max(1, SecondsToUnits(clipDuration.TotalSeconds));
        cueTimeline.MinimumRange = Math.Max(1, TimeScale / 4);
        panel.Controls.Add(cueTimeline);
        return panel;
    }

    private void UpdateClipEnd(TimeSpan nextTrimEnd)
    {
        if (nextTrimEnd <= trimStart)
        {
            nextTrimEnd = trimStart + TimeSpan.FromSeconds(3);
        }

        trimEnd = nextTrimEnd;
        clipDuration = trimEnd - trimStart;
        updatingControls = true;
        cueTimeline.Maximum = Math.Max(1, SecondsToUnits(clipDuration.TotalSeconds));
        cueTimeline.MinimumRange = Math.Max(1, Math.Min(TimeScale / 4, cueTimeline.Maximum));
        cueTimeline.PositionValue = Math.Clamp(cueTimeline.PositionValue, 0, cueTimeline.Maximum);
        updatingControls = false;
        clipRangeLabel.Text = $"{LoaderlyLanguage.Text("Clip")} {FormatDisplayTime(trimStart)} - {FormatDisplayTime(trimEnd)}";
    }

    private WinForms.Control BuildMetaRow()
    {
        var row = new WinForms.TableLayoutPanel
        {
            Dock = WinForms.DockStyle.Fill,
            ColumnCount = 3,
            RowCount = 1,
            BackColor = LoaderlyTheme.Surface
        };
        row.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Percent, 50));
        row.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Percent, 50));
        row.ColumnStyles.Add(new WinForms.ColumnStyle(WinForms.SizeType.Absolute, 128));

        cueRangeLabel.Dock = WinForms.DockStyle.Fill;
        cueRangeLabel.TextAlign = ContentAlignment.MiddleLeft;
        cueRangeLabel.ForeColor = LoaderlyTheme.MutedText;
        cueRangeLabel.Font = LoaderlyTheme.BodyFont(9F);
        row.Controls.Add(cueRangeLabel, 0, 0);
        row.SetColumnSpan(cueRangeLabel, 2);

        ConfigureButton(playButton, "Play", primary: true);
        playButton.Enabled = false;
        playButton.Dock = WinForms.DockStyle.Fill;
        playButton.Margin = new WinForms.Padding(8, 2, 0, 2);
        row.Controls.Add(playButton, 2, 0);

        return row;
    }

    private WinForms.Control BuildCueTextEditor()
    {
        var layout = SectionLayout(2);
        layout.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Absolute, 28));
        layout.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Percent, 100));
        layout.Controls.Add(SmallLabel("Text"), 0, 0);

        cueTextBox.Dock = WinForms.DockStyle.Fill;
        cueTextBox.Multiline = true;
        cueTextBox.AcceptsReturn = true;
        cueTextBox.BorderStyle = WinForms.BorderStyle.None;
        cueTextBox.BackColor = LoaderlyTheme.SurfaceMuted;
        cueTextBox.ForeColor = LoaderlyTheme.Text;
        cueTextBox.Font = LoaderlyTheme.BodyFont(10.2F);
        cueTextBox.ScrollBars = WinForms.ScrollBars.None;
        cueTextBox.Margin = new WinForms.Padding(0, 2, 0, 0);
        layout.Controls.Add(cueTextBox, 0, 1);
        return layout;
    }

    private WinForms.Control BuildStylePanel()
    {
        var panel = SectionPanel(new WinForms.Padding(0));
        var layout = SectionLayout(12);
        layout.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Absolute, 34));
        layout.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Absolute, 52));
        layout.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Percent, 100));
        for (var i = 0; i < 9; i++)
        {
            layout.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Absolute, 50));
        }

        panel.Controls.Add(layout);
        layout.Controls.Add(SectionTitle("Style"), 0, 0);
        layout.Controls.Add(BuildFontSearch(), 0, 1);
        layout.Controls.Add(BuildFontList(), 0, 2);
        AddLabeledControl(layout, "Preset", stylePresetSelect, 3);
        AddLabeledControl(layout, "Size", fontSizeSelect, 4);

        ConfigureButton(textColorButton, "Text color", primary: false);
        ConfigureButton(backgroundColorButton, "Background", primary: false);
        AddLabeledControl(layout, "Color", textColorButton, 5);
        AddLabeledControl(layout, "Box", backgroundColorButton, 6);
        AddLabeledControl(layout, "Opacity", opacitySelect, 7);

        boldCheckBox.Text = "Bold text";
        boldCheckBox.Dock = WinForms.DockStyle.Fill;
        boldCheckBox.BackColor = LoaderlyTheme.Surface;
        boldCheckBox.ForeColor = LoaderlyTheme.Text;
        boldCheckBox.Margin = new WinForms.Padding(0, 10, 0, 6);
        layout.Controls.Add(boldCheckBox, 0, 8);

        stylePresetSelect.SetItems(StylePresets.Select(preset => preset.Name).ToArray());
        fontSizeSelect.SetItems(FontSizes);
        opacitySelect.SetItems(BackgroundOpacities);
        foreach (var select in new[] { stylePresetSelect, fontSizeSelect, opacitySelect })
        {
            select.Dock = WinForms.DockStyle.Fill;
            select.FillColor = LoaderlyTheme.SurfaceMuted;
            select.BorderColor = LoaderlyTheme.Border;
            select.ForeColor = LoaderlyTheme.Text;
        }

        return panel;
    }

    private WinForms.Control BuildFontSearch()
    {
        var host = new RoundedPanel
        {
            Dock = WinForms.DockStyle.Fill,
            Radius = LoaderlyTheme.ControlRadius,
            BackColor = LoaderlyTheme.SurfaceMuted,
            BorderColor = LoaderlyTheme.Border,
            Padding = new WinForms.Padding(10, 9, 10, 8),
            Margin = new WinForms.Padding(0, 4, 0, 8)
        };
        fontSearchTextBox.Dock = WinForms.DockStyle.Fill;
        fontSearchTextBox.PlaceholderText = "Search fonts";
        fontSearchTextBox.BorderStyle = WinForms.BorderStyle.None;
        fontSearchTextBox.BackColor = LoaderlyTheme.SurfaceMuted;
        fontSearchTextBox.ForeColor = LoaderlyTheme.Text;
        fontSearchTextBox.Font = LoaderlyTheme.BodyFont(9.3F);
        fontSearchTextBox.Margin = new WinForms.Padding(0);
        host.Controls.Add(fontSearchTextBox);
        return host;
    }

    private WinForms.Control BuildFontList()
    {
        fontScrollPanel.Dock = WinForms.DockStyle.Fill;
        fontScrollPanel.BackColor = LoaderlyTheme.SurfaceMuted;
        fontScrollPanel.Padding = new WinForms.Padding(0, 0, 10, 0);
        fontScrollPanel.Margin = new WinForms.Padding(0, 0, 0, 8);
        fontListPanel.Dock = WinForms.DockStyle.Top;
        fontListPanel.AutoSize = true;
        fontListPanel.BackColor = LoaderlyTheme.SurfaceMuted;
        fontScrollPanel.Controls.Add(fontListPanel);
        return fontScrollPanel;
    }

    private void BindEvents()
    {
        cueTextBox.TextChanged += (_, _) => UpdateSelectedCueText();
        addCueButton.Click += (_, _) => AddCue();
        deleteCueButton.Click += (_, _) => DeleteSelectedCues();
        playButton.Click += (_, _) => TogglePlayback();
        saveButton.Click += (_, _) => SaveAndClose();
        cancelButton.Click += (_, _) => DialogResult = WinForms.DialogResult.Cancel;
        textColorButton.Click += (_, _) => ChooseColor(isTextColor: true);
        backgroundColorButton.Click += (_, _) => ChooseColor(isTextColor: false);
        stylePresetSelect.SelectedIndexChanged += (_, _) => ApplySelectedStylePreset();
        fontSizeSelect.SelectedIndexChanged += (_, _) => ReadStyleControls();
        opacitySelect.SelectedIndexChanged += (_, _) => ReadStyleControls();
        boldCheckBox.CheckedChanged += (_, _) => ReadStyleControls();
        fontSearchTextBox.TextChanged += (_, _) => RenderFontList();
        cueTimeline.RangeChanged += (_, _) => UpdateSelectedCueFromTimeline();
        cueTimeline.PositionChanged += (_, _) =>
        {
            if (!updatingControls)
            {
                SeekTo(trimStart + UnitsToTime(cueTimeline.PositionValue));
            }
        };
        player.MediaOpened += (_, _) =>
        {
            previewLoadTimer.Stop();
            player.Pause();
            mediaReady = true;
            playButton.Enabled = true;
            playbackLabel.Text = LoaderlyLanguage.Text("Ready.");
            if (useFullSubtitleRange && player.NaturalDuration.HasTimeSpan)
            {
                UpdateClipEnd(MaxTime(trimEnd, TimelinePositionFromMediaPosition(player.NaturalDuration.TimeSpan, mediaOffset)));
            }

            SeekTo(pendingSeek ?? trimStart);
            pendingSeek = null;
            PrimePreviewFrame();
        };
        player.MediaFailed += (_, args) =>
        {
            previewLoadTimer.Stop();
            mediaReady = false;
            playButton.Enabled = false;
            previewTimer.Stop();
            playButton.Text = LoaderlyLanguage.Text("Play");
            playbackLabel.Text = args.ErrorException?.Message ?? LoaderlyLanguage.Text("Preview unavailable");
        };
        player.MediaEnded += (_, _) =>
        {
            previewTimer.Stop();
            playButton.Text = LoaderlyLanguage.Text("Play");
            SeekTo(trimStart);
        };

        previewTimer.Interval = 90;
        previewTimer.Tick += (_, _) => UpdatePlayback();
        previewPrimeTimer.Interval = PreviewPrimeDelayMilliseconds;
        previewPrimeTimer.Tick += (_, _) => FinishPreviewPrime();
        previewLoadTimer.Interval = PreviewLoadTimeoutMilliseconds;
        previewLoadTimer.Tick += (_, _) => RecoverFromPreviewLoadTimeout();
    }

    private void LoadSubtitleFile()
    {
        cues = File.Exists(subtitleFilePath)
            ? SrtSubtitleService.LoadFile(subtitleFilePath).ToList()
            : [];

        if (useFullSubtitleRange)
        {
            var subtitleEnd = cues.Count == 0
                ? trimStart + TimeSpan.FromMinutes(10)
                : cues.Max(cue => cue.End);
            UpdateClipEnd(subtitleEnd > trimStart ? subtitleEnd : trimStart + TimeSpan.FromSeconds(3));
        }

        if (cues.Count == 0 || VisibleCueIndices().Count == 0)
        {
            cues.Add(new SubtitleCue(trimStart, trimStart + TimeSpan.FromSeconds(Math.Min(3, Math.Max(1, clipDuration.TotalSeconds))), string.Empty));
        }

        selectedCueIndices.Clear();
        selectionAnchorCueIndex = -1;
        selectedCueIndex = -1;
        SelectCue(VisibleCueIndices().FirstOrDefault());
    }

    private void RenderCueList()
    {
        cueListPanel.SuspendLayout();
        cueListPanel.Controls.Clear();
        var top = 0;
        foreach (var cueIndex in VisibleCueIndices())
        {
            var button = new ModernButton
            {
                Text = CueLabel(cueIndex),
                Dock = WinForms.DockStyle.None,
                Anchor = WinForms.AnchorStyles.Top | WinForms.AnchorStyles.Left | WinForms.AnchorStyles.Right,
                Height = 34,
                Radius = 7,
                FillColor = selectedCueIndices.Contains(cueIndex) ? LoaderlyTheme.SelectedSurface : LoaderlyTheme.SurfaceMuted,
                HoverColor = LoaderlyTheme.ControlHover,
                ForeColor = LoaderlyTheme.Text,
                Font = LoaderlyTheme.BodyFont(8.8F),
                Margin = new WinForms.Padding(0, 0, 0, 4),
                Tag = cueIndex
            };
            button.Click += (_, _) => SelectCueFromClick((int)button.Tag);
            button.Width = Math.Max(1, cueScrollPanel.ClientSize.Width - 12);
            button.Location = new Point(0, top);
            cueListPanel.Controls.Add(button);
            top += button.Height + 4;
        }

        cueListPanel.Height = Math.Max(top, cueScrollPanel.Height);
        cueListPanel.ResumeLayout();
    }

    private void RenderFontList()
    {
        var query = fontSearchTextBox.Text.Trim();
        var fonts = installedFonts
            .Where(font => query.Length == 0 || font.Contains(query, StringComparison.OrdinalIgnoreCase))
            .Take(80)
            .ToList();

        if (fonts.Count == 0)
        {
            fonts.Add(SubtitleStyle.FontFamily);
        }

        fontListPanel.SuspendLayout();
        fontListPanel.Controls.Clear();
        var top = 0;
        foreach (var font in fonts)
        {
            var button = new ModernButton
            {
                Text = font,
                Dock = WinForms.DockStyle.None,
                Anchor = WinForms.AnchorStyles.Top | WinForms.AnchorStyles.Left | WinForms.AnchorStyles.Right,
                Height = 32,
                Radius = 7,
                FillColor = font.Equals(SubtitleStyle.FontFamily, StringComparison.OrdinalIgnoreCase)
                    ? LoaderlyTheme.SelectedSurface
                    : LoaderlyTheme.SurfaceMuted,
                HoverColor = LoaderlyTheme.ControlHover,
                ForeColor = LoaderlyTheme.Text,
                Font = PreviewFont(font),
                Margin = new WinForms.Padding(0, 0, 0, 4),
                Tag = font
            };
            button.Click += (_, _) =>
            {
                SubtitleStyle.FontFamily = (string)button.Tag;
                RenderFontList();
                ApplySubtitleStyle();
            };
            button.Width = Math.Max(1, fontScrollPanel.ClientSize.Width - 12);
            button.Location = new Point(0, top);
            fontListPanel.Controls.Add(button);
            top += button.Height + 4;
        }

        fontListPanel.Height = Math.Max(top, fontScrollPanel.Height);
        fontListPanel.ResumeLayout();
    }

    private void SelectCue(int cueIndex)
    {
        if (cueIndex < 0 || cueIndex >= cues.Count)
        {
            return;
        }

        ApplyCueSelection(new CueSelectionState([cueIndex], cueIndex, cueIndex));
    }

    private void SelectCueFromClick(int cueIndex)
    {
        var modifiers = WinForms.Control.ModifierKeys;
        var selection = CueSelectionAfterClick(
            selectedCueIndices,
            selectionAnchorCueIndex,
            selectedCueIndex,
            cueIndex,
            modifiers.HasFlag(WinForms.Keys.Control),
            modifiers.HasFlag(WinForms.Keys.Shift),
            VisibleCueIndices());
        ApplyCueSelection(selection);
    }

    private void ApplyCueSelection(CueSelectionState selection)
    {
        selectedCueIndices.Clear();
        foreach (var cueIndex in selection.SelectedIndices.Where(index => index >= 0 && index < cues.Count))
        {
            selectedCueIndices.Add(cueIndex);
        }

        selectedCueIndex = selectedCueIndices.Contains(selection.PrimaryIndex)
            ? selection.PrimaryIndex
            : selectedCueIndices.OrderBy(index => index).FirstOrDefault();
        selectionAnchorCueIndex = selection.AnchorIndex >= 0 && selection.AnchorIndex < cues.Count
            ? selection.AnchorIndex
            : selectedCueIndex;

        if (selectedCueIndex < 0 || selectedCueIndex >= cues.Count)
        {
            RenderCueList();
            return;
        }

        var cue = cues[selectedCueIndex];
        updatingControls = true;
        cueTextBox.Text = cue.Text;
        ApplyCueTextDirection(cue.Text);
        var start = SecondsToUnits(Math.Clamp((cue.Start - trimStart).TotalSeconds, 0, clipDuration.TotalSeconds));
        var end = SecondsToUnits(Math.Clamp((cue.End - trimStart).TotalSeconds, 0, clipDuration.TotalSeconds));
        if (end <= start)
        {
            end = Math.Min(cueTimeline.Maximum, start + Math.Max(1, TimeScale));
        }

        cueTimeline.SetRange(start, end);
        cueTimeline.PositionValue = start;
        updatingControls = false;
        RenderCueList();
        SeekTo(cue.Start);
        RefreshLabels();
    }

    private void UpdateSelectedCueText()
    {
        if (updatingControls || selectedCueIndex < 0 || selectedCueIndex >= cues.Count)
        {
            return;
        }

        var cue = cues[selectedCueIndex];
        cues[selectedCueIndex] = cue with { Text = cueTextBox.Text.Trim() };
        ApplyCueTextDirection(cueTextBox.Text);
        RenderCueList();
        UpdatePreviewSubtitle();
    }

    private void UpdateSelectedCueFromTimeline()
    {
        if (updatingControls || selectedCueIndex < 0 || selectedCueIndex >= cues.Count)
        {
            return;
        }

        var start = trimStart + UnitsToTime(cueTimeline.StartValue);
        var end = trimStart + UnitsToTime(cueTimeline.EndValue);
        if (end <= start)
        {
            end = start + TimeSpan.FromMilliseconds(500);
        }

        cues[selectedCueIndex] = cues[selectedCueIndex] with { Start = start, End = end };
        RenderCueList();
        RefreshLabels();
        UpdatePreviewSubtitle();
    }

    private void AddCue()
    {
        var start = trimStart + RelativePosition();
        var end = start + TimeSpan.FromSeconds(3);
        if (end > trimEnd)
        {
            end = trimEnd;
            start = trimEnd - TimeSpan.FromSeconds(Math.Min(3, Math.Max(0.5, clipDuration.TotalSeconds)));
        }

        cues.Add(new SubtitleCue(start, end, string.Empty));
        cues = cues.OrderBy(cue => cue.Start).ToList();
        selectedCueIndex = cues.FindIndex(cue => cue.Start == start && cue.End == end);
        SelectCue(selectedCueIndex);
    }

    private void DeleteSelectedCues()
    {
        var indicesToDelete = selectedCueIndices.Count == 0
            ? selectedCueIndex >= 0 && selectedCueIndex < cues.Count ? new List<int> { selectedCueIndex } : new List<int>()
            : selectedCueIndices.Where(index => index >= 0 && index < cues.Count).OrderByDescending(index => index).ToList();
        if (indicesToDelete.Count == 0)
        {
            return;
        }

        var firstDeleted = indicesToDelete.Min();
        foreach (var cueIndex in indicesToDelete)
        {
            cues.RemoveAt(cueIndex);
        }

        selectedCueIndices.Clear();
        selectionAnchorCueIndex = -1;
        if (cues.Count == 0)
        {
            selectedCueIndex = -1;
            updatingControls = true;
            cueTextBox.Clear();
            cueTimeline.SetRange(0, Math.Min(TimeScale, cueTimeline.Maximum));
            cueTimeline.PositionValue = 0;
            updatingControls = false;
            RenderCueList();
            RefreshLabels();
            UpdatePreviewSubtitle();
            return;
        }

        var visible = VisibleCueIndices();
        var nextCueIndex = visible.Count == 0
            ? 0
            : visible.Where(index => index >= firstDeleted).DefaultIfEmpty(visible[^1]).First();

        SelectCue(visible.Count == 0 ? 0 : nextCueIndex);
    }

    private void TogglePlayback()
    {
        if (player.Source is null || !mediaReady)
        {
            playbackLabel.Text = LoaderlyLanguage.Text(File.Exists(mediaFilePath) ? "Loading preview..." : "Preview unavailable");
            return;
        }

        if (previewTimer.Enabled)
        {
            player.Pause();
            previewTimer.Stop();
            playButton.Text = LoaderlyLanguage.Text("Play");
            return;
        }

        var position = CurrentPreviewPosition();
        if (position < trimStart || position >= trimEnd)
        {
            SeekTo(trimStart);
        }

        player.Play();
        previewTimer.Start();
        playButton.Text = LoaderlyLanguage.Text("Pause");
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

        if (ctrl && keyCode == WinForms.Keys.S)
        {
            SaveAndClose();
            return true;
        }

        if (keyCode == WinForms.Keys.Escape)
        {
            DialogResult = WinForms.DialogResult.Cancel;
            return true;
        }

        if (IsTypingInTextField())
        {
            return false;
        }

        if (!ctrl && !shift && keyCode == WinForms.Keys.Delete)
        {
            DeleteSelectedCues();
            return true;
        }

        if (!IsPlaybackShortcut(keyData))
        {
            return false;
        }

        if (!ctrl && !shift && keyCode == WinForms.Keys.Space)
        {
            TogglePlayback();
            return true;
        }

        if (keyCode == WinForms.Keys.Left || keyCode == WinForms.Keys.Right)
        {
            var direction = keyCode == WinForms.Keys.Left ? -1 : 1;
            if (ctrl && shift)
            {
                StepPreviewFrame(direction);
            }
            else
            {
                StepPreview(TimeSpan.FromSeconds(direction * (shift ? 5 : 1)));
            }

            return true;
        }

        if (!ctrl && keyCode == WinForms.Keys.Home)
        {
            SeekTo(trimStart);
            return true;
        }

        if (!ctrl && keyCode == WinForms.Keys.End)
        {
            SeekTo(trimEnd);
            return true;
        }

        return false;
    }

    private static bool IsPlaybackShortcut(WinForms.Keys keyData)
    {
        var keyCode = keyData & WinForms.Keys.KeyCode;
        var ctrl = keyData.HasFlag(WinForms.Keys.Control);
        var shift = keyData.HasFlag(WinForms.Keys.Shift);
        var alt = keyData.HasFlag(WinForms.Keys.Alt);

        if (alt)
        {
            return false;
        }

        if (!ctrl && !shift && keyCode == WinForms.Keys.Space)
        {
            return true;
        }

        if (keyCode == WinForms.Keys.Left || keyCode == WinForms.Keys.Right)
        {
            return !ctrl || shift;
        }

        return !ctrl && (keyCode == WinForms.Keys.Home || keyCode == WinForms.Keys.End);
    }

    private bool IsTypingInTextField()
    {
        return cueTextBox.Focused || fontSearchTextBox.Focused;
    }

    private void StepPreview(TimeSpan delta)
    {
        if (previewTimer.Enabled)
        {
            player.Pause();
            previewTimer.Stop();
            playButton.Text = LoaderlyLanguage.Text("Play");
        }

        SeekTo(CurrentPreviewPosition() + delta);
    }

    private void StepPreviewFrame(int direction)
    {
        StepPreview(TimeSpan.FromSeconds(direction / 30.0));
    }

    private void UpdatePlayback()
    {
        if (!mediaReady)
        {
            return;
        }

        var position = CurrentPreviewPosition();
        if (position >= trimEnd)
        {
            player.Pause();
            previewTimer.Stop();
            playButton.Text = LoaderlyLanguage.Text("Play");
            SeekTo(trimStart);
            return;
        }

        updatingControls = true;
        cueTimeline.PositionValue = SecondsToUnits(Math.Clamp((position - trimStart).TotalSeconds, 0, clipDuration.TotalSeconds));
        updatingControls = false;
        RefreshLabels();
        UpdatePreviewSubtitle(position);
    }

    private void PrimePreviewFrame()
    {
        if (player.Source is null || !mediaReady || previewTimer.Enabled)
        {
            return;
        }

        previewPrimeTimer.Stop();
        player.Play();
        previewPrimeTimer.Start();
    }

    private void FinishPreviewPrime()
    {
        previewPrimeTimer.Stop();
        if (IsDisposed || player.Source is null || previewTimer.Enabled)
        {
            return;
        }

        player.Pause();
        UpdatePreviewSubtitle(CurrentPreviewPosition());
    }

    private void RecoverFromPreviewLoadTimeout()
    {
        previewLoadTimer.Stop();
        if (IsDisposed || mediaReady || !File.Exists(mediaFilePath))
        {
            return;
        }

        var state = PreviewLoadTimeoutState(previewLoadRetries);
        playbackLabel.Text = LoaderlyLanguage.Text(state.Message);
        if (!state.ShouldRetry)
        {
            playButton.Enabled = false;
            player.Stop();
            player.Source = null;
            return;
        }

        previewLoadRetries++;
        player.Stop();
        player.Source = null;
        player.Source = new Uri(mediaFilePath);
        SeekTo(pendingSeek ?? trimStart);
        player.Play();
        previewLoadTimer.Start();
    }

    internal static (bool ShouldRetry, string Message) PreviewLoadTimeoutStateForTest(int retries)
    {
        return PreviewLoadTimeoutState(retries);
    }

    private static (bool ShouldRetry, string Message) PreviewLoadTimeoutState(int retries)
    {
        return retries < MaxPreviewLoadRetries
            ? (true, "Loading preview...")
            : (false, "Preview unavailable");
    }

    private void SeekTo(TimeSpan position)
    {
        var bounded = position < trimStart
            ? trimStart
            : position > trimEnd
                ? trimEnd
                : position;
        if (player.Source is not null && mediaReady)
        {
            player.Position = MediaPositionFromTimelinePosition(bounded, mediaOffset);
            PrimePreviewFrame();
        }
        else
        {
            pendingSeek = bounded;
        }

        updatingControls = true;
        cueTimeline.PositionValue = SecondsToUnits((bounded - trimStart).TotalSeconds);
        updatingControls = false;
        RefreshLabels();
        UpdatePreviewSubtitle(bounded);
    }

    private void UpdatePreviewSubtitle(TimeSpan? position = null)
    {
        var text = SrtSubtitleService.TextAt(cues, position ?? CurrentPreviewPosition());
        subtitleTextBlock.Text = text;
        subtitleOverlay.Visibility = string.IsNullOrWhiteSpace(text)
            ? Wpf.Visibility.Collapsed
            : Wpf.Visibility.Visible;
    }

    private void ApplyCueTextDirection(string text)
    {
        var isRtl = ContainsRtlText(text);
        cueTextBox.RightToLeft = isRtl ? WinForms.RightToLeft.Yes : WinForms.RightToLeft.No;
        cueTextBox.TextAlign = isRtl ? WinForms.HorizontalAlignment.Right : WinForms.HorizontalAlignment.Left;
    }

    private void RefreshLabels()
    {
        if (selectedCueIndex >= 0 && selectedCueIndex < cues.Count)
        {
            var cue = cues[selectedCueIndex];
            cueRangeLabel.Text = $"{FormatDisplayTime(cue.Start - trimStart)} - {FormatDisplayTime(cue.End - trimStart)}";
        }
        else
        {
            cueRangeLabel.Text = string.Empty;
        }

        playbackLabel.Text = FormatDisplayTime(RelativePosition());
    }

    private void ApplyStyleControls()
    {
        SelectModernValue(stylePresetSelect, MatchingPresetName(SubtitleStyle) ?? "Default");
        SelectModernValue(fontSizeSelect, Math.Round(SubtitleStyle.FontSize).ToString());
        SelectModernValue(opacitySelect, $"{SubtitleStyle.BackgroundOpacity}%");
        boldCheckBox.Checked = SubtitleStyle.Bold;
        RenderFontList();
        UpdateColorButtons();
    }

    private void ApplySelectedStylePreset()
    {
        if (stylePresetSelect.Items.Count == 0)
        {
            return;
        }

        SubtitleStyle = ApplyStylePreset(LoaderlyLanguage.EnglishFor(stylePresetSelect.SelectedText), SubtitleStyle);
        ApplyStyleControls();
        ApplySubtitleStyle();
    }

    private void ReadStyleControls()
    {
        if (fontSizeSelect.Items.Count == 0 || opacitySelect.Items.Count == 0)
        {
            return;
        }

        if (float.TryParse(fontSizeSelect.SelectedText, out var fontSize))
        {
            SubtitleStyle.FontSize = fontSize;
        }

        if (int.TryParse(opacitySelect.SelectedText.TrimEnd('%'), out var opacity))
        {
            SubtitleStyle.BackgroundOpacity = opacity;
        }

        SubtitleStyle.Bold = boldCheckBox.Checked;
        ApplySubtitleStyle();
    }

    private void ChooseColor(bool isTextColor)
    {
        using var dialog = new ColorDialog
        {
            FullOpen = true,
            Color = ColorTranslator.FromHtml(isTextColor ? SubtitleStyle.TextColor : SubtitleStyle.BackgroundColor)
        };

        if (dialog.ShowDialog(this) != WinForms.DialogResult.OK)
        {
            return;
        }

        var value = ColorTranslator.ToHtml(dialog.Color);
        if (isTextColor)
        {
            SubtitleStyle.TextColor = value;
        }
        else
        {
            SubtitleStyle.BackgroundColor = value;
        }

        UpdateColorButtons();
        ApplySubtitleStyle();
    }

    private void ApplySubtitleStyle()
    {
        subtitleTextBlock.FontFamily = new WpfMedia.FontFamily(SubtitleStyle.FontFamily);
        subtitleTextBlock.FontSize = SubtitleStyle.FontSize;
        subtitleTextBlock.FontWeight = SubtitleStyle.Bold ? Wpf.FontWeights.SemiBold : Wpf.FontWeights.Normal;
        subtitleTextBlock.Foreground = new WpfMedia.SolidColorBrush(ToWpfColor(SubtitleStyle.TextColor, 255));
        subtitleOverlay.Background = new WpfMedia.SolidColorBrush(ToWpfColor(
            SubtitleStyle.BackgroundColor,
            (int)Math.Round(SubtitleStyle.BackgroundOpacity / 100.0 * 255)));
        UpdatePreviewSubtitle();
    }

    private void UpdateColorButtons()
    {
        StyleColorButton(textColorButton, SubtitleStyle.TextColor);
        StyleColorButton(backgroundColorButton, SubtitleStyle.BackgroundColor);
    }

    private void SaveAndClose()
    {
        UpdateSelectedCueText();
        Directory.CreateDirectory(Path.GetDirectoryName(subtitleFilePath) ?? AppDataFolder.Path);
        File.WriteAllText(subtitleFilePath, SrtSubtitleService.FormatForPath(cues, subtitleFilePath));
        DialogResult = WinForms.DialogResult.OK;
    }

    private IReadOnlyList<int> VisibleCueIndices()
    {
        return cues
            .Select((cue, index) => (cue, index))
            .Where(item => item.cue.End > trimStart && item.cue.Start < trimEnd)
            .Select(item => item.index)
            .ToList();
    }

    private string CueLabel(int index)
    {
        var cue = cues[index];
        var text = cue.Text.Split(['\r', '\n'], StringSplitOptions.RemoveEmptyEntries).FirstOrDefault()?.Trim();
        if (string.IsNullOrWhiteSpace(text))
        {
            text = "(empty)";
        }

        return $"{FormatDisplayTime(cue.Start - trimStart)}  {text}";
    }

    private TimeSpan RelativePosition()
    {
        var absolute = CurrentPreviewPosition();
        if (absolute <= trimStart)
        {
            return TimeSpan.Zero;
        }

        return absolute >= trimEnd ? clipDuration : absolute - trimStart;
    }

    private TimeSpan CurrentPreviewPosition()
    {
        if (player.Source is not null && mediaReady)
        {
            return TimelinePositionFromMediaPosition(player.Position, mediaOffset);
        }

        return pendingSeek ?? trimStart + UnitsToTime(cueTimeline.PositionValue);
    }

    private static TimeSpan MediaPositionFromTimelinePosition(TimeSpan timelinePosition, TimeSpan mediaOffset)
    {
        var position = timelinePosition - NormalizeMediaOffset(mediaOffset);
        return position < TimeSpan.Zero ? TimeSpan.Zero : position;
    }

    private static TimeSpan TimelinePositionFromMediaPosition(TimeSpan mediaPosition, TimeSpan mediaOffset)
    {
        var position = mediaPosition < TimeSpan.Zero ? TimeSpan.Zero : mediaPosition;
        return NormalizeMediaOffset(mediaOffset) + position;
    }

    private static TimeSpan NormalizeMediaOffset(TimeSpan mediaOffset)
    {
        return mediaOffset < TimeSpan.Zero ? TimeSpan.Zero : mediaOffset;
    }

    private static List<string> LoadInstalledFonts()
    {
        using var collection = new InstalledFontCollection();
        return collection.Families
            .Select(family => family.Name)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(name => name, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static Font PreviewFont(string fontFamily)
    {
        try
        {
            return new Font(fontFamily, 8.8F, FontStyle.Regular);
        }
        catch
        {
            return LoaderlyTheme.BodyFont(8.8F);
        }
    }

    private static TimeSpan MaxTime(TimeSpan first, TimeSpan second)
    {
        return first >= second ? first : second;
    }

    private static bool ContainsRtlText(string text)
    {
        foreach (var character in text)
        {
            var code = character;
            if ((code >= 0x0590 && code <= 0x08FF) ||
                (code >= 0xFB1D && code <= 0xFDFF) ||
                (code >= 0xFE70 && code <= 0xFEFF))
            {
                return true;
            }
        }

        return false;
    }

    private static void StyleColorButton(ModernButton button, string htmlColor)
    {
        var color = ColorTranslator.FromHtml(htmlColor);
        button.FillColor = color;
        button.HoverColor = ControlPaint.Light(color);
        button.PressedColor = ControlPaint.Dark(color);
        button.ForeColor = color.GetBrightness() > 0.55F ? Color.Black : Color.White;
        button.Invalidate();
    }

    private static WpfMedia.Color ToWpfColor(string htmlColor, int alpha)
    {
        var color = ColorTranslator.FromHtml(htmlColor);
        return WpfMedia.Color.FromArgb((byte)Math.Clamp(alpha, 0, 255), color.R, color.G, color.B);
    }

    private static void SelectModernValue(ModernSelect select, string value)
    {
        var index = select.Items.FindIndex(item =>
            item.Equals(value, StringComparison.OrdinalIgnoreCase) ||
            LoaderlyLanguage.EnglishFor(item).Equals(value, StringComparison.OrdinalIgnoreCase));
        select.SelectedIndex = index >= 0 ? index : 0;
    }

    private static string FormatDisplayTime(TimeSpan time)
    {
        if (time < TimeSpan.Zero)
        {
            time = TimeSpan.Zero;
        }

        return time.TotalHours >= 1
            ? time.ToString(@"h\:mm\:ss")
            : time.ToString(@"m\:ss");
    }

    private static int SecondsToUnits(double seconds)
    {
        return Math.Max(0, (int)Math.Round(seconds * TimeScale));
    }

    private static TimeSpan UnitsToTime(int units)
    {
        return TimeSpan.FromSeconds(units / (double)TimeScale);
    }

    private static RoundedPanel SectionPanel(WinForms.Padding margin)
    {
        return new RoundedPanel
        {
            Dock = WinForms.DockStyle.Fill,
            Radius = LoaderlyTheme.PanelRadius,
            BackColor = LoaderlyTheme.Surface,
            BorderColor = LoaderlyTheme.Border,
            Padding = new WinForms.Padding(14),
            Margin = margin
        };
    }

    private static WinForms.TableLayoutPanel SectionLayout(int rowCount)
    {
        return new WinForms.TableLayoutPanel
        {
            Dock = WinForms.DockStyle.Fill,
            ColumnCount = 1,
            RowCount = rowCount,
            BackColor = LoaderlyTheme.Surface
        };
    }

    private static WinForms.Label SectionTitle(string text)
    {
        return new WinForms.Label
        {
            Dock = WinForms.DockStyle.Fill,
            Text = text,
            TextAlign = ContentAlignment.MiddleLeft,
            ForeColor = LoaderlyTheme.Text,
            Font = LoaderlyTheme.TitleFont(13F)
        };
    }

    private static WinForms.Label SmallLabel(string text)
    {
        return new WinForms.Label
        {
            Dock = WinForms.DockStyle.Fill,
            Text = text,
            TextAlign = ContentAlignment.BottomLeft,
            ForeColor = LoaderlyTheme.MutedText,
            Font = LoaderlyTheme.BodyFont(8.8F)
        };
    }

    private static void AddLabeledControl(WinForms.TableLayoutPanel parent, string label, WinForms.Control control, int row)
    {
        var layout = new WinForms.TableLayoutPanel
        {
            Dock = WinForms.DockStyle.Fill,
            ColumnCount = 1,
            RowCount = 2,
            BackColor = LoaderlyTheme.Surface,
            Margin = new WinForms.Padding(0, 3, 0, 3)
        };
        layout.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Absolute, 18));
        layout.RowStyles.Add(new WinForms.RowStyle(WinForms.SizeType.Percent, 100));
        layout.Controls.Add(SmallLabel(label), 0, 0);
        control.Dock = WinForms.DockStyle.Fill;
        control.Margin = new WinForms.Padding(0, 2, 0, 0);
        layout.Controls.Add(control, 0, 1);
        parent.Controls.Add(layout, 0, row);
    }

    private static SubtitleStyle ApplyStylePreset(string presetName, SubtitleStyle style)
    {
        var preset = StylePresets.FirstOrDefault(item => item.Name.Equals(presetName, StringComparison.OrdinalIgnoreCase));
        if (preset.Name is null)
        {
            return style.Clone();
        }

        return new SubtitleStyle
        {
            FontFamily = preset.FontFamily,
            FontSize = preset.FontSize,
            Bold = preset.Bold,
            TextColor = preset.TextColor,
            BackgroundColor = preset.BackgroundColor,
            BackgroundOpacity = preset.BackgroundOpacity
        };
    }

    private static string? MatchingPresetName(SubtitleStyle style)
    {
        return StylePresets.FirstOrDefault(preset =>
            preset.FontFamily.Equals(style.FontFamily, StringComparison.OrdinalIgnoreCase) &&
            Math.Abs(preset.FontSize - style.FontSize) < 0.1F &&
            preset.Bold == style.Bold &&
            preset.TextColor.Equals(style.TextColor, StringComparison.OrdinalIgnoreCase) &&
            preset.BackgroundColor.Equals(style.BackgroundColor, StringComparison.OrdinalIgnoreCase) &&
            preset.BackgroundOpacity == style.BackgroundOpacity).Name;
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

    private readonly record struct StylePreset(
        string Name,
        string FontFamily,
        float FontSize,
        bool Bold,
        string TextColor,
        string BackgroundColor,
        int BackgroundOpacity);
}
