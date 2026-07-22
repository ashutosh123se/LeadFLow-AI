/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './store/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#FAFBFC',
        foreground: '#0F172A',
        card: '#FFFFFF',
        muted: {
          DEFAULT: '#64748B',
          foreground: '#94A3B8',
          surface: '#F1F5F9',
        },
        border: '#E2E8F0',
        accent: {
          DEFAULT: '#6366F1',
          light: '#EEF2FF',
          dark: '#4F46E5',
        },
        primary: {
          DEFAULT: '#2563EB',
          foreground: '#FFFFFF',
          hover: '#1D4ED8',
          light: '#EFF6FF',
          dark: '#1E40AF',
        },
        success: { DEFAULT: '#047857', light: '#ECFDF5' },
        warning: { DEFAULT: '#B45309', light: '#FFFBEB' },
        danger: { DEFAULT: '#B91C1C', light: '#FEF2F2' },
        // Legacy aliases kept for gradual migration
        ink: '#F4F6F9',
        canvas: '#FFFFFF',
        surface: '#F3F4F6',
        line: '#E5E7EB',
        cream: '#111827',
        stone: { DEFAULT: '#6B7280', 400: '#9CA3AF', 500: '#6B7280', 600: '#4B5563' },
        gold: { DEFAULT: '#1E40AF', light: '#1D4ED8', dark: '#1E3A8A', muted: '#DBEAFE' },
        sage: { DEFAULT: '#047857', light: '#059669', muted: '#ECFDF5' },
        terracotta: { DEFAULT: '#B91C1C', muted: '#FEF2F2' },
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgb(15 23 42 / 0.04)',
        card: '0 1px 3px 0 rgb(15 23 42 / 0.06), 0 1px 2px -1px rgb(15 23 42 / 0.04)',
        panel: '0 8px 30px -6px rgb(15 23 42 / 0.12)',
        hero: '0 25px 50px -12px rgb(15 23 42 / 0.18)',
        glow: '0 0 0 1px rgb(37 99 235 / 0.08), 0 8px 40px -8px rgb(37 99 235 / 0.2)',
      },
      backgroundImage: {
        'hero-gradient': 'radial-gradient(ellipse 80% 60% at 50% -10%, rgb(37 99 235 / 0.12), transparent), radial-gradient(ellipse 50% 40% at 100% 0%, rgb(99 102 241 / 0.08), transparent)',
        'mesh': 'linear-gradient(135deg, #FAFBFC 0%, #F1F5F9 50%, #EFF6FF 100%)',
      },
      maxWidth: {
        content: '1280px',
      },
    },
  },
  plugins: [],
};
