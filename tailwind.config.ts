import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          preto:    '#262626',
          aco:      '#B3B3B3',
          sombra:   '#7F7F7F',
          offwhite: '#F2F2F2',
        },
        plan: {
          essencial:    '#7F7F7F', // Cinza Sombra para básico
          profissional: '#262626', // Preto Suave para pro
          premium:      '#B3B3B3', // Apenas caso use
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
        border:     "var(--border)",
        input:      "var(--input)",
        ring:       "var(--ring)",
        primary: {
          DEFAULT:    "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT:    "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT:    "var(--destructive)",
        },
        muted: {
          DEFAULT:    "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT:    "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        card: {
          DEFAULT:    "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT:    "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)'],
        display: ['var(--font-cal)'],
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.25rem',
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography")
  ],
};

export default config;
