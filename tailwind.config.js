/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        oxford: {
          DEFAULT: '#002147',
          50: '#f0f5fa',
          100: '#dbe7f4',
          200: '#bbd2eb',
          500: '#1d4ed8',
          700: '#002f6c',
          800: '#002654',
          900: '#002147',
          950: '#00142b',
        },
        amber: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          400: '#fbbf24',
          500: '#f4a024',
          600: '#e58e10',
          700: '#b46706',
          800: '#92400e',
          900: '#78350f',
        },
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        }
      }
    },
  },
  plugins: [],
}
