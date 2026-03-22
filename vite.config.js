import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    watch: {
      ignored: [
        "**/February_*/**",
        "**/output/**",
        "**/dist/**",
        "**/venv/**",
        "**/minimaps/**",
        "**/public/data/**",
        "**/public/minimaps/**",
      ],
    },
  },
});
