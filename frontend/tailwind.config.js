/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#003558',
          hover: '#004A77',
          light: '#E8F0F7',
        },
        surface: '#F4F6F8',
        border: '#E5E7EB',
        'text-main': '#111827',
        'text-muted': '#6B7280',
      },
      fontFamily: {
        sans: ['VistraSans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
