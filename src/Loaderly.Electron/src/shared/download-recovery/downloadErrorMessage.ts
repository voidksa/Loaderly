import { downloadFolderProblem, downloadFolderMessage } from '../download-destination/downloadFolderError';
import { isRecoverableDownloadFileError, subtitlesSkippedRateLimitMessage, subtitlesSkippedUnavailableMessage } from './downloadRecovery';

export function friendlyDownloadError(message: string, locale: 'en' | 'ar'): string {
  const text = message.replace(/\s+/g, ' ').trim(), ar = locale === 'ar';
  const folder = downloadFolderProblem(text);
  if (folder) return downloadFolderMessage(folder, ar);
  if (/yt-dlp was not found/i.test(text)) return ar ? 'أداة التنزيل غير متاحة. افتح صفحة الأدوات للتحقق منها وتحديثها.' : 'The download tool is unavailable. Open Tools to check and update it.';
  if (/HTTP (?:Error |status[: ]+)?403\b|403 Forbidden/i.test(text)) return ar ? 'رفض الموقع طلب التنزيل. جرّب بعد قليل، وإذا استمرت المشكلة فحدّث أداة التنزيل من صفحة الأدوات.' : 'The site refused the download request. Try again shortly. If it keeps happening, update the download tool from Tools.';
  if (/HTTP (?:Error )?429\b|Too Many Requests/i.test(text)) return ar ? 'قيّد الموقع طلبات التنزيل مؤقتًا. انتظر قليلًا ثم أعد المحاولة.' : 'The site temporarily limited download requests. Wait a little, then retry.';
  if (/private video|members.only|login required|sign in|log in|age.restricted|not available in your country|geo.restricted|HTTP (?:Error )?401\b/i.test(text)) return ar ? 'هذا المحتوى يتطلب إذنًا أو تسجيل دخول، أو غير متاح في منطقتك. افتح الرابط في الموقع للتحقق من إمكانية الوصول إليه.' : 'This content requires access or sign-in, or is unavailable in your region. Open the link on the site to check access.';
  if (/video (?:unavailable|removed)|not found|HTTP (?:Error )?404\b/i.test(text)) return ar ? 'المحتوى غير متاح بهذا الرابط. تأكد من الرابط وافتحه في الموقع، ثم أعد المحاولة.' : 'The content is unavailable at this link. Check the link on the site, then retry.';
  if (/WinError 10013|forbidden by its access permissions|ECONN|ENOTFOUND|ETIMEDOUT|timed out|network is unreachable|temporary failure in name resolution/i.test(text)) return ar ? 'تعذّر الاتصال بموقع التنزيل. تحقق من اتصال الإنترنت وإذن وصول Loaderly إلى الشبكة، ثم أعد المحاولة.' : 'Could not connect to the download site. Check your internet connection and Loaderly’s network access, then retry.';
  if (isRecoverableDownloadFileError(text)) return ar ? 'الملف قيد الاستخدام حاليًا. أغلق أي برنامج يستخدمه، ثم أعد المحاولة.' : 'The download file is in use. Close any app using it, then retry.';
  if (/TikTok|universal data|rehydration/i.test(text)) return ar ? 'تعذّرت قراءة رابط TikTok. انسخ رابط المشاركة من التطبيق، ثم أعد المحاولة.' : 'Could not read this TikTok link. Copy its share link from the app, then retry.';
  if (text === subtitlesSkippedRateLimitMessage) return ar ? 'نُزّل الفيديو بدون ترجمة لأن الموقع قيّد طلبات الترجمة مؤقتًا.' : 'The video downloaded without subtitles because the site temporarily limited subtitle requests.';
  if (text === subtitlesSkippedUnavailableMessage) return ar ? 'نُزّل الفيديو، لكن لم تتوفر ترجمة قابلة للتنزيل.' : 'The video downloaded, but downloadable subtitles were unavailable.';
  // Keep unexpected process output, paths and stack traces out of the product UI.
  return ar ? 'تعذّر إكمال التنزيل. أعد المحاولة، وإذا استمرت المشكلة فحدّث أداة التنزيل من صفحة الأدوات.' : 'Could not complete the download. Retry, and if it keeps happening, update the download tool from Tools.';
}
