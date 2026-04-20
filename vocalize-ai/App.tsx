import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Download, 
  Mic, 
  Settings2, 
  Type as TypeIcon, 
  Languages, 
  Sparkles,
  Volume2,
  ChevronRight,
  AlertCircle,
  Edit3,
  BookOpen,
  History,
  LogOut,
  User as UserIcon,
  BarChart2,
  Clapperboard,
} from 'lucide-react';
import { generateSpeech } from './services/geminiService';
import { decodeBase64, pcmToWavBlob } from './utils/audioUtils';
import { processTextForTiming, TextToken } from './utils/textUtils';
import VoiceSelector from './components/VoiceSelector';
import Visualizer from './components/Visualizer';
import AuthModal from './components/AuthModal';
import HistorySidebar from './components/HistorySidebar';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import ScriptEnhancer from './components/ScriptEnhancer';
import LanguageDetector from './components/LanguageDetector';
import EmotionTimeline from './components/EmotionTimeline';
import { onAuthChange, signOut } from './firebase/authService';
import { saveSession, formatSessionLabel, VocalSession } from './firebase/sessionService';
import { User } from 'firebase/auth';
import { VoiceName, Language, SAMPLE_TEXTS, SampleText, Emotion, EMOTION_OPTIONS } from './types';

const App: React.FC = () => {
  // ── Firebase Auth ──────────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  // State
  const [text, setText] = useState<string>(SAMPLE_TEXTS[2].content); // Default to Tamil Greeting
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>(VoiceName.Kore);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(Language.Tamil);
  const [selectedEmotion, setSelectedEmotion] = useState<Emotion>(Emotion.Neutral);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1.0);
  const [currentBlobUrl, setCurrentBlobUrl] = useState<string | null>(null);
  
  // Highlight / Reader Mode State
  const [isReaderMode, setIsReaderMode] = useState(false);
  const [tokens, setTokens] = useState<TextToken[]>([]);
  const [activeTokenId, setActiveTokenId] = useState<number | null>(null);
  const [hasGeneratedAudio, setHasGeneratedAudio] = useState(false);

  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioCtx({ sampleRate: 24000 });
      
      const analyzerNode = audioContextRef.current.createAnalyser();
      analyzerNode.fftSize = 256;
      analyserRef.current = analyzerNode;
      setAnalyser(analyzerNode);
    }

    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    if (audioRef.current && audioContextRef.current && !mediaSourceRef.current && analyserRef.current) {
      try {
        mediaSourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
        mediaSourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
      } catch (e) {
        console.error("Error creating MediaElementSource:", e);
      }
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, [speed]);

  // Animation Loop for Highlighting
  const updateHighlight = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      const currentTime = audioRef.current.currentTime;
      
      // Find the active token
      const active = tokens.find(t => 
        t.isWord && 
        t.start !== undefined && 
        t.end !== undefined && 
        currentTime >= t.start && 
        currentTime < t.end
      );

      if (active) {
        setActiveTokenId(active.id);
      } else if (currentTime >= (tokens[tokens.length - 1]?.end || 0)) {
        setActiveTokenId(null);
      }

      animationFrameRef.current = requestAnimationFrame(updateHighlight);
    }
  }, [tokens]);

  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateHighlight);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setActiveTokenId(null);
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, updateHighlight]);

  const handleGenerate = async () => {
    if (!text.trim()) return;
    if (!process.env.API_KEY) {
      setError("API Key is missing.");
      return;
    }

    setIsLoading(true);
    setError(null);
    stopAudio();
    setHasGeneratedAudio(false);

    try {
      initAudioContext();
      
      const base64Audio = await generateSpeech(text, selectedVoice, selectedEmotion);
      const rawBytes = decodeBase64(base64Audio);
      
      // Process WAV
      const wavBlob = pcmToWavBlob(rawBytes, 24000);
      const blobUrl = URL.createObjectURL(wavBlob);
      
      // Calculate Duration for Timings (Estimate based on PCM size)
      // 24kHz * 16bit * 1ch = 48000 bytes/sec
      const estimatedDuration = rawBytes.length / 48000;
      const calculatedTokens = processTextForTiming(text, estimatedDuration);
      setTokens(calculatedTokens);
      
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
      }
      setCurrentBlobUrl(blobUrl);
      setHasGeneratedAudio(true);

      // ── Save session to Firestore ──────────────────────────────────────────
      if (currentUser) {
        try {
          await saveSession({
            uid:             currentUser.uid,
            text,
            voice:           selectedVoice,
            language:        selectedLanguage,
            emotion:         selectedEmotion,
            speed,
            audioDurationSec: estimatedDuration,
            label:           formatSessionLabel(selectedEmotion, selectedVoice, selectedLanguage),
          });
        } catch (saveErr) {
          console.warn('Session save failed (non-critical):', saveErr);
        }
      }

      // Auto-switch to reader mode
      setIsReaderMode(true);

      if (audioRef.current) {
        audioRef.current.src = blobUrl;
        audioRef.current.playbackRate = speed;
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (e) {
          console.warn("Autoplay blocked:", e);
        }
      }

    } catch (err: any) {
      setError(err.message || "Failed to generate speech");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Load a session from history ────────────────────────────────────────────
  const handleLoadSession = (session: VocalSession) => {
    setText(session.text);
    setSelectedVoice(session.voice as VoiceName);
    setSelectedLanguage(session.language as Language);
    setSelectedEmotion(session.emotion as Emotion);
    setSpeed(session.speed);
    setHasGeneratedAudio(false);
    setIsReaderMode(false);
  };

  const handleReplay = async () => {
    if (audioRef.current && currentBlobUrl) {
      initAudioContext();
      audioRef.current.currentTime = 0;
      audioRef.current.playbackRate = speed;
      setIsReaderMode(true);
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (e) {
        console.error("Playback failed:", e);
      }
    }
  };

  const handleDownload = () => {
    if (currentBlobUrl) {
      const a = document.createElement('a');
      a.href = currentBlobUrl;
      a.download = `vocalize-${selectedVoice}-${selectedEmotion.toLowerCase()}-${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const handleLanguageChange = (lang: Language) => {
    setSelectedLanguage(lang);
    // Find first sample text for this language
    const defaultSample = SAMPLE_TEXTS.find(s => s.language === lang);
    if (defaultSample) setText(defaultSample.content);
  };

  const handleSampleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sampleId = e.target.value;
    const sample = SAMPLE_TEXTS.find(s => s.id === sampleId);
    if (sample) {
      setText(sample.content);
      setSelectedLanguage(sample.language);
      setHasGeneratedAudio(false);
      setIsReaderMode(false);
    }
  };

  // ── Loading screen ─────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="fixed inset-0 bg-[#020617] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30">
            <Mic className="w-6 h-6 text-white" />
          </div>
          <div className="w-6 h-6 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // ── Auth guard ─────────────────────────────────────────────────────────────
  if (!currentUser) {
    return <AuthModal />;
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#020617] text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">

      {/* History Sidebar */}
      <HistorySidebar
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        uid={currentUser.uid}
        onLoadSession={handleLoadSession}
      />

      {/* Analytics Dashboard */}
      <AnalyticsDashboard
        isOpen={showAnalytics}
        onClose={() => setShowAnalytics(false)}
        uid={currentUser.uid}
      />
      
      {/* Immersive Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-blue-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '4s' }}></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#020617]/70 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-4"
          >
             <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/20 ring-1 ring-white/20">
               <Mic className="w-6 h-6 text-white" />
             </div>
             <div>
               <h1 className="text-2xl font-bold tracking-tighter bg-gradient-to-r from-white via-white to-slate-400 bg-clip-text text-transparent">
                 Vocalize AI
               </h1>
               <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Neural Speech Synthesis</p>
             </div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-4"
          >
            <div className="hidden md:flex items-center space-x-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Gemini 2.5 Flash</span>
            </div>

            {/* Analytics Button */}
            <motion.button
              id="open-analytics-btn"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAnalytics(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-all uppercase tracking-widest"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Analytics</span>
            </motion.button>

            {/* Timeline Button */}
            <motion.button
              id="open-timeline-btn"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowTimeline(t => !t)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold transition-all uppercase tracking-widest
                ${
                  showTimeline
                    ? 'bg-pink-600/20 border-pink-500/30 text-pink-300'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
            >
              <Clapperboard className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Timeline</span>
            </motion.button>

            {/* History Button */}
            <motion.button
              id="open-history-btn"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowHistory(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-all uppercase tracking-widest"
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">History</span>
            </motion.button>

            {/* User Avatar + Sign Out */}
            <div className="flex items-center gap-2">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'User'}
                  className="w-9 h-9 rounded-full ring-2 ring-indigo-500/30"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-indigo-400" />
                </div>
              )}
              <motion.button
                id="sign-out-btn"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={signOut}
                title="Sign out"
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-slate-500 hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/5 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          </motion.div>
        </div>
      </nav>

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 relative z-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Left Panel: Configuration */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-4 space-y-8"
          >
            <div className="glass rounded-3xl p-8 shadow-2xl space-y-8">
              
              {/* Language & Samples */}
              <section>
                <div className="flex items-center space-x-2 mb-4">
                  <Languages className="w-4 h-4 text-indigo-400" />
                  <h2 className="text-xs uppercase tracking-widest text-slate-400 font-bold">Language & Context</h2>
                </div>
                
                <div className="flex p-1.5 bg-black/40 rounded-2xl border border-white/5 mb-4">
                  <button
                    onClick={() => handleLanguageChange(Language.Tamil)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                      selectedLanguage === Language.Tamil 
                        ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Tamil
                  </button>
                  <button
                    onClick={() => handleLanguageChange(Language.English)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                      selectedLanguage === Language.English 
                        ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    English
                  </button>
                </div>

                <div className="relative group">
                  <select 
                    onChange={handleSampleSelect}
                    className="w-full bg-black/40 border border-white/10 text-slate-300 text-sm rounded-xl p-4 outline-none focus:ring-2 focus:ring-indigo-500/50 hover:bg-black/60 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Load a Sample Text...</option>
                    {SAMPLE_TEXTS.map(sample => (
                      <option key={sample.id} value={sample.id}>
                        {sample.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <ChevronRight className="w-4 h-4 rotate-90" />
                  </div>
                </div>
              </section>

              {/* Voice Model */}
              <section>
                <div className="flex items-center space-x-2 mb-4">
                  <Volume2 className="w-4 h-4 text-indigo-400" />
                  <h2 className="text-xs uppercase tracking-widest text-slate-400 font-bold">Voice Model</h2>
                </div>
                <VoiceSelector 
                  selectedVoice={selectedVoice} 
                  onSelect={setSelectedVoice} 
                  disabled={isLoading || isPlaying}
                />
              </section>

              {/* Emotional Tone */}
              <section>
                 <div className="flex items-center space-x-2 mb-4">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <h2 className="text-xs uppercase tracking-widest text-slate-400 font-bold">Emotional Tone</h2>
                </div>
                 <div className="grid grid-cols-3 gap-3">
                    {EMOTION_OPTIONS.map((emotion) => (
                      <motion.button
                        key={emotion.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedEmotion(emotion.id)}
                        disabled={isLoading || isPlaying}
                        className={`
                          flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-300
                          ${selectedEmotion === emotion.id 
                            ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200 shadow-lg shadow-indigo-500/10' 
                            : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300'}
                          ${(isLoading || isPlaying) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        `}
                      >
                        <span className="text-2xl mb-1.5">{emotion.emoji}</span>
                        <span className="text-[9px] font-bold tracking-widest uppercase">{emotion.label}</span>
                      </motion.button>
                    ))}
                 </div>
              </section>

              {/* Speech Rate */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Settings2 className="w-4 h-4 text-indigo-400" />
                    <h2 className="text-xs uppercase tracking-widest text-slate-400 font-bold">Speech Rate</h2>
                  </div>
                  <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-md border border-indigo-500/20">{speed.toFixed(2)}x</span>
                </div>
                <div className="px-1">
                   <input 
                      type="range" 
                      min="0.5" 
                      max="2.0" 
                      step="0.1" 
                      value={speed}
                      onChange={(e) => setSpeed(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
                    />
                </div>
                <div className="flex justify-between mt-3 text-[9px] text-slate-600 font-bold uppercase tracking-widest">
                  <button onClick={() => setSpeed(0.5)} className="hover:text-indigo-400 transition-colors">Slow</button>
                  <button onClick={() => setSpeed(1.0)} className="hover:text-indigo-400 transition-colors">Normal</button>
                  <button onClick={() => setSpeed(2.0)} className="hover:text-indigo-400 transition-colors">Fast</button>
                </div>
              </section>

            </div>
          </motion.div>

          {/* Right Panel: Output & Controls */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-8 flex flex-col space-y-8"
          >
            
            {/* Input / Reader Area */}
            <div className={`
              relative flex-grow min-h-[400px] glass rounded-3xl shadow-2xl transition-all duration-700 flex flex-col overflow-hidden
              ${isReaderMode ? 'ring-2 ring-indigo-500/30' : 'ring-1 ring-white/5'}
            `}>
               
               {/* Toolbar */}
               <div className="flex items-center justify-between px-8 py-4 border-b border-white/5 bg-black/20">
                 <div className="flex items-center space-x-2 text-slate-400">
                   {isReaderMode ? <BookOpen className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                   <span className="text-xs font-bold uppercase tracking-widest">{isReaderMode ? 'Reader Mode' : 'Editor'}</span>
                 </div>
                 <div className="flex items-center gap-2">
                   {/* Script Enhancer */}
                   {!isReaderMode && (
                     <ScriptEnhancer
                       originalText={text}
                       onAccept={(enhanced) => {
                         setText(enhanced);
                         setHasGeneratedAudio(false);
                         setIsReaderMode(false);
                       }}
                       disabled={isLoading || isPlaying}
                     />
                   )}
                   {hasGeneratedAudio && (
                     <button 
                      onClick={() => setIsReaderMode(!isReaderMode)}
                      className="flex items-center space-x-2 px-4 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-indigo-300 hover:bg-white/10 transition-all active:scale-95"
                     >
                       {isReaderMode ? <Edit3 className="w-3 h-3" /> : <BookOpen className="w-3 h-3" />}
                       <span>{isReaderMode ? 'Edit Text' : 'View Reader'}</span>
                     </button>
                   )}
                 </div>
               </div>

               <div className="flex-grow relative overflow-hidden">
                 <AnimatePresence mode="wait">
                   {isReaderMode && hasGeneratedAudio ? (
                     <motion.div 
                        key="reader"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.02 }}
                        className="absolute inset-0 p-10 text-2xl leading-[1.6] text-slate-300 overflow-y-auto custom-scrollbar font-light"
                     >
                       {tokens.map((token) => (
                         <span 
                           key={token.id}
                           className={`
                             transition-all duration-300 rounded-lg px-2 py-1 mx-1 inline-block
                             ${token.id === activeTokenId 
                               ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-600/40 scale-110 font-medium translate-y-[-2px]' 
                               : 'text-slate-400/60'}
                           `}
                         >
                           {token.text}
                         </span>
                       ))}
                     </motion.div>
                   ) : (
                     <motion.textarea
                        key="editor"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        value={text}
                        onChange={(e) => {
                          setText(e.target.value);
                          setHasGeneratedAudio(false); 
                        }}
                        className="absolute inset-0 w-full h-full bg-transparent p-10 text-xl leading-relaxed text-slate-200 outline-none resize-none placeholder:text-slate-700 font-light"
                        placeholder="Enter text here to synthesize..."
                        disabled={isLoading}
                     />
                   )}
                 </AnimatePresence>
               </div>
               
               {!isReaderMode && (
                 <div className="px-8 py-4 bg-black/20 border-t border-white/5 flex items-center justify-between">
                   {/* Language Detector */}
                   <LanguageDetector
                     text={text}
                     currentLanguage={selectedLanguage}
                     currentVoice={selectedVoice}
                     onLanguageDetected={(lang, voice) => {
                       setSelectedLanguage(lang);
                       setSelectedVoice(voice);
                     }}
                     disabled={isLoading || isPlaying}
                   />
                   <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                     {text.length} Characters
                   </span>
                 </div>
               )}
            </div>

            {/* Visualizer & Actions */}
            <div className="glass rounded-3xl p-8 shadow-2xl">
               
               {/* Visualizer Container */}
               <div className={`
                 relative w-full h-48 bg-black/40 rounded-2xl overflow-hidden border transition-all duration-700
                 ${isPlaying ? 'border-indigo-500/50 shadow-2xl shadow-indigo-500/20' : 'border-white/5'}
               `}>
                  <audio 
                    ref={audioRef} 
                    className="hidden" 
                    onEnded={() => {
                      setIsPlaying(false);
                      setActiveTokenId(null);
                    }} 
                    onPause={() => setIsPlaying(false)}
                    onPlay={() => setIsPlaying(true)}
                    crossOrigin="anonymous"
                  />
                  
                  <AnimatePresence>
                    {isPlaying ? (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="w-full h-full"
                      >
                        <Visualizer analyser={analyser} isPlaying={isPlaying} />
                        <div className="absolute top-4 right-4 flex items-center space-x-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                          <span className="text-[10px] uppercase tracking-widest text-red-400 font-bold">Live Visualizer</span>
                        </div>
                      </motion.div>
                    ) : (
                       <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600">
                          <div className="flex items-end space-x-1.5 h-16 mb-4 opacity-20">
                            {[...Array(12)].map((_, i) => (
                              <div 
                                key={i} 
                                className="w-2 bg-indigo-500 rounded-full animate-pulse" 
                                style={{ 
                                  height: `${20 + Math.random() * 60}%`,
                                  animationDelay: `${i * 0.1}s` 
                                }} 
                              />
                            ))}
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40">Awaiting Signal</span>
                       </div>
                    )}
                  </AnimatePresence>
               </div>

               {/* Control Bar */}
               <div className="mt-8 flex flex-col sm:flex-row gap-6">
                  
                  {/* Primary Action */}
                  <div className="flex-grow">
                    {!isPlaying ? (
                      <motion.button
                        whileHover={{ scale: 1.01, translateY: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleGenerate}
                        disabled={isLoading || !text.trim()}
                        className={`
                          w-full h-16 rounded-2xl font-bold text-lg shadow-2xl transition-all duration-300
                          flex items-center justify-center space-x-3
                          ${isLoading 
                            ? 'bg-white/5 text-slate-500 cursor-wait border border-white/5' 
                            : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-600/20'}
                        `}
                      >
                        {isLoading ? (
                          <>
                            <div className="w-5 h-5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin"></div>
                            <span className="uppercase tracking-widest text-sm">Synthesizing...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-6 h-6" />
                            <span className="uppercase tracking-widest text-sm">{hasGeneratedAudio ? "Regenerate Audio" : "Generate Speech"}</span>
                          </>
                        )}
                      </motion.button>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.01, translateY: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={stopAudio}
                        className="w-full h-16 rounded-2xl font-bold text-lg bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center justify-center space-x-3"
                      >
                        <Pause className="w-6 h-6" fill="currentColor" />
                        <span className="uppercase tracking-widest text-sm">Stop Playback</span>
                      </motion.button>
                    )}
                  </div>

                  {/* Secondary Actions */}
                  <div className="flex space-x-4">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleReplay}
                      disabled={!currentBlobUrl || isLoading || isPlaying}
                      className="h-16 w-16 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-indigo-400 hover:bg-white/10 hover:text-indigo-300 disabled:opacity-20 disabled:cursor-not-allowed transition-all shadow-xl"
                      title="Replay"
                    >
                      <RotateCcw className="w-6 h-6" />
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleDownload}
                      disabled={!currentBlobUrl || isLoading}
                      className="h-16 w-16 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-emerald-400 hover:bg-white/10 hover:text-emerald-300 disabled:opacity-20 disabled:cursor-not-allowed transition-all shadow-xl"
                      title="Download Audio"
                    >
                      <Download className="w-6 h-6" />
                    </motion.button>
                  </div>

               </div>
               
               <AnimatePresence>
                 {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center space-x-3 text-red-400 text-xs font-medium"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
               </AnimatePresence>

               {/* Emotion Timeline */}
               <AnimatePresence>
                 {showTimeline && (
                   <motion.div
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: 10 }}
                     className="mt-6"
                   >
                     <EmotionTimeline
                       text={text}
                       selectedVoice={selectedVoice}
                       disabled={isLoading}
                     />
                   </motion.div>
                 )}
               </AnimatePresence>

            </div>
          </motion.div>

        </div>

      </main>
      
      {/* Footer */}
      <footer className="py-10 text-center relative z-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-slate-600">
          Powered by Google Gemini Neural API • 2026
        </p>
      </footer>

    </div>
  );
};

export default App;