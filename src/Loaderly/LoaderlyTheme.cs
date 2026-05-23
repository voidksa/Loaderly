using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Text;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using Microsoft.Win32;

namespace Loaderly;

internal static class LoaderlyTheme
{
    public const int PanelRadius = 14;
    public const int CardRadius = 12;
    public const int ControlRadius = 10;

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
    public static Color Success => current.IsDark ? Color.FromArgb(34, 197, 94) : Color.FromArgb(22, 163, 74);
    public static Color Danger => current.Danger;
    public static Color DangerSurface => current.DangerSurface;
    public static Color DangerHover => current.DangerHover;
    public static Color SelectedSurface => current.SelectedSurface;
    public static Color SelectedBorder => current.SelectedBorder;
    public static Color TrimSurface => current.TrimSurface;
    public static Color TrimHover => current.TrimHover;
    public static Color TrimText => current.TrimText;
    public static Color ThumbnailBack => current.ThumbnailBack;

    internal static float DarkWindowBrightnessForTest => ThemePalette.Dark.Window.GetBrightness();

    internal static float DarkSurfaceContrastForTest =>
        Math.Abs(ThemePalette.Dark.Surface.GetBrightness() - ThemePalette.Dark.Window.GetBrightness());

    internal static float DarkAccentSaturationForTest =>
        Math.Max(ThemePalette.Dark.Accent.GetSaturation(), ThemePalette.Dark.Accent2.GetSaturation());

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

    private static readonly Lazy<string> ArabicUiFontFamily = new(() => ResolveInstalledFont(
        "Tajawal",
        "IBM Plex Sans Arabic",
        "Noto Sans Arabic",
        "Segoe UI Variable Text",
        "Segoe UI"));

    public static Font TitleFont(float size = 22) => new(TitleFontFamily(), size, FontStyle.Bold);

    public static Font BodyFont(float size = 10) => new(BodyFontFamily(), size, FontStyle.Regular);

    internal static string UiFontFamilyForLanguageForTest(string? language)
    {
        return LoaderlyLanguage.Normalize(language) == LoaderlyLanguage.Arabic
            ? ArabicUiFontFamily.Value
            : "Segoe UI Variable Text";
    }

    private static string TitleFontFamily()
    {
        return LoaderlyLanguage.IsArabic ? ArabicUiFontFamily.Value : "Segoe UI Variable Display";
    }

    private static string BodyFontFamily()
    {
        return LoaderlyLanguage.IsArabic ? ArabicUiFontFamily.Value : "Segoe UI Variable Text";
    }

    private static string ResolveInstalledFont(params string[] candidates)
    {
        try
        {
            using var installed = new InstalledFontCollection();
            var families = installed.Families.Select(family => family.Name).ToHashSet(StringComparer.OrdinalIgnoreCase);
            foreach (var candidate in candidates)
            {
                if (families.Contains(candidate))
                {
                    return candidate;
                }
            }
        }
        catch
        {
            // Fall back below when font enumeration is not available.
        }

        return candidates.Length > 0 ? candidates[^1] : "Segoe UI";
    }

    public static GraphicsPath RoundedRect(Rectangle bounds, int radius)
    {
        var path = new GraphicsPath();
        if (bounds.Width <= 0 || bounds.Height <= 0)
        {
            return path;
        }

        radius = Math.Max(0, Math.Min(radius, Math.Min(bounds.Width, bounds.Height) / 2));
        if (radius == 0)
        {
            path.AddRectangle(bounds);
            path.CloseFigure();
            return path;
        }

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

    public static Brush SurfaceBrush(Rectangle bounds, Color baseColor)
    {
        if (!IsDark || bounds.Width <= 0 || bounds.Height <= 0)
        {
            return new SolidBrush(baseColor);
        }

        return new SolidBrush(baseColor);
    }

    public static Brush AccentBrush(Rectangle bounds, Color baseColor)
    {
        if (!IsDark || bounds.Width <= 0 || bounds.Height <= 0)
        {
            return new SolidBrush(baseColor);
        }

        return new SolidBrush(baseColor);
    }

    public static Color ElevatedBorder(Color borderColor)
    {
        return borderColor;
    }

    public static bool IsAccentColor(Color color)
    {
        return color.ToArgb() == Accent.ToArgb() ||
               color.ToArgb() == AccentHover.ToArgb() ||
               color.ToArgb() == AccentPressed.ToArgb() ||
               color.ToArgb() == TrimSurface.ToArgb() ||
               color.ToArgb() == TrimHover.ToArgb();
    }

    public static Color Blend(Color baseColor, Color overlay, int overlayPercent)
    {
        var amount = Math.Clamp(overlayPercent, 0, 100) / 100F;
        var inverse = 1F - amount;
        return Color.FromArgb(
            baseColor.A,
            ClampColor(baseColor.R * inverse + overlay.R * amount),
            ClampColor(baseColor.G * inverse + overlay.G * amount),
            ClampColor(baseColor.B * inverse + overlay.B * amount));
    }

    private static int ClampColor(float value)
    {
        return Math.Clamp((int)Math.Round(value), 0, 255);
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
        Window: Color.FromArgb(16, 17, 22),
        Sidebar: Color.FromArgb(17, 19, 24),
        SidebarText: Color.FromArgb(246, 248, 255),
        SidebarMuted: Color.FromArgb(158, 166, 184),
        SidebarCard: Color.FromArgb(27, 30, 38),
        SidebarCardBorder: Color.FromArgb(55, 59, 72),
        SidebarButton: Color.FromArgb(30, 33, 42),
        SidebarButtonHover: Color.FromArgb(40, 44, 55),
        SidebarButtonPressed: Color.FromArgb(49, 54, 67),
        Surface: Color.FromArgb(27, 29, 36),
        SurfaceMuted: Color.FromArgb(35, 38, 48),
        ControlHover: Color.FromArgb(43, 47, 58),
        ControlPressed: Color.FromArgb(52, 57, 70),
        DisabledSurface: Color.FromArgb(28, 31, 39),
        Border: Color.FromArgb(55, 59, 72),
        Text: Color.FromArgb(244, 246, 251),
        MutedText: Color.FromArgb(167, 176, 194),
        Accent: Color.FromArgb(93, 168, 255),
        AccentHover: Color.FromArgb(112, 181, 255),
        AccentPressed: Color.FromArgb(67, 142, 240),
        Accent2: Color.FromArgb(155, 109, 255),
        Danger: Color.FromArgb(255, 107, 122),
        DangerSurface: Color.FromArgb(74, 35, 43),
        DangerHover: Color.FromArgb(90, 42, 52),
        SelectedSurface: Color.FromArgb(36, 44, 59),
        SelectedBorder: Color.FromArgb(93, 168, 255),
        TrimSurface: Color.FromArgb(54, 43, 82),
        TrimHover: Color.FromArgb(65, 51, 98),
        TrimText: Color.FromArgb(221, 207, 255),
        ThumbnailBack: Color.FromArgb(12, 13, 18));
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
    private bool clipToRoundedRegion;

    public int Radius { get; set; } = 18;

    public Color BorderColor { get; set; } = LoaderlyTheme.Border;

    public int BorderThickness { get; set; } = 1;

    public bool ClipToRoundedRegion
    {
        get => clipToRoundedRegion;
        set
        {
            if (clipToRoundedRegion == value)
            {
                return;
            }

            clipToRoundedRegion = value;
            UpdateRegion();
            Invalidate();
        }
    }

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
        using var fill = LoaderlyTheme.SurfaceBrush(rectangle, BackColor);
        e.Graphics.FillPath(fill, path);
        if (BorderThickness > 0)
        {
            using var pen = new Pen(LoaderlyTheme.ElevatedBorder(BorderColor), BorderThickness);
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
        if (!clipToRoundedRegion)
        {
            Region?.Dispose();
            Region = null;
            return;
        }

        if (ClientSize.Width <= 0 || ClientSize.Height <= 0)
        {
            return;
        }

        using var path = LoaderlyTheme.RoundedRect(ClientRectangle, Radius);
        Region?.Dispose();
        Region = new Region(path);
    }
}

internal sealed class CoverPictureBox : Control
{
    private Image? image;

    public Image? Image
    {
        get => image;
        set
        {
            if (ReferenceEquals(image, value))
            {
                return;
            }

            image = value;
            Invalidate();
        }
    }

    public CoverPictureBox()
    {
        SetStyle(
            ControlStyles.AllPaintingInWmPaint |
            ControlStyles.OptimizedDoubleBuffer |
            ControlStyles.ResizeRedraw |
            ControlStyles.UserPaint,
            true);
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        if (Image is null || ClientSize.Width <= 0 || ClientSize.Height <= 0)
        {
            using var fill = new SolidBrush(BackColor);
            e.Graphics.FillRectangle(fill, ClientRectangle);
            return;
        }

        e.Graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
        e.Graphics.PixelOffsetMode = PixelOffsetMode.Half;
        e.Graphics.SmoothingMode = SmoothingMode.HighQuality;
        e.Graphics.SetClip(ClientRectangle);

        var scale = Math.Max(
            ClientSize.Width / (float)Image.Width,
            ClientSize.Height / (float)Image.Height);
        var width = Image.Width * scale;
        var height = Image.Height * scale;
        var x = (ClientSize.Width - width) / 2F;
        var y = (ClientSize.Height - height) / 2F;
        e.Graphics.DrawImage(Image, x, y, width, height);
    }

    protected override void OnBackColorChanged(EventArgs e)
    {
        base.OnBackColorChanged(e);
        Invalidate();
    }
}

internal sealed class ModernButton : Button
{
    private int radius = 12;
    private Color fillColor = LoaderlyTheme.SurfaceMuted;
    private Color hoverColor = Color.Empty;
    private Color pressedColor = Color.Empty;
    private Color borderColor = Color.Empty;

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

    private string? displayText;

    public string? DisplayText
    {
        get => displayText;
        set
        {
            displayText = value;
            Invalidate();
        }
    }

    public Color BorderColor
    {
        get => borderColor;
        set
        {
            borderColor = value;
            Invalidate();
        }
    }

    public override ContentAlignment TextAlign { get; set; } = ContentAlignment.MiddleCenter;

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
        using var brush = LoaderlyTheme.IsAccentColor(color)
            ? LoaderlyTheme.AccentBrush(rectangle, color)
            : LoaderlyTheme.SurfaceBrush(rectangle, color);
        pevent.Graphics.FillPath(brush, path);
        if (LoaderlyTheme.IsDark && Enabled)
        {
            var strokeColor = BorderColor.IsEmpty ? LoaderlyTheme.Border : BorderColor;
            using var borderPen = new Pen(LoaderlyTheme.IsAccentColor(color)
                ? Color.FromArgb(120, LoaderlyTheme.Accent2)
                : Color.FromArgb(BorderColor.IsEmpty ? 80 : 145, LoaderlyTheme.ElevatedBorder(strokeColor)));
            pevent.Graphics.DrawPath(borderPen, path);
        }

