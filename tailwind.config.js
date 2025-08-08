/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bgPrimary: '#1a1b23',
        bgSecondary: '#21222d',
        bgTertiary: '#2a2d3a',
        bgHover: '#2f323f',
        purplePrimary: '#8b5cf6',
        purpleGlow: '#9d4edd',
        purpleLight: 'rgba(139, 92, 246, 0.15)',
        purpleBorder: 'rgba(139, 92, 246, 0.3)',
        accentHot: '#ff007f',
        accentCyan: '#00d9ff',
        accentSuccess: '#00ff88',
        accentWarning: '#ffaa00',
        textPrimary: '#f8f8f2',
        textSecondary: '#a3a3a3',
        textMuted: '#6b7280',
        borderPrimary: '#3a3d4a',
        borderSecondary: '#4a4d5a',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glowHot: '0 0 20px rgba(255, 0, 127, 0.4)',
        glowCyan: '0 0 16px rgba(0, 217, 255, 0.3)',
        glowSuccess: '0 0 14px rgba(0, 255, 136, 0.3)',
        glowPurple: '0 0 12px rgba(139, 92, 246, 0.3)',
        glowSubtle: '0 4px 20px rgba(0, 0, 0, 0.15)',
      },
      animation: {
        shimmer: 'shimmer 3s infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { left: '-100%' },
          '100%': { left: '100%' },
        },
      },
    },
  },
  plugins: [],
}
