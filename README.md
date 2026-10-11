<div align="center">
  <img src="assets/loaderly-256.png" alt="Loaderly app icon" width="96" height="96">
  <h1>Loaderly 2.2.0</h1>
  <p>Download, edit and make it yours. For Windows, macOS and Linux.</p>
  <p><a href="https://loaderly.app/#desktop-downloads"><strong>Download for Mac or Linux</strong></a> · <a href="https://loaderly.app/">Website & documentation</a> · <a href="README.ar.md">العربية</a></p>
  <p><a href="https://apps.microsoft.com/detail/9n1r1h10hxr7?referrer=appbadge&amp;mode=full">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://get.microsoft.com/images/en-us%20dark.svg">
      <source media="(prefers-color-scheme: light)" srcset="https://get.microsoft.com/images/en-us%20light.svg">
      <img src="https://get.microsoft.com/images/en-us%20dark.svg" width="200" alt="Download Loaderly from Microsoft Store">
    </picture>
  </a></p>
</div>

![The Loaderly editor](docs/images/loaderly-editor-en.png)

Bring in a link or a local file, refine your clip and export it from one workspace. Loaderly combines downloads, a media library, video and audio editing, subtitles and a community of shared designs. The interface and illustrated guides are available in English and Arabic.

## Download

| Your computer | Download |
| --- | --- |
| Windows 10 / 11, 64-bit | [Get it from Microsoft Store](https://apps.microsoft.com/detail/9N1R1H10HXR7) |
| Mac with Apple Silicon | [Apple Silicon ZIP](https://loaderly.app/download?platform=macArm) |
| Mac with Intel | [Intel ZIP](https://loaderly.app/download?platform=macIntel) |
| Ubuntu / Debian, 64-bit | [DEB package](https://loaderly.app/download?platform=linuxDeb) |
| Other compatible Linux desktops, 64-bit | [AppImage](https://loaderly.app/download?platform=linuxImage) |

Windows downloads and future Windows updates are available only through Microsoft Store. If you use an older standalone Windows copy, install the Store edition and check your library and settings before removing the old copy.

Follow the [installation guide](https://loaderly.app/docs/installation/) for your system. Updating keeps your library and preferences. Finish active downloads and exports before installing.

## New in 2.2.0

- **More control over saving:** keep an edited copy, choose a location or safely replace an original when the format matches. Reuse an existing audio extraction or choose to keep both.
- **Named download locations:** set separate defaults for audio and video, keep each queued download's chosen location and follow real transfer progress.
- **Your own design library:** name, search and reuse themes, visualizers and sound presets saved on this device.
- **More room to create:** shape visualizers across the drawing canvas and browse community designs with clearer previews, ratings and actions.
- **A clearer workspace:** a 120% default text size, better organized Preferences, improved Arabic layouts and notices at the top center.
- **Refined desktop appearance:** improved glass, themed quick actions and platform window controls. Desktop glass follows system support and accessibility settings.

Native Liquid Glass is available on macOS 26 or later, with vibrancy on older supported Macs. [Customize your appearance](https://loaderly.app/docs/appearance/).

[Read all changes in 2.2.0](docs/2.2.0-RELEASE-NOTES.md).

## Share from Loaderly

1. Open **Community library → Create & share**.
2. Choose **New theme**, **New visualizer** or **New sound preset**. It starts from your current settings. Already have a settings file or code? Use **Import design**.
3. Give it a name and try your changes. For sound, choose **Try your audio** and compare **Original sound** with **Edited sound**.
4. Sign in and choose **Publish in Loaderly**. **View my post** takes you to its public entry.
5. Later edits stay private until you choose **Publish update**.

![Create and try a sound preset](docs/images/loaderly-sound-preview-en.png)

Sign in with **GitHub** inside Loaderly to publish. Your designs appear in both the app and the [community website](https://loaderly.app/community/). The [illustrated guide](https://loaderly.app/docs/community/) explains drafts, publishing and updates.

## Start with one clip

Choose **Library → Import**, select a video or audio file and choose **Open editor**. Use the preview to see and hear your changes. Export an edited copy beside the original, choose another location or replace the original when the format matches. Replacement happens only after the export finishes successfully.

![Choose your colors](docs/images/loaderly-theme-colors-en.png)

[Your first edit](https://loaderly.app/docs/getting-started/) · [Sound presets](https://loaderly.app/docs/sound-presets/) · [Design a visualizer](https://loaderly.app/docs/audio-visualizer/) · [Customize your theme](https://loaderly.app/docs/appearance/)

## Support and license

For help, email [support@loaderly.app](mailto:support@loaderly.app). For general inquiries, use [hello@loaderly.app](mailto:hello@loaderly.app).

[Support Loaderly](https://creators.sa/en/voidksa) if you would like to help improve the app and future updates. Support is optional.

Loaderly is source-available under the [PolyForm Noncommercial License 1.0.0](LICENSE.md). You may inspect the source and use it for permitted noncommercial purposes. Commercial use, resale or commercial rebranding requires separate permission. See [NOTICE](NOTICE) for included software credits.

<details><summary>Build the desktop app from source</summary>

Use a current Node.js LTS installation. In `src/Loaderly.Electron`, run `npm ci`, then `npm run build` or `npm run dev`. The offline designer is included in the source. Official desktop downloads include the media tools required for downloading and exporting.

</details>
