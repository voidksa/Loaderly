using System.Drawing;
using System.Drawing.Drawing2D;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using Microsoft.Win32;

namespace Loaderly;

internal static class LoaderlyTheme
{
    private static string mode = "System";
    private static ThemePalette current = WindowsTheme.AppsUseLightTheme()
        ? ThemePalette.Light
        : ThemePalette.Dark;

    public static bool IsDark => current.IsDark;

    public static Color Window => current.Window;
    public static Color Sidebar => current.Sidebar;
    public static Color SidebarText => current.SidebarText;
    public static Color SidebarMuted => current.SidebarMuted;
    public static Color SidebarCard => current.SidebarCard;
    public static Color SidebarCardBorder => current.SidebarCardBorder;
    public static Color SidebarButton => current.SidebarButton;
    public static Color SidebarButtonHover => current.SidebarButtonHover;
    public static Color SidebarButtonPressed => current.SidebarButtonPressed;
    public static Color Surface => current.Surface;
    public static Color SurfaceMuted => current.SurfaceMuted;
    public static Color ControlHover => current.ControlHover;
    public static Color ControlPressed => current.ControlPressed;
    public static Color DisabledSurface => current.DisabledSurface;
    public static Color Border => current.Border;
    public static Color Text => current.Text;
    public static Color MutedText => current.MutedText;
    public static Color Accent => current.Accent;
    public static Color AccentHover => current.AccentHover;
    public static Color AccentPressed => current.AccentPressed;
    public static Color Accent2 => current.Accent2;
    public static Color Danger => current.Danger;
    public static Color DangerSurface => current.DangerSurface;
    public static Color DangerHover => current.DangerHover;
    public static Color SelectedSurface => current.SelectedSurface;
    public static Color SelectedBorder => current.SelectedBorder;
    public static Color TrimSurface => current.TrimSurface;
    public static Color TrimHover => current.TrimHover;
    public static Color TrimText => current.TrimText;
    public static Color ThumbnailBack => current.ThumbnailBack;

    public static bool RefreshFromSystem()
    {
        var next = ResolvePalette();
        var changed = next.IsDark != current.IsDark;
        current = next;
        return changed;
    }

    public static bool SetMode(string? themeMode)
    {
        mode = string.IsNullOrWhiteSpace(themeMode) ? "System" : themeMode;
        var next = ResolvePalette();
        var changed = next.IsDark != current.IsDark;
        current = next;
        return changed;
    }

    private static ThemePalette ResolvePalette()
    {
        if (mode.Equals("Light", StringComparison.OrdinalIgnoreCase))
        {
            return ThemePalette.Light;
        }

        if (mode.Equals("Dark", StringComparison.OrdinalIgnoreCase))
        {
            return ThemePalette.Dark;
        }

        return WindowsTheme.AppsUseLightTheme() ? ThemePalette.Light : ThemePalette.Dark;
    }

    public static Font TitleFont(float size = 22) => new("Segoe UI Variable Display", size, FontStyle.Bold);

    public static Font BodyFont(float size = 10) => new("Segoe UI Variable Text", size, FontStyle.Regular);

    public static GraphicsPath RoundedRect(Rectangle bounds, int radius)
    {
        var path = new GraphicsPath();
        var diameter = radius * 2;
        var arc = new Rectangle(bounds.Location, new Size(diameter, diameter));
        path.AddArc(arc, 180, 90);
        arc.X = bounds.Right - diameter;
        path.AddArc(arc, 270, 90);
        arc.Y = bounds.Bottom - diameter;
        path.AddArc(arc, 0, 90);
        arc.X = bounds.Left;
        path.AddArc(arc, 90, 90);
        path.CloseFigure();
        return path;
    }
}

internal sealed record ThemePalette(
    bool IsDark,
    Color Window,
    Color Sidebar,
    Color SidebarText,
    Color SidebarMuted,
    Color SidebarCard,
    Color SidebarCardBorder,
    Color SidebarButton,
    Color SidebarButtonHover,
    Color SidebarButtonPressed,
    Color Surface,
    Color SurfaceMuted,
    Color ControlHover,
    Color ControlPressed,
    Color DisabledSurface,
    Color Border,
    Color Text,
    Color MutedText,
    Color Accent,
    Color AccentHover,
    Color AccentPressed,
    Color Accent2,
    Color Danger,
    Color DangerSurface,
    Color DangerHover,
    Color SelectedSurface,
    Color SelectedBorder,
    Color TrimSurface,
    Color TrimHover,
    Color TrimText,
    Color ThumbnailBack)
{
    public static ThemePalette Light { get; } = new(
        IsDark: false,
        Window: Color.FromArgb(246, 247, 251),
        Sidebar: Color.FromArgb(255, 255, 255),
        SidebarText: Color.FromArgb(21, 26, 37),
        SidebarMuted: Color.FromArgb(91, 101, 119),
        SidebarCard: Color.FromArgb(240, 243, 249),
        SidebarCardBorder: Color.FromArgb(224, 229, 239),
        SidebarButton: Color.FromArgb(240, 243, 249),
        SidebarButtonHover: Color.FromArgb(229, 235, 247),
        SidebarButtonPressed: Color.FromArgb(218, 226, 241),
        Surface: Color.White,
        SurfaceMuted: Color.FromArgb(240, 243, 249),
        ControlHover: Color.FromArgb(229, 235, 247),
        ControlPressed: Color.FromArgb(218, 226, 241),
        DisabledSurface: Color.FromArgb(232, 236, 244),
        Border: Color.FromArgb(224, 229, 239),
        Text: Color.FromArgb(21, 26, 37),
        MutedText: Color.FromArgb(91, 101, 119),
        Accent: Color.FromArgb(68, 139, 246),
        AccentHover: Color.FromArgb(82, 151, 250),
        AccentPressed: Color.FromArgb(53, 119, 218),
        Accent2: Color.FromArgb(147, 92, 237),
        Danger: Color.FromArgb(210, 72, 82),
        DangerSurface: Color.FromArgb(255, 235, 238),
        DangerHover: Color.FromArgb(250, 220, 225),
        SelectedSurface: Color.FromArgb(235, 241, 255),
        SelectedBorder: Color.FromArgb(68, 139, 246),
        TrimSurface: Color.FromArgb(235, 229, 255),
        TrimHover: Color.FromArgb(225, 216, 252),
        TrimText: Color.FromArgb(84, 49, 157),
        ThumbnailBack: Color.FromArgb(18, 21, 29));

    public static ThemePalette Dark { get; } = new(
        IsDark: true,
        Window: Color.FromArgb(12, 14, 20),
        Sidebar: Color.FromArgb(8, 10, 15),
        SidebarText: Color.FromArgb(246, 248, 255),
        SidebarMuted: Color.FromArgb(145, 156, 178),
        SidebarCard: Color.FromArgb(22, 26, 38),
        SidebarCardBorder: Color.FromArgb(42, 48, 66),
        SidebarButton: Color.FromArgb(28, 33, 47),
        SidebarButtonHover: Color.FromArgb(39, 46, 64),
        SidebarButtonPressed: Color.FromArgb(50, 58, 80),
        Surface: Color.FromArgb(22, 25, 35),
        SurfaceMuted: Color.FromArgb(31, 36, 49),
        ControlHover: Color.FromArgb(39, 45, 61),
        ControlPressed: Color.FromArgb(49, 57, 76),
        DisabledSurface: Color.FromArgb(27, 31, 42),
        Border: Color.FromArgb(48, 55, 72),
        Text: Color.FromArgb(239, 243, 250),
        MutedText: Color.FromArgb(155, 166, 185),
        Accent: Color.FromArgb(75, 145, 255),
        AccentHover: Color.FromArgb(93, 158, 255),
        AccentPressed: Color.FromArgb(51, 122, 224),
        Accent2: Color.FromArgb(166, 111, 255),
        Danger: Color.FromArgb(255, 112, 125),
        DangerSurface: Color.FromArgb(63, 31, 38),
        DangerHover: Color.FromArgb(82, 38, 47),
        SelectedSurface: Color.FromArgb(28, 45, 78),
        SelectedBorder: Color.FromArgb(94, 160, 255),
        TrimSurface: Color.FromArgb(45, 35, 77),
        TrimHover: Color.FromArgb(57, 43, 94),
        TrimText: Color.FromArgb(212, 195, 255),
        ThumbnailBack: Color.FromArgb(10, 12, 18));
}

