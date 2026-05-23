<div align="center">
  <img src="assets/loaderly-256.png" alt="Loaderly app icon" width="112" height="112">

  <h1>Loaderly</h1>

  <p>
    <strong>A Windows desktop app for downloading, organizing, trimming, subtitling, and exporting online media.</strong>
  </p>

  <p>
    <a href="README.ar.md">العربية</a>
  </p>

  <p>
    <a href="https://github.com/voidksa/Loaderly/releases/latest"><img alt="Download Loaderly" src="https://img.shields.io/badge/download-latest%20release-4f8cff?style=for-the-badge"></a>
    <img alt="Windows" src="https://img.shields.io/badge/platform-Windows-2ec5ff?style=for-the-badge">
    <img alt="Source available" src="https://img.shields.io/badge/source-available-7c5cff?style=for-the-badge">
    <img alt="License" src="https://img.shields.io/badge/license-PolyForm%20NC-202637?style=for-the-badge">
  </p>
</div>

<p align="center">
  <a href="https://github.com/voidksa/Loaderly/releases/latest"><strong>Download Loaderly for Windows</strong></a>
</p>

<p align="center">
  <img src="docs/images/loaderly-downloads-en.png" alt="Loaderly downloads workspace" width="92%">
</p>

<p align="center">
  <img src="docs/images/loaderly-settings-en.png" alt="Loaderly settings screen" width="76%">
</p>

## What Loaderly Does

Loaderly gives you one desktop workspace for media links. Paste a URL, download the file, keep it in a local library, trim the part you need, work with subtitles, and export the result without jumping between separate tools.

## Highlights

- Download from YouTube, TikTok, Instagram, X/Twitter, Facebook, Vimeo, Reddit, SoundCloud, and other supported sites.
- Add single links, multi-line batches, and playlists to the queue.
- Keep a local media library with thumbnails, source links, file actions, title preservation, and watch/trim access.
- Add videos from your PC into the library, then edit them with the same trim, subtitle, snapshot, blur, and zoom tools.
- Track downloads with percentage, downloaded/total size, speed, and ETA when the provider reports them.
- Trim clips with internal cut ranges, saved edit state, right-click cut actions, hard cuts, blur regions for hiding part of the video, and zoom regions for focusing on a selected area.
- Load, edit, translate, style, hide, restore, and burn subtitles with timeline thumbnails in the subtitle editor.
- Update from GitHub Releases directly inside the app; Loaderly downloads the installer, closes the running app, installs the update, and reopens when complete.
- Use the app in English or Arabic with light, dark, or system theme modes.

## Version 1.1.0

Loaderly 1.1.0 is a feature release focused on making everyday editing clearer and faster.

What's new:

- Larger multi-line URL box for pasting several links, one link per line.
- Add local videos from your PC with a dedicated button or by dropping a video file onto Loaderly.
- Download cards now show clearer progress, including percent, size, speed, and ETA when available.
- Better saved video titles, including Arabic and other non-English titles.
- Cleaner media library cards with better title wrapping and less clipped text.
- Trim supports internal cut-out sections, not only trimming from the beginning or end.
- Cut sections can be selected from the timeline or right-clicked for quick actions.
- Cuts now use direct hard cuts for faster preview and simpler editing.
- Clicking anywhere on the trim timeline moves the white playhead there, while dragging inside the selection still moves the selected range.
- New cuts, blur regions, and zoom regions are added at the white playhead and avoid nearby existing timeline items when possible.
- Use `Ctrl+mouse wheel` to zoom the trim timeline, then `Shift+mouse wheel`, `Shift+drag`, or middle-drag to pan across the zoomed timeline.
- Blur part of the video for a chosen time range, see blur regions directly on the larger timeline, drag their timeline markers to change timing, move and resize the blur box from the preview, press Done to fix it, and press Edit later to adjust it or add movement points.
- Box blur, soft blur, and pixelate now show a real effect in the preview instead of only a tinted guide box.
- Track can follow the selected blur box across the video to help keep a face, body, or object hidden.
- Zoom into a selected part of the video for a chosen time range, choose the zoom strength, preview the result immediately, and use Follow or Fix when the area should move with the subject.
- Save a still image from the current preview frame with Snapshot.
- Choose a clip file name before saving an export.
- After saving, copying, or taking a snapshot, Loaderly shows quick actions to open the file, open its folder, or copy its path.
- The library marks videos that already have saved trim, blur, or zoom work.
- Loaderly warns before closing while downloads or exports are still running.
- Trim work is saved locally, so reopening the same video restores your cuts and selection.
- Smoother timeline dragging and keyboard seeking in trim and subtitle editing.
- Subtitle editing now shows timeline thumbnails and better manual cue timing.
- Manual subtitles can be created from the current playhead, then adjusted with Set start, Set end, and Play cue.
- Settings include direct OpenRouter links for getting an API key and browsing models.
- Settings and Tools windows are more compact and no longer need fullscreen.
- The custom installer now shows install progress and file-copy activity.
- In-app update checks can download the latest GitHub Release installer and run the update flow directly.

