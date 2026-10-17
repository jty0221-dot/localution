/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: { sans: ['var(--lu-font)'], mono: ['var(--lu-font)'] },
      colors: { workspace: 'var(--lu-canvas)', accent: 'var(--lu-accent)', ink: 'var(--lu-ink)' },
    },
  },
  plugins: [],
};
