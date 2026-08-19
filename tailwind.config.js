/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        space: {
          900: '#050816',
          800: '#0b0f26',
          700: '#12183d',
          600: '#1b2354',
        },
        neon: {
          purple: '#7c3aed',
          cyan: '#06b6d4',
          pink: '#ec4899',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'neon-purple': '0 0 15px rgba(124, 58, 237, 0.45)',
        'neon-cyan': '0 0 15px rgba(6, 182, 212, 0.5)',
        'neon-pink': '0 0 15px rgba(236, 72, 153, 0.45)',
        'neon-glow': '0 0 25px rgba(124, 58, 237, 0.7)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-vignette': 'linear-gradient(to top, #050816 0%, rgba(5, 8, 22, 0.85) 50%, rgba(5, 8, 22, 0.2) 100%)',
        'card-gradient': 'linear-gradient(to top, rgba(5, 8, 22, 0.95) 0%, rgba(5, 8, 22, 0.4) 50%, rgba(5, 8, 22, 0) 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 2s linear infinite',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        }
      }
    },
  },
  plugins: [],
}
