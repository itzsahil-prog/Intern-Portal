/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    orange: '#F26522',
                    navy: '#1B2A5C',
                    'light-blue': '#E8EDF5',
                },
            },
            fontFamily: {
                heading: ['Syne', 'sans-serif'],
                body: ['"DM Sans"', 'sans-serif'],
            },
        },
    },
    plugins: [],
}