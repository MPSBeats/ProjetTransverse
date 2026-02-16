/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './views/**/*.ejs',
        './public/js/**/*.js',
    ],
    theme: {
        extend: {
            colors: {
                'creme': '#FFFFFF',
                'brun': {
                    DEFAULT: '#1A1A1A',
                    'profond': '#000000',
                    'light': '#4A4A4A',
                },
                'terracotta': {
                    DEFAULT: '#B68D6D', // Bois moyen (ajusté un peu moins foncé)
                    'light': '#C6A686', // Ancienne teinte (plus clair)
                    'dark': '#8B5E3C',  // Très foncé
                },
                'or': {
                    DEFAULT: '#8B5E3C', // Bois très foncé
                    'doux': '#B68D6D',
                    'light': '#C6A686',
                },
                'vert-the': {
                    DEFAULT: '#7A8B6F',
                    'light': '#96A58C',
                    'dark': '#5F6E55',
                },
                'rose-macaron': {
                    DEFAULT: '#E8B4B8',
                    'light': '#F0CDD0',
                    'dark': '#D89CA1',
                },
                'blanc-casse': '#F9F9F9',
                'noir-cafe': '#111111',
            },
            fontFamily: {
                'display': ['"Playfair Display"', 'Georgia', 'serif'],
                'accent': ['"Cormorant Garamond"', 'Georgia', 'serif'],
                'body': ['"DM Sans"', 'system-ui', 'sans-serif'],
            },
            borderRadius: {
                'gourmand': '16px',
                'gourmand-lg': '24px',
            },
            boxShadow: {
                'warm': '0 4px 20px rgba(59, 35, 20, 0.08)',
                'warm-lg': '0 8px 40px rgba(59, 35, 20, 0.12)',
                'warm-hover': '0 12px 48px rgba(59, 35, 20, 0.16)',
                'card': '0 2px 12px rgba(59, 35, 20, 0.06)',
                'card-hover': '0 8px 32px rgba(59, 35, 20, 0.12)',
            },
            animation: {
                'bounce-cart': 'bounceCart 0.5s ease-in-out',
                'fade-up': 'fadeUp 0.6s ease-out forwards',
                'pulse-check': 'pulseCheck 0.4s ease-in-out',
                'slide-in-right': 'slideInRight 0.3s ease-out',
                'slide-in-up': 'slideInUp 0.3s ease-out',
            },
            keyframes: {
                bounceCart: {
                    '0%, 100%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(1.3)' },
                },
                fadeUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                pulseCheck: {
                    '0%': { transform: 'scale(0)' },
                    '50%': { transform: 'scale(1.2)' },
                    '100%': { transform: 'scale(1)' },
                },
                slideInRight: {
                    '0%': { transform: 'translateX(100%)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                },
                slideInUp: {
                    '0%': { transform: 'translateY(100%)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
            },
        },
    },
    plugins: [],
};
