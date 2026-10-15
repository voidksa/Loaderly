/** Share CPU/memory capacity between editor jobs and download post-processing. */
export class LocalAiGate {
  private tail: Promise<void> = Promise.resolve();
  async run<T>(action: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    const previous = this.tail;
    let release!: () => void;
    this.tail = new Promise<void>(resolve => { release = resolve; });
    let cancel!: () => void;
    const canceled = new Promise<never>((_, reject) => { cancel = () => reject(new Error('TASK_CANCELED')); signal?.addEventListener('abort', cancel, { once: true }); });
    try {
      if (signal?.aborted) throw new Error('TASK_CANCELED');
      await Promise.race([previous, canceled]);
      if (signal?.aborted) throw new Error('TASK_CANCELED');
      return await action();
    } finally {
      signal?.removeEventListener('abort', cancel);
      // A canceled waiter must not let the next job overtake an active worker.
      void previous.finally(release);
    }
  }
}
