import express from 'express'
import cors from 'cors'
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

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'luxor-homes-api' }))

app.use('/auth', authRouter)
app.use('/residents', residentsRouter)
app.use('/elections', electionsRouter)
app.use('/maintenance', maintenanceRouter)
app.use('/visitors', visitorsRouter)
app.use('/maids', maidsRouter)
app.use('/admin', adminRouter)

export default app
