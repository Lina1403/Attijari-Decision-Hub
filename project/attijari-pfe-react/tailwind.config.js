/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#C8102E',
        navy: '#1A1A2E',
        gold: '#F59E0B',
        page: '#F3F3F1',
        card: '#FFFFFF',
        border: '#E5E5E5',
        muted: '#6B6B6B',
        success: '#0F6E56',
        danger: '#DC2626',
        surface: '#FFF8E7',
        'primary-soft': '#FCECEE',
        'navy-soft': '#F6F6F8',
        'gold-soft': '#FFF8E7'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif']
      },
      borderRadius: {
        brand: '6px',
        card: '12px'
      },
      boxShadow: {
        none: 'none'
      },
      transitionTimingFunction: {
        'attijari-out': 'cubic-bezier(0.16, 1, 0.3, 1)'
      }
    }
  },
  plugins: []
};
