import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  let where = {}

  if (req.user!.role === 'RESIDENT') {
    const owner = await prisma.owner.findUnique({ where: { userId: req.user!.id } })
    if (owner) {
      const flat = await prisma.flat.findUnique({ where: { id: owner.flatId } })
      if (flat) where = { flatToVisit: flat.label }
    }
  }

  const visitors = await prisma.visitor.findMany({
    where,
    include: { approvedBy: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(visitors)
})

router.post('/', requireRole('ADMIN', 'SECURITY'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, phone, purpose, flatToVisit } = req.body
  const visitor = await prisma.visitor.create({
    data: { name, phone, purpose, flatToVisit, status: 'PENDING' },
  })
  res.status(201).json(visitor)
})

router.patch('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const visitor = await prisma.visitor.findUnique({ where: { id: req.params.id } })
  if (!visitor) { res.status(404).json({ error: 'Not found' }); return }

  const { action, note } = req.body
  const updateData: Record<string, unknown> = { status: action, note }

  if (action === 'APPROVED') {
    updateData.approvedById = req.user!.id
    updateData.entryTime = new Date()
  } else if (action === 'CHECKED_OUT') {
    updateData.exitTime = new Date()
  }

  const updated = await prisma.visitor.update({
    where: { id: req.params.id },
    data: updateData,
    include: { approvedBy: { select: { name: true } } },
  })
  res.json(updated)
})

export default router
