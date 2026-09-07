import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#352742",
        moss: "#4f8f6b",
        mint: "#d9f8e6",
        oat: "#fff7fb",
        tomato: "#db4f79",
        blue: "#79aef7",
        rose: "#ffd6e7",
        lilac: "#eadcff",
        butter: "#fff2a8",
        aqua: "#d7f8ff"
      },
      boxShadow: {
        soft: "0 18px 45px rgba(53, 39, 66, 0.1)"
      }
    }
  },
  plugins: []
};

export default config;
