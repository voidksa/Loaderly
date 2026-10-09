import { describe, expect, it } from 'vitest';

import {
  activeTimelineItemsAt,
  applyEditorCommand,
  createEditorState,
  editorProjectToOutputState,
  updateTimelineItemRegion
} from './editorProject';

function seededState() {
  let state = createEditorState({
    durationSeconds: 30,
    mediaId: 'media-1',
    mediaName: 'clip.mp4',
    sourcePath: 'C:/videos/clip.mp4'
  });

  state = applyEditorCommand(state, {
    type: 'add-item',
    item: {
      id: 'blur-a',
      type: 'blur',
      name: 'Face blur',
      trackId: 'blur',
      startTime: 2,
      endTime: 8,
      locked: false,
      hidden: false,
      region: { x: 10, y: 20, width: 30, height: 18 },
      strength: 16
    }
  });
  state = applyEditorCommand(state, {
    type: 'add-item',
    item: {
      id: 'blur-b',
      type: 'blur',
      name: 'Plate blur',
      trackId: 'blur',
      startTime: 12,
      endTime: 18,
      locked: false,
      hidden: false,
      region: { x: 62, y: 46, width: 22, height: 14 },
      strength: 20
    }
  });
  state = applyEditorCommand(state, {
    type: 'add-item',
    item: {
      id: 'zoom-a',
      type: 'zoom',
      name: 'First zoom',
      trackId: 'zoom',
      startTime: 4,
      endTime: 7,
      locked: false,
      hidden: false,
      region: { x: 45, y: 50, width: 42, height: 42 },
      scale: 1.8,
      easeIn: 0.3,
      easeOut: 0.3,
      easing: 'ease-in-out'
    }
  });
  state = applyEditorCommand(state, {
    type: 'add-item',
    item: {
      id: 'text-a',
      type: 'text',
      name: 'Stacked caption',
      trackId: 'text',
      startTime: 5,
      endTime: 15,
      locked: false,
      hidden: false,
      region: { x: 50, y: 72, width: 48, height: 14 },
      text: 'Line one\nLine two',
      fontFamily: 'Inter',
      fontSize: 36,
      fontWeight: 700,
      color: '#ffffff',
      align: 'center',
      zIndex: 2
    }
  });

  return state;
}

describe('editor project selectors', () => {
  it('returns only visible timeline items active at the playhead', () => {
    const state = seededState();

    expect(activeTimelineItemsAt(state.project, 5).map((item) => item.id)).toEqual(['media-1:media', 'blur-a', 'zoom-a', 'text-a']);
    expect(activeTimelineItemsAt(state.project, 13).map((item) => item.id)).toEqual(['media-1:media', 'blur-b', 'text-a']);
    expect(activeTimelineItemsAt(state.project, 25).map((item) => item.id)).toEqual(['media-1:media']);
  });

  it('updates overlay geometry for selected preview items without changing timing', () => {
    const state = seededState();
    const next = updateTimelineItemRegion(state.project, 'blur-a', { x: 30, y: 35, width: 26, height: 20 });

    expect(next.items.find((item) => item.id === 'blur-a')).toMatchObject({
      startTime: 2,
      endTime: 8,
      region: { x: 30, y: 35, width: 26, height: 20 }
    });
  });

  it('projects supported timeline items to output payload arrays and reports limited effects', () => {
    const state = seededState();
    const output = editorProjectToOutputState(state.project, { startSeconds: 0, endSeconds: 20, frameSeconds: 5 });

    expect(output.blurItems).toHaveLength(2);
    expect(output.textOverlays).toHaveLength(1);
    expect(output.textOverlays[0]?.fontFamily).toBe('Inter');
    expect(output.limitedEffects).toEqual(['zoom']);
    expect(output.zoom).toMatchObject({ scale: 1.8, startSeconds: 4, endSeconds: 7 });
  });
});
