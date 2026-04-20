import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clapperboard, Play, Pause, Loader2, ChevronDown, RotateCcw, X } from 'lucide-react';
import { buildEmotionTimeline, generateSpeech } from '../services/geminiService';
import { EmotionSegment, Emotion, EMOTION_OPTIONS, VoiceName } from '../types';
import { decodeBase64, pcmToWavBlob } from '../utils/audioUtils';

interface Props {
  text: string;
  selectedVoice: VoiceName;
  disabled?: boolean;
}

const EMOTION_COLORS: Record<Emotion, { bg: string; border: string; text: string; glow: string }> = {
  [Emotion.Neutral]:  { bg: 'bg-indigo-500/15',  border: 'border-indigo-500/30',  text: 'text-indigo-300',  glow: 'shadow-indigo-500/20' },
  [Emotion.Happy]:    { bg: 'bg-amber-500/15',   border: 'border-amber-500/30',   text: 'text-amber-300',   glow: 'shadow-amber-500/20'  },
  [Emotion.Excited]:  { bg: 'bg-pink-500/15',    border: 'border-pink-500/30',    text: 'text-pink-300',    glow: 'shadow-pink-500/20'   },
  [Emotion.Sad]:      { bg: 'bg-sky-500/15',     border: 'border-sky-500/30',     text: 'text-sky-300',     glow: 'shadow-sky-500/20'    },
  [Emotion.Angry]:    { bg: 'bg-red-500/15',     border: 'border-red-500/30',     text: 'text-red-300',     glow: 'shadow-red-500/20'    },
  [Emotion.Calm]:     { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-300', glow: 'shadow-emerald-500/20'},
};

const EMOTION_EMOJI: Record<Emotion, string> = {
  [Emotion.Neutral]: '😐', [Emotion.Happy]: '😊', [Emotion.Excited]: '🤩',
  [Emotion.Sad]: '😢',    [Emotion.Angry]: '😠', [Emotion.Calm]: '😌',
};

type BuildState = 'idle' | 'building' | 'ready' | 'playing';

const EmotionTimeline: React.FC<Props> = ({ text, selectedVoice, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [buildState, setBuildState] = useState<BuildState>('idle');
  const [segments, setSegments] = useState<EmotionSegment[]>([]);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [synthesizingId, setSynthesizingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleBuild = async () => {
    if (!text.trim()) return;
    setBuildState('building');
    setError(null);
    setSegments([]);
    setActiveSegmentId(null);
    try {
      const result = await buildEmotionTimeline(text);
      setSegments(result);
      setBuildState('ready');
    } catch (e: any) {
      setError(e.message || 'Failed to build timeline. Try again.');
      setBuildState('idle');
    }
  };

  const handlePlayTimeline = async () => {
    if (segments.length === 0) return;
    setBuildState('playing');
    setActiveSegmentId(null);

    for (const seg of segments) {
      setActiveSegmentId(seg.id);
      setSynthesizingId(seg.id);
      try {
        const base64 = await generateSpeech(seg.text, selectedVoice, seg.emotion);
        setSynthesizingId(null);
        const rawBytes = decodeBase64(base64);
        const wavBlob = pcmToWavBlob(rawBytes, 24000);
        const url = URL.createObjectURL(wavBlob);

        await new Promise<void>((resolve, reject) => {
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
          audio.onerror = reject;
          audio.play().catch(reject);
        });
      } catch {
        setSynthesizingId(null);
        // Skip failed segment, continue
      }
    }

    setActiveSegmentId(null);
    setBuildState('ready');
  };

  const handleStop = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    setActiveSegmentId(null);
    setSynthesizingId(null);
    setBuildState('ready');
  };

  const handleEmotionChange = (segId: string, emotion: Emotion) => {
    setSegments(prev => prev.map(s => s.id === segId ? { ...s, emotion } : s));
    setEditingId(null);
  };

  const handleReset = () => {
    handleStop();
    setBuildState('idle');
    setSegments([]);
    setError(null);
  };

  return (
    <div className="w-full">
      {/* Collapsed header / trigger */}
      <button
        id="emotion-timeline-toggle-btn"
        onClick={() => setIsOpen(o => !o)}
        disabled={disabled}
        className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl
                   bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10
                   transition-all group disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-2">
          <Clapperboard className="w-4 h-4 text-pink-400" />
          <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
            Emotion Timeline
          </span>
          {segments.length > 0 && (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-pink-500/20 border border-pink-500/20 text-pink-300">
              {segments.length} segments
            </span>
          )}
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
        </motion.div>
      </button>

      {/* Expandable panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pt-3 space-y-4">
              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {error}
                </div>
              )}

              {/* Idle & Building state */}
              {(buildState === 'idle' || buildState === 'building') && (
                <div className="flex flex-col items-center py-8 gap-4">
                  {buildState === 'idle' ? (
                    <>
                      <div className="text-4xl">🎬</div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-white">Build Emotion Timeline</p>
                        <p className="text-xs text-slate-500 mt-1 max-w-xs">
                          Gemini will split your text into segments and assign each a fitting emotion for richer, more expressive playback.
                        </p>
                      </div>
                      <motion.button
                        id="build-timeline-btn"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={handleBuild}
                        disabled={!text.trim()}
                        className="flex items-center gap-2 px-6 py-3 rounded-2xl
                                   bg-gradient-to-r from-pink-600 to-rose-600 text-white text-sm font-bold
                                   shadow-xl shadow-pink-600/20 hover:from-pink-500 hover:to-rose-500
                                   disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        <Clapperboard className="w-4 h-4" />
                        Build Timeline
                      </motion.button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-6 h-6 text-pink-400 animate-spin" />
                        <span className="text-sm font-bold text-white">Analyzing your text...</span>
                      </div>
                      {/* Skeleton segments */}
                      <div className="w-full space-y-2">
                        {[75, 55, 85, 65].map((w, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <div className="w-16 h-6 rounded-lg bg-white/5 animate-pulse" />
                            <div
                              className="h-6 rounded-lg bg-white/5 animate-pulse flex-1"
                              style={{ maxWidth: `${w}%` }}
                            />
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Timeline Segments */}
              {(buildState === 'ready' || buildState === 'playing') && segments.length > 0 && (
                <div className="space-y-2">
                  {segments.map((seg) => {
                    const colors = EMOTION_COLORS[seg.emotion] || EMOTION_COLORS[Emotion.Neutral];
                    const isActive = activeSegmentId === seg.id;
                    const isSynth = synthesizingId === seg.id;

                    return (
                      <motion.div
                        key={seg.id}
                        layout
                        animate={isActive ? { scale: 1.01 } : { scale: 1 }}
                        className={`relative p-4 rounded-2xl border transition-all duration-300 ${colors.bg} ${colors.border}
                                    ${isActive ? `shadow-lg ${colors.glow}` : ''}`}
                      >
                        {/* Active indicator */}
                        {isActive && (
                          <motion.div
                            layoutId="active-indicator"
                            className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-current"
                            style={{ color: 'currentColor' }}
                          />
                        )}

                        <div className="flex items-start gap-3">
                          {/* Emotion badge (clickable to change) */}
                          <div className="relative shrink-0">
                            <button
                              onClick={() => setEditingId(editingId === seg.id ? null : seg.id)}
                              disabled={buildState === 'playing'}
                              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold
                                          ${colors.bg} ${colors.border} ${colors.text} border
                                          hover:opacity-80 transition-all disabled:pointer-events-none`}
                              title="Click to change emotion"
                            >
                              <span>{EMOTION_EMOJI[seg.emotion]}</span>
                              <span className="text-[9px] uppercase tracking-widest">{seg.emotion}</span>
                            </button>

                            {/* Emotion picker dropdown */}
                            <AnimatePresence>
                              {editingId === seg.id && (
                                <motion.div
                                  initial={{ opacity: 0, y: 4, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 4, scale: 0.95 }}
                                  className="absolute top-full left-0 mt-1 z-20 bg-[#0a0f1e] border border-white/10 rounded-xl p-1.5 shadow-2xl grid grid-cols-3 gap-1 w-44"
                                >
                                  {EMOTION_OPTIONS.map(opt => (
                                    <button
                                      key={opt.id}
                                      onClick={() => handleEmotionChange(seg.id, opt.id)}
                                      className={`flex flex-col items-center p-2 rounded-lg transition-all
                                                  hover:bg-white/10 ${seg.emotion === opt.id ? 'bg-white/10' : ''}`}
                                    >
                                      <span className="text-base">{opt.emoji}</span>
                                      <span className="text-[8px] font-bold text-slate-400 mt-0.5">{opt.label}</span>
                                    </button>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* Text */}
                          <p className="text-xs text-slate-300 leading-relaxed flex-1 pt-1">
                            {seg.text}
                          </p>

                          {/* Synth spinner */}
                          {isSynth && (
                            <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin shrink-0 mt-1" />
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Control Row */}
              {(buildState === 'ready' || buildState === 'playing') && (
                <div className="flex items-center gap-3 pt-1">
                  {buildState === 'ready' ? (
                    <motion.button
                      id="play-timeline-btn"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handlePlayTimeline}
                      className="flex-1 h-12 flex items-center justify-center gap-2 rounded-2xl
                                 bg-gradient-to-r from-pink-600 to-rose-600 text-white text-sm font-bold
                                 shadow-xl shadow-pink-600/20 hover:from-pink-500 hover:to-rose-500 transition-all"
                    >
                      <Play className="w-4 h-4" fill="currentColor" />
                      Play Full Timeline
                    </motion.button>
                  ) : (
                    <motion.button
                      id="stop-timeline-btn"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleStop}
                      className="flex-1 h-12 flex items-center justify-center gap-2 rounded-2xl
                                 bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold
                                 hover:bg-red-500/20 transition-all"
                    >
                      <Pause className="w-4 h-4" fill="currentColor" />
                      Stop Playback
                    </motion.button>
                  )}

                  <motion.button
                    id="rebuild-timeline-btn"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleBuild}
                    disabled={buildState === 'playing'}
                    title="Rebuild timeline"
                    className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10
                               text-slate-400 hover:text-white hover:bg-white/10 transition-all
                               disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </motion.button>

                  <motion.button
                    id="reset-timeline-btn"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleReset}
                    disabled={buildState === 'playing'}
                    title="Reset"
                    className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10
                               text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-all
                               disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmotionTimeline;
