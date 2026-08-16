/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // "Night radar scope" palette — deliberately not the cream/serif or broadsheet
        // defaults; the product's job is reading faint early signals against a dark field.
        scope: {
          bg: '#0A0F1C',       // deep indigo-navy, the radar screen itself
          panel: '#111A2E',    // card/panel surface
          panelAlt: '#16213A', // hover/alt surface
          line: '#22304D',     // hairline borders/grid
        },
        signal: {
          hot: '#F5A623',    // amber — current popularity / "hot now"
          rising: '#2DD9C3', // signal-cyan — future potential / early signal
          risk: '#EF5B4E',   // warning-red — decline/saturation risk
          idle: '#4A5875',   // muted — neutral/no-signal
        },
        ink: {
          DEFAULT: '#EDF0F7',
          muted: '#8D96AC',
          faint: '#5C6680',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 24px -6px rgba(45, 217, 195, 0.35)',
      },
    },
  },
  plugins: [],
};
