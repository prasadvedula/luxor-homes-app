import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

// Public — needed for the registration form before the user has a token
router.get('/flats', async (_req, res: Response): Promise<void> => {
  const flats = await prisma.flat.findMany({
    where: { owner: null },
    orderBy: [{ floor: 'asc' }, { number: 'asc' }],
    select: { id: true, floor: true, number: true, label: true },
  })
  res.json(flats)
})

// All routes below require auth
router.use(authenticate)

router.get('/', async (_req, res: Response): Promise<void> => {
  const owners = await prisma.owner.findMany({
    include: {
      flat: true,
      emergencyContacts: true,
      vehicles: true,
      user: { select: { id: true, email: true, registrationStatus: true } },
    },
    orderBy: [{ flat: { floor: 'asc' } }, { flat: { number: 'asc' } }],
  })
  res.json(owners)
})

router.get('/:id', async (req, res: Response): Promise<void> => {
  const owner = await prisma.owner.findUnique({
    where: { id: req.params.id },
    include: {
      flat: true,
      emergencyContacts: true,
      vehicles: true,
      user: { select: { id: true, email: true } },
    },
  })
  if (!owner) { res.status(404).json({ error: 'Not found' }); return }
  res.json(owner)
})

router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params
  const existing = await prisma.owner.findUnique({ where: { id } })
  if (!existing) { res.status(404).json({ error: 'Not found' }); return }

  if (req.user!.role !== 'ADMIN' && existing.userId !== req.user!.id) {
    res.status(403).json({ error: 'Forbidden' }); return
  }

  const { name, phone, altPhone, emergencyContacts, vehicles } = req.body

  await prisma.emergencyContact.deleteMany({ where: { ownerId: id } })
  await prisma.vehicle.deleteMany({ where: { ownerId: id } })

  const updated = await prisma.owner.update({
    where: { id },
    data: {
      name, phone, altPhone,
      emergencyContacts: emergencyContacts?.length ? { create: emergencyContacts } : undefined,
      vehicles: vehicles?.length ? { create: vehicles } : undefined,
    },
    include: { flat: true, emergencyContacts: true, vehicles: true },
  })
  res.json(updated)
})

export default router
