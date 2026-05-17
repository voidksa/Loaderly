using Loaderly;

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
