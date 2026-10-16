using System;
using System.Globalization;
using System.Linq;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using System.Windows.Forms;
using Windows.ApplicationModel;
using Windows.Services.Store;

// Runs inside the MSIX identity, on an STA UI thread with a message pump.
// The Electron HWND owns Store consent dialogs. Only this package is updated.
internal static class LoaderlyStoreUpdates
{
    [ComImport, Guid("3E68D4BD-7135-4D10-8018-9FB6D9F33FA1"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IInitializeWithWindow { void Initialize(IntPtr hwnd); }
    [DllImport("user32.dll")] private static extern bool IsWindow(IntPtr hwnd);
    private static void Result(string status) { Console.WriteLine("{\"kind\":\"result\",\"status\":\"" + status + "\"}"); }

    [STAThread]
    private static int Main(string[] args)
    {
        long handle;
        if (args.Length != 2 || !new[] { "check", "download", "install" }.Contains(args[0]) ||
            !long.TryParse(args[1], out handle) || !IsWindow(new IntPtr(handle))) return 2;
        var exitCode = 0;
        using (var dispatcher = new Control())
        {
            var unused = dispatcher.Handle;
            SynchronizationContextSetup();
            dispatcher.BeginInvoke(new Action(async () =>
            {
                try { await Run(args[0], new IntPtr(handle)); }
                catch (Exception error)
                {
                    // Keep diagnostics machine-readable and free of account or filesystem data.
                    Console.Error.WriteLine("STORE_UNAVAILABLE " + error.HResult.ToString("X8"));
                    Result("error"); exitCode = 1;
                }
                finally { Application.ExitThread(); }
            }));
            Application.Run();
        }
        return exitCode;
    }

    private static void SynchronizationContextSetup()
    {
        System.Threading.SynchronizationContext.SetSynchronizationContext(new WindowsFormsSynchronizationContext());
    }

    private static async Task Run(string action, IntPtr owner)
    {
        var context = StoreContext.GetDefault();
        ((IInitializeWithWindow)(object)context).Initialize(owner);
        var family = Package.Current.Id.FamilyName;
        var updates = (await context.GetAppAndOptionalStorePackageUpdatesAsync()).Where(update =>
            update.Package.Id.FamilyName == family && !update.Package.IsOptional && !update.Package.IsFramework).ToArray();
        if (updates.Length == 0) { Result("current"); return; }
        if (action == "check") { Result("available"); return; }
        // Download-only never closes the running application. Install is a separate,
        // explicit request after the main process has saved work and locked new jobs.
        var operation = action == "download"
            ? context.RequestDownloadStorePackageUpdatesAsync(updates)
            : context.RequestDownloadAndInstallStorePackageUpdatesAsync(updates);
        operation.Progress = (_, progress) => Console.WriteLine("{\"kind\":\"progress\",\"progress\":" +
            (Math.Max(0, Math.Min(1, progress.TotalDownloadProgress)) * 100).ToString("0.##", CultureInfo.InvariantCulture) + "}");
        var result = await operation;
        Result(result.OverallState == StorePackageUpdateState.Completed ? "completed" :
            result.OverallState == StorePackageUpdateState.Canceled ? "canceled" : "error");
    }
}
