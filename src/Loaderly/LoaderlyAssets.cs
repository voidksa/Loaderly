using System.Drawing;
using System.IO;

namespace Loaderly;

internal static class LoaderlyAssets
{
    public static Icon? AppIcon => LoadIcon("loaderly.ico");

    public static Image? Logo512 => LoadImage("loaderly-512.png");

    public static Image? Logo128 => LoadImage("loaderly-128.png");

    public static string? Logo128Path => AssetPath("loaderly-128.png");

    public static Image? BuyMeACoffeeIcon => LoadImage("buy-me-a-coffee.png");

    private static Icon? LoadIcon(string fileName)
    {
        var path = AssetPath(fileName);
        if (path is null)
        {
            return null;
        }

        using var stream = File.OpenRead(path);
        using var icon = new Icon(stream);
        return (Icon)icon.Clone();
    }

    private static Image? LoadImage(string fileName)
    {
        var path = AssetPath(fileName);
        if (path is null)
        {
            return null;
        }

        using var stream = File.OpenRead(path);
        using var image = Image.FromStream(stream);
        return new Bitmap(image);
    }

    private static string? AssetPath(string fileName)
    {
        foreach (var basePath in new[]
                 {
                     AppContext.BaseDirectory,
                     Environment.CurrentDirectory,
                     Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", ".."))
                 })
        {
            var candidate = Path.Combine(basePath, "assets", fileName);
            if (File.Exists(candidate))
            {
                return candidate;
            }
        }

        return null;
    }
}
