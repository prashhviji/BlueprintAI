import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const rgb = (token: string) => `rgb(var(--${token}) / <alpha-value>)`;

const config: Config = {
  darkMode: ["class", "[data-theme='dark']"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1400px" },
    },
    fontSize: {
      "3xs": ["10px", { lineHeight: "1.2" }],
      "2xs": ["11px", { lineHeight: "1.2" }],
      xs:    ["12px", { lineHeight: "1.4" }],
      sm:    ["13px", { lineHeight: "1.4" }],
      base:  ["14px", { lineHeight: "1.55" }],
      md:    ["16px", { lineHeight: "1.55" }],
      lg:    ["20px", { lineHeight: "1.3" }],
      xl:    ["28px", { lineHeight: "1.2" }],
      "2xl": ["40px", { lineHeight: "1.1" }],
      "3xl": ["64px", { lineHeight: "1.05" }],
      "4xl": ["96px", { lineHeight: "1.05" }],
    },
    extend: {
      colors: {
        // Surfaces
        base:      rgb("bg-base"),
        "surface-1": rgb("bg-surface-1"),
        "surface-2": rgb("bg-surface-2"),
        "surface-3": rgb("bg-surface-3"),
        canvas:    rgb("bg-canvas"),

        // Foreground
        primary:   rgb("fg-primary"),
        secondary: rgb("fg-secondary"),
        tertiary:  rgb("fg-tertiary"),
        quaternary:rgb("fg-quaternary"),

        // Borders
        "border-subtle":  rgb("border-subtle"),
        "border-default": rgb("border-default"),
        "border-strong":  rgb("border-strong"),

        // Accent (the only one)
        accent: {
          DEFAULT: rgb("accent"),
          hover:   rgb("accent-hover"),
          pressed: rgb("accent-pressed"),
        },

        // Functional
        success: rgb("success"),
        warning: rgb("warning"),
        danger:  rgb("danger"),

        // Canvas
        "canvas-wall":      rgb("canvas-wall"),
        "canvas-dimension": rgb("canvas-dimension"),
      },
      borderRadius: {
        none: "0",
        sm:   "var(--radius-sm)",
        DEFAULT: "var(--radius-md)",
        md:   "var(--radius-md)",
        lg:   "var(--radius-lg)",
        xl:   "var(--radius-xl)",
        pill: "var(--radius-pill)",
      },
      spacing: {
        0: "0",
        1: "var(--space-1)",
        2: "var(--space-2)",
        3: "var(--space-3)",
        4: "var(--space-4)",
        5: "var(--space-5)",
        6: "var(--space-6)",
        8: "var(--space-8)",
        10: "var(--space-10)",
        12: "var(--space-12)",
        16: "var(--space-16)",
        20: "var(--space-20)",
        24: "var(--space-24)",
      },
      boxShadow: {
        sm:    "var(--shadow-sm)",
        DEFAULT: "var(--shadow-md)",
        md:    "var(--shadow-md)",
        lg:    "var(--shadow-lg)",
        xl:    "var(--shadow-xl)",
        inset: "var(--shadow-inset)",
      },
      transitionDuration: {
        instant: "var(--duration-instant)",
        fast:    "var(--duration-fast)",
        normal:  "var(--duration-normal)",
        slow:    "var(--duration-slow)",
      },
      transitionTimingFunction: {
        out:    "var(--ease-out)",
        in:     "var(--ease-in)",
        "in-out":"var(--ease-in-out)",
        spring: "var(--ease-spring)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.97)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
      },
      animation: {
        "fade-in":     "fade-in    var(--duration-fast) var(--ease-out)",
        "fade-in-up":  "fade-in-up var(--duration-normal) var(--ease-out)",
        "scale-in":    "scale-in   var(--duration-normal) var(--ease-spring)",
        "accordion-down":"accordion-down 0.2s ease-out",
        "accordion-up":  "accordion-up   0.2s ease-out",
      },
    },
  },
  plugins: [animate],
};
export default config;