        var textRectangle = rectangle;
        if (TextAlign is ContentAlignment.MiddleLeft or ContentAlignment.TopLeft or ContentAlignment.BottomLeft)
        {
            textRectangle.X += 12;
            textRectangle.Width = Math.Max(1, textRectangle.Width - 18);
        }
        else if (TextAlign is ContentAlignment.MiddleRight or ContentAlignment.TopRight or ContentAlignment.BottomRight)
        {
            textRectangle.X += 6;
            textRectangle.Width = Math.Max(1, textRectangle.Width - 18);
        }

        TextRenderer.DrawText(
            pevent.Graphics,
            DisplayText ?? Text,
            Font,
            textRectangle,
            textColor,
            TextFlagsFor(TextAlign) |
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

    private static TextFormatFlags TextFlagsFor(ContentAlignment alignment)
    {
        var flags = TextFormatFlags.VerticalCenter | TextFormatFlags.HorizontalCenter;
        if (alignment is ContentAlignment.TopLeft or ContentAlignment.TopCenter or ContentAlignment.TopRight)
        {
            flags &= ~TextFormatFlags.VerticalCenter;
            flags |= TextFormatFlags.Top;
        }
        else if (alignment is ContentAlignment.BottomLeft or ContentAlignment.BottomCenter or ContentAlignment.BottomRight)
        {
            flags &= ~TextFormatFlags.VerticalCenter;
            flags |= TextFormatFlags.Bottom;
        }

        if (alignment is ContentAlignment.TopLeft or ContentAlignment.MiddleLeft or ContentAlignment.BottomLeft)
        {
            flags &= ~TextFormatFlags.HorizontalCenter;
            flags |= TextFormatFlags.Left;
        }
        else if (alignment is ContentAlignment.TopRight or ContentAlignment.MiddleRight or ContentAlignment.BottomRight)
        {
            flags &= ~TextFormatFlags.HorizontalCenter;
            flags |= TextFormatFlags.Right;
        }

        return flags;
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
        using (var brush = LoaderlyTheme.SurfaceBrush(rectangle, FillColor))
        using (var pen = new Pen(LoaderlyTheme.ElevatedBorder(BorderColor), 1))
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
            (LoaderlyLanguage.IsArabic ? TextFormatFlags.Right : TextFormatFlags.Left) |
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
        Radius = LoaderlyTheme.ControlRadius;
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

    private int radius = LoaderlyTheme.ControlRadius;

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

    public int Radius { get; set; } = LoaderlyTheme.ControlRadius;

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
    private Color fillColor = LoaderlyTheme.Accent;

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

    public Color FillColor
    {
        get => fillColor;
        set
        {
            fillColor = value;
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

    internal static string FillBoundsForTest(int width, int value, bool rightToLeft)
    {
        var fill = ProgressFillBounds(new Rectangle(0, 0, Math.Max(1, width), 6), value, rightToLeft);
        return fill.Width <= 0 ? "empty" : $"{fill.Left}-{fill.Right}";
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
        using (var trackBrush = LoaderlyTheme.SurfaceBrush(track, LoaderlyTheme.SurfaceMuted))
        {
            e.Graphics.FillPath(trackBrush, trackPath);
        }

        Rectangle fill;
        var rightToLeft = RightToLeft == RightToLeft.Yes;
        if (IsIndeterminate)
        {
            var segmentWidth = Math.Max(72, track.Width / 5);
            var travel = track.Width + segmentWidth;
            var progress = animationStep / 100.0;
            var x = rightToLeft
                ? track.Right - (int)Math.Round(travel * progress)
                : track.Left + (int)Math.Round(travel * progress) - segmentWidth;
            fill = new Rectangle(x, track.Top, segmentWidth, track.Height);
        }
        else
        {
            fill = ProgressFillBounds(track, Value, rightToLeft);
            if (fill.Width <= 0)
            {
                return;
            }
        }

        var clipState = e.Graphics.Save();
        using (var trackPath = LoaderlyTheme.RoundedRect(track, 3))
        {
            e.Graphics.SetClip(trackPath);
            using var fillBrush = LoaderlyTheme.IsAccentColor(FillColor)
                ? LoaderlyTheme.AccentBrush(fill, FillColor)
                : new LinearGradientBrush(
                    fill,
                    LoaderlyTheme.Blend(FillColor, Color.White, 16),
                    LoaderlyTheme.Blend(FillColor, LoaderlyTheme.Window, 12),
                    0F);
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

    private static Rectangle ProgressFillBounds(Rectangle track, int value, bool rightToLeft)
    {
        var fillWidth = (int)Math.Round(track.Width * (Math.Clamp(value, 0, 100) / 100.0));
        if (fillWidth <= 0)
        {
            return Rectangle.Empty;
        }

        fillWidth = Math.Min(track.Width, Math.Max(track.Height, fillWidth));
        var fillX = rightToLeft ? track.Right - fillWidth : track.Left;
        return new Rectangle(fillX, track.Top, fillWidth, track.Height);
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

    private int radius = LoaderlyTheme.ControlRadius;

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

        var preferredSize = menu.GetPreferredSize(Size.Empty);
        var controlScreenLocation = PointToScreen(Point.Empty);
        var screen = Screen.FromControl(this).WorkingArea;
        var point = new Point(
            MenuScreenX(controlScreenLocation.X, Width, preferredSize.Width, screen.Left, screen.Right, rtl),
            MenuScreenY(controlScreenLocation.Y, Height, preferredSize.Height, screen.Top, screen.Bottom));
        menu.Show(point);
    }

    internal static int MenuXForTest(int controlWidth, int menuWidth, bool rtl)
    {
        return MenuX(controlWidth, menuWidth, rtl);
    }

    internal static int MenuScreenXForTest(int controlScreenX, int controlWidth, int menuWidth, int screenLeft, int screenRight, bool rtl)
    {
        return MenuScreenX(controlScreenX, controlWidth, menuWidth, screenLeft, screenRight, rtl);
    }

    internal static int MenuScreenYForTest(int controlScreenY, int controlHeight, int menuHeight, int screenTop, int screenBottom)
    {
        return MenuScreenY(controlScreenY, controlHeight, menuHeight, screenTop, screenBottom);
    }

    internal static TextFormatFlags TextFlagsForTest(bool rtl)
    {
        return TextFlags(rtl);
    }

    private static int MenuX(int controlWidth, int menuWidth, bool rtl)
    {
        return rtl ? controlWidth - menuWidth : 0;
    }

    private static int MenuScreenX(int controlScreenX, int controlWidth, int menuWidth, int screenLeft, int screenRight, bool rtl)
    {
        var rawX = controlScreenX + MenuX(controlWidth, menuWidth, rtl);
        var maxX = Math.Max(screenLeft, screenRight - Math.Max(1, menuWidth));
        return Math.Clamp(rawX, screenLeft, maxX);
    }

    private static int MenuScreenY(int controlScreenY, int controlHeight, int menuHeight, int screenTop, int screenBottom)
    {
        const int gap = 3;
        var belowY = controlScreenY + controlHeight + gap;
        if (belowY + menuHeight <= screenBottom)
        {
            return belowY;
        }

        var aboveY = controlScreenY - menuHeight - gap;
        return Math.Max(screenTop, aboveY);
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

internal readonly record struct TimelineSegmentDisplay(
    int Start,
    int End,
    bool HasTransitionAfter,
    bool IsRemoved = false,
    bool BlocksSelection = false);

internal readonly record struct TimelineBlurDisplay(int Start, int End, bool IsEditing = false, string Label = "Blur", int Lane = 0);

internal sealed class TimelineSegmentMouseEventArgs(int segmentIndex, MouseButtons button, Point location) : EventArgs
{
    public int SegmentIndex { get; } = segmentIndex;

    public MouseButtons Button { get; } = button;

    public Point Location { get; } = location;
}

internal sealed class TimelineBlurMouseEventArgs(int blurIndex, MouseButtons button, Point location) : EventArgs
{
    public int BlurIndex { get; } = blurIndex;

    public MouseButtons Button { get; } = button;

    public Point Location { get; } = location;
}

internal sealed class TimelineBlurRangeChangedEventArgs(int blurIndex, int start, int end) : EventArgs
{
    public int BlurIndex { get; } = blurIndex;

    public int Start { get; } = start;

    public int End { get; } = end;
}

internal sealed class ModernRangeTimeline : Control
{
    private enum DragTarget
    {
        None,
        Start,
        End,
        Range,
        Position,
        BlurStart,
        BlurEnd,
        BlurRange
    }

    private const int DeferredDragThresholdPixels = 4;
    private const float TimelineHandleHitPixels = 8F;
    private const int TimelineHandleVisualHalfWidth = 8;
    private const float TimelinePlayheadHitPixels = 7F;
    private const int EffectSnapToPlayheadPixels = 10;
    private const int EffectLaneHorizontalInset = 0;
    private const int EffectLaneGap = 8;
    private const int DefaultUnitsPerSecond = 100;
    private int maximum = 100;
    private int minimumRange = 1;
    private int startValue;
    private int endValue = 100;
    private int positionValue;
    private int viewStartValue;
    private int viewEndValue = 100;
    private DragTarget dragging = DragTarget.None;
    private DragTarget pendingDrag = DragTarget.None;
    private bool pendingDragNeedsInteractionStarted;
    private Point pendingDragStartLocation;
    private bool panningViewport;
    private Point panStartLocation;
    private int panStartViewStartValue;
    private int panStartViewEndValue;
    private int dragPointerOffset;
    private int lastDragValue = int.MinValue;
    private readonly List<Image> thumbnailImages = [];
    private readonly List<TimelineSegmentDisplay> displaySegments = [];
    private readonly List<TimelineBlurDisplay> blurDisplayRegions = [];
    private int selectedDisplaySegmentIndex = -1;
    private int selectedBlurDisplayIndex = -1;
    private int unitsPerSecond = DefaultUnitsPerSecond;

    private readonly record struct ThumbnailSegmentBounds(int Index, int Left, int Right);

    private readonly record struct TimelineRulerLabel(int Value, int X, string Text);

    public event EventHandler? RangeChanged;
    public event EventHandler? PositionChanged;
    public event EventHandler? InteractionStarted;
    public event EventHandler? InteractionCompleted;
    public event EventHandler<TimelineSegmentMouseEventArgs>? SegmentClicked;
    public event EventHandler<TimelineSegmentMouseEventArgs>? SegmentContextRequested;
    public event EventHandler<TimelineBlurMouseEventArgs>? BlurClicked;
    public event EventHandler<TimelineBlurRangeChangedEventArgs>? BlurRangeChanged;

    public int Maximum
    {
        get => maximum;
        set
        {
            var previousMaximum = maximum;
            var wasShowingFullRange = viewStartValue <= 0 && viewEndValue >= previousMaximum;
            maximum = Math.Max(1, value);
            minimumRange = Math.Clamp(minimumRange, 1, maximum);
            if (wasShowingFullRange)
            {
                viewStartValue = 0;
                viewEndValue = maximum;
            }
            else
            {
                SetViewport(viewStartValue, viewEndValue);
            }

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

    public int UnitsPerSecond
    {
        get => unitsPerSecond;
        set
        {
            var next = Math.Max(1, value);
            if (unitsPerSecond == next)
            {
                return;
            }

            unitsPerSecond = next;
            Invalidate();
        }
    }

    public ModernRangeTimeline()
    {
        SetStyle(
            ControlStyles.AllPaintingInWmPaint |
            ControlStyles.OptimizedDoubleBuffer |
            ControlStyles.ResizeRedraw |
            ControlStyles.Selectable |
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

    public void SetSegments(IEnumerable<TimelineSegmentDisplay> segments, int selectedIndex)
    {
        displaySegments.Clear();
        displaySegments.AddRange(segments);
        selectedDisplaySegmentIndex = selectedIndex;
        Invalidate();
    }

    public void SetBlurRegions(IEnumerable<TimelineBlurDisplay> regions, int selectedIndex)
    {
        blurDisplayRegions.Clear();
        blurDisplayRegions.AddRange(regions);
        selectedBlurDisplayIndex = selectedIndex;
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

        var nextPosition = Math.Clamp(positionValue, 0, Maximum);
        var changed = startValue != nextStart || endValue != nextEnd;
        var positionChanged = positionValue != nextPosition;
        startValue = nextStart;
        endValue = nextEnd;
        positionValue = nextPosition;
        if (changed || positionChanged)
        {
            Invalidate();
        }

        if (changed)
        {
            RangeChanged?.Invoke(this, EventArgs.Empty);
        }
    }

    internal static (int Start, int End) MoveRangeForTest(
        int start,
        int end,
        int pointerValue,
        int pointerOffset,
        int maximum,
        IEnumerable<TimelineSegmentDisplay> segments,
        int selectedIndex)
    {
        return MoveRange(start, end, pointerValue, pointerOffset, maximum, segments, selectedIndex);
    }

    internal static (int Start, int End) ResizeEndForTest(
        int currentStart,
        int proposedEnd,
        int maximum,
        int minimumRange,
        IEnumerable<TimelineSegmentDisplay> segments,
        int selectedIndex)
    {
        return ResizeEnd(currentStart, proposedEnd, maximum, minimumRange, segments, selectedIndex);
    }

    internal static bool ShouldProcessDragValueForTest(int currentValue, int previousValue)
    {
        return ShouldProcessDragValue(currentValue, previousValue);
    }

    internal static int SegmentIndexAtValueForTest(int value, IEnumerable<TimelineSegmentDisplay> segments)
    {
        return SegmentIndexAtValue(value, segments);
    }

    internal static int BlurIndexAtValueForTest(int value, IEnumerable<TimelineBlurDisplay> regions)
    {
        return BlurIndexAtValue(value, regions);
    }

    internal static bool ShouldStartDragForButtonForTest(MouseButtons button)
    {
        return ShouldStartDragForButton(button);
    }

    internal static bool ShouldApplyEffectMouseDownForTest()
    {
        return ShouldApplyEffectMouseDown();
    }

    internal static bool ShouldActivateDeferredDragForTest(int startX, int startY, int currentX, int currentY)
    {
        return ShouldActivateDeferredDrag(new Point(startX, startY), new Point(currentX, currentY));
    }

    internal static int PositionAfterPrimaryClickForTest(
        int start,
        int end,
        int position,
        int pointerValue,
        int maximum,
        int trackWidth)
    {
        var target = HitTargetForValues(start, end, position, pointerValue, maximum, trackWidth);
        return PositionAfterPrimaryClick(target, start, end, pointerValue);
    }

    internal static string HitTargetForTest(
        int start,
        int end,
        int position,
        int pointerValue,
        int maximum,
        int trackWidth)
    {
        return HitTargetForValues(start, end, position, pointerValue, maximum, trackWidth).ToString();
    }

    internal static bool ShouldDrawSelectedRangeOverlayForTest(int start, int end, int maximum)
    {
        return ShouldDrawSelectedRangeOverlay(start, end, maximum);
    }

    internal static bool ShouldDrawSelectedRangeChromeForTest(
        int start,
        int end,
        int maximum,
        int segmentCount,
        int selectedSegmentIndex)
    {
        return ShouldDrawSelectedRangeChrome(start, end, maximum, segmentCount, selectedSegmentIndex);
    }

    internal static string HitTargetForSegmentsForTest(
        int start,
        int end,
        int position,
        int pointerValue,
        int maximum,
        int trackWidth,
        int segmentCount,
        int selectedSegmentIndex)
    {
        var selectedRangeEnabled = ShouldUseSelectedRangeChrome(segmentCount, selectedSegmentIndex);
        return HitTargetForValues(start, end, position, pointerValue, maximum, trackWidth, selectedRangeEnabled).ToString();
    }

    internal static string BlurHitTargetForTest(
        int pointerValue,
        IEnumerable<TimelineBlurDisplay> regions,
        int selectedIndex)
    {
        return BlurHitTargetForValue(pointerValue, regions.ToList(), selectedIndex).Target.ToString();
    }

    internal static string EffectLabelForTest(TimelineBlurDisplay region, int index)
    {
        return EffectLabel(region, index);
    }

    internal static bool EffectLaneIsSeparateForTest(int controlWidth, int controlHeight)
    {
        var track = TrackBounds(new Rectangle(0, 0, controlWidth, controlHeight));
        var lane = BlurLaneBounds(track, controlHeight, lane: 0, laneCount: 1);
        return lane.Top > track.Bottom;
    }

    internal static bool EffectLaneAvoidsTrimStartHandleForTest(int controlWidth, int controlHeight)
    {
        var track = TrackBounds(new Rectangle(0, 0, controlWidth, controlHeight));
        var lane = BlurLaneBounds(track, controlHeight, lane: 0, laneCount: 1);
        return lane.Left > track.Left + TimelineHandleVisualHalfWidth;
    }

    internal static int TrackStartXForTest(int controlWidth, int controlHeight)
    {
        return TrackBounds(new Rectangle(0, 0, controlWidth, controlHeight)).Left;
    }

    internal static int EffectLaneStartXForTest(int controlWidth, int controlHeight, int lane = 0)
    {
        var track = TrackBounds(new Rectangle(0, 0, controlWidth, controlHeight));
        return BlurLaneBounds(track, controlHeight, lane, laneCount: Math.Max(1, lane + 1)).Left;
    }

    internal static int EffectLaneCenterYForTest(int controlWidth, int controlHeight, int lane = 0)
    {
        var track = TrackBounds(new Rectangle(0, 0, controlWidth, controlHeight));
        var laneBounds = BlurLaneBounds(track, controlHeight, lane, laneCount: Math.Max(1, lane + 1));
        return laneBounds.Top + laneBounds.Height / 2;
    }

    internal static int TrackCenterYForTest(int controlWidth, int controlHeight)
    {
        var track = TrackBounds(new Rectangle(0, 0, controlWidth, controlHeight));
        return track.Top + track.Height / 2;
    }

    internal static string BlurHitTargetForLocationForTest(
        int controlWidth,
        int controlHeight,
        int pointerX,
        int pointerY,
        int maximum,
        IEnumerable<TimelineBlurDisplay> regions,
        int selectedIndex)
    {
        maximum = Math.Max(1, maximum);
        var track = TrackBounds(new Rectangle(0, 0, controlWidth, controlHeight));
        return BlurHitTargetForLocation(
            new Point(pointerX, pointerY),
            track,
            controlHeight,
            maximum,
            regions.ToList(),
            selectedIndex,
            0,
            maximum).Target.ToString();
    }

    internal static string BlurHitIndexForLocationForTest(
        int controlWidth,
        int controlHeight,
        int pointerX,
        int pointerY,
        int maximum,
        IEnumerable<TimelineBlurDisplay> regions,
        int selectedIndex)
    {
        maximum = Math.Max(1, maximum);
        var track = TrackBounds(new Rectangle(0, 0, controlWidth, controlHeight));
        var hit = BlurHitTargetForLocation(
            new Point(pointerX, pointerY),
            track,
            controlHeight,
            maximum,
            regions.ToList(),
            selectedIndex,
            0,
            maximum);
        return $"{hit.Index}:{hit.Target}";
    }

    internal static (int Start, int End) MoveBlurRangeForTest(
        int start,
        int end,
        int pointerValue,
        int pointerOffset,
        int maximum)
    {
        return MoveRange(start, end, pointerValue, pointerOffset, maximum, [], -1);
    }

    internal static (int Start, int End) MoveEffectRangeForTest(
        int start,
        int end,
        int pointerValue,
        int pointerOffset,
        int maximum,
        IEnumerable<TimelineBlurDisplay> regions,
        int selectedIndex)
    {
        return MoveRange(
            start,
            end,
            pointerValue,
            pointerOffset,
            maximum,
            EffectBlockerSegmentsFor(regions.ToList(), selectedIndex),
            selectedIndex);
    }

    internal static (int Start, int End) MoveEffectRangeWithPlayheadSnapForTest(
        int start,
        int end,
        int pointerValue,
        int pointerOffset,
        int maximum,
        int playhead,
        int snapTolerance,
        IEnumerable<TimelineBlurDisplay> regions,
        int selectedIndex)
    {
        var blockers = EffectBlockerSegmentsFor(regions.ToList(), selectedIndex);
        var moved = MoveRange(
            start,
            end,
            pointerValue,
            pointerOffset,
            maximum,
            blockers,
            selectedIndex);
        return SnapMovedRangeToPlayhead(moved.Start, moved.End, playhead, snapTolerance, maximum, blockers, selectedIndex);
    }

    internal static string ResizeEffectStartWithPlayheadSnapForTest(
        int currentEnd,
        int proposedStart,
        int maximum,
        int minimumRange,
        int playhead,
        int snapTolerance,
        IEnumerable<TimelineBlurDisplay> regions,
        int selectedIndex)
    {
        var blockers = EffectBlockerSegmentsFor(regions.ToList(), selectedIndex);
        var resized = ResizeStart(
            currentEnd,
            SnapValueToPlayhead(proposedStart, playhead, snapTolerance),
            maximum,
            minimumRange,
            blockers,
            selectedIndex);
        return $"{resized.Start}-{resized.End}";
    }

    internal static string ResizeEffectEndWithPlayheadSnapForTest(
        int currentStart,
        int proposedEnd,
        int maximum,
        int minimumRange,
        int playhead,
        int snapTolerance,
        IEnumerable<TimelineBlurDisplay> regions,
        int selectedIndex)
    {
        var blockers = EffectBlockerSegmentsFor(regions.ToList(), selectedIndex);
        var resized = ResizeEnd(
            currentStart,
            SnapValueToPlayhead(proposedEnd, playhead, snapTolerance),
            maximum,
            minimumRange,
            blockers,
            selectedIndex);
        return $"{resized.Start}-{resized.End}";
    }

    internal static int EffectSnapToleranceForModifierForTest(Keys modifierKeys, int normalTolerance)
    {
        return EffectSnapToleranceForModifier(modifierKeys, normalTolerance);
    }

    internal static string ZoomViewportForTest(int viewStart, int viewEnd, int maximum, int anchor, int wheelDelta)
    {
        var viewport = ZoomViewport(viewStart, viewEnd, maximum, anchor, wheelDelta);
        return $"{viewport.Start}-{viewport.End}";
    }

    internal static string PanViewportForTest(int viewStart, int viewEnd, int maximum, int delta)
    {
        var viewport = PanViewport(viewStart, viewEnd, maximum, delta);
        return $"{viewport.Start}-{viewport.End}";
    }

    internal static int ThumbnailTileWidthForTest(int trackHeight, int imageWidth, int imageHeight)
    {
        return TimelineThumbnailTileWidth(trackHeight, imageWidth, imageHeight);
    }

    internal static string ThumbnailSegmentBoundsForTest(
        int thumbnailCount,
        int maximum,
        int viewStart,
        int viewEnd,
        int trackWidth)
    {
        return string.Join(
            "|",
            TimelineThumbnailSegments(thumbnailCount, maximum, viewStart, viewEnd, trackWidth)
                .Select(segment => $"{segment.Index}:{segment.Left}-{segment.Right}"));
    }

    internal static string TimeRulerLabelsForTest(
        int viewStart,
        int viewEnd,
        int maximum,
        int trackWidth)
    {
        return string.Join(
            "|",
            BuildTimeRulerLabels(viewStart, viewEnd, maximum, trackWidth, DefaultUnitsPerSecond)
                .Select(label => $"{label.Text}@{label.X}"));
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
            DrawTimelineThumbnails(e.Graphics, track);
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
        var drawSelectedRangeOverlay = ShouldDrawSelectedRangeChrome(
            startValue,
            endValue,
            Maximum,
            displaySegments.Count,
            selectedDisplaySegmentIndex);
        var overlayState = e.Graphics.Save();
        e.Graphics.SetClip(new Rectangle(track.Left, 0, track.Width, Height));

        if (displaySegments.Count > 0)
        {
            using var dimBrush = new SolidBrush(Color.FromArgb(125, 0, 0, 0));
            e.Graphics.FillRectangle(dimBrush, track);
            for (var index = 0; index < displaySegments.Count; index++)
            {
                var segment = displaySegments[index];
                var segmentLeft = XFromValue(segment.Start, track);
                var segmentRight = XFromValue(segment.End, track);
                var segmentRect = Rectangle.FromLTRB(
                    Math.Min(segmentLeft, segmentRight),
                    track.Y + 3,
                    Math.Max(segmentLeft + 1, segmentRight),
                    track.Bottom - 3);
                var startColor = segment.IsRemoved
                    ? Color.FromArgb(index == selectedDisplaySegmentIndex ? 120 : 88, 255, 90, 110)
                    : Color.FromArgb(index == selectedDisplaySegmentIndex ? 116 : 76, LoaderlyTheme.Accent);
                var endColor = segment.IsRemoved
                    ? Color.FromArgb(index == selectedDisplaySegmentIndex ? 132 : 96, 255, 150, 95)
                    : Color.FromArgb(index == selectedDisplaySegmentIndex ? 126 : 84, LoaderlyTheme.Accent2);
                using var segmentBrush = new LinearGradientBrush(
                    segmentRect,
                    startColor,
                    endColor,
                    0F);
                e.Graphics.FillRectangle(segmentBrush, segmentRect);
                using var segmentPen = new Pen(
                    index == selectedDisplaySegmentIndex ? Color.White : segment.IsRemoved ? Color.FromArgb(255, 150, 100) : LoaderlyTheme.Accent2,
                    index == selectedDisplaySegmentIndex ? 2 : 1);
                e.Graphics.DrawRectangle(segmentPen, segmentRect.X, segmentRect.Y, Math.Max(1, segmentRect.Width - 1), Math.Max(1, segmentRect.Height - 1));
                if (segment.HasTransitionAfter)
                {
                    using var transitionBrush = new SolidBrush(Color.FromArgb(210, LoaderlyTheme.Accent2));
                    var marker = new Rectangle(Math.Max(track.Left, segmentRect.Right - 4), track.Y + 7, 8, Math.Max(8, track.Height - 14));
                    using var markerPath = LoaderlyTheme.RoundedRect(marker, 4);
                    e.Graphics.FillPath(transitionBrush, markerPath);
                }
            }
        }
        else
        {
            using var dimBrush = new SolidBrush(Color.FromArgb(135, 0, 0, 0));
            if (selected.Left > track.Left)
            {
                e.Graphics.FillRectangle(dimBrush, Rectangle.FromLTRB(track.Left, track.Top, selected.Left, track.Bottom));
            }

            if (selected.Right < track.Right)
            {
                e.Graphics.FillRectangle(dimBrush, Rectangle.FromLTRB(selected.Right, track.Top, track.Right, track.Bottom));
            }
        }

        if (drawSelectedRangeOverlay)
        {
            using (var selectedBrush = new LinearGradientBrush(selected, Color.FromArgb(80, LoaderlyTheme.Accent), Color.FromArgb(86, LoaderlyTheme.Accent2), 0F))
            {
                e.Graphics.FillRectangle(selectedBrush, selected);
            }

            using (var borderPen = new Pen(LoaderlyTheme.Accent2, 3))
            {
                e.Graphics.DrawRectangle(borderPen, selected.X, selected.Y, Math.Max(1, selected.Width - 1), selected.Height - 1);
            }
        }

        DrawTimeRuler(e.Graphics, track);
        if (ShouldDrawSelectedRangeHandles(displaySegments.Count, selectedDisplaySegmentIndex))
        {
            DrawHandle(e.Graphics, startX, track, LoaderlyTheme.Accent);
            DrawHandle(e.Graphics, endX, track, LoaderlyTheme.Accent2);
        }
        DrawBlurRegions(e.Graphics, track);
        DrawPlayhead(e.Graphics, XFromValue(positionValue, track), track, FormatTimelineTime(positionValue, unitsPerSecond));
        e.Graphics.Restore(overlayState);
    }

    protected override void OnMouseEnter(EventArgs e)
    {
        Focus();
        base.OnMouseEnter(e);
    }

    protected override void OnMouseWheel(MouseEventArgs e)
    {
        if ((ModifierKeys & Keys.Control) == Keys.Control)
        {
            var track = TrackBounds(ClientRectangle);
            var anchor = ValueFromX(e.X, track);
            var viewport = ZoomViewport(viewStartValue, viewEndValue, Maximum, anchor, e.Delta);
            SetViewport(viewport.Start, viewport.End);
            base.OnMouseWheel(e);
            return;
        }

        if ((ModifierKeys & Keys.Shift) == Keys.Shift && IsViewportZoomed())
        {
            var span = Math.Max(1, viewEndValue - viewStartValue);
            var step = Math.Max(1, span / 5);
            var delta = e.Delta < 0 ? step : -step;
            var viewport = PanViewport(viewStartValue, viewEndValue, Maximum, delta);
            SetViewport(viewport.Start, viewport.End);
            base.OnMouseWheel(e);
            return;
        }

        base.OnMouseWheel(e);
    }

    protected override void OnMouseDown(MouseEventArgs e)
    {
        if (ShouldStartViewportPan(e.Button, ModifierKeys, IsViewportZoomed()))
        {
            panningViewport = true;
            panStartLocation = e.Location;
            panStartViewStartValue = viewStartValue;
            panStartViewEndValue = viewEndValue;
            Cursor = Cursors.SizeWE;
            Capture = true;
            base.OnMouseDown(e);
            return;
        }

        var track = TrackBounds(ClientRectangle);
        var value = ValueFromX(e.X, track);
        var blurHit = BlurHitTest(e.Location, track);
        if (e.Button == MouseButtons.Left && blurHit.Index >= 0)
        {
            selectedBlurDisplayIndex = blurHit.Index;
            BlurClicked?.Invoke(
                this,
                new TimelineBlurMouseEventArgs(blurHit.Index, e.Button, e.Location));
            pendingDrag = blurHit.Target;
            pendingDragStartLocation = e.Location;
            pendingDragNeedsInteractionStarted = true;
            dragging = DragTarget.None;
            dragPointerOffset = pendingDrag == DragTarget.BlurRange
                ? value - blurDisplayRegions[blurHit.Index].Start
                : 0;
            lastDragValue = int.MinValue;
            Capture = true;
            if (ShouldApplyEffectMouseDown())
            {
                dragging = pendingDrag;
                pendingDrag = DragTarget.None;
                pendingDragNeedsInteractionStarted = false;
                InteractionStarted?.Invoke(this, EventArgs.Empty);
                ApplyMouse(e.X);
            }

            base.OnMouseDown(e);
            return;
        }

        if (e.Button == MouseButtons.Left && selectedBlurDisplayIndex >= 0)
        {
            selectedBlurDisplayIndex = -1;
            BlurClicked?.Invoke(
                this,
                new TimelineBlurMouseEventArgs(-1, e.Button, e.Location));
            Invalidate();
        }

        var segmentIndex = SegmentIndexAtValue(value, displaySegments);
        if (!ShouldStartDragForButton(e.Button))
        {
            if (e.Button == MouseButtons.Right && segmentIndex >= 0)
            {
                SegmentContextRequested?.Invoke(
                    this,
                    new TimelineSegmentMouseEventArgs(segmentIndex, e.Button, e.Location));
            }

            base.OnMouseDown(e);
            return;
        }

        if (segmentIndex >= 0 && segmentIndex != selectedDisplaySegmentIndex)
        {
            SegmentClicked?.Invoke(
                this,
                new TimelineSegmentMouseEventArgs(segmentIndex, e.Button, e.Location));
        }

        dragging = HitTest(e.Location);
        if (dragging == DragTarget.Range)
        {
            dragPointerOffset = ValueFromX(e.X, TrackBounds(ClientRectangle)) - startValue;
            pendingDrag = dragging;
            pendingDragStartLocation = e.Location;
            pendingDragNeedsInteractionStarted = false;
            dragging = DragTarget.None;
        }
        else
        {
            dragPointerOffset = 0;
            pendingDrag = DragTarget.None;
            pendingDragNeedsInteractionStarted = false;
        }

        lastDragValue = int.MinValue;
        Capture = true;
        InteractionStarted?.Invoke(this, EventArgs.Empty);
        if (pendingDrag == DragTarget.Range)
        {
            PositionValue = PositionAfterPrimaryClick(pendingDrag, startValue, endValue, value);
            base.OnMouseDown(e);
            return;
        }

        ApplyMouse(e.X);
        base.OnMouseDown(e);
    }

    protected override void OnMouseMove(MouseEventArgs e)
    {
        if (panningViewport)
        {
            ApplyViewportPan(e.Location);
            base.OnMouseMove(e);
            return;
        }

        if (pendingDrag != DragTarget.None)
        {
            if (ShouldActivateDeferredDrag(pendingDragStartLocation, e.Location))
            {
                dragging = pendingDrag;
                pendingDrag = DragTarget.None;
                if (pendingDragNeedsInteractionStarted)
                {
                    pendingDragNeedsInteractionStarted = false;
                    InteractionStarted?.Invoke(this, EventArgs.Empty);
                }

                lastDragValue = int.MinValue;
                ApplyMouse(e.X);
            }
        }
        else if (dragging != DragTarget.None)
        {
            ApplyMouse(e.X);
        }
        else
        {
            Cursor = BlurHitTest(e.Location, TrackBounds(ClientRectangle)).Target switch
            {
                DragTarget.BlurRange => Cursors.SizeAll,
                DragTarget.BlurStart or DragTarget.BlurEnd => Cursors.SizeWE,
                _ => HitTest(e.Location) switch
                {
                    DragTarget.Range => Cursors.SizeAll,
                    DragTarget.Position => Cursors.SizeWE,
                    _ => IsViewportZoomed() && (ModifierKeys & Keys.Shift) == Keys.Shift ? Cursors.SizeWE : Cursors.Hand
                }
            };
        }

        base.OnMouseMove(e);
    }

    protected override void OnMouseUp(MouseEventArgs e)
    {
        if (panningViewport)
        {
            ApplyViewportPan(e.Location);
            panningViewport = false;
            Capture = false;
            Cursor = Cursors.Hand;
            base.OnMouseUp(e);
            return;
        }

        if (dragging != DragTarget.None)
        {
            ApplyMouse(e.X);
        }

        dragging = DragTarget.None;
        pendingDrag = DragTarget.None;
        pendingDragNeedsInteractionStarted = false;
        dragPointerOffset = 0;
        lastDragValue = int.MinValue;
        Capture = false;
        InteractionCompleted?.Invoke(this, EventArgs.Empty);
        base.OnMouseUp(e);
    }

    private DragTarget HitTest(Point location)
    {
        var track = TrackBounds(ClientRectangle);
        var value = ValueFromX(location.X, track);
        var selectedRangeEnabled = ShouldUseSelectedRangeChrome(displaySegments.Count, selectedDisplaySegmentIndex);
        return HitTargetForValues(startValue, endValue, positionValue, value, Maximum, track.Width, viewStartValue, viewEndValue, selectedRangeEnabled);
    }

    private static DragTarget HitTargetForValues(
        int start,
        int end,
        int position,
        int pointerValue,
        int maximum,
        int trackWidth)
    {
        return HitTargetForValues(start, end, position, pointerValue, maximum, trackWidth, selectedRangeEnabled: true);
    }

    private static DragTarget HitTargetForValues(
        int start,
        int end,
        int position,
        int pointerValue,
        int maximum,
        int trackWidth,
        bool selectedRangeEnabled)
    {
        return HitTargetForValues(start, end, position, pointerValue, maximum, trackWidth, 0, maximum, selectedRangeEnabled);
    }

    private static DragTarget HitTargetForValues(
        int start,
        int end,
        int position,
        int pointerValue,
        int maximum,
        int trackWidth,
        int viewStart,
        int viewEnd,
        bool selectedRangeEnabled = true)
    {
        maximum = Math.Max(1, maximum);
        trackWidth = Math.Max(1, trackWidth);
        var pointerX = HitTestPixelFromValue(pointerValue, viewStart, viewEnd, trackWidth);
        var startX = HitTestPixelFromValue(start, viewStart, viewEnd, trackWidth);
        var endX = HitTestPixelFromValue(end, viewStart, viewEnd, trackWidth);
        var positionX = HitTestPixelFromValue(position, viewStart, viewEnd, trackWidth);
        var leftX = Math.Min(startX, endX);
        var rightX = Math.Max(startX, endX);
        var rangeWidth = Math.Max(1F, rightX - leftX);
        var handleHitPixels = Math.Min(TimelineHandleHitPixels, Math.Max(3F, rangeWidth / 4F));

        if (Math.Abs(pointerX - positionX) <= TimelinePlayheadHitPixels)
        {
            return DragTarget.Position;
        }

        if (!selectedRangeEnabled)
        {
            return DragTarget.Position;
        }

        var startDistance = Math.Abs(pointerX - startX);
        var endDistance = Math.Abs(pointerX - endX);
        if (startDistance <= handleHitPixels || endDistance <= handleHitPixels)
        {
            return startDistance <= endDistance ? DragTarget.Start : DragTarget.End;
        }

        if (!ShouldDrawSelectedRangeOverlay(start, end, maximum))
        {
            return DragTarget.Position;
        }

        if (pointerX >= leftX && pointerX <= rightX)
        {
            return DragTarget.Range;
        }

        return DragTarget.Position;
    }

    private void ApplyMouse(int x)
    {
        var value = ValueFromX(x, TrackBounds(ClientRectangle));
        if (!ShouldProcessDragValue(value, lastDragValue))
        {
            return;
        }

        lastDragValue = value;
        switch (dragging)
        {
            case DragTarget.Start:
                var resizedStart = ResizeStart(endValue, Math.Min(value, endValue - MinimumRange), Maximum, MinimumRange, displaySegments, selectedDisplaySegmentIndex);
                SetRange(resizedStart.Start, resizedStart.End);
                PositionValue = StartValue;
                break;
            case DragTarget.End:
                var resizedEnd = ResizeEnd(startValue, Math.Max(value, startValue + MinimumRange), Maximum, MinimumRange, displaySegments, selectedDisplaySegmentIndex);
                SetRange(resizedEnd.Start, resizedEnd.End);
                PositionValue = EndValue;
                break;
            case DragTarget.Range:
                var moved = MoveRange(startValue, endValue, value, dragPointerOffset, Maximum, displaySegments, selectedDisplaySegmentIndex);
                SetRange(moved.Start, moved.End);
                PositionValue = moved.Start;
                break;
            case DragTarget.Position:
                PositionValue = value;
                break;
            case DragTarget.BlurStart:
            case DragTarget.BlurEnd:
            case DragTarget.BlurRange:
                ApplyBlurMouse(value);
                break;
        }
    }

    private void ApplyBlurMouse(int value)
    {
        if (selectedBlurDisplayIndex < 0 || selectedBlurDisplayIndex >= blurDisplayRegions.Count)
        {
            return;
        }

        var region = blurDisplayRegions[selectedBlurDisplayIndex];
        var start = region.Start;
        var end = region.End;
        var blockers = EffectBlockerSegmentsFor(blurDisplayRegions, selectedBlurDisplayIndex);
        var snapTolerance = EffectSnapToleranceForModifier(
            ModifierKeys,
            TimelineSnapToleranceUnits(
                TrackBounds(ClientRectangle).Width,
                viewStartValue,
                viewEndValue,
                unitsPerSecond));
        switch (dragging)
        {
            case DragTarget.BlurStart:
                var resizedStart = ResizeStart(
                    end,
                    Math.Clamp(
                        Math.Min(SnapValueToPlayhead(value, positionValue, snapTolerance), end - MinimumRange),
                        0,
                        Math.Max(0, Maximum - MinimumRange)),
                    Maximum,
                    MinimumRange,
                    blockers,
                    selectedBlurDisplayIndex);
                start = resizedStart.Start;
                end = resizedStart.End;
                break;
            case DragTarget.BlurEnd:
                var resizedEnd = ResizeEnd(
                    start,
                    Math.Clamp(
                        Math.Max(SnapValueToPlayhead(value, positionValue, snapTolerance), start + MinimumRange),
                        Math.Min(Maximum, start + MinimumRange),
                        Maximum),
                    Maximum,
                    MinimumRange,
                    blockers,
                    selectedBlurDisplayIndex);
                start = resizedEnd.Start;
                end = resizedEnd.End;
                break;
            case DragTarget.BlurRange:
                var moved = MoveRange(start, end, value, dragPointerOffset, Maximum, blockers, selectedBlurDisplayIndex);
                var snapped = SnapMovedRangeToPlayhead(
                    moved.Start,
                    moved.End,
                    positionValue,
                    snapTolerance,
                    Maximum,
                    blockers,
                    selectedBlurDisplayIndex);
                start = snapped.Start;
                end = snapped.End;
                break;
        }

        if (start == region.Start && end == region.End)
        {
            return;
        }

        blurDisplayRegions[selectedBlurDisplayIndex] = region with { Start = start, End = end };
        Invalidate();
        BlurRangeChanged?.Invoke(this, new TimelineBlurRangeChangedEventArgs(selectedBlurDisplayIndex, start, end));
    }

    private static IReadOnlyList<TimelineSegmentDisplay> EffectBlockerSegmentsFor(
        IReadOnlyList<TimelineBlurDisplay> regions,
        int selectedIndex)
    {
        if (selectedIndex < 0 || selectedIndex >= regions.Count)
        {
            return regions
                .Select(region => new TimelineSegmentDisplay(region.Start, region.End, HasTransitionAfter: false, IsRemoved: true))
                .ToList();
        }

        var selectedLane = NormalizedLane(regions[selectedIndex].Lane);
        return regions
            .Select(region => NormalizedLane(region.Lane) == selectedLane
                ? new TimelineSegmentDisplay(region.Start, region.End, HasTransitionAfter: false, IsRemoved: true)
                : new TimelineSegmentDisplay(0, 0, HasTransitionAfter: false))
            .ToList();
    }

    private static bool ShouldProcessDragValue(int currentValue, int previousValue)
    {
        return currentValue != previousValue;
    }

    private static bool ShouldStartDragForButton(MouseButtons button)
    {
        return button == MouseButtons.Left;
    }

    private static bool ShouldApplyEffectMouseDown()
    {
        return false;
    }

    private static int TimelineSnapToleranceUnits(
        int trackWidth,
        int viewStart,
        int viewEnd,
        int unitsPerSecond)
    {
        var visibleSpan = Math.Max(1, viewEnd - viewStart);
        var pixelTolerance = (int)Math.Round(visibleSpan * EffectSnapToPlayheadPixels / (double)Math.Max(1, trackWidth));
        var minTolerance = Math.Max(1, unitsPerSecond / 20);
        var maxTolerance = Math.Max(minTolerance, unitsPerSecond / 3);
        return Math.Clamp(pixelTolerance, minTolerance, maxTolerance);
    }

    private static int EffectSnapToleranceForModifier(Keys modifierKeys, int normalTolerance)
    {
        return (modifierKeys & Keys.Alt) == Keys.Alt ? 0 : normalTolerance;
    }

    private static int SnapValueToPlayhead(int value, int playhead, int tolerance)
    {
        return Math.Abs(value - playhead) <= Math.Max(0, tolerance)
            ? playhead
            : value;
    }

    private static (int Start, int End) SnapMovedRangeToPlayhead(
        int start,
        int end,
        int playhead,
        int tolerance,
        int maximum,
        IEnumerable<TimelineSegmentDisplay> segments,
        int selectedIndex)
    {
        maximum = Math.Max(1, maximum);
        var rangeLength = Math.Clamp(end - start, 1, maximum);
        var candidates = new List<(int Start, int Distance)>
        {
            (playhead, Math.Abs(start - playhead)),
            (playhead - rangeLength, Math.Abs(end - playhead)),
            (playhead - rangeLength / 2, Math.Abs(start + rangeLength / 2 - playhead))
        };

        foreach (var candidate in candidates
            .Where(candidate => candidate.Distance <= Math.Max(0, tolerance))
            .OrderBy(candidate => candidate.Distance))
        {
            var proposedStart = Math.Clamp(candidate.Start, 0, maximum - rangeLength);
            var snappedStart = ClampStartToAvailableInterval(
                proposedStart,
                rangeLength,
                maximum,
                BlockersFor(segments, selectedIndex));
            var snappedEnd = snappedStart + rangeLength;
            if (Math.Abs(snappedStart - playhead) <= tolerance ||
                Math.Abs(snappedEnd - playhead) <= tolerance ||
                Math.Abs(snappedStart + rangeLength / 2 - playhead) <= tolerance)
            {
                return (snappedStart, snappedEnd);
            }
        }

        return (start, end);
    }

    private static bool ShouldStartViewportPan(MouseButtons button, Keys modifierKeys, bool isViewportZoomed)
    {
        return isViewportZoomed &&
            (button == MouseButtons.Middle ||
                (button == MouseButtons.Left && (modifierKeys & Keys.Shift) == Keys.Shift));
    }

    private static bool ShouldActivateDeferredDrag(Point start, Point current)
    {
        return Math.Abs(current.X - start.X) >= DeferredDragThresholdPixels ||
            Math.Abs(current.Y - start.Y) >= DeferredDragThresholdPixels;
    }

    private static int PositionAfterPrimaryClick(DragTarget target, int start, int end, int pointerValue)
    {
        return target switch
        {
            DragTarget.Start => start,
            DragTarget.End => end,
            DragTarget.Range or DragTarget.Position => pointerValue,
            _ => pointerValue
        };
    }

    private static bool ShouldDrawSelectedRangeOverlay(int start, int end, int maximum)
    {
        maximum = Math.Max(1, maximum);
        var left = Math.Clamp(Math.Min(start, end), 0, maximum);
        var right = Math.Clamp(Math.Max(start, end), 0, maximum);
        return left > 0 || right < maximum;
    }

    private static bool ShouldDrawSelectedRangeChrome(
        int start,
        int end,
        int maximum,
        int segmentCount,
        int selectedSegmentIndex)
    {
        return ShouldUseSelectedRangeChrome(segmentCount, selectedSegmentIndex)
            && ShouldDrawSelectedRangeOverlay(start, end, maximum);
    }

    private static bool ShouldUseSelectedRangeChrome(int segmentCount, int selectedSegmentIndex)
    {
        return segmentCount <= 0 || selectedSegmentIndex >= 0 && selectedSegmentIndex < segmentCount;
    }

    private static bool ShouldDrawSelectedRangeHandles(int segmentCount, int selectedSegmentIndex)
    {
        return ShouldUseSelectedRangeChrome(segmentCount, selectedSegmentIndex);
    }

    private void SetViewport(int start, int end)
    {
        var viewport = NormalizeViewport(start, end, Maximum);
        if (viewStartValue == viewport.Start && viewEndValue == viewport.End)
        {
            return;
        }

        viewStartValue = viewport.Start;
        viewEndValue = viewport.End;
        Invalidate();
    }

    private bool IsViewportZoomed()
    {
        return viewStartValue > 0 || viewEndValue < Maximum;
    }

    private void ApplyViewportPan(Point location)
    {
        var track = TrackBounds(ClientRectangle);
        var span = Math.Max(1, panStartViewEndValue - panStartViewStartValue);
        var pixelDelta = location.X - panStartLocation.X;
        var unitDelta = -(int)Math.Round(pixelDelta / (double)Math.Max(1, track.Width) * span);
        var viewport = PanViewport(panStartViewStartValue, panStartViewEndValue, Maximum, unitDelta);
        SetViewport(viewport.Start, viewport.End);
    }

    private static (int Start, int End) ZoomViewport(int viewStart, int viewEnd, int maximum, int anchor, int wheelDelta)
    {
        var current = NormalizeViewport(viewStart, viewEnd, maximum);
        maximum = Math.Max(1, maximum);
        anchor = Math.Clamp(anchor, 0, maximum);
        var currentSpan = Math.Max(1, current.End - current.Start);
        var minimumSpan = Math.Clamp(maximum / 80, 25, maximum);
        var factor = wheelDelta > 0 ? 0.75 : 1.0 / 0.75;
        var targetSpan = (int)Math.Round(currentSpan * factor);
        if (wheelDelta > 0)
        {
            targetSpan = Math.Max(minimumSpan, targetSpan);
        }
        else if (targetSpan >= maximum - minimumSpan / 2)
        {
            return (0, maximum);
        }

        targetSpan = Math.Clamp(targetSpan, minimumSpan, maximum);
        var anchorRatio = (anchor - current.Start) / (double)currentSpan;
        var nextStart = (int)Math.Round(anchor - targetSpan * anchorRatio);
        return NormalizeViewport(nextStart, nextStart + targetSpan, maximum);
    }

    private static (int Start, int End) PanViewport(int viewStart, int viewEnd, int maximum, int delta)
    {
        var current = NormalizeViewport(viewStart, viewEnd, maximum);
        maximum = Math.Max(1, maximum);
        var span = Math.Clamp(current.End - current.Start, 1, maximum);
        if (span >= maximum)
        {
            return (0, maximum);
        }

        var nextStart = Math.Clamp(current.Start + delta, 0, maximum - span);
        return (nextStart, nextStart + span);
    }

    private static (int Start, int End) NormalizeViewport(int start, int end, int maximum)
    {
        maximum = Math.Max(1, maximum);
        start = Math.Clamp(start, 0, maximum);
        end = Math.Clamp(end, 0, maximum);
        if (end < start)
        {
            (start, end) = (end, start);
        }

        if (end == start)
        {
            end = Math.Min(maximum, start + 1);
            start = Math.Max(0, end - 1);
        }

        return (start, end);
    }

    private static float HitTestPixelFromValue(int value, int viewStart, int viewEnd, int trackWidth)
    {
        trackWidth = Math.Max(1, trackWidth);
        var span = Math.Max(1, viewEnd - viewStart);
        return trackWidth * ((value - viewStart) / (float)span);
    }

    private static int SegmentIndexAtValue(int value, IEnumerable<TimelineSegmentDisplay> segments)
    {
        var index = 0;
        foreach (var segment in segments)
        {
            if (segment.End <= segment.Start)
            {
                index++;
                continue;
            }

            if (value >= Math.Min(segment.Start, segment.End) &&
                value <= Math.Max(segment.Start, segment.End))
            {
                return index;
            }

            index++;
        }

        return -1;
    }

    private static int BlurIndexAtValue(int value, IEnumerable<TimelineBlurDisplay> regions, int? lane = null)
    {
        var index = 0;
        foreach (var region in regions)
        {
            if (lane.HasValue && NormalizedLane(region.Lane) != lane.Value)
            {
                index++;
                continue;
            }

            if (value >= Math.Min(region.Start, region.End) &&
                value <= Math.Max(region.Start, region.End))
            {
                return index;
            }

            index++;
        }

        return -1;
    }

    private (int Index, DragTarget Target) BlurHitTest(Point location, Rectangle track)
    {
        return BlurHitTargetForLocation(
            location,
            track,
            ClientSize.Height,
            Maximum,
            blurDisplayRegions,
            selectedBlurDisplayIndex,
            viewStartValue,
            viewEndValue);
    }

    private static (int Index, DragTarget Target) BlurHitTargetForLocation(
        Point location,
        Rectangle track,
        int controlHeight,
        int maximum,
        IReadOnlyList<TimelineBlurDisplay> regions,
        int selectedIndex,
        int viewStart,
        int viewEnd)
    {
        var laneCount = EffectLaneCount(regions);
        var laneIndex = -1;
        Rectangle lane = Rectangle.Empty;
        for (var index = 0; index < laneCount; index++)
        {
            var candidate = BlurLaneBounds(track, controlHeight, index, laneCount);
            if (!candidate.Contains(location))
            {
                continue;
            }

            laneIndex = index;
            lane = candidate;
            break;
        }

        if (regions.Count == 0 || laneIndex < 0)
        {
            return (-1, DragTarget.None);
        }

        var value = ValueFromX(location.X, EffectLaneTimeBounds(track, lane), viewStart, viewEnd, maximum);
        return BlurHitTargetForValue(value, regions, selectedIndex, laneIndex);
    }

    private static (int Index, DragTarget Target) BlurHitTargetForValue(
        int value,
        IReadOnlyList<TimelineBlurDisplay> regions,
        int selectedIndex,
        int? lane = null)
    {
        if (selectedIndex >= 0 &&
            selectedIndex < regions.Count &&
            (!lane.HasValue || NormalizedLane(regions[selectedIndex].Lane) == lane.Value))
        {
            var selected = regions[selectedIndex];
            var startDistance = Math.Abs(value - selected.Start);
            var endDistance = Math.Abs(value - selected.End);
            var tolerance = Math.Max(2, Math.Max(1, Math.Abs(selected.End - selected.Start)) / 12);
            if (startDistance <= tolerance)
            {
                return (selectedIndex, DragTarget.BlurStart);
            }

            if (endDistance <= tolerance)
            {
                return (selectedIndex, DragTarget.BlurEnd);
            }

            if (value >= Math.Min(selected.Start, selected.End) &&
                value <= Math.Max(selected.Start, selected.End))
            {
                return (selectedIndex, DragTarget.BlurRange);
            }
        }

        var index = BlurIndexAtValue(value, regions, lane);
        return index >= 0 ? (index, DragTarget.BlurRange) : (-1, DragTarget.None);
    }

    private static (int Start, int End) MoveRange(
        int start,
        int end,
        int pointerValue,
        int pointerOffset,
        int maximum,
        IEnumerable<TimelineSegmentDisplay> segments,
        int selectedIndex)
    {
        maximum = Math.Max(1, maximum);
        var rangeLength = Math.Clamp(end - start, 1, maximum);
        var proposedStart = Math.Clamp(pointerValue - pointerOffset, 0, maximum - rangeLength);
        var nextStart = ClampStartToAvailableInterval(proposedStart, rangeLength, maximum, BlockersFor(segments, selectedIndex));
        return (nextStart, nextStart + rangeLength);
    }

    private static (int Start, int End) ResizeEnd(
        int currentStart,
        int proposedEnd,
        int maximum,
        int minimumRange,
        IEnumerable<TimelineSegmentDisplay> segments,
        int selectedIndex)
    {
        maximum = Math.Max(1, maximum);
        minimumRange = Math.Clamp(minimumRange, 1, maximum);
        currentStart = Math.Clamp(currentStart, 0, maximum);
        var interval = AvailableIntervalContaining(currentStart, maximum, BlockersFor(segments, selectedIndex));
        var maxEnd = Math.Max(currentStart + minimumRange, interval.End);
        var nextEnd = Math.Clamp(proposedEnd, currentStart + minimumRange, maxEnd);
        return (currentStart, Math.Min(nextEnd, maximum));
    }

    private static (int Start, int End) ResizeStart(
        int currentEnd,
        int proposedStart,
        int maximum,
        int minimumRange,
        IEnumerable<TimelineSegmentDisplay> segments,
        int selectedIndex)
    {
        maximum = Math.Max(1, maximum);
        minimumRange = Math.Clamp(minimumRange, 1, maximum);
        currentEnd = Math.Clamp(currentEnd, 0, maximum);
        var interval = AvailableIntervalContaining(currentEnd, maximum, BlockersFor(segments, selectedIndex));
        var minStart = Math.Min(interval.Start, currentEnd - minimumRange);
        var nextStart = Math.Clamp(proposedStart, minStart, currentEnd - minimumRange);
        return (Math.Max(0, nextStart), currentEnd);
    }

    private static int ClampStartToAvailableInterval(
        int proposedStart,
        int rangeLength,
        int maximum,
        IReadOnlyList<(int Start, int End)> blockers)
    {
        var intervals = AvailableIntervals(maximum, blockers)
            .Where(interval => interval.End - interval.Start >= rangeLength)
            .ToList();
        if (intervals.Count == 0)
        {
            return Math.Clamp(proposedStart, 0, Math.Max(0, maximum - rangeLength));
        }

        var bestStart = intervals[0].Start;
        var bestDistance = int.MaxValue;
        foreach (var interval in intervals)
        {
            var candidate = Math.Clamp(proposedStart, interval.Start, interval.End - rangeLength);
            var distance = Math.Abs(candidate - proposedStart);
            if (distance < bestDistance)
            {
                bestStart = candidate;
                bestDistance = distance;
            }
        }

        return bestStart;
    }

    private static (int Start, int End) AvailableIntervalContaining(
        int value,
        int maximum,
        IReadOnlyList<(int Start, int End)> blockers)
    {
        foreach (var interval in AvailableIntervals(maximum, blockers))
        {
            if (value >= interval.Start && value <= interval.End)
            {
                return interval;
            }
        }

        return (0, maximum);
    }

    private static IReadOnlyList<(int Start, int End)> AvailableIntervals(
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

    private static IReadOnlyList<(int Start, int End)> BlockersFor(
        IEnumerable<TimelineSegmentDisplay> segments,
        int selectedIndex)
    {
        return segments
            .Select((segment, index) => (Segment: segment, Index: index))
            .Where(item =>
                (item.Segment.IsRemoved || item.Segment.BlocksSelection) &&
                item.Index != selectedIndex &&
                item.Segment.End > item.Segment.Start)
            .Select(item => (Start: item.Segment.Start, End: item.Segment.End))
            .OrderBy(item => item.Start)
            .ThenBy(item => item.End)
            .ToList();
    }

    private static Rectangle TrackBounds(Rectangle bounds)
    {
        var inset = 18;
        var reservedEffectHeight = 58;
        var height = Math.Min(76, Math.Max(46, bounds.Height - reservedEffectHeight));
        return new Rectangle(
            inset,
            Math.Max(8, (bounds.Height - reservedEffectHeight) / 2 - height / 2 + 8),
            Math.Max(1, bounds.Width - inset * 2),
            height);
    }

    private static Rectangle BlurLaneBounds(Rectangle track, int controlHeight, int lane, int laneCount)
    {
        laneCount = Math.Max(1, laneCount);
        lane = Math.Clamp(lane, 0, laneCount - 1);
        var height = Math.Min(18, Math.Max(13, track.Height / 5));
        var width = Math.Max(1, track.Width - EffectLaneHorizontalInset * 2);
        var separatedTop = track.Bottom + EffectLaneGap + lane * (height + 4);
        if (separatedTop + height <= controlHeight - EffectLaneGap)
        {
            return new Rectangle(
                track.X + EffectLaneHorizontalInset,
                separatedTop,
                width,
                height);
        }

        var stackedTop = track.Bottom - (height + 4) * (laneCount - lane) - EffectLaneGap;
        return new Rectangle(
            track.X + EffectLaneHorizontalInset,
            stackedTop,
            width,
            height);
    }

    private static int EffectLaneCount(IReadOnlyList<TimelineBlurDisplay> regions)
    {
        return Math.Max(1, regions.Count == 0 ? 1 : regions.Max(region => NormalizedLane(region.Lane)) + 1);
    }

    private static int NormalizedLane(int lane)
    {
        return Math.Clamp(lane, 0, 3);
    }

    private static Rectangle EffectLaneTimeBounds(Rectangle track, Rectangle lane)
    {
        return new Rectangle(lane.X, track.Y, Math.Max(1, lane.Width), track.Height);
    }

    private void DrawTimelineThumbnails(Graphics graphics, Rectangle track)
    {
        if (thumbnailImages.Count == 0)
        {
            return;
        }

        foreach (var segment in TimelineThumbnailSegments(
            thumbnailImages.Count,
            Maximum,
            viewStartValue,
            viewEndValue,
            track.Width))
        {
            var target = Rectangle.FromLTRB(
                track.Left + segment.Left,
                track.Top,
                track.Left + segment.Right + 1,
                track.Bottom);
            DrawImageCover(graphics, thumbnailImages[segment.Index], target);
        }
    }

    private static IReadOnlyList<ThumbnailSegmentBounds> TimelineThumbnailSegments(
        int thumbnailCount,
        int maximum,
        int viewStart,
        int viewEnd,
        int trackWidth)
    {
        thumbnailCount = Math.Max(0, thumbnailCount);
        if (thumbnailCount == 0 || trackWidth <= 0)
        {
            return [];
        }

        maximum = Math.Max(1, maximum);
        var viewport = NormalizeViewport(viewStart, viewEnd, maximum);
        var span = Math.Max(1, viewport.End - viewport.Start);
        var segments = new List<ThumbnailSegmentBounds>(thumbnailCount);
        for (var index = 0; index < thumbnailCount; index++)
        {
            var start = (int)Math.Round(maximum * (index / (double)thumbnailCount));
            var end = (int)Math.Round(maximum * ((index + 1) / (double)thumbnailCount));
            if (end <= viewport.Start || start >= viewport.End)
            {
                continue;
            }

            var clippedStart = Math.Max(start, viewport.Start);
            var clippedEnd = Math.Min(end, viewport.End);
            var left = (int)Math.Round(trackWidth * ((clippedStart - viewport.Start) / (double)span));
            var right = (int)Math.Round(trackWidth * ((clippedEnd - viewport.Start) / (double)span));
            left = Math.Clamp(left, 0, trackWidth);
            right = Math.Clamp(right, 0, trackWidth);
            if (right <= left)
            {
                right = Math.Min(trackWidth, left + 1);
            }

            segments.Add(new ThumbnailSegmentBounds(index, left, right));
        }

        return segments;
    }

    private static int TimelineThumbnailTileWidth(int trackHeight, int imageWidth, int imageHeight)
    {
        trackHeight = Math.Max(1, trackHeight);
        imageWidth = Math.Max(1, imageWidth);
        imageHeight = Math.Max(1, imageHeight);
        var width = (int)Math.Round(trackHeight * (imageWidth / (double)imageHeight));
        return Math.Clamp(width, 56, 220);
    }

    private static void DrawImageCover(Graphics graphics, Image image, Rectangle target)
    {
        if (target.Width <= 0 || target.Height <= 0)
        {
            return;
        }

        var sourceAspect = image.Width / (double)Math.Max(1, image.Height);
        var targetAspect = target.Width / (double)Math.Max(1, target.Height);
        RectangleF source;
        if (sourceAspect > targetAspect)
        {
            var width = image.Height * targetAspect;
            source = new RectangleF((float)((image.Width - width) / 2D), 0, (float)width, image.Height);
        }
        else
        {
            var height = image.Width / targetAspect;
            source = new RectangleF(0, (float)((image.Height - height) / 2D), image.Width, (float)height);
        }

        graphics.DrawImage(image, target, source, GraphicsUnit.Pixel);
    }

    private int XFromValue(int value, Rectangle track)
    {
        var ratio = (value - viewStartValue) / (float)Math.Max(1, viewEndValue - viewStartValue);
        return track.X + (int)Math.Round(track.Width * ratio);
    }

    private int ValueFromX(int x, Rectangle track)
    {
        return ValueFromX(x, track, viewStartValue, viewEndValue, Maximum);
    }

    private static int ValueFromX(int x, Rectangle track, int viewStart, int viewEnd, int maximum)
    {
        var ratio = Math.Clamp((x - track.X) / (float)Math.Max(1, track.Width), 0F, 1F);
        return Math.Clamp(
            viewStart + (int)Math.Round(ratio * (viewEnd - viewStart)),
            0,
            Math.Max(1, maximum));
    }

    private void DrawTimeRuler(Graphics graphics, Rectangle track)
    {
        var labels = BuildTimeRulerLabels(viewStartValue, viewEndValue, Maximum, track.Width, unitsPerSecond);
        if (labels.Count == 0)
        {
            return;
        }

        var ruler = new Rectangle(track.Left, track.Top, track.Width, 22);
        using (var rulerBrush = new LinearGradientBrush(
            ruler,
            Color.FromArgb(118, 0, 0, 0),
            Color.FromArgb(34, 0, 0, 0),
            90F))
        {
            graphics.FillRectangle(rulerBrush, ruler);
        }

        using var tickPen = new Pen(Color.FromArgb(90, 255, 255, 255), 1);
        using var guidePen = new Pen(Color.FromArgb(34, 255, 255, 255), 1);
        using var font = LoaderlyTheme.BodyFont(7.4F);
        using var textBrush = new SolidBrush(Color.FromArgb(222, 232, 238, 248));
        using var shadowBrush = new SolidBrush(Color.FromArgb(120, 0, 0, 0));
        using var format = new StringFormat
        {
            Alignment = StringAlignment.Center,
            LineAlignment = StringAlignment.Center,
            Trimming = StringTrimming.EllipsisCharacter
        };

        foreach (var label in labels)
        {
            var x = track.Left + label.X;
            graphics.DrawLine(guidePen, x, track.Top, x, track.Bottom);
            graphics.DrawLine(tickPen, x, track.Top + 2, x, track.Top + 12);

            var textWidth = Math.Max(44, (int)Math.Ceiling(graphics.MeasureString(label.Text, font).Width) + 12);
            var maxLeft = Math.Max(track.Left + 2, track.Right - textWidth - 2);
            var left = Math.Clamp(x - textWidth / 2, track.Left + 2, maxLeft);
            var textRect = new RectangleF(left, track.Top + 2, textWidth, 17);
            graphics.DrawString(label.Text, font, shadowBrush, new RectangleF(textRect.X + 1, textRect.Y + 1, textRect.Width, textRect.Height), format);
            graphics.DrawString(label.Text, font, textBrush, textRect, format);
        }
    }

    private static IReadOnlyList<TimelineRulerLabel> BuildTimeRulerLabels(
        int viewStart,
        int viewEnd,
        int maximum,
        int trackWidth,
        int unitsPerSecond)
    {
        if (trackWidth <= 0)
        {
            return [];
        }

        unitsPerSecond = Math.Max(1, unitsPerSecond);
        maximum = Math.Max(1, maximum);
        var viewport = NormalizeViewport(viewStart, viewEnd, maximum);
        var span = Math.Max(1, viewport.End - viewport.Start);
        var visibleSeconds = span / (double)unitsPerSecond;
        var stepSeconds = ChooseTimelineRulerStepSeconds(visibleSeconds, trackWidth);
        var stepUnits = Math.Max(1, (int)Math.Round((double)stepSeconds * unitsPerSecond));
        var first = (int)(Math.Ceiling(viewport.Start / (double)stepUnits) * stepUnits);
        var labels = new List<TimelineRulerLabel>();
        for (var value = first; value <= viewport.End; value += stepUnits)
        {
            if (value < viewport.Start)
            {
                continue;
            }

            var x = (int)Math.Round(trackWidth * ((value - viewport.Start) / (double)span));
            labels.Add(new TimelineRulerLabel(value, Math.Clamp(x, 0, trackWidth), FormatTimelineTime(value, unitsPerSecond)));
        }

        return labels;
    }

    private static int ChooseTimelineRulerStepSeconds(double visibleSeconds, int trackWidth)
    {
        var targetSeconds = Math.Max(1D, visibleSeconds * 92D / Math.Max(1, trackWidth));
        ReadOnlySpan<int> steps = [1, 2, 5, 10, 15, 30, 60, 120, 180, 300, 600, 900, 1200, 1800, 3600];
        foreach (var step in steps)
        {
            if (step >= targetSeconds)
            {
                return step;
            }
        }

        return (int)Math.Ceiling(targetSeconds / 3600D) * 3600;
    }

    private static string FormatTimelineTime(int value, int unitsPerSecond)
    {
        unitsPerSecond = Math.Max(1, unitsPerSecond);
        var time = TimeSpan.FromSeconds(Math.Max(0, value) / (double)unitsPerSecond);
        return time.TotalHours >= 1D
            ? $"{(int)time.TotalHours}:{time.Minutes:00}:{time.Seconds:00}"
            : $"{(int)time.TotalMinutes}:{time.Seconds:00}";
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

    private void DrawBlurRegions(Graphics graphics, Rectangle track)
    {
        if (blurDisplayRegions.Count == 0)
        {
            return;
        }

        var laneCount = EffectLaneCount(blurDisplayRegions);
        for (var laneIndex = 0; laneIndex < laneCount; laneIndex++)
        {
            var lane = BlurLaneBounds(track, ClientSize.Height, laneIndex, laneCount);
            using var laneBrush = new SolidBrush(Color.FromArgb(88, 12, 26, 33));
            using var lanePath = LoaderlyTheme.RoundedRect(lane, lane.Height / 2);
            graphics.FillPath(laneBrush, lanePath);
        }

        for (var index = 0; index < blurDisplayRegions.Count; index++)
        {
            var region = blurDisplayRegions[index];
            var lane = BlurLaneBounds(track, ClientSize.Height, NormalizedLane(region.Lane), laneCount);
            var effectTimeBounds = EffectLaneTimeBounds(track, lane);
            var left = XFromValue(region.Start, effectTimeBounds);
            var right = XFromValue(region.End, effectTimeBounds);
            var rect = Rectangle.FromLTRB(
                Math.Min(left, right),
                lane.Y + 2,
                Math.Max(left + 2, right),
                lane.Bottom - 2);
            var selected = index == selectedBlurDisplayIndex;
            var fill = region.IsEditing
                ? Color.FromArgb(184, 96, 165, 250)
                : selected ? Color.FromArgb(180, 52, 211, 153) : Color.FromArgb(132, 52, 211, 153);
            using var brush = new SolidBrush(fill);
            using var path = LoaderlyTheme.RoundedRect(rect, Math.Max(5, rect.Height / 2));
            graphics.FillPath(brush, path);
            using var pen = new Pen(selected ? Color.White : Color.FromArgb(210, 125, 211, 252), selected ? 2 : 1);
            graphics.DrawPath(pen, path);

            if (selected)
            {
                DrawBlurLaneHandle(graphics, rect.Left, lane);
                DrawBlurLaneHandle(graphics, rect.Right, lane);
            }

            if (rect.Width > 58)
            {
                using var font = LoaderlyTheme.BodyFont(7.2F);
                using var textBrush = new SolidBrush(Color.White);
                var text = EffectLabel(region, index);
                var textRect = new RectangleF(rect.X + 6, lane.Y, rect.Width - 12, lane.Height);
                using var format = new StringFormat
                {
                    Alignment = StringAlignment.Near,
                    LineAlignment = StringAlignment.Center,
                    Trimming = StringTrimming.EllipsisCharacter
                };
                graphics.DrawString(text, font, textBrush, textRect, format);
            }
        }
    }

    private static string EffectLabel(TimelineBlurDisplay region, int index)
    {
        return string.IsNullOrWhiteSpace(region.Label)
            ? $"Blur {index + 1}"
            : region.Label;
    }

    private static void DrawBlurLaneHandle(Graphics graphics, int x, Rectangle lane)
    {
        var handle = new Rectangle(x - 4, lane.Y - 2, 8, lane.Height + 4);
        using var brush = new SolidBrush(Color.FromArgb(245, 255, 255, 255));
        using var path = LoaderlyTheme.RoundedRect(handle, 4);
        graphics.FillPath(brush, path);
    }

    private static void DrawPlayhead(Graphics graphics, int x, Rectangle track, string label)
    {
        using var pen = new Pen(Color.White, 2);
        graphics.DrawLine(pen, x, track.Y - 12, x, track.Bottom + 12);
        using var brush = new SolidBrush(Color.White);
        graphics.FillEllipse(brush, x - 4, track.Y - 16, 8, 8);

        if (string.IsNullOrWhiteSpace(label))
        {
            return;
        }

        using var font = LoaderlyTheme.BodyFont(7.6F);
        var size = graphics.MeasureString(label, font);
        var width = Math.Max(46, (int)Math.Ceiling(size.Width) + 16);
        var height = 20;
        var maxLeft = Math.Max(track.Left + 2, track.Right - width - 2);
        var left = Math.Clamp(x - width / 2, track.Left + 2, maxLeft);
        var top = Math.Max(2, track.Top - height - 8);
        var rect = new Rectangle(left, top, width, height);
        using (var path = LoaderlyTheme.RoundedRect(rect, 10))
        using (var labelBrush = new SolidBrush(Color.FromArgb(222, 14, 18, 27)))
        using (var borderPen = new Pen(Color.FromArgb(155, 255, 255, 255), 1))
        {
            graphics.FillPath(labelBrush, path);
            graphics.DrawPath(borderPen, path);
        }

        using var textBrush = new SolidBrush(Color.White);
        using var format = new StringFormat
        {
            Alignment = StringAlignment.Center,
            LineAlignment = StringAlignment.Center
        };
        graphics.DrawString(label, font, textBrush, rect, format);
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
    private bool clipToRoundedRegion;

    public int Radius { get; set; } = LoaderlyTheme.PanelRadius;

    public bool ClipToRoundedRegion
    {
        get => clipToRoundedRegion;
        set
        {
            if (clipToRoundedRegion == value)
            {
                return;
            }

            clipToRoundedRegion = value;
            UpdateRegion();
            Invalidate();
        }
    }

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
        UpdateRegion();
        HideNativeScrollbars();
        Invalidate();
    }

    protected override void OnBackColorChanged(EventArgs e)
    {
        base.OnBackColorChanged(e);
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

    private void UpdateRegion()
    {
        if (!clipToRoundedRegion)
        {
            Region?.Dispose();
            Region = null;
            return;
        }

        if (ClientSize.Width <= 0 || ClientSize.Height <= 0)
        {
            return;
        }

        using var path = LoaderlyTheme.RoundedRect(ClientRectangle, Radius);
        Region?.Dispose();
        Region = new Region(path);
    }

    [DllImport("user32.dll")]
    private static extern bool ShowScrollBar(IntPtr hWnd, int wBar, bool bShow);
}