internal static class WindowsTheme
{
    private const string PersonalizeKey = @"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize";
    private const int DwmUseImmersiveDarkMode = 20;
    private const int DwmUseImmersiveDarkModeBefore20H1 = 19;

    public static bool AppsUseLightTheme()
    {
        using var key = Registry.CurrentUser.OpenSubKey(PersonalizeKey);
        var value = key?.GetValue("AppsUseLightTheme");
        return value is not int intValue || intValue != 0;
    }

    public static void ApplyTitleBarTheme(Form form)
    {
        if (!form.IsHandleCreated)
        {
            return;
        }

        var dark = LoaderlyTheme.IsDark ? 1 : 0;
        _ = DwmSetWindowAttribute(form.Handle, DwmUseImmersiveDarkMode, ref dark, sizeof(int));
        _ = DwmSetWindowAttribute(form.Handle, DwmUseImmersiveDarkModeBefore20H1, ref dark, sizeof(int));
    }

    [DllImport("dwmapi.dll")]
    private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attribute, ref int attributeValue, int attributeSize);
}

internal class RoundedPanel : Panel
{
    public int Radius { get; set; } = 18;

    public Color BorderColor { get; set; } = LoaderlyTheme.Border;

    public int BorderThickness { get; set; } = 1;

    public bool ClipToRoundedRegion { get; set; }

    public RoundedPanel()
    {
        SetStyle(
            ControlStyles.AllPaintingInWmPaint |
            ControlStyles.OptimizedDoubleBuffer |
            ControlStyles.ResizeRedraw |
            ControlStyles.UserPaint,
            true);
    }

    protected override void OnResize(EventArgs eventargs)
    {
        base.OnResize(eventargs);
        UpdateRegion();
        Invalidate();
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
        e.Graphics.PixelOffsetMode = PixelOffsetMode.Default;
        e.Graphics.Clear(Parent?.BackColor ?? LoaderlyTheme.Window);
        var rectangle = ClientRectangle;
        rectangle.Width -= 1;
        rectangle.Height -= 1;
        using var path = LoaderlyTheme.RoundedRect(rectangle, Radius);
        using var fill = new SolidBrush(BackColor);
        e.Graphics.FillPath(fill, path);
        if (BorderThickness > 0)
        {
            using var pen = new Pen(BorderColor, BorderThickness);
            e.Graphics.DrawPath(pen, path);
        }
    }

    protected override void OnBackColorChanged(EventArgs e)
    {
        base.OnBackColorChanged(e);
        Invalidate();
    }

    private void UpdateRegion()
    {
        if (!ClipToRoundedRegion)
        {
            Region?.Dispose();
            Region = null;
            return;
        }

        if (ClientSize.Width <= 0 || ClientSize.Height <= 0)
        {
            return;
        }

        var rectangle = ClientRectangle;
        rectangle.Width -= 1;
        rectangle.Height -= 1;
        using var path = LoaderlyTheme.RoundedRect(rectangle, Radius);
        Region?.Dispose();
        Region = new Region(path);
    }
}

internal sealed class ModernButton : Button
{
    private int radius = 12;
    private Color fillColor = LoaderlyTheme.SurfaceMuted;
    private Color hoverColor = Color.Empty;
    private Color pressedColor = Color.Empty;

    public int Radius
    {
        get => radius;
        set
        {
            radius = value;
            Invalidate();
        }
    }

    public Color FillColor
    {
        get => fillColor;
        set
        {
            fillColor = value;
            Invalidate();
        }
    }

    public Color HoverColor
    {
        get => hoverColor;
        set
        {
            hoverColor = value;
            Invalidate();
        }
    }

    public Color PressedColor
    {
        get => pressedColor;
        set
        {
            pressedColor = value;
            Invalidate();
        }
    }

    public string? DisplayText { get; set; }

    private bool isHovered;
    private bool isPressed;

    public ModernButton()
    {
        SetStyle(
            ControlStyles.AllPaintingInWmPaint |
            ControlStyles.OptimizedDoubleBuffer |
            ControlStyles.SupportsTransparentBackColor |
            ControlStyles.ResizeRedraw |
            ControlStyles.UserPaint,
            true);
        FlatStyle = FlatStyle.Flat;
        FlatAppearance.BorderSize = 0;
        FlatAppearance.MouseDownBackColor = Color.Transparent;
        FlatAppearance.MouseOverBackColor = Color.Transparent;
        BackColor = Color.Transparent;
        ForeColor = LoaderlyTheme.Text;
        Font = LoaderlyTheme.BodyFont(9.5F);
        Cursor = Cursors.Hand;
        TabStop = false;
        UseVisualStyleBackColor = false;
    }

    protected override void OnResize(EventArgs e)
    {
        base.OnResize(e);
        Invalidate();
    }

    protected override void OnMouseEnter(EventArgs e)
    {
        if (!Enabled)
        {
            base.OnMouseEnter(e);
            return;
        }

        isHovered = true;
        Invalidate();
        base.OnMouseEnter(e);
    }

    protected override void OnMouseLeave(EventArgs e)
    {
        isHovered = false;
        isPressed = false;
        Invalidate();
        base.OnMouseLeave(e);
    }

    protected override void OnMouseDown(MouseEventArgs mevent)
    {
        if (!Enabled)
        {
            base.OnMouseDown(mevent);
            return;
        }

        isPressed = mevent.Button == MouseButtons.Left;
        Invalidate();
        base.OnMouseDown(mevent);
    }

    protected override void OnMouseUp(MouseEventArgs mevent)
    {
        isPressed = false;
        Invalidate();
        base.OnMouseUp(mevent);
    }

    protected override void OnMouseMove(MouseEventArgs e)
    {
        if (!Enabled)
        {
            base.OnMouseMove(e);
            return;
        }

        var inside = ClientRectangle.Contains(e.Location);
        if (inside != isHovered)
        {
            isHovered = inside;
            Invalidate();
        }

        base.OnMouseMove(e);
    }

    protected override void OnPaint(PaintEventArgs pevent)
    {
        pevent.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
        pevent.Graphics.PixelOffsetMode = PixelOffsetMode.Default;
        pevent.Graphics.Clear(Parent?.BackColor ?? Color.Transparent);
        var hoverColor = HoverColor.IsEmpty ? LoaderlyTheme.ControlHover : HoverColor;
        var pressedColor = PressedColor.IsEmpty ? LoaderlyTheme.ControlPressed : PressedColor;
        var color = !Enabled
            ? LoaderlyTheme.DisabledSurface
            : isPressed
                ? pressedColor
                : isHovered
                    ? hoverColor
                    : FillColor;
        var textColor = Enabled ? ForeColor : LoaderlyTheme.MutedText;
        var rectangle = ClientRectangle;
        rectangle.Width -= 1;
        rectangle.Height -= 1;
        using var path = LoaderlyTheme.RoundedRect(rectangle, Radius);
        using var brush = new SolidBrush(color);
        pevent.Graphics.FillPath(brush, path);
        TextRenderer.DrawText(
            pevent.Graphics,
            DisplayText ?? Text,
            Font,
            rectangle,
            textColor,
            TextFormatFlags.HorizontalCenter |
            TextFormatFlags.VerticalCenter |
            TextFormatFlags.EndEllipsis |
            TextFormatFlags.SingleLine |
            TextFormatFlags.NoPrefix);
    }

    protected override void OnTextChanged(EventArgs e)
    {
        Invalidate();
        base.OnTextChanged(e);
    }

    protected override void OnEnabledChanged(EventArgs e)
    {
        if (!Enabled)
        {
            isHovered = false;
            isPressed = false;
        }

        Invalidate();
        base.OnEnabledChanged(e);
    }

}

internal sealed class ModernInfoBadge : Control
{
    private int radius = 12;

    public int Radius
    {
        get => radius;
        set
        {
            radius = value;
            Invalidate();
        }
    }

    public Color FillColor { get; set; } = LoaderlyTheme.SurfaceMuted;

