/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        jaba: {
          "primary": "#3182f6", // Toss Blue
          "primary-content": "#ffffff",
          "secondary": "#4e5968",
          "secondary-content": "#ffffff",
          "accent": "#ff6f0f", // Daangn Orange
          "neutral": "#333d4b",
          "base-100": "#ffffff",
          "base-200": "#f2f4f6", // Toss light gray background
          "base-300": "#e5e8eb",
          "base-content": "#191f28",
          "info": "#3182f6",
          "success": "#2ecc71",
          "warning": "#f39c12",
          "error": "#f04452",
          "--rounded-box": "1.5rem",
          "--rounded-btn": "0.75rem",
          "--rounded-badge": "1.9rem",
          "--animation-btn": "0.25s",
          "--animation-input": "0.2s",
          "--btn-text-case": "none",
          "--btn-focus-scale": "0.95",
          "--border-btn": "1px",
          "--tab-border": "1px",
          "--tab-radius": "0.5rem",
        },
        "jaba-dark": {
          "primary": "#3182f6",
          "primary-content": "#ffffff",
          "secondary": "#b0b8c1",
          "secondary-content": "#ffffff",
          "accent": "#ff6f0f",
          "neutral": "#e5e8eb",
          "base-100": "#191f28",
          "base-200": "#0f141c",
          "base-300": "#11111b",
          "base-content": "#f9fafb",
          "info": "#3182f6",
          "success": "#2ecc71",
          "warning": "#f39c12",
          "error": "#f04452",
          "--rounded-box": "1.5rem",
          "--rounded-btn": "0.75rem",
        }
      }
    ],
    darkTheme: "jaba-dark",
  },
}
