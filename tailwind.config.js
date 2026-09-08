/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0d1210',
        panel: '#131a17',
        'panel-2': '#0f1513',
        line: '#22302b',
        text: '#dfe8e3',
        'text-dim': '#7d918a',
        amber: '#e0a63a',
        cyan: '#4fc6c0',
        green: '#5fbf7a',
        red: '#e3595a',
        violet: '#9a86e0',
      },
    },
  },
  plugins: [],
};
