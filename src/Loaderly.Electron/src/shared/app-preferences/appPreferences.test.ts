import { describe, expect, it } from 'vitest';
import {
  defaultPreferences,
  normalizePreferences,
  resolveAiTranslationProvider,
  resolveAppLocale,
  resolveDownloadQuality,
  resolveDownloadStartMode,
  resolveSubtitleDownloadMode,
  resolveSubtitleLanguageProfile,
  resolveThemeMode
} from './appPreferences';

describe('app preferences', () => {
  it('keeps dark theme when stored preference is dark', () => {
    expect(resolveThemeMode('dark')).toBe('dark');
  });

  it('falls back to light theme for invalid stored values', () => {
    expect(resolveThemeMode('system')).toBe('light');
  });

  it('supports Arabic and English locale values', () => {
    expect(resolveAppLocale('ar')).toBe('ar');
    expect(resolveAppLocale('en')).toBe('en');
  });

  it('normalizes quality values without native select state leakage', () => {
    expect(resolveDownloadQuality('2160p')).toBe('2160p');
    expect(resolveDownloadQuality('720p')).toBe('720p');
    expect(resolveDownloadQuality('1080p')).toBe('1080p');
    expect(resolveDownloadQuality('Audio')).toBe('best');
  });

  it('normalizes download start mode safely', () => {
    expect(resolveDownloadStartMode('manual')).toBe('manual');
    expect(resolveDownloadStartMode('queue')).toBe('auto');
  });

  it('normalizes subtitle download preferences safely', () => {
    expect(resolveSubtitleDownloadMode('off')).toBe('off');
    expect(resolveSubtitleDownloadMode('always')).toBe('auto');
    expect(resolveSubtitleLanguageProfile('arabic')).toBe('arabic');
    expect(resolveSubtitleLanguageProfile('arabic-english')).toBe('arabic-english');
    expect(resolveSubtitleLanguageProfile('fr')).toBe('available');
  });

  it('normalizes AI translation provider safely', () => {
    expect(resolveAiTranslationProvider('openrouter')).toBe('openrouter');
    expect(resolveAiTranslationProvider('openai')).toBe('openai');
    expect(resolveAiTranslationProvider('anthropic')).toBe('anthropic');
    expect(resolveAiTranslationProvider('gemini')).toBe('gemini');
    expect(resolveAiTranslationProvider('local')).toBe('local');
    expect(resolveAiTranslationProvider('unknown')).toBe('off');
  });

  it('normalizes persisted preferences safely', () => {
    expect(
      normalizePreferences({
        themeMode: 'dark',
        locale: 'ar',
        quality: 'audio',
        downloadStartMode: 'manual',
        downloadDirectory: '  C:\\Downloads\\Loaderly  ',
        groupDownloadsByPlatform: false,
        subtitleDownloadMode: 'off',
        subtitleLanguageProfile: 'arabic',
        aiTranslationProvider: 'openrouter',
        aiTranslationApiKey: '  sk-test  ',
        aiTranslationModel: '  openai/gpt-4.1-mini  ',
        aiTranslationBaseUrl: '  https://openrouter.ai/api/v1  ',
        sidebarCollapsed: true
      })
    ).toEqual({
      downloadLocations: [], audioLocationId: '', videoLocationId: '',
      appearance: {preset:'graphite',accent:'',density:'comfortable',corners:'rounded'},
      themeMode: 'dark',
      locale: 'ar',
      quality: 'audio',
      downloadStartMode: 'manual',
      downloadDirectory: 'C:\\Downloads\\Loaderly',
      groupDownloadsByPlatform: false,
      subtitleDownloadMode: 'off',
      subtitleLanguageProfile: 'arabic',
      aiTranslationProvider: 'openrouter',
      aiTranslationApiKey: 'sk-test',
      aiTranslationModel: 'openai/gpt-4.1-mini',
      aiTranslationBaseUrl: 'https://openrouter.ai/api/v1',
      sidebarCollapsed: true
    });
  });

  it('returns defaults for corrupted persisted preferences', () => {
    expect(normalizePreferences('bad-json')).toEqual(defaultPreferences);
  });
});
