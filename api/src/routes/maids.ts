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
      if (flat) where = { flatAssigned: flat.label }
    }
  }

  const maids = await prisma.maid.findMany({
    where,
    include: { approvedBy: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(maids)
})

router.post('/', requireRole('ADMIN', 'SECURITY'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, phone, idCardType, idCardNumber, flatAssigned, workType } = req.body

  if (!name || !phone || !idCardType || !idCardNumber || !flatAssigned || !workType) {
    res.status(400).json({ error: 'All fields are required' })
    return
  }

  const maid = await prisma.maid.create({
    data: { name, phone, idCardType, idCardNumber, flatAssigned, workType, status: 'PENDING' },
  })
  res.status(201).json(maid)
})

router.patch('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const maid = await prisma.maid.findUnique({ where: { id: req.params.id } })
  if (!maid) { res.status(404).json({ error: 'Not found' }); return }

  const { action, note } = req.body
  const updateData: Record<string, unknown> = { status: action, note }

  if (action === 'APPROVED') {
    updateData.approvedById = req.user!.id
    updateData.entryTime = new Date()
  } else if (action === 'ACTIVE') {
    updateData.entryTime = new Date()
  } else if (action === 'CHECKED_OUT') {
    updateData.exitTime = new Date()
  }

  const updated = await prisma.maid.update({
    where: { id: req.params.id },
    data: updateData,
    include: { approvedBy: { select: { name: true } } },
  })
  res.json(updated)
})

export default router
