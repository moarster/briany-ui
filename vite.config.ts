import { tanstackRouter } from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true, routesDirectory: 'src/app/routes' }),
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    proxy: {
      // Dev talks to the engine through the proxy, so the browser stays single-origin:
      // no CORS, and no credentials leaking into a cross-origin preflight.
      '/api': { target: 'http://localhost:8095', changeOrigin: true },
    },
  },
  build: {
    // The three modeling libraries are the bulk of the bundle and each is lazy-loaded on
    // its own editor route; keep them out of the shared chunk.
    rollupOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'bpmn', test: /node_modules\/(bpmn-js|bpmn-moddle|diagram-js|bpmnlint)/ },
            { name: 'dmn', test: /node_modules\/dmn-js/ },
            { name: 'form', test: /node_modules\/@bpmn-io\/form-js/ },
          ],
        },
      },
    },
  },
})
