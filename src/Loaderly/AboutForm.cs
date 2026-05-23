using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Windows.Forms;

namespace Loaderly;

internal sealed class AboutForm : Form
{
    private const string BuyMeACoffeeUrl = "https://buymeacoffee.com/voidksa";

    private readonly ModernButton releasesButton = new();
    private readonly ModernButton logsButton = new();
    private readonly ModernButton copyButton = new();
    private readonly ModernButton closeButton = new();
    private readonly SupportButton coffeeButton = new();

    public AboutForm()
    {
        SetStyle(
            ControlStyles.AllPaintingInWmPaint |
            ControlStyles.OptimizedDoubleBuffer |
            ControlStyles.ResizeRedraw,
            true);
        DoubleBuffered = true;
        Text = LoaderlyLanguage.Text("About Loaderly");
        Icon = LoaderlyAssets.AppIcon;
        AutoScaleMode = AutoScaleMode.Dpi;
        StartPosition = FormStartPosition.CenterParent;
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        MinimizeBox = false;
        ClientSize = new Size(640, 560);
        BackColor = LoaderlyTheme.Window;
        Font = LoaderlyTheme.BodyFont(10F);

        BuildUi();
        BindEvents();
        LoaderlyLanguage.ApplyTo(this);
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
            RowCount = 3,
            ColumnCount = 1,
            Padding = new Padding(24),
            BackColor = LoaderlyTheme.Window
        };
        root.RowStyles.Add(new RowStyle(SizeType.Absolute, 98));
        root.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        root.RowStyles.Add(new RowStyle(SizeType.Absolute, 58));
        Controls.Add(root);

