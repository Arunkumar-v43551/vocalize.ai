export enum VoiceName {
  Puck = 'Puck',
  Charon = 'Charon',
  Kore = 'Kore',
  Fenrir = 'Fenrir',
  Zephyr = 'Zephyr',
}

export interface VoiceOption {
  id: VoiceName;
  name: string;
  gender: 'Male' | 'Female';
  description: string;
}

export const VOICE_OPTIONS: VoiceOption[] = [
  { id: VoiceName.Puck, name: 'Puck', gender: 'Male', description: 'Deep & Resonant' },
  { id: VoiceName.Charon, name: 'Charon', gender: 'Male', description: 'Authoritative & Clear' },
  { id: VoiceName.Kore, name: 'Kore', gender: 'Female', description: 'Soothing & Calm' },
  { id: VoiceName.Fenrir, name: 'Fenrir', gender: 'Male', description: 'Energetic & Fast' },
  { id: VoiceName.Zephyr, name: 'Zephyr', gender: 'Female', description: 'Bright & Friendly' },
];

export enum Language {
  English = 'English',
  Tamil = 'Tamil',
  Hindi = 'Hindi',
  Telugu = 'Telugu',
  Kannada = 'Kannada',
  Malayalam = 'Malayalam',
  French = 'French',
  Spanish = 'Spanish',
  German = 'German',
  Japanese = 'Japanese',
}

export enum Emotion {
  Neutral = 'Neutral',
  Happy = 'Happy',
  Sad = 'Sad',
  Angry = 'Angry',
  Excited = 'Excited',
  Calm = 'Calm',
}

export interface EmotionOption {
  id: Emotion;
  label: string;
  emoji: string;
  promptPrefix: string; // The instruction prefix for the model
}

export const EMOTION_OPTIONS: EmotionOption[] = [
  { id: Emotion.Neutral, label: 'Neutral', emoji: '😐', promptPrefix: '' },
  { id: Emotion.Happy, label: 'Happy', emoji: '😊', promptPrefix: 'Say cheerfully: ' },
  { id: Emotion.Excited, label: 'Excited', emoji: '🤩', promptPrefix: 'Say excitedly: ' },
  { id: Emotion.Sad, label: 'Sad', emoji: '😢', promptPrefix: 'Say sadly: ' },
  { id: Emotion.Angry, label: 'Angry', emoji: '😠', promptPrefix: 'Say angrily: ' },
  { id: Emotion.Calm, label: 'Calm', emoji: '😌', promptPrefix: 'Say calmly: ' },
];

export interface SampleText {
  id: string;
  label: string;
  language: Language;
  content: string;
}

export const SAMPLE_TEXTS: SampleText[] = [
  {
    id: 'en-story',
    label: 'Storytelling (English)',
    language: Language.English,
    content: "Once upon a time, in a digital realm far away, a little code snippet dreamed of becoming a full-fledged application. It practiced its algorithms day and night, learning to sort, search, and optimize. Finally, after many cycles of debugging, it compiled perfectly and brought joy to users everywhere."
  },
  {
    id: 'en-tech',
    label: 'Technical (English)',
    language: Language.English,
    content: "Neural networks utilize layers of interconnected nodes to process information. Deep learning, a subset of machine learning, involves networks with many layers, enabling the model to learn complex patterns from large datasets. This technology powers modern advancements in computer vision and natural language processing."
  },
  {
    id: 'ta-greeting',
    label: 'Greeting (Tamil)',
    language: Language.Tamil,
    content: "வணக்கம்! நீங்கள் எப்படி இருக்கிறீர்கள்? உங்கள் நாள் இனிமையாக அமைய வாழ்த்துக்கள். இந்த புதிய தொழில்நுட்பம் மூலம் நாம் எளிதாக பேச முடியும்."
  },
  {
    id: 'ta-lit',
    label: 'Literature (Tamil)',
    language: Language.Tamil,
    content: "யாதும் ஊரே யாவரும் கேளிர்; தீதும் நன்றும் பிறர்தர வாரா. இது கணியன் பூங்குன்றனாரின் மிகவும் பிரபலமான பாடல் வரிகள். இது நமக்கு உலகளாவிய சகோதரத்துவத்தை உணர்த்துகிறது."
  },
   {
    id: 'ta-news',
    label: 'News Brief (Tamil)',
    language: Language.Tamil,
    content: "சென்னையில் இன்று மிதமான மழை பெய்ய வாய்ப்புள்ளது என்று வானிலை ஆய்வு மையம் தெரிவித்துள்ளது. மீனவர்கள் கடலுக்கு செல்ல வேண்டாம் என்று அறிவுறுத்தப்பட்டுள்ளனர்."
  }
];

// ── Emotion Timeline ─────────────────────────────────────────────────────────
export interface EmotionSegment {
  id: string;
  text: string;
  emotion: Emotion;
}

// ── Language Detection ────────────────────────────────────────────────────────
export interface LanguageDetectionResult {
  language: Language;
  confidence: number;       // 0–100
  suggestedVoice: VoiceName;
  reasoning: string;
}

// ── Script Enhancer ───────────────────────────────────────────────────────────
export type EnhancementStyle = 'Podcast' | 'Audiobook Narrator' | 'News Anchor' | 'Casual' | 'Dramatic';

export const ENHANCEMENT_STYLES: { id: EnhancementStyle; emoji: string; description: string }[] = [
  { id: 'Podcast',          emoji: '🎙️', description: 'Conversational & engaging' },
  { id: 'Audiobook Narrator', emoji: '📖', description: 'Rich & expressive prose' },
  { id: 'News Anchor',      emoji: '📺', description: 'Professional & authoritative' },
  { id: 'Casual',           emoji: '💬', description: 'Relaxed & natural' },
  { id: 'Dramatic',         emoji: '🎭', description: 'Intense & theatrical' },
];