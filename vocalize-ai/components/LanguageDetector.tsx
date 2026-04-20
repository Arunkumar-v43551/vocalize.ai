import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, Zap, X } from 'lucide-react';
import { detectLanguage } from '../services/geminiService';
import { Language, VoiceName, LanguageDetectionResult } from '../types';

interface Props {
  text: string;
  currentLanguage: Language;
  currentVoice: VoiceName;
  onLanguageDetected: (lang: Language, voice: VoiceName) => void;
  disabled?: boolean;
}

const LANG_FLAG: Partial<Record<Language, string>> = {
  [Language.English]:   '🇬🇧',
  [Language.Tamil]:     '🇮🇳',
  [Language.Hindi]:     '🇮🇳',
  [Language.Telugu]:    '🇮🇳',
  [Language.Kannada]:   '🇮🇳',
  [Language.Malayalam]: '🇮🇳',
  [Language.French]:    '🇫🇷',
  [Language.Spanish]:   '🇪🇸',
  [Language.German]:    '🇩🇪',
  [Language.Japanese]:  '🇯🇵',
};

const LanguageDetector: React.FC<Props> = ({
  text,
  currentLanguage,
  currentVoice,
  onLanguageDetected,
  disabled,
}) => {
  const [result, setResult] = useState<LanguageDetectionResult | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [lastText, setLastText] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-show suggestion when text changes meaningfully
  useEffect(() => {
    if (disabled || text.trim().length < 15) return;
    if (text === lastText) return;

    // Reset dismissed state when user types new content
    if (Math.abs(text.length - lastText.length) > 10) {
      setDismissed(false);
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsDetecting(true);
      try {
        const detection = await detectLanguage(text);
        setResult(detection);
        setLastText(text);
        // Auto-apply if very high confidence and different from current
        if (detection.confidence >= 92 && detection.language !== currentLanguage) {
          onLanguageDetected(detection.language, detection.suggestedVoice);
        }
      } catch {
        // Silent fail — this is a non-critical helper
      } finally {
        setIsDetecting(false);
      }
    }, 900);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, disabled]);

  const handleApply = () => {
    if (result) {
      onLanguageDetected(result.language, result.suggestedVoice);
      setDismissed(true);
    }
  };

  const showBadge = !dismissed && result && result.confidence > 0;
  const showSuggestion =
    showBadge &&
    result!.language !== currentLanguage &&
    result!.confidence >= 70;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Detecting spinner */}
      <AnimatePresence>
        {isDetecting && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/5"
          >
            <div className="w-2.5 h-2.5 border border-indigo-400/40 border-t-indigo-400 rounded-full animate-spin" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Detecting</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detection result badge */}
      <AnimatePresence>
        {showBadge && !isDetecting && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            className="flex items-center gap-2"
          >
            {/* Language pill */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/5">
              <Globe className="w-2.5 h-2.5 text-indigo-400" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                {LANG_FLAG[result!.language]} {result!.language}
              </span>
              {/* Confidence dot */}
              <div
                className="w-1.5 h-1.5 rounded-full ml-0.5"
                style={{
                  backgroundColor: result!.confidence >= 80
                    ? '#10b981'
                    : result!.confidence >= 60
                      ? '#f59e0b'
                      : '#64748b',
                }}
                title={`${result!.confidence}% confidence`}
              />
            </div>

            {/* Suggestion banner */}
            {showSuggestion && (
              <motion.div
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20"
              >
                <Zap className="w-2.5 h-2.5 text-amber-400" />
                <span className="text-[9px] font-bold text-amber-300 uppercase tracking-widest">
                  Switch to {result!.language}?
                </span>
                <button
                  id="lang-detect-apply-btn"
                  onClick={handleApply}
                  className="text-[9px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors uppercase tracking-widest"
                >
                  Apply
                </button>
                <button
                  onClick={() => setDismissed(true)}
                  className="text-slate-600 hover:text-slate-400 transition-colors"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LanguageDetector;