    public Color BorderColor { get; set; } = LoaderlyTheme.Border;

    public Padding TextPadding { get; set; } = new(16, 0, 16, 0);

    public ModernInfoBadge()
    {
        SetStyle(
            ControlStyles.AllPaintingInWmPaint |
            ControlStyles.OptimizedDoubleBuffer |
            ControlStyles.ResizeRedraw |
            ControlStyles.UserPaint,
            true);
    }

    protected override void OnResize(EventArgs e)
    {
        base.OnResize(e);
        Invalidate();
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
        e.Graphics.PixelOffsetMode = PixelOffsetMode.Default;
        e.Graphics.Clear(Parent?.BackColor ?? LoaderlyTheme.Window);

        var rectangle = ClientRectangle;
        rectangle.Width -= 1;
        rectangle.Height -= 1;
        using (var path = LoaderlyTheme.RoundedRect(rectangle, Radius))
        using (var brush = new SolidBrush(FillColor))
        using (var pen = new Pen(BorderColor, 1))
        {
            e.Graphics.FillPath(brush, path);
            e.Graphics.DrawPath(pen, path);
        }

        var textRectangle = new Rectangle(
            TextPadding.Left,
            TextPadding.Top,
            Math.Max(1, Width - TextPadding.Horizontal),
            Math.Max(1, Height - TextPadding.Vertical));

        TextRenderer.DrawText(
            e.Graphics,
            Text,
            Font,
            textRectangle,
            ForeColor,
            TextFormatFlags.Left |
            TextFormatFlags.VerticalCenter |
            TextFormatFlags.EndEllipsis |
            TextFormatFlags.NoPrefix);
    }

}

internal sealed class ModernCommandButton : RoundedPanel
{
    private readonly Label label = new();
    private Color fillColor = LoaderlyTheme.Accent;
    private Color hoverColor = LoaderlyTheme.AccentHover;
    private Color pressedColor = LoaderlyTheme.AccentPressed;

    public Color FillColor
    {
        get => fillColor;
        set
        {
            fillColor = value;
            if (!isHovered && !isPressed)
            {
                BackColor = value;
            }

            Invalidate();
        }
    }

    public Color HoverColor
    {
        get => hoverColor;
        set => hoverColor = value;
    }

    public Color PressedColor
    {
        get => pressedColor;
        set => pressedColor = value;
    }

    public string? DisplayText
    {
        get => Text;
        set => Text = value ?? string.Empty;
    }

    public new string Text
    {
        get => label.Text;
        set
        {
            label.Text = value;
            Invalidate();
        }
    }

    private bool isHovered;
    private bool isPressed;

    public ModernCommandButton()
    {
        Radius = 8;
        BorderThickness = 0;
        BackColor = fillColor;
        ForeColor = Color.White;
        Font = LoaderlyTheme.BodyFont(10.5F);
        Cursor = Cursors.Hand;
        TabStop = false;

        label.Dock = DockStyle.Fill;
        label.BackColor = fillColor;
        label.ForeColor = ForeColor;
        label.Font = Font;
        label.TextAlign = ContentAlignment.MiddleCenter;
        label.Cursor = Cursors.Hand;
        label.Click += (_, _) => OnClick(EventArgs.Empty);
        label.MouseEnter += (_, _) => SetHover(true);
        label.MouseLeave += (_, _) => SetHover(false);
        label.MouseDown += (_, _) => SetPressed(true);
        label.MouseUp += (_, _) => SetPressed(false);
        Controls.Add(label);
    }

    protected override void OnMouseEnter(EventArgs e)
    {
        SetHover(true);
        base.OnMouseEnter(e);
    }

    protected override void OnMouseLeave(EventArgs e)
    {
        SetHover(false);
        base.OnMouseLeave(e);
    }

    protected override void OnMouseDown(MouseEventArgs e)
    {
        SetPressed(true);
        base.OnMouseDown(e);
    }

    protected override void OnMouseUp(MouseEventArgs e)
    {
        SetPressed(false);
        base.OnMouseUp(e);
    }

    protected override void OnFontChanged(EventArgs e)
    {
        label.Font = Font;
        base.OnFontChanged(e);
    }

    protected override void OnForeColorChanged(EventArgs e)
    {
        label.ForeColor = ForeColor;
        base.OnForeColorChanged(e);
    }

    protected override void OnEnabledChanged(EventArgs e)
    {
        label.ForeColor = Enabled ? ForeColor : LoaderlyTheme.MutedText;
        label.Enabled = Enabled;
        BackColor = Enabled ? fillColor : LoaderlyTheme.DisabledSurface;
        label.BackColor = BackColor;
        base.OnEnabledChanged(e);
    }

    private void SetHover(bool hovered)
    {
        if (!Enabled)
        {
            return;
        }

        isHovered = hovered && ClientRectangle.Contains(PointToClient(Cursor.Position));
        if (!isHovered)
        {
            isPressed = false;
        }

        UpdateFill();
    }

    private void SetPressed(bool pressed)
    {
        if (!Enabled)
        {
            return;
        }

        isPressed = pressed;
        UpdateFill();
    }

    private void UpdateFill()
    {
        BackColor = isPressed ? pressedColor : isHovered ? hoverColor : fillColor;
        label.BackColor = BackColor;
    }
}

internal sealed class NativeCommandButton : Panel
{
    private readonly Label label = new();
    private Color fillColor = LoaderlyTheme.Accent;
    private Color hoverColor = LoaderlyTheme.AccentHover;
    private Color pressedColor = LoaderlyTheme.AccentPressed;
    private bool hovered;
    private bool pressed;

    private int radius = 8;

    public int Radius
    {
        get => radius;
        set
        {
            radius = value;
            Invalidate();
        }
    }

    public Color FillColor
    {
        get => fillColor;
        set
        {
            fillColor = value;
            UpdateFill();
        }
    }

    public Color HoverColor
    {
        get => hoverColor;
        set => hoverColor = value;
    }

    public Color PressedColor
    {
        get => pressedColor;
        set => pressedColor = value;
    }

    public new string Text
    {
        get => label.Text;
        set => label.Text = value;
    }

    public NativeCommandButton()
    {
        SetStyle(
            ControlStyles.AllPaintingInWmPaint |
            ControlStyles.OptimizedDoubleBuffer |
            ControlStyles.ResizeRedraw,
            true);
        BackColor = fillColor;
        ForeColor = Color.White;
        Font = LoaderlyTheme.BodyFont(10.5F);
        Cursor = Cursors.Hand;
        TabStop = false;

        label.Dock = DockStyle.Fill;
        label.BackColor = fillColor;
        label.ForeColor = ForeColor;
        label.Font = Font;
        label.TextAlign = ContentAlignment.MiddleCenter;
        label.Cursor = Cursors.Hand;
        label.Click += (_, _) => OnClick(EventArgs.Empty);
        label.MouseEnter += (_, _) => SetHover(true);
        label.MouseLeave += (_, _) => SetHover(false);
        label.MouseDown += (_, _) => SetPressed(true);
        label.MouseUp += (_, _) => SetPressed(false);
        Controls.Add(label);
    }

    protected override void OnResize(EventArgs e)
    {
        base.OnResize(e);
        if (ClientSize.Width <= 0 || ClientSize.Height <= 0)
        {
            return;
        }

        using var path = LoaderlyTheme.RoundedRect(ClientRectangle, Radius);
        Region?.Dispose();
        Region = new Region(path);
    }

    protected override void OnMouseEnter(EventArgs e)
    {
        SetHover(true);
        base.OnMouseEnter(e);
    }

    protected override void OnMouseLeave(EventArgs e)
    {
        SetHover(false);
        base.OnMouseLeave(e);
    }

    protected override void OnMouseDown(MouseEventArgs e)
    {
        SetPressed(true);
        base.OnMouseDown(e);
    }

    protected override void OnMouseUp(MouseEventArgs e)
    {
        SetPressed(false);
        base.OnMouseUp(e);
    }

    protected override void OnFontChanged(EventArgs e)
    {
        label.Font = Font;
        base.OnFontChanged(e);
    }

