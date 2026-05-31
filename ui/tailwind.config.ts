import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50:  '#fdf9ec',
          100: '#faf0cc',
          200: '#f4de90',
          300: '#ecc94b',
          400: '#e8c55a',
          500: '#C9A84C',
          600: '#b8941f',
          700: '#9a7a1a',
          800: '#7d6218',
          900: '#675117',
        },
        midnight: {
          50:  '#eef2ff',
          100: '#d0d9f0',
          200: '#a3b4e0',
          300: '#7b8fad',
          400: '#4a5e7a',
          500: '#1e3050',
          600: '#0f2040',
          700: '#0b1628',
          800: '#07101e',
          900: '#050d1a',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        gold: '0 0 0 1px rgba(201,168,76,0.3), 0 4px 24px rgba(201,168,76,0.1)',
        'gold-lg': '0 0 0 1px rgba(201,168,76,0.4), 0 8px 40px rgba(201,168,76,0.2)',
        card: '0 1px 0 rgba(201,168,76,0.12), 0 4px 16px rgba(0,0,0,0.3)',
        'card-hover': '0 1px 0 rgba(201,168,76,0.3), 0 8px 32px rgba(0,0,0,0.5)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out',
        shimmer: 'shimmer 2.5s linear infinite',
      },
    },
  },
  plugins: [],
}

export default config
