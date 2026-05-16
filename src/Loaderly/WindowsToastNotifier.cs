using System.Diagnostics;
using System.Security;
using System.Text;

namespace Loaderly;

internal static class WindowsToastNotifier
{
    public static bool TryShow(string title, string message)
    {
        try
        {
            var toastXml = BuildToastXml(title, message, LoaderlyAssets.Logo128Path);
            var script = $$"""
                [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
                [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] > $null
                $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
                $xml.LoadXml('{{toastXml}}')
                $toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
                [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Loaderly').Show($toast)
                """;
            var encoded = Convert.ToBase64String(Encoding.Unicode.GetBytes(script));
            Process.Start(new ProcessStartInfo
            {
                FileName = "powershell.exe",
                Arguments = $"-NoProfile -ExecutionPolicy Bypass -EncodedCommand {encoded}",
                UseShellExecute = false,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden
            });
            return true;
        }
        catch
        {
            return false;
        }
    }

    internal static string BuildToastXmlForTest(string title, string message, string? logoPath)
    {
        return BuildToastXml(title, message, logoPath);
    }

    private static string BuildToastXml(string title, string message, string? logoPath)
    {
        var logo = string.IsNullOrWhiteSpace(logoPath)
            ? string.Empty
            : $"<image placement=\"appLogoOverride\" src=\"{Escape(new Uri(logoPath).AbsoluteUri)}\"/>";
        return
            "<toast><visual><binding template=\"ToastGeneric\">" +
            logo +
            $"<text>{Escape(title)}</text>" +
            $"<text>{Escape(message)}</text>" +
            "</binding></visual></toast>";
    }

    private static string Escape(string value)
    {
        return SecurityElement.Escape(value) ?? string.Empty;
    }
}
