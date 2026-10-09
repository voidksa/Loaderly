import type { AiTranslationProvider } from './appPreferences';
// Verified against provider catalogs on 2026-10-09. Refresh models in Preferences
// queries the chosen provider; a custom model ID is always accepted.
export const providerModels: Record<AiTranslationProvider,readonly string[]> = {
 off:[],openai:['gpt-6-luna','gpt-6.1-sol','gpt-6-astra'],openrouter:['openai/gpt-6-luna','openai/gpt-6.1-sol','anthropic/claude-sonnet-5.5','google/gemini-3.8-flash'],
 anthropic:['claude-haiku-5-5','claude-sonnet-5-5','claude-opus-5-5','claude-fable-5-1'],gemini:['gemini-3.8-flash','gemini-3.5-flash-lite','gemini-3.1-pro-preview'],local:[],custom:[]
};
export const providerBaseUrls:Record<AiTranslationProvider,string>={off:'',openai:'https://api.openai.com/v1',openrouter:'https://openrouter.ai/api/v1',anthropic:'https://api.anthropic.com/v1',gemini:'https://generativelanguage.googleapis.com/v1beta',local:'http://localhost:11434/v1',custom:''};
export type AiConnection = {provider:AiTranslationProvider;apiKey:string;model:string;baseUrl:string};
export type TranslationCue = {startSeconds:number;endSeconds:number;text:string};
export type TranslationInput = {connection:AiConnection;targetLanguage:string;cues:readonly TranslationCue[]};
