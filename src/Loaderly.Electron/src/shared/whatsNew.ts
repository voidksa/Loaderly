export const whatsNewVersion = '2.3.1';
export const whatsNewBuild = '2.3.1';
export const whatsNewIntro = {
  en: 'More reliable downloads, clearer controls and easier speech-to-text setup. Loaderly 2.3.1 fixes save-location and startup problems and helps choose transcription settings for your audio.',
  ar: 'تنزيلات أكثر استقرارًا، وتحكم أوضح، وتحويل أسهل للصوت إلى نص. يصلح Loaderly 2.3.1 مشكلات الحفظ وبدء التشغيل ويساعدك في اختيار إعدادات التفريغ المناسبة للصوت.'
};
export const whatsNewHighlights = [
  {guide:'downloads',en:['Save where you choose','Download directly to a drive or saved folder, with visible pause and cancel controls.'],ar:['احفظ في المكان الذي تختاره','نزّل مباشرة إلى القرص أو المجلد المحفوظ، مع أزرار واضحة للإيقاف المؤقت والإلغاء.']},
  {guide:'transcription',en:['Let Loaderly prepare transcription','Short local audio checks suggest settings. Start in one step or change them manually.'],ar:['دع Loaderly يجهّز التفريغ','فحص محلي لعينات صوتية يقترح الإعدادات. ابدأ بخطوة واحدة أو غيّرها يدويًا.']},
  {guide:'settings',en:['Reliable Windows startup settings','Fixed startup controls in the Microsoft Store version and clarified what the option does.'],ar:['إصلاح بدء التشغيل في ويندوز','إصلاح التحكم ببدء التشغيل في نسخة متجر مايكروسوفت وتوضيح وظيفة الخيار.']}
] as const;
export const whatsNewSections = [
  {id:'downloads',title:{en:'Download fixes and controls',ar:'إصلاحات التنزيل والتحكم'},items:[
    {guide:'downloads',en:['Download directly to a drive','Fixed saving directly to a drive when per-website folders are disabled. Saved audio and video destinations work with either folder organization option.'],ar:['التنزيل مباشرة إلى القرص','أُصلح الحفظ في جذر القرص عند تعطيل إنشاء مجلد لكل موقع. تعمل وجهتا الصوت والفيديو المحفوظتان مع طريقتي تنظيم المجلدات.']},
    {guide:'downloads',en:['Pause or cancel from the download row','Use Pause during preparation or transfer, and Cancel to stop an active task. Cancellation also works while processing media or waiting for another matching download. Resume interrupted transfers when supported by the source.'],ar:['أوقف التنزيل أو ألغِه من صفّه','استخدم الإيقاف المؤقت أثناء التجهيز أو النقل، والإلغاء لإيقاف المهمة النشطة. يعمل الإلغاء أيضًا أثناء معالجة الوسائط أو انتظار تنزيل مطابق. يُستكمل النقل المنقطع إذا كان المصدر يدعمه.']},
    {guide:'downloads',en:['Clear finished and canceled states','Fixed queue updates that could leave a finished or failed task showing Preparing. Canceled downloads have their own state and filter.'],ar:['حالات واضحة للتنزيلات المنتهية والملغاة','أُصلحت تحديثات القائمة التي قد تُبقي مهمة منتهية أو فاشلة بحالة التجهيز. للتنزيلات الملغاة حالة وتصفية مستقلتان.']},
    {guide:'downloads',en:['Understand the final processing step','Transfer complete now distinguishes finished downloading from preparing the audio file or combining video and audio. The result becomes completed when the file is ready.'],ar:['فهم مرحلة المعالجة الأخيرة','توضح عبارة اكتمال النقل انتهاء التنزيل مع استمرار تجهيز الملف الصوتي أو دمج الفيديو والصوت. تظهر المهمة مكتملة عندما يصبح الملف جاهزًا.']},
    {guide:'downloads',en:['Replace duplicates on removable drives','Fixed replacing an existing download on FAT32 drives. The existing file is kept until its replacement has been downloaded and checked.'],ar:['استبدال المكرر على الأقراص القابلة للإزالة','أُصلح استبدال التنزيلات الموجودة على أقراص FAT32. يُحتفظ بالملف الموجود حتى يكتمل تنزيل البديل والتحقق منه.']}
  ]},
  {id:'transcription',title:{en:'Easier speech to text',ar:'تحويل أسهل للصوت إلى نص'},items:[
    {guide:'transcription',en:['Automatic audio analysis','Loaderly checks short samples on your device and suggests whether to focus on speech or analyze the full audio for music and processed voices. Language is detected when transcription starts. Review the result, especially for singing.'],ar:['تحليل الصوت تلقائيًا','يفحص Loaderly عينات قصيرة على جهازك ليقترح التركيز على الكلام أو تحليل الصوت كاملًا للموسيقى والأصوات المعدّلة. تُكتشف اللغة عند بدء التفريغ. راجع النتيجة، خصوصًا في الغناء.']},
    {guide:'transcription',en:['Set up and start in one step','Start with the suggested recognition quality and a results folder beside the source. If a model is needed, Set up & transcribe downloads it and starts the task. The first download size is shown before you begin.'],ar:['التجهيز والبدء بخطوة واحدة','ابدأ بدقة التعرف المقترحة ومجلد نتائج بجانب المصدر. عند الحاجة إلى نموذج، يجهّزه زر التجهيز والتحويل ثم يبدأ المهمة. يظهر حجم التنزيل الأول قبل البدء.']},
    {guide:'transcription',en:['Keep manual control','Expand Manual settings to change recognition quality, language or audio content. You can change the results folder and cancel setup before transcription begins.'],ar:['التحكم اليدوي متاح','وسّع الإعدادات اليدوية لتغيير دقة التعرف أو اللغة أو محتوى الصوت. يمكنك تغيير مجلد النتائج وإلغاء التجهيز قبل بدء التفريغ.']}
  ]},
  {id:'startup',title:{en:'Windows startup',ar:'بدء التشغيل في ويندوز'},items:[
    {guide:'settings',en:['Start Loaderly with your computer','Fixed reading and changing startup settings in the Microsoft Store version. The option opens Loaderly after you sign in to Windows; it does not ask you to sign in to a Loaderly account.'],ar:['تشغيل Loaderly مع الجهاز','أُصلحت قراءة إعدادات بدء التشغيل وتغييرها في نسخة متجر مايكروسوفت. يفتح الخيار البرنامج بعد دخولك إلى ويندوز، ولا يطلب تسجيل الدخول إلى حساب Loaderly.']}
  ]}
] as const;
export function shouldShowWhatsNew(installedVersion:string,seen:string|null,buildId=whatsNewBuild){
  return installedVersion.split('-')[0]===whatsNewVersion&&seen!==buildId;
}
