import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "var(--bg)",
        surface: "var(--surface)",
        raised: "var(--surface-raised)",
        line: "var(--border)",
        muted: "var(--text-muted)",
        accent: "var(--accent)",
      },
      keyframes: {
        "landing-marquee": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "landing-marquee": "landing-marquee 50s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
