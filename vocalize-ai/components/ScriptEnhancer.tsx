import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Check, ChevronRight, Loader2, Wand2 } from 'lucide-react';
import { enhanceScript } from '../services/geminiService';
import { EnhancementStyle, ENHANCEMENT_STYLES } from '../types';

interface Props {
  originalText: string;
  onAccept: (text: string) => void;
  disabled?: boolean;
}

type Step = 'idle' | 'pick-style' | 'loading' | 'review';

const ScriptEnhancer: React.FC<Props> = ({ originalText, onAccept, disabled }) => {
  const [step, setStep] = useState<Step>('idle');
  const [selectedStyle, setSelectedStyle] = useState<EnhancementStyle>('Podcast');
  const [enhancedText, setEnhancedText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleStyleSelect = async (style: EnhancementStyle) => {
    setSelectedStyle(style);
    setStep('loading');
    setError(null);
    try {
      const result = await enhanceScript(originalText, style);
      setEnhancedText(result);
      setStep('review');
    } catch (e: any) {
      setError(e.message || 'Enhancement failed. Please try again.');
      setStep('pick-style');
    }
  };

  const handleAccept = () => {
    onAccept(enhancedText);
    setStep('idle');
    setEnhancedText('');
  };

  const handleDismiss = () => {
    setStep('idle');
    setEnhancedText('');
    setError(null);
  };

  return (
    <>
      {/* Trigger Button */}
      <motion.button
        id="enhance-script-btn"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setStep('pick-style')}
        disabled={disabled || !originalText.trim()}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/20 border border-violet-500/30
                   text-[10px] font-bold uppercase tracking-widest text-violet-300
                   hover:bg-violet-600/30 hover:text-violet-200 transition-all
                   disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <Wand2 className="w-3 h-3" />
        <span>Enhance</span>
      </motion.button>

      {/* Overlay Panel */}
      <AnimatePresence>
        {step !== 'idle' && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={step !== 'loading' ? handleDismiss : undefined}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="w-full max-w-2xl bg-[#0a0f1e] border border-white/10 rounded-3xl shadow-2xl overflow-hidden pointer-events-auto">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-white">AI Script Enhancer</h2>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                        {step === 'pick-style' ? 'Choose a writing style' :
                         step === 'loading' ? `Enhancing as ${selectedStyle}...` :
                         'Review your enhanced script'}
                      </p>
                    </div>
                  </div>
                  {step !== 'loading' && (
                    <button
                      onClick={handleDismiss}
                      className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="p-6">
                  {/* Style Picker */}
                  {(step === 'pick-style') && (
                    <div>
                      {error && (
                        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                          {error}
                        </div>
                      )}
                      <div className="grid grid-cols-1 gap-3">
                        {ENHANCEMENT_STYLES.map((style) => (
                          <motion.button
                            key={style.id}
                            id={`enhance-style-${style.id.replace(/\s+/g, '-').toLowerCase()}`}
                            whileHover={{ scale: 1.01, x: 4 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => handleStyleSelect(style.id)}
                            className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5
                                       hover:bg-indigo-600/10 hover:border-indigo-500/30 transition-all text-left group"
                          >
                            <div className="flex items-center gap-4">
                              <span className="text-2xl">{style.emoji}</span>
                              <div>
                                <p className="text-sm font-bold text-white">{style.id}</p>
                                <p className="text-[11px] text-slate-500">{style.description}</p>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Loading */}
                  {step === 'loading' && (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-violet-500/30">
                          <Sparkles className="w-7 h-7 text-white animate-pulse" />
                        </div>
                        <Loader2 className="w-6 h-6 text-violet-400 animate-spin absolute -bottom-2 -right-2" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-white">Rewriting as {selectedStyle}</p>
                        <p className="text-xs text-slate-500 mt-1">Gemini is crafting your enhanced script...</p>
                      </div>
                      {/* Shimmer bars */}
                      <div className="w-full space-y-2 mt-2">
                        {[95, 80, 88, 65].map((w, i) => (
                          <div
                            key={i}
                            className="h-3 rounded-full bg-white/5 overflow-hidden"
                            style={{ width: `${w}%` }}
                          >
                            <div className="h-full w-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Review */}
                  {step === 'review' && (
                    <div>
                      <div className="grid grid-cols-2 gap-4 mb-5">
                        {/* Original */}
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-2">Original</p>
                          <div className="p-4 rounded-2xl bg-black/30 border border-white/5 text-slate-500 text-xs leading-relaxed max-h-52 overflow-y-auto custom-scrollbar">
                            {originalText}
                          </div>
                        </div>
                        {/* Enhanced */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-violet-400">
                              Enhanced · {selectedStyle}
                            </p>
                          </div>
                          <div className="p-4 rounded-2xl bg-violet-600/10 border border-violet-500/20 text-slate-200 text-xs leading-relaxed max-h-52 overflow-y-auto custom-scrollbar">
                            {enhancedText}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3">
                        <motion.button
                          id="enhance-accept-btn"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleAccept}
                          className="flex-1 h-12 flex items-center justify-center gap-2 rounded-2xl
                                     bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold
                                     shadow-xl shadow-violet-600/20 hover:from-violet-500 hover:to-indigo-500 transition-all"
                        >
                          <Check className="w-4 h-4" />
                          Use Enhanced Version
                        </motion.button>
                        <motion.button
                          id="enhance-retry-btn"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setStep('pick-style')}
                          className="h-12 px-5 flex items-center justify-center gap-2 rounded-2xl
                                     bg-white/5 border border-white/10 text-slate-300 text-sm font-bold
                                     hover:bg-white/10 transition-all"
                        >
                          Try Another
                        </motion.button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default ScriptEnhancer;
