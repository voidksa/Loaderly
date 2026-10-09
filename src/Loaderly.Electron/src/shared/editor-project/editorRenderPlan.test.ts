import { describe, expect, it } from 'vitest';

import { applyEditorCommand, createEditorState, type EditorProject, type TimelineItem } from './editorProject';
import { buildEditorRenderPlan } from './editorRenderPlan';

function projectWith(items: readonly TimelineItem[]): EditorProject {
  let state = createEditorState({
    durationSeconds: 20,
    mediaId: 'clip-1',
    mediaName: 'clip.mp4',
    sourcePath: 'C:/media/clip.mp4'
  });

  for (const item of items) {
    state = applyEditorCommand(state, { type: 'add-item', item });
  }

  return state.project;
}

describe('editor render plan', () => {
  it('includes multiple visible blur items and excludes hidden text while preserving text z-order', () => {
    const project = projectWith([
      {
        id: 'blur-a',
        type: 'blur',
        name: 'Face blur',
        trackId: 'blur',
        startTime: 1,
        endTime: 5,
        locked: false,
        hidden: false,
        region: { x: 20, y: 20, width: 18, height: 12 },
        strength: 12
      },
      {
        id: 'blur-b',
        type: 'blur',
        name: 'Plate blur',
        trackId: 'blur',
        startTime: 3,
        endTime: 9,
        locked: false,
        hidden: false,
        region: { x: 70, y: 60, width: 22, height: 14 },
        strength: 18
      },
      textItem('top-text', 7, false),
      textItem('hidden-text', 2, true),
      textItem('bottom-text', 1, false)
    ]);

    const plan = buildEditorRenderPlan(project, { kind: 'video', startSeconds: 0, endSeconds: 10, frameSeconds: 3 });

    expect(plan.blurItems.map((item) => item.id)).toEqual(['blur-a', 'blur-b']);
    expect(plan.textOverlays.map((item) => item.id)).toEqual(['bottom-text', 'top-text']);
    expect(plan.unsupportedEffects).toEqual([]);
  });

  it('supports non-overlapping zoom items and reports overlapping zoom items as unsupported', () => {
    const sequential = projectWith([
      zoomItem('zoom-a', 1, 4),
      zoomItem('zoom-b', 5, 8)
    ]);
    const overlapping = projectWith([
      zoomItem('zoom-a', 1, 6),
      zoomItem('zoom-b', 4, 8)
    ]);

    expect(buildEditorRenderPlan(sequential, { kind: 'video', startSeconds: 0, endSeconds: 10, frameSeconds: 2 }).unsupportedEffects).toEqual([]);
    expect(buildEditorRenderPlan(sequential, { kind: 'video', startSeconds: 0, endSeconds: 10, frameSeconds: 2 }).zoomItems.map((item) => item.id)).toEqual([
      'zoom-a',
      'zoom-b'
    ]);
    expect(buildEditorRenderPlan(overlapping, { kind: 'video', startSeconds: 0, endSeconds: 10, frameSeconds: 2 }).unsupportedEffects).toEqual([
      'overlapping zoom effects'
    ]);
  });

  it('includes speed items in the selected range because retimed export is supported', () => {
    const project = projectWith([
      {
        id: 'speed-a',
        type: 'speed',
        name: 'Fast middle',
        trackId: 'speed',
        startTime: 2,
        endTime: 6,
        locked: false,
        hidden: false,
        rate: 2
      }
    ]);

    const plan = buildEditorRenderPlan(project, { kind: 'video', startSeconds: 0, endSeconds: 10, frameSeconds: 2 });

    expect(plan.speedItems.map((item) => item.id)).toEqual(['speed-a']);
    expect(plan.unsupportedEffects).toEqual([]);
  });

  it('for frame output includes only effects active at the selected frame', () => {
    const project = projectWith([
      zoomItem('zoom-a', 1, 3),
      zoomItem('zoom-b', 5, 8),
      textItem('visible-frame-text', 1, false, 5, 8)
    ]);

    const plan = buildEditorRenderPlan(project, { kind: 'image', startSeconds: 0, endSeconds: 10, frameSeconds: 6 });

    expect(plan.zoomItems.map((item) => item.id)).toEqual(['zoom-b']);
    expect(plan.textOverlays.map((item) => item.id)).toEqual(['visible-frame-text']);
  });

  it('accepts separate speed intervals and blocks overlapping rates for video and audio', () => {
    const speed = (id:string,startTime:number,endTime:number):TimelineItem => ({id,type:'speed',name:id,trackId:'speed',startTime,endTime,locked:false,hidden:false,rate:2});
    for(const kind of ['video','audio'] as const){
      const input={kind,startSeconds:0,endSeconds:10,frameSeconds:0};
      expect(buildEditorRenderPlan(projectWith([speed('b',4,6),speed('a',0,2)]),input).unsupportedEffects).toEqual([]);
      expect(buildEditorRenderPlan(projectWith([speed('b',1,6),speed('a',0,2)]),input).unsupportedEffects).toContain('overlapping speed effects');
    }
  });

  it('keeps edited subtitle cues in the render plan', () => {
    const project = projectWith([
      {
        id: 'subtitle-main',
        type: 'subtitle',
        name: 'captions.srt',
        trackId: 'subtitles',
        startTime: 0,
        endTime: 10,
        locked: false,
        hidden: false,
        subtitlePath: 'C:/media/captions.srt',
        label: 'captions.srt',
        cues: [{ startSeconds: 2, endSeconds: 4, text: 'Edited cue' }]
      }
    ]);

    const plan = buildEditorRenderPlan(project, { kind: 'video', startSeconds: 0, endSeconds: 10, frameSeconds: 3 });

    expect(plan.subtitle?.cues?.[0]?.text).toBe('Edited cue');
  });
});

function textItem(id: string, zIndex: number, hidden: boolean, startTime = 0, endTime = 10): TimelineItem {
  return {
    id,
    type: 'text',
    name: id,
    trackId: 'text',
    startTime,
    endTime,
    locked: false,
    hidden,
    region: { x: 50, y: 70, width: 40, height: 12 },
    text: id,
    fontFamily: 'Inter',
    fontSize: 34,
    fontWeight: 700,
    color: '#ffffff',
    align: 'center',
    zIndex
  };
}

function zoomItem(id: string, startTime: number, endTime: number): TimelineItem {
  return {
    id,
    type: 'zoom',
    name: id,
    trackId: 'zoom',
    startTime,
    endTime,
    locked: false,
    hidden: false,
    region: { x: 50, y: 50, width: 48, height: 48 },
    scale: 2,
    easeIn: 0.25,
    easeOut: 0.25,
    easing: 'ease-in-out'
  };
}
