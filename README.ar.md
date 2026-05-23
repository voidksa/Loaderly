<div align="center" dir="rtl">
  <img src="assets/loaderly-256.png" alt="أيقونة Loaderly" width="112" height="112">

  <h1>Loaderly</h1>

  <p>
    <strong>تطبيق ويندوز لتحميل الوسائط وتنظيمها وقصها والعمل على الترجمة وتصديرها من مكان واحد.</strong>
  </p>

  <p>
    <a href="README.md">English</a>
  </p>

  <p>
    <a href="https://github.com/voidksa/Loaderly/releases/latest"><img alt="تحميل Loaderly" src="https://img.shields.io/badge/download-latest%20release-4f8cff?style=for-the-badge"></a>
    <img alt="Windows" src="https://img.shields.io/badge/platform-Windows-2ec5ff?style=for-the-badge">
    <img alt="Source available" src="https://img.shields.io/badge/source-available-7c5cff?style=for-the-badge">
    <img alt="License" src="https://img.shields.io/badge/license-PolyForm%20NC-202637?style=for-the-badge">
  </p>
</div>

<p align="center" dir="rtl">
  <a href="https://github.com/voidksa/Loaderly/releases/latest"><strong>تحميل Loaderly لويندوز</strong></a>
</p>

<p align="center">
  <img src="docs/images/loaderly-downloads-ar.png" alt="واجهة التنزيلات في Loaderly" width="92%">
</p>

<p align="center">
  <img src="docs/images/loaderly-settings-ar.png" alt="إعدادات Loaderly" width="76%">
</p>

## ماذا يفعل Loaderly؟

Loaderly يجمع التعامل مع روابط الوسائط في تطبيق واحد على ويندوز. الصق الرابط، حمّل الملف، احتفظ به في مكتبة محلية، قص الجزء الذي تحتاجه، عدّل الترجمة، ثم صدّر النتيجة بدون التنقل بين أدوات كثيرة.

## المزايا

- تحميل من YouTube وTikTok وInstagram وX/Twitter وFacebook وVimeo وReddit وSoundCloud ومواقع أخرى مدعومة.
- إضافة رابط واحد، دفعات متعددة الأسطر، أو قوائم تشغيل إلى قائمة الانتظار.
- مكتبة محلية مع صور مصغرة، روابط المصدر، إجراءات الملفات، حفظ العناوين الصحيحة، وفتح المشاهدة أو القص.
- إضافة فيديوهات من جهازك إلى المكتبة وتعديلها بنفس أدوات القص والترجمة واللقطة والبلور والزوم.
- متابعة التنزيل بنسبة التقدم، الحجم المحمل/الإجمالي، السرعة، والوقت المتبقي عند توفرها من المزود.
- قص المقاطع مع حذف أجزاء داخلية، حفظ حالة التعديل، قائمة كلك يمين على القصات، قص مباشر بدون انتقالات، وBlur لإخفاء جزء من الفيديو، وZoom للتركيز على منطقة محددة.
- تحميل ملفات الترجمة وتعديلها وترجمتها وتنسيقها وإخفاؤها واستعادتها ودمجها مع الفيديو، مع صور مصغرة في تايملاين محرر الترجمة.
- التحديث من GitHub Releases مباشرة من داخل التطبيق؛ Loaderly ينزل المثبت، يغلق التطبيق المفتوح، يثبت التحديث، ثم يعيد فتحه بعد الانتهاء.
- واجهة عربية أو إنجليزية مع الوضع الفاتح أو الداكن أو وضع النظام.

## آخر إصدار

Loaderly 1.1.0 متوفر الآن. التفاصيل الكاملة للتغييرات والاختصارات موجودة في [CHANGELOG.md](CHANGELOG.md).

## التحميل

حمّل مثبت ويندوز من آخر إصدار:

<p align="center" dir="rtl">
  <a href="https://github.com/voidksa/Loaderly/releases/latest">
    <img alt="تحميل آخر إصدار من Loaderly" src="https://img.shields.io/badge/Download-Loaderly%20Setup-4f8cff?style=for-the-badge">
  </a>
</p>

بعد التحميل شغّل المثبت، ثم افتح Loaderly من قائمة Start. يفضّل استخدام Windows 10 أو أحدث.

## الوصول المبكر

الإصدارات العامة تنشر على GitHub. إذا تبغى توصل لنسخ حصرية قبل الإطلاق العام، تقدر تشترك بعضوية Loaderly عبر [Buy Me a Coffee](https://buymeacoffee.com/voidksa).

## متطلب Media Player

ميزة Watch / Trim تعتمد على مكونات تشغيل الوسائط في ويندوز لعرض معاينة الفيديو. إذا ظهرت رسالة `Windows Media Player version 10 or later is required.` عند فتح Watch / Trim، فهذا يعني غالبًا أن ميزة Windows Media Player الاختيارية غير مثبتة حتى لو كان تطبيق Media Player الجديد موجودًا.

افتح PowerShell أو Command Prompt كمسؤول، شغّل هذا الأمر، ثم أعد تشغيل ويندوز:

```powershell
DISM /Online /Add-Capability /CapabilityName:Media.WindowsMediaPlayer~~~~0.0.12.0
```

يمكنك أيضًا تثبيت أو تحديث Media Player من Microsoft Store، لكن أمر DISM بالأعلى هو الحل للمكوّن الناقص داخل ويندوز:

<p align="center" dir="rtl">
  <a href="https://apps.microsoft.com/detail/9WZDNCRFJ3PT">
    <img src="docs/images/windows-media-player.svg" alt="أيقونة Media Player" width="72" height="72"><br>
    <strong>تثبيت Media Player من Microsoft Store</strong>
  </a>
</p>

إذا كان الجهاز يعمل بإصدار Windows N واستمرت المشكلة بعد الأمر، ثبّت Microsoft Media Feature Pack أيضًا.

## الخصوصية

Loaderly يحفظ إعدادات التطبيق، سجل التنزيلات، الصور المصغرة، تفضيلات الترجمة، وبيانات المكتبة المحلية على جهازك. ميزات تنزيل الوسائط أو البحث عن التحديثات أو ترجمة الترجمة قد تتصل بالخدمات المطلوبة فقط عند استخدامها.

لا تنشر مفاتيح API الشخصية أو بيانات الدخول أو شهادات التوقيع أو ملفات الإعدادات الخاصة.

## توفر المصدر

هذا المستودع متاح للاطلاع على المشروع واستخدامه ضمن الأغراض غير التجارية المسموحة في الترخيص. الطريقة الموصى بها لاستخدام Loaderly هي تحميل مثبت ويندوز الرسمي من صفحة الإصدارات.

الاستخدام التجاري، إعادة البيع، الاستضافة المدفوعة، إعادة التسمية، أو نشر Loaderly كمنتج آخر يتطلب إذنًا كتابيًا من صاحب الحقوق.

## الترخيص

Loaderly متاح المصدر تحت ترخيص [PolyForm Noncommercial License 1.0.0](LICENSE.md).
