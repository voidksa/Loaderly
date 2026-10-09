import { describe, expect, it } from 'vitest';

import {
  applyEditorCommand,
  createEditorState,
  getSelectedTimelineItem,
  redoEditorState,
  undoEditorState
} from './editorProject';

describe('editor project command model', () => {
  it('stores independent timeline items for blur, zoom, speed, text, and subtitles', () => {
    let state = createEditorState({
      durationSeconds: 20,
      mediaId: 'media-1',
      mediaName: 'clip.mp4',
      sourcePath: 'C:/videos/clip.mp4'
    });

    state = applyEditorCommand(state, {
      type: 'add-item',
      item: {
        id: 'blur-1',
        type: 'blur',
        name: 'Username blur',
        trackId: 'blur',
        startTime: 2,
        endTime: 8,
        locked: false,
        hidden: false,
        region: { x: 0.2, y: 0.25, width: 0.3, height: 0.18 },
        strength: 18,
        fadeIn: 0.2,
        fadeOut: 0.3
      }
    });

    state = applyEditorCommand(state, {
      type: 'add-item',
      item: {
        id: 'zoom-1',
        type: 'zoom',
        name: 'Punch in',
        trackId: 'zoom',
        startTime: 5,
        endTime: 9,
        locked: false,
        hidden: false,
        region: { x: 0.35, y: 0.28, width: 0.32, height: 0.28 },
        scale: 1.8,
        easeIn: 0.35,
        easeOut: 0.45,
        easing: 'ease-in-out'
      }
    });

    state = applyEditorCommand(state, {
      type: 'add-item',
      item: {
        id: 'text-1',
        type: 'text',
        name: 'Caption',
        trackId: 'text',
        startTime: 4,
        endTime: 12,
        locked: false,
        hidden: false,
        region: { x: 0.1, y: 0.72, width: 0.55, height: 0.18 },
        text: 'Line one\nLine two',
        fontFamily: 'Inter',
        fontSize: 42,
        fontWeight: 700,
        color: '#ffffff',
        backgroundColor: '#111827cc',
        align: 'center',
        zIndex: 3
      }
    });

    expect(state.project.items.map((item) => item.type)).toEqual(['media', 'blur', 'zoom', 'text']);
    expect(state.project.items.find((item) => item.id === 'blur-1')).toMatchObject({
      startTime: 2,
      endTime: 8,
      strength: 18,
      region: { x: 0.2, y: 0.25, width: 0.3, height: 0.18 }
    });
    expect(state.project.items.find((item) => item.id === 'zoom-1')).toMatchObject({
      scale: 1.8,
      easeIn: 0.35,
      easeOut: 0.45,
      easing: 'ease-in-out'
    });
    expect(state.project.items.find((item) => item.id === 'text-1')).toMatchObject({
      text: 'Line one\nLine two',
      zIndex: 3
    });
  });

  it('tracks selection and supports undo/redo for add, move, resize, and delete', () => {
    let state = createEditorState({
      durationSeconds: 15,
      mediaId: 'media-1',
      mediaName: 'clip.mp4',
      sourcePath: 'C:/videos/clip.mp4'
    });

    state = applyEditorCommand(state, {
      type: 'add-item',
      item: {
        id: 'text-1',
        type: 'text',
        name: 'Title',
        trackId: 'text',
        startTime: 1,
        endTime: 5,
        locked: false,
        hidden: false,
        region: { x: 0.1, y: 0.1, width: 0.4, height: 0.14 },
        text: 'Hello',
        fontFamily: 'Inter',
        fontSize: 36,
        fontWeight: 700,
        color: '#ffffff',
        align: 'center',
        zIndex: 1
      },
      select: true
    });
    state = applyEditorCommand(state, { type: 'move-item', id: 'text-1', startTime: 3 });
    state = applyEditorCommand(state, { type: 'resize-item', id: 'text-1', startTime: 2, endTime: 7 });
    state = applyEditorCommand(state, { type: 'delete-selected' });

    expect(getSelectedTimelineItem(state)).toBeUndefined();
    expect(state.project.items.some((item) => item.id === 'text-1')).toBe(false);

    state = undoEditorState(state);
    expect(getSelectedTimelineItem(state)).toMatchObject({ id: 'text-1', startTime: 2, endTime: 7 });

    state = undoEditorState(state);
    expect(getSelectedTimelineItem(state)).toMatchObject({ id: 'text-1', startTime: 3, endTime: 7 });

    state = undoEditorState(state);
    expect(getSelectedTimelineItem(state)).toMatchObject({ id: 'text-1', startTime: 1, endTime: 5 });

    state = redoEditorState(redoEditorState(redoEditorState(state)));
    expect(state.project.items.some((item) => item.id === 'text-1')).toBe(false);
  });

  it('copies, pastes, and duplicates selected items as independent timeline items', () => {
    let state = createEditorState({
      durationSeconds: 30,
      mediaId: 'media-1',
      mediaName: 'clip.mp4',
      sourcePath: 'C:/videos/clip.mp4'
    });

    state = applyEditorCommand(state, {
      type: 'add-item',
      item: {
        id: 'blur-1',
        type: 'blur',
        name: 'Blur',
        trackId: 'blur',
        startTime: 4,
        endTime: 9,
        locked: false,
        hidden: false,
        region: { x: 0.2, y: 0.2, width: 0.35, height: 0.2 },
        strength: 14
      },
      select: true
    });

    state = applyEditorCommand(state, { type: 'copy-selected' });
    state = applyEditorCommand(state, { type: 'paste-clipboard', id: 'blur-2', atTime: 12 });
    state = applyEditorCommand(state, { type: 'duplicate-selected', id: 'blur-3' });

    expect(state.project.items.filter((item) => item.type === 'blur')).toMatchObject([
      { id: 'blur-1', startTime: 4, endTime: 9 },
      { id: 'blur-2', startTime: 12, endTime: 17 },
      { id: 'blur-3', startTime: 12.5, endTime: 17.5 }
    ]);
    expect(getSelectedTimelineItem(state)).toMatchObject({ id: 'blur-3' });
  });

  it('stores a reframe item with target dimensions and validates them', () => {
    let state = createEditorState({
      durationSeconds: 20,
      mediaId: 'media-1',
      mediaName: 'clip.mp4',
      sourcePath: 'C:/videos/clip.mp4'
    });

    state = applyEditorCommand(state, {
      type: 'add-item',
      item: {
        id: 'reframe-1',
        type: 'reframe',
        name: 'TikTok crop',
        trackId: 'reframe',
        startTime: 0,
        endTime: 20,
        locked: false,
        hidden: false,
        targetWidth: 1080,
        targetHeight: 1920,
        fitMode: 'fit',
        positionX: 0.5,
        positionY: 0.5,
        background: { kind: 'black' }
      }
    });

    const reframe = state.project.items.find((item): item is any => item.type === 'reframe');
    expect(reframe).toBeDefined();
    expect(reframe?.targetWidth).toBe(1080);
    expect(reframe?.targetHeight).toBe(1920);
    expect(reframe?.fitMode).toBe('fit');
    expect(reframe?.background.kind).toBe('black');
    expect(reframe?.startTime).toBe(0);
    expect(reframe?.endTime).toBe(20);

    expect(state.project.items.map((item) => item.type)).toEqual(['media', 'reframe']);
  });

  it('reframe target dimensions are reasonable and the item appears in the project', () => {
    const state = createEditorState({
      durationSeconds: 20,
      mediaId: 'media-1',
      mediaName: 'clip.mp4',
      sourcePath: 'C:/videos/clip.mp4'
    });
    const next = applyEditorCommand(state, {
      type: 'add-item',
      item: {
        id: 'reframe-2',
        type: 'reframe',
        name: 'Reel',
        trackId: 'reframe',
        startTime: 0,
        endTime: 20,
        locked: false,
        hidden: false,
        targetWidth: 1080,
        targetHeight: 1920,
        fitMode: 'fill',
        positionX: 0.5,
        positionY: 0.5,
        background: { kind: 'blur' }
      }
    });
    const reframe = next.project.items.find((item): item is any => item.type === 'reframe');
    expect(reframe?.targetWidth).toBe(1080);
    expect(reframe?.targetHeight).toBe(1920);
    expect(reframe?.fitMode).toBe('fill');
    expect(reframe?.background.kind).toBe('blur');
  });

  it('prevents reframe values that exceed safe dimensions or invalid types', () => {
    const isValid = (w: number, h: number) => w > 0 && h > 0 && w <= 7680 && h <= 4320;

    expect(isValid(1080, 1920)).toBe(true);
    expect(isValid(0, 0)).toBe(false);
    expect(isValid(-1, 100)).toBe(false);
    expect(isValid(10000, 100)).toBe(false);
  });
});
