// web/src/lib/voices.ts
export type VoicePreset = {
  id: string;
  name: string;
  language: string;                  // e.g. 'en-IN', 'hi-IN', 'te-IN', 'mr-IN'
  format?: 'mp3' | 'wav';
  sampleRate?: number;
  style?: string;
};

export const VOICE_PRESETS: VoicePreset[] = [
  // ✅ English (India) — confirmed by your listing
  { id: 'en-IN-isha',   name: 'Isha (F)',    language: 'en-IN', format: 'mp3', sampleRate: 24000, style: 'Conversational' },
  { id: 'en-IN-arohi',  name: 'Arohi (F)',   language: 'en-IN', format: 'mp3', sampleRate: 24000, style: 'Conversational' },
  { id: 'en-IN-eashwar',name: 'Eashwar (M)', language: 'en-IN', format: 'mp3', sampleRate: 24000, style: 'Conversational' },
  { id: 'en-IN-alia',   name: 'Alia (F)',    language: 'en-IN', format: 'mp3', sampleRate: 24000, style: 'Narration' },
  { id: 'en-IN-rohan',  name: 'Rohan (M)',   language: 'en-IN', format: 'mp3', sampleRate: 24000, style: 'Conversational' },
  { id: 'en-IN-aarav',  name: 'Aarav (M)',   language: 'en-IN', format: 'mp3', sampleRate: 24000, style: 'Conversational' },
  { id: 'en-IN-priya',  name: 'Priya (F)',   language: 'en-IN', format: 'mp3', sampleRate: 24000, style: 'Conversational' },

  // ✅ Hindi — confirmed by your listing
  { id: 'hi-IN-rahul',  name: 'Rahul (M)',   language: 'hi-IN', format: 'mp3', sampleRate: 24000, style: 'Conversational' },
  { id: 'hi-IN-shweta', name: 'Shweta (F)',  language: 'hi-IN', format: 'mp3', sampleRate: 24000, style: 'Conversational' },
  { id: 'hi-IN-amit',   name: 'Amit (M)',    language: 'hi-IN', format: 'mp3', sampleRate: 24000, style: 'Conversational' },
  { id: 'hi-IN-shaan',  name: 'Shaan (M)',   language: 'hi-IN', format: 'mp3', sampleRate: 24000, style: 'Conversational' },
  { id: 'hi-IN-kabir',  name: 'Kabir (M)',   language: 'hi-IN', format: 'mp3', sampleRate: 24000, style: 'Conversational' },
  { id: 'hi-IN-ayushi', name: 'Ayushi (F)',  language: 'hi-IN', format: 'mp3', sampleRate: 24000, style: 'Conversational' },

  // 👉 Add these **only if they appear for your account**:
  // // Marathi (mr-IN)
  // { id: 'mr-IN-<id>', name: '<Name>', language: 'mr-IN', format: 'mp3', sampleRate: 24000, style: 'Conversational' },
  // // Telugu (te-IN)
  // { id: 'te-IN-<id>', name: '<Name>', language: 'te-IN', format: 'mp3', sampleRate: 24000, style: 'Conversational' },
  // // Kannada (kn-IN)
  // { id: 'kn-IN-<id>', name: '<Name>', language: 'kn-IN', format: 'mp3', sampleRate: 24000, style: 'Conversational' },
  // // Gujarati (gu-IN)
  // { id: 'gu-IN-<id>', name: '<Name>', language: 'gu-IN', format: 'mp3', sampleRate: 24000, style: 'Conversational' },

  // Fallback you’ve tested via REST (global English)
  { id: 'en-US-natalie', name: 'Natalie (F, US)', language: 'en-IN', format: 'mp3', sampleRate: 24000, style: 'Conversational' },
];

export function presetsByLanguage(lang: string) {
  return VOICE_PRESETS.filter(v => v.language === lang);
}
