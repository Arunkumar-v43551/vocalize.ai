import React from 'react';
import { motion } from 'motion/react';
import { User, UserCircle, Check } from 'lucide-react';
import { VoiceName, VOICE_OPTIONS, VoiceOption } from '../types';

interface VoiceSelectorProps {
  selectedVoice: VoiceName;
  onSelect: (voice: VoiceName) => void;
  disabled?: boolean;
}

const VoiceSelector: React.FC<VoiceSelectorProps> = ({ selectedVoice, onSelect, disabled }) => {
  return (
    <div className="grid grid-cols-1 gap-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
      {VOICE_OPTIONS.map((option: VoiceOption) => (
        <motion.button
          key={option.id}
          whileHover={!disabled ? { scale: 1.02, x: 4 } : {}}
          whileTap={!disabled ? { scale: 0.98 } : {}}
          onClick={() => onSelect(option.id)}
          disabled={disabled}
          className={`
            group relative p-4 rounded-2xl text-left transition-all duration-300 border
            ${
              selectedVoice === option.id
                ? 'bg-indigo-600/20 border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
            }
            ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              <div className={`
                p-2 rounded-xl transition-colors
                ${selectedVoice === option.id ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-500 group-hover:text-slate-300'}
              `}>
                {option.gender === 'Male' ? <User className="w-4 h-4" /> : <UserCircle className="w-4 h-4" />}
              </div>
              <div>
                <span className={`block font-bold text-sm tracking-tight transition-colors ${selectedVoice === option.id ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                  {option.name}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{option.gender}</span>
              </div>
            </div>
            
            {selectedVoice === option.id && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/40"
              >
                <Check className="w-3 h-3 text-white stroke-[3]" />
              </motion.div>
            )}
          </div>
          <p className="text-xs text-slate-500 group-hover:text-slate-400 transition-colors leading-relaxed pl-11">
            {option.description}
          </p>
        </motion.button>
      ))}
    </div>
  );
};

export default VoiceSelector;