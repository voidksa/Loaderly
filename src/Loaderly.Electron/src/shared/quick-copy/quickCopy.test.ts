import { describe, expect, it } from 'vitest';
import {
  createQuickCopyJob,
  QuickCopyOutputKind,
  quickCopyActions,
  validateQuickCopyRequest
} from './quickCopy';

describe('quick copy actions', () => {
  it('offers video, image, gif, snapshot, and audio outputs', () => {
    expect(quickCopyActions.map((action) => action.kind)).toEqual([
      QuickCopyOutputKind.Video,
      QuickCopyOutputKind.Image,
      QuickCopyOutputKind.Gif,
      QuickCopyOutputKind.Snapshot,
      QuickCopyOutputKind.Audio
    ]);
  });

  it('marks video, gif, and audio as range based outputs', () => {
    expect(quickCopyActions.filter((action) => action.requiresRange).map((action) => action.kind)).toEqual([
      QuickCopyOutputKind.Video,
      QuickCopyOutputKind.Gif,
      QuickCopyOutputKind.Audio
    ]);
  });

  it('rejects gif ranges longer than fifteen seconds', () => {
    const result = validateQuickCopyRequest({
      kind: QuickCopyOutputKind.Gif,
      startSeconds: 10,
      endSeconds: 27
    });

    expect(result).toEqual({
      ok: false,
      reason: 'GIF copy is limited to 15 seconds.'
    });
  });

  it('accepts short video ranges', () => {
    const result = validateQuickCopyRequest({
      kind: QuickCopyOutputKind.Video,
      startSeconds: 4,
      endSeconds: 12
    });

    expect(result).toEqual({ ok: true });
  });

  it('accepts audio ranges', () => {
    const result = validateQuickCopyRequest({
      kind: QuickCopyOutputKind.Audio,
      startSeconds: 4,
      endSeconds: 42
    });

    expect(result).toEqual({ ok: true });
  });

  it('creates a queued quick copy job with an output label', () => {
    const job = createQuickCopyJob({
      id: 7,
      kind: QuickCopyOutputKind.Snapshot,
      startSeconds: 18,
      endSeconds: 18.04
    });

    expect(job).toEqual({
      id: 'copy-7',
      kind: QuickCopyOutputKind.Snapshot,
      label: 'Copy snapshot',
      status: 'queued',
      rangeLabel: '00:18.00'
    });
  });
});