Useful shortcuts:

- Main URL box: `Ctrl+Enter` adds pasted links to the queue. `Enter` and `Shift+Enter` add new lines.
- Trim: `Space` play/pause, arrow keys step 0.25 seconds, `Shift+Arrow` steps 1 second, `Ctrl+Arrow` sets start or end, `Ctrl+Shift+Arrow` steps frame by frame.
- Trim: `Ctrl+Z` undoes, `Ctrl+Shift+Z` or `Ctrl+Y` redoes, `Delete` removes the selected cut, `M` toggles mute, `Ctrl+S` saves, `Ctrl+R` resets, `Esc` closes.
- Trim blur: use `Add` to create a blur region, drag the green blur marker on the timeline to change when it appears, resize the box from the corners or mouse wheel, `Done` to fix it, `Edit` to adjust it again, `Delete` to remove the selected blur, and `Track` to try tracking the selected face or object.
- Trim zoom: use `Add` to create a zoom region, drag the zoom marker on its own timeline lane, choose the zoom strength, `Done` to fix it, `Edit` to adjust it again, `Delete` to remove it, and `Follow` or `Fix` for moving subjects.
- Subtitle editor: `Ctrl+Enter` adds the next cue, `[` sets cue start, `]` sets cue end, `Delete` removes the selected cue.
- Subtitle editor: `Space` play/pause, arrows step, `Shift+Arrow` steps 5 seconds, `Ctrl+Shift+Arrow` steps frame by frame, `Ctrl+S` saves.

## Download

Download the Windows installer from the latest release:

<p align="center">
  <a href="https://github.com/voidksa/Loaderly/releases/latest">
    <img alt="Download latest Loaderly release" src="https://img.shields.io/badge/Download-Loaderly%20Setup-4f8cff?style=for-the-badge">
  </a>
</p>

Run the installer and open Loaderly from the Start menu. Windows 10 or newer is recommended.

## Early Access

Public releases are published on GitHub. If you want access to exclusive early builds before the public release, you can join the Loaderly membership on [Buy Me a Coffee](https://buymeacoffee.com/voidksa).

## Media Player Requirement

Watch / Trim uses Windows media components for video preview. If Watch / Trim shows `Windows Media Player version 10 or later is required.`, the Windows Media Player optional feature is missing even if the newer Media Player app is installed.

Open PowerShell or Command Prompt as administrator, run this command, then restart Windows:

```powershell
DISM /Online /Add-Capability /CapabilityName:Media.WindowsMediaPlayer~~~~0.0.12.0
```

You can also install or update Media Player from Microsoft Store, but the DISM command above is the fix for the missing Windows capability:

<p align="center">
  <a href="https://apps.microsoft.com/detail/9WZDNCRFJ3PT">
    <img src="docs/images/windows-media-player.svg" alt="Media Player icon" width="72" height="72"><br>
    <strong>Install Media Player from Microsoft Store</strong>
  </a>
</p>

On Windows N editions, install the Microsoft Media Feature Pack too if Media Player does not appear or playback still fails after the command.

## Privacy

Loaderly keeps its app settings, download history, thumbnails, subtitle preferences, and local library data on your device. Features that download media, check for updates, or translate subtitles may contact the relevant online services only when you use them.

Do not publish personal API keys, credentials, signing certificates, or private configuration files.

## Source Availability

This repository is provided so users can inspect the project and use it for permitted noncommercial purposes. The recommended way to use Loaderly is the official Windows installer from the release page.

Commercial use, resale, paid hosting, rebranding, or publishing Loaderly as another product requires written permission from the copyright holder.

## License

Loaderly is source-available under the [PolyForm Noncommercial License 1.0.0](LICENSE.md).
