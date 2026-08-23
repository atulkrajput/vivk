/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        vivk: {
          navy: '#0F172A',
          blue: '#2563EB',
          cyan: '#22D3EE',
          violet: '#8B5CF6',
          bg: '#F8FAFC',
          white: '#FFFFFF',
          dark: '#070B16',
          'dark-surface': '#0F172A',
        },
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#2563EB',
          600: '#2563EB',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'sm': '8px',
        'md': '12px',
        'lg': '18px',
        'xl': '24px',
        '2xl': '32px',
      },
      boxShadow: {
        'vivk-sm': '0 2px 8px rgba(15, 23, 42, 0.04)',
        'vivk': '0 4px 16px rgba(15, 23, 42, 0.06)',
        'vivk-md': '0 8px 30px rgba(15, 23, 42, 0.06)',
        'vivk-lg': '0 16px 48px rgba(15, 23, 42, 0.08)',
        'vivk-glow': '0 0 20px rgba(37, 99, 235, 0.15)',
        'vivk-cyan-glow': '0 0 20px rgba(34, 211, 238, 0.15)',
      },
      backgroundImage: {
        'vivk-gradient': 'linear-gradient(135deg, #22D3EE 0%, #2563EB 50%, #8B5CF6 100%)',
        'vivk-gradient-subtle': 'linear-gradient(135deg, rgba(34, 211, 238, 0.1) 0%, rgba(37, 99, 235, 0.1) 50%, rgba(139, 92, 246, 0.1) 100%)',
        'vivk-gradient-dark': 'linear-gradient(135deg, #070B16 0%, #0F172A 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
