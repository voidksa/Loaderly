# Loaderly 2.0 desktop preview

These are test builds for macOS and Linux. Windows 2.0 remains the stable release. The preview includes the same editor, themes, visualizers and English/Arabic interface, with native download and media tools included.

## macOS

1. Open the Apple menu in the top-left corner and choose **About This Mac**.
2. If **Chip** says Apple M1, M2, M3, M4 or another Apple chip, use **mac-arm64.dmg**. If **Processor** says Intel, use **mac-x64.dmg**. macOS 12 or newer is required.
3. Open the DMG and drag **Loaderly** into **Applications**. Wait for copying to finish.
4. Open **Finder → Applications → Loaderly**. Do not run it from inside the disk image.
5. This free preview has no paid Apple Developer ID or notarization. If macOS blocks the first launch, open **System Settings → Privacy & Security → Open Anyway**, then confirm **Open**. On macOS 12, use **System Preferences → Security & Privacy → General**.
6. If you see a different warning, such as a damaged-app warning, stop and share its exact text. Do not disable your Mac's security settings.

Apple's first-open guide: https://support.apple.com/en-us/102445

The ZIP is an alternative: unzip it in Finder and move Loaderly.app to Applications. Use Command+C / Command+V for copy and paste, and Command+Q to quit. The window close button hides the app; click its Dock icon to reopen it.

## Linux

This preview targets 64-bit Intel/AMD desktop Linux. Ubuntu 22.04/24.04 and Debian 12 are the initial target systems. ARM Linux packages are not included in this preview.

**Ubuntu/Debian:** download the `.deb`, open Terminal in its download folder, then run:

```sh
sudo apt install ./Loaderly-2.0.0-preview.1-linux-x64.deb
```

Open Loaderly from the applications menu. The package manager may ask for the computer's password to install required desktop libraries.

**Other desktop distributions:** download the `.AppImage`, open its Properties and allow it to run as a program, then open it. If your distribution reports that FUSE is missing, use its package manager to install the FUSE 2 compatibility package. If it reports a Chromium sandbox problem, use the DEB on Ubuntu/Debian and report the message. Do not use `--no-sandbox` or run Loaderly as root.

File copying to the clipboard is unavailable in this Linux preview; use **Save to device** for video, GIF and MP3. Copying an image or text still works. Closing the window exits the app, so a missing system tray cannot leave it hidden.

## First test

- Open the app and switch between English and Arabic in Preferences.
- Open Tools and check that yt-dlp, FFmpeg, FFprobe and Deno are available.
- Import a short local video, play it with sound, trim a section and save a new video.
- Add English and Arabic text, then check the saved video.
- Extract audio, open Visualizer and import a look from the community.
- Download a video you have permission to download; check the saved file in Library.
- Quit and reopen the app; check that your preferences and library remain.

Some Windows font choices use matching system font fallbacks on macOS/Linux. When reporting a problem, include the OS version, Apple/Intel chip or Linux distribution, action taken and exact error. Do not share private media or account credentials.

No Apple account or paid membership is needed to install this preview. Native automated checks do not replace testing on a personal Mac or on different Linux desktops.
