import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Soft palette tuned for a friendly mobile dashboard
        bucket: {
          50: "#f0fdf4",
          500: "#22c55e",
          700: "#15803d",
        },
      },
    },
  },
  plugins: [],
};

export default config;
