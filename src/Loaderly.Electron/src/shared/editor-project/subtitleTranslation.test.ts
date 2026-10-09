import { subtitleTranslationAvailability } from './subtitleTranslation';

describe('subtitle translation foundation', () => {
  it('requires provider settings before translation can be enabled', () => {
    expect(subtitleTranslationAvailability({ provider: 'openrouter' })).toEqual({
      available: false,
      reason: 'Subtitle translation needs an OpenRouter API key, model, and target language before it can be enabled.'
    });
  });

  it('reports availability when provider settings are complete', () => {
    expect(
      subtitleTranslationAvailability({
        provider: 'openrouter',
        apiKey: 'sk-or-test',
        model: 'deepseek/deepseek-v4-flash',
        targetLanguage: 'Arabic'
      })
    ).toEqual({ available: true });
  });
});
