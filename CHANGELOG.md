# Changelog

All notable Loaderly release changes are tracked here so the README can stay focused on setup and usage.

## 1.1.0 - 2026-05-23

Loaderly 1.1.0 focuses on local video editing, clearer download progress, stronger trim controls, and a smoother Windows update flow.

### Added

- Add local videos from your PC with a dedicated button or by dropping a video file onto Loaderly.
- Trim supports internal cut-out sections, not only trimming from the beginning or end.
- Cut sections can be selected from the timeline or right-clicked for quick actions.
- Blur regions can hide a selected part of the video for a chosen time range.
- Blur supports box blur, soft blur, and pixelate preview effects.
- Blur tracking can follow a selected face, body, or object across the video.
- Zoom regions can focus on a selected part of the video for a chosen time range.
- Zoom supports selectable strength plus Follow or Fix behavior for moving subjects.
- Snapshot saves a still image from the current preview frame.
- Export prompts for a clip file name before saving.
- Export results show quick actions to open the file, open its folder, or copy its path.
- The library marks videos that already have saved trim, blur, or zoom work.

### Improved

- Larger multi-line URL box for pasting several links, one link per line.
- Download cards show clearer progress, including percent, size, speed, and ETA when available.
- Better saved video titles, including Arabic and other non-English titles.
- Cleaner media library cards with better title wrapping and less clipped text.
- Cuts now use direct hard cuts for faster preview and simpler editing.
- Clicking the trim timeline moves the white playhead there, while dragging inside the selection still moves the selected range.
- New cuts, blur regions, and zoom regions are added at the white playhead and avoid nearby timeline items when possible.
- `Ctrl+mouse wheel` zooms the trim timeline.
- `Shift+mouse wheel`, `Shift+drag`, or middle-drag pans across the zoomed timeline.
- Smoother timeline dragging and keyboard seeking in trim and subtitle editing.
- Subtitle editing shows timeline thumbnails and better manual cue timing.
- Manual subtitles can be created from the current playhead, then adjusted with Set start, Set end, and Play cue.
- Settings include direct OpenRouter links for getting an API key and browsing models.
- Settings and Tools windows are more compact and no longer need fullscreen.

### Installer and updates

- Loaderly warns before closing while downloads or exports are still running.
- Trim work is saved locally, so reopening the same video restores cuts and selection.
- The custom installer now shows install progress and file-copy activity.
- In-app update checks can download the latest GitHub Release installer and run the update flow directly.

### Useful shortcuts

- Main URL box: `Ctrl+Enter` adds pasted links to the queue. `Enter` and `Shift+Enter` add new lines.
- Trim: `Space` play/pause, arrow keys step 0.25 seconds, `Shift+Arrow` steps 1 second, `Ctrl+Arrow` sets start or end, `Ctrl+Shift+Arrow` steps frame by frame.
- Trim: `Ctrl+Z` undoes, `Ctrl+Shift+Z` or `Ctrl+Y` redoes, `Delete` removes the selected cut, blur, or zoom, `M` toggles mute, `Ctrl+S` saves, `Ctrl+R` resets, `Esc` closes.
- Trim blur: use Add to create a blur region, drag the green blur marker on the timeline, resize the box from the preview, Done to fix it, Edit to adjust it again, and Track to follow a face or object.
- Trim zoom: use Add to create a zoom region, drag the zoom marker on its own timeline lane, choose the zoom strength, Done to fix it, Edit to adjust it again, and Follow or Fix for moving subjects.
- Subtitle editor: `Ctrl+Enter` adds the next cue, `[` sets cue start, `]` sets cue end, `Delete` removes the selected cue.
- Subtitle editor: `Space` play/pause, arrows step, `Shift+Arrow` steps 5 seconds, `Ctrl+Shift+Arrow` steps frame by frame, `Ctrl+S` saves.

Older release assets remain available from [GitHub Releases](https://github.com/voidksa/Loaderly/releases).
