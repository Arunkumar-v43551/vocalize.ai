import React, { useMemo } from 'react';

const BAR_COUNT = 12;

const IdleWaveform: React.FC = () => {
  const barHeights = useMemo(
    () =>
      Array.from({ length: BAR_COUNT }, (_, i) => {
        const wave = Math.sin(i * 0.9) * 0.35 + 0.55;
        return `${Math.round(20 + wave * 60)}%`;
      }),
    []
  );

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600" aria-hidden>
      <div className="flex items-end space-x-1.5 h-16 mb-4 opacity-20">
        {barHeights.map((height, i) => (
          <div
            key={i}
            className="w-2 bg-indigo-500 rounded-full animate-pulse"
            style={{ height, animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40">
        Awaiting Signal
      </span>
    </div>
  );
};

export default IdleWaveform;
