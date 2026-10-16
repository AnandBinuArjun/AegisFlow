import React from 'react'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true, className = '' }) => {
  const pixelSizes = {
    sm: 26,
    md: 32,
    lg: 42,
  }

  const px = pixelSizes[size]

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Precision Vector Emblem */}
      <svg
        width={px}
        height={px}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0 transition-transform duration-200 hover:scale-105"
        aria-label="AegisFlow Emblem"
      >
        <defs>
          <linearGradient id="af-shield-linear" x1="10%" y1="5%" x2="90%" y2="95%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="50%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1E40AF" />
          </linearGradient>
          <linearGradient id="af-flow-linear" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="50%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
          <filter id="af-mark-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#2563EB" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Outer Faceted Shield Boundary */}
        <path
          d="M50 8 L84 22 V48 C84 68 69 84 50 92 C31 84 16 68 16 48 V22 L50 8Z"
          stroke="url(#af-shield-linear)"
          strokeWidth="3.2"
          strokeLinejoin="round"
          fill="#0B132B"
          fillOpacity="0.85"
          filter="url(#af-mark-shadow)"
        />

        {/* Inner Armor Geometry */}
        <path
          d="M50 20 L72 32 V47 C72 61 61 73 50 79 C39 73 28 61 28 47 V32 L50 20Z"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1.5"
          fill="#0F172A"
          fillOpacity="0.9"
        />

        {/* Directional Continuous Security Flow Chevrons */}
        <path
          d="M50 26 L66 54 H55 L58 71 L34 44 H45 L50 26Z"
          fill="url(#af-flow-linear)"
        />

        {/* Central Cryptographic Verification Core */}
        <circle cx="50" cy="52" r="3.2" fill="#FFFFFF" />
        <circle cx="50" cy="52" r="6" stroke="#38BDF8" strokeWidth="1.2" strokeDasharray="2 2" fill="none" />
      </svg>

      {/* Brand Typography */}
      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-100 tracking-tight text-[15px] font-sans">
              Aegis<span className="text-sky-400 font-medium">Flow</span>
            </span>
            <span className="px-1.5 py-0.5 text-[9px] font-mono font-medium rounded tracking-wide bg-slate-800 text-slate-400 border border-slate-700/60 uppercase">
              AppSec
            </span>
          </div>
          <span className="text-[10px] text-slate-400 tracking-wider font-mono mt-0.5 uppercase">
            Zero-Trust Triage
          </span>
        </div>
      )}
    </div>
  )
}
export default Logo
