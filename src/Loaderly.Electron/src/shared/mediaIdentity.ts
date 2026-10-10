// Imports can finish in the same millisecond, and playlist batches can reserve
// several IDs at once. Keep selection/deletion identities unique across both.
export function createMediaIdAllocator(existing: readonly number[], now = Date.now) {
  let last = existing.reduce((highest, id) => Number.isSafeInteger(id) ? Math.max(highest, id) : highest, 0);
  return () => {
    last = Math.max(last + 1, now());
    return last;
  };
}
