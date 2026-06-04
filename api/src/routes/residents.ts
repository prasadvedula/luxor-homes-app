import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

const OWNER_INCLUDE = {
  flat: true,
  emergencyContacts: true,
  vehicles: true,
  tenant: true,
  user: { select: { id: true, email: true, registrationStatus: true } },
}

// Public — needed for registration form (no token yet)
router.get('/flats', async (_req, res: Response): Promise<void> => {
  const flats = await prisma.flat.findMany({
    orderBy: [{ floor: 'asc' }, { number: 'asc' }],
    select: { id: true, floor: true, number: true, label: true },
  })
  res.json(flats)
})

router.use(authenticate)

router.get('/', async (_req, res: Response): Promise<void> => {
  const owners = await prisma.owner.findMany({
    include: OWNER_INCLUDE,
    orderBy: [{ flat: { floor: 'asc' } }, { flat: { number: 'asc' } }],
  })
  res.json(owners)
})

router.get('/:id', async (req, res: Response): Promise<void> => {
  const owner = await prisma.owner.findUnique({
    where: { id: req.params.id },
    include: OWNER_INCLUDE,
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

  const { name, phone, altPhone, emergencyContacts, vehicles, tenantData } = req.body

  await prisma.emergencyContact.deleteMany({ where: { ownerId: id } })
  await prisma.vehicle.deleteMany({ where: { ownerId: id } })

  if (tenantData === null) {
    await prisma.tenant.deleteMany({ where: { ownerId: id } })
  } else if (tenantData) {
    const { name: tName, phone: tPhone, email, moveInDate, leaseEndDate, rentAmount, agreementNumber } = tenantData
    await prisma.tenant.upsert({
      where: { ownerId: id },
      update: { name: tName, phone: tPhone, email, moveInDate: moveInDate ? new Date(moveInDate) : null, leaseEndDate: leaseEndDate ? new Date(leaseEndDate) : null, rentAmount: rentAmount ? Number(rentAmount) : null, agreementNumber },
      create: { ownerId: id, name: tName, phone: tPhone, email, moveInDate: moveInDate ? new Date(moveInDate) : null, leaseEndDate: leaseEndDate ? new Date(leaseEndDate) : null, rentAmount: rentAmount ? Number(rentAmount) : null, agreementNumber },
    })
  }

  const updated = await prisma.owner.update({
    where: { id },
    data: {
      name, phone, altPhone,
      emergencyContacts: emergencyContacts?.length ? { create: emergencyContacts } : undefined,
      vehicles: vehicles?.length ? { create: vehicles } : undefined,
    },
    include: OWNER_INCLUDE,
  })
  res.json(updated)
})

export default router
