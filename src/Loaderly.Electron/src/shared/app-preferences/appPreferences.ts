import { defaultAppearance, normalizeAppearance, type Appearance } from './appearance';
export type ThemeMode = 'light' | 'dark';
export type AppLocale = 'en' | 'ar';
export type DownloadQuality = 'best' | '2160p' | '1440p' | '1080p' | '720p' | '480p' | '360p' | 'audio';
export type DownloadStartMode = 'auto' | 'manual';
export type SubtitleDownloadMode = 'auto' | 'off';
export type SubtitleLanguageProfile = 'available' | 'arabic' | 'english' | 'arabic-english';
export type AiTranslationProvider = 'off' | 'openrouter' | 'openai' | 'anthropic' | 'gemini' | 'local' | 'custom';

export type AppPreferences = {
  readonly themeMode: ThemeMode;
  readonly appearance: Appearance;
  readonly locale: AppLocale;
  readonly quality: DownloadQuality;
  readonly downloadStartMode: DownloadStartMode;
  readonly downloadDirectory: string;
  readonly groupDownloadsByPlatform: boolean;
  readonly subtitleDownloadMode: SubtitleDownloadMode;
  readonly subtitleLanguageProfile: SubtitleLanguageProfile;
  readonly aiTranslationProvider: AiTranslationProvider;
  readonly aiTranslationApiKey: string;
  readonly aiTranslationModel: string;
  readonly aiTranslationBaseUrl: string;
  readonly sidebarCollapsed: boolean;
};

export const defaultPreferences: AppPreferences = {
  themeMode: 'light',
  appearance: defaultAppearance,
  locale: 'en',
  quality: 'best',
  downloadStartMode: 'auto',
  downloadDirectory: '',
  groupDownloadsByPlatform: true,
  subtitleDownloadMode: 'off',
  subtitleLanguageProfile: 'available',
  aiTranslationProvider: 'off',
  aiTranslationApiKey: '',
  aiTranslationModel: '',
  aiTranslationBaseUrl: '',
  sidebarCollapsed: false
};

export function resolveThemeMode(value: unknown): ThemeMode {
  return value === 'dark' ? 'dark' : 'light';
}

export function resolveAppLocale(value: unknown): AppLocale {
  return value === 'ar' ? 'ar' : 'en';
}

export function resolveDownloadQuality(value: unknown): DownloadQuality {
  if (
    value === 'best' ||
    value === '2160p' ||
    value === '1440p' ||
    value === '1080p' ||
    value === '720p' ||
    value === '480p' ||
    value === '360p' ||
    value === 'audio'
  ) {
    return value;
  }

  return 'best';
}

export function resolveDownloadStartMode(value: unknown): DownloadStartMode {
  return value === 'manual' ? 'manual' : 'auto';
}

export function resolveSubtitleDownloadMode(value: unknown): SubtitleDownloadMode {
  return value === 'off' ? 'off' : 'auto';
}

export function resolveSubtitleLanguageProfile(value: unknown): SubtitleLanguageProfile {
  if (value === 'arabic' || value === 'english' || value === 'arabic-english') {
    return value;
  }

  return 'available';
}

export function resolveAiTranslationProvider(value: unknown): AiTranslationProvider {
  if (value === 'openrouter' || value === 'openai' || value === 'anthropic' || value === 'gemini' || value === 'local' || value === 'custom') {
    return value;
  }

  return 'off';
}

function resolvePreferenceText(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, 500) : '';
}

export function normalizePreferences(value: unknown): AppPreferences {
  if (typeof value !== 'object' || value === null) {
    return defaultPreferences;
  }

  const record = value as Record<string, unknown>;

  return {
    themeMode: resolveThemeMode(record.themeMode),
    appearance: normalizeAppearance(record.appearance),
    locale: resolveAppLocale(record.locale),
    quality: resolveDownloadQuality(record.quality),
    downloadStartMode: resolveDownloadStartMode(record.downloadStartMode),
    downloadDirectory: resolvePreferenceText(record.downloadDirectory),
    groupDownloadsByPlatform: record.groupDownloadsByPlatform !== false,
    subtitleDownloadMode: resolveSubtitleDownloadMode(record.subtitleDownloadMode),
    subtitleLanguageProfile: resolveSubtitleLanguageProfile(record.subtitleLanguageProfile),
    aiTranslationProvider: resolveAiTranslationProvider(record.aiTranslationProvider),
    aiTranslationApiKey: resolvePreferenceText(record.aiTranslationApiKey),
    aiTranslationModel: resolvePreferenceText(record.aiTranslationModel),
    aiTranslationBaseUrl: resolvePreferenceText(record.aiTranslationBaseUrl),
    sidebarCollapsed: record.sidebarCollapsed === true
  };
}
