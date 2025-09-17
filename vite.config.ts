import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import svgr from 'vite-plugin-svgr'
import path from 'path'
import fs from 'fs'
import { VitePWA } from 'vite-plugin-pwa'


const manifestFromPublic = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'public/manifest.json'), 'utf-8')
)

export default defineConfig({
  base: '',                 
  envPrefix: 'REACT_APP_',  
  plugins: [
    react(),
    svgr({ svgrOptions: {} }),
    VitePWA({      
      registerType: 'autoUpdate',      
      workbox: {
        navigateFallbackDenylist: [/^\/api\//],
      },
      manifest: manifestFromPublic,      
    })
  ],
  resolve: {
    mainFields: ['browser', 'module', 'jsnext'],
    alias: { '@': path.resolve(__dirname, './src') },
  },
  preview: {
    allowedHosts: ['.ngrok-free.app'],
    port: 4173
  }
})
