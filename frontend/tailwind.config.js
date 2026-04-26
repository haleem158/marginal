/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#00C2FF',
        'efficiency-high': '#00FF88',
        'efficiency-mid': '#FFB800',
        'efficiency-low': '#FF4455',
        'agent-auctioneer': '#A78BFA',
        'agent-executor': '#00C2FF',
        'agent-auditor': '#F59E0B',
        'agent-treasury': '#10B981',
        'agent-memory': '#EC4899',
        surface: '#0F0F0F',
        'surface-raised': '#141414',
        'surface-overlay': '#1A1A1A',
        background: '#080808',
        foreground: '#F5F5F5',
        border: 'rgba(255,255,255,0.06)',
        muted: {
          DEFAULT: '#1A1A1A',
          foreground: '#888888',
        },
        card: {
          DEFAULT: '#0F0F0F',
          foreground: '#F5F5F5',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
        '6xl': '3rem',
      },
      animation: {
        'ticker': 'ticker 40s linear infinite',
        'pulse-live': 'pulse-live 2s ease-in-out infinite',
        'pulse-ending': 'pulse-live 0.8s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s infinite',
      },
      keyframes: {
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'pulse-live': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(1.5)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
