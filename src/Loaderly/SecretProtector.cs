using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;

namespace Loaderly;

internal static class SecretProtector
{
    private const string Prefix = "dpapi:";

    public static string Protect(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var input = Encoding.UTF8.GetBytes(value.Trim());
        return Prefix + Convert.ToBase64String(ProtectBytes(input));
    }

    public static string Unprotect(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var trimmed = value.Trim();
        if (!trimmed.StartsWith(Prefix, StringComparison.Ordinal))
        {
            return trimmed;
        }

        try
        {
            var payload = Convert.FromBase64String(trimmed[Prefix.Length..]);
            return Encoding.UTF8.GetString(UnprotectBytes(payload)).Trim();
        }
        catch
        {
            return string.Empty;
        }
    }

    private static byte[] ProtectBytes(byte[] input)
    {
        return Transform(input, protect: true);
    }

    private static byte[] UnprotectBytes(byte[] input)
    {
        return Transform(input, protect: false);
    }

    private static byte[] Transform(byte[] input, bool protect)
    {
        var inputBlob = DataBlob.FromBytes(input);
        var outputBlob = default(DataBlob);
        try
        {
            var ok = protect
                ? CryptProtectData(ref inputBlob, "Loaderly", IntPtr.Zero, IntPtr.Zero, IntPtr.Zero, 0, out outputBlob)
                : CryptUnprotectData(ref inputBlob, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero, 0, out outputBlob);

            if (!ok)
            {
                throw new CryptographicException(Marshal.GetLastWin32Error());
            }

            var output = new byte[outputBlob.Size];
            Marshal.Copy(outputBlob.Data, output, 0, output.Length);
            return output;
        }
        finally
        {
            inputBlob.FreeManaged();
            outputBlob.FreeNative();
        }
    }

    [DllImport("crypt32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern bool CryptProtectData(
        ref DataBlob dataIn,
        string? dataDescription,
        IntPtr optionalEntropy,
        IntPtr reserved,
        IntPtr promptStruct,
        int flags,
        out DataBlob dataOut);

    [DllImport("crypt32.dll", SetLastError = true)]
    private static extern bool CryptUnprotectData(
        ref DataBlob dataIn,
        IntPtr dataDescription,
        IntPtr optionalEntropy,
        IntPtr reserved,
        IntPtr promptStruct,
        int flags,
        out DataBlob dataOut);

    [DllImport("kernel32.dll")]
    private static extern IntPtr LocalFree(IntPtr handle);

    [StructLayout(LayoutKind.Sequential)]
    private struct DataBlob
    {
        public int Size;
        public IntPtr Data;

        public static DataBlob FromBytes(byte[] bytes)
        {
            var blob = new DataBlob
            {
                Size = bytes.Length,
                Data = Marshal.AllocHGlobal(bytes.Length)
            };
            Marshal.Copy(bytes, 0, blob.Data, bytes.Length);
            return blob;
        }

        public void FreeManaged()
        {
            if (Data == IntPtr.Zero)
            {
                return;
            }

            Marshal.FreeHGlobal(Data);
            Data = IntPtr.Zero;
            Size = 0;
        }

        public void FreeNative()
        {
            if (Data == IntPtr.Zero)
            {
                return;
            }

            _ = LocalFree(Data);
            Data = IntPtr.Zero;
            Size = 0;
        }
    }
}
