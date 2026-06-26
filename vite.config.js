import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target =
    env.VITE_LOCAL_API ||
    env.VITE_API_URL ||
    'https://cpfbackend2-0.onrender.com'

  return {
    plugins: [
      react(),
      {
        name: 'block-sensitive-paths',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (/^\/(\.git|\.env|node_modules)(\/|$)/.test(req.url)) {
              res.statusCode = 403
              res.end('Forbidden')
              return
            }
            next()
          })
        },
      },
    ],
    server: {
      proxy: {
        '/api': {
          target: target.replace(/\/$/, ''),
          changeOrigin: true,
          secure: false,
        },
      },
      headers: {
        'Content-Security-Policy':
          "default-src 'self'; script-src 'self' 'unsafe-inline' https://accounts.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://accounts.google.com; frame-ancestors 'none'",
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
      middlewareMode: false,
    },
  }
})