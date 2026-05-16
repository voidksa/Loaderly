using System.Windows.Forms;

namespace Loaderly;

internal static class Program
{
    [STAThread]
    private static void Main(string[] args)
    {
        var settingsStore = new AppSettingsStore();
        if (TryApplyLanguageArgument(args, settingsStore))
        {
            return;
        }

        using var singleInstance = SingleInstanceGuard.Acquire(ProductInfo.SingleInstanceMutexName);
        if (!singleInstance.IsPrimary)
        {
            return;
        }

        ApplicationConfiguration.Initialize();
        RegisterGlobalExceptionLogging();
        Application.Run(new MainForm(
            new MediaDownloadService(),
            new TrimExportService(),
            new ThumbnailService(),
            new UpdateChecker(),
            new DownloadHistoryStore(),
            settingsStore));
    }

    private static void RegisterGlobalExceptionLogging()
    {
        Application.SetUnhandledExceptionMode(UnhandledExceptionMode.CatchException);
        Application.ThreadException += (_, args) => AppLog.WriteException("UI thread", args.Exception);
        AppDomain.CurrentDomain.UnhandledException += (_, args) =>
        {
            if (args.ExceptionObject is Exception exception)
            {
                AppLog.WriteException("Unhandled app exception", exception);
            }
        };
        TaskScheduler.UnobservedTaskException += (_, args) =>
        {
            AppLog.WriteException("Background task", args.Exception);
            args.SetObserved();
        };
    }

    private static bool TryApplyLanguageArgument(string[] args, AppSettingsStore settingsStore)
    {
        var language = args
            .Select((value, index) => new { value, index })
            .FirstOrDefault(item => item.value.Equals("--language", StringComparison.OrdinalIgnoreCase) ||
                                    item.value.Equals("/language", StringComparison.OrdinalIgnoreCase));
        if (language is null || language.index + 1 >= args.Length)
        {
            return false;
        }

        var settings = settingsStore.Load();
        settings.AppLanguage = LoaderlyLanguage.Normalize(args[language.index + 1]);
        settingsStore.Save(settings);
        return true;
    }
}
