import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React ecosystem
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Data fetching & state
          'vendor-query': ['@tanstack/react-query'],
          // i18n
          'vendor-i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          // Supabase client
          'vendor-supabase': ['@supabase/supabase-js'],
          // Stripe (only loaded on ChoosePlan)
          'vendor-stripe': ['@stripe/stripe-js', '@stripe/react-stripe-js'],
          // Charts (only loaded on project pages)
          'vendor-recharts': ['recharts'],
          // Framer Motion (onboarding + animations)
          'vendor-motion': ['framer-motion'],
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
