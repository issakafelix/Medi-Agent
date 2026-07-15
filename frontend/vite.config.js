import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 3000,
    strictPort: false,
    cors: true,
    open: true,
    proxy: {
      '/api': {
        // Proxy API requests to the local backend. Backend default port is 3001.
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
  preview: {
    // `vite preview` serves only static files; forward API calls to the
    // live backend so local previews are testable end-to-end.
    proxy: {
      '/api': {
        target: 'https://medi-agent-omega.vercel.app',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
});
