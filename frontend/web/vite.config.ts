import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // LAN'a acik: ayni agdaki telefondan http://<mac-ip>:5173 ile test edilir.
    host: true,
    // Port kaymasi sessizce Google OAuth origin'ini ve LAN adresini bozuyordu — acik hata ver.
    port: 5173,
    strictPort: true,
    // Vite 6 dis host'lari bloklar; ngrok tuneli icin yalniz o alan adi acilir
    // (allowedHosts: true DNS rebinding'e acik olurdu).
    allowedHosts: [".ngrok-free.dev", ".ngrok-free.app", ".ngrok.app"],
    proxy: {
      "/api": "http://localhost:8060",
      "/ws": { target: "ws://localhost:8060", ws: true },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    // Adalet modülü paylaşımlı pakette (M-3 aynı kodu tüketir); testi burada koşar.
    include: ["src/**/*.test.{ts,tsx}", "../shared/src/**/*.test.ts"],
  },
});
