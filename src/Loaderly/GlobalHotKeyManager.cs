using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace Loaderly;

internal sealed class GlobalHotKeyManager : IDisposable
{
    public const int HotKeyId = 0x4C59;
    private readonly Form owner;

    public GlobalHotKeyManager(Form owner)
    {
        this.owner = owner;
    }

    public bool Register()
    {
        return RegisterHotKey(owner.Handle, HotKeyId, Modifiers.Control | Modifiers.Alt, (uint)Keys.L);
    }

    public void Dispose()
    {
        UnregisterHotKey(owner.Handle, HotKeyId);
    }

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool RegisterHotKey(IntPtr hWnd, int id, Modifiers fsModifiers, uint vk);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool UnregisterHotKey(IntPtr hWnd, int id);

    [Flags]
    private enum Modifiers : uint
    {
        Alt = 0x0001,
        Control = 0x0002
    }
}
