using System.IO;
using System.Text.Json;

namespace Loaderly;

internal sealed class DownloadQueueStore
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true
    };

    private readonly string queuePath;

    public DownloadQueueStore()
    {
        queuePath = Path.Combine(AppDataFolder.Path, "queue.json");
    }

    public List<DownloadQueueItem> Load()
    {
        if (!File.Exists(queuePath))
        {
            return [];
        }

        try
        {
            var json = File.ReadAllText(queuePath);
            var items = JsonSerializer.Deserialize<List<DownloadQueueItem>>(json, JsonOptions) ?? [];
            foreach (var item in items)
            {
                if (item.State == DownloadTaskState.Running)
                {
                    item.State = DownloadTaskState.Canceled;
                    item.Status = "Paused after app closed";
                    item.Percent = null;
                }
            }

            return items
                .Where(item => item.State != DownloadTaskState.Completed && !string.IsNullOrWhiteSpace(item.SourceUrl))
                .ToList();
        }
        catch
        {
            return [];
        }
    }

    public void Save(IEnumerable<DownloadQueueItem> queue)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(queuePath)!);
        var saveItems = queue
            .Where(item => item.State != DownloadTaskState.Completed)
            .Select(item => new DownloadQueueItem
            {
                Id = item.Id,
                SourceUrl = item.SourceUrl,
                Options = item.Options,
                State = item.State == DownloadTaskState.Running ? DownloadTaskState.Canceled : item.State,
                Percent = item.State == DownloadTaskState.Running ? null : item.Percent,
                Status = item.State == DownloadTaskState.Running ? "Paused" : item.Status,
                Error = item.Error,
                Speed = item.Speed,
                Eta = item.Eta,
                DownloadedBytes = item.DownloadedBytes,
                TotalBytes = item.TotalBytes
            })
            .ToList();
        var json = JsonSerializer.Serialize(saveItems, JsonOptions);
        File.WriteAllText(queuePath, json);
    }
}
