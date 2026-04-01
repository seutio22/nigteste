import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geometria', 'sans-serif'],
        geometria: ['Geometria', 'sans-serif'],
      },
      fontSize: {
        /* Design System: 32px com line-height 40px (125%) */
        'ds-display': ['32px', { lineHeight: '40px' }],
      },
      width: {
        '70': '17.5rem', // 280px para a sidebar
      },
      colors: {
        // Paleta NIG: Azul #002561, Azul ciano #009FDF, Roxo #050032, Apoio 3 #A3B5BC, Cinza #DCDFE3
        primary: {
          50: '#e6f4fc',
          100: '#b3dff7',
          200: '#80caf2',
          300: '#4db5ed',
          400: '#26a5e9',
          500: '#009FDF',
          600: '#008fc7',
          700: '#007aab',
          800: '#00668f',
          900: '#002561',
          950: '#001a42',
        },
        secondary: {
          50: '#e6e5f2',
          100: '#b3b0d9',
          200: '#807ac0',
          300: '#4d45a7',
          400: '#261f8f',
          500: '#050032',
          600: '#040028',
          700: '#03001f',
          800: '#020016',
          900: '#01000d',
          950: '#000005',
        },
        apoio: {
          50: '#f0f3f4',
          100: '#DCDFE3',
          200: '#A3B5BC',
          300: '#8a9ba2',
          400: '#6b7a80',
          500: '#556268',
        },
        // Cores semânticas: info #004F75, success #00A649, warning #E5B800 (amarelo forte), error #DA3832
        success: {
          DEFAULT: '#00A649',
          light: '#e6f7ed',
          dark: '#008c3a',
        },
        warning: {
          DEFAULT: '#E5B800',
          light: '#FBF4D4',
          dark: '#C9A227',
        },
        error: {
          DEFAULT: '#DA3832',
          light: '#fdeaea',
          dark: '#b82e29',
        },
        info: {
          DEFAULT: '#004F75',
          light: '#e6f2f8',
          dark: '#003d5c',
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
        // Gradientes NIG
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-primary': 'linear-gradient(135deg, #002561 0%, #009FDF 100%)',
        'gradient-secondary': 'linear-gradient(135deg, #050032 0%, #009FDF 100%)',
        'gradient-accent': 'linear-gradient(135deg, #00A649 0%, #008c3a 100%)',
        'gradient-dark': 'linear-gradient(135deg, #050032 0%, #002561 100%)',
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
        'glass': '0 8px 32px 0 rgba(5, 0, 50, 0.25)',
        'glow': '0 0 20px rgba(0, 159, 223, 0.4)',
        'glow-primary': '0 0 20px rgba(0, 37, 97, 0.3)',
        'glow-secondary': '0 0 20px rgba(5, 0, 50, 0.3)',
        'glow-accent': '0 0 20px rgba(34, 197, 94, 0.3)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
} satisfies Config
