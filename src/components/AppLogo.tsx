import React from 'react';

interface AppLogoProps {
  className?: string;
  size?: number;
  showStatusDot?: boolean;
}

/**
 * Official vector emblem logo for "VĂN PHÒNG SỐ" (Hệ thống Quản lý & Phân loại văn bản).
 * 100% self-contained SVG component: zero missing file dependencies, never 404s,
 * renders perfectly in VSCode, local dev, GitHub, and production at any resolution.
 */
export const AppLogo: React.FC<AppLogoProps> = ({
  className = '',
  size = 40,
  showStatusDot = true,
}) => {
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-md select-none transition-transform hover:scale-105"
      >
        <defs>
          {/* Outer Shield Navy Gradient */}
          <linearGradient id="shieldNavyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e1b4b" />
            <stop offset="50%" stopColor="#312e81" />
            <stop offset="100%" stopColor="#4338ca" />
          </linearGradient>

          {/* Royal Gold Metallic Gradient */}
          <linearGradient id="royalGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="35%" stopColor="#facc15" />
            <stop offset="70%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#ca8a04" />
          </linearGradient>

          {/* Inner Document White/Cyan Glow */}
          <linearGradient id="docPaperGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e0e7ff" />
          </linearGradient>

          {/* Tech Circuit Indigo Gradient */}
          <linearGradient id="circuitGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>

          {/* Soft Shadow */}
          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#1e1b4b" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* 1. Outer Hexagonal Shield Base */}
        <path
          d="M50 4 L88 18 C88 56 68 85 50 96 C32 85 12 56 12 18 Z"
          fill="url(#shieldNavyGrad)"
          stroke="url(#royalGoldGrad)"
          strokeWidth="3.5"
          strokeLinejoin="round"
          filter="url(#softGlow)"
        />

        {/* 2. Inner Shield Trim Line */}
        <path
          d="M50 11 L81 22.5 C81 53 64 77 50 87 C36 77 19 53 19 22.5 Z"
          fill="none"
          stroke="url(#royalGoldGrad)"
          strokeWidth="1.2"
          strokeDasharray="4 2"
          opacity="0.85"
        />

        {/* 3. Golden Laurel Wreath Branches (Right & Left) */}
        {/* Left Branch Leaves */}
        <path
          d="M26 34 C23 37 24 43 28 41 C27 45 30 48 33 46 C32 50 35 54 38 52 C37 57 41 61 45 59"
          stroke="url(#royalGoldGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        {/* Right Branch Leaves */}
        <path
          d="M74 34 C77 37 76 43 72 41 C73 45 70 48 67 46 C68 50 65 54 62 52 C63 57 59 61 55 59"
          stroke="url(#royalGoldGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* 4. Digital Document Scroll in Center */}
        <g transform="translate(0, 3)">
          {/* Document Sheet */}
          <rect
            x="34"
            y="35"
            width="32"
            height="38"
            rx="4"
            fill="url(#docPaperGrad)"
            stroke="#c7d2fe"
            strokeWidth="1.5"
          />
          {/* Folded Top-Right Corner */}
          <path d="M58 35 L66 43 L58 43 Z" fill="#a5b4fc" />

          {/* Document Content Lines */}
          <line x1="39" y1="43" x2="54" y2="43" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" />
          <line x1="39" y1="49" x2="61" y2="49" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="39" y1="55" x2="61" y2="55" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="39" y1="61" x2="52" y2="61" stroke="#a5b4fc" strokeWidth="1.8" strokeLinecap="round" />

          {/* Red Verification Stamp Circle on Document */}
          <circle cx="58" cy="63" r="5" fill="#ef4444" opacity="0.9" />
          <circle cx="58" cy="63" r="3.5" fill="none" stroke="#ffffff" strokeWidth="0.8" />
          <path d="M56.5 63 L57.5 64 L59.5 62" stroke="#ffffff" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />
        </g>

        {/* 5. Center Golden Star of State Authority */}
        <polygon
          points="50,17 53.5,25 62,25.5 55,30.5 57.5,38.5 50,33.5 42.5,38.5 45,30.5 38,25.5 46.5,25"
          fill="url(#royalGoldGrad)"
          stroke="#fef08a"
          strokeWidth="0.8"
        />

        {/* 6. High-Tech AI Circuit Elements at the Bottom */}
        <circle cx="50" cy="80" r="2.5" fill="#38bdf8" />
        <path d="M42 84 L47.5 81" stroke="url(#circuitGrad)" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M58 84 L52.5 81" stroke="url(#circuitGrad)" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="41" cy="85" r="1.8" fill="#818cf8" />
        <circle cx="59" cy="85" r="1.8" fill="#818cf8" />
      </svg>

      {/* Online Realtime Status Dot */}
      {showStatusDot && (
        <span
          className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 border-2 border-white rounded-full shadow-xs"
          style={{ width: Math.max(8, size * 0.22), height: Math.max(8, size * 0.22) }}
          title="Hệ thống trực tuyến thời gian thực"
        />
      )}
    </div>
  );
};
