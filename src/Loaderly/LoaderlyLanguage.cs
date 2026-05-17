using System.Globalization;
using Microsoft.Win32;
using System.Windows.Forms;

namespace Loaderly;

internal static class LoaderlyLanguage
{
    public const string English = "en";
    public const string Arabic = "ar";

    private const string RegistryKeyPath = @"Software\Loaderly";
    private const string RegistryLanguageValue = "Language";

    private static string current = English;

    private static readonly Dictionary<string, string> ArabicText = new(StringComparer.Ordinal)
    {
        ["Media workspace"] = "مساحة الوسائط",
        ["Media studio"] = "استوديو الوسائط",
        ["saved items"] = "عناصر محفوظة",
        ["Check updates"] = "التحقق من التحديثات",
        ["Updates"] = "التحديثات",
        ["Tools"] = "الأدوات",
        ["Settings"] = "الإعدادات",
        ["Downloads"] = "التنزيلات",
        ["Media Library"] = "مكتبة الوسائط",
        ["Supports YouTube, TikTok, Instagram, X/Twitter, Facebook, Vimeo, Reddit, SoundCloud, and more."] = "يدعم YouTube وTikTok وInstagram وX/Twitter وFacebook وVimeo وReddit وSoundCloud والمزيد.",
        ["Download, trim, subtitle, and export from YouTube, TikTok, Instagram, X/Twitter, Facebook, Vimeo, Reddit, SoundCloud, and more."] = "نزّل وقص وترجم وصدّر من YouTube وTikTok وInstagram وX/Twitter وFacebook وVimeo وReddit وSoundCloud والمزيد.",
        ["Ready"] = "جاهز",
        ["Ready."] = "جاهز.",
        ["Paste one or more media URLs"] = "الصق رابط أو أكثر للوسائط",
        ["Quality"] = "الجودة",
        ["Best"] = "الأفضل",
        ["Audio only"] = "صوت فقط",
        ["Playlists / batch"] = "قوائم تشغيل / دفعة",
        ["Subtitles"] = "الترجمة",
        ["Add to queue"] = "إضافة إلى القائمة",
        ["Save to"] = "حفظ في",
        ["Browse"] = "استعراض",
        ["Search history"] = "البحث في السجل",
        ["Search downloads"] = "البحث في التنزيلات",
        ["Copy"] = "نسخ",
        ["Open"] = "فتح",
        ["Show"] = "إظهار",
        ["Watch / Trim"] = "مشاهدة / قص",
        ["Open video..."] = "فتح فيديو...",
        ["Source"] = "المصدر",
        ["Remove"] = "إزالة",
        ["No downloads yet"] = "لا توجد تنزيلات بعد",
        ["No matching downloads"] = "لا توجد نتائج مطابقة",
        ["No saved downloads"] = "لا توجد تنزيلات محفوظة",
        ["No results"] = "لا توجد نتائج",
        ["Missing file"] = "الملف مفقود",
        ["Untitled media"] = "وسائط بدون عنوان",
        ["Open a video or select a download"] = "افتح فيديو أو اختر تنزيلا",
        ["Watch and trim works with saved downloads and local video files."] = "المشاهدة والقص تعمل مع التنزيلات المحفوظة وملفات الفيديو المحلية.",
        ["Use Open video... below when you want to edit a file from your PC."] = "استخدم فتح فيديو... بالأسفل عندما تريد تعديل ملف من جهازك.",
        ["Starting"] = "يبدأ",
        ["Completed"] = "اكتمل",
        ["Paused"] = "متوقف مؤقتا",
        ["Failed"] = "فشل",
        ["Queued"] = "في الانتظار",
        ["Pause"] = "إيقاف مؤقت",
        ["Retry"] = "إعادة المحاولة",
        ["Resume"] = "استئناف",
        ["Download finished."] = "اكتمل التنزيل.",
        ["Download paused."] = "تم إيقاف التنزيل مؤقتا.",
        ["Download folder updated."] = "تم تحديث مجلد الحفظ.",
        ["File copied to clipboard."] = "تم نسخ الملف إلى الحافظة.",
        ["Select a history item first."] = "اختر عنصرا من السجل أولا.",
        ["That file no longer exists."] = "هذا الملف لم يعد موجودا.",
        ["Checking updates..."] = "جار التحقق من التحديثات...",
        ["Could not check updates."] = "تعذر التحقق من التحديثات.",
        ["Downloading update..."] = "جار تنزيل التحديث...",
        ["Update downloaded. Starting installer..."] = "تم تنزيل التحديث. جار تشغيل المثبت...",
        ["No releases are published yet."] = "لا توجد إصدارات منشورة حتى الآن.",
        ["You are running the latest version."] = "أنت تستخدم آخر إصدار.",
        ["The latest release does not include a Loaderly installer."] = "آخر إصدار لا يحتوي على مثبت Loaderly.",
        ["Update available"] = "يوجد تحديث",
        ["Download and install now?"] = "هل تريد تنزيله وتثبيته الآن؟",
        ["Loaderly update"] = "تحديث Loaderly",
        ["Paste at least one valid web URL."] = "الصق رابط ويب صحيحا واحدا على الأقل.",
        ["Added to queue."] = "تمت الإضافة إلى قائمة الانتظار.",
        ["Open video"] = "فتح فيديو",
        ["Video files (*.mp4;*.m4v;*.mov;*.mkv;*.webm)|*.mp4;*.m4v;*.mov;*.mkv;*.webm|All files (*.*)|*.*"] = "ملفات الفيديو (*.mp4;*.m4v;*.mov;*.mkv;*.webm)|*.mp4;*.m4v;*.mov;*.mkv;*.webm|كل الملفات (*.*)|*.*",
        ["Remove download"] = "إزالة التنزيل",
        ["Do you want to delete the file from your PC too?\n\nYes: delete file and remove from history\nNo: remove from history only\nCancel: keep it"] = "هل تريد حذف الملف من جهازك أيضا؟\n\nنعم: حذف الملف وإزالته من السجل\nلا: إزالة من السجل فقط\nإلغاء: إبقاؤه",
        ["Deleted file and removed from history."] = "تم حذف الملف وإزالته من السجل.",
        ["Removed from history."] = "تمت الإزالة من السجل.",
        ["Removed from queue."] = "تمت الإزالة من قائمة الانتظار.",
        ["Settings saved."] = "تم حفظ الإعدادات.",
        ["Open Loaderly"] = "فتح Loaderly",
        ["Exit"] = "خروج",
        ["Save folders"] = "مجلدات الحفظ",
        ["Add folder"] = "إضافة مجلد",
        ["Active folder"] = "المجلد النشط",
        ["Theme / Language"] = "المظهر / اللغة",
        ["System"] = "النظام",
        ["Light"] = "فاتح",
        ["Dark"] = "داكن",
        ["English"] = "الإنجليزية",
        ["Arabic"] = "العربية",
        ["Download subtitles in"] = "تنزيل الترجمة بلغة",
        ["Same as video"] = "نفس الفيديو",
        ["Arabic + English"] = "العربية + الإنجليزية",
        ["All"] = "الكل",
        ["Custom code"] = "رمز مخصص",
        ["Code e.g. ar"] = "رمز مثل ar",
        ["Codes like ar, en, ja"] = "رموز مثل ar, en, ja",
        ["Download subtitles when available"] = "تنزيل الترجمة عند توفرها",
        ["Windows notifications when downloads finish"] = "إشعارات Windows عند اكتمال التنزيل",
        ["Use Windows toast notifications when available"] = "استخدام إشعارات Windows الحديثة عند توفرها",
        ["Keep Loaderly in the system tray when closed"] = "إبقاء Loaderly في شريط النظام عند الإغلاق",
        ["Trim shortcuts"] = "اختصارات القص",
        ["Undo"] = "تراجع",
        ["Redo"] = "إعادة",
        ["Save"] = "حفظ",
        ["Reset"] = "إعادة ضبط",
        ["Fixed trim shortcuts: Space play/pause, arrows step, Shift+arrows 5s, Ctrl+Shift+arrows frame step, M mute, Esc close."] = "اختصارات ثابتة للقص: Space تشغيل/إيقاف، الأسهم خطوة، Shift+الأسهم 5 ثوان، Ctrl+Shift+الأسهم إطار، M كتم، Esc إغلاق.",
        ["AI subtitle translation"] = "ترجمة الترجمة بالذكاء الاصطناعي",
        ["API key"] = "مفتاح API",
        ["Model"] = "النموذج",
        ["OpenRouter API key"] = "مفتاح OpenRouter API",
        ["OpenRouter model"] = "نموذج OpenRouter",
        ["Translate subtitles to"] = "ترجمة الترجمة إلى",
        ["Type a language"] = "اكتب اللغة",
        ["Cancel"] = "إلغاء",
        ["Choose where downloads are saved"] = "اختر مكان حفظ التنزيلات",
        ["Choose where downloaded videos are saved"] = "اختر مكان حفظ الفيديوهات المنزلة",
        ["Choose a save folder first."] = "اختر مجلد حفظ أولا.",
        ["Keep at least one save folder."] = "أبق مجلد حفظ واحدا على الأقل.",
        ["Refresh"] = "تحديث",
        ["Check versions"] = "فحص الإصدارات",
        ["Update yt-dlp"] = "تحديث yt-dlp",
        ["Update yt-dlp only"] = "تحديث yt-dlp فقط",
        ["Update tools"] = "تحديث الأدوات",
        ["Install / repair all tools"] = "تثبيت / إصلاح كل الأدوات",
        ["Checking tools..."] = "جار فحص الأدوات...",
        ["Checking required tools..."] = "جار فحص الأدوات المطلوبة...",
        ["Updating required tools..."] = "جار تحديث الأدوات المطلوبة...",
        ["All tools are already up to date."] = "كل الأدوات على آخر إصدار.",
        ["Checking..."] = "جار الفحص...",
        ["installed"] = "مثبت",
        ["Update finished."] = "اكتمل التحديث.",
        ["yt-dlp update finished."] = "اكتمل تحديث yt-dlp.",
        ["Tools update finished."] = "اكتمل تثبيت / إصلاح الأدوات.",
        ["Tool installer script was not found in this build."] = "ملف تثبيت الأدوات غير موجود في هذه النسخة.",
        ["Installed"] = "المثبت",
        ["Latest"] = "الأحدث",
        ["Status"] = "الحالة",
        ["Up to date"] = "آخر إصدار",
        ["Update available"] = "يوجد تحديث",
        ["Latest unavailable"] = "تعذر فحص الأحدث",
        ["Check manually"] = "افحص يدويًا",
        ["Not installed"] = "غير مثبت",
        ["Action"] = "الإجراء",
        ["Updated"] = "تم تحديث",
        ["Skipped"] = "تم تخطي",
        ["None"] = "لا شيء",
        ["Close"] = "إغلاق",
        ["The installer includes these tools when the release is built with tools\\windows. Use Install / repair all tools if one is missing, and update yt-dlp only when a site stops working."] = "المثبت يضم هذه الأدوات عندما تُبنى النسخة مع مجلد tools\\windows. استخدم تثبيت / إصلاح كل الأدوات إذا كانت أداة مفقودة، وحدّث yt-dlp فقط إذا توقف موقع عن العمل.",
        ["Watch / Trim -"] = "مشاهدة / قص -",
        ["Clip"] = "المقطع",
        ["Start"] = "البداية",
        ["End"] = "النهاية",
        ["Selected"] = "المحدد",
        ["Total"] = "الإجمالي",
        ["Set start"] = "تعيين البداية",
        ["Set end"] = "تعيين النهاية",
        ["- frame"] = "- إطار",
        ["+ frame"] = "+ إطار",
        ["Export"] = "التصدير",
        ["High"] = "عالية",
        ["Balanced"] = "متوازنة",
        ["Small"] = "صغيرة",
        ["Mute audio"] = "كتم الصوت",
        ["Choose"] = "اختيار",
        ["Edit"] = "تخصيص",
        ["Translate"] = "ترجمة",
        ["Original"] = "الأصلية",
        ["Translated"] = "مترجمة",
        ["Working"] = "جار العمل",
        ["Hide"] = "إخفاء",
        ["Use saved"] = "استخدام المحفوظة",
        ["Shortcuts"] = "الاختصارات",
        ["Save clip"] = "حفظ المقطع",
        ["Copy clip"] = "نسخ المقطع",
        ["Reset trim"] = "إعادة ضبط القص",
        ["Play selection"] = "تشغيل المحدد",
        ["Play"] = "تشغيل",
        ["Loading video..."] = "جار تحميل الفيديو...",
        ["Loading preview..."] = "جار تحميل المعاينة...",
        ["Preview unavailable"] = "المعاينة غير متاحة",
        ["Playing selection."] = "جار تشغيل المحدد.",
        ["Audio muted for export."] = "تم كتم الصوت للتصدير.",
        ["Audio enabled for export."] = "تم تفعيل الصوت للتصدير.",
        ["Trim reset."] = "تمت إعادة ضبط القص.",
        ["Canceling export..."] = "جار إلغاء التصدير...",
        ["Could not read media duration."] = "تعذر قراءة مدة الفيديو.",
        ["Choose subtitles before editing."] = "اختر ملف ترجمة قبل التخصيص.",
        ["OpenRouter settings needed."] = "إعدادات OpenRouter مطلوبة.",
        ["No subtitle file is loaded."] = "لم يتم تحميل ملف ترجمة.",
        ["Subtitle translation canceled."] = "تم إلغاء ترجمة الترجمة.",
        ["Building timeline thumbnails..."] = "جار تجهيز صور الخط الزمني...",
        ["Video is not ready yet."] = "الفيديو غير جاهز بعد.",
        ["Clip exported and copied."] = "تم تصدير المقطع ونسخه.",
        ["Clip export canceled."] = "تم إلغاء تصدير المقطع.",
        ["Exporting clip..."] = "جار تصدير المقطع...",
        ["Adjusting clip..."] = "جار تعديل المقطع...",
        ["Editing subtitles..."] = "جار تخصيص الترجمة...",
        ["Nothing to undo."] = "لا يوجد ما يمكن التراجع عنه.",
        ["Undo."] = "تم التراجع.",
        ["Nothing to redo."] = "لا يوجد ما يمكن إعادته.",
        ["Redo."] = "تمت الإعادة.",
        ["Copied"] = "تم النسخ",
        ["Last trim restored."] = "تمت استعادة آخر قص.",
        ["Subtitles saved."] = "تم حفظ الترجمة.",
        ["Already translated."] = "مترجمة مسبقا.",
        ["Original subtitles restored."] = "تمت استعادة الترجمة الأصلية.",
        ["No original subtitles found."] = "لم يتم العثور على الترجمة الأصلية.",
        ["Subtitles removed."] = "تمت إزالة الترجمة من العرض.",
        ["Subtitles hidden."] = "تم إخفاء الترجمة.",
        ["No subtitles."] = "لا توجد ترجمة.",
        ["Subtitles loaded."] = "تم تحميل الترجمة.",
        ["No file"] = "لا يوجد ملف",
        ["Loaded"] = "محملة",
        ["Hidden"] = "مخفية",
        ["Edit subtitles"] = "تخصيص الترجمة",
        ["Cues"] = "السطور",
        ["Preview"] = "المعاينة",
        ["Text"] = "النص",
        ["Style"] = "النمط",
        ["Search fonts"] = "البحث في الخطوط",
        ["Size"] = "الحجم",
        ["Color"] = "اللون",
        ["Text color"] = "لون النص",
        ["Box"] = "الخلفية",
        ["Background"] = "الخلفية",
        ["Opacity"] = "الشفافية",
        ["Bold text"] = "نص عريض",
        ["Preset"] = "قالب",
        ["Default"] = "افتراضي",
        ["Cinematic"] = "سينمائي",
        ["Arabic large"] = "عربي كبير",
        ["Caption box"] = "مربع الترجمة",
        ["Subtitle export"] = "تصدير الترجمة",
        ["Burn in subtitles"] = "دمج الترجمة داخل الفيديو",
        ["Sidecar SRT"] = "ملف SRT بجانب الفيديو",
        ["No subtitles"] = "بدون ترجمة",
        ["About"] = "حول",
        ["Open logs"] = "فتح السجلات",
        ["Logs"] = "السجلات",
        ["About Loaderly"] = "حول Loaderly",
        ["First run setup"] = "إعداد أول تشغيل",
        ["First run setup saved."] = "تم حفظ إعداد أول تشغيل.",
        ["Welcome to Loaderly"] = "مرحباً بك في Loaderly",
        ["Language"] = "اللغة",
        ["Start"] = "ابدأ",
        ["Choose your language and where Loaderly saves downloads. You can change both later in Settings."] = "اختر اللغة ومكان حفظ التنزيلات. يمكنك تغييرهما لاحقاً من الإعدادات.",
        ["Clip saved with subtitles:"] = "تم حفظ المقطع مع الترجمة:",
        ["Download failed."] = "فشل التنزيل.",
        ["Subtitles were rate limited. Retry without subtitles or try again later."] = "تم تقييد تحميل الترجمة. أعد المحاولة بدون ترجمة أو حاول لاحقاً.",
        ["Downloader tool is missing. Open Tools and update yt-dlp."] = "أداة التنزيل مفقودة. افتح الأدوات وحدّث yt-dlp.",
        ["Download folder is not responding. Choose another folder or reconnect the drive."] = "مجلد التنزيل لا يستجيب. اختر مجلداً آخر أو أعد توصيل القرص.",
        ["Connection problem. Retry when the site responds."] = "مشكلة في الاتصال. أعد المحاولة عندما يستجيب الموقع.",
        ["Add cue"] = "إضافة سطر",
        ["Delete"] = "حذف"
    };

