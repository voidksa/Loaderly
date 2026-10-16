# Install Loaderly 2.3.1

Download Loaderly for your computer from [the official website](https://loaderly.app).

## Windows

Install Loaderly from [Microsoft Store](https://apps.microsoft.com/detail/9N1R1H10HXR7). Microsoft Store delivers Windows updates. Finish any active downloads or exports before updating.

## macOS

1. In **Apple menu → About This Mac**, check whether your Mac has an Apple chip or an Intel processor.
2. Download **mac-arm64.zip** for Apple Silicon or **mac-x64.zip** for Intel. macOS 12 or newer is required.
3. Quit an older Loaderly with <kbd>⌘</kbd> + <kbd>Q</kbd>, open the ZIP and move **Loaderly.app** into **Applications**.
4. Open Loaderly from Applications. If macOS blocks it, open **System Settings → Privacy & Security → Open Anyway** for Loaderly. Keep your system security enabled.

## Linux

Use a 64-bit Intel or AMD computer with Ubuntu 22.04 or newer, Debian 12 or newer, or a compatible distribution with glibc 2.35 or newer. This release is not for ARM or musl-based distributions.

Use the **amd64.deb** on Ubuntu or Debian and open it with your software installer. Alternatively, download **Loaderly-2.3.1-x86_64.AppImage**, allow it to run as a program in its file properties, and open it. Run Loaderly as your normal user.

The refreshed AppImage includes a modern runtime, so a separate **libfuse2** installation is not needed. If your system does not allow FUSE mounting, run `./Loaderly-2.3.1-x86_64.AppImage --appimage-extract-and-run` instead. This needs temporary disk space.

You can download a newer AppImage normally or use AppImageUpdate. Update information points only to the official **voidksa/Loaderly** GitHub releases. The accompanying **.zsync** file helps compatible update tools download changed parts. It is not an application to open.

## Your first clip

Choose **Library → Import** to open a local video or audio file. Select it, choose **Open editor** and make an adjustment. When you export, save an edited copy beside the original, choose another location or replace the original when the format matches. Replacement happens only after the export finishes successfully.

Open **Community library** to find themes, visualizers and sound presets. **Create & share** lets you publish a design directly from Loaderly. Themes work across Windows, macOS and Linux. Desktop glass adapts to system support.

## Editing workspace

Open a file in the editor and choose **Editing workspace**. Add named ranges to export several clips from one source. Each clip can use its own output preset. Analyze the waveform, add markers, adjust colors, add image or text layers, and render a short preview before exporting. The task list shows queued work and lets you cancel or retry a task.

**Save project** keeps editing settings. Enable **Include a copy of media** when moving the project to another computer, and keep the collected media folder beside the project file. A project is not a finished video. Export creates the finished media. Named versions let you keep and restore different edits.

## Local speech and audio separation

In **Editing workspace > Audio**, open **Speech to subtitles**. Loaderly checks short audio samples and suggests settings and a results folder. Choose **Transcribe audio**, or **Set up & transcribe** to download the required model and begin. Expand **Manual settings** to choose quality, language or audio type yourself. To separate vocals and music, choose **Separate vocals and music** and prepare its model once. Model downloads require an internet connection and disk space. Processing runs on your computer without a subscription or uploading your recording. Larger speech models take more space and processing time.

Review recognized words and timing before using the transcript. Separation produces a vocal track and an instrumental track. Results vary with the recording and can contain unwanted sounds. The original recording is kept. Results appear in the task list.

In **Downloads**, the **Sound** menu sits beside format and save location. Choose **Original audio** for the complete sound, **Vocals only** to reduce music, or **Instrumental** to reduce singing and speech. These choices work with video and audio downloads. Separation runs on your device after the transfer and saves a separate copy. The remaining download time does not include this processing. Quick downloads has its own shared sound choice for the floating button, automatic capture and download shortcuts.

To save a video's current sound without separating it, open the editor and choose **Extract audio**. Loaderly saves an audio copy and keeps the video.

## Organize your work

Use library collections to group files without making copies. **Files and storage** can find identical files, locate moved media and clear unused previews. Review duplicate selections before removing anything.

Use **Pause** or **Cancel** directly on an active download row. **Transfer complete** means the network transfer has ended; the audio file may still be prepared or video and audio combined. **Completed** means the result is ready.

In **Downloads → Queue settings**, set concurrency and a total rate limit, reorder waiting items, or schedule a start time. Scheduled downloads require Loaderly to remain open. Use Ctrl+K on Windows/Linux or Command+K on macOS to find commands and customize shortcuts. Shortcut key positions work across keyboard layouts.

[English illustrated guide](https://loaderly.app/docs/) · [الدليل المصوّر بالعربية](https://loaderly.app/ar/docs/)
