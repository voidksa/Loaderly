using System.Windows.Forms;

namespace Loaderly;

internal static class ModernTextBoxPlacement
{
    public const int TextBoxHeight = 24;

    public static void Attach(RoundedPanel host, TextBox textBox, int horizontalPadding = 10)
    {
        host.Cursor = Cursors.IBeam;
        textBox.Dock = DockStyle.None;
        textBox.AutoSize = false;
        textBox.Height = TextBoxHeight;
        textBox.Anchor = AnchorStyles.Left | AnchorStyles.Top | AnchorStyles.Right;
        textBox.Cursor = Cursors.IBeam;

        void LayoutTextBox()
        {
            var width = Math.Max(1, host.ClientSize.Width - horizontalPadding * 2);
            var top = Math.Max(0, (host.ClientSize.Height - textBox.Height) / 2);
            textBox.SetBounds(horizontalPadding, top, width, textBox.Height);
        }

        void FocusTextBox()
        {
            if (textBox.IsDisposed)
            {
                return;
            }

            if (textBox.CanFocus)
            {
                textBox.Focus();
            }

            if (!textBox.Focused && host.IsHandleCreated)
            {
                host.BeginInvoke(new Action(() =>
                {
                    if (!textBox.IsDisposed && textBox.CanFocus)
                    {
                        textBox.Focus();
                    }
                }));
            }
        }

        host.Resize += (_, _) => LayoutTextBox();
        textBox.HandleCreated += (_, _) => LayoutTextBox();
        host.MouseDown += (_, _) => FocusTextBox();
        host.MouseUp += (_, _) => FocusTextBox();
        host.Click += (_, _) => FocusTextBox();
        LayoutTextBox();
    }
}
