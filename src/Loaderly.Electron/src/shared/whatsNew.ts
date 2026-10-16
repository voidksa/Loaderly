export const whatsNewVersion = '2.3.2';
export const whatsNewBuild = '2.3.2';
export const whatsNewIntro = {
  en: 'Store update notifications on Windows, reliable download resuming and fixes for community sign-in and theme switching. Version 2.3.2 is shared by Windows, macOS and Linux.',
  ar: 'تنبيهات تحديث المتجر في ويندوز، واستكمال أدق للتنزيلات، وإصلاحات لتسجيل دخول المجتمع وتبديل المظهر. تحمل نسخ ويندوز وماك ولينكس رقم الإصدار 2.3.2.'
};
export const whatsNewHighlights = [
  {guide:'installation',en:['Know when a Store update is ready','Windows checks automatically after startup and offers updates inside Loaderly.'],ar:['اعرف متى يتوفر تحديث المتجر','تفحص نسخة ويندوز التحديثات بعد التشغيل وتتيح تحديث البرنامج من داخله.']},
  {guide:'downloads',en:['Continue where you paused','Keep downloaded data and your duplicate-file choice when resuming.'],ar:['أكمل من حيث توقفت','احتفظ بالجزء المنزّل واختيارك للملف المكرر عند الاستكمال.']},
  {guide:'installation',en:['Update when your work is safe','Download the update while working, then save and install after tasks finish.'],ar:['حدّث بعد حفظ عملك','نزّل التحديث أثناء العمل، ثم احفظ وثبّت بعد انتهاء المهام.']}
] as const;
export const whatsNewSections = [
  {id:'store-updates',title:{en:'Microsoft Store updates on Windows',ar:'تحديثات متجر Microsoft في ويندوز'},items:[
    {guide:'installation',en:['Automatic update checks','Loaderly checks Microsoft Store shortly after opening and periodically while running. A notice appears only when the Store offers an update for your device.'],ar:['التحقق التلقائي من التحديثات','يفحص Loaderly متجر Microsoft بعد فتحه بقليل ودوريًا أثناء تشغيله. يظهر التنبيه عندما يوفّر المتجر تحديثًا لجهازك.']},
    {guide:'installation',en:['Download while you work','Choose Update now to download through Microsoft Store without stopping your tasks. Save and install update becomes available after pending work finishes. Loaderly saves your edits before asking Windows to install.'],ar:['تنزيل التحديث أثناء العمل','اختر التحديث الآن لتنزيله عبر متجر Microsoft مع استمرار مهامك. يتاح حفظ العمل وتثبيت التحديث بعد انتهاء الأعمال المعلّقة. يحفظ Loaderly تعديلاتك قبل طلب التثبيت من ويندوز.']},
    {guide:'installation',en:['Review or postpone','Open What’s new to read the latest notes, or choose Later to hide the notice for 24 hours. The update remains available in Preferences > About.'],ar:['المراجعة أو التأجيل','افتح ما الجديد لقراءة أحدث الملاحظات، أو اختر لاحقًا لإخفاء التنبيه لمدة 24 ساعة. يبقى التحديث متاحًا في الإعدادات ثم حول البرنامج.']},
    {guide:'installation',en:['Clear check and installation status','About shows the last successful check and distinguishes connection problems from no available updates. If installation is canceled or fails, Loaderly stays open for you to continue working.'],ar:['حالة واضحة للفحص والتثبيت','يعرض حول البرنامج آخر فحص ناجح ويميّز تعذر الاتصال عن عدم توفر تحديث. إذا أُلغي التثبيت أو تعثر، يبقى Loaderly مفتوحًا لمتابعة عملك.']}
  ]},
  {id:'download-resume',title:{en:'Download fixes on every platform',ar:'إصلاحات التنزيل في جميع الأنظمة'},items:[
    {guide:'downloads',en:['Resume supported transfers','Fixed restarts in the backup YouTube engine and direct-transfer recovery. Paused downloads keep their partial data and resume supported streams. Changed streams are checked before saved bytes are reused.'],ar:['استكمال التنزيلات المدعومة','أُصلح بدء التنزيل من الصفر في محرك يوتيوب الاحتياطي ومسار التعافي للنقل المباشر. تحتفظ التنزيلات المتوقفة ببياناتها الجزئية وتستكمل المصادر المدعومة، مع التحقق من تغيّر المحتوى قبل إعادة استخدام البيانات.']},
    {guide:'downloads',en:['Remember your duplicate choice','Resuming the same download keeps your Replace or Keep both choice. Loaderly asks again if the existing file changes or you start a different task.'],ar:['تذكّر اختيارك للمكرر','يحتفظ استكمال التنزيل نفسه باختيار الاستبدال أو الاحتفاظ بالنسختين. يسأل Loaderly مجددًا إذا تغيّر الملف الموجود أو بدأت مهمة مختلفة.']},
    {guide:'downloads',en:['A clearer close button','Fixed the square default styling of the download-history notice close button, with a centered icon, hover feedback and visible keyboard focus in both languages.'],ar:['زر إغلاق أوضح','أُصلح الشكل المربع الافتراضي لزر إغلاق تنبيه سجل التنزيلات، مع توسيط الأيقونة وحالة مرور المؤشر وتركيز واضح للوحة المفاتيح في اللغتين.']}
  ]},
  {id:'community-fixes',title:{en:'Community account and appearance',ar:'حساب المجتمع والمظهر'},items:[
    {guide:'community',en:['Keep your saved sign-in','Temporary connection failures no longer make a saved account look signed out. Protected sessions can be restored after reopening or updating Loaderly, and outdated requests cannot clear a newer session.'],ar:['الحفاظ على تسجيل دخولك','لم يعد تعذّر الاتصال المؤقت يُظهر الحساب المحفوظ كأنه مسجّل خروج. يمكن استعادة الجلسة المحمية بعد إعادة الفتح أو التحديث، ولا تمسح الردود القديمة جلسة أحدث.']},
    {guide:'appearance',en:['Switch back to a built-in theme','Choosing a built-in theme replaces the previous design’s colors, glass and shape overrides. A custom community theme no longer highlights its base preset as if it were the active built-in theme. Text size and workspace spacing stay as you set them.'],ar:['الرجوع إلى مظهر أساسي','يستبدل اختيار مظهر أساسي ألوان التصميم السابق وشفافيته وأشكاله المخصصة. لم يعد ثيم المجتمع يُظهر المظهر الذي بُني عليه كمظهر أساسي محدد. يبقى حجم النص وتباعد مساحة العمل كما ضبطتهما.']}
  ]}
] as const;
export function shouldShowWhatsNew(installedVersion:string,seen:string|null,buildId=whatsNewBuild){
  return installedVersion.split('-')[0]===whatsNewVersion&&seen!==buildId;
}
