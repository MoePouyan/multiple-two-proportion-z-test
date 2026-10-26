/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0047AB',
          hover: '#003A8C',
          tint: 'rgba(0, 71, 171, 0.08)',
        },
        ink: '#18212B',
        muted: '#5B6673',
        secondary: 'rgba(0, 0, 0, 0.72)',
        hairline: '#D5D9DF',
        paper: '#F7F5EF',
        page: '#F5F5F5',
        success: '#166534',
        warning: '#B45309',
        danger: '#991B1B',
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '24px',
        control: '12px',
        pill: '999px',
      },
      boxShadow: {
        card: '0 4px 6px rgba(0,0,0,.02), 0 10px 15px rgba(0,0,0,.03), 0 0 0 1px rgba(0,0,0,.04)',
        cardHover: '0 14px 28px rgba(0,0,0,.08), 0 0 0 1px rgba(0,0,0,.05)',
      },
      letterSpacing: {
        tight: '-0.01em',
        tighter: '-0.03em',
      },
      transitionTimingFunction: {
        site: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        modal: {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.5s ease-out',
        modal: 'modal 0.2s ease-out',
      },
    },
  },
  plugins: [],
};
