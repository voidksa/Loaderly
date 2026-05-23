using System.Drawing;
using System.Windows.Forms;

namespace Loaderly;

internal sealed class ExportNameForm : Form
{
    private readonly TextBox nameTextBox = new();

    public ExportNameForm(string defaultName)
    {
        Text = LoaderlyLanguage.Text("Export clip");
        StartPosition = FormStartPosition.CenterParent;
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        MinimizeBox = false;
        ShowInTaskbar = false;
        ClientSize = new Size(460, 176);
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
        root.RowStyles.Add(new RowStyle(SizeType.Absolute, 28));
        root.RowStyles.Add(new RowStyle(SizeType.Absolute, 44));
        root.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        root.RowStyles.Add(new RowStyle(SizeType.Absolute, 42));
        Controls.Add(root);

        root.Controls.Add(new Label
        {
            Dock = DockStyle.Fill,
            Text = LoaderlyLanguage.Text("Clip name"),
            ForeColor = LoaderlyTheme.MutedText,
            TextAlign = ContentAlignment.MiddleLeft
        }, 0, 0);

        var inputHost = new RoundedPanel
        {
            Dock = DockStyle.Fill,
            Radius = LoaderlyTheme.ControlRadius,
            BackColor = LoaderlyTheme.SurfaceMuted,
            BorderColor = LoaderlyTheme.Border,
            Padding = new Padding(12, 10, 12, 8),
            Margin = new Padding(0, 2, 0, 8)
        };
        nameTextBox.Dock = DockStyle.Fill;
        nameTextBox.Text = defaultName;
        nameTextBox.BackColor = LoaderlyTheme.SurfaceMuted;
        nameTextBox.ForeColor = LoaderlyTheme.Text;
        nameTextBox.BorderStyle = BorderStyle.None;
        nameTextBox.Margin = new Padding(0);
        inputHost.Controls.Add(nameTextBox);
        root.Controls.Add(inputHost, 0, 1);

        var actions = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 3,
            RowCount = 1,
            BackColor = LoaderlyTheme.Window
        };
        actions.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        actions.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 116));
        actions.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 116));
        root.Controls.Add(actions, 0, 3);

        var cancelButton = CreateButton("Cancel", primary: false);
        cancelButton.DialogResult = DialogResult.Cancel;
        actions.Controls.Add(cancelButton, 1, 0);

        var saveButton = CreateButton("Save", primary: true);
        saveButton.DialogResult = DialogResult.OK;
        actions.Controls.Add(saveButton, 2, 0);

        AcceptButton = saveButton;
        CancelButton = cancelButton;
    }

    protected override void OnShown(EventArgs e)
    {
        base.OnShown(e);
        WindowsTheme.ApplyTitleBarTheme(this);
    }

    public string ExportName => nameTextBox.Text.Trim();

    private static ModernButton CreateButton(string text, bool primary)
    {
        var button = new ModernButton
        {
            Dock = DockStyle.Fill,
            Text = LoaderlyLanguage.Text(text),
            Margin = new Padding(8, 0, 0, 0),
            Radius = LoaderlyTheme.ControlRadius,
            FillColor = primary ? LoaderlyTheme.Accent : LoaderlyTheme.SurfaceMuted,
            HoverColor = primary ? LoaderlyTheme.AccentHover : LoaderlyTheme.ControlHover,
            PressedColor = primary ? LoaderlyTheme.AccentPressed : LoaderlyTheme.ControlPressed,
            ForeColor = Color.White,
            Font = LoaderlyTheme.BodyFont(9.2F)
        };
        return button;
    }
}
