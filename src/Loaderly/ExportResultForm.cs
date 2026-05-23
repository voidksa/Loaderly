using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Windows.Forms;

namespace Loaderly;

internal sealed class ExportResultForm : Form
{
    private readonly string filePath;
    private readonly ModernButton copyPathButton = new();

    public ExportResultForm(string filePath, bool copied, bool snapshot = false)
    {
        this.filePath = filePath;
        Text = LoaderlyLanguage.Text(snapshot ? "Snapshot saved" : copied ? "Clip copied" : "Clip saved");
        StartPosition = FormStartPosition.CenterParent;
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        MinimizeBox = false;
        ShowInTaskbar = false;
        ClientSize = new Size(540, 238);
        BackColor = LoaderlyTheme.Window;
        ForeColor = LoaderlyTheme.Text;
        Font = LoaderlyTheme.BodyFont(9.5F);

        var root = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 1,
            RowCount = 4,
            Padding = new Padding(20),
            BackColor = LoaderlyTheme.Window
        };
        root.RowStyles.Add(new RowStyle(SizeType.Absolute, 36));
        root.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        root.RowStyles.Add(new RowStyle(SizeType.Absolute, 44));
        root.RowStyles.Add(new RowStyle(SizeType.Absolute, 44));
        Controls.Add(root);

        root.Controls.Add(new Label
        {
            Dock = DockStyle.Fill,
            Text = LoaderlyLanguage.Text(snapshot ? "Snapshot saved" : copied ? "Clip copied" : "Clip saved"),
            ForeColor = LoaderlyTheme.Text,
            Font = LoaderlyTheme.TitleFont(13.5F),
            TextAlign = ContentAlignment.MiddleLeft
        }, 0, 0);

        var pathHost = new RoundedPanel
        {
            Dock = DockStyle.Fill,
            Radius = LoaderlyTheme.ControlRadius,
            BackColor = LoaderlyTheme.SurfaceMuted,
            BorderColor = LoaderlyTheme.Border,
            Padding = new Padding(12, 10, 12, 10),
            Margin = new Padding(0, 8, 0, 10)
        };
        var pathBox = new TextBox
        {
            Dock = DockStyle.Fill,
            Multiline = true,
            ReadOnly = true,
            BorderStyle = BorderStyle.None,
            BackColor = LoaderlyTheme.SurfaceMuted,
            ForeColor = LoaderlyTheme.Text,
            Text = filePath,
            Margin = new Padding(0)
        };
        pathHost.Controls.Add(pathBox);
        root.Controls.Add(pathHost, 0, 1);

        var actions = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 4,
            RowCount = 1,
            BackColor = LoaderlyTheme.Window
        };
        for (var index = 0; index < 4; index++)
        {
            actions.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 25));
        }

        root.Controls.Add(actions, 0, 2);

        var openFileButton = CreateButton("Open file", primary: true);
        openFileButton.Click += (_, _) => OpenFile(filePath);
        actions.Controls.Add(openFileButton, 0, 0);

        var openFolderButton = CreateButton("Open folder", primary: false);
        openFolderButton.Click += (_, _) => OpenFolder(filePath);
        actions.Controls.Add(openFolderButton, 1, 0);

        copyPathButton.Text = LoaderlyLanguage.Text("Copy path");
        ConfigureButton(copyPathButton, primary: false);
        copyPathButton.Click += (_, _) => CopyPath();
        actions.Controls.Add(copyPathButton, 2, 0);

        var closeButton = CreateButton("Close", primary: false);
        closeButton.Click += (_, _) => Close();
        actions.Controls.Add(closeButton, 3, 0);
    }

    protected override void OnShown(EventArgs e)
    {
        base.OnShown(e);
        WindowsTheme.ApplyTitleBarTheme(this);
    }

    internal static IReadOnlyList<string> ActionLabelsForTest(bool copied)
    {
        return ["Open file", "Open folder", "Copy path", "Close"];
    }

    internal static IReadOnlyList<string> SnapshotActionLabelsForTest()
    {
        return ActionLabelsForTest(copied: false);
    }

    private static ModernButton CreateButton(string text, bool primary)
    {
        var button = new ModernButton
        {
            Dock = DockStyle.Fill,
            Text = LoaderlyLanguage.Text(text),
            Margin = new Padding(0, 0, 10, 0)
        };
        ConfigureButton(button, primary);
        return button;
    }

    private static void ConfigureButton(ModernButton button, bool primary)
    {
        button.Radius = LoaderlyTheme.ControlRadius;
        button.FillColor = primary ? LoaderlyTheme.Accent : LoaderlyTheme.SurfaceMuted;
        button.HoverColor = primary ? LoaderlyTheme.AccentHover : LoaderlyTheme.ControlHover;
        button.PressedColor = primary ? LoaderlyTheme.AccentPressed : LoaderlyTheme.ControlPressed;
        button.ForeColor = Color.White;
        button.Font = LoaderlyTheme.BodyFont(9.2F);
    }

    private void CopyPath()
    {
        Clipboard.SetText(filePath);
        copyPathButton.Text = LoaderlyLanguage.Text("Copied");
        copyPathButton.Invalidate();
    }

    private static void OpenFile(string path)
    {
        if (!File.Exists(path))
        {
            return;
        }

        Process.Start(new ProcessStartInfo(path) { UseShellExecute = true });
    }

    private static void OpenFolder(string path)
    {
        var directory = Path.GetDirectoryName(path);
        if (string.IsNullOrWhiteSpace(directory) || !Directory.Exists(directory))
        {
            return;
        }

        var startInfo = File.Exists(path)
            ? new ProcessStartInfo("explorer.exe", $"/select,\"{path}\"")
            : new ProcessStartInfo(directory)
            {
                UseShellExecute = true
            };
        Process.Start(startInfo);
    }
}
