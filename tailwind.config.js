/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,jsx}'],
    theme: {
        extend: {
            colors: {
                marca: { 50: '#eef5fd', 100: '#d9e8fa', 500: '#2a78d6', 600: '#2266b8', 700: '#1c5296' },
            },
            fontFamily: { sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'] },
        },
    },
    plugins: [],
};
