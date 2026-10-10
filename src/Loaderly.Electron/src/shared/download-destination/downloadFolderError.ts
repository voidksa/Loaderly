export type DownloadFolderProblem = 'unavailable' | 'permission' | 'readonly' | 'full';
export type DownloadFolderCheck = { readonly path: string; readonly problem?: DownloadFolderProblem };

export function downloadFolderProblem(message: string): DownloadFolderProblem | undefined {
  if (/DOWNLOAD_FOLDER_FULL|\bENOSPC\b|\bEDQUOT\b|No space left on device/i.test(message)) return 'full';
  if (/DOWNLOAD_FOLDER_READONLY|\bEROFS\b|Read-only file system/i.test(message)) return 'readonly';
  if (/DOWNLOAD_FOLDER_PERMISSION/i.test(message) || (!/\bspawn\b/i.test(message) && /\bEACCES\b|\bEPERM\b|\[Errno 13\]|\[WinError 5\]/i.test(message))) return 'permission';
  if (/DOWNLOAD_FOLDER_UNAVAILABLE/i.test(message)) return 'unavailable';
  return undefined;
}

export function downloadFolderMessage(problem: DownloadFolderProblem, ar: boolean): string {
  if (problem === 'full') return ar ? 'لا توجد مساحة كافية في قرص التنزيل. وفّر مساحة أو اختر مجلدًا على قرص آخر، ثم أعد المحاولة.' : 'The download drive is full. Free some space or choose a folder on another drive, then retry.';
  if (problem === 'readonly') return ar ? 'قرص التنزيل متاح للقراءة فقط. اختر مجلدًا على قرص يمكنك الحفظ فيه، ثم أعد المحاولة.' : 'The download drive is read-only. Choose a folder on a writable drive, then retry.';
  if (problem === 'permission') return ar ? 'تعذّر الحفظ في مجلد التنزيل. أعد اختياره أو اختر مجلدًا آخر يمكنك الحفظ فيه، ثم أعد المحاولة.' : 'Loaderly cannot save to the download folder. Select it again or choose another writable folder, then retry.';
  return ar ? 'مجلد التنزيل غير متاح. تأكد من توصيل القرص، أو اختر مجلدًا آخر، ثم أعد المحاولة.' : 'The download folder is unavailable. Reconnect the drive or choose another folder, then retry.';
}
