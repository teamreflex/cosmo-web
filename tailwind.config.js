const plugin = require("tailwindcss/plugin");
const colors = require("tailwindcss/colors");

const flipUtilities = plugin(function ({ addUtilities }) {
  addUtilities({
    ".preserve-3d": {
      "transform-style": "preserve-3d",
    },
    ".rotate-y-180": {
      transform: "rotateY(180deg)",
    },
    ".backface-hidden": {
      "backface-visibility": "hidden",
    },
  });
});

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1250px",
      },
    },
    fontFamily: {
      sans: ["var(--font-inter)"],
    },
    extend: {
      colors: {
        cosmo: {
          DEFAULT: colors.violet[600],
          text: colors.violet[400],
          hover: colors.violet[900],
          profile: colors.violet[200],
        },
        polygon: {
          DEFAULT: "#8247E5",
          hover: "#9630ce",
        },
        opensea: {
          DEFAULT: "#2081E2",
          hover: "#1868B7",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      aspectRatio: {
        photocard: "5.5 / 8.5",
      },
      fontFamily: {
        sans: ["var(--font-inter)"],
        cosmo: ["var(--font-cosmo)"],
      },
      fontSize: {
        "2xs": ["10px", "14px"],
      },
    },
  },
  plugins: [require("tailwindcss-animate"), flipUtilities],
  safelist: [
    { pattern: /grid-cols-\d/, variants: ["xs", "md"] },
    { pattern: /order-\d/ },
  ],
};
