import react from "@vitejs/plugin-react-swc";
import fs from "fs";
import path from "path";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import svgr from "vite-plugin-svgr";

const manifestFromPublic = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "public/manifest.json"), "utf-8")
) as Record<string, unknown>;

export default defineConfig({
    base: "",
    envPrefix: "REACT_APP_",
    plugins: [
        react(),
        svgr({ svgrOptions: {} }),
        VitePWA({
            registerType: "prompt",
            workbox: {
                navigateFallbackDenylist: [/^\/api\//],
                cleanupOutdatedCaches: true,
            },
            manifest: manifestFromPublic,
        }),
    ],
    resolve: {
        mainFields: ["browser", "module", "jsnext"],
        alias: { "@": path.resolve(__dirname, "./src") },
    },
    preview: {
        allowedHosts: [".ngrok-free.app"],
        port: 4173,
    },
});
