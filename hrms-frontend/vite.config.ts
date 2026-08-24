import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost',
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            if (['ECONNABORTED', 'ECONNRESET', 'ECONNREFUSED', 'EPIPE'].includes(err.code || '')) return;
            console.log('[Proxy /api] error:', err.message);
          });
        }
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            if (['ECONNABORTED', 'ECONNRESET', 'ECONNREFUSED', 'EPIPE'].includes(err.code || '')) return;
            console.log('[Proxy /socket.io] error:', err.message);
          });
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react-syntax-highlighter', 'react-syntax-highlighter/dist/esm/styles/prism']
  }
})
