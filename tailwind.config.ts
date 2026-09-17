import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        'surface-raised': 'rgb(var(--color-surface-raised) / <alpha-value>)',
        graphite: 'rgb(var(--color-graphite) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        'accent-soft': 'rgb(var(--color-accent-soft) / <alpha-value>)',
        glow: 'rgb(var(--color-glow) / <alpha-value>)',
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        silver: 'rgb(var(--color-silver) / <alpha-value>)',
        gold: 'rgb(var(--color-gold) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        premium: '0 20px 60px -20px rgb(0 0 0 / 0.5)',
        'glow-sm': '0 0 16px -2px rgb(var(--color-glow) / 0.45)',
        'glow-md': '0 0 32px -4px rgb(var(--color-glow) / 0.5)',
        'glow-lg': '0 0 64px -8px rgb(var(--color-glow) / 0.55)',
      },
      keyframes: {
        'core-rotate-slow': { to: { transform: 'rotate(360deg)' } },
        'core-rotate-reverse': { to: { transform: 'rotate(-360deg)' } },
        'core-pulse': {
          '0%, 100%': { opacity: '0.55', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.04)' },
        },
        'core-ping-slow': {
          '0%': { transform: 'scale(0.9)', opacity: '0.6' },
          '80%, 100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        'hud-scan': {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '0 40px' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'core-rotate-slow': 'core-rotate-slow 18s linear infinite',
        'core-rotate-reverse': 'core-rotate-reverse 24s linear infinite',
        'core-pulse': 'core-pulse 2.4s ease-in-out infinite',
        'core-ping-slow': 'core-ping-slow 2.8s cubic-bezier(0,0,0.2,1) infinite',
        'hud-scan': 'hud-scan 3s linear infinite',
        'fade-in-up': 'fade-in-up 0.4s ease-out both',
      },
    },
  },
  plugins: [],
};

export default config;