    protected override void OnForeColorChanged(EventArgs e)
    {
        label.ForeColor = ForeColor;
        base.OnForeColorChanged(e);
    }

    private void SetHover(bool value)
    {
        hovered = value && ClientRectangle.Contains(PointToClient(Cursor.Position));
        if (!hovered)
        {
            pressed = false;
        }

        UpdateFill();
    }

    private void SetPressed(bool value)
    {
        pressed = value;
        UpdateFill();
    }

    private void UpdateFill()
    {
        var color = pressed ? pressedColor : hovered ? hoverColor : fillColor;
        BackColor = color;
        label.BackColor = color;
    }
}

internal sealed class LabelCommandButton : Label
{
    private Color fillColor = LoaderlyTheme.Accent;
    private Color hoverColor = LoaderlyTheme.AccentHover;
    private Color pressedColor = LoaderlyTheme.AccentPressed;
    private bool hovered;
    private bool pressed;

    public int Radius { get; set; } = 8;

    public Color FillColor
    {
        get => fillColor;
        set
        {
            fillColor = value;
            UpdateFill();
        }
    }

    public Color HoverColor
    {
        get => hoverColor;
        set => hoverColor = value;
    }

    public Color PressedColor
    {
        get => pressedColor;
        set => pressedColor = value;
    }

    public LabelCommandButton()
    {
        SetStyle(
            ControlStyles.AllPaintingInWmPaint |
            ControlStyles.OptimizedDoubleBuffer |
            ControlStyles.ResizeRedraw |
            ControlStyles.UserPaint,
            true);
        AutoSize = false;
        BackColor = fillColor;
        ForeColor = Color.White;
        Font = LoaderlyTheme.BodyFont(10.5F);
        TextAlign = ContentAlignment.MiddleCenter;
        Cursor = Cursors.Hand;
    }

    protected override void OnResize(EventArgs e)
    {
        base.OnResize(e);
        if (ClientSize.Width <= 0 || ClientSize.Height <= 0)
        {
            return;
        }

        using var path = LoaderlyTheme.RoundedRect(ClientRectangle, Radius);
        Region?.Dispose();
        Region = new Region(path);
    }

    protected override void OnMouseEnter(EventArgs e)
    {
        hovered = true;
        UpdateFill();
        base.OnMouseEnter(e);
    }

    protected override void OnMouseLeave(EventArgs e)
    {
        hovered = false;
        pressed = false;
        UpdateFill();
        base.OnMouseLeave(e);
    }

    protected override void OnMouseDown(MouseEventArgs e)
    {
        pressed = true;
        UpdateFill();
        base.OnMouseDown(e);
    }

    protected override void OnMouseUp(MouseEventArgs e)
    {
        pressed = false;
        UpdateFill();
        base.OnMouseUp(e);
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
        e.Graphics.Clear(Parent?.BackColor ?? LoaderlyTheme.Surface);
        var rectangle = ClientRectangle;
        rectangle.Width -= 1;
        rectangle.Height -= 1;
        using (var path = LoaderlyTheme.RoundedRect(rectangle, Radius))
        using (var brush = new SolidBrush(BackColor))
        {
            e.Graphics.FillPath(brush, path);
        }

        TextRenderer.DrawText(
            e.Graphics,
            Text,
            Font,
            rectangle,
            ForeColor,
            TextFormatFlags.HorizontalCenter |
            TextFormatFlags.VerticalCenter |
            TextFormatFlags.EndEllipsis |
            TextFormatFlags.SingleLine |
            TextFormatFlags.NoPrefix);
    }

    private void UpdateFill()
    {
        BackColor = pressed ? pressedColor : hovered ? hoverColor : fillColor;
    }
}

internal sealed class ModernProgressBar : Control
{
    private readonly System.Windows.Forms.Timer animationTimer = new() { Interval = 70 };
    private int value;
    private int animationStep;
    private bool isIndeterminate;

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

    public bool IsIndeterminate
    {
        get => isIndeterminate;
        set
        {
            if (isIndeterminate == value)
            {
                return;
            }

            isIndeterminate = value;
            UpdateAnimationTimer();
            Invalidate();
        }
    }

    public ModernProgressBar()
    {
        SetStyle(
            ControlStyles.AllPaintingInWmPaint |
            ControlStyles.OptimizedDoubleBuffer |
            ControlStyles.ResizeRedraw |
            ControlStyles.UserPaint,
            true);
        Height = 8;
        animationTimer.Tick += (_, _) =>
        {
            animationStep = (animationStep + 5) % 100;
            Invalidate();
        };
    }

    protected override void OnVisibleChanged(EventArgs e)
    {
        base.OnVisibleChanged(e);
        UpdateAnimationTimer();
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
        e.Graphics.Clear(Parent?.BackColor ?? LoaderlyTheme.Surface);

        var track = new Rectangle(0, Math.Max(0, Height / 2 - 3), Width, 6);
        if (track.Width <= 0)
        {
            return;
        }

        using (var trackPath = LoaderlyTheme.RoundedRect(track, 3))
        using (var trackBrush = new SolidBrush(LoaderlyTheme.SurfaceMuted))
        {
            e.Graphics.FillPath(trackBrush, trackPath);
        }

        Rectangle fill;
        if (IsIndeterminate)
        {
            var segmentWidth = Math.Max(72, track.Width / 5);
            var travel = track.Width + segmentWidth;
            var x = track.Left + (int)Math.Round(travel * (animationStep / 100.0)) - segmentWidth;
            fill = new Rectangle(x, track.Top, segmentWidth, track.Height);
        }
        else
        {
            var fillWidth = (int)Math.Round(track.Width * (Value / 100.0));
            if (fillWidth <= 0)
            {
                return;
            }

            fill = new Rectangle(track.Left, track.Top, Math.Max(track.Height, fillWidth), track.Height);
        }

        var clipState = e.Graphics.Save();
        using (var trackPath = LoaderlyTheme.RoundedRect(track, 3))
        {
            e.Graphics.SetClip(trackPath);
            using var fillBrush = new SolidBrush(LoaderlyTheme.Accent);
            e.Graphics.FillRectangle(fillBrush, fill);
        }

        e.Graphics.Restore(clipState);
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            animationTimer.Dispose();
        }

        base.Dispose(disposing);
    }

    private void UpdateAnimationTimer()
    {
        if (Visible && IsIndeterminate)
        {
            animationTimer.Start();
        }
        else
        {
            animationTimer.Stop();
        }
    }
}

internal sealed class ModernComboBox : ComboBox
{
    private const int WmPaint = 0x000F;

    public ModernComboBox()
    {
        DrawMode = DrawMode.OwnerDrawFixed;
        DropDownStyle = ComboBoxStyle.DropDownList;
        FlatStyle = FlatStyle.Flat;
        BackColor = LoaderlyTheme.SurfaceMuted;
        ForeColor = LoaderlyTheme.Text;
        Font = LoaderlyTheme.BodyFont(9.5F);
        ItemHeight = 24;
    }

    protected override void OnResize(EventArgs e)
    {
        base.OnResize(e);
        Invalidate();
    }

    protected override void OnMouseWheel(MouseEventArgs e)
    {
        if (!DroppedDown)
        {
            if (e is HandledMouseEventArgs handled)
            {
                handled.Handled = true;
            }

            return;
        }

        base.OnMouseWheel(e);
    }

    protected override void WndProc(ref Message m)
    {
        base.WndProc(ref m);
        if (m.Msg == WmPaint && DropDownStyle == ComboBoxStyle.DropDownList)
        {
            DrawClosedState();
        }
    }

    protected override void OnSelectedIndexChanged(EventArgs e)
    {
        base.OnSelectedIndexChanged(e);
        Invalidate();
    }

    protected override void OnEnabledChanged(EventArgs e)
    {
        base.OnEnabledChanged(e);
        Invalidate();
    }

