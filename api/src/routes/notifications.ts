import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

// ── Resident: poll for unread notifications ───────────────────────────────────
router.get('/pending', requireRole('RESIDENT'), async (req: AuthRequest, res: Response): Promise<void> => {
  const owner = await prisma.owner.findUnique({ where: { userId: req.user!.id } })
  if (!owner) { res.json({ notifications: [] }); return }

  const notifications = await prisma.residentNotification.findMany({
    where: { ownerId: owner.id, read: false },
    orderBy: { createdAt: 'asc' },
  })
  res.json({ notifications })
})

// ── Resident: acknowledge (mark read) ────────────────────────────────────────
router.post('/ack', requireRole('RESIDENT'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { ids } = req.body
  if (!Array.isArray(ids) || ids.length === 0) { res.json({ success: true }); return }

  await prisma.residentNotification.updateMany({
    where: { id: { in: ids } },
    data: { read: true },
  })
  res.json({ success: true })
})

export default router
