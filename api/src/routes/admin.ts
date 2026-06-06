import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth'
import { getMaintenanceAmount, setMaintenanceAmount } from '../lib/settings'
import bcrypt from 'bcryptjs'

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

// ── Security officer management ──────────────────────────────────────────────
router.get('/security-officers', async (_req, res: Response): Promise<void> => {
  const officers = await prisma.user.findMany({
    where: { role: 'SECURITY' },
    select: { id: true, name: true, phone: true, email: true, mustChangePassword: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
  res.json(officers)
})

router.post('/security-officers', async (_req, res: Response): Promise<void> => {
  const { name, phone, defaultPassword } = _req.body
  if (!name || !phone || !defaultPassword) {
    res.status(400).json({ error: 'name, phone and defaultPassword required' }); return
  }
  const cleanPhone = phone.replace(/\D/g, '').replace(/^91(\d{10})$/, '$1').replace(/^0(\d{10})$/, '$1')
  const existing = await prisma.user.findUnique({ where: { phone: cleanPhone } })
  if (existing) { res.status(409).json({ error: 'Phone number already in use' }); return }

  const hashed = await bcrypt.hash(defaultPassword, 10)
  const officer = await prisma.user.create({
    data: { name, phone: cleanPhone, password: hashed, role: 'SECURITY', registrationStatus: 'APPROVED', isPrimaryResident: true, mustChangePassword: true },
    select: { id: true, name: true, phone: true, mustChangePassword: true, createdAt: true },
  })
  res.status(201).json(officer)
})

router.delete('/security-officers/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const officer = await prisma.user.findUnique({ where: { id: req.params.id }, select: { role: true } })
  if (!officer || officer.role !== 'SECURITY') { res.status(404).json({ error: 'Security officer not found' }); return }
  await prisma.user.delete({ where: { id: req.params.id } })
  res.json({ success: true })
})

// Admin reset a user's password
router.post('/reset-password', async (req: AuthRequest, res: Response): Promise<void> => {
  const { userId, newPassword } = req.body
  if (!userId || !newPassword || newPassword.length < 6) {
    res.status(400).json({ error: 'userId and newPassword (min 6 chars) required' }); return
  }
  const hashed = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } })
  res.json({ success: true })
})

// ── Accounts manager management ──────────────────────────────────────────────
router.get('/accounts-managers', async (_req, res: Response): Promise<void> => {
  const managers = await prisma.user.findMany({
    where: { role: 'ACCOUNTS' },
    select: { id: true, name: true, phone: true, email: true, mustChangePassword: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
  res.json(managers)
})

router.post('/accounts-managers', async (req, res: Response): Promise<void> => {
  const { name, phone, defaultPassword } = req.body
  if (!name || !phone || !defaultPassword) {
    res.status(400).json({ error: 'name, phone and defaultPassword required' }); return
  }
  const cleanPhone = phone.replace(/\D/g, '').replace(/^91(\d{10})$/, '$1').replace(/^0(\d{10})$/, '$1')
  const existing = await prisma.user.findUnique({ where: { phone: cleanPhone } })
  if (existing) { res.status(409).json({ error: 'Phone number already in use' }); return }

  const hashed = await bcrypt.hash(defaultPassword, 10)
  const manager = await prisma.user.create({
    data: { name, phone: cleanPhone, password: hashed, role: 'ACCOUNTS', registrationStatus: 'APPROVED', isPrimaryResident: true, mustChangePassword: true },
    select: { id: true, name: true, phone: true, mustChangePassword: true, createdAt: true },
  })
  res.status(201).json(manager)
})

router.delete('/accounts-managers/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const mgr = await prisma.user.findUnique({ where: { id: req.params.id }, select: { role: true } })
  if (!mgr || mgr.role !== 'ACCOUNTS') { res.status(404).json({ error: 'Accounts manager not found' }); return }
  await prisma.user.delete({ where: { id: req.params.id } })
  res.json({ success: true })
})

// ── Settings ──────────────────────────────────────────────────────────────────
router.get('/settings', async (_req, res: Response): Promise<void> => {
  const maintenanceAmount = await getMaintenanceAmount()
  res.json({ maintenanceAmount })
})

router.put('/settings/maintenance-amount', async (req: AuthRequest, res: Response): Promise<void> => {
  const amount = parseFloat(req.body.amount)
  if (!amount || isNaN(amount) || amount <= 0) {
    res.status(400).json({ error: 'A valid positive amount is required' }); return
  }
  await setMaintenanceAmount(amount)
  res.json({ maintenanceAmount: amount })
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
