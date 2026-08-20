/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
          950: '#2E1065',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F8F7FF',
          card: '#FFFFFF',
          border: '#E9E5F5',
        },
        content: {
          primary: '#1E1B4B',
          secondary: '#474569',
          muted: '#716E94',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'brand-sm': '0 2px 8px 0 rgba(109, 40, 217, 0.06)',
        'brand-md': '0 4px 20px -2px rgba(109, 40, 217, 0.08)',
        'brand-lg': '0 10px 30px -4px rgba(109, 40, 217, 0.12)',
      }
    },
  },
  plugins: [],
}
