using System.IO;
using System.Text.Json;

namespace Loaderly;

internal sealed class DownloadHistoryStore
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true
    };

    private readonly string historyPath;

    public DownloadHistoryStore()
    {
        historyPath = Path.Combine(AppDataFolder.Path, "history.json");
    }

    public List<DownloadItem> Load()
    {
        return ReadHistory(historyPath);
    }

    public void Save(IEnumerable<DownloadItem> items)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(historyPath)!);
        var json = JsonSerializer.Serialize(items, JsonOptions);
        File.WriteAllText(historyPath, json);
    }

    private static List<DownloadItem> ReadHistory(string path)
    {
        if (!File.Exists(path))
        {
            return [];
        }

        try
        {
            var json = File.ReadAllText(path);
            return JsonSerializer.Deserialize<List<DownloadItem>>(json, JsonOptions) ?? [];
        }
        catch
        {
            return [];
        }
    }
}
