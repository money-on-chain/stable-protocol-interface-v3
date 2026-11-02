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
    envPrefix: ["REACT_APP_", "ALLOWED_API_ORIGINS", "HTTPS_REQUIRED_CHAIN_IDS"],
    plugins: [
        react(),
        svgr({ svgrOptions: {} }),
        VitePWA({
            registerType: "prompt",
            workbox: {
                navigateFallbackDenylist: [/^\/api\//],
                cleanupOutdatedCaches: true,
                // Default is 2 MiB and the main chunk is already ~1.7MB. A file
                // over the limit is silently left out of the precache, so after
                // a deploy a stale client would fetch it from the new CID, get
                // a 404 and render a blank page.
                maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
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
