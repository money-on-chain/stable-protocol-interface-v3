import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import svgr from 'vite-plugin-svgr'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    base: '',
    envPrefix: "REACT_APP_",
    plugins: [
        react(),
        svgr({
            svgrOptions: {
                // svgr options
            },
        })
    ],
    resolve: {
        mainFields: ['browser', 'module', 'jsnext'],
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    // TypeScript support is built into Vite
    // Vite will automatically handle .ts and .tsx files
})