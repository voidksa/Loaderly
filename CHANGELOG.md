# Changelog

Features, improvements and fixes in each Loaderly release.

## 2.0 - 2026-10-10

Loaderly 2.0 introduces a **new visual identity and a completely redesigned app interface** for downloading, editing and personalizing video and audio in one Windows workspace.

### New

- A new visual identity, with a new app icon and a complete interface redesign across the Library, Downloads, video and audio editors, menus and preferences.
- English and Arabic interfaces, including right-to-left layouts, with light and dark appearances.
- A download queue for single links, batches and supported playlists, with quality choices, progress and retry actions.
- Local video and audio imports, library search and filters, and easier file actions.
- Video editing with cut-out sections, blur and tracking, zoom, text overlays, and canvas presets for different aspect ratios.
- Speed changes from 0.25× to 8×, with a slider, exact numeric input and quick presets. Keep the pitch, let it follow the speed, or choose Warm, Bright and Radio sound.
- Extract audio from a video and continue editing it. Adjust volume, fades, bass and treble, mute or mix to mono, then export MP3.
- Repeat playback for previewing audio without restarting it manually.
- A customizable audio visualizer with mirrored bars, bars, waves, rings and dots. Adjust colors, background, size, position, detail, glow and movement.
- Draw entirely new visualizer shapes in the website designer. Start with Diamond, Heart, Orbit or Ribbon, move and add points, preview with your own audio, then copy the code or download a look that opens directly in Loaderly.
- Community looks for sharing app themes and audio visualizers with a screenshot and an importable code.
- Optional visualizer titles and labels, a clean view for screen recording, and independent look sharing through a code or file. MP3 export remains audio-only.
- Subtitle editing and AI translation using your own supported provider account, with provider and model choices.
- Six appearance presets with separate light and dark colors, spacing and corner controls, and a color editor with HEX and RGB input, paste and copy.
- Share app themes through a code or file, import a look, and reset custom colors when needed.
- A dedicated Tools page with install and update actions, version information and clearer failure messages.
- Bilingual documentation with real app screenshots, search, keyboard shortcut cards and a theme builder.

### Improved and fixed

- Select stays active when inspecting an existing timeline item. Adding another effect is a separate, explicit action.
- Improved keyboard playback, seeking, undo, redo, effect copy and paste, and duplication across the audio and video editors.
- Restored a stable playback control row with the seek bar, repeat control and fullscreen button.
- Improved expanded previews, right-to-left layouts, timeline dragging and resizing.
- Clearer output choices, saved editing sessions and feedback during preview and export.
- Better spacing in preferences and dropdown menus, with color controls that stay within the window.
- A more compact tray menu with a fully visible Exit action.
- Removed the extra rectangular focus border inside the download URL field.
- Updated the Windows installer while preserving existing user media and settings during updates.

Explore the [English documentation](https://loaderly-docs.voidksa.workers.dev/docs/) or [Arabic documentation](https://loaderly-docs.voidksa.workers.dev/ar/docs/).

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
