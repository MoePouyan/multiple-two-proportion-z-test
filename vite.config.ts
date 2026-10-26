/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        // Copyright notice kept in every built chunk, even after minification.
        banner: '/*! Multiple Two-Proportion Z-Tests Calculator. Copyright 2026 Moe Pouyan. All rights reserved. https://www.moepouyan.com */',
        // Vendor code changes far less often than the app, so splitting it
        // keeps the cached chunks stable between deploys.
        manualChunks: {
          react: ['react', 'react-dom'],
          chart: ['chart.js'],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
