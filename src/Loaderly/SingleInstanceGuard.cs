using System.Threading;

namespace Loaderly;

internal sealed class SingleInstanceGuard : IDisposable
{
    private readonly Mutex mutex;
    private bool disposed;

    private SingleInstanceGuard(Mutex mutex, bool isPrimary)
    {
        this.mutex = mutex;
        IsPrimary = isPrimary;
    }

    public bool IsPrimary { get; }

    public static SingleInstanceGuard Acquire(string name)
    {
        var mutex = new Mutex(initiallyOwned: true, name, out var createdNew);
        return new SingleInstanceGuard(mutex, createdNew);
    }

    public void Dispose()
    {
        if (disposed)
        {
            return;
        }

        if (IsPrimary)
        {
            try
            {
                mutex.ReleaseMutex();
            }
            catch (ApplicationException)
            {
            }
        }

        mutex.Dispose();
        disposed = true;
    }
}