    protected override void OnDrawItem(DrawItemEventArgs e)
    {
        if (e.Index < 0)
        {
            return;
        }

        var highlighted = (e.State & DrawItemState.Selected) == DrawItemState.Selected ||
            (e.State & DrawItemState.HotLight) == DrawItemState.HotLight;
        using var background = new SolidBrush(highlighted ? LoaderlyTheme.ControlHover : LoaderlyTheme.SurfaceMuted);
        e.Graphics.FillRectangle(background, e.Bounds);
        var text = GetItemText(Items[e.Index]);
        TextRenderer.DrawText(
            e.Graphics,
            text,
            Font,
            new Rectangle(e.Bounds.X + 8, e.Bounds.Y, Math.Max(1, e.Bounds.Width - 10), e.Bounds.Height),
            Enabled ? LoaderlyTheme.Text : LoaderlyTheme.MutedText,
            TextFormatFlags.Left | TextFormatFlags.VerticalCenter | TextFormatFlags.EndEllipsis);
    }

    private void DrawClosedState()
    {
        if (!IsHandleCreated || IsDisposed || Width <= 0 || Height <= 0)
        {
            return;
        }

        using var graphics = Graphics.FromHwnd(Handle);
        graphics.SmoothingMode = SmoothingMode.AntiAlias;
        graphics.Clear(Parent?.BackColor ?? LoaderlyTheme.Surface);
        var bounds = new Rectangle(0, 0, Width - 1, Height - 1);
        using (var background = new SolidBrush(Enabled ? BackColor : LoaderlyTheme.DisabledSurface))
        using (var path = LoaderlyTheme.RoundedRect(bounds, 6))
        {
            graphics.FillPath(background, path);
        }

        using (var border = new Pen(LoaderlyTheme.Border))
        using (var path = LoaderlyTheme.RoundedRect(bounds, 6))
        {
            graphics.DrawPath(border, path);
        }

        var arrowBounds = new Rectangle(Width - 30, 0, 28, Height);
        var arrowCenter = new Point(arrowBounds.Left + arrowBounds.Width / 2, Height / 2 + 1);
        var arrow = new[]
        {
            new Point(arrowCenter.X - 4, arrowCenter.Y - 2),
            new Point(arrowCenter.X + 4, arrowCenter.Y - 2),
            new Point(arrowCenter.X, arrowCenter.Y + 3)
        };
        using (var arrowBrush = new SolidBrush(Enabled ? LoaderlyTheme.MutedText : LoaderlyTheme.Border))
        {
            graphics.FillPolygon(arrowBrush, arrow);
        }

        var textBounds = new Rectangle(8, 0, Math.Max(1, Width - arrowBounds.Width - 12), Height);
        TextRenderer.DrawText(
            graphics,
            Text,
            Font,
            textBounds,
            Enabled ? ForeColor : LoaderlyTheme.MutedText,
            TextFormatFlags.Left | TextFormatFlags.VerticalCenter | TextFormatFlags.EndEllipsis);
    }
}

internal sealed class ModernSelect : Control
{
    private readonly ContextMenuStrip menu = new()
    {
        ShowImageMargin = false,
        ShowCheckMargin = false,
        Padding = new Padding(4)
    };

    private int selectedIndex = -1;
    private bool isHovered;
    private bool isPressed;
    private bool clickArmed;

    public event EventHandler? SelectedIndexChanged;

    public List<string> Items { get; } = [];

    private int radius = 8;

    public int Radius
    {
        get => radius;
        set
        {
            radius = value;
            Invalidate();
        }
    }

    public Color FillColor { get; set; } = LoaderlyTheme.SurfaceMuted;

    public Color BorderColor { get; set; } = LoaderlyTheme.Border;

    public int SelectedIndex
    {
        get => selectedIndex;
        set
        {
            var next = Items.Count == 0 ? -1 : Math.Clamp(value, 0, Items.Count - 1);
            if (selectedIndex == next)
            {
                return;
            }

            selectedIndex = next;
            Invalidate();
            SelectedIndexChanged?.Invoke(this, EventArgs.Empty);
        }
    }

    public string SelectedText => selectedIndex >= 0 && selectedIndex < Items.Count
        ? Items[selectedIndex]
        : string.Empty;

    public ModernSelect()
    {
        SetStyle(
            ControlStyles.AllPaintingInWmPaint |
            ControlStyles.OptimizedDoubleBuffer |
            ControlStyles.Selectable |
            ControlStyles.SupportsTransparentBackColor |
            ControlStyles.ResizeRedraw |
            ControlStyles.UserPaint,
            true);
        BackColor = Color.Transparent;
        ForeColor = LoaderlyTheme.Text;
        Font = LoaderlyTheme.BodyFont(9.7F);
        Cursor = Cursors.Hand;
        TabStop = false;
        menu.Renderer = new ModernMenuRenderer();
    }

    public void SetItems(params string[] items)
    {
        var previousText = SelectedText;
        Items.Clear();
        Items.AddRange(items);
        var nextIndex = Items.IndexOf(previousText);
        SelectedIndex = nextIndex >= 0 ? nextIndex : Items.Count > 0 ? 0 : -1;
        Invalidate();
    }

    protected override void OnMouseEnter(EventArgs e)
    {
        isHovered = true;
        Invalidate();
        base.OnMouseEnter(e);
    }

    protected override void OnMouseLeave(EventArgs e)
    {
        isHovered = false;
        isPressed = false;
        clickArmed = false;
        Invalidate();
        base.OnMouseLeave(e);
    }

    protected override void OnMouseDown(MouseEventArgs e)
    {
        if (Enabled)
        {
            isPressed = e.Button == MouseButtons.Left;
            clickArmed = isPressed;
            Invalidate();
        }

        base.OnMouseDown(e);
    }

    protected override void OnMouseUp(MouseEventArgs e)
    {
        var shouldClick = Enabled &&
            clickArmed &&
            e.Button == MouseButtons.Left &&
            ClientRectangle.Contains(e.Location);
        isPressed = false;
        clickArmed = false;
        Invalidate();
        base.OnMouseUp(e);
        if (shouldClick)
        {
            ShowMenu();
        }
    }

    protected override void OnKeyDown(KeyEventArgs e)
    {
        if (e.KeyCode is Keys.Space or Keys.Enter)
        {
            ShowMenu();
            e.Handled = true;
        }

        base.OnKeyDown(e);
    }

    protected override void OnResize(EventArgs e)
    {
        base.OnResize(e);
        Invalidate();
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
        e.Graphics.PixelOffsetMode = PixelOffsetMode.Default;
        e.Graphics.Clear(Parent?.BackColor ?? LoaderlyTheme.Surface);

        var rectangle = ClientRectangle;
        rectangle.Width -= 1;
        rectangle.Height -= 1;
        var fill = !Enabled
            ? LoaderlyTheme.DisabledSurface
            : isPressed
                ? LoaderlyTheme.ControlPressed
                : isHovered
                    ? LoaderlyTheme.ControlHover
                    : FillColor;

        using (var path = LoaderlyTheme.RoundedRect(rectangle, Radius))
        using (var brush = new SolidBrush(fill))
        using (var pen = new Pen(BorderColor))
        {
            e.Graphics.FillPath(brush, path);
            e.Graphics.DrawPath(pen, path);
        }

        var rtl = RightToLeft == RightToLeft.Yes;
        var arrowCenter = new Point(rtl ? 18 : Width - 18, Height / 2 + 1);
        var arrow = new[]
        {
            new Point(arrowCenter.X - 4, arrowCenter.Y - 2),
            new Point(arrowCenter.X + 4, arrowCenter.Y - 2),
            new Point(arrowCenter.X, arrowCenter.Y + 3)
        };
        using (var arrowBrush = new SolidBrush(Enabled ? LoaderlyTheme.MutedText : LoaderlyTheme.Border))
        {
            e.Graphics.FillPolygon(arrowBrush, arrow);
        }

        var textBounds = rtl
            ? new Rectangle(36, 0, Math.Max(1, Width - 46), Height)
            : new Rectangle(10, 0, Math.Max(1, Width - 36), Height);
        TextRenderer.DrawText(
            e.Graphics,
            SelectedText,
            Font,
            textBounds,
            Enabled ? ForeColor : LoaderlyTheme.MutedText,
            TextFlags(rtl));
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            menu.Dispose();
        }