    private static readonly Dictionary<string, string> EnglishText = ArabicText
        .GroupBy(pair => pair.Value, StringComparer.Ordinal)
        .ToDictionary(group => group.Key, group => group.First().Key, StringComparer.Ordinal);

    public static string Current => current;

    public static bool IsArabic => current == Arabic;

    public static void Set(string? language)
    {
        current = Normalize(language);
        CultureInfo.CurrentUICulture = CultureInfo.GetCultureInfo(IsArabic ? "ar" : "en");
    }

    public static string Normalize(string? language)
    {
        var value = (language ?? string.Empty).Trim().ToLowerInvariant();
        return value is "ar" or "arabic" or "arabic.isl" or "العربية" ? Arabic : English;
    }

    public static string FromInstallerOrSystem()
    {
        var registry = Registry.CurrentUser.OpenSubKey(RegistryKeyPath)?.GetValue(RegistryLanguageValue)?.ToString();
        if (!string.IsNullOrWhiteSpace(registry))
        {
            return Normalize(registry);
        }

        return CultureInfo.CurrentUICulture.TwoLetterISOLanguageName.Equals("ar", StringComparison.OrdinalIgnoreCase)
            ? Arabic
            : English;
    }

    public static string Text(string text)
    {
        if (!IsArabic)
        {
            return text;
        }

        if (text == "Windows Media Player feature is missing.")
        {
            return "ميزة Windows Media Player غير مثبتة.";
        }

        if (text == "Windows Media Player feature is missing. Run as administrator: DISM /Online /Add-Capability /CapabilityName:Media.WindowsMediaPlayer~~~~0.0.12.0")
        {
            return "ميزة Windows Media Player غير مثبتة. شغّل كمسؤول: DISM /Online /Add-Capability /CapabilityName:Media.WindowsMediaPlayer~~~~0.0.12.0";
        }

        if (text == "Open PowerShell or Command Prompt as administrator and run:")
        {
            return "افتح PowerShell أو Command Prompt كمسؤول وشغّل:";
        }

        if (text == "Restart Windows after the command finishes.")
        {
            return "أعد تشغيل ويندوز بعد انتهاء الأمر.";
        }

        if (text == "Watch / Trim preview")
        {
            return "معاينة المشاهدة / القص";
        }

        return ArabicText.TryGetValue(text, out var translated) ? translated : text;
    }

