using System.IO;
using Loaderly;
using Loaderly.Setup;

var failures = new List<string>();

Expect(
    "friendly Windows Media Player capability guidance",
    TrimForm.MediaPreviewFailureStatusForTest(
        new InvalidOperationException("Windows Media Player version 10 or later is required.")),
    "Windows Media Player feature is missing. Run as administrator: DISM /Online /Add-Capability /CapabilityName:Media.WindowsMediaPlayer~~~~0.0.12.0");

Expect(
    "preserves unrelated preview failures",
    TrimForm.MediaPreviewFailureStatusForTest(new InvalidOperationException("Unsupported video format")),
    "Unsupported video format");

ExpectTrue(
    "installer explicit uninstall mode",
    SetupMode.ShouldUseUninstallModeForTest(true, null, "1.0.0"));

ExpectTrue(
    "installer opens as uninstall when app is already installed",
    SetupMode.ShouldUseUninstallModeForTest(false, "1.0.0", "1.0.0"));

ExpectFalse(
    "installer can force repair/install mode by argument",
    SetupMode.ShouldUseUninstallModeForTest(false, true, "1.0.0", "1.0.0"));

ExpectTrue(
    "installer recognizes explicit repair argument",
    SetupMode.ShouldForceInstallForTest(["--repair"]));

ExpectTrue(
    "installer uninstall layout keeps actions below toggles",
    SetupLayoutMetrics.OptionButtonGapForTest(uninstallMode: true) >= 24);

ExpectTrue(
    "installer install layout keeps actions below toggles",
    SetupLayoutMetrics.OptionButtonGapForTest(uninstallMode: false) >= 24);

ExpectSequence(
    "installer launches only after success acknowledgement",
    SetupMode.InstallCompletionStepsForTest(launchAfterInstall: true),
    [
        SetupCompletionStep.ShowSuccessMessage,
        SetupCompletionStep.CloseInstaller,
        SetupCompletionStep.LaunchApp
    ]);

ExpectTrue(
    "installer quiet launch is explicit",
    SetupMode.ShouldLaunchAfterQuietInstallForTest(["--quiet", "--launch"]));

ExpectFalse(
    "installer quiet install does not launch by default",
    SetupMode.ShouldLaunchAfterQuietInstallForTest(["--quiet"]));

Expect(
    "installer accepts custom install directory",
    SetupMode.InstallDirectoryArgumentForTest([@"--install-dir=C:\Apps\Loaderly"]) ?? "",
    @"C:\Apps\Loaderly");

var buildScript = File.ReadAllText(Path.Combine(RepositoryRoot(), "script", "build_windows.ps1"));
ExpectTrue(
    "windows build uses custom setup project",
    buildScript.Contains("Loaderly.Setup", StringComparison.Ordinal) &&
    buildScript.Contains("Loaderly-Setup-$Version.exe", StringComparison.Ordinal));
ExpectFalse(
    "windows build does not use Inno Setup packaging",
    buildScript.Contains("ISCC", StringComparison.OrdinalIgnoreCase) ||
    buildScript.Contains("Loaderly.iss", StringComparison.OrdinalIgnoreCase));

if (failures.Count > 0)
{
    foreach (var failure in failures)
    {
        Console.Error.WriteLine(failure);
    }

    Environment.Exit(1);
}

Console.WriteLine("Loaderly tests passed.");

void Expect(string name, string actual, string expected)
{
    if (!string.Equals(actual, expected, StringComparison.Ordinal))
    {
        failures.Add($"{name}: expected '{expected}', got '{actual}'");
    }
}

void ExpectTrue(string name, bool actual)
{
    if (!actual)
    {
        failures.Add($"{name}: expected true");
    }
}

void ExpectFalse(string name, bool actual)
{
    if (actual)
    {
        failures.Add($"{name}: expected false");
    }
}

void ExpectSequence<T>(string name, IReadOnlyList<T> actual, IReadOnlyList<T> expected)
{
    if (!actual.SequenceEqual(expected))
    {
        failures.Add($"{name}: expected '{string.Join(", ", expected)}', got '{string.Join(", ", actual)}'");
    }
}

string RepositoryRoot()
{
    var directory = new DirectoryInfo(AppContext.BaseDirectory);
    while (directory is not null)
    {
        if (File.Exists(Path.Combine(directory.FullName, "script", "build_windows.ps1")))
        {
            return directory.FullName;
        }

        directory = directory.Parent;
    }

    throw new DirectoryNotFoundException("Could not find the Loaderly repository root.");
}
