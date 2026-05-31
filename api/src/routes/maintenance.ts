import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/', async (_req, res: Response): Promise<void> => {
  const [requests, facilities] = await Promise.all([
    prisma.maintenanceRequest.findMany({
      include: { facility: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.facility.findMany({ orderBy: { name: 'asc' } }),
  ])
  res.json({ requests, facilities })
})

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { facilityId, title, description, priority } = req.body
  const request = await prisma.maintenanceRequest.create({
    data: {
      facilityId, title, description,
      reportedBy: req.user!.id,
      priority: priority ?? 'MEDIUM',
      status: 'OPEN',
    },
    include: { facility: true },
  })
  res.status(201).json(request)
})

router.patch('/:id', requireRole('ADMIN'), async (req, res: Response): Promise<void> => {
  const { status } = req.body
  const updated = await prisma.maintenanceRequest.update({
    where: { id: req.params.id },
    data: { status, resolvedAt: status === 'RESOLVED' ? new Date() : undefined },
    include: { facility: true },
  })
  res.json(updated)
})

export default router