        root.Controls.Add(BuildHeader(), 0, 0);
        root.Controls.Add(BuildInfoPanel(), 0, 1);
        root.Controls.Add(BuildActions(), 0, 2);
    }

    private static Control BuildHeader()
    {
        var header = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 2,
            RowCount = 1,
            BackColor = LoaderlyTheme.Window
        };
        header.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 78));
        header.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));

        var logoFrame = new RoundedPanel
        {
            Dock = DockStyle.Fill,
            Radius = LoaderlyTheme.PanelRadius,
            BackColor = LoaderlyTheme.Surface,
            BorderColor = LoaderlyTheme.Border,
            Padding = new Padding(10),
            Margin = new Padding(0, 6, 16, 18)
        };
        logoFrame.Controls.Add(new PictureBox
        {
            Dock = DockStyle.Fill,
            Image = LoaderlyAssets.Logo128,
            SizeMode = PictureBoxSizeMode.Zoom,
            BackColor = LoaderlyTheme.Surface
        });
        header.Controls.Add(logoFrame, 0, 0);

        var text = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            RowCount = 3,
            ColumnCount = 1,
            BackColor = LoaderlyTheme.Window,
            Margin = new Padding(0, 4, 0, 16)
        };
        text.RowStyles.Add(new RowStyle(SizeType.Absolute, 38));
        text.RowStyles.Add(new RowStyle(SizeType.Absolute, 24));
        text.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        header.Controls.Add(text, 1, 0);

        text.Controls.Add(new Label
        {
            Dock = DockStyle.Fill,
            Text = ProductInfo.Name,
            ForeColor = LoaderlyTheme.Text,
            Font = LoaderlyTheme.TitleFont(24F),
            TextAlign = ContentAlignment.BottomLeft
        }, 0, 0);
        text.Controls.Add(new Label
        {
            Dock = DockStyle.Fill,
            Text = "Media workspace",
            ForeColor = LoaderlyTheme.MutedText,
            Font = LoaderlyTheme.BodyFont(10F),
            TextAlign = ContentAlignment.TopLeft
        }, 0, 1);
        text.Controls.Add(new Label
        {
            Dock = DockStyle.Fill,
            Text = ProductInfo.DisplayVersion,
            ForeColor = LoaderlyTheme.Accent,
            Font = LoaderlyTheme.BodyFont(9.5F),
            TextAlign = ContentAlignment.TopLeft
        }, 0, 2);

        return header;
    }

    private Control BuildInfoPanel()
    {
        var panel = new RoundedPanel
        {
            Dock = DockStyle.Fill,
            Radius = LoaderlyTheme.PanelRadius,
            BackColor = LoaderlyTheme.Surface,
            BorderColor = LoaderlyTheme.Border,
            Padding = new Padding(18),
            Margin = new Padding(0, 0, 0, 14)
        };

        var layout = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            RowCount = 4,
            ColumnCount = 1,
            BackColor = LoaderlyTheme.Surface
        };
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 50));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 58));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 62));
        layout.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        panel.Controls.Add(layout);

        layout.Controls.Add(InfoRow("Version", ProductInfo.DisplayVersion), 0, 0);
        layout.Controls.Add(InfoRow("Updates", ProductInfo.ReleasesUri.ToString()), 0, 1);
        layout.Controls.Add(InfoRow("Diagnostics", AppLog.LogFilePath), 0, 2);
        layout.Controls.Add(BuildSupportPanel(), 0, 3);
        return panel;
    }

    private Control BuildSupportPanel()
    {
        var panel = new RoundedPanel
        {
            Dock = DockStyle.Fill,
            Radius = LoaderlyTheme.ControlRadius,
            BackColor = LoaderlyTheme.Window,
            BorderColor = LoaderlyTheme.Border,
            Padding = new Padding(14, 10, 14, 12),
            Margin = new Padding(0, 8, 0, 0)
        };

        var layout = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            RowCount = 3,
            ColumnCount = 1,
            BackColor = LoaderlyTheme.Window
        };
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 24));
        layout.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 42));
        panel.Controls.Add(layout);

        layout.Controls.Add(new Label
        {
            Dock = DockStyle.Fill,
            Text = "Support Loaderly",
            ForeColor = LoaderlyTheme.Text,
            Font = new Font(LoaderlyTheme.BodyFont(10F), FontStyle.Bold),
            TextAlign = LoaderlyLanguage.IsArabic ? ContentAlignment.MiddleRight : ContentAlignment.MiddleLeft
        }, 0, 0);
        layout.Controls.Add(new Label
        {
            Dock = DockStyle.Fill,
            Text = "Optional support helps keep Loaderly maintained. Members may get early builds before public releases.",
            ForeColor = LoaderlyTheme.MutedText,
            Font = LoaderlyTheme.BodyFont(8.8F),
            TextAlign = LoaderlyLanguage.IsArabic ? ContentAlignment.TopRight : ContentAlignment.TopLeft
        }, 0, 1);

        var buttons = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 1,
            RowCount = 1,
            BackColor = LoaderlyTheme.Window
        };
        buttons.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        layout.Controls.Add(buttons, 0, 2);

        ConfigureSupportButtons(buttons);

        return panel;
    }

    private void ConfigureSupportButtons(TableLayoutPanel buttons)
    {
        ConfigureSupportButton(
            coffeeButton,
            "Support via Buy Me a Coffee",
            LoaderlyAssets.BuyMeACoffeeIcon,
            Color.FromArgb(255, 129, 92));
        coffeeButton.Margin = new Padding(0, 4, 0, 0);
        buttons.Controls.Add(coffeeButton, 0, 0);
    }

    private static Control InfoRow(string label, string value)
    {
        var row = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            RowCount = 2,
            ColumnCount = 1,
            BackColor = LoaderlyTheme.Surface,
            Padding = new Padding(0, 2, 0, 6),
            Margin = new Padding(0)
        };
        row.RowStyles.Add(new RowStyle(SizeType.Absolute, 20));
        row.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        row.Controls.Add(new Label
        {
            Name = $"about-label-{label}",
            Dock = DockStyle.Fill,
            Text = label,
            ForeColor = LoaderlyTheme.MutedText,
            Font = LoaderlyTheme.BodyFont(8.8F),
            TextAlign = ContentAlignment.BottomLeft
        }, 0, 0);
        row.Controls.Add(new Label
        {
            Name = $"about-value-{label}",
            Dock = DockStyle.Fill,
            Text = value,
            AutoEllipsis = true,
            ForeColor = LoaderlyTheme.Text,
            Font = LoaderlyTheme.BodyFont(9.6F),
            TextAlign = ContentAlignment.MiddleLeft
        }, 0, 1);
        return row;
    }

    private Control BuildActions()
    {
        var actions = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 5,
            RowCount = 1,
            BackColor = LoaderlyTheme.Window
        };
        actions.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 110));
        actions.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 98));
        actions.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 98));
        actions.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        actions.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 98));

        ConfigureButton(releasesButton, "Releases", primary: false);
        ConfigureButton(logsButton, "Logs", primary: false);
        ConfigureButton(copyButton, "Copy", primary: false);
        ConfigureButton(closeButton, "Close", primary: true);
        releasesButton.Margin = new Padding(0, 8, 8, 8);
        logsButton.Margin = new Padding(0, 8, 8, 8);
        copyButton.Margin = new Padding(0, 8, 8, 8);
        closeButton.Margin = new Padding(0, 8, 0, 8);
        actions.Controls.Add(releasesButton, 0, 0);
        actions.Controls.Add(logsButton, 1, 0);
        actions.Controls.Add(copyButton, 2, 0);
        actions.Controls.Add(closeButton, 4, 0);
        return actions;
    }

    private void BindEvents()
    {
        releasesButton.Click += (_, _) => Open(ProductInfo.ReleasesUri.ToString());
        logsButton.Click += (_, _) => Open(Path.GetDirectoryName(AppLog.LogFilePath)!);
        copyButton.Click += (_, _) => Clipboard.SetText(AboutText());
        closeButton.Click += (_, _) => Close();
        coffeeButton.Click += (_, _) => Open(BuyMeACoffeeSupportUrl);
    }

    internal static string BuyMeACoffeeSupportUrl => BuyMeACoffeeUrl;

    private static void Open(string pathOrUrl)
    {
        if (string.IsNullOrWhiteSpace(pathOrUrl))
        {
            return;
        }

        if (!pathOrUrl.StartsWith("http", StringComparison.OrdinalIgnoreCase))
        {
            Directory.CreateDirectory(pathOrUrl);
        }

        Process.Start(new ProcessStartInfo
        {
            FileName = pathOrUrl,
            UseShellExecute = true
        });
    }

    private static void ConfigureButton(ModernButton button, string text, bool primary)
    {
        button.Text = LoaderlyLanguage.Text(text);
        button.Dock = DockStyle.Fill;
        button.Radius = LoaderlyTheme.ControlRadius;
        button.FillColor = primary ? LoaderlyTheme.Accent : LoaderlyTheme.SurfaceMuted;
        button.HoverColor = primary ? LoaderlyTheme.AccentHover : LoaderlyTheme.ControlHover;
        button.PressedColor = primary ? LoaderlyTheme.AccentPressed : LoaderlyTheme.ControlPressed;
        button.ForeColor = primary ? Color.White : LoaderlyTheme.Text;
        button.Font = LoaderlyTheme.BodyFont(9.5F);
    }

    private static void ConfigureSupportButton(SupportButton button, string text, Image? icon, Color accent)
    {
        button.Text = LoaderlyLanguage.Text(text);
        button.Icon = icon;
        button.AccentColor = accent;
        button.Dock = DockStyle.Fill;
    }

    private static string AboutText()
    {
        return string.Join(
            Environment.NewLine,
            ProductInfo.Name,
            ProductInfo.DisplayVersion,
            ProductInfo.ReleasesUri,
            AppLog.LogFilePath,
            BuyMeACoffeeSupportUrl);
    }

    private sealed class SupportButton : Control
    {
        private bool isHovered;
        private bool isPressed;

        public Image? Icon { get; set; }

        public Color AccentColor { get; set; } = LoaderlyTheme.Accent;

        public SupportButton()
        {
            SetStyle(
                ControlStyles.AllPaintingInWmPaint |
                ControlStyles.OptimizedDoubleBuffer |
                ControlStyles.SupportsTransparentBackColor |
                ControlStyles.ResizeRedraw |
                ControlStyles.UserPaint,
                true);
            BackColor = Color.Transparent;
            ForeColor = LoaderlyTheme.Text;
            Font = new Font(LoaderlyTheme.BodyFont(8.8F), FontStyle.Bold);
            Cursor = Cursors.Hand;
            TabStop = false;
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
            Invalidate();
            base.OnMouseLeave(e);
        }

        protected override void OnMouseDown(MouseEventArgs e)
        {
            if (e.Button == MouseButtons.Left)
            {
                isPressed = true;
                Invalidate();
            }

            base.OnMouseDown(e);
        }

        protected override void OnMouseUp(MouseEventArgs e)
        {
            isPressed = false;
            Invalidate();
            base.OnMouseUp(e);
        }

        protected override void OnTextChanged(EventArgs e)
        {
            Invalidate();
            base.OnTextChanged(e);
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            e.Graphics.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
            e.Graphics.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.Default;
            e.Graphics.Clear(Parent?.BackColor ?? LoaderlyTheme.Window);

            var bounds = ClientRectangle;
            bounds.Width -= 1;
            bounds.Height -= 1;
            var fill = isPressed
                ? LoaderlyTheme.ControlPressed
                : isHovered
                    ? LoaderlyTheme.ControlHover
                    : LoaderlyTheme.SurfaceMuted;
            using (var path = LoaderlyTheme.RoundedRect(bounds, LoaderlyTheme.ControlRadius))
            using (var brush = new SolidBrush(fill))
            using (var border = new Pen(Color.FromArgb(90, AccentColor)))
            {
                e.Graphics.FillPath(brush, path);
                e.Graphics.DrawPath(border, path);
            }

            var iconSize = Math.Min(22, Math.Max(16, Height - 16));
            var isRtl = RightToLeft == RightToLeft.Yes;
            var iconX = isRtl ? Width - iconSize - 14 : 14;
            var iconY = (Height - iconSize) / 2;
            if (Icon is not null)
            {
                e.Graphics.DrawImage(Icon, new Rectangle(iconX, iconY, iconSize, iconSize));
            }

            var textBounds = isRtl
                ? new Rectangle(12, 0, Math.Max(1, Width - iconSize - 34), Height)
                : new Rectangle(iconX + iconSize + 9, 0, Math.Max(1, Width - iconSize - 34), Height);
            TextRenderer.DrawText(
                e.Graphics,
                Text,
                Font,
                textBounds,
                ForeColor,
                (isRtl ? TextFormatFlags.Right : TextFormatFlags.Left) |
                TextFormatFlags.VerticalCenter |
                TextFormatFlags.EndEllipsis |
                TextFormatFlags.SingleLine |
                TextFormatFlags.NoPrefix);
        }
    }
}
