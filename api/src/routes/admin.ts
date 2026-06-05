import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

// Stats are visible to all authenticated users for the dashboard
router.get('/stats', async (_req, res: Response): Promise<void> => {
  const [residents, rentedFlats, pendingUsers, openMaintenance, pendingVisitors, activeElection] = await Promise.all([
    prisma.owner.count(),
    prisma.tenant.count(),
    prisma.user.count({ where: { registrationStatus: 'PENDING' } }),
    prisma.maintenanceRequest.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    prisma.visitor.count({ where: { status: 'PENDING' } }),
    prisma.election.findFirst({ where: { status: { in: ['NOMINATIONS_OPEN', 'VOTING_OPEN'] } } }),
  ])
  res.json({ residents, rentedFlats, pendingUsers, openMaintenance, pendingVisitors, activeElection })
})

// Admin-only routes below
router.use(requireRole('ADMIN'))

router.get('/pending-users', async (_req, res: Response): Promise<void> => {
  const users = await prisma.user.findMany({
    where: { registrationStatus: 'PENDING' },
    select: {
      id: true, name: true, email: true, phone: true, createdAt: true,
      owner: { select: { flat: { select: { label: true } } } },
    },
    orderBy: { createdAt: 'asc' },
  })
  res.json(users)
})

router.post('/approve-user', async (req: AuthRequest, res: Response): Promise<void> => {
  const { userId, action } = req.body
  if (!userId || !['APPROVED', 'REJECTED'].includes(action)) {
    res.status(400).json({ error: 'Invalid request' }); return
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data: { registrationStatus: action },
  })
  res.json({ id: user.id, status: user.registrationStatus })
})

// Delete a resident (owner) — cascades to family members via DB
router.delete('/residents/:ownerId', async (req: AuthRequest, res: Response): Promise<void> => {
  const { ownerId } = req.params
  const owner = await prisma.owner.findUnique({
    where: { id: ownerId },
    select: { userId: true, flat: { select: { label: true } } },
  })
  if (!owner) { res.status(404).json({ error: 'Resident not found' }); return }

  // Delete the user — cascades to owner, family members (primaryResidentId cascade)
  await prisma.user.delete({ where: { id: owner.userId } })
  res.json({ success: true, flat: owner.flat.label })
})

export default router
