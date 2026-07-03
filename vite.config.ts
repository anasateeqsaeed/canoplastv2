import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.ico", "robots.txt"],
      manifest: false, // Use our custom manifest.json
      workbox: {
        globPatterns: ["**/*.{js,css,ico,png,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024, // 8 MiB
        navigateFallbackDenylist: [/^\/~oauth/],
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Always fetch HTML/navigation from network so users get the latest published build
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "html-cache",
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 4, maxAgeSeconds: 60 },
            },
          },
          {
            // Always go to network for Supabase API calls so fresh data is shown.
            // Only fall back to cache when the user is fully offline.
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkOnly",
            options: {
              cacheName: "supabase-cache",
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Prevent duplicate React instances
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  // Ensure proper bundling of react-query
  optimizeDeps: {
    include: ["@tanstack/react-query"],
  },
}));
