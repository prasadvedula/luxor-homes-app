import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const router = Router()

const OWNER_INCLUDE = {
  flat: true,
  emergencyContacts: true,
  vehicles: true,
  tenant: true,
  user: { select: { id: true, phone: true, email: true, registrationStatus: true, isPrimaryResident: true } },
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

// ── Family member routes ──────────────────────────────────────────────────────

const familyMemberSchema = z.object({
  name:     z.string().min(2),
  phone:    z.string().min(10),
  password: z.string().min(6),
  relation: z.string().optional(),
})

// GET /residents/family — list family members for the current user's flat
router.get('/family/list', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id
  const role = req.user!.role

  let primaryResidentId = userId

  // Family members: resolve their primary resident
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { isPrimaryResident: true, primaryResidentId: true } })
  if (!me) { res.status(404).json({ error: 'User not found' }); return }

  if (!me.isPrimaryResident && me.primaryResidentId) {
    primaryResidentId = me.primaryResidentId
  }

  // Admins can also call this to see all family members (via query param)
  if (role === 'ADMIN' && req.query.primaryId) {
    primaryResidentId = req.query.primaryId as string
  }

  const members = await prisma.user.findMany({
    where: { primaryResidentId },
    select: { id: true, name: true, phone: true, email: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
  res.json(members)
})

// POST /residents/family — primary resident adds a family member
router.post('/family', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id

  const me = await prisma.user.findUnique({ where: { id: userId }, select: { isPrimaryResident: true, registrationStatus: true } })
  if (!me?.isPrimaryResident) {
    res.status(403).json({ error: 'Only the primary registered resident can add family members' }); return
  }
  if (me.registrationStatus !== 'APPROVED') {
    res.status(403).json({ error: 'Your account must be approved before adding family members' }); return
  }

  const parsed = familyMemberSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() }); return
  }

  const { name, phone, password, relation } = parsed.data
  const cleanPhone = phone.trim()

  const existing = await prisma.user.findUnique({ where: { phone: cleanPhone } })
  if (existing) {
    res.status(409).json({ error: 'This mobile number is already registered' }); return
  }

  const hashed = await bcrypt.hash(password, 10)
  const member = await prisma.user.create({
    data: {
      name,
      phone: cleanPhone,
      password: hashed,
      role: 'RESIDENT',
      registrationStatus: 'APPROVED',  // auto-approved
      isPrimaryResident: false,
      primaryResidentId: userId,
    },
    select: { id: true, name: true, phone: true, email: true, createdAt: true },
  })

  res.status(201).json({ ...member, relation })
})

// PUT /residents/family/:memberId — update family member name/phone
router.put('/family/:memberId', async (req: AuthRequest, res: Response): Promise<void> => {
  const { memberId } = req.params
  const userId = req.user!.id
  const isAdmin = req.user!.role === 'ADMIN'

  const member = await prisma.user.findUnique({ where: { id: memberId }, select: { primaryResidentId: true, isPrimaryResident: true } })
  if (!member || member.isPrimaryResident) {
    res.status(404).json({ error: 'Family member not found' }); return
  }
  if (!isAdmin && member.primaryResidentId !== userId) {
    res.status(403).json({ error: 'Forbidden' }); return
  }

  const { name, phone } = req.body
  const data: Record<string, string> = {}
  if (name) data.name = name
  if (phone) {
    const cleanPhone = phone.trim()
    const conflict = await prisma.user.findUnique({ where: { phone: cleanPhone } })
    if (conflict && conflict.id !== memberId) {
      res.status(409).json({ error: 'Mobile number already in use' }); return
    }
    data.phone = cleanPhone
  }

  const updated = await prisma.user.update({
    where: { id: memberId },
    data,
    select: { id: true, name: true, phone: true, email: true, createdAt: true },
  })
  res.json(updated)
})

// DELETE /residents/family/:memberId — remove a family member
router.delete('/family/:memberId', async (req: AuthRequest, res: Response): Promise<void> => {
  const { memberId } = req.params
  const userId = req.user!.id
  const isAdmin = req.user!.role === 'ADMIN'

  const member = await prisma.user.findUnique({ where: { id: memberId }, select: { primaryResidentId: true, isPrimaryResident: true } })
  if (!member || member.isPrimaryResident) {
    res.status(404).json({ error: 'Family member not found' }); return
  }
  if (!isAdmin && member.primaryResidentId !== userId) {
    res.status(403).json({ error: 'Forbidden' }); return
  }

  await prisma.user.delete({ where: { id: memberId } })
  res.json({ success: true })
})

export default router
