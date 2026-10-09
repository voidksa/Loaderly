export const MAX_DOWNLOAD_URL_LENGTH = 4096;

const controlCharacterPattern = /[\u0000-\u001f\u007f]/;
const httpUrlPrefixPattern = /^https?:\/\//i;

export function normalizeDownloadUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const candidate = value.trim();

  if (
    candidate.length === 0 ||
    candidate.length > MAX_DOWNLOAD_URL_LENGTH ||
    candidate.startsWith('-') ||
    controlCharacterPattern.test(candidate) ||
    !httpUrlPrefixPattern.test(candidate)
  ) {
    return undefined;
  }

  try {
    const parsed = new URL(candidate);

    if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:') || parsed.hostname.length === 0) {
      return undefined;
    }

    const normalized = parsed.toString();
    return normalized.length <= MAX_DOWNLOAD_URL_LENGTH ? normalized : undefined;
  } catch {
    return undefined;
  }
}
