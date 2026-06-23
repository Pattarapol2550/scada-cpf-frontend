import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target =
    env.VITE_LOCAL_API ||
    env.VITE_API_URL ||
    'https://cpfbackend2-0.onrender.com'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: target.replace(/\/$/, ''), // strip trailing slash
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})