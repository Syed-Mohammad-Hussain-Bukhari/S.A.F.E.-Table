<<<<<<< HEAD
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "url";
import { componentTagger } from "lovable-tagger";
=======
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "url";
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
<<<<<<< HEAD
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
=======
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.VITE_API_PROXY_TARGET || "http://localhost:8000";

  return {
    server: {
      host: "127.0.0.1",
      port: 8080,
      proxy: {
        // REST API
        "/api": {
          target: apiTarget,
          changeOrigin: true,
        },
        // WebSocket endpoints
        "/ws": {
          target: apiTarget,
          ws: true,
          changeOrigin: true,
        },
      },
    },
    preview: { host: "127.0.0.1", port: 8080 },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      sourcemap: false,
    },
  };
});
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
