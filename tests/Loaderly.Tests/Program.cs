using Loaderly;
using Loaderly.Setup;
using Microsoft.Win32;

namespace Loaderly.Tests;

internal static class Program
{
    [STAThread]
    private static int Main()
    {
        UseIsolatedAppDataFolder();
        var savedInstallerLanguage = ReadInstallerLanguage();
        var savedAppSettings = ReadAppSettingsFile();
        try
        {
            WriteInstallerLanguage("en");
            WriteTestAppSettingsFile();
            ThrottledUpdatesDoNotRunForEveryProgressLine();
            ForcedUpdatesBypassThrottle();
            ProductVersionIsFirstPublicRelease();
            UpdateCheckerParsesGitHubInstallerRelease();
            ArabicLanguageMapsCoreUiLabels();
            InstallerThemeFollowsWindowsLightAndDarkModes();
            InstallerUsesUninstallOnlyWhenRequested();
            InstallerLaunchesAppOnlyAfterAcknowledgementAndClose();
            InstallerSupportsQuietModeForAutomatedUpdates();
            InstallerAcceptsCustomInstallDirectoryArgument();
            ModernSelectUsesRtlMenuPlacement();
            TrimPanelUsesScrollWhenContentIsTallerThanThePanel();
            HistoryRenderingIsCappedForLargeLibraries();
            TimelineThumbnailCountIsSmallOnWeakDevices();
            TimelineThumbnailServiceHonorsRequestedCount();
            SettingsFormAvoidsNativeComboBoxes();
            SettingsFormUsesThemedSaveFolderScroller();
            SettingsFormGivesSaveFoldersEnoughRoom();
            SettingsFormKeepsFieldsReadable();
            SettingsFormTextBoxesAreCenteredInsideModernFields();
            SettingsFormCheckBoxesDoNotToggleFromEmptyRowSpace();
            SettingsFormArabicCheckBoxesFitAndAlignRight();
            SettingsFormOffersAppLanguageSelection();
            LightThemeUsesLightSidebarPalette();
            MainFormKeepsHeaderSeparatedFromUrlInput();
            MainFormUrlInputShowsClickableTextCursor();
            MainFormUrlInputUsesExplicitPastePath();
            MainFormClearsUrlFocusOnBackgroundClick();
            MainFormLocalizesDynamicWatchTrimLabels();
            HistoryRenderingIsTunedForWeakDevices();
            QueueCardsHaveStableUpdateTargets();
            PausedQueueCardsOfferRemoveAndResume();
            DownloadPreparationRunsAwayFromUiThread();
            HistoryCardsVerticallyCenterTitleStack();
            HistoryTitlesArePresentedCleanly();
            MainFormUsesModernDarkTrayMenu();
            MainFormTrayMenuFollowsLanguageChanges();
            MainFormMaximizedStatePropagatesToTrimWindow();
            WindowsToastUsesLoaderlyLogoOverride();
            FallbackNotificationsUseTrayIcon();
            LoaderlyIconContainsNotificationSizes();
            TrayReminderDoesNotShowBackgroundNotification();
            TrimFormDefersTimelineThumbnailWork();
            TrimFormUsesModernScrollPanel();
            TrimFormStatusBarKeepsExportMessagesVisible();
            TrimFormHasSubtitleManagementControls();
            TrimFormCanRemoveAndRestoreOriginalSubtitles();
            TrimFormHasExplicitSubtitleExportModes();
            TrimFormSubtitleExportModeControlsBurnIn();
            SrtSidecarSubtitlesAreTrimmedToSelectedClip();
            TrimFormGivesTranslateActionEnoughWidth();
            TrimFormGivesArabicSubtitleActionsEnoughWidth();
            TrimFormHasAiSubtitleTranslationControl();
            TrimFormUsesProfessionalTranslateState();
            SubtitlePreferencesMapToYtDlpLanguages();
            SubtitleFailuresCanRetryWithoutSubtitles();
            LegacyAllSubtitlePreferenceMigratesToSaferDefault();
            OriginalSubtitleLanguageResolverUsesTheVideoLanguageFirst();
            OriginalSubtitleLanguageResolverFallsBackToAvailableCaptions();
            SrtSubtitlesAreParsedAndMatchedByPlaybackTime();
            SrtSubtitlesPreferConfiguredLanguageFile();
            WebVttSubtitlesAreParsedAndMatchedByPlaybackTime();
            SubtitleLookupAcceptsWebVttWhenSrtIsMissing();
            CompactOneLineSubtitlesAreParsedAndFormattedIntoCues();
            SubtitleLookupClearsAtCueEnd();
            SubtitleRangeFilteringKeepsOnlySelectedClipCues();
            SubtitleEditorUsesStructuredEditingSurface();
            SubtitleEditorLocalizesArabicSectionTitles();
            SubtitleEditorOffersStylePresets();
            SubtitleEditorAppliesStylePresets();
            SubtitleEditorSupportsMultiCueSelectionForDelete();
            SubtitleEditorUsesModernScrollAndTimelineControls();
            SubtitleEditorUsesDoubleBufferedRendering();
            SubtitleEditorOrdersCuesFromClipStartDown();
            SubtitleEditorRightAlignsArabicCueText();
            SubtitleEditorDisablesPlayUntilPreviewReady();
            SubtitleEditorPrimesVideoPreviewAfterMediaOpen();
            SubtitleEditorStartsManualMediaLoading();
            SubtitleEditorLoadsPreviewVideoWhenEnvironmentProvidesSample();
            SubtitleEditorMapsClippedPreviewPlaybackToOriginalTimeline();
            SubtitleEditorSupportsTrimPlaybackShortcuts();
            SubtitleEditorUsesFullSubtitleRangeWhenNoTrimIsSet();
            TrimFormOpensSubtitleEditorWithoutBlockingPreviewExport();
            TrimFormMaximizedStatePropagatesToSubtitleEditor();
            TrimFormReleasesPreviewBeforeSubtitleEditor();
            SubtitleBurnInAssIsTrimmedAndStyled();
            TrimExportArgumentsBurnInSubtitlesWhenEnabled();
            TrimExportSeeksBeforeInputWhenBurningSubtitles();
            SettingsFormHasOpenRouterSubtitleTranslationSettings();
            ArabicLanguageMapsAdvancedFeatureLabels();
            DownloadFailuresAreHumanReadable();
            DownloadFolderProbeTimesOutWhenStorageDoesNotRespond();
            PlaylistDownloadOutputKeepsEachItemTitle();
            MainFormHasAboutAndDiagnosticsEntryPoints();
            NewInstallStartsFirstRunSetup();
            AppLogFormatsDiagnosticsEntries();
            AppSettingsProtectsOpenRouterApiKeyAtRest();
            GlobalCrashLoggingFormatsExceptionDetails();
            WindowsBuildScriptSupportsRequiredSigning();
            RepositoryReleaseFilesExcludeBuildOutputsAndSecrets();
            ReleaseReadinessScriptScansSecretsAndTrackedBuildArtifacts();
            CoreWindowsUseDpiScalingAndFitSmallScreens();
            SubtitleEditorHasPreviewLoadRecovery();
            ToolsFormLocalizesRecoveryActions();
            ToolsFormShowsClearVersionStatusAndActions();
            ToolsFormRepairPlanSkipsCurrentTools();
            ToolsRepairScriptStopsBundledProcessesBeforeReplacingExecutables();
            ToolsInstallerScriptIsBundledWithWindowsBuild();
            AiSubtitleTranslationPreservesTimingAndRejectsCueMismatch();
            SingleInstanceGuardRejectsSecondInstance();
            Console.WriteLine("UI performance tests passed.");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex);
            return 1;
        }
        finally
        {
            RestoreInstallerLanguage(savedInstallerLanguage);
            RestoreAppSettingsFile(savedAppSettings);
        }
    }

    private static void UseIsolatedAppDataFolder()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "TestAppData");
        Directory.CreateDirectory(path);
        Environment.SetEnvironmentVariable("LOADERLY_APPDATA_PATH", path);
    }

    private static (bool Exists, string? Value) ReadAppSettingsFile()
    {
        var path = Path.Combine(AppDataFolder.Path, "settings.json");
        return File.Exists(path) ? (true, File.ReadAllText(path)) : (false, null);
    }

    private static void WriteTestAppSettingsFile()
    {
        Directory.CreateDirectory(AppDataFolder.Path);
        File.WriteAllText(Path.Combine(AppDataFolder.Path, "settings.json"), """
        {
          "appLanguage": "en",
          "themeMode": "Dark",
          "firstRunComplete": true
        }
        """);
    }

    private static void RestoreAppSettingsFile((bool Exists, string? Value) saved)
    {
        var path = Path.Combine(AppDataFolder.Path, "settings.json");
        if (saved.Exists)
        {
            Directory.CreateDirectory(Path.GetDirectoryName(path)!);
            File.WriteAllText(path, saved.Value ?? string.Empty);
            return;
        }

        if (File.Exists(path))
        {
            File.Delete(path);
        }
    }

    private static (bool Exists, string? Value) ReadInstallerLanguage()
    {
        using var key = Registry.CurrentUser.OpenSubKey(@"Software\Loaderly");
        var value = key?.GetValue("Language")?.ToString();
        return (value is not null, value);
    }

    private static void WriteInstallerLanguage(string value)
    {
        using var key = Registry.CurrentUser.CreateSubKey(@"Software\Loaderly");
        key?.SetValue("Language", value, RegistryValueKind.String);
    }

    private static void RestoreInstallerLanguage((bool Exists, string? Value) saved)
    {
        using var key = Registry.CurrentUser.CreateSubKey(@"Software\Loaderly");
        if (saved.Exists)
        {
            key?.SetValue("Language", saved.Value ?? "en", RegistryValueKind.String);
            return;
        }

        key?.DeleteValue("Language", throwOnMissingValue: false);
    }

    private static void ThrottledUpdatesDoNotRunForEveryProgressLine()
    {
        var throttler = new UiUpdateThrottler(250);

        Check(throttler.ShouldRun(1_000, true), "First update should render immediately.");
        Check(!throttler.ShouldRun(1_050, true), "Second update inside the interval should be skipped.");
        Check(!throttler.ShouldRun(1_200, true), "Third update inside the interval should still be skipped.");
        Check(throttler.ShouldRun(1_251, true), "Update after the interval should render.");
    }

    private static void ForcedUpdatesBypassThrottle()
    {
        var throttler = new UiUpdateThrottler(250);

        Check(throttler.ShouldRun(2_000, true), "Initial throttled update should render.");
        Check(throttler.ShouldRun(2_001, false), "Forced update should bypass the interval.");
        Check(!throttler.ShouldRun(2_050, true), "Throttling should resume after a forced update.");
    }

    private static void ProductVersionIsFirstPublicRelease()
    {
        Check(ProductInfo.Version == "1.0.0", "Loaderly should identify the current build as the first 1.0.0 release.");
        Check(ProductInfo.DisplayVersion == "v1.0.0", "Sidebar version should display v1.0.0.");
    }

    private static void UpdateCheckerParsesGitHubInstallerRelease()
    {
        var release = UpdateChecker.ParseReleaseForTest("""
        {
          "tag_name": "v1.0.1",
          "html_url": "https://github.com/voidksa/Loaderly/releases/tag/v1.0.1",
          "assets": [
            {
              "name": "Loaderly-Setup-1.0.1.exe",
              "browser_download_url": "https://github.com/voidksa/Loaderly/releases/download/v1.0.1/Loaderly-Setup-1.0.1.exe"
            }
          ]
        }
        """);

        Check(release is not null, "Update checker should parse GitHub release JSON.");
        Check(UpdateChecker.TryParseVersion(release!.TagName, out var version) && version.ToString() == "1.0.1", "Update checker should parse v-prefixed tags.");
        Check(release.Assets.Any(asset => asset.Name == "Loaderly-Setup-1.0.1.exe" && asset.BrowserDownloadUrl.EndsWith(".exe", StringComparison.OrdinalIgnoreCase)), "Update checker should find installer assets.");
    }

    private static void ArabicLanguageMapsCoreUiLabels()
    {
        LoaderlyLanguage.Set(LoaderlyLanguage.Arabic);
        try
        {
            Check(LoaderlyLanguage.Text("Settings") == "الإعدادات", "Arabic UI should translate Settings.");
            Check(LoaderlyLanguage.EnglishFor("العربية") == "Arabic", "Localized language selection should map back to the stored language value.");
        }
        finally
        {
            LoaderlyLanguage.Set(LoaderlyLanguage.English);
        }
    }

    private static void InstallerThemeFollowsWindowsLightAndDarkModes()
    {
        var dark = SetupTheme.PaletteForSystemLightModeForTest(false);
        var light = SetupTheme.PaletteForSystemLightModeForTest(true);

        Check(dark.IsDark, "Installer should use the dark palette when Windows app theme is dark.");
        Check(!light.IsDark, "Installer should use the light palette when Windows app theme is light.");
        Check(dark.Window.GetBrightness() < light.Window.GetBrightness(), "Installer dark window should be darker than the light window.");
        Check(dark.Control.GetBrightness() < light.Control.GetBrightness(), "Installer dark language picker should be darker than the light language picker.");
    }

    private static void InstallerUsesUninstallOnlyWhenRequested()
    {
        Check(SetupMode.ShouldUseUninstallModeForTest(true, null, "1.0.0"), "Explicit uninstall launcher mode should always uninstall.");
        Check(!SetupMode.ShouldUseUninstallModeForTest(false, "1.0.0", "1.0.0"), "Opening the same installed setup should allow repair or reinstall.");
        Check(!SetupMode.ShouldUseUninstallModeForTest(false, "1.0.0", "1.0.1"), "Opening a newer setup over an older install should remain in update/install mode.");
    }

    private static void InstallerLaunchesAppOnlyAfterAcknowledgementAndClose()
    {
        var launchSteps = SetupMode.InstallCompletionStepsForTest(launchAfterInstall: true);
        var noLaunchSteps = SetupMode.InstallCompletionStepsForTest(launchAfterInstall: false);

        Check(launchSteps.SequenceEqual([
            SetupCompletionStep.ShowSuccessMessage,
            SetupCompletionStep.CloseInstaller,
            SetupCompletionStep.LaunchApp
        ]), "Installer should wait for OK, close the setup launcher, then launch Loaderly.");
        Check(noLaunchSteps.SequenceEqual([
            SetupCompletionStep.ShowSuccessMessage,
            SetupCompletionStep.CloseInstaller
        ]), "Installer should only close after OK when launch-after-install is unchecked.");
    }

    private static void InstallerSupportsQuietModeForAutomatedUpdates()
    {
        Check(SetupMode.IsQuietForTest(["--quiet"]), "Installer should support quiet mode for Windows uninstall/update automation.");
        Check(SetupMode.ShouldLaunchAfterQuietInstallForTest(["--quiet", "--launch"]), "Quiet install should launch Loaderly only when explicitly requested.");
        Check(!SetupMode.ShouldLaunchAfterQuietInstallForTest(["--quiet"]), "Quiet install should not launch Loaderly by default.");
    }

    private static void InstallerAcceptsCustomInstallDirectoryArgument()
    {
        Check(
            SetupMode.InstallDirectoryArgumentForTest(["--install-dir", @"D:\Apps\Loaderly"]) == @"D:\Apps\Loaderly",
            "Installer should accept a custom install directory as a separated argument.");
        Check(
            SetupMode.InstallDirectoryArgumentForTest([@"--install-dir=C:\Apps\Loaderly"]) == @"C:\Apps\Loaderly",
            "Installer should accept a custom install directory as an inline argument.");
        Check(
            SetupMode.InstallDirectoryArgumentForTest(["--quiet"]) is null,
            "Installer should keep the default or existing install directory when no custom path is provided.");
    }

    private static void ModernSelectUsesRtlMenuPlacement()
    {
        Check(ModernSelect.MenuXForTest(160, 96, false) == 0, "LTR select menus should open from the left edge of the field.");
        Check(ModernSelect.MenuXForTest(160, 96, true) == 64, "RTL select menus should keep the dropdown aligned to the right edge of the field.");
        Check((ModernSelect.TextFlagsForTest(true) & System.Windows.Forms.TextFormatFlags.RightToLeft) != 0, "RTL select text should be drawn right-to-left.");
        Check((ModernSelect.TextFlagsForTest(true) & System.Windows.Forms.TextFormatFlags.Right) != 0, "RTL select text should be right aligned.");
    }

    private static void TrimPanelUsesScrollWhenContentIsTallerThanThePanel()
    {
        Check(TrimPanelLayout.ContentHeight > 560, "Trim panel content should describe the full control stack height.");
        Check(TrimPanelLayout.NeedsScrolling(520), "Short trim panels should scroll instead of overlapping controls.");
        Check(!TrimPanelLayout.NeedsScrolling(TrimPanelLayout.ContentHeight), "Panel should not require scrolling when the full stack fits.");
    }

    private static void TrimFormStatusBarKeepsExportMessagesVisible()
    {
        Check(TrimForm.TransportRowHeightForTest >= 64, "Trim status row should be tall enough to keep export messages visible.");
        Check(TrimForm.StatusLabelVerticalMarginForTest >= 6, "Trim status text should have vertical margin so it is not clipped at the bottom.");
    }

    private static void HistoryRenderingIsCappedForLargeLibraries()
    {
        var items = Enumerable.Range(0, 120)
            .Select(index => new DownloadItem { Title = $"Video {index}" })
            .ToList();

        Check(HistoryRenderPolicy.VisibleItems(items, string.Empty).Count == 36, "Large unfiltered history should render only the newest 36 cards.");
        Check(HistoryRenderPolicy.VisibleItems(items, "Video").Count == 72, "Large filtered history should render only the first 72 matches.");
    }

    private static void TimelineThumbnailCountIsSmallOnWeakDevices()
    {
        Check(TimelineThumbnailPlan.CountForWidth(320) == 4, "Small timelines should use four thumbnails.");
        Check(TimelineThumbnailPlan.CountForWidth(900) <= 8, "Wide timelines should stay capped to avoid slow ffmpeg work.");
    }

    private static void TimelineThumbnailServiceHonorsRequestedCount()
    {
        Check(TimelineThumbnailService.NormalizeCountForTest(4) == 4, "Timeline thumbnail generation should not upscale small requested counts.");
        Check(TimelineThumbnailService.NormalizeCountForTest(22) == 8, "Timeline thumbnail generation should stay capped for smoother trim-window opening.");
    }

    private static void SettingsFormAvoidsNativeComboBoxes()
    {
        using var form = new SettingsForm(new AppSettings());
        Check(!Descendants(form).Any(control => control is System.Windows.Forms.ComboBox), "Settings should not use native ComboBox controls that flash white in dark mode.");
    }

    private static void SettingsFormUsesThemedSaveFolderScroller()
    {
        using var form = new SettingsForm(new AppSettings
        {
            DownloadFolder = @"C:\Downloads",
            SavedFolders = [@"C:\Downloads", @"D:\Media", @"E:\Archive", @"F:\"]
        });

        Check(Descendants(form).Any(control => control is ModernScrollPanel), "Settings save folders should use the themed scroll panel instead of a native white scrollbar.");
        Check(Descendants(form).OfType<System.Windows.Forms.ListBox>().Count() <= 1, "Settings save folders should not use a native ListBox scrollbar.");
    }

    private static void SettingsFormGivesSaveFoldersEnoughRoom()
    {
        Check(SettingsForm.SaveFolderListRowHeightForTest >= 112, "Save folders should use the available settings space instead of clipping saved paths.");
        Check(SettingsForm.SaveFolderItemHeightForTest >= 32, "Save folder rows should be tall enough for readable paths.");
    }

    private static void SettingsFormKeepsFieldsReadable()
    {
        using var form = new SettingsForm(new AppSettings());
        form.CreateControl();
        form.PerformLayout();

        var generalPanel = Descendants(form)
            .OfType<System.Windows.Forms.TableLayoutPanel>()
            .First(panel => panel.RowCount == 14 && panel.Margin.Right == 12);
        Check(generalPanel.RowStyles[4].Height >= 54, "Settings active folder field row should be tall enough.");
        Check(generalPanel.RowStyles[6].Height >= 54, "Settings theme field row should be tall enough.");
        Check(generalPanel.RowStyles[8].Height >= 54, "Settings subtitle source field row should be tall enough.");

        var shortcutsPanel = Descendants(form)
            .OfType<System.Windows.Forms.TableLayoutPanel>()
            .First(panel => panel.RowCount == 12 && panel.Margin.Left == 12);
        Check(shortcutsPanel.RowStyles[7].Height >= 62, "OpenRouter API key row should not clip the field.");
        Check(shortcutsPanel.RowStyles[8].Height >= 62, "OpenRouter model row should not clip the field.");
        Check(shortcutsPanel.RowStyles[10].Height >= 62, "AI target language row should not clip the fields.");
    }

    private static void SettingsFormTextBoxesAreCenteredInsideModernFields()
    {
        using var form = new SettingsForm(new AppSettings());
        form.CreateControl();
        form.PerformLayout();

        var modernTextBoxes = Descendants(form)
            .OfType<System.Windows.Forms.TextBox>()
            .Where(textBox => textBox.Parent is RoundedPanel && textBox.PlaceholderText != string.Empty)
            .ToList();

        Check(modernTextBoxes.Count >= 4, "Settings should use modern hosted text fields.");
        foreach (var textBox in modernTextBoxes)
        {
            var parent = textBox.Parent!;
            var expectedTop = Math.Max(0, (parent.ClientSize.Height - textBox.Height) / 2);
            Check(textBox.Dock == System.Windows.Forms.DockStyle.None, $"Settings text field '{textBox.PlaceholderText}' should not fill over the rounded host.");
            Check(textBox.AutoSize == false, $"Settings text field '{textBox.PlaceholderText}' should use stable height.");
            Check(Math.Abs(textBox.Top - expectedTop) <= 3, $"Settings text field '{textBox.PlaceholderText}' should be vertically centered.");
        }
    }

    private static void SettingsFormCheckBoxesDoNotToggleFromEmptyRowSpace()
    {
        using var form = new SettingsForm(new AppSettings());
        form.CreateControl();
        form.PerformLayout();

        var checkBoxes = Descendants(form)
            .OfType<System.Windows.Forms.CheckBox>()
            .Where(checkBox => checkBox.Text.Contains("notifications", StringComparison.OrdinalIgnoreCase) ||
                checkBox.Text.Contains("subtitles", StringComparison.OrdinalIgnoreCase) ||
                checkBox.Text.Contains("tray", StringComparison.OrdinalIgnoreCase))
            .ToList();

        Check(checkBoxes.Count >= 4, "Settings should expose the expected toggle controls.");
        foreach (var checkBox in checkBoxes)
        {
            var textWidth = System.Windows.Forms.TextRenderer.MeasureText(checkBox.Text, checkBox.Font).Width;
            Check(checkBox.Dock != System.Windows.Forms.DockStyle.Fill, $"Settings toggle '{checkBox.Text}' should not fill the entire empty row.");
            Check(checkBox.Width <= textWidth + 44, $"Settings toggle '{checkBox.Text}' click target should stay around the checkbox and text.");
        }
    }

    private static void SettingsFormArabicCheckBoxesFitAndAlignRight()
    {
        LoaderlyLanguage.Set(LoaderlyLanguage.Arabic);
        try
        {
            using var form = new SettingsForm(new AppSettings { AppLanguage = LoaderlyLanguage.Arabic });
            form.CreateControl();
            form.PerformLayout();
            var checkBoxes = Descendants(form)
                .OfType<ModernCheckBox>()
                .Where(checkBox => checkBox.Text.Length > 0)
                .ToList();

            Check(checkBoxes.Count >= 4, "Arabic settings should expose the expected toggle controls.");
            foreach (var checkBox in checkBoxes)
            {
                var textWidth = System.Windows.Forms.TextRenderer.MeasureText(checkBox.Text, checkBox.Font).Width;
                Check(checkBox.Width >= textWidth + 34, $"Arabic toggle '{checkBox.Text}' should fit without clipping.");
                Check(checkBox.Anchor.HasFlag(System.Windows.Forms.AnchorStyles.Right), $"Arabic toggle '{checkBox.Text}' should align to the right side.");
                Check(ModernCheckBox.BoxBoundsForTest(checkBox.Width, checkBox.Height, true).Right == checkBox.Width, "Arabic checkbox box should be drawn on the right.");
            }
        }
        finally
        {
            LoaderlyLanguage.Set(LoaderlyLanguage.English);
        }
    }

    private static void SettingsFormOffersAppLanguageSelection()
    {
        using var form = new SettingsForm(new AppSettings());
        var selects = Descendants(form).OfType<ModernSelect>().ToList();
        Check(selects.Any(select => select.Items.Contains("English") && select.Items.Contains("Arabic")), "Settings should expose English and Arabic app language choices.");
    }

    private static void LightThemeUsesLightSidebarPalette()
    {
        LoaderlyTheme.SetMode("Light");
        try
        {
            Check(LoaderlyTheme.Sidebar.GetBrightness() > 0.85F, "Light mode sidebar should not stay dark.");
            Check(LoaderlyTheme.SidebarButton.GetBrightness() > 0.80F, "Light mode sidebar buttons should use light surfaces.");
            Check(LoaderlyTheme.SidebarText.GetBrightness() < 0.35F, "Light mode sidebar text should be dark enough on a light sidebar.");
        }
        finally
        {
            LoaderlyTheme.SetMode("System");
        }
    }

    private static void MainFormKeepsHeaderSeparatedFromUrlInput()
    {
        using var form = new MainForm(
            new MediaDownloadService(),
            new TrimExportService(),
            new ThumbnailService(),
            new UpdateChecker(),
            new DownloadHistoryStore(),
            new AppSettingsStore());

        var contentPanel = Descendants(form)
            .OfType<System.Windows.Forms.TableLayoutPanel>()
            .First(panel => panel.RowCount == 4 && panel.ColumnCount == 1 && panel.Padding.Left == 24);
        Check(contentPanel.RowStyles[0].Height >= 86, "Main header should have enough height before the URL input.");

        var texts = Descendants(form).Select(control => control.Text).ToList();
        Check(texts.Any(text => text.Contains("YouTube", StringComparison.OrdinalIgnoreCase) &&
                               text.Contains("TikTok", StringComparison.OrdinalIgnoreCase) &&
                               text.Contains("Instagram", StringComparison.OrdinalIgnoreCase)),
            "Main screen should clearly mention supported platforms.");
    }

    private static void MainFormUrlInputShowsClickableTextCursor()
    {
        using var form = new MainForm(
            new MediaDownloadService(),
            new TrimExportService(),
            new ThumbnailService(),
            new UpdateChecker(),
            new DownloadHistoryStore(),
            new AppSettingsStore());
        form.CreateControl();
        form.PerformLayout();

        var urlTextBox = Descendants(form)
            .OfType<System.Windows.Forms.TextBox>()
            .First(textBox => textBox.PlaceholderText.Contains("media URLs", StringComparison.OrdinalIgnoreCase));
        var host = urlTextBox.Parent!;

        Check(urlTextBox.Dock == System.Windows.Forms.DockStyle.Fill, "URL field should be a full-size native text input, not a tiny hosted editor.");
        Check(host is not RoundedPanel, "URL field should not be wrapped in a custom painted host that can steal clicks from the text input.");
        Check(urlTextBox.Cursor == System.Windows.Forms.Cursors.IBeam, "URL field should show the text cursor over the actual input.");
        Check(!urlTextBox.ReadOnly && urlTextBox.Enabled, "URL field should be editable.");
        Check(urlTextBox.BorderStyle == System.Windows.Forms.BorderStyle.None, "URL field should not show a native Windows border in the dark UI.");
        Check(urlTextBox.BackColor == LoaderlyTheme.SurfaceMuted, "URL field should use the app dark input surface.");
    }

    private static void MainFormUrlInputUsesExplicitPastePath()
    {
        using var form = new MainForm(
            new MediaDownloadService(),
            new TrimExportService(),
            new ThumbnailService(),
            new UpdateChecker(),
            new DownloadHistoryStore(),
            new AppSettingsStore());

        var method = typeof(MainForm).GetMethod(
            "PasteTextIntoUrlBoxForTest",
            System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic);
        Check(method is not null, "URL input should have an explicit paste path instead of relying only on default TextBox shortcuts.");

        var text = (string)method!.Invoke(form, ["  https://example.com/watch?v=abc  "])!;
        Check(text == "https://example.com/watch?v=abc", "Explicit URL paste should write visible trimmed text into the URL field.");
    }

    private static void MainFormClearsUrlFocusOnBackgroundClick()
    {
        using var form = new MainForm(
            new MediaDownloadService(),
            new TrimExportService(),
            new ThumbnailService(),
            new UpdateChecker(),
            new DownloadHistoryStore(),
            new AppSettingsStore());

        var method = typeof(MainForm).GetMethod(
            "ClearUrlInputFocusForTest",
            System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic);
        Check(method is not null, "Main form should expose URL focus clearing for verification.");

        var cleared = (bool)method!.Invoke(form, [])!;
        Check(cleared, "Clicking non-input background should clear URL input focus so later typing does not keep going into the link field.");
    }

    private static void MainFormLocalizesDynamicWatchTrimLabels()
    {
        LoaderlyLanguage.Set(LoaderlyLanguage.Arabic);
        try
        {
            Check(MainForm.WatchTrimButtonTextForTest(true) == "مشاهدة / قص", "Arabic history details should not show Watch / Trim in English.");
            Check(MainForm.WatchTrimButtonTextForTest(false) == "فتح فيديو...", "Arabic empty details should not show Open video in English.");
        }
        finally
        {
            LoaderlyLanguage.Set(LoaderlyLanguage.English);
        }
    }

    private static void HistoryRenderingIsTunedForWeakDevices()
    {
        Check(HistoryRenderPolicy.MaxUnfilteredCards <= 36, "Unfiltered history should keep the live control count low on weak devices.");
        Check(HistoryRenderPolicy.MaxFilteredCards <= 72, "Filtered history should keep the live control count bounded.");
        Check(MainForm.HistoryRenderThrottleMillisecondsForTest >= 900, "Progress updates should not rebuild history several times per second.");
    }

    private static void QueueCardsHaveStableUpdateTargets()
    {
        using var form = new MainForm(
            new MediaDownloadService(),
            new TrimExportService(),
            new ThumbnailService(),
            new UpdateChecker(),
            new DownloadHistoryStore(),
            new AppSettingsStore());
        var method = typeof(MainForm).GetMethod("BuildDownloadTaskCard", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic);
        Check(method is not null, "Main form should build queue cards through a private card builder.");

        var task = new DownloadQueueItem
        {
            SourceUrl = "https://youtu.be/oH8qBRYNshE",
            State = DownloadTaskState.Running,
            Status = "Downloading"
        };
        var card = (System.Windows.Forms.Control)method!.Invoke(form, [task])!;

        Check(card.Controls.Find("queue-state", searchAllChildren: true).Length == 1, "Queue cards should expose a stable state label for progress updates.");
        Check(card.Controls.Find("queue-detail", searchAllChildren: true).Length == 1, "Queue cards should expose a stable detail label for progress updates.");
        Check(card.Controls.Find("queue-progress", searchAllChildren: true).Length == 1, "Queue cards should expose a stable progress bar for progress updates.");
    }

    private static void PausedQueueCardsOfferRemoveAndResume()
    {
        using var form = new MainForm(
            new MediaDownloadService(),
            new TrimExportService(),
            new ThumbnailService(),
            new UpdateChecker(),
            new DownloadHistoryStore(),
            new AppSettingsStore());
        var method = typeof(MainForm).GetMethod("BuildDownloadTaskCard", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic);
        Check(method is not null, "Main form should build queue cards through a private card builder.");

        var task = new DownloadQueueItem
        {
            SourceUrl = "https://youtu.be/oH8qBRYNshE",
            State = DownloadTaskState.Canceled,
            Status = "Paused"
        };
        var card = (System.Windows.Forms.Control)method!.Invoke(form, [task])!;
        var buttons = Descendants(card).OfType<ModernButton>().ToList();

        Check(buttons.Any(button => button.Text == "Remove" && button.Enabled), "Paused downloads should have an enabled Remove button so unfinished work can be discarded.");
        Check(buttons.Any(button => button.Text == "Resume" && button.Enabled), "Paused downloads should keep an enabled Resume button.");
        Check(!buttons.Any(button => button.Text == "Pause"), "Paused downloads should not show a disabled Pause action.");
    }

    private static void DownloadPreparationRunsAwayFromUiThread()
    {
        var callerThread = Environment.CurrentManagedThreadId;
        using var entered = new ManualResetEventSlim(false);
        using var release = new ManualResetEventSlim(false);

        var task = DownloadExecution.RunAsync(() =>
        {
            Check(Environment.CurrentManagedThreadId != callerThread, "Download preparation should run on a worker thread so slow drives or tool lookup cannot freeze the UI thread.");
            entered.Set();
            release.Wait(TimeSpan.FromSeconds(2));
            return Task.FromResult<IReadOnlyList<DownloadResult>>([]);
        }, CancellationToken.None);

        Check(entered.Wait(TimeSpan.FromSeconds(2)), "Background download operation should start promptly.");
        Check(!task.IsCompleted, "The caller should regain control while the download operation is still running.");
        release.Set();
        task.GetAwaiter().GetResult();
    }

    private static void HistoryCardsVerticallyCenterTitleStack()
    {
        LoaderlyLanguage.Set(LoaderlyLanguage.Arabic);
        try
        {
            using var form = new MainForm(
                new MediaDownloadService(),
                new TrimExportService(),
                new ThumbnailService(),
                new UpdateChecker(),
                new DownloadHistoryStore(),
                new AppSettingsStore());
            LoaderlyLanguage.Set(LoaderlyLanguage.Arabic);
            var method = typeof(MainForm).GetMethod("BuildHistoryCard", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic);
            Check(method is not null, "Main form should build history cards through a private card builder.");

            var item = new DownloadItem
            {
                Id = Guid.NewGuid(),
                Title = "ZAYN - Dusk Till Dawn (Official Video) ft. Sia",
                FilePath = @"C:\missing.mp4",
                CreatedAt = new DateTimeOffset(2026, 5, 12, 16, 31, 0, TimeSpan.Zero)
            };
            var card = (System.Windows.Forms.Control)method!.Invoke(form, [item])!;
            var expectedTitle = MainForm.DisplayHistoryTitleForTest(item.Title, item.FilePath);
            var title = Descendants(card).OfType<System.Windows.Forms.Label>().First(label => label.Text == expectedTitle);
            var textLayout = (System.Windows.Forms.TableLayoutPanel)title.Parent!;

            Check(textLayout.RowCount == 5, "History card text should use top and bottom spacer rows so the title stack is vertically centered.");
            Check(card.Height >= MainForm.HistoryCardHeightForTest, "History cards should be tall enough to avoid clipped title, date, and file rows.");
            Check(textLayout.RowStyles[1].Height >= 30 &&
                  textLayout.RowStyles[2].Height >= 22 &&
                  textLayout.RowStyles[3].Height >= 24,
                "History card title, date, and detail rows should have enough height to avoid clipped text.");
            Check(textLayout.GetRow(title) == 1, "History card title should sit after the top spacer row.");
            Check(textLayout.RowStyles[0].SizeType == System.Windows.Forms.SizeType.Percent &&
                  textLayout.RowStyles[4].SizeType == System.Windows.Forms.SizeType.Percent &&
                  Math.Abs(textLayout.RowStyles[0].Height - textLayout.RowStyles[4].Height) < 0.1F,
                "History card top and bottom spacers should be equal.");
            Check(title.TextAlign == System.Drawing.ContentAlignment.MiddleRight, "Arabic history titles should be right-aligned and vertically centered.");
        }
        finally
        {
            LoaderlyLanguage.Set(LoaderlyLanguage.English);
        }
    }

    private static void HistoryTitlesArePresentedCleanly()
    {
        var hashTitle = MainForm.DisplayHistoryTitleForTest("# #explore #fpppppppppppppppppppp", @"C:\Media\clip.mp4");
        var emptyTitle = MainForm.DisplayHistoryTitleForTest("   ###   ", @"C:\Media\Loaderly sample.mp4");

        Check(hashTitle == "explore #fpppppppppppppppppppp", "History display titles should remove leading hashtag noise.");
        Check(emptyTitle == "Loaderly sample", "History display titles should fall back to the filename when the title is empty after cleanup.");
    }

    private static void MainFormUsesModernDarkTrayMenu()
    {
        using var form = new MainForm(
            new MediaDownloadService(),
            new TrimExportService(),
            new ThumbnailService(),
            new UpdateChecker(),
            new DownloadHistoryStore(),
            new AppSettingsStore());

        var field = typeof(MainForm).GetField("trayMenu", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic);
        var menu = (System.Windows.Forms.ContextMenuStrip)field!.GetValue(form)!;
        var labels = menu.Items.OfType<System.Windows.Forms.ToolStripMenuItem>().Select(item => item.Text).ToList();

        Check(menu.Renderer is ModernMenuRenderer, "Tray menu should use the modern dark renderer.");
        Check(menu.BackColor == LoaderlyTheme.SurfaceMuted, "Tray menu should use the app dark surface.");
        Check(labels.SequenceEqual(["Open Loaderly", "Exit"]), "Tray menu should keep the original action labels.");
        Check(menu.Items.OfType<System.Windows.Forms.ToolStripMenuItem>().All(item => item.Image is not null), "Tray menu actions should include icons.");
        Check(menu.Items.OfType<System.Windows.Forms.ToolStripMenuItem>().All(item => item.Image!.Size == new System.Drawing.Size(16, 16)), "Tray menu icons should use compact 16px sizing.");
        Check(menu.Items.OfType<System.Windows.Forms.ToolStripMenuItem>().All(item => item.Height == 32), "Tray menu rows should use a balanced 32px height.");
        Check(menu.Items.OfType<System.Windows.Forms.ToolStripMenuItem>().All(item => item.ImageAlign == System.Drawing.ContentAlignment.MiddleCenter && item.TextAlign == System.Drawing.ContentAlignment.MiddleLeft), "Tray menu text and icons should be vertically aligned.");
        Check(HasColorfulPixels(menu.Items.OfType<System.Windows.Forms.ToolStripMenuItem>().First().Image!), "Open Loaderly should use the Loaderly app icon, not the gray download glyph.");
    }

    private static void MainFormTrayMenuFollowsLanguageChanges()
    {
        LoaderlyLanguage.Set(LoaderlyLanguage.English);
        using var form = new MainForm(
            new MediaDownloadService(),
            new TrimExportService(),
            new ThumbnailService(),
            new UpdateChecker(),
            new DownloadHistoryStore(),
            new AppSettingsStore());

        LoaderlyLanguage.Set(LoaderlyLanguage.Arabic);
        typeof(MainForm)
            .GetMethod("RebuildForTheme", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)!
            .Invoke(form, []);

        var field = typeof(MainForm).GetField("trayMenu", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic);
        var menu = (System.Windows.Forms.ContextMenuStrip)field!.GetValue(form)!;
        var labels = menu.Items.OfType<System.Windows.Forms.ToolStripMenuItem>().Select(item => item.Text).ToList();

        Check(labels.SequenceEqual(["فتح Loaderly", "خروج"]), "Tray menu should update Open Loaderly and Exit when the app language changes.");
        Check(menu.RightToLeft == System.Windows.Forms.RightToLeft.Yes, "Arabic tray menu should use RTL layout.");

        LoaderlyLanguage.Set(LoaderlyLanguage.English);
    }

    private static void MainFormMaximizedStatePropagatesToTrimWindow()
    {
        var method = typeof(MainForm).GetMethod(
            "ChildWindowStateForParentForTest",
            System.Reflection.BindingFlags.Static | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic);
        Check(method is not null, "Main form should expose child window state inheritance for verification.");

        var maximized = (System.Windows.Forms.FormWindowState)method!.Invoke(null, [System.Windows.Forms.FormWindowState.Maximized])!;
        var normal = (System.Windows.Forms.FormWindowState)method.Invoke(null, [System.Windows.Forms.FormWindowState.Normal])!;
        Check(maximized == System.Windows.Forms.FormWindowState.Maximized, "Trim window should open maximized when the main window is maximized.");
        Check(normal == System.Windows.Forms.FormWindowState.Normal, "Trim window should keep normal state when the main window is normal.");
    }

    private static void WindowsToastUsesLoaderlyLogoOverride()
    {
        var method = typeof(WindowsToastNotifier).GetMethod(
            "BuildToastXmlForTest",
            System.Reflection.BindingFlags.Static | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic);
        Check(method is not null, "Windows toast should expose its XML builder for icon verification.");

        var xml = (string)method!.Invoke(null, ["Loaderly", "Download finished.", @"C:\Apps\Loaderly\assets\loaderly-128.png"])!;
        Check(xml.Contains("placement=\"appLogoOverride\"", StringComparison.Ordinal), "Windows toast should explicitly use the Loaderly logo as the notification icon.");
        Check(xml.Contains("loaderly-128.png", StringComparison.OrdinalIgnoreCase), "Windows toast should point at the packaged Loaderly logo asset.");
    }

    private static void FallbackNotificationsUseTrayIcon()
    {
        var method = typeof(MainForm).GetMethod(
            "NotificationFallbackIconForTest",
            System.Reflection.BindingFlags.Static | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic);
        Check(method is not null, "Fallback balloon notifications should expose the selected icon kind for verification.");

        var icon = (System.Windows.Forms.ToolTipIcon)method!.Invoke(null, [])!;
        Check(icon == System.Windows.Forms.ToolTipIcon.None, "Fallback balloon notifications should use the tray app icon instead of Windows info/warning icons.");
    }

    private static void LoaderlyIconContainsNotificationSizes()
    {
        var iconPath = Path.Combine(AppContext.BaseDirectory, "assets", "loaderly.ico");
        Check(File.Exists(iconPath), "Published assets should include the Loaderly icon.");

        var sizes = ReadIcoSizes(iconPath).ToHashSet();
        Check(sizes.Contains((16, 16)), "Loaderly icon should include a 16px layer for notification headers.");
        Check(sizes.Contains((32, 32)), "Loaderly icon should include a 32px layer for notification scaling.");
        Check(sizes.Contains((48, 48)), "Loaderly icon should include a 48px layer for Windows shell notifications.");
        Check(sizes.Contains((256, 256)), "Loaderly icon should keep a high-resolution layer.");
    }

    private static void TrayReminderDoesNotShowBackgroundNotification()
    {
        var method = typeof(MainForm).GetMethod(
            "ShowsTrayReminderNotificationForTest",
            System.Reflection.BindingFlags.Static | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic);
        Check(method is not null, "Tray reminder notification policy should be exposed for verification.");

        var showsNotification = (bool)method!.Invoke(null, [])!;
        Check(!showsNotification, "Closing to tray should not show a background-running notification.");
    }

    private static void TrimFormDefersTimelineThumbnailWork()
    {
        Check(TrimForm.TimelineThumbnailDelayMillisecondsForTest >= 250, "Trim window should defer thumbnail ffmpeg work until after the first paint.");
    }

    private static void TrimFormUsesModernScrollPanel()
    {
        using var form = new TrimForm(@"C:\missing.mp4", "Missing", new TrimExportService(), new AppSettings());
        Check(Descendants(form).Any(control => control is ModernScrollPanel), "Trim panel should use the custom dark scroll panel.");
        Check(!Descendants(form).Any(control => control.GetType() == typeof(System.Windows.Forms.ComboBox)), "Trim panel should not use native ComboBox controls.");
    }

    private static void TrimFormHasSubtitleManagementControls()
    {
        using var form = new TrimForm(@"C:\missing.mp4", "Missing", new TrimExportService(), new AppSettings());
        var texts = Descendants(form).Select(control => control.Text).ToHashSet(StringComparer.OrdinalIgnoreCase);
        Check(texts.Contains("Subtitles"), "Trim panel should expose subtitle controls.");
        Check(texts.Contains("Choose"), "Trim panel should allow choosing a subtitle file.");
        Check(texts.Contains("Edit"), "Trim panel should allow editing subtitles.");
        Check(texts.Contains("Hide"), "Trim panel should allow hiding subtitles.");
    }

    private static void TrimFormCanRemoveAndRestoreOriginalSubtitles()
    {
        using var form = new TrimForm(@"C:\missing.mp4", "Missing", new TrimExportService(), new AppSettings());
        var texts = Descendants(form).Select(control => control.Text).ToHashSet(StringComparer.OrdinalIgnoreCase);

        Check(texts.Contains("Original"), "Trim panel should let the user return from AI subtitles to the original subtitle file.");
        Check(texts.Contains("Remove"), "Trim panel should let the user unload subtitles from preview and export.");

        var originalPath = TrimForm.OriginalSubtitlePathFromTranslationForTest(@"C:\Media\video.en.clip-000048-000058.ai-arabic.srt");
        Check(originalPath == @"C:\Media\video.en.srt", "Clip-specific AI subtitles should map back to the base original subtitle file.");
    }

    private static void TrimFormHasExplicitSubtitleExportModes()
    {
        using var form = new TrimForm(@"C:\missing.mp4", "Missing", new TrimExportService(), new AppSettings());
        var subtitleExportSelect = Descendants(form)
            .OfType<ModernSelect>()
            .FirstOrDefault(select =>
                select.Items.Contains("Burn in subtitles") &&
                select.Items.Contains("Sidecar SRT") &&
                select.Items.Contains("No subtitles"));

        Check(subtitleExportSelect is not null, "Trim export options should let the user choose burned-in subtitles, sidecar SRT, or no subtitles.");
    }

    private static void TrimFormSubtitleExportModeControlsBurnIn()
    {
        Check(TrimForm.ShouldBurnInSubtitlesForTest("Burn in subtitles", true, true, true), "Burn-in mode should embed visible loaded subtitles.");
        Check(!TrimForm.ShouldBurnInSubtitlesForTest("Sidecar SRT", true, true, true), "Sidecar mode should not burn subtitles into the video.");
        Check(!TrimForm.ShouldBurnInSubtitlesForTest("No subtitles", true, true, true), "No-subtitle mode should export a clean video.");
        Check(!TrimForm.ShouldBurnInSubtitlesForTest("Burn in subtitles", false, true, true), "Hidden subtitles should not be burned in.");
    }

    private static void SrtSidecarSubtitlesAreTrimmedToSelectedClip()
    {
        var cues = new[]
        {
            new SubtitleCue(TimeSpan.FromSeconds(1), TimeSpan.FromSeconds(4), "Before"),
            new SubtitleCue(TimeSpan.FromSeconds(5), TimeSpan.FromSeconds(7), "Inside"),
            new SubtitleCue(TimeSpan.FromSeconds(8), TimeSpan.FromSeconds(12), "After")
        };

        var sidecar = TrimForm.BuildSidecarSubtitleTextForTest(
            cues,
            TimeSpan.FromSeconds(3),
            TimeSpan.FromSeconds(9),
            @"C:\Temp\clip.srt");

        Check(sidecar.Contains("00:00:00,000 --> 00:00:01,000", StringComparison.Ordinal), "Sidecar subtitles should clip overlapping text to the exported clip start.");
        Check(sidecar.Contains("00:00:02,000 --> 00:00:04,000", StringComparison.Ordinal), "Sidecar subtitles should shift cues so the exported clip starts at 0:00.");
        Check(sidecar.Contains("00:00:05,000 --> 00:00:06,000", StringComparison.Ordinal), "Sidecar subtitles should clip overlapping text to the exported clip end.");
    }

    private static void TrimFormGivesTranslateActionEnoughWidth()
    {
        using var form = new TrimForm(@"C:\missing.mp4", "Missing", new TrimExportService(), new AppSettings());
        var button = Descendants(form).First(control => control.Text == "Translate");
        var layout = (System.Windows.Forms.TableLayoutPanel)button.Parent!;

        Check(layout.GetColumn(button) == 2, "Translate action should stay in the subtitle action row.");
        Check(layout.ColumnStyles[2].Width >= 25, "Translate action should have enough column width so the label is not clipped.");
    }

    private static void TrimFormGivesArabicSubtitleActionsEnoughWidth()
    {
        LoaderlyLanguage.Set(LoaderlyLanguage.Arabic);
        try
        {
            using var form = new TrimForm(@"C:\missing.mp4", "Missing", new TrimExportService(), new AppSettings());
            var button = Descendants(form).First(control => control.Text == "ترجمة");
            var layout = (System.Windows.Forms.TableLayoutPanel)button.Parent!;
            var texts = Descendants(form).Select(control => control.Text).ToList();

            Check(layout.ColumnStyles.Cast<System.Windows.Forms.ColumnStyle>().All(style => style.Width >= 25), "Arabic subtitle actions should use balanced columns so labels are not clipped.");
            Check(texts.Any(text => text.StartsWith("الاختصارات", StringComparison.Ordinal)), "Arabic trim panel should not show Shortcuts in English.");
        }
        finally
        {
            LoaderlyLanguage.Set(LoaderlyLanguage.English);
        }
    }

    private static void TrimFormHasAiSubtitleTranslationControl()
    {
        using var form = new TrimForm(@"C:\missing.mp4", "Missing", new TrimExportService(), new AppSettings());
        var texts = Descendants(form).Select(control => control.Text).ToHashSet(StringComparer.OrdinalIgnoreCase);
        Check(texts.Contains("Translate"), "Trim panel should allow translating the loaded subtitle file with AI.");
    }

    private static void TrimFormUsesProfessionalTranslateState()
    {
        Check(TrimForm.IsTargetAiSubtitlePathForTest(@"C:\video.en.ai-arabic.srt", "Arabic"), "Loaded Arabic AI subtitles should be recognized as already translated.");
        Check(TrimForm.IsTargetAiSubtitlePathForTest(@"C:\video.en.clip-000048-000058.ai-arabic.srt", "Arabic"), "Clip-specific Arabic AI subtitles should be recognized as already translated.");
        Check(!TrimForm.IsTargetAiSubtitlePathForTest(@"C:\video.en.ai-english.srt", "Arabic"), "A different AI target language should remain translatable.");

        var translated = TrimForm.TranslateButtonStateForTest(hasSubtitles: true, loadedTranslation: true, savedTranslationExists: false);
        Check(translated.Text == "Translated" && !translated.Enabled, "Translate button should be disabled once the current subtitles are already translated.");

        var saved = TrimForm.TranslateButtonStateForTest(hasSubtitles: true, loadedTranslation: false, savedTranslationExists: true);
        Check(saved.Text == "Use saved" && saved.Enabled, "Translate button should load an existing translation instead of translating again.");
    }

    private static void SubtitlePreferencesMapToYtDlpLanguages()
    {
        Check(SubtitleLanguagePreference.OptionLabels[0] == SubtitleLanguagePreference.Original, "Original subtitle language should be the default subtitle mode.");
        Check(SubtitleLanguagePreference.IsOriginalSource(SubtitleLanguagePreference.DefaultLanguages), "Default subtitle preference should mean original video subtitles.");
        Check(SubtitleLanguagePreference.ValueForSelection("Arabic", string.Empty) == "ar,-live_chat", "Arabic should request Arabic subtitles only.");
        Check(SubtitleLanguagePreference.ValueForSelection("English", string.Empty) == "en,-live_chat", "English should request English subtitles only.");
        Check(SubtitleLanguagePreference.ValueForSelection("Arabic + English", string.Empty) == "ar,en,-live_chat", "Arabic + English should request both languages.");
        Check(SubtitleLanguagePreference.ValueForSelection(SubtitleLanguagePreference.Custom, "ja,ko") == "ja,ko,-live_chat", "Custom language codes should preserve the user languages and exclude live chat.");
    }

    private static void SubtitleFailuresCanRetryWithoutSubtitles()
    {
        var error = "ERROR: Unable to download video subtitles for 'ab-en-nP7-2PuI7o': HTTP Error 429: Too Many Requests";
        Check(MediaDownloadService.IsSubtitleDownloadFailure(error), "Subtitle 429 should be classified as a recoverable subtitle failure.");
    }

    private static void LegacyAllSubtitlePreferenceMigratesToSaferDefault()
    {
        var settings = new AppSettings
        {
            SubtitleLanguages = "all,-live_chat",
            SubtitlePreferenceConfigured = false
        };

        AppSettingsStore.NormalizeForRuntime(settings);
        Check(settings.SubtitleLanguages == SubtitleLanguagePreference.DefaultLanguages, "Old all-subtitle defaults should migrate to original video subtitles.");

        settings.SubtitleLanguages = "all,-live_chat";
        settings.SubtitlePreferenceConfigured = true;
        AppSettingsStore.NormalizeForRuntime(settings);
        Check(settings.SubtitleLanguages == "all,-live_chat", "User-selected All subtitles should be preserved.");
    }

    private static void OriginalSubtitleLanguageResolverUsesTheVideoLanguageFirst()
    {
        const string json = """
{
  "language": "en",
  "subtitles": {
    "ar": [{"ext": "vtt"}],
    "en": [{"ext": "vtt"}]
  },
  "automatic_captions": {
    "fr": [{"ext": "vtt"}]
  }
}
""";

        Check(OriginalSubtitleLanguageResolver.ResolveFromJsonForTest(json) == "en", "Original subtitle resolver should prefer the video's own language when that caption exists.");
    }

    private static void OriginalSubtitleLanguageResolverFallsBackToAvailableCaptions()
    {
        const string json = """
{
  "subtitles": {},
  "automatic_captions": {
    "live_chat": [{"ext": "json"}],
    "ja": [{"ext": "vtt"}]
  }
}
""";

        Check(OriginalSubtitleLanguageResolver.ResolveFromJsonForTest(json) == "ja", "Original subtitle resolver should fall back to the first non-live caption language.");
    }

    private static void SrtSubtitlesAreParsedAndMatchedByPlaybackTime()
    {
        const string srt = """
1
00:00:01,000 --> 00:00:03,500
Hello <i>world</i>

2
00:00:04,000 --> 00:00:06,000
مرحبا
""";

        var cues = SrtSubtitleService.Parse(srt);
        Check(cues.Count == 2, "SRT parser should read two cues.");
        Check(SrtSubtitleService.TextAt(cues, TimeSpan.FromSeconds(2)) == "Hello world", "Subtitle should be visible inside its time range.");
        Check(SrtSubtitleService.TextAt(cues, TimeSpan.FromSeconds(5)) == "مرحبا", "Arabic subtitle should be preserved.");
        Check(SrtSubtitleService.TextAt(cues, TimeSpan.FromSeconds(7)).Length == 0, "Subtitle should disappear outside cue ranges.");
    }

    private static void SrtSubtitlesPreferConfiguredLanguageFile()
    {
        var directory = Path.Combine(Path.GetTempPath(), $"loaderly-subtitles-{Guid.NewGuid():N}");
        Directory.CreateDirectory(directory);
        try
        {
            var mediaPath = Path.Combine(directory, "sample [abc123].mp4");
            var arabicPath = Path.Combine(directory, "sample [abc123].ar.srt");
            var englishPath = Path.Combine(directory, "sample [abc123].en.srt");
            File.WriteAllText(mediaPath, string.Empty);
            File.WriteAllText(arabicPath, string.Empty);
            File.WriteAllText(englishPath, string.Empty);

            Check(
                SrtSubtitleService.FindSubtitleFile(mediaPath, "en,ar,-live_chat") == englishPath,
                "Subtitle lookup should prefer the configured language order.");
        }
        finally
        {
            Directory.Delete(directory, recursive: true);
        }
    }

    private static void WebVttSubtitlesAreParsedAndMatchedByPlaybackTime()
    {
        const string vtt = """
WEBVTT

00:01.000 --> 00:03.000 align:center
Hello <c>VTT</c>

00:04.000 --> 00:06.000
Second line
""";

        var cues = SrtSubtitleService.Parse(vtt);
        Check(cues.Count == 2, "WebVTT parser should read cue blocks.");
        Check(SrtSubtitleService.TextAt(cues, TimeSpan.FromSeconds(2)) == "Hello VTT", "WebVTT subtitle should be visible inside its time range.");
        Check(SrtSubtitleService.TextAt(cues, TimeSpan.FromSeconds(5)) == "Second line", "WebVTT parser should read later cue blocks.");
    }

    private static void SubtitleLookupAcceptsWebVttWhenSrtIsMissing()
    {
        var directory = Path.Combine(Path.GetTempPath(), $"loaderly-vtt-subtitles-{Guid.NewGuid():N}");
        Directory.CreateDirectory(directory);
        try
        {
            var mediaPath = Path.Combine(directory, "sample [abc123].mp4");
            var englishPath = Path.Combine(directory, "sample [abc123].en.vtt");
            File.WriteAllText(mediaPath, string.Empty);
            File.WriteAllText(englishPath, string.Empty);

            Check(
                SrtSubtitleService.FindSubtitleFile(mediaPath, "en,ar,-live_chat") == englishPath,
                "Subtitle lookup should accept WebVTT files when SRT files are missing.");
        }
        finally
        {
            Directory.Delete(directory, recursive: true);
        }
    }

    private static void CompactOneLineSubtitlesAreParsedAndFormattedIntoCues()
    {
        const string compact = "100:00:00,233 --> 00:00:03,233[clock ticking]200:00:03,233 --> 00:00:08,233[SFX: tires squealing]\\nNot tryna be indie";
        var cues = SrtSubtitleService.Parse(compact);

        Check(cues.Count == 2, "Compact one-line subtitles should be split into separate cues.");
        Check(cues[0].Text == "[clock ticking]", "First compact cue should preserve its subtitle text.");
        Check(cues[1].Text.Contains("Not tryna", StringComparison.Ordinal), "Literal escaped newlines should become readable cue text.");
        Check(SrtSubtitleService.FormatForPath(cues, "sample.srt").Contains("\r\n\r\n2\r\n", StringComparison.Ordinal), "Formatted subtitles should be written as readable cue blocks.");
    }

    private static void SubtitleLookupClearsAtCueEnd()
    {
        var cues = new[]
        {
            new SubtitleCue(TimeSpan.FromSeconds(1), TimeSpan.FromSeconds(2), "Old"),
            new SubtitleCue(TimeSpan.FromSeconds(3), TimeSpan.FromSeconds(4), "New")
        };

        Check(SrtSubtitleService.TextAt(cues, TimeSpan.FromSeconds(2)).Length == 0, "Subtitle lookup should clear text exactly at cue end.");
    }

    private static void SubtitleRangeFilteringKeepsOnlySelectedClipCues()
    {
        var cues = new[]
        {
            new SubtitleCue(TimeSpan.FromSeconds(1), TimeSpan.FromSeconds(4), "Starts before clip"),
            new SubtitleCue(TimeSpan.FromSeconds(5), TimeSpan.FromSeconds(8), "Inside clip"),
            new SubtitleCue(TimeSpan.FromSeconds(9), TimeSpan.FromSeconds(12), "Ends after clip"),
            new SubtitleCue(TimeSpan.FromSeconds(14), TimeSpan.FromSeconds(16), "Outside clip")
        };

        var selected = SrtSubtitleService.CuesForRange(cues, TimeSpan.FromSeconds(3), TimeSpan.FromSeconds(10));

        Check(selected.Count == 3, "Subtitle translation should use only cues that overlap the selected trim.");
        Check(selected[0].Start == TimeSpan.FromSeconds(3) && selected[0].End == TimeSpan.FromSeconds(4), "Range filtering should clip cues that start before the trim.");
        Check(selected[1].Start == TimeSpan.FromSeconds(5) && selected[1].End == TimeSpan.FromSeconds(8), "Range filtering should preserve cue timing inside the trim.");
        Check(selected[2].Start == TimeSpan.FromSeconds(9) && selected[2].End == TimeSpan.FromSeconds(10), "Range filtering should clip cues that end after the trim.");
    }

    private static void SubtitleEditorUsesStructuredEditingSurface()
    {
        var path = Path.Combine(Path.GetTempPath(), $"loaderly-editor-{Guid.NewGuid():N}.srt");
        try
        {
            File.WriteAllText(path, "1\r\n00:00:01,000 --> 00:00:02,000\r\nHello");
            using var form = new SubtitleEditorForm(path, @"C:\missing.mp4", new SubtitleStyle(), TimeSpan.FromSeconds(10), TimeSpan.FromSeconds(20));
            var texts = Descendants(form).Select(control => control.Text).ToHashSet(StringComparer.OrdinalIgnoreCase);

            Check(texts.Contains("Cues"), "Subtitle editor should have a cue list.");
            Check(texts.Contains("Preview"), "Subtitle editor should have an integrated video preview.");
            Check(texts.Contains("Style"), "Subtitle editor should expose subtitle style controls.");
            Check(Descendants(form).OfType<System.Windows.Forms.TextBox>().Any(control => control.PlaceholderText == "Search fonts"), "Subtitle editor should allow searching installed fonts.");
            Check(texts.Contains("Text color"), "Subtitle editor should allow changing text color.");
            Check(texts.Contains("Background"), "Subtitle editor should allow changing subtitle background.");
        }
        finally
        {
            if (File.Exists(path))
            {
                File.Delete(path);
            }
        }
    }

    private static void SubtitleEditorLocalizesArabicSectionTitles()
    {
        LoaderlyLanguage.Set(LoaderlyLanguage.Arabic);
        var path = Path.Combine(Path.GetTempPath(), $"loaderly-editor-ar-{Guid.NewGuid():N}.srt");
        try
        {
            File.WriteAllText(path, "1\r\n00:00:01,000 --> 00:00:03,000\r\nمرحبا");
            using var form = new SubtitleEditorForm(path, @"C:\missing.mp4", new SubtitleStyle(), TimeSpan.Zero, TimeSpan.FromSeconds(5));
            var texts = Descendants(form).Select(control => control.Text).ToHashSet(StringComparer.Ordinal);

            Check(texts.Contains("السطور"), "Arabic subtitle editor should translate Cues.");
            Check(texts.Contains("المعاينة"), "Arabic subtitle editor should translate Preview.");
            Check(!texts.Contains("Cues"), "Arabic subtitle editor should not show Cues in English.");
            Check(!texts.Contains("Preview"), "Arabic subtitle editor should not show Preview in English.");
        }
        finally
        {
            LoaderlyLanguage.Set(LoaderlyLanguage.English);
            if (File.Exists(path))
            {
                File.Delete(path);
            }
        }
    }

    private static void SubtitleEditorOffersStylePresets()
    {
        var path = Path.Combine(Path.GetTempPath(), $"loaderly-editor-presets-{Guid.NewGuid():N}.srt");
        try
        {
            File.WriteAllText(path, "1\r\n00:00:01,000 --> 00:00:03,000\r\nHello");
            using var form = new SubtitleEditorForm(path, @"C:\missing.mp4", new SubtitleStyle(), TimeSpan.Zero, TimeSpan.FromSeconds(5));
            var presetSelect = Descendants(form)
                .OfType<ModernSelect>()
                .FirstOrDefault(select =>
                    select.Items.Contains("Default") &&
                    select.Items.Contains("Cinematic") &&
                    select.Items.Contains("Arabic large") &&
                    select.Items.Contains("Caption box"));

            Check(presetSelect is not null, "Subtitle editor should provide style presets instead of requiring every style field to be tuned manually.");
            Check(Descendants(form).Any(control => control.Text == "Preset"), "Subtitle editor should label the preset selector clearly.");
        }
        finally
        {
            if (File.Exists(path))
            {
                File.Delete(path);
            }
        }
    }

    private static void SubtitleEditorAppliesStylePresets()
    {
        var style = new SubtitleStyle
        {
            FontFamily = "Segoe UI",
            FontSize = 18,
            Bold = false,
            TextColor = "#CCCCCC",
            BackgroundColor = "#111111",
            BackgroundOpacity = 25
        };

        var applied = SubtitleEditorForm.ApplyStylePresetForTest("Arabic large", style);
        Check(applied.FontSize >= 32, "Arabic large preset should make subtitles readable from a distance.");
        Check(applied.Bold, "Arabic large preset should use bold subtitles.");
        Check(applied.BackgroundOpacity >= 70, "Arabic large preset should keep a readable background box.");

        var clean = SubtitleEditorForm.ApplyStylePresetForTest("Default", applied);
        Check(clean.FontSize == 24 && clean.BackgroundOpacity == 70, "Default preset should restore Loaderly's balanced caption style.");
    }

    private static void SubtitleEditorSupportsMultiCueSelectionForDelete()
    {
        var visible = new[] { 0, 1, 2, 3 };
        var first = SubtitleEditorForm.CueSelectionAfterClickForTest([], -1, -1, 1, ctrl: false, shift: false, visible);
        var range = SubtitleEditorForm.CueSelectionAfterClickForTest(first.SelectedIndices, first.AnchorIndex, first.PrimaryIndex, 3, ctrl: false, shift: true, visible);
        var toggled = SubtitleEditorForm.CueSelectionAfterClickForTest(range.SelectedIndices, range.AnchorIndex, range.PrimaryIndex, 2, ctrl: true, shift: false, visible);
        var remaining = SubtitleEditorForm.RemainingCueIndicesAfterDeleteForTest(visible, toggled.SelectedIndices);

        Check(first.SelectedIndices.SequenceEqual([1]) && first.AnchorIndex == 1, "Plain click should select one cue and set the range anchor.");
        Check(range.SelectedIndices.SequenceEqual([1, 2, 3]) && range.AnchorIndex == 1, "Shift click should select every visible cue between the anchor and clicked cue.");
        Check(toggled.SelectedIndices.SequenceEqual([1, 3]), "Ctrl click should toggle one cue inside the current selection.");
        Check(remaining.SequenceEqual([0, 2]), "Deleting a multi-selection should remove every selected cue.");
    }

    private static void SubtitleEditorUsesModernScrollAndTimelineControls()
    {
        var path = Path.Combine(Path.GetTempPath(), $"loaderly-editor-modern-{Guid.NewGuid():N}.srt");
        try
        {
            File.WriteAllText(path, "1\r\n00:00:12,000 --> 00:00:14,000\r\nInside clip");
            using var form = new SubtitleEditorForm(path, @"C:\missing.mp4", new SubtitleStyle(), TimeSpan.FromSeconds(10), TimeSpan.FromSeconds(20));
            var descendants = Descendants(form).ToList();

            Check(!descendants.Any(control => control is System.Windows.Forms.ListBox), "Subtitle editor should not use native ListBox scrollbars.");
            Check(descendants.Count(control => control is ModernScrollPanel) >= 2, "Subtitle editor should use custom dark scroll panels for cues and fonts.");
            Check(descendants.Any(control => control is ModernRangeTimeline), "Subtitle editor should use the same timeline control as trim.");
            Check(descendants.Any(control => control.Text.Contains("Clip 0:10 - 0:20", StringComparison.OrdinalIgnoreCase)), "Subtitle editor should show the active trim range.");
        }
        finally
        {
            if (File.Exists(path))
            {
                File.Delete(path);
            }
        }
    }

    private static void SubtitleEditorUsesDoubleBufferedRendering()
    {
        var path = Path.Combine(Path.GetTempPath(), $"loaderly-editor-buffered-{Guid.NewGuid():N}.srt");
        try
        {
            File.WriteAllText(path, "1\r\n00:00:01,000 --> 00:00:02,000\r\nHello");
            using var form = new SubtitleEditorForm(path, @"C:\missing.mp4", new SubtitleStyle(), TimeSpan.Zero, TimeSpan.FromSeconds(5));
            Check(IsDoubleBuffered(form), "Subtitle editor should use double buffering to reduce opening and repaint flicker.");
        }
        finally
        {
            if (File.Exists(path))
            {
                File.Delete(path);
            }
        }
    }

    private static void SubtitleEditorOrdersCuesFromClipStartDown()
    {
        var path = Path.Combine(Path.GetTempPath(), $"loaderly-editor-order-{Guid.NewGuid():N}.srt");
        try
        {
            File.WriteAllText(path, "1\r\n00:00:48,000 --> 00:00:50,000\r\nFirst\r\n\r\n2\r\n00:00:55,000 --> 00:00:58,000\r\nSecond");
            using var form = new SubtitleEditorForm(path, @"C:\missing.mp4", new SubtitleStyle(), TimeSpan.FromSeconds(48), TimeSpan.FromSeconds(58));
            form.CreateControl();
            form.PerformLayout();

            var cueButtons = Descendants(form)
                .OfType<ModernButton>()
                .Where(button => button.Text.Contains("First", StringComparison.Ordinal) || button.Text.Contains("Second", StringComparison.Ordinal))
                .OrderBy(button => button.Top)
                .ToList();

            Check(cueButtons.Count == 2, "Subtitle editor should render both clip cues.");
            Check(cueButtons[0].Text.Contains("0:00", StringComparison.Ordinal) && cueButtons[0].Text.Contains("First", StringComparison.Ordinal), "Subtitle editor should list cues from 0:00 downward, not newest cue first.");
        }
        finally
        {
            if (File.Exists(path))
            {
                File.Delete(path);
            }
        }
    }

    private static void SubtitleEditorRightAlignsArabicCueText()
    {
        var path = Path.Combine(Path.GetTempPath(), $"loaderly-editor-arabic-{Guid.NewGuid():N}.srt");
        try
        {
            File.WriteAllText(path, "1\r\n00:00:01,000 --> 00:00:03,000\r\nوأريد أن أشعرك أيضا");
            using var form = new SubtitleEditorForm(path, @"C:\missing.mp4", new SubtitleStyle(), TimeSpan.Zero, TimeSpan.FromSeconds(5));
            var editor = Descendants(form)
                .OfType<System.Windows.Forms.TextBox>()
                .First(textBox => textBox.Multiline && textBox.Text.Contains("أشعرك", StringComparison.Ordinal));

            Check(editor.RightToLeft == System.Windows.Forms.RightToLeft.Yes, "Arabic subtitle text should be edited right-to-left.");
            Check(editor.TextAlign == System.Windows.Forms.HorizontalAlignment.Right, "Arabic subtitle text should be right aligned in the editor.");
        }
        finally
        {
            if (File.Exists(path))
            {
                File.Delete(path);
            }
        }
    }

    private static void SubtitleEditorDisablesPlayUntilPreviewReady()
    {
        var path = Path.Combine(Path.GetTempPath(), $"loaderly-editor-play-{Guid.NewGuid():N}.srt");
        try
        {
            File.WriteAllText(path, "1\r\n00:00:01,000 --> 00:00:03,000\r\nHello");
            using var form = new SubtitleEditorForm(path, @"C:\missing.mp4", new SubtitleStyle(), TimeSpan.Zero, TimeSpan.FromSeconds(5));
            var play = Descendants(form)
                .OfType<ModernButton>()
                .First(button => button.Text == "Play");

            Check(!play.Enabled, "Subtitle editor Play should stay disabled until the video preview is ready.");
        }
        finally
        {
            if (File.Exists(path))
            {
                File.Delete(path);
            }
        }
    }

    private static void SubtitleEditorPrimesVideoPreviewAfterMediaOpen()
    {
        Check(SubtitleEditorForm.PreviewPrimeDelayMillisecondsForTest >= 50, "Subtitle editor should briefly prime the video after media opens so the first frame is not black.");
    }

    private static void SubtitleEditorStartsManualMediaLoading()
    {
        Check(SubtitleEditorForm.StartsManualMediaLoadForTest, "Subtitle editor should call Play after setting Source because WPF Manual media does not reliably open from Source alone.");
    }

    private static void SubtitleEditorLoadsPreviewVideoWhenEnvironmentProvidesSample()
    {
        var videoPath = Environment.GetEnvironmentVariable("LOADERLY_PREVIEW_TEST_VIDEO");
        var subtitlePath = Environment.GetEnvironmentVariable("LOADERLY_PREVIEW_TEST_SUBTITLE");
        if (string.IsNullOrWhiteSpace(videoPath) ||
            string.IsNullOrWhiteSpace(subtitlePath) ||
            !File.Exists(videoPath) ||
            !File.Exists(subtitlePath))
        {
            return;
        }

        using var form = new SubtitleEditorForm(
            subtitlePath,
            videoPath,
            new SubtitleStyle(),
            TimeSpan.FromSeconds(48),
            TimeSpan.FromSeconds(58));
        form.StartPosition = System.Windows.Forms.FormStartPosition.Manual;
        form.Location = new System.Drawing.Point(-32000, -32000);
        form.Show();
        try
        {
            var playButton = Descendants(form)
                .OfType<ModernButton>()
                .First(button => button.Text == "Play");
            var ready = false;
            for (var i = 0; i < 80; i++)
            {
                System.Windows.Forms.Application.DoEvents();
                Thread.Sleep(100);
                if (playButton.Enabled)
                {
                    ready = true;
                    break;
                }
            }

            Check(ready, "Subtitle editor preview should load the sample video and enable Play.");
        }
        finally
        {
            form.Close();
        }
    }

    private static void SubtitleEditorMapsClippedPreviewPlaybackToOriginalTimeline()
    {
        var offset = TimeSpan.FromSeconds(48);

        Check(SubtitleEditorForm.MediaPositionForTest(TimeSpan.FromSeconds(48), offset) == TimeSpan.Zero, "A clipped preview should seek to 0 when editing the original clip start.");
        Check(SubtitleEditorForm.MediaPositionForTest(TimeSpan.FromSeconds(50), offset) == TimeSpan.FromSeconds(2), "A clipped preview should subtract its original media offset before seeking.");
        Check(SubtitleEditorForm.MediaPositionForTest(TimeSpan.FromSeconds(40), offset) == TimeSpan.Zero, "Preview seek positions should not become negative before the clip offset.");
        Check(SubtitleEditorForm.AbsolutePositionForTest(TimeSpan.FromSeconds(2), offset) == TimeSpan.FromSeconds(50), "Preview playback time should map back to the original subtitle timeline.");
    }

    private static void SubtitleEditorSupportsTrimPlaybackShortcuts()
    {
        Check(SubtitleEditorForm.IsPlaybackShortcutForTest(System.Windows.Forms.Keys.Space), "Subtitle editor should support Space to play/pause preview.");
        Check(SubtitleEditorForm.IsPlaybackShortcutForTest(System.Windows.Forms.Keys.Left), "Subtitle editor should support Left to step backward.");
        Check(SubtitleEditorForm.IsPlaybackShortcutForTest(System.Windows.Forms.Keys.Shift | System.Windows.Forms.Keys.Right), "Subtitle editor should support Shift+Right to jump forward.");
        Check(SubtitleEditorForm.IsPlaybackShortcutForTest(System.Windows.Forms.Keys.Control | System.Windows.Forms.Keys.Shift | System.Windows.Forms.Keys.Left), "Subtitle editor should support Ctrl+Shift+Left frame stepping.");
        Check(SubtitleEditorForm.IsPlaybackShortcutForTest(System.Windows.Forms.Keys.Home), "Subtitle editor should support Home for clip start.");
        Check(SubtitleEditorForm.IsPlaybackShortcutForTest(System.Windows.Forms.Keys.End), "Subtitle editor should support End for clip end.");
    }

    private static void SubtitleEditorUsesFullSubtitleRangeWhenNoTrimIsSet()
    {
        var path = Path.Combine(Path.GetTempPath(), $"loaderly-editor-full-{Guid.NewGuid():N}.srt");
        try
        {
            File.WriteAllText(path, "1\r\n00:12:00,000 --> 00:12:05,000\r\nLate subtitle");
            using var form = new SubtitleEditorForm(path, @"C:\missing.mp4", new SubtitleStyle(), TimeSpan.Zero, TimeSpan.MaxValue);
            var texts = Descendants(form).Select(control => control.Text).ToList();

            Check(texts.Any(text => text.Contains("Clip 0:00 - 12:05", StringComparison.OrdinalIgnoreCase)), "Subtitle editor should use the full subtitle duration when no trim range is set.");
        }
        finally
        {
            if (File.Exists(path))
            {
                File.Delete(path);
            }
        }
    }

    private static void TrimFormOpensSubtitleEditorWithoutBlockingPreviewExport()
    {
        Check(!TrimForm.ShouldCreateSubtitlePreviewClipForTest(TimeSpan.FromSeconds(48), TimeSpan.FromSeconds(58), TimeSpan.FromSeconds(337)), "Subtitle editor should not block opening by exporting a temporary preview first.");
        Check(!TrimForm.ShouldCreateSubtitlePreviewClipForTest(TimeSpan.Zero, TimeSpan.FromSeconds(337), TimeSpan.FromSeconds(337)), "Subtitle editor should use the original file when the full video is selected.");
    }

    private static void TrimFormReleasesPreviewBeforeSubtitleEditor()
    {
        using var form = new TrimForm(@"C:\missing.mp4", "Missing", new TrimExportService(), new AppSettings());
        var playerField = typeof(TrimForm).GetField("player", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic);
        Check(playerField is not null, "Trim form should own a preview player.");

        dynamic player = playerField!.GetValue(form)!;
        player.Source = new Uri(@"C:\missing.mp4");

        var release = typeof(TrimForm).GetMethod("ReleasePreviewForSubtitleEditor", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic);
        Check(release is not null, "Trim form should release its preview before opening the subtitle editor.");
        release!.Invoke(form, []);

        Check(player.Source is null, "Trim preview source should be cleared while the subtitle editor owns the media file.");
    }

    private static void TrimFormMaximizedStatePropagatesToSubtitleEditor()
    {
        var method = typeof(TrimForm).GetMethod(
            "SubtitleEditorWindowStateForParentForTest",
            System.Reflection.BindingFlags.Static | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic);
        Check(method is not null, "Trim form should expose subtitle editor window state inheritance for verification.");

        var maximized = (System.Windows.Forms.FormWindowState)method!.Invoke(null, [System.Windows.Forms.FormWindowState.Maximized])!;
        var normal = (System.Windows.Forms.FormWindowState)method.Invoke(null, [System.Windows.Forms.FormWindowState.Normal])!;
        Check(maximized == System.Windows.Forms.FormWindowState.Maximized, "Subtitle editor should open maximized when the trim window is maximized.");
        Check(normal == System.Windows.Forms.FormWindowState.Normal, "Subtitle editor should keep normal state when the trim window is normal.");
    }

    private static void SubtitleBurnInAssIsTrimmedAndStyled()
    {
        var cues = new[]
        {
            new SubtitleCue(TimeSpan.FromSeconds(1), TimeSpan.FromSeconds(4), "First"),
            new SubtitleCue(TimeSpan.FromSeconds(5), TimeSpan.FromSeconds(8), "Second line")
        };
        var style = new SubtitleStyle
        {
            FontFamily = "Arial",
            FontSize = 28,
            Bold = true,
            TextColor = "#FFCC00",
            BackgroundColor = "#101820",
            BackgroundOpacity = 70
        };

        var ass = SubtitleBurnInService.BuildAss(cues, TimeSpan.FromSeconds(2), TimeSpan.FromSeconds(6), style);

        Check(ass.Contains("Style: Loaderly,Arial,56", StringComparison.Ordinal), "ASS style should use configured font and size.");
        Check(ass.Contains("Dialogue: 0,0:00:00.00,0:00:02.00,Loaderly,,0,0,48,,First", StringComparison.Ordinal), "Overlapping cues should be clipped to the trim start.");
        Check(ass.Contains("Dialogue: 0,0:00:03.00,0:00:04.00,Loaderly,,0,0,48,,Second line", StringComparison.Ordinal), "Overlapping cues should be clipped to the trim end.");
    }

    private static void TrimExportArgumentsBurnInSubtitlesWhenEnabled()
    {
        var options = new TrimExportOptions(
            MuteAudio: false,
            Quality: TrimExportQuality.High,
            SubtitleBurnIn: new SubtitleBurnInOptions(@"C:\Temp\loaderly-test.ass", new SubtitleStyle()));

        var arguments = TrimExportService.ExportArgumentsForTest(
            @"C:\video.mp4",
            TimeSpan.Zero,
            TimeSpan.FromSeconds(5),
            @"C:\out.mp4",
            options,
            @"C:\Temp\loaderly-test.ass");

        Check(arguments.Contains("-vf"), "Subtitle export should add a video filter.");
        Check(arguments.Any(argument => argument.StartsWith("ass=", StringComparison.Ordinal)), "Subtitle export should use the ASS burn-in filter.");
    }

    private static void TrimExportSeeksBeforeInputWhenBurningSubtitles()
    {
        var options = new TrimExportOptions(
            MuteAudio: false,
            Quality: TrimExportQuality.High,
            SubtitleBurnIn: new SubtitleBurnInOptions(@"C:\Temp\loaderly-test.ass", new SubtitleStyle()));

        var arguments = TrimExportService.ExportArgumentsForTest(
            @"C:\video.mp4",
            TimeSpan.FromSeconds(48),
            TimeSpan.FromSeconds(58),
            @"C:\out.mp4",
            options,
            @"C:\Temp\loaderly-test.ass");

        var argumentList = arguments.ToList();
        var seekIndex = argumentList.IndexOf("-ss");
        var inputIndex = argumentList.IndexOf("-i");
        Check(seekIndex >= 0 && inputIndex >= 0 && seekIndex < inputIndex, "Subtitle burn-in export should seek before input so generated ASS subtitles line up with the clipped video.");
    }

    private static void SettingsFormHasOpenRouterSubtitleTranslationSettings()
    {
        using var form = new SettingsForm(new AppSettings());
        var texts = Descendants(form).Select(control => control.Text).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var textBoxes = Descendants(form).OfType<System.Windows.Forms.TextBox>().ToList();
        var languageList = Descendants(form).OfType<System.Windows.Forms.ListBox>().FirstOrDefault(list => list.Items.Contains("Arabic"));

        Check(texts.Contains("AI subtitle translation"), "Settings should expose AI subtitle translation settings.");
        Check(textBoxes.Any(control => control.PlaceholderText.Contains("OpenRouter API key", StringComparison.OrdinalIgnoreCase)), "Settings should allow entering an OpenRouter API key.");
        Check(textBoxes.Any(control => control.PlaceholderText.Contains("OpenRouter model", StringComparison.OrdinalIgnoreCase)), "Settings should allow entering the user's chosen OpenRouter model.");
        Check(texts.Contains("Translate subtitles to"), "Settings should describe the AI subtitle target language clearly.");
        Check(textBoxes.Any(control => control.PlaceholderText.Contains("Type a language", StringComparison.OrdinalIgnoreCase)), "Settings should allow directly typing the target language.");
        Check(languageList is not null && languageList.Items.Contains("Arabic"), "Settings should offer searchable language suggestions.");
    }

    private static void ArabicLanguageMapsAdvancedFeatureLabels()
    {
        LoaderlyLanguage.Set(LoaderlyLanguage.Arabic);
        try
        {
            foreach (var label in new[]
            {
                "About",
                "Logs",
                "Preset",
                "Burn in subtitles",
                "Sidecar SRT",
                "No subtitles",
                "First run setup"
            })
            {
                Check(LoaderlyLanguage.Text(label) != label, $"Arabic UI should translate '{label}'.");
            }
        }
        finally
        {
            LoaderlyLanguage.Set(LoaderlyLanguage.English);
        }
    }

    private static void DownloadFailuresAreHumanReadable()
    {
        var subtitleRateLimit = MainForm.FriendlyDownloadErrorForTest("ERROR: Unable to download subtitles: HTTP Error 429: Too Many Requests");
        var missingTool = MainForm.FriendlyDownloadErrorForTest("'yt-dlp' is not recognized as an internal or external command");
        var timeout = MainForm.FriendlyDownloadErrorForTest("The operation has timed out while contacting the server");
        var stuckFolder = MainForm.FriendlyDownloadErrorForTest(@"Download folder did not respond: F:\");

        Check(subtitleRateLimit.Contains("subtitles", StringComparison.OrdinalIgnoreCase), "Subtitle failures should explain the subtitle-specific retry path.");
        Check(missingTool.Contains("Tools", StringComparison.OrdinalIgnoreCase), "Missing downloader tools should point the user to Tools.");
        Check(timeout.Contains("connection", StringComparison.OrdinalIgnoreCase), "Network timeouts should be explained as connection issues.");
        Check(stuckFolder.Contains("folder", StringComparison.OrdinalIgnoreCase), "Unresponsive download folders should ask the user to choose another folder.");
    }

    private static void DownloadFolderProbeTimesOutWhenStorageDoesNotRespond()
    {
        var startedAt = DateTimeOffset.UtcNow;
        var timedOut = false;
        try
        {
            MediaDownloadService.RunWithTimeoutForTest(
                () => Task.Delay(Timeout.InfiniteTimeSpan),
                TimeSpan.FromMilliseconds(50),
                CancellationToken.None,
                "probe timeout").GetAwaiter().GetResult();
        }
        catch (TimeoutException)
        {
            timedOut = true;
        }

        Check(timedOut, "Destination folder probe should time out instead of waiting forever on an unresponsive drive.");
        Check(DateTimeOffset.UtcNow - startedAt < TimeSpan.FromSeconds(2), "Destination folder timeout should return control quickly.");
        Check(MediaDownloadService.DestinationFolderProbeTimeoutMillisecondsForTest <= 8000, "Real download folder probe should not leave the queue stuck for a long OS timeout.");
    }

    private static void PlaylistDownloadOutputKeepsEachItemTitle()
    {
        var directory = Path.Combine(AppContext.BaseDirectory, "PlaylistOutputPairing");
        Directory.CreateDirectory(directory);
        var first = Path.Combine(directory, "first.mp4");
        var second = Path.Combine(directory, "second.mp4");
        File.WriteAllText(first, string.Empty);
        File.WriteAllText(second, string.Empty);

        var results = MediaDownloadService.ResultsForOutputForTest([
            first,
            "First playlist video",
            second,
            "Second playlist video"
        ]);

        Check(results.Count == 2, "Playlist output should produce one result per downloaded file.");
        Check(results[0].Title == "First playlist video", "Playlist output should keep the first item's title with the first file.");
        Check(results[1].Title == "Second playlist video", "Playlist output should keep the second item's title with the second file.");
    }

    private static void MainFormHasAboutAndDiagnosticsEntryPoints()
    {
        var actions = MainForm.SidebarActionsForTest();
        Check(actions.Contains("About"), "Sidebar should expose About so release and update details are easy to find.");
        Check(actions.Contains("Logs"), "Sidebar should expose logs for support and troubleshooting.");

        var about = MainForm.AboutTextForTest();
        Check(about.Contains(ProductInfo.DisplayVersion, StringComparison.Ordinal), "About text should include the current version.");
        Check(about.Contains(ProductInfo.ReleasesUri.ToString(), StringComparison.OrdinalIgnoreCase), "About text should show the release source used by updates.");
    }

    private static void NewInstallStartsFirstRunSetup()
    {
        var firstRunSettings = AppSettingsStore.NewInstallDefaultsForTest();
        Check(!firstRunSettings.FirstRunComplete, "A brand-new install should show first-run setup.");

        FirstRunSetup.ApplyForTest(firstRunSettings, LoaderlyLanguage.Arabic, @"C:\LoaderlyDownloads");
        Check(firstRunSettings.FirstRunComplete, "First-run setup should mark itself complete after applying choices.");
        Check(firstRunSettings.AppLanguage == LoaderlyLanguage.Arabic, "First-run setup should save the selected language.");
        Check(firstRunSettings.DownloadFolder == @"C:\LoaderlyDownloads", "First-run setup should save the selected download folder.");
    }

    private static void AppLogFormatsDiagnosticsEntries()
    {
        var entry = AppLog.FormatEntryForTest(new DateTimeOffset(2026, 5, 14, 8, 30, 0, TimeSpan.Zero), "Download failed");
        Check(AppLog.LogFilePathForTest.EndsWith(Path.Combine("logs", "loaderly.log"), StringComparison.OrdinalIgnoreCase), "Diagnostics should write to a stable Loaderly log path.");
        Check(entry.Contains("2026-05-14", StringComparison.Ordinal) && entry.Contains("Download failed", StringComparison.Ordinal), "Diagnostics entries should include a timestamp and message.");
    }

    private static void AppSettingsProtectsOpenRouterApiKeyAtRest()
    {
        var settings = new AppSettings
        {
            DownloadFolder = @"C:\Downloads",
            OpenRouterApiKey = "sk-or-test-secret",
            OpenRouterModel = "perceptron/perceptron-mk1"
        };

        var json = AppSettingsStore.SerializeForTest(settings);

        Check(!json.Contains("sk-or-test-secret", StringComparison.Ordinal), "Settings JSON should not store the OpenRouter API key as plaintext.");
        Check(json.Contains("openRouterApiKeyProtected", StringComparison.OrdinalIgnoreCase), "Settings JSON should store the protected OpenRouter API key payload.");

        var loaded = AppSettingsStore.DeserializeForTest(json);
        Check(loaded.OpenRouterApiKey == "sk-or-test-secret", "Protected OpenRouter API key should be restored for runtime use.");

        var migrated = AppSettingsStore.DeserializeForTest("""
        {
          "downloadFolder": "C:\\Downloads",
          "openRouterApiKey": "legacy-secret",
          "openRouterModel": "perceptron/perceptron-mk1"
        }
        """);
        var migratedJson = AppSettingsStore.SerializeForTest(migrated);
        Check(migrated.OpenRouterApiKey == "legacy-secret", "Legacy plaintext OpenRouter key should migrate into the runtime value.");
        Check(!migratedJson.Contains("legacy-secret", StringComparison.Ordinal), "Migrated settings should not save the legacy key as plaintext again.");
    }

    private static void GlobalCrashLoggingFormatsExceptionDetails()
    {
        var exception = new InvalidOperationException("boom");
        var entry = AppLog.FormatExceptionForTest(new DateTimeOffset(2026, 5, 14, 9, 15, 0, TimeSpan.Zero), "UI thread", exception);

        Check(entry.Contains("UI thread", StringComparison.Ordinal), "Crash log entry should include the failing app area.");
        Check(entry.Contains("InvalidOperationException", StringComparison.Ordinal), "Crash log entry should include the exception type.");
        Check(entry.Contains("boom", StringComparison.Ordinal), "Crash log entry should include the exception message.");
    }

    private static void WindowsBuildScriptSupportsRequiredSigning()
    {
        var script = File.ReadAllText(Path.Combine(RepositoryRoot(), "script", "build_windows.ps1"));

        Check(script.Contains("CertificateThumbprint", StringComparison.Ordinal), "Windows build script should accept a signing certificate thumbprint.");
        Check(script.Contains("RequireSigning", StringComparison.Ordinal), "Windows build script should support a required-signing mode for release builds.");
        Check(script.Contains("signtool", StringComparison.OrdinalIgnoreCase), "Windows build script should use signtool when signing is requested.");
        Check(script.Contains("Loaderly.exe", StringComparison.Ordinal) && script.Contains("Loaderly-Setup-$Version.exe", StringComparison.Ordinal), "Windows build script should sign both the app executable and versioned installer.");
    }

    private static void RepositoryReleaseFilesExcludeBuildOutputsAndSecrets()
    {
        var root = RepositoryRoot();
        var readme = File.ReadAllText(Path.Combine(root, "README.md"));
        var arabicReadme = File.ReadAllText(Path.Combine(root, "README.ar.md"));
        var license = File.ReadAllText(Path.Combine(root, "LICENSE.md"));
        var trackedFiles = GitOutput(root, "ls-files")
            .Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        foreach (var path in trackedFiles)
        {
            Check(!path.StartsWith("dist/", StringComparison.OrdinalIgnoreCase), "Release repository should not track generated dist output.");
            Check(!path.EndsWith(".pfx", StringComparison.OrdinalIgnoreCase), "Release repository should not track signing certificates.");
            Check(!path.EndsWith(".snk", StringComparison.OrdinalIgnoreCase), "Release repository should not track signing keys.");
            Check(!path.StartsWith("secrets/", StringComparison.OrdinalIgnoreCase), "Release repository should not track secret folders.");
            Check(!path.Equals(".env", StringComparison.OrdinalIgnoreCase) && !path.StartsWith(".env.", StringComparison.OrdinalIgnoreCase), "Release repository should not track environment files.");
        }

        Check(readme.Contains("Loaderly", StringComparison.Ordinal), "README should describe the current Loaderly project.");
        Check(readme.Contains("Download Loaderly for Windows", StringComparison.OrdinalIgnoreCase), "README should prioritize downloading the app.");
        Check(!readme.Contains("Project Layout", StringComparison.OrdinalIgnoreCase) && !readme.Contains("Build From Source", StringComparison.OrdinalIgnoreCase), "README should avoid internal project/build details.");
        Check(arabicReadme.Contains("تحميل Loaderly", StringComparison.Ordinal), "Arabic README should provide a localized download path.");
        Check(license.Contains("PolyForm Noncommercial License", StringComparison.OrdinalIgnoreCase), "License should make commercial resale unavailable without permission.");
    }

    private static void ReleaseReadinessScriptScansSecretsAndTrackedBuildArtifacts()
    {
        var script = File.ReadAllText(Path.Combine(RepositoryRoot(), "script", "check_release_ready.ps1"));

        Check(script.Contains("git ls-files", StringComparison.OrdinalIgnoreCase), "Release readiness script should scan tracked files only.");
        Check(script.Contains("openRouterApiKey", StringComparison.OrdinalIgnoreCase), "Release readiness script should catch legacy plaintext OpenRouter keys.");
        Check(script.Contains("sk-or-", StringComparison.OrdinalIgnoreCase), "Release readiness script should catch OpenRouter-looking secrets.");
        Check(script.Contains("dist/", StringComparison.OrdinalIgnoreCase), "Release readiness script should reject tracked build output.");
        Check(script.Contains("*.pfx", StringComparison.OrdinalIgnoreCase), "Release readiness script should reject tracked signing certificates.");
    }

    private static void CoreWindowsUseDpiScalingAndFitSmallScreens()
    {
        using var main = new MainForm(
            new MediaDownloadService(),
            new TrimExportService(),
            new ThumbnailService(),
            new UpdateChecker(),
            new DownloadHistoryStore(),
            new AppSettingsStore());
        using var settingsForm = new SettingsForm(new AppSettings());
        using var trimForm = new TrimForm(@"C:\missing.mp4", "Missing", new TrimExportService(), new AppSettings());
        using var editorForm = new SubtitleEditorForm(@"C:\missing.srt", @"C:\missing.mp4", new SubtitleStyle());
        using var toolsForm = new ToolsForm();
        using var firstRunForm = new FirstRunForm(new AppSettings());

        foreach (var form in new System.Windows.Forms.Form[] { main, settingsForm, trimForm, editorForm, toolsForm, firstRunForm })
        {
            Check(form.AutoScaleMode == System.Windows.Forms.AutoScaleMode.Dpi, $"{form.GetType().Name} should use DPI scaling on high-resolution Windows displays.");
        }

        Check(main.MinimumSize.Width <= 1024 && main.MinimumSize.Height <= 680, "Main window should fit common 1366x768 and 1024-wide displays.");
        Check(settingsForm.MinimumSize.Width <= 900 && settingsForm.MinimumSize.Height <= 720, "Settings should fit smaller screens without clipping save controls.");
    }

    private static void SubtitleEditorHasPreviewLoadRecovery()
    {
        Check(SubtitleEditorForm.PreviewLoadTimeoutMillisecondsForTest >= 3000, "Subtitle editor should detect when WPF media loading gets stuck on a black preview.");
        Check(SubtitleEditorForm.MaxPreviewLoadRetriesForTest >= 1, "Subtitle editor should retry preview loading before giving up.");
        var retry = SubtitleEditorForm.PreviewLoadTimeoutStateForTest(0);
        var giveUp = SubtitleEditorForm.PreviewLoadTimeoutStateForTest(SubtitleEditorForm.MaxPreviewLoadRetriesForTest);

        Check(retry.ShouldRetry && retry.Message == "Loading preview...", "First preview timeout should retry loading the media file.");
        Check(!giveUp.ShouldRetry && giveUp.Message == "Preview unavailable", "Final preview timeout should stop waiting and leave a clear status.");
    }

    private static void ToolsFormLocalizesRecoveryActions()
    {
        LoaderlyLanguage.Set(LoaderlyLanguage.Arabic);
        try
        {
            using var form = new ToolsForm();
            var texts = Descendants(form).Select(control => control.Text).ToList();

            Check(texts.Contains(LoaderlyLanguage.Text("Tools")), "Tools window title should be localized in Arabic.");
            Check(texts.Contains(LoaderlyLanguage.Text("Install / repair all tools")), "Tool repair action should be localized in Arabic.");
            Check(texts.Contains(LoaderlyLanguage.Text("Update yt-dlp only")), "yt-dlp recovery action should be localized in Arabic.");
            Check(!texts.Contains("Update tools"), "Tools form should not show English recovery labels while Arabic is active.");
        }
        finally
        {
            LoaderlyLanguage.Set(LoaderlyLanguage.English);
        }
    }

    private static void ToolsFormShowsClearVersionStatusAndActions()
    {
        using var form = new ToolsForm();
        var texts = Descendants(form).Select(control => control.Text).ToList();

        Check(texts.Contains("Check versions"), "Tools should use a clear refresh action name.");
        Check(texts.Contains("Update yt-dlp only"), "Tools should clarify that the yt-dlp button updates only yt-dlp.");
        Check(texts.Contains("Install / repair all tools"), "Tools should make the all-tools action explicit.");
        Check(ToolsForm.VersionArgumentForTest("yt-dlp") == "--version", "yt-dlp should use its supported version argument.");
        Check(ToolsForm.VersionArgumentForTest("ffmpeg") == "-version", "ffmpeg should use -version instead of --version.");
        Check(ToolsForm.VersionArgumentForTest("ffprobe") == "-version", "ffprobe should use -version instead of --version.");
        Check(ToolsForm.ParseInstalledVersionForTest("ffmpeg", "ffmpeg version 8.1-full_build-www.gyan.dev Copyright") == "8.1", "Tools should extract the ffmpeg version without showing the full configuration output.");
        Check(ToolsForm.FormatStatusForTest("ffmpeg", installed: true, "8.1", "8.1", @"C:\Tools\ffmpeg.exe").Contains("Up to date", StringComparison.Ordinal), "Tools should say when a tool is already current.");
        Check(ToolsForm.FormatStatusForTest("yt-dlp", installed: false, "", "", "").Contains("Not installed", StringComparison.Ordinal), "Tools should use Not installed instead of a confusing Missing prefix.");
    }

    private static void ToolsFormRepairPlanSkipsCurrentTools()
    {
        var plan = ToolsForm.RepairPlanForTest([
            new ToolStatusSnapshot("yt-dlp", Installed: true, InstalledVersion: "2026.03.17", LatestVersion: "2026.03.17", PathOrMessage: @"C:\Tools\yt-dlp.exe"),
            new ToolStatusSnapshot("ffmpeg", Installed: true, InstalledVersion: "8.1", LatestVersion: "8.1.1", PathOrMessage: @"C:\Tools\ffmpeg.exe"),
            new ToolStatusSnapshot("ffprobe", Installed: true, InstalledVersion: "8.1", LatestVersion: "8.1.1", PathOrMessage: @"C:\Tools\ffprobe.exe")
        ]);

        Check(plan.ToolsToRepair.SequenceEqual(["ffmpeg"]), "Repair-all should skip current yt-dlp and update ffmpeg once for both ffmpeg and ffprobe.");
        Check(plan.SkippedTools.SequenceEqual(["yt-dlp"]), "Repair-all should report tools skipped because they are already current.");

        var noWork = ToolsForm.RepairPlanForTest([
            new ToolStatusSnapshot("yt-dlp", Installed: true, InstalledVersion: "2026.03.17", LatestVersion: "2026.03.17", PathOrMessage: @"C:\Tools\yt-dlp.exe"),
            new ToolStatusSnapshot("ffmpeg", Installed: true, InstalledVersion: "8.1.1", LatestVersion: "8.1.1", PathOrMessage: @"C:\Tools\ffmpeg.exe"),
            new ToolStatusSnapshot("ffprobe", Installed: true, InstalledVersion: "8.1.1", LatestVersion: "8.1.1", PathOrMessage: @"C:\Tools\ffprobe.exe")
        ]);

        Check(noWork.ToolsToRepair.Count == 0, "Repair-all should do nothing when every visible tool is current.");
    }

    private static void ToolsRepairScriptStopsBundledProcessesBeforeReplacingExecutables()
    {
        var installer = File.ReadAllText(Path.Combine(RepositoryRoot(), "script", "install_windows_tools.ps1"));

        Check(installer.Contains("Stop-BundledToolProcess", StringComparison.Ordinal), "Tool repair script should stop bundled tool processes before replacing exe files.");
        Check(installer.Contains("MainModule.FileName", StringComparison.Ordinal), "Tool repair script should only target processes running from Loaderly's tools folder.");
        Check(installer.Contains("Copy-ToolExecutable", StringComparison.Ordinal), "Tool repair script should replace tools through one guarded copy path.");
    }

    private static void ToolsInstallerScriptIsBundledWithWindowsBuild()
    {
        var script = File.ReadAllText(Path.Combine(RepositoryRoot(), "script", "build_windows.ps1"));
        var installer = File.ReadAllText(Path.Combine(RepositoryRoot(), "script", "install_windows_tools.ps1"));

        Check(script.Contains("install_windows_tools.ps1", StringComparison.OrdinalIgnoreCase), "Windows build should copy the tools installer script into the app payload.");
        Check(script.Contains("script", StringComparison.OrdinalIgnoreCase), "Windows build should include a script folder for repair/install tools after setup.");
        Check(installer.Contains("[string[]]$Tools", StringComparison.OrdinalIgnoreCase), "Tool installer script should support installing only requested tools.");
        Check(installer.Contains("yt-dlp", StringComparison.OrdinalIgnoreCase) && installer.Contains("ffmpeg", StringComparison.OrdinalIgnoreCase), "Tool installer script should understand the visible tool groups.");
    }

    private static void AiSubtitleTranslationPreservesTimingAndRejectsCueMismatch()
    {
        var cues = new[]
        {
            new SubtitleCue(TimeSpan.FromSeconds(1), TimeSpan.FromSeconds(3), "Hello"),
            new SubtitleCue(TimeSpan.FromSeconds(4), TimeSpan.FromSeconds(6), "Good night")
        };

        var translated = OpenRouterSubtitleTranslator.ApplyTranslationsForTest(
            cues,
            """
[
  {"id": 0, "text": "Hola"},
  {"id": 1, "text": "Buenas noches"}
]
""");

        Check(translated[0].Start == cues[0].Start && translated[0].End == cues[0].End, "AI subtitle translation should preserve original timing.");
        Check(translated[0].Text == "Hola" && translated[1].Text == "Buenas noches", "AI subtitle translation should replace text only.");

        var rejected = false;
        try
        {
            _ = OpenRouterSubtitleTranslator.ApplyTranslationsForTest(cues, """[{"id": 1, "text": "Wrong"}]""");
        }
        catch (InvalidOperationException)
        {
            rejected = true;
        }

        Check(rejected, "AI subtitle translation should reject responses that change cue count or order.");
    }

    private static void SingleInstanceGuardRejectsSecondInstance()
    {
        var guardType = Type.GetType("Loaderly.SingleInstanceGuard, Loaderly");
        Check(guardType is not null, "App should have a single-instance guard.");
        var acquire = guardType!.GetMethod("Acquire", System.Reflection.BindingFlags.Static | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic);
        var isPrimary = guardType.GetProperty("IsPrimary", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic);
        Check(acquire is not null && isPrimary is not null, "Single-instance guard should expose acquisition state.");

        var name = $"Loaderly.Tests.{Guid.NewGuid():N}";
        using var first = (IDisposable)acquire!.Invoke(null, [name])!;
        using var second = (IDisposable)acquire.Invoke(null, [name])!;

        Check((bool)isPrimary!.GetValue(first)!, "First app instance should be primary.");
        Check(!(bool)isPrimary.GetValue(second)!, "Second app instance should be rejected.");
    }

    private static IEnumerable<System.Windows.Forms.Control> Descendants(System.Windows.Forms.Control root)
    {
        foreach (System.Windows.Forms.Control child in root.Controls)
        {
            yield return child;
            foreach (var descendant in Descendants(child))
            {
                yield return descendant;
            }
        }
    }

    private static string RepositoryRoot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null)
        {
            if (File.Exists(Path.Combine(directory.FullName, "script", "build_windows.ps1")))
            {
                return directory.FullName;
            }

            directory = directory.Parent;
        }

        throw new DirectoryNotFoundException("Could not find the Loaderly repository root.");
    }

    private static string GitOutput(string workingDirectory, string arguments)
    {
        using var process = new System.Diagnostics.Process
        {
            StartInfo = new System.Diagnostics.ProcessStartInfo
            {
                FileName = "git",
                Arguments = arguments,
                WorkingDirectory = workingDirectory,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            }
        };

        process.Start();
        var output = process.StandardOutput.ReadToEnd();
        var error = process.StandardError.ReadToEnd();
        process.WaitForExit();
        Check(process.ExitCode == 0, $"git {arguments} should succeed. {error}");
        return output;
    }

    private static bool IsDoubleBuffered(System.Windows.Forms.Control control)
    {
        var property = typeof(System.Windows.Forms.Control).GetProperty(
            "DoubleBuffered",
            System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic);
        return property is not null && (bool)property.GetValue(control)!;
    }

    private static bool HasColorfulPixels(System.Drawing.Image image)
    {
        using var bitmap = new System.Drawing.Bitmap(image);
        for (var y = 0; y < bitmap.Height; y++)
        {
            for (var x = 0; x < bitmap.Width; x++)
            {
                var color = bitmap.GetPixel(x, y);
                if (color.A < 32)
                {
                    continue;
                }

                var spread = Math.Max(color.R, Math.Max(color.G, color.B)) - Math.Min(color.R, Math.Min(color.G, color.B));
                if (spread >= 45)
                {
                    return true;
                }
            }
        }

        return false;
    }

    private static IEnumerable<(int Width, int Height)> ReadIcoSizes(string path)
    {
        var bytes = File.ReadAllBytes(path);
        if (bytes.Length < 6)
        {
            yield break;
        }

        var count = BitConverter.ToUInt16(bytes, 4);
        for (var index = 0; index < count; index++)
        {
            var offset = 6 + index * 16;
            if (offset + 16 > bytes.Length)
            {
                yield break;
            }

            var width = bytes[offset] == 0 ? 256 : bytes[offset];
            var height = bytes[offset + 1] == 0 ? 256 : bytes[offset + 1];
            yield return (width, height);
        }
    }

    private static void Check(bool condition, string message)
    {
        if (!condition)
        {
            throw new InvalidOperationException(message);
        }
    }
}
