/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#061532',
        secondary: '#09245a',
        gold: '#d79b26',
        gold2: '#f8c65a',
        accent: '#e2a536',
        success: '#10b981',
        danger: '#ef4444',
        bg: '#f8f9fa',
      },
      fontFamily: {
        display: ['Poppins', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'premium': '0 10px 40px -10px rgba(6, 21, 50, 0.15)',
        'bottom-nav': '0 -4px 20px rgba(6, 21, 50, 0.08)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      }
    },
  },
  plugins: [],
}
