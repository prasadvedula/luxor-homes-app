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

const app = express()

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}))
app.use(express.json())

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

// Proxy all remaining requests to the Next.js UI on port 3000
const UI_PORT = process.env.UI_PORT || '3000'
app.use('/', createProxyMiddleware({
  target: `http://localhost:${UI_PORT}`,
  changeOrigin: false,
  ws: true,
}))

export default app
