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

    public bool HasSavedState(string filePath)
    {
        var state = Load(filePath);
        return state is not null && (
            state.Cuts.Count > 0 ||
            state.BlurRegions.Count > 0 ||
            state.ZoomRegions.Count > 0 ||
            state.StartSeconds > 0.05 ||
            state.SourceDurationSeconds > 0 && state.EndSeconds < state.SourceDurationSeconds - 0.05);
    }

    public void Save(
        string filePath,
        TimeSpan start,
        TimeSpan end,
        TimeSpan position,
        IEnumerable<TrimCutRange>? cuts = null,
        int selectedCutIndex = -1,
        IEnumerable<TrimBlurRegion>? blurRegions = null,
        int selectedBlurIndex = -1,
        TimeSpan? sourceDuration = null,
        IEnumerable<TrimZoomRegion>? zoomRegions = null,
        int selectedZoomIndex = -1)
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
            SourceDurationSeconds = Math.Max(0, sourceDuration?.TotalSeconds ?? 0),
            PositionSeconds = Math.Max(0, position.TotalSeconds),
            Cuts = (cuts ?? [])
                .Where(cut => cut.End > cut.Start)
                .Select(cut => new TrimCutState
                {
                    StartSeconds = Math.Max(0, cut.Start.TotalSeconds),
                    EndSeconds = Math.Max(0, cut.End.TotalSeconds),
                    TransitionAfter = TrimTransitionKind.None.ToString()
                })
                .ToList(),
            SelectedCutIndex = selectedCutIndex,
            BlurRegions = TrimBlurRegion.NormalizeMany(blurRegions)
                .Select(region => new TrimBlurState
                {
                    StartSeconds = Math.Max(0, region.Start.TotalSeconds),
                    EndSeconds = Math.Max(0, region.End.TotalSeconds),
                    Shape = region.Shape.ToString(),
                    Strength = region.Strength,
                    Keyframes = region.Keyframes
                        .Select(keyframe => new TrimBlurKeyframeState
                        {
                            TimeSeconds = Math.Max(0, keyframe.Time.TotalSeconds),
                            X = keyframe.X,
                            Y = keyframe.Y,
                            Width = keyframe.Width,
                            Height = keyframe.Height
                        })
                        .ToList()
                })
                .ToList(),
            SelectedBlurIndex = selectedBlurIndex,
            ZoomRegions = TrimZoomRegion.NormalizeMany(zoomRegions)
                .Select(region => new TrimZoomState
                {
                    StartSeconds = Math.Max(0, region.Start.TotalSeconds),
                    EndSeconds = Math.Max(0, region.End.TotalSeconds),
                    Scale = region.Scale,
                    Keyframes = region.Keyframes
                        .Select(keyframe => new TrimBlurKeyframeState
                        {
                            TimeSeconds = Math.Max(0, keyframe.Time.TotalSeconds),
                            X = keyframe.X,
                            Y = keyframe.Y,
                            Width = keyframe.Width,
                            Height = keyframe.Height
                        })
                        .ToList()
                })
                .ToList(),
            SelectedZoomIndex = selectedZoomIndex,
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

    public double SourceDurationSeconds { get; set; }

    public double PositionSeconds { get; set; }

    public List<TrimCutState> Cuts { get; set; } = [];

    public int SelectedCutIndex { get; set; } = -1;

    public List<TrimBlurState> BlurRegions { get; set; } = [];

    public int SelectedBlurIndex { get; set; } = -1;

    public List<TrimZoomState> ZoomRegions { get; set; } = [];

    public int SelectedZoomIndex { get; set; } = -1;

    public DateTimeOffset UpdatedAt { get; set; }
}

internal sealed class TrimBlurState
{
    public double StartSeconds { get; set; }

    public double EndSeconds { get; set; }

    public string Shape { get; set; } = nameof(TrimBlurShape.Box);

    public int Strength { get; set; } = 22;

    public List<TrimBlurKeyframeState> Keyframes { get; set; } = [];
}

internal sealed class TrimBlurKeyframeState
{
    public double TimeSeconds { get; set; }

    public double X { get; set; }

    public double Y { get; set; }

    public double Width { get; set; }

    public double Height { get; set; }
}

internal sealed class TrimZoomState
{
    public double StartSeconds { get; set; }

    public double EndSeconds { get; set; }

    public double Scale { get; set; } = 2.0;

    public List<TrimBlurKeyframeState> Keyframes { get; set; } = [];
}

internal sealed class TrimCutState
{
    public double StartSeconds { get; set; }

    public double EndSeconds { get; set; }

    public string TransitionAfter { get; set; } = nameof(TrimTransitionKind.None);
}
