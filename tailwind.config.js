/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.tsx", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Pretendard"],
      },
      spacing: {
        "4.5": "1.125rem",
        "5.5": "1.375rem",
        "6.5": "1.625rem",
      },
      colors: {
        primary: "#7A4A2B",
        frame: "#EDE9E1",
        screen: "#FAF7F6",
        ink: "#1C1C1E",
        "ink-soft": "#6B6B6E",
        "ink-faint": "#9A9A9E",
        card: "#FFFFFF",
        "card-border": "#EEE9E0",
        "card-border-alt": "#E8E4DC",
        "status-ok-bg": "#E3F3E9",
        "status-ok-fg": "#1F7A45",
        "status-conditional-bg": "#FDF1DD",
        "status-conditional-fg": "#B4720A",
        "status-check-bg": "#F0EFEC",
        "status-check-fg": "#6B6B6E",
        "alert-bg": "#FDF1DD",
        "alert-border": "#F0D9A8",
        "alert-text": "#8A5A0A",
        "quote-bg": "#FAF8F4",
        "quote-border": "#DDD6C8",
        "quote-text": "#5C5138",
      },
    },
  },
  plugins: [],
};
