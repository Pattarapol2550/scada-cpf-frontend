import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://cpfbackend2-0.onrender.com',
        changeOrigin: true,
        secure: false,   // ← bypass TLS cert mismatch (ERR_TLS_CERT_ALTNAME_INVALID)
      },
    },
  },
})