/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        dark: {
          bg0:     '#0d1117',
          bg1:     '#161b22',
          bg2:     '#1c2333',
          bg3:     '#21262d',
          border:  '#30363d',
          borderHi:'#484f58',
        },
      },
    },
  },
  plugins: [],
}
