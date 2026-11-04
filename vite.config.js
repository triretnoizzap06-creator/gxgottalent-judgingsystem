import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Flat project: every source file lives in the repo root (no src/ or public/
// folders), so uploading through GitHub's web uploader can't lose the structure.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  publicDir: false,
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 1200,
  },
});
