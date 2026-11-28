import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxy /api in both dev and preview modes so relative /api calls reach port 3001
const apiProxy = {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true
  }
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: apiProxy
  },
  preview: {
    port: 4173,
    proxy: apiProxy
  }
});
