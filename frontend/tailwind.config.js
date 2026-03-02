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
          50:  '#fdf5f2',
          100: '#fbe8e0',
          200: '#f5cfc0',
          300: '#edb097',
          400: '#e09070',
          500: '#C9785D',
          600: '#b5684e',
          700: '#9a5641',
          800: '#7d4636',
          900: '#66392d',
          950: '#3a1e17',
        },
        navy: {
          50:  '#f0f4f8',
          100: '#dce5ef',
          200: '#b9cbe0',
          300: '#8aa9ca',
          400: '#5c84af',
          500: '#3d6690',
          600: '#1E3A5F',
          700: '#1a3254',
          800: '#152a46',
          900: '#0f1f34',
          950: '#081120',
        },
        cream: {
          DEFAULT: '#F0E6D8',
          50:  '#FAF7F2',
          100: '#F0E6D8',
          200: '#E8DCCB',
          300: '#DDD0B8',
          400: '#C9B899',
          500: '#B09E7E',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        'pill': '9999px',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'soft':    '0 1px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)',
        'soft-md': '0 4px 16px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)',
        'soft-lg': '0 8px 32px rgba(0,0,0,0.09), 0 2px 8px rgba(0,0,0,0.05)',
        'glow':    '0 4px 14px rgba(201,120,93,0.22)',
      },
    },
  },
  plugins: [],
}
