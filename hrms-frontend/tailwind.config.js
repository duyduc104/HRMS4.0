/** @type {import('tailwindcss').Config} */
const brandTokens = {
  50:  '#eef2ff',
  100: '#e0e7ff',
  200: '#c7d2fe',
  300: '#a5b4fc',
  400: '#818cf8',
  500: '#6366f1', // PRIMARY
  600: '#4f46e5',
  700: '#4338ca',
  800: '#3730a3',
  900: '#312e81',
};

export default {
  darkMode: 'class', // toggle via <html class="dark">
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand:   { ...brandTokens },
        surface: { DEFAULT: 'var(--surface)', alt: 'var(--surface-alt)' },
        bg:      'var(--bg)',
        border:  'var(--border)',
        text:    { primary: 'var(--text-primary)', sec: 'var(--text-sec)', muted: 'var(--text-muted)' },
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', '"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        'display': ['2.25rem', { lineHeight: '2.75rem', fontWeight: '700' }],
        'h1': ['1.875rem', { lineHeight: '2.25rem', fontWeight: '700' }],
        'h2': ['1.5rem', { lineHeight: '2rem', fontWeight: '600' }],
        'h3': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }],
        'h4': ['1.125rem', { lineHeight: '1.5rem', fontWeight: '600' }],
        'body': ['0.9375rem', { lineHeight: '1.5rem', fontWeight: '400' }],
        'bodyLg': ['1rem', { lineHeight: '1.625rem', fontWeight: '400' }],
        'bodySm': ['0.875rem', { lineHeight: '1.375rem', fontWeight: '400' }],
        'caption': ['0.75rem', { lineHeight: '1.125rem', fontWeight: '400' }],
        'label': ['0.6875rem', { lineHeight: '1rem', fontWeight: '600' }],
      },
      borderRadius: {
        sm: '6px', md: '10px', lg: '14px', xl: '20px',
      },
      boxShadow: {
        card:  '0 4px 12px rgba(0,0,0,.08)',
        modal: '0 12px 40px rgba(0,0,0,.18)',
        glow:  '0 0 0 3px rgba(99,102,241,.25)',
      },
      animation: {
        'fade-in':    'fadeIn .2s ease',
        'slide-up':   'slideUp .25s ease',
        'pulse-slow': 'pulse 3s cubic-bezier(.4,0,.6,1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        slideUp: {
          '0%': { opacity: 0, transform: 'translateY(10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [require('@tailwindcss/forms'), require('tailwindcss-animate')],
}
