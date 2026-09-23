import React, { useState } from 'react';
import dokyaLogoImg from '../assets/images/dokya_ai_logo_1788695212236.jpg';

export interface DokyaLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'icon' | 'full' | 'compact';
  subtitle?: string;
  showBadge?: boolean;
  className?: string;
  onClick?: () => void;
}

export const DokyaLogo: React.FC<DokyaLogoProps> = ({
  size = 'md',
  variant = 'full',
  subtitle,
  showBadge = true,
  className = '',
  onClick
}) => {
  const [imgError, setImgError] = useState(false);

  // Dimension mapping
  const sizeConfig = {
    xs: { icon: 'w-7 h-7', iconPx: 28, text: 'text-sm', badge: 'text-[8px] px-1 py-0.2', sub: 'text-[8px]' },
    sm: { icon: 'w-8 h-8', iconPx: 32, text: 'text-sm sm:text-base', badge: 'text-[9px] px-1.5 py-0.5', sub: 'text-[9px]' },
    md: { icon: 'w-10 h-10', iconPx: 40, text: 'text-base sm:text-lg', badge: 'text-[9px] px-1.5 py-0.5', sub: 'text-[10px]' },
    lg: { icon: 'w-12 h-12', iconPx: 48, text: 'text-xl sm:text-2xl', badge: 'text-[10px] px-2 py-0.5', sub: 'text-xs' },
    xl: { icon: 'w-16 h-16', iconPx: 64, text: 'text-2xl sm:text-3xl', badge: 'text-xs px-2.5 py-1', sub: 'text-xs sm:text-sm' }
  }[size];

  return (
    <div 
      className={`inline-flex items-center gap-3 select-none ${onClick ? 'cursor-pointer group' : ''} ${className}`}
      onClick={onClick}
    >
      {/* Icon Frame */}
      <div 
        className={`relative ${sizeConfig.icon} rounded-2xl overflow-hidden shadow-lg shadow-violet-950/40 border border-violet-500/30 bg-slate-950 flex items-center justify-center shrink-0 ring-1 ring-violet-400/20 ${
          onClick ? 'group-hover:scale-105 group-hover:border-violet-400/60 transition-all duration-300' : ''
        }`}
      >
        {!imgError ? (
          <img
            src={typeof dokyaLogoImg === 'string' ? dokyaLogoImg : (dokyaLogoImg as any)?.src || ''}
            alt="Dokya AI"
            className="w-full h-full object-cover rounded-2xl"
            onError={() => setImgError(true)}
            referrerPolicy="no-referrer"
          />
        ) : (
          /* High-precision Vector Fallback: Geometric Monogram "D" + AI Spark Star */
          <svg 
            viewBox="0 0 100 100" 
            className="w-full h-full p-1"
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="dokyaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="50%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
              <linearGradient id="goldSpark" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fde047" />
                <stop offset="100%" stopColor="#eab308" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Dark Navy Background */}
            <rect width="100" height="100" rx="20" fill="#030712" />

            {/* Subtle glow circle */}
            <circle cx="50" cy="50" r="35" fill="#8b5cf6" opacity="0.15" filter="url(#glow)" />

            {/* Geometric "D" Monogram */}
            <path
              d="M32 24 H52 C68 24 78 35 78 50 C78 65 68 76 52 76 H32 Z"
              fill="none"
              stroke="url(#dokyaGrad)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Inner cutout line */}
            <path
              d="M44 38 H50 C58 38 64 43 64 50 C64 57 58 62 50 62 H44 Z"
              fill="url(#dokyaGrad)"
              opacity="0.35"
            />

            {/* Futuristic 4-Point AI Spark Star */}
            <path
              d="M72 26 Q72 35 81 35 Q72 35 72 44 Q72 35 63 35 Q72 35 72 26 Z"
              fill="url(#goldSpark)"
              filter="url(#glow)"
            />
            <circle cx="72" cy="35" r="1.5" fill="#ffffff" />
          </svg>
        )}

        {/* Ambient Neon Edge Glow */}
        <div className="absolute inset-0 rounded-2xl pointer-events-none ring-1 ring-inset ring-white/10" />
      </div>

      {/* Typography / Wordmark */}
      {variant !== 'icon' && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className={`font-black tracking-tight text-white font-sans ${sizeConfig.text}`}>
              Dokya<span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">AI</span>
            </span>
            {showBadge && (
              <span className={`font-extrabold uppercase rounded-md bg-gradient-to-r from-violet-500/20 to-cyan-500/20 text-cyan-300 border border-violet-500/30 shadow-xs shadow-violet-900/40 tracking-wider ${sizeConfig.badge}`}>
                Pro
              </span>
            )}
          </div>
          {subtitle && (
            <p className={`text-slate-400 font-medium tracking-tight ${sizeConfig.sub}`}>
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
