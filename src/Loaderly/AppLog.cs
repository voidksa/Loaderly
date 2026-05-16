using System.IO;

namespace Loaderly;

internal static class AppLog
{
    private static readonly object Sync = new();

    public static string LogFilePath => Path.Combine(AppDataFolder.Path, "logs", "loaderly.log");

    internal static string LogFilePathForTest => LogFilePath;

    public static void Write(string message)
    {
        if (string.IsNullOrWhiteSpace(message))
        {
            return;
        }

        try
        {
            lock (Sync)
            {
                Directory.CreateDirectory(Path.GetDirectoryName(LogFilePath)!);
                File.AppendAllText(LogFilePath, FormatEntry(DateTimeOffset.Now, message));
            }
        }
        catch
        {
        }
    }

    public static void WriteException(string area, Exception exception)
    {
        try
        {
            lock (Sync)
            {
                Directory.CreateDirectory(Path.GetDirectoryName(LogFilePath)!);
                File.AppendAllText(LogFilePath, FormatException(DateTimeOffset.Now, area, exception));
            }
        }
        catch
        {
        }
    }

    internal static string FormatEntryForTest(DateTimeOffset timestamp, string message)
    {
        return FormatEntry(timestamp, message);
    }

    internal static string FormatExceptionForTest(DateTimeOffset timestamp, string area, Exception exception)
    {
        return FormatException(timestamp, area, exception);
    }

    private static string FormatEntry(DateTimeOffset timestamp, string message)
    {
        return $"[{timestamp:yyyy-MM-dd HH:mm:ss zzz}] {message.Trim()}{Environment.NewLine}";
    }

    private static string FormatException(DateTimeOffset timestamp, string area, Exception exception)
    {
        return FormatEntry(timestamp, $"{area.Trim()}: {exception}");
    }
}
