/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'deep-iris': '#16165c',
        'iris-shadow': '#232269',
        'iris-glow': '#403cd5',
        'iris-pulse': '#5350cc',
        'iris-border': '#4846c6',
        'iris-veil': '#524fe1',
        'lilac-mist': '#b1a6f6',
        'clinical-cyan': '#00b1ff',
        'cyan-soft': '#59b4ff',
        'mint-vital': '#00ffaa',
        'teal-signal': '#2ee9ff',
        'cloud-white': '#ffffff',
        'pearl': '#f4f4f6',
        'ash': '#d8d8e3',
        'fog': '#9494a9',
      },
      fontFamily: {
        gilroy: ['Plus Jakarta Sans', 'Manrope', 'sans-serif'],
        sans: ['Plus Jakarta Sans', 'Manrope', 'sans-serif'],
      },
      borderRadius: {
        'pill': '9999px',
        'card': '24px',
        'card-lg': '32px',
        'input': '16px',
        'icon': '7px',
      },
      boxShadow: {
        'card': '0 1px 2px rgba(22, 22, 92, 0.04), 0 8px 24px rgba(22, 22, 92, 0.04)',
        'card-hover': '0 2px 4px rgba(22, 22, 92, 0.06), 0 12px 32px rgba(22, 22, 92, 0.08)',
        'iris-glow': '0 0 20px rgba(83, 80, 204, 0.25)',
      },
      letterSpacing: {
        'display': '-0.075em',
        'heading': '-0.04em',
        'body': '-0.03em',
        'caption': '0.02em',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'wave': 'wave 1.5s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        wave: {
          '0%, 100%': { transform: 'scaleY(0.4)' },
          '50%': { transform: 'scaleY(1)' },
        }
      }
    },
  },
  plugins: [],
}
