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
            if (/^\/(\.git|\.env)(\/|$)/.test(req.url)) {
              res.statusCode = 403
              res.setHeader('Content-Type', 'text/plain')
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
          "default-src 'self'; script-src 'self' 'unsafe-inline' https://accounts.google.com; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; font-src 'self' https://cdn.jsdelivr.net https://fonts.gstatic.com; img-src 'self' data: https://lh3.googleusercontent.com https://www.gstatic.com; connect-src 'self' https://accounts.google.com https://cpfbackend2-0.onrender.com https://cdn.jsdelivr.net; form-action 'self'; frame-ancestors 'none'",
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
      middlewareMode: false,
    },
  }
})