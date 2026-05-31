import path from 'path'
import dotenv from 'dotenv'

// Load .env from the repo root (one level up from api/)
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

import app from './app'

const PORT = Number(process.env.PORT) || 4000

app.listen(PORT, () => {
  console.log(`Luxor Homes API running on http://localhost:${PORT}`)
})