    public static string EnglishFor(string text)
    {
        return EnglishText.TryGetValue(text, out var english) ? english : text;
    }

    public static string SavedItems(int count)
    {
        return IsArabic ? $"{count} في المكتبة" : $"{count} in library";
    }

    public static string AddedItemsToQueue(int count)
    {
        return IsArabic ? $"تمت إضافة {count} عناصر إلى قائمة الانتظار." : $"Added {count} items to queue.";
    }

    public static string FinishedDownloads(int count)
    {
        return IsArabic ? $"اكتمل تنزيل {count} ملفات." : $"Finished {count} downloads.";
    }

    public static string UpdateAvailable(string version)
    {
        return IsArabic ? $"يتوفر تحديث جديد {version}." : $"Update {version} is available.";
    }

    public static void ApplyTo(Form form)
    {
        form.RightToLeft = IsArabic ? RightToLeft.Yes : RightToLeft.No;
        form.RightToLeftLayout = IsArabic;
        ApplyToControl(form);
    }

    public static void ApplyToControl(Control control)
    {
        if (control is not Form && !string.IsNullOrWhiteSpace(control.Text))
        {
            control.Text = Text(control.Text);
        }

        if (control is TextBox textBox && !string.IsNullOrWhiteSpace(textBox.PlaceholderText))
        {
            textBox.PlaceholderText = Text(textBox.PlaceholderText);
        }

        if (control is ModernSelect select)
        {
            var index = select.SelectedIndex;
            for (var i = 0; i < select.Items.Count; i++)
            {
                select.Items[i] = Text(select.Items[i]);
            }

            select.SelectedIndex = index;
            select.Invalidate();
        }

        if (control is ModernCheckBox checkBox)
        {
            checkBox.Anchor = IsArabic ? AnchorStyles.Right : AnchorStyles.Left;
            checkBox.FitToText();
        }

        if (control.ContextMenuStrip is not null)
        {
            ApplyToMenu(control.ContextMenuStrip);
        }

        foreach (Control child in control.Controls)
        {
            ApplyToControl(child);
        }
    }

    public static void ApplyToMenu(ToolStrip menu)
    {
        foreach (ToolStripItem item in menu.Items)
        {
            if (!string.IsNullOrWhiteSpace(item.Text))
            {
                item.Text = Text(item.Text);
            }

            if (item is ToolStripDropDownItem dropDown)
            {
                ApplyToMenu(dropDown.DropDown);
            }
        }
    }
}
