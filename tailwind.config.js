/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fbf6',
          100: '#dcf6e9',
          200: '#bcecd4',
          300: '#8cddb5',
          400: '#55c791',
          500: '#31ab73',
          600: '#218a59',
          700: '#1c6d48',
          800: '#1a573b',
          900: '#164832',
          950: '#0b281c',
        },
        dark: {
          50: '#f6f6f7',
          100: '#e1e1e3',
          200: '#c2c3c7',
          300: '#9b9ca3',
          400: '#72747d',
          500: '#575961',
          600: '#45464d',
          700: '#393a40',
          800: '#2f3036',
          900: '#1d1e22',
          950: '#121316',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'premium': '0 8px 30px rgb(0 0 0 / 0.12)',
        'premium-glow': '0 0 20px rgba(49, 171, 115, 0.15)',
      }
    },
  },
  plugins: [],
}
