import { describe, expect, it } from 'vitest';
import { buildReframeFilter } from './reframeFilter';
import type { ReframeEffectItem } from '../editor-project/editorProject';

function makeReframe(overrides: Partial<ReframeEffectItem> = {}): ReframeEffectItem {
  return {
    id: 'r1',
    type: 'reframe',
    name: 'Canvas',
    trackId: 'reframe',
    startTime: 0,
    endTime: 30,
    locked: false,
    hidden: false,
    targetWidth: 1080,
    targetHeight: 1920,
    fitMode: 'fit',
    positionX: 0.5,
    positionY: 0.5,
    background: { kind: 'black' },
    ...overrides
  };
}

describe('buildReframeFilter - Fit mode (no crop)', () => {
  it('uses force_original_aspect_ratio=decrease for 16:9 → 9:16', () => {
    const result = buildReframeFilter(
      makeReframe({ targetWidth: 1080, targetHeight: 1920, fitMode: 'fit' }),
      { sourceWidth: 1920, sourceHeight: 1080 },
      'out',
      'in'
    );
    expect(result.filter).toContain('force_original_aspect_ratio=decrease');
    expect(result.filter).toContain('pad=1080:1920:');
    expect(result.filter).not.toContain('force_original_aspect_ratio=increase');
    expect(result.filter).not.toContain(',crop=');
  });

  it('uses force_original_aspect_ratio=decrease for 9:16 → 1:1', () => {
    const result = buildReframeFilter(
      makeReframe({ targetWidth: 1080, targetHeight: 1080, fitMode: 'fit' }),
      { sourceWidth: 1080, sourceHeight: 1920 },
      'out',
      'in'
    );
    expect(result.filter).toContain('force_original_aspect_ratio=decrease');
    expect(result.filter).toContain('pad=1080:1080:');
  });

  it('does NOT crop in Fit mode', () => {
    const result = buildReframeFilter(
      makeReframe({ targetWidth: 1080, targetHeight: 1920, fitMode: 'fit' }),
      { sourceWidth: 1920, sourceHeight: 1080 },
      'out',
      'in'
    );
    // Fit mode should never have crop filter
    expect(result.filter).not.toMatch(/[^k]crop=/);
  });

  it('uses position-based pad offsets', () => {
    const resultCenter = buildReframeFilter(
      makeReframe({ targetWidth: 1080, targetHeight: 1920, fitMode: 'fit', positionX: 0.5, positionY: 0.5 }),
      { sourceWidth: 1920, sourceHeight: 1080 },
      'out',
      'in'
    );
    const resultLeft = buildReframeFilter(
      makeReframe({ targetWidth: 1080, targetHeight: 1920, fitMode: 'fit', positionX: 0, positionY: 0.5 }),
      { sourceWidth: 1920, sourceHeight: 1080 },
      'out',
      'in'
    );
    expect(resultCenter.filter).toContain('(ow-iw)*0.5000:(oh-ih)*0.5000');
    expect(resultLeft.filter).toContain('(ow-iw)*0.0000:(oh-ih)*0.5000');
  });

  it('uses blur background with split + boxblur in Fit mode', () => {
    const result = buildReframeFilter(
      makeReframe({
        targetWidth: 1080,
        targetHeight: 1920,
        fitMode: 'fit',
        background: { kind: 'blur' }
      }),
      { sourceWidth: 1920, sourceHeight: 1080 },
      'out',
      'in'
    );
    expect(result.filter).toContain('split=2');
    expect(result.filter).toContain('boxblur=40:1');
    expect(result.filter).toContain('force_original_aspect_ratio=decrease');
    expect(result.filter).toContain('force_original_aspect_ratio=increase'); // background
    expect(result.filter).toContain('overlay=');
  });
});

describe('buildReframeFilter - Fill mode (crop allowed)', () => {
  it('uses force_original_aspect_ratio=increase and crop for 16:9 → 9:16', () => {
    const result = buildReframeFilter(
      makeReframe({ targetWidth: 1080, targetHeight: 1920, fitMode: 'fill' }),
      { sourceWidth: 1920, sourceHeight: 1080 },
      'out',
      'in'
    );
    expect(result.filter).toContain('force_original_aspect_ratio=increase');
    expect(result.filter).toContain('crop=1080:1920:');
  });

  it('uses position-based crop offsets', () => {
    const result = buildReframeFilter(
      makeReframe({ targetWidth: 1080, targetHeight: 1080, fitMode: 'fill', positionX: 0.5, positionY: 0.5 }),
      { sourceWidth: 1920, sourceHeight: 1080 },
      'out',
      'in'
    );
    expect(result.filter).toContain('crop=1080:1080:(iw-1080)*0.5000:(ih-1080)*0.5000');
  });
});

describe('buildReframeFilter - Stretch and Original', () => {
  it('uses scale=target:target for stretch mode (no aspect ratio preservation)', () => {
    const result = buildReframeFilter(
      makeReframe({ targetWidth: 1280, targetHeight: 720, fitMode: 'stretch' }),
      { sourceWidth: 1920, sourceHeight: 1080 },
      'out',
      'in'
    );
    expect(result.filter).toContain('scale=1280:720:flags=lanczos');
    expect(result.filter).not.toContain('force_original_aspect_ratio');
  });

  it('uses pad with position-based offset for original mode', () => {
    const result = buildReframeFilter(
      makeReframe({ targetWidth: 1920, targetHeight: 1080, fitMode: 'original' }),
      { sourceWidth: 1920, sourceHeight: 1080 },
      'out',
      'in'
    );
    expect(result.filter).toContain('pad=1920:1080:');
    expect(result.filter).not.toContain('scale=');
  });
});

describe('buildReframeFilter - Output dimensions', () => {
  it('returns the exact target dimensions in the output', () => {
    const result = buildReframeFilter(
      makeReframe({ targetWidth: 1080, targetHeight: 1920 }),
      { sourceWidth: 1920, sourceHeight: 1080 },
      'out',
      'in'
    );
    expect(result.targetWidth).toBe(1080);
    expect(result.targetHeight).toBe(1920);
  });

  it('rounds dimensions to a minimum of 2', () => {
    const result = buildReframeFilter(
      makeReframe({ targetWidth: 0, targetHeight: 0 }),
      { sourceWidth: 1920, sourceHeight: 1080 },
      'out',
      'in'
    );
    expect(result.targetWidth).toBeGreaterThanOrEqual(2);
    expect(result.targetHeight).toBeGreaterThanOrEqual(2);
  });
});
