import type { EditorSubtitleCue } from './editorSubtitles';

export type SubtitleTranslationProvider = 'openrouter';

export type SubtitleTranslationSettings = {
  readonly provider: SubtitleTranslationProvider;
  readonly apiKey?: string;
  readonly model?: string;
  readonly targetLanguage?: string;
};

export type SubtitleTranslationRequest = {
  readonly cues: readonly EditorSubtitleCue[];
  readonly sourceLanguage?: string;
  readonly targetLanguage: string;
};

export type SubtitleTranslationResult = {
  readonly cues: readonly EditorSubtitleCue[];
};

export type SubtitleTranslationService = {
  readonly provider: SubtitleTranslationProvider;
  translate(request: SubtitleTranslationRequest, settings: SubtitleTranslationSettings): Promise<SubtitleTranslationResult>;
};

export function subtitleTranslationAvailability(settings: SubtitleTranslationSettings): { readonly available: true } | { readonly available: false; readonly reason: string } {
  if (!settings.apiKey?.trim() || !settings.model?.trim() || !settings.targetLanguage?.trim()) {
    return {
      available: false,
      reason: 'Subtitle translation needs an OpenRouter API key, model, and target language before it can be enabled.'
    };
  }

  return { available: true };
}
