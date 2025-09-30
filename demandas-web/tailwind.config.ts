import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Plus Jakarta Sans', 'sans-serif'],
      },
      width: {
        '70': '17.5rem', // 280px para a sidebar
      },
      colors: {
        // Tokens HSL personalizados
        primary: {
          50: 'hsl(210, 100%, 98%)',
          100: 'hsl(210, 100%, 96%)',
          200: 'hsl(214, 95%, 93%)',
          300: 'hsl(213, 97%, 87%)',
          400: 'hsl(215, 100%, 80%)',
          500: 'hsl(215, 100%, 65%)',
          600: 'hsl(215, 100%, 50%)',
          700: 'hsl(215, 100%, 40%)',
          800: 'hsl(215, 100%, 30%)',
          900: 'hsl(215, 100%, 20%)',
          950: 'hsl(215, 100%, 10%)',
        },
        secondary: {
          50: 'hsl(262, 83%, 98%)',
          100: 'hsl(263, 70%, 96%)',
          200: 'hsl(263, 69%, 92%)',
          300: 'hsl(263, 69%, 85%)',
          400: 'hsl(263, 70%, 76%)',
          500: 'hsl(263, 70%, 65%)',
          600: 'hsl(263, 70%, 55%)',
          700: 'hsl(263, 70%, 45%)',
          800: 'hsl(263, 70%, 35%)',
          900: 'hsl(263, 70%, 25%)',
          950: 'hsl(263, 70%, 15%)',
        },
        accent: {
          50: 'hsl(142, 76%, 98%)',
          100: 'hsl(141, 84%, 93%)',
          200: 'hsl(141, 79%, 85%)',
          300: 'hsl(142, 77%, 73%)',
          400: 'hsl(142, 69%, 58%)',
          500: 'hsl(142, 71%, 45%)',
          600: 'hsl(142, 76%, 36%)',
          700: 'hsl(142, 72%, 29%)',
          800: 'hsl(144, 70%, 24%)',
          900: 'hsl(145, 80%, 20%)',
          950: 'hsl(143, 89%, 15%)',
        },
        neutral: {
          50: 'hsl(0, 0%, 98%)',
          100: 'hsl(0, 0%, 96%)',
          200: 'hsl(0, 0%, 90%)',
          300: 'hsl(0, 0%, 83%)',
          400: 'hsl(0, 0%, 64%)',
          500: 'hsl(0, 0%, 45%)',
          600: 'hsl(0, 0%, 32%)',
          700: 'hsl(0, 0%, 25%)',
          800: 'hsl(0, 0%, 15%)',
          900: 'hsl(0, 0%, 9%)',
          950: 'hsl(0, 0%, 4%)',
        },
      },
      backgroundImage: {
        // Gradientes personalizados
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-primary': 'linear-gradient(135deg, hsl(215, 100%, 65%) 0%, hsl(215, 100%, 50%) 100%)',
        'gradient-secondary': 'linear-gradient(135deg, hsl(263, 70%, 65%) 0%, hsl(263, 70%, 55%) 100%)',
        'gradient-accent': 'linear-gradient(135deg, hsl(142, 71%, 45%) 0%, hsl(142, 76%, 36%) 100%)',
        'gradient-dark': 'linear-gradient(135deg, hsl(215, 100%, 20%) 0%, hsl(215, 100%, 10%) 100%)',
        'gradient-glass': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'float-fast': 'float 4s ease-in-out infinite',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-out': 'slideOut 0.3s ease-in',
        'fade-in': 'fadeIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideOut: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(-100%)', opacity: '0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'glow': '0 0 20px rgba(59, 130, 246, 0.5)',
        'glow-primary': '0 0 20px rgba(59, 130, 246, 0.3)',
        'glow-secondary': '0 0 20px rgba(147, 51, 234, 0.3)',
        'glow-accent': '0 0 20px rgba(34, 197, 94, 0.3)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
} satisfies Config
