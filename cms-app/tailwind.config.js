/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#c9917a', dark: '#b07a63' },
        dark: {
          bg: '#0a0a0a',
          card: '#141414',
          border: '#2a2a2a',
          muted: '#888888',
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
