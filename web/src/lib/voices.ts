// web/src/lib/voices.ts

export type VoicePreset = {
  id: string;                    // Murf voiceId EXACTLY as returned by /v1/speech/voices
  name: string;                  // Friendly name for the dropdown
  language: string;              // UI language bucket: 'en-IN', 'hi-IN', etc.
  format?: 'mp3' | 'wav';
  sampleRate?: number;
  style?: string;
};

/**
 * IMPORTANT:
 * These IDs come from your PowerShell query to GET /v1/speech/voices.
 * Only include IDs you actually see in your account/region.
 */
export const VOICE_PRESETS: VoicePreset[] = [
  // --- English (India) you listed ---
  { id: 'en-IN-isha',   name: 'Isha (F)',   language: 'en-IN', format: 'mp3', sampleRate: 24000, style: 'Conversational' },
  { id: 'en-IN-arohi',  name: 'Arohi (F)',  language: 'en-IN', format: 'mp3', sampleRate: 24000, style: 'Conversational' },
  { id: 'en-IN-eashwar',name: 'Eashwar (M)',language: 'en-IN', format: 'mp3', sampleRate: 24000, style: 'Conversational' },
  { id: 'en-IN-alia',   name: 'Alia (F)',   language: 'en-IN', format: 'mp3', sampleRate: 24000, style: 'Narration' },
  { id: 'en-IN-rohan',  name: 'Rohan (M)',  language: 'en-IN', format: 'mp3', sampleRate: 24000, style: 'Conversational' },
  { id: 'en-IN-aarav',  name: 'Aarav (M)',  language: 'en-IN', format: 'mp3', sampleRate: 24000, style: 'Conversational' },
  { id: 'en-IN-priya',  name: 'Priya (F)',  language: 'en-IN', format: 'mp3', sampleRate: 24000, style: 'Conversational' },

  // --- Hindi you listed ---
  { id: 'hi-IN-rahul',  name: 'Rahul (M)',  language: 'hi-IN', format: 'mp3', sampleRate: 24000, style: 'Conversational' },
  { id: 'hi-IN-shweta', name: 'Shweta (F)', language: 'hi-IN', format: 'mp3', sampleRate: 24000, style: 'Conversational' },
  { id: 'hi-IN-amit',   name: 'Amit (M)',   language: 'hi-IN', format: 'mp3', sampleRate: 24000, style: 'Conversational' },
  { id: 'hi-IN-shaan',  name: 'Shaan (M)',  language: 'hi-IN', format: 'mp3', sampleRate: 24000, style: 'Conversational' },
  { id: 'hi-IN-kabir',  name: 'Kabir (M)',  language: 'hi-IN', format: 'mp3', sampleRate: 24000, style: 'Conversational' },
  { id: 'hi-IN-ayushi', name: 'Ayushi (F)', language: 'hi-IN', format: 'mp3', sampleRate: 24000, style: 'Conversational' },

  // --- A known-good global voice you already tested via REST ---
  { id: 'en-US-natalie', name: 'Natalie (F, US)', language: 'en-IN', format: 'mp3', sampleRate: 24000, style: 'Conversational' },
];

/** Helper the UI uses */
export function presetsByLanguage(lang: string) {
  return VOICE_PRESETS.filter(v => v.language === lang);
}