        base.Dispose(disposing);
    }

    private void ShowMenu()
    {
        if (Items.Count == 0)
        {
            return;
        }

        menu.Items.Clear();
        menu.BackColor = LoaderlyTheme.SurfaceMuted;
        menu.ForeColor = LoaderlyTheme.Text;
        var rtl = RightToLeft == RightToLeft.Yes;
        menu.RightToLeft = rtl ? RightToLeft.Yes : RightToLeft.No;
        var itemWidth = Math.Max(Width, Items.Max(item => TextRenderer.MeasureText(item, Font).Width + 34));
        foreach (var (text, index) in Items.Select((text, index) => (text, index)))
        {
            var item = new ToolStripMenuItem(text)
            {
                AutoSize = false,
                Width = itemWidth,
                Height = 30,
                BackColor = LoaderlyTheme.SurfaceMuted,
                ForeColor = LoaderlyTheme.Text,
                Font = Font,
                Checked = index == selectedIndex,
                RightToLeft = rtl ? RightToLeft.Yes : RightToLeft.No,
                TextAlign = rtl ? ContentAlignment.MiddleRight : ContentAlignment.MiddleLeft
            };
            item.Click += (_, _) => SelectedIndex = index;
            menu.Items.Add(item);
        }

        var menuWidth = menu.GetPreferredSize(Size.Empty).Width;
        var point = PointToScreen(new Point(MenuX(Width, menuWidth, rtl), Height + 3));
        menu.Show(point);
    }

    internal static int MenuXForTest(int controlWidth, int menuWidth, bool rtl)
    {
        return MenuX(controlWidth, menuWidth, rtl);
    }

    internal static TextFormatFlags TextFlagsForTest(bool rtl)
    {
        return TextFlags(rtl);
    }

    private static int MenuX(int controlWidth, int menuWidth, bool rtl)
    {
        return rtl ? controlWidth - menuWidth : 0;
    }

    private static TextFormatFlags TextFlags(bool rtl)
    {
        var flags = TextFormatFlags.VerticalCenter |
            TextFormatFlags.EndEllipsis |
            TextFormatFlags.SingleLine |
            TextFormatFlags.NoPrefix;
        return rtl
            ? flags | TextFormatFlags.Right | TextFormatFlags.RightToLeft
            : flags | TextFormatFlags.Left;
    }

}

internal sealed class ModernMenuRenderer : ToolStripProfessionalRenderer
{
    protected override void OnRenderToolStripBackground(ToolStripRenderEventArgs e)
    {
        using var brush = new SolidBrush(LoaderlyTheme.SurfaceMuted);
        e.Graphics.FillRectangle(brush, e.AffectedBounds);
    }

    protected override void OnRenderImageMargin(ToolStripRenderEventArgs e)
    {
        using var brush = new SolidBrush(LoaderlyTheme.SurfaceMuted);
        e.Graphics.FillRectangle(brush, e.AffectedBounds);
    }

    protected override void OnRenderMenuItemBackground(ToolStripItemRenderEventArgs e)
    {
        var bounds = new Rectangle(Point.Empty, e.Item.Size);
        var fill = e.Item.Selected ? LoaderlyTheme.ControlHover : LoaderlyTheme.SurfaceMuted;
        using var brush = new SolidBrush(fill);
        e.Graphics.FillRectangle(brush, bounds);
    }

    protected override void OnRenderItemImage(ToolStripItemImageRenderEventArgs e)
    {
        if (e.Image is null)
        {
            return;
        }

        const int size = 16;
        var bounds = new Rectangle(12, Math.Max(0, (e.Item.Height - size) / 2), size, size);
        e.Graphics.DrawImage(e.Image, bounds);
    }

    protected override void OnRenderItemText(ToolStripItemTextRenderEventArgs e)
    {
        var hasImage = e.Item.Image is not null;
        var left = hasImage ? 38 : 10;
        var bounds = new Rectangle(
            left,
            0,
            Math.Max(1, e.Item.Width - left - 10),
            e.Item.Height);
        TextRenderer.DrawText(
            e.Graphics,
            e.Text,
            e.TextFont,
            bounds,
            e.Item.Enabled ? LoaderlyTheme.Text : LoaderlyTheme.MutedText,
            TextFormatFlags.Left |
            TextFormatFlags.VerticalCenter |
            TextFormatFlags.SingleLine |
            TextFormatFlags.NoPrefix);
    }

    protected override void OnRenderToolStripBorder(ToolStripRenderEventArgs e)
    {
        using var pen = new Pen(LoaderlyTheme.Border);
        var bounds = new Rectangle(Point.Empty, e.ToolStrip.Size);
        bounds.Width -= 1;
        bounds.Height -= 1;
        e.Graphics.DrawRectangle(pen, bounds);
    }
}

internal sealed class ModernCheckBox : CheckBox
{
    private bool hovered;

    public ModernCheckBox()
    {
        SetStyle(
            ControlStyles.AllPaintingInWmPaint |
            ControlStyles.OptimizedDoubleBuffer |
            ControlStyles.ResizeRedraw |
            ControlStyles.UserPaint,
            true);
        BackColor = Color.Transparent;
        ForeColor = LoaderlyTheme.Text;
        Font = LoaderlyTheme.BodyFont(9.4F);
        Cursor = Cursors.Hand;
    }

    protected override void OnTextChanged(EventArgs e)
    {
        base.OnTextChanged(e);
        FitToText();
    }

    protected override void OnFontChanged(EventArgs e)
    {
        base.OnFontChanged(e);
        FitToText();
    }

    internal void FitToText()
    {
        Width = PreferredWidth(Text, Font);
        Invalidate();
    }

    internal static Rectangle BoxBoundsForTest(int width, int height, bool rtl)
    {
        return BoxBounds(width, height, rtl);
    }

    private static int PreferredWidth(string text, Font font)
    {
        return TextRenderer.MeasureText(text, font).Width + 38;
    }

    private static Rectangle BoxBounds(int width, int height, bool rtl)
    {
        var top = Math.Max(0, (height - 16) / 2);
        return rtl
            ? new Rectangle(Math.Max(0, width - 16), top, 16, 16)
            : new Rectangle(0, top, 16, 16);
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
        e.Graphics.Clear(Parent?.BackColor ?? LoaderlyTheme.Surface);

        var rtl = RightToLeft == RightToLeft.Yes;
        var box = BoxBounds(Width, Height, rtl);
        using (var path = LoaderlyTheme.RoundedRect(box, 4))
        using (var brush = new SolidBrush(Checked ? LoaderlyTheme.Accent : hovered ? LoaderlyTheme.SidebarButtonHover : LoaderlyTheme.SurfaceMuted))
        using (var pen = new Pen(Checked ? LoaderlyTheme.Accent : LoaderlyTheme.Border, 1))
        {
            e.Graphics.FillPath(brush, path);
            e.Graphics.DrawPath(pen, path);
        }

        if (Checked)
        {
            using var checkPen = new Pen(Color.White, 2) { StartCap = LineCap.Round, EndCap = LineCap.Round };
            e.Graphics.DrawLines(checkPen, new[]
            {
                new Point(box.Left + 4, box.Top + 8),
                new Point(box.Left + 7, box.Top + 11),
                new Point(box.Left + 12, box.Top + 5)
            });
        }

        var textRect = rtl
            ? new Rectangle(0, 0, Math.Max(1, Width - 24), Height)
            : new Rectangle(24, 0, Math.Max(1, Width - 24), Height);
        var flags = TextFormatFlags.VerticalCenter | TextFormatFlags.EndEllipsis;
        flags |= rtl ? TextFormatFlags.Right | TextFormatFlags.RightToLeft : TextFormatFlags.Left;
        TextRenderer.DrawText(
            e.Graphics,
            Text,
            Font,
            textRect,
            ForeColor,
            flags);
    }
}

internal sealed class ModernSlider : Control
{
    private int maximum = 100;
    private int value;
    private bool dragging;

    public event EventHandler? ValueChanged;

    public int Maximum
    {
        get => maximum;
        set
        {
            maximum = Math.Max(1, value);
            Value = this.value;
            Invalidate();
        }
    }

    public int Value
    {
        get => value;
        set
        {
            var next = Math.Clamp(value, 0, Maximum);
            if (this.value == next)
            {
                return;
            }

            this.value = next;
            Invalidate();
            ValueChanged?.Invoke(this, EventArgs.Empty);
        }
    }

