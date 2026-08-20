import React from 'react';

/**
 * AIAvatar — A friendly, animated EduSaathi Robot Assistant.
 * Supports states: 'idle' | 'listening' | 'thinking' | 'speaking' | 'error'
 * Size: 'sm' | 'md' | 'lg' | 'xl'
 */
export default function AIAvatar({ 
  state = 'idle', 
  size = 'md', 
  personaRole = 'student',
  className = '' 
}) {
  const sizeMap = {
    sm: 'w-12 h-12',
    md: 'w-24 h-24',
    lg: 'w-36 h-36',
    xl: 'w-48 h-48',
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  // Persona tint adjustments
  const personaColors = {
    student: 'from-emerald-500 to-brand-600',
    parent: 'from-blue-500 to-brand-700',
    teacher: 'from-purple-500 to-brand-800',
    principal: 'from-amber-500 to-brand-900',
  };
  const gradientTint = personaColors[personaRole] || 'from-brand-600 to-brand-800';

  return (
    <div className={`relative flex items-center justify-center select-none ${currentSize} ${className}`}>
      
      {/* Outer Glow Halo based on state */}
      <div
        className={`absolute inset-0 rounded-full blur-xl transition-all duration-500 ${
          state === 'listening'
            ? 'bg-cyan-400/40 animate-ping'
            : state === 'thinking'
            ? 'bg-violet-500/50 animate-pulse'
            : state === 'speaking'
            ? 'bg-brand-500/40 animate-pulse'
            : state === 'error'
            ? 'bg-rose-500/40 animate-bounce'
            : 'bg-brand-400/20'
        }`}
      />

      {/* Outer Floating Robot Head Container */}
      <div className={`relative z-10 w-full h-full rounded-3xl bg-gradient-to-b ${gradientTint} p-1 shadow-brand-lg transition-transform duration-300 ${
        state === 'listening' ? 'scale-105' : state === 'speaking' ? 'animate-bounce' : 'hover:scale-105'
      }`}>
        {/* Antenna */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex flex-col items-center">
          <span className={`w-2.5 h-2.5 rounded-full shadow-sm transition-colors ${
            state === 'listening' ? 'bg-cyan-300 animate-ping' : state === 'thinking' ? 'bg-amber-300 animate-spin' : 'bg-brand-200'
          }`} />
          <span className="w-0.5 h-2 bg-brand-200" />
        </div>

        {/* Robot Face Screen */}
        <div className="w-full h-full rounded-[22px] bg-slate-950 flex flex-col items-center justify-center p-2 relative overflow-hidden border border-brand-300/30">
          
          {/* Subtle Screen Scanline Effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.03] to-transparent pointer-events-none" />

          {/* Eyes Container */}
          <div className="flex items-center justify-center gap-2.5 mb-1">
            {/* Left Eye */}
            <div className={`rounded-full transition-all duration-300 ${
              size === 'sm' ? 'w-2 h-2' : size === 'lg' || size === 'xl' ? 'w-4 h-4' : 'w-3 h-3'
            } ${
              state === 'listening'
                ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee] scale-125'
                : state === 'thinking'
                ? 'bg-amber-300 shadow-[0_0_8px_#fde047]'
                : state === 'speaking'
                ? 'bg-brand-300 shadow-[0_0_8px_#c4b5fd]'
                : state === 'error'
                ? 'bg-rose-400 shadow-[0_0_8px_#f43f5e]'
                : 'bg-cyan-300 shadow-[0_0_6px_#67e8f9]'
            }`} />

            {/* Right Eye */}
            <div className={`rounded-full transition-all duration-300 ${
              size === 'sm' ? 'w-2 h-2' : size === 'lg' || size === 'xl' ? 'w-4 h-4' : 'w-3 h-3'
            } ${
              state === 'listening'
                ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee] scale-125'
                : state === 'thinking'
                ? 'bg-amber-300 shadow-[0_0_8px_#fde047]'
                : state === 'speaking'
                ? 'bg-brand-300 shadow-[0_0_8px_#c4b5fd]'
                : state === 'error'
                ? 'bg-rose-400 shadow-[0_0_8px_#f43f5e]'
                : 'bg-cyan-300 shadow-[0_0_6px_#67e8f9]'
            }`} />
          </div>

          {/* Mouth / Audio Equalizer Bars */}
          {state === 'speaking' ? (
            <div className="flex items-center gap-0.5 mt-0.5">
              <span className="w-1 h-2 bg-brand-300 rounded-full animate-pulse" />
              <span className="w-1 h-3.5 bg-brand-200 rounded-full animate-ping" />
              <span className="w-1 h-2 bg-brand-300 rounded-full animate-pulse" />
            </div>
          ) : state === 'listening' ? (
            <div className="w-5 h-1 bg-cyan-400/80 rounded-full shadow-[0_0_6px_#22d3ee] animate-pulse" />
          ) : state === 'thinking' ? (
            <div className="w-3 h-1 bg-amber-400 rounded-full animate-spin" />
          ) : state === 'error' ? (
            <div className="w-4 h-0.5 bg-rose-400 rounded-full" />
          ) : (
            /* Friendly Smile */
            <div className="w-4 h-1.5 border-b-2 border-cyan-400 rounded-b-full shadow-sm" />
          )}

          {/* State Tag (for large avatar) */}
          {(size === 'lg' || size === 'xl') && (
            <div className="absolute bottom-1.5 text-[9px] uppercase tracking-widest font-mono text-brand-200/60 font-bold">
              {state}
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
