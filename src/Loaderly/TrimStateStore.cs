using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Loaderly;

internal sealed class TrimStateStore
{
    private readonly string storePath;
    private readonly JsonSerializerOptions serializerOptions = new() { WriteIndented = true };

    public TrimStateStore()
        : this(Path.Combine(AppDataFolder.Path, "trim-state.json"))
    {
    }

    internal TrimStateStore(string storePath)
    {
        this.storePath = storePath;
    }

    public TrimState? Load(string filePath)
    {
        var key = BuildKey(filePath);
        var states = LoadAll();
        return states.TryGetValue(key, out var state) && state.FileKey == key
            ? state
            : null;
    }

    public void Save(string filePath, TimeSpan start, TimeSpan end, TimeSpan position)
    {
        if (end <= start)
        {
            return;
        }

        var key = BuildKey(filePath);
        var states = LoadAll();
        states[key] = new TrimState
        {
            FileKey = key,
            SourcePath = Path.GetFullPath(filePath),
            StartSeconds = Math.Max(0, start.TotalSeconds),
            EndSeconds = Math.Max(0, end.TotalSeconds),
            PositionSeconds = Math.Max(0, position.TotalSeconds),
            UpdatedAt = DateTimeOffset.Now
        };

        Directory.CreateDirectory(Path.GetDirectoryName(storePath) ?? AppDataFolder.Path);
        File.WriteAllText(storePath, JsonSerializer.Serialize(states, serializerOptions), Encoding.UTF8);
    }

    private Dictionary<string, TrimState> LoadAll()
    {
        try
        {
            if (!File.Exists(storePath))
            {
                return [];
            }

            var json = File.ReadAllText(storePath, Encoding.UTF8);
            return JsonSerializer.Deserialize<Dictionary<string, TrimState>>(json) ?? [];
        }
        catch
        {
            return [];
        }
    }

    private static string BuildKey(string filePath)
    {
        var fullPath = Path.GetFullPath(filePath);
        var file = new FileInfo(fullPath);
        var identity = file.Exists
            ? $"{fullPath.ToUpperInvariant()}|{file.Length}|{file.LastWriteTimeUtc.Ticks}"
            : fullPath.ToUpperInvariant();
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(identity)));
    }
}

internal sealed class TrimState
{
    public string FileKey { get; set; } = string.Empty;

    public string SourcePath { get; set; } = string.Empty;

    public double StartSeconds { get; set; }

    public double EndSeconds { get; set; }

    public double PositionSeconds { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
