using System;
using Windows.ApplicationModel;

// This executable lives inside the MSIX, so Windows gives it the package
// identity required by StartupTask. System PowerShell can break away from it.
internal static class LoaderlyStartupTask
{
    private static T Wait<T>(Windows.Foundation.IAsyncOperation<T> operation)
    {
        var task = operation.AsTask();
        if (!task.Wait(TimeSpan.FromSeconds(8))) throw new TimeoutException();
        return task.Result;
    }

    private static int Main(string[] args)
    {
        if (args.Length != 1 || (args[0] != "get" && args[0] != "enable" && args[0] != "disable")) return 2;
        try
        {
            var task = Wait(StartupTask.GetAsync("LoaderlyStartup"));
            if (args[0] == "enable") Wait(task.RequestEnableAsync());
            if (args[0] == "disable") task.Disable();
            Console.WriteLine(task.State.ToString());
            return 0;
        }
        catch (Exception)
        {
            Console.Error.WriteLine("STARTUP_TASK_UNAVAILABLE");
            return 1;
        }
    }
}
