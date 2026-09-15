/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // FlowSched app tokens (ui-ux.md §1: green + white, drafting-board feel).
        // Chosen greens: accessible on white (primary-dark passes AA for large text/UI).
        primary: {
          DEFAULT: '#15803d', // green-700 — primary actions, active states, success
          dark: '#14532d', // green-900 — hover/active, header accents
          light: '#dcfce7', // green-100 — tinted backgrounds, highlights
        },
        surface: {
          DEFAULT: '#ffffff', // main workspace background
          muted: '#f8fafc', // slate-50 — page backdrop / skeleton base
        },
        // Landing-page theme tokens — exact reference scale (verbatim).
        // `leaf` is the marketing-green ramp used for CTAs, the stat strip,
        // and the schedule-mockup glow; `ink` is the near-black green used
        // for landing headlines / body copy. Kept project-wide so any page
        // can reuse `bg-leaf-*` / `text-ink`.
        ink: '#10241A',
        leaf: {
          50: '#EEFBF2',
          100: '#D7F5E2',
          200: '#B3ECC9',
          300: '#8FE3B4',
          400: '#5CD08D',
          500: '#2FBF71',
          600: '#1F8F52',
          700: '#166B3E',
          800: '#114F2E',
          900: '#0B3821',
          950: '#082A18',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Display face for landing headlines (loaded via Google Fonts in
        // index.html; falls back to Inter/system sans if offline).
        display: ['"Space Grotesk"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      // Landing motion keyframes (used sparingly alongside framer-motion;
      // entrance/float utilities available via `animate-fade-up` etc.).
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'float-soft': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
        'float-soft': 'float-soft 7s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

