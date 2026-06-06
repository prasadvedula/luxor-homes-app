import express from 'express'
import cors from 'cors'
import path from 'path'
import { createProxyMiddleware } from 'http-proxy-middleware'
import authRouter from './routes/auth'
import residentsRouter from './routes/residents'
import electionsRouter from './routes/elections'
import maintenanceRouter from './routes/maintenance'
import visitorsRouter from './routes/visitors'
import maidsRouter from './routes/maids'
import adminRouter from './routes/admin'
import paymentsRouter from './routes/payments'

const app = express()

const ALLOWED_ORIGINS = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'https://ui-prasadvedula-1246s-projects.vercel.app',
  'https://ui-psi-sepia.vercel.app',
].filter(Boolean) as string[]

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    // and any Vercel preview URL for this project
    if (!origin || ALLOWED_ORIGINS.includes(origin) || /^https:\/\/ui-.*\.vercel\.app$/.test(origin)) {
      cb(null, true)
    } else {
      cb(null, true) // permissive — auth is enforced by JWT regardless
    }
  },
  credentials: true,
}))
app.use(express.json())

// Route browser page navigations to Next.js before API handlers run.
// Problem: paths like /visitors exist as both an Express API route AND a Next.js page.
// When the Capacitor WebView does a full-page load (app reopen, hard reload) at /visitors,
// Express hits visitorsRouter → authenticate middleware → 401 "Unauthorized" because the
// browser navigation carries no Authorization header. Fix: if the request looks like a
// browser page load (Accept: text/html, no Authorization header) send it to Next.js.
// Actual API calls always include Authorization: Bearer <token> from makeClientApi().
const UI_PORT = process.env.UI_PORT || '3000'
const uiProxy = createProxyMiddleware({
  target: `http://localhost:${UI_PORT}`,
  changeOrigin: false,
  ws: true,
})
app.use((req, res, next) => {
  const accept = req.headers.accept ?? ''
  const isPageNav = accept.includes('text/html') && !req.headers.authorization
  if (isPageNav || req.query._rsc !== undefined || accept.includes('text/x-component')) {
    return uiProxy(req, res, next)
  }
  next()
})

// Serve APK download page and file
const downloadDir = path.join(__dirname, '../public/download')
app.use('/download', express.static(downloadDir))
app.get('/download', (_req, res) => {
  res.sendFile(path.join(downloadDir, 'index.html'))
})

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'luxor-homes-api' }))

app.use('/auth', authRouter)
app.use('/residents', residentsRouter)
app.use('/elections', electionsRouter)
app.use('/maintenance', maintenanceRouter)
app.use('/visitors', visitorsRouter)
app.use('/maids', maidsRouter)
app.use('/admin', adminRouter)
app.use('/payments', paymentsRouter)

// Proxy all remaining requests to the Next.js UI
app.use('/', uiProxy)

export default app
