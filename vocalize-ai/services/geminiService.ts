import { GoogleGenAI, Modality } from "@google/genai";
import {
  VoiceName,
  Emotion,
  EMOTION_OPTIONS,
  Language,
  EnhancementStyle,
  EmotionSegment,
  LanguageDetectionResult,
} from "../types";

// Initialize Gemini Client (reused for all features)
const ai = new GoogleGenAI({
  apiKey: process.env.API_KEY,
  apiVersion: "v1alpha"
});

// Text-only model for Script Enhancer, Language Detect, Emotion Timeline
const TEXT_MODEL = "gemini-2.5-flash";
const TTS_MODEL = "gemini-2.5-flash-preview-tts";

/** Extracts a clean, human-readable message from any Gemini API error */
const cleanError = (error: unknown): string => {
  if (!error) return "Unknown error";
  const msg = (error as any)?.message || String(error);
  // Try to parse JSON error body from Gemini API
  try {
    const match = msg.match(/\{.*\}/s);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return parsed?.error?.message || parsed?.message || msg;
    }
  } catch {
    // not JSON, use as-is
  }
  // Truncate very long raw strings
  return msg.length > 200 ? msg.slice(0, 200) + '…' : msg;
};

// ── Text-To-Speech ────────────────────────────────────────────────────────────
export const generateSpeech = async (
  text: string,
  voice: VoiceName,
  emotion: Emotion = Emotion.Neutral
): Promise<string> => {
  try {
    const emotionOption = EMOTION_OPTIONS.find((e) => e.id === emotion);
    const prefix = emotionOption ? emotionOption.promptPrefix : "";
    const contentText = `${prefix}${text}`;

    const response = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: [{ parts: [{ text: contentText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const candidate = response.candidates?.[0];
    const audioPart = candidate?.content?.parts?.[0];

    if (!audioPart || !audioPart.inlineData || !audioPart.inlineData.data) {
      throw new Error("No audio data found in the response.");
    }

    return audioPart.inlineData.data;
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    throw error;
  }
};

// ── AI Script Enhancer ────────────────────────────────────────────────────────
export const enhanceScript = async (
  text: string,
  style: EnhancementStyle
): Promise<string> => {
  const styleGuides: Record<EnhancementStyle, string> = {
    Podcast:
      "Rewrite this as engaging podcast narration. Make it conversational, use rhetorical questions, second-person address ('you'), and natural speech rhythms. Keep a similar length.",
    "Audiobook Narrator":
      "Rewrite this as rich audiobook narration. Use vivid imagery, smooth prose, literary language, and expressive sentence structures. Keep a similar length.",
    "News Anchor":
      "Rewrite this as professional broadcast news. Use authoritative, concise language, active voice, clear structure (headline first), and objective tone. Keep a similar length.",
    Casual:
      "Rewrite this in a casual, friendly, relaxed conversational style. Use contractions, simple words, natural pacing, and a warm tone. Keep a similar length.",
    Dramatic:
      "Rewrite this with theatrical, intense, dramatic flair. Use powerful vocabulary, short punchy sentences mixed with longer ones, vivid emotion, and suspenseful pacing. Keep a similar length.",
  };

  const prompt = `You are a professional speech writer. ${styleGuides[style]}

IMPORTANT: Return ONLY the rewritten text with no commentary, explanations, quotes, or formatting. Just the raw rewritten text itself.

Original text:
${text}`;

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: [{ parts: [{ text: prompt }] }],
    });

    const result = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!result) throw new Error("No enhanced text returned.");
    return result.trim();
  } catch (error) {
    console.error("Script Enhancer Error:", error);
    throw new Error(cleanError(error));
  }
};

// ── Auto Language Detector ────────────────────────────────────────────────────
const LANGUAGE_VOICE_MAP: Partial<Record<Language, VoiceName>> = {
  [Language.Tamil]: VoiceName.Kore,
  [Language.English]: VoiceName.Charon,
  [Language.Hindi]: VoiceName.Puck,
  [Language.Telugu]: VoiceName.Kore,
  [Language.Kannada]: VoiceName.Kore,
  [Language.Malayalam]: VoiceName.Kore,
  [Language.French]: VoiceName.Zephyr,
  [Language.Spanish]: VoiceName.Zephyr,
  [Language.German]: VoiceName.Fenrir,
  [Language.Japanese]: VoiceName.Zephyr,
};

export const detectLanguage = async (
  text: string
): Promise<LanguageDetectionResult> => {
  const supportedLanguages = [
    "English",
    "Tamil",
    "Hindi",
    "Telugu",
    "Kannada",
    "Malayalam",
    "French",
    "Spanish",
    "German",
    "Japanese",
  ];

  const prompt = `Analyze the following text and detect its primary language.

Return a JSON object with these exact fields:
{
  "language": "<one of: ${supportedLanguages.join(", ")}>",
  "confidence": <integer 0-100>,
  "reasoning": "<one short sentence explaining the detection>"
}

Text to analyze:
"""
${text.slice(0, 500)}
"""

Return ONLY valid JSON, no markdown, no code block.`;

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: [{ parts: [{ text: prompt }] }],
    });

    const raw = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!raw) throw new Error("No response from language detector.");

    // Strip any accidental markdown fences
    const cleaned = raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
    const parsed = JSON.parse(cleaned);

    const detectedLang =
      (parsed.language as Language) || Language.English;
    const suggestedVoice =
      LANGUAGE_VOICE_MAP[detectedLang] ?? VoiceName.Charon;

    return {
      language: detectedLang,
      confidence: Math.min(100, Math.max(0, Number(parsed.confidence) || 50)),
      suggestedVoice,
      reasoning: parsed.reasoning || "",
    };
  } catch (error) {
    console.error("Language Detection Error:", error);
    // Graceful fallback
    return {
      language: Language.English,
      confidence: 0,
      suggestedVoice: VoiceName.Charon,
      reasoning: "Detection failed.",
    };
  }
};

// ── Emotion Timeline Builder ───────────────────────────────────────────────────
export const buildEmotionTimeline = async (
  text: string
): Promise<EmotionSegment[]> => {
  const validEmotions = ["Neutral", "Happy", "Sad", "Angry", "Excited", "Calm"];

  const prompt = `You are a speech director. Split the following text into meaningful spoken segments (typically 1–2 sentences each) and assign the most fitting emotional tone to each segment.

Valid emotions: ${validEmotions.join(", ")}

Return a JSON array with this exact structure (no markdown, no code block, only raw JSON):
[
  { "id": "1", "text": "<segment text>", "emotion": "<emotion>" },
  { "id": "2", "text": "<segment text>", "emotion": "<emotion>" }
]

Rules:
- Keep the original text exactly (no changes to words)
- Split at natural sentence boundaries
- Make 3–8 segments total
- Choose emotions that match the content and context

Text to split:
"""
${text}
"""`;

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: [{ parts: [{ text: prompt }] }],
    });

    const raw = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!raw) throw new Error("No response from emotion timeline builder.");

    const cleaned = raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
    const parsed: EmotionSegment[] = JSON.parse(cleaned);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("Invalid timeline structure returned.");
    }

    // Validate each segment's emotion
    return parsed.map((seg, i) => ({
      ...seg,
      id: seg.id || String(i + 1),
      emotion: validEmotions.includes(seg.emotion)
        ? (seg.emotion as Emotion)
        : Emotion.Neutral,
    }));
  } catch (error) {
    console.error("Emotion Timeline Error:", error);
    throw new Error(cleanError(error));
  }
};