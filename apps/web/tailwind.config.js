/** @type {import('tailwindcss').Config} */
export default {
  // Light-only app: the dark/light toggle was removed AND every `dark:`
  // variant class has been stripped from source, so nothing can flip the
  // theme. Kept as 'class' (not 'media') as a belt-and-braces guard — a
  // stray `dark:` class would require an explicit `.dark` ancestor to apply,
  // which OS dark-mode preference alone can never provide.
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // FlowSched app tokens — glassmorphic blue system-wide.
        // Primary/blue actions; success/error/warning keep semantic hues.
        primary: {
          DEFAULT: '#4f8cff', // brand-500 — primary actions, active states
          dark: '#2f5fd6', // deeper blue — hover/active, header accents
          light: '#dbe7ff', // blue-100 tint — tinted backgrounds, highlights
        },
        surface: {
          DEFAULT: '#ffffff', // main workspace background (light)
          muted: '#eaf1fb', // soft-blue page backdrop / skeleton base (light)
        },
        // Landing-page theme tokens — exact reference scale (verbatim).
        // `leaf` is the marketing-green ramp used for CTAs, the stat strip,
        // and the schedule-mockup glow; `ink` is the near-black green used
        // for landing headlines / body copy. Kept project-wide so any page
        // can reuse `bg-leaf-*` / `text-ink`.
        // `ink.DEFAULT` is the legacy app-wide text token (used outside the
        // landing page); `ink.100/300/500` are the landing navy-scale tints.
        ink: {
          DEFAULT: '#223566', // deep blue — legacy app-wide text token (was near-black green)
          100: '#eef3ff',
          300: '#b7c3e0',
          500: '#7c88ab',
        },
        navy: {
          950: '#060b1a',
          900: '#0a1330',
          800: '#101d42',
        },
        brand: {
          500: '#4f8cff',
          400: '#7ab0ff',
        },
        signal: {
          300: '#7fe3ff',
        },
        // Blue-tinted slate — the app font renders blue in light mode.
        // Full 50–950 scale so the extend merge fully replaces the default gray.
        slate: {
          50: '#f3f7ff',
          100: '#e7eeff',
          200: '#d4e0ff',
          300: '#b6c9f9',
          400: '#8fa6ef',
          500: '#5069cd',
          600: '#4560c4',
          700: '#37509f',
          800: '#2c407f',
          900: '#223566',
          950: '#131f47',
        },
        glass: {
          fill: 'rgba(255,255,255,0.055)',
          'fill-strong': 'rgba(255,255,255,0.09)',
          border: 'rgba(160,190,255,0.18)',
          'border-strong': 'rgba(160,190,255,0.32)',
        },
        // `leaf` is kept as an alias of the blue ramp so legacy `bg-leaf-*` /
        // `text-leaf-*` classes across pages render glassmorphic blue without
        // per-file rewrites (leaf-* now === blue scale, not green).
        leaf: {
          50: '#eef4ff',
          100: '#dbe7ff',
          200: '#bfd4ff',
          300: '#9dbdff',
          400: '#7ab0ff',
          500: '#4f8cff',
          600: '#3b6fe0',
          700: '#2f5fd6',
          800: '#284ea8',
          900: '#1d3a7a',
          950: '#101d42',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Display face for landing headlines (loaded via Google Fonts in
        // index.html; falls back to Inter/system sans if offline).
        display: ['"Space Grotesk"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
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
        drift: {
          '0%,100%': { transform: 'translate(0,0) scale(1)' },
          '50%': { transform: 'translate(30px,-24px) scale(1.08)' },
        },
        'pulse-dot': {
          '0%': { boxShadow: '0 0 0 0 rgba(127,227,255,0.55)' },
          '70%': { boxShadow: '0 0 0 9px rgba(127,227,255,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(127,227,255,0)' },
        },
        'sweep-rotate': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'ping-ring': {
          '0%': { transform: 'scale(1)', opacity: '0.8' },
          '100%': { transform: 'scale(3.2)', opacity: '0' },
        },
        'block-in': {
          from: { opacity: '0', transform: 'translateY(4px) scale(.94)' },
          to: { opacity: '1', transform: 'none' },
        },
        rise: {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
        'float-soft': 'float-soft 7s ease-in-out infinite',
        drift: 'drift 24s ease-in-out infinite',
        'pulse-dot': 'pulse-dot 2.6s ease-out infinite',
        'sweep-rotate': 'sweep-rotate 6s linear infinite',
        'ping-ring': 'ping-ring 2.4s cubic-bezier(0,0,0.2,1) infinite',
        'block-in': 'block-in 0.5s cubic-bezier(.2,.8,.2,1) forwards',
        rise: 'rise 0.8s cubic-bezier(.2,.8,.2,1) forwards',
      },
    },
  },
  plugins: [],
};