    public ModernSlider()
    {
        SetStyle(
            ControlStyles.AllPaintingInWmPaint |
            ControlStyles.OptimizedDoubleBuffer |
            ControlStyles.ResizeRedraw |
            ControlStyles.UserPaint,
            true);
        Height = 34;
        Cursor = Cursors.Hand;
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
        e.Graphics.Clear(Parent?.BackColor ?? LoaderlyTheme.Window);

        var bounds = ClientRectangle;
        var trackHeight = 8;
        var inset = 10;
        var track = new Rectangle(
            inset,
            (bounds.Height - trackHeight) / 2,
            Math.Max(1, bounds.Width - inset * 2),
            trackHeight);

        using (var trackPath = LoaderlyTheme.RoundedRect(track, trackHeight / 2))
        using (var trackBrush = new SolidBrush(LoaderlyTheme.SurfaceMuted))
        {
            e.Graphics.FillPath(trackBrush, trackPath);
        }

        var ratio = Maximum == 0 ? 0 : value / (float)Maximum;
        var fillWidth = Math.Max(trackHeight, (int)Math.Round(track.Width * ratio));
        var fill = new Rectangle(track.X, track.Y, Math.Min(track.Width, fillWidth), track.Height);
        using (var fillPath = LoaderlyTheme.RoundedRect(fill, trackHeight / 2))
        using (var fillBrush = new SolidBrush(LoaderlyTheme.Accent))
        {
            e.Graphics.FillPath(fillBrush, fillPath);
        }

        var handleX = track.X + (int)Math.Round(track.Width * ratio);
        var handleSize = 18;
        var handle = new Rectangle(
            handleX - handleSize / 2,
            bounds.Height / 2 - handleSize / 2,
            handleSize,
            handleSize);
        using var handleShadow = new SolidBrush(Color.FromArgb(70, 0, 0, 0));
        e.Graphics.FillEllipse(handleShadow, handle.X, handle.Y + 2, handle.Width, handle.Height);
        using var handleBrush = new SolidBrush(LoaderlyTheme.Accent);
        e.Graphics.FillEllipse(handleBrush, handle);
        using var handlePen = new Pen(LoaderlyTheme.Surface, 2);
        e.Graphics.DrawEllipse(handlePen, handle);
    }

    protected override void OnMouseDown(MouseEventArgs e)
    {
        dragging = true;
        Capture = true;
        SetValueFromMouse(e.X);
        base.OnMouseDown(e);
    }

    protected override void OnMouseMove(MouseEventArgs e)
    {
        if (dragging)
        {
            SetValueFromMouse(e.X);
        }

        base.OnMouseMove(e);
    }

    protected override void OnMouseUp(MouseEventArgs e)
    {
        dragging = false;
        Capture = false;
        base.OnMouseUp(e);
    }

    private void SetValueFromMouse(int x)
    {
        var inset = 10;
        var width = Math.Max(1, ClientSize.Width - inset * 2);
        var ratio = Math.Clamp((x - inset) / (float)width, 0F, 1F);
        Value = (int)Math.Round(ratio * Maximum);
    }
}

internal sealed class ModernRangeTimeline : Control
{
    private enum DragTarget
    {
        None,
        Start,
        End,
        Position
    }

    private int maximum = 100;
    private int minimumRange = 1;
    private int startValue;
    private int endValue = 100;
    private int positionValue;
    private DragTarget dragging = DragTarget.None;
    private readonly List<Image> thumbnailImages = [];

    public event EventHandler? RangeChanged;
    public event EventHandler? PositionChanged;
    public event EventHandler? InteractionStarted;
    public event EventHandler? InteractionCompleted;

    public int Maximum
    {
        get => maximum;
        set
        {
            maximum = Math.Max(1, value);
            minimumRange = Math.Clamp(minimumRange, 1, maximum);
            SetRange(startValue, endValue);
            PositionValue = positionValue;
            Invalidate();
        }
    }

    public int MinimumRange
    {
        get => minimumRange;
        set
        {
            minimumRange = Math.Clamp(value, 1, Maximum);
            SetRange(startValue, endValue);
        }
    }

    public int StartValue
    {
        get => startValue;
        set => SetRange(value, endValue);
    }

    public int EndValue
    {
        get => endValue;
        set => SetRange(startValue, value);
    }

    public int PositionValue
    {
        get => positionValue;
        set
        {
            var next = Math.Clamp(value, 0, Maximum);
            if (positionValue == next)
            {
                return;
            }

            positionValue = next;
            Invalidate();
            PositionChanged?.Invoke(this, EventArgs.Empty);
        }
    }

    public ModernRangeTimeline()
    {
        SetStyle(
            ControlStyles.AllPaintingInWmPaint |
            ControlStyles.OptimizedDoubleBuffer |
            ControlStyles.ResizeRedraw |
            ControlStyles.UserPaint,
            true);
        MinimumSize = new Size(260, 72);
        Cursor = Cursors.Hand;
        TabStop = false;
    }

    public void SetThumbnailImages(IEnumerable<Image> images)
    {
        foreach (var image in thumbnailImages)
        {
            image.Dispose();
        }

        thumbnailImages.Clear();
        thumbnailImages.AddRange(images);
        Invalidate();
    }

    public void SetRange(int start, int end)
    {
        var nextStart = Math.Clamp(start, 0, Maximum);
        var nextEnd = Math.Clamp(end, 0, Maximum);

        if (nextEnd - nextStart < MinimumRange)
        {
            if (dragging == DragTarget.Start)
            {
                nextStart = Math.Max(0, nextEnd - MinimumRange);
            }
            else
            {
                nextEnd = Math.Min(Maximum, nextStart + MinimumRange);
                if (nextEnd - nextStart < MinimumRange)
                {
                    nextStart = Math.Max(0, nextEnd - MinimumRange);
                }
            }
        }

        var changed = startValue != nextStart || endValue != nextEnd;
        startValue = nextStart;
        endValue = nextEnd;
        positionValue = Math.Clamp(positionValue, 0, Maximum);
        Invalidate();

        if (changed)
        {
            RangeChanged?.Invoke(this, EventArgs.Empty);
        }
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
        e.Graphics.Clear(Parent?.BackColor ?? LoaderlyTheme.Window);

        var bounds = ClientRectangle;
        var track = TrackBounds(bounds);
        using var trackPath = LoaderlyTheme.RoundedRect(track, 10);
        if (thumbnailImages.Count > 0)
        {
            var state = e.Graphics.Save();
            e.Graphics.SetClip(trackPath);
            var thumbWidth = track.Width / (float)thumbnailImages.Count;
            for (var index = 0; index < thumbnailImages.Count; index++)
            {
                var target = new RectangleF(track.X + thumbWidth * index, track.Y, thumbWidth + 1, track.Height);
                e.Graphics.DrawImage(thumbnailImages[index], target);
            }

            e.Graphics.Restore(state);
        }
        else
        {
            using var trackBrush = new SolidBrush(LoaderlyTheme.SurfaceMuted);
            e.Graphics.FillPath(trackBrush, trackPath);
        }

        var startX = XFromValue(startValue, track);
        var endX = XFromValue(endValue, track);
        var selected = Rectangle.FromLTRB(
            Math.Min(startX, endX),
            track.Y,
            Math.Max(startX + 1, endX),
            track.Bottom);

        using (var dimBrush = new SolidBrush(Color.FromArgb(135, 0, 0, 0)))
        {
            if (selected.Left > track.Left)
            {
                e.Graphics.FillRectangle(dimBrush, Rectangle.FromLTRB(track.Left, track.Top, selected.Left, track.Bottom));
            }

            if (selected.Right < track.Right)
            {
                e.Graphics.FillRectangle(dimBrush, Rectangle.FromLTRB(selected.Right, track.Top, track.Right, track.Bottom));
            }
        }

        using (var selectedBrush = new LinearGradientBrush(selected, Color.FromArgb(80, LoaderlyTheme.Accent), Color.FromArgb(86, LoaderlyTheme.Accent2), 0F))
        {
            e.Graphics.FillRectangle(selectedBrush, selected);
        }

        using (var borderPen = new Pen(LoaderlyTheme.Accent2, 3))
        {
            e.Graphics.DrawRectangle(borderPen, selected.X, selected.Y, Math.Max(1, selected.Width - 1), selected.Height - 1);
        }

        DrawHandle(e.Graphics, startX, track, LoaderlyTheme.Accent);
        DrawHandle(e.Graphics, endX, track, LoaderlyTheme.Accent2);
        DrawPlayhead(e.Graphics, XFromValue(positionValue, track), track);
    }

