using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Windows.Forms;

namespace Loaderly;

internal sealed class AboutForm : Form
{
    private readonly ModernButton releasesButton = new();
    private readonly ModernButton logsButton = new();
    private readonly ModernButton copyButton = new();
    private readonly ModernButton closeButton = new();

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
        ClientSize = new Size(600, 430);
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

    private static Control BuildInfoPanel()
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
            RowCount = 3,
            ColumnCount = 1,
            BackColor = LoaderlyTheme.Surface
        };
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 54));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 66));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 66));
        panel.Controls.Add(layout);

        layout.Controls.Add(InfoRow("Version", ProductInfo.DisplayVersion), 0, 0);
        layout.Controls.Add(InfoRow("Updates", ProductInfo.ReleasesUri.ToString()), 0, 1);
        layout.Controls.Add(InfoRow("Diagnostics", AppLog.LogFilePath), 0, 2);
        return panel;
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
    }

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

    private static string AboutText()
    {
        return string.Join(
            Environment.NewLine,
            ProductInfo.Name,
            ProductInfo.DisplayVersion,
            ProductInfo.ReleasesUri,
            AppLog.LogFilePath);
    }
}