    protected override void OnMouseDown(MouseEventArgs e)
    {
        dragging = HitTest(e.Location);
        Capture = true;
        InteractionStarted?.Invoke(this, EventArgs.Empty);
        ApplyMouse(e.X);
        base.OnMouseDown(e);
    }

    protected override void OnMouseMove(MouseEventArgs e)
    {
        if (dragging != DragTarget.None)
        {
            ApplyMouse(e.X);
        }

        base.OnMouseMove(e);
    }

    protected override void OnMouseUp(MouseEventArgs e)
    {
        if (dragging != DragTarget.None)
        {
            ApplyMouse(e.X);
        }

        dragging = DragTarget.None;
        Capture = false;
        InteractionCompleted?.Invoke(this, EventArgs.Empty);
        base.OnMouseUp(e);
    }

    private DragTarget HitTest(Point location)
    {
        var track = TrackBounds(ClientRectangle);
        var value = ValueFromX(location.X, track);
        var startDistance = Math.Abs(value - startValue);
        var endDistance = Math.Abs(value - endValue);
        var positionDistance = Math.Abs(value - positionValue);
        var tolerance = Math.Max(2, Maximum / Math.Max(20, track.Width / 8));

        if (startDistance <= tolerance || endDistance <= tolerance)
        {
            return startDistance <= endDistance ? DragTarget.Start : DragTarget.End;
        }

        if (positionDistance <= tolerance)
        {
            return DragTarget.Position;
        }

        return DragTarget.Position;
    }

    private void ApplyMouse(int x)
    {
        var value = ValueFromX(x, TrackBounds(ClientRectangle));
        switch (dragging)
        {
            case DragTarget.Start:
                SetRange(Math.Min(value, endValue - MinimumRange), endValue);
                PositionValue = StartValue;
                break;
            case DragTarget.End:
                SetRange(startValue, Math.Max(value, startValue + MinimumRange));
                PositionValue = EndValue;
                break;
            case DragTarget.Position:
                PositionValue = value;
                break;
        }
    }

    private static Rectangle TrackBounds(Rectangle bounds)
    {
        var inset = 18;
        var height = Math.Min(54, Math.Max(34, bounds.Height - 18));
        return new Rectangle(
            inset,
            Math.Max(8, bounds.Height / 2 - height / 2),
            Math.Max(1, bounds.Width - inset * 2),
            height);
    }

    private int XFromValue(int value, Rectangle track)
    {
        var ratio = Maximum == 0 ? 0 : value / (float)Maximum;
        return track.X + (int)Math.Round(track.Width * ratio);
    }

    private int ValueFromX(int x, Rectangle track)
    {
        var ratio = Math.Clamp((x - track.X) / (float)Math.Max(1, track.Width), 0F, 1F);
        return (int)Math.Round(ratio * Maximum);
    }

    private static void DrawHandle(Graphics graphics, int x, Rectangle track, Color color)
    {
        var handle = new Rectangle(x - 8, track.Y - 6, 16, track.Height + 12);
        using var shadow = new SolidBrush(Color.FromArgb(70, 0, 0, 0));
        using (var shadowPath = LoaderlyTheme.RoundedRect(new Rectangle(handle.X, handle.Y + 3, handle.Width, handle.Height), 8))
        {
            graphics.FillPath(shadow, shadowPath);
        }

        using var brush = new SolidBrush(color);
        using var path = LoaderlyTheme.RoundedRect(handle, 8);
        graphics.FillPath(brush, path);
        using var pen = new Pen(LoaderlyTheme.Surface, 2);
        graphics.DrawPath(pen, path);
    }

    private static void DrawPlayhead(Graphics graphics, int x, Rectangle track)
    {
        using var pen = new Pen(Color.White, 2);
        graphics.DrawLine(pen, x, track.Y - 12, x, track.Bottom + 12);
        using var brush = new SolidBrush(Color.White);
        graphics.FillEllipse(brush, x - 4, track.Y - 16, 8, 8);
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            foreach (var image in thumbnailImages)
            {
                image.Dispose();
            }

            thumbnailImages.Clear();
        }

        base.Dispose(disposing);
    }
}

internal sealed class SeamlessFlowPanel : FlowLayoutPanel
{
    private const int ScrollBarBoth = 3;

    public SeamlessFlowPanel()
    {
        SetStyle(
            ControlStyles.AllPaintingInWmPaint |
            ControlStyles.OptimizedDoubleBuffer |
            ControlStyles.ResizeRedraw,
            true);
        BorderStyle = BorderStyle.None;
    }

    protected override void WndProc(ref Message m)
    {
        base.WndProc(ref m);
        HideNativeScrollbars();
    }

    protected override void OnResize(EventArgs e)
    {
        base.OnResize(e);
        HideNativeScrollbars();
    }

    protected override void OnControlAdded(ControlEventArgs e)
    {
        base.OnControlAdded(e);
        HideNativeScrollbars();
    }

    private void HideNativeScrollbars()
    {
        if (IsHandleCreated)
        {
            _ = ShowScrollBar(Handle, ScrollBarBoth, false);
        }
    }

    [DllImport("user32.dll")]
    private static extern bool ShowScrollBar(IntPtr hWnd, int wBar, bool bShow);
}

internal sealed class ModernScrollPanel : Panel
{
    private const int ScrollBarBoth = 3;

    public ModernScrollPanel()
    {
        AutoScroll = true;
        SetStyle(
            ControlStyles.AllPaintingInWmPaint |
            ControlStyles.OptimizedDoubleBuffer |
            ControlStyles.ResizeRedraw,
            true);
    }

    protected override void WndProc(ref Message m)
    {
        base.WndProc(ref m);
        HideNativeScrollbars();
    }

    protected override void OnResize(EventArgs e)
    {
        base.OnResize(e);
        HideNativeScrollbars();
        Invalidate();
    }

    protected override void OnScroll(ScrollEventArgs se)
    {
        base.OnScroll(se);
        HideNativeScrollbars();
        Invalidate();
    }

    protected override void OnMouseWheel(MouseEventArgs e)
    {
        base.OnMouseWheel(e);
        HideNativeScrollbars();
        Invalidate();
    }

    protected override void OnControlAdded(ControlEventArgs e)
    {
        base.OnControlAdded(e);
        HideNativeScrollbars();
        Invalidate();
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        base.OnPaint(e);
        var contentHeight = Math.Abs(DisplayRectangle.Y) + DisplayRectangle.Height;
        var viewportHeight = ClientSize.Height;
        if (viewportHeight <= 0 || contentHeight <= viewportHeight + 2)
        {
            return;
        }

        var track = new Rectangle(ClientSize.Width - 8, 12, 4, Math.Max(1, ClientSize.Height - 24));
        var thumbHeight = Math.Max(44, (int)Math.Round(track.Height * (viewportHeight / (double)contentHeight)));
        var maxScroll = Math.Max(1, contentHeight - viewportHeight);
        var scrollRatio = Math.Clamp(-DisplayRectangle.Y / (double)maxScroll, 0, 1);
        var thumbY = track.Y + (int)Math.Round((track.Height - thumbHeight) * scrollRatio);
        var thumb = new Rectangle(track.X, thumbY, track.Width, thumbHeight);

        e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
        using var brush = new SolidBrush(LoaderlyTheme.ControlHover);
        using var path = LoaderlyTheme.RoundedRect(thumb, 2);
        e.Graphics.FillPath(brush, path);
    }

    private void HideNativeScrollbars()
    {
        if (IsHandleCreated)
        {
            _ = ShowScrollBar(Handle, ScrollBarBoth, false);
        }
    }

    [DllImport("user32.dll")]
    private static extern bool ShowScrollBar(IntPtr hWnd, int wBar, bool bShow);
}
