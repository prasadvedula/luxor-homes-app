import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth'
import Razorpay from 'razorpay'
import crypto from 'crypto'

const router = Router()
router.use(authenticate)

const AMOUNT = parseFloat(process.env.MAINTENANCE_AMOUNT || '2500')
const DUE_DAY = 5

function getRazorpay() {
  const key_id = process.env.RAZORPAY_KEY_ID
  const key_secret = process.env.RAZORPAY_KEY_SECRET
  if (!key_id || !key_secret) return null
  return new Razorpay({ key_id, key_secret })
}

function currentMonthYear() {
  const now = new Date()
  return { month: now.getMonth() + 1, year: now.getFullYear() }
}

function dueDate(month: number, year: number) {
  return new Date(year, month - 1, DUE_DAY, 23, 59, 59)
}

function inferStatus(month: number, year: number): 'PENDING' | 'OVERDUE' {
  return new Date() > dueDate(month, year) ? 'OVERDUE' : 'PENDING'
}

// ── Resident: get own payments ───────────────────────────────────────────────
router.get('/my', requireRole('RESIDENT'), async (req: AuthRequest, res: Response): Promise<void> => {
  const owner = await prisma.owner.findUnique({ where: { userId: req.user!.id } })
  if (!owner) { res.status(404).json({ error: 'Resident profile not found' }); return }

  const payments = await prisma.maintenancePayment.findMany({
    where: { ownerId: owner.id },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  })
  res.json({ payments, defaultAmount: AMOUNT })
})

// ── Resident: ensure current month record exists (called on page load) ────────
router.post('/ensure-current', requireRole('RESIDENT'), async (req: AuthRequest, res: Response): Promise<void> => {
  const owner = await prisma.owner.findUnique({
    where: { userId: req.user!.id },
    include: { flat: true },
  })
  if (!owner) { res.status(404).json({ error: 'Resident profile not found' }); return }

  const { month, year } = currentMonthYear()
  const payment = await prisma.maintenancePayment.upsert({
    where: { ownerId_month_year: { ownerId: owner.id, month, year } },
    create: {
      ownerId: owner.id,
      flatLabel: owner.flat.label,
      residentName: owner.name,
      amount: AMOUNT,
      month, year,
      status: inferStatus(month, year),
    },
    update: {},
  })
  res.json(payment)
})

// ── Resident: create Razorpay order ──────────────────────────────────────────
router.post('/create-order', requireRole('RESIDENT'), async (req: AuthRequest, res: Response): Promise<void> => {
  const rzp = getRazorpay()
  if (!rzp) { res.status(503).json({ error: 'Payment gateway not configured. Contact admin.' }); return }

  const owner = await prisma.owner.findUnique({
    where: { userId: req.user!.id },
    include: { flat: true },
  })
  if (!owner) { res.status(404).json({ error: 'Resident profile not found' }); return }

  const { month, year } = currentMonthYear()

  const existing = await prisma.maintenancePayment.findUnique({
    where: { ownerId_month_year: { ownerId: owner.id, month, year } },
  })
  if (existing?.status === 'PAID') { res.status(400).json({ error: 'Already paid for this month' }); return }
  if (existing?.status === 'WAIVED') { res.status(400).json({ error: 'Payment waived for this month' }); return }

  const order = await rzp.orders.create({
    amount: AMOUNT * 100,
    currency: 'INR',
    receipt: `maint-${owner.id}-${month}-${year}`.slice(0, 40),
  })

  await prisma.maintenancePayment.upsert({
    where: { ownerId_month_year: { ownerId: owner.id, month, year } },
    create: {
      ownerId: owner.id, flatLabel: owner.flat.label, residentName: owner.name,
      amount: AMOUNT, month, year,
      status: inferStatus(month, year),
      razorpayOrderId: order.id,
    },
    update: { razorpayOrderId: order.id },
  })

  res.json({
    orderId: order.id,
    amount: order.amount,
    currency: 'INR',
    keyId: process.env.RAZORPAY_KEY_ID,
    prefill: { name: owner.name, email: owner.email, contact: owner.phone },
  })
})

// ── Resident: verify & confirm payment ───────────────────────────────────────
router.post('/verify', requireRole('RESIDENT'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    res.status(400).json({ error: 'Missing payment details' }); return
  }

  const secret = process.env.RAZORPAY_KEY_SECRET!
  const expected = crypto.createHmac('sha256', secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex')

  if (expected !== razorpay_signature) {
    res.status(400).json({ error: 'Invalid payment signature' }); return
  }

  const payment = await prisma.maintenancePayment.update({
    where: { razorpayOrderId: razorpay_order_id },
    data: {
      status: 'PAID',
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      paidAt: new Date(),
      method: 'online',
    },
  })
  res.json({ success: true, payment })
})

// ── Resident: submit UTR after UPI payment ────────────────────────────────────
// Resident pays via their UPI app, gets a 12-digit UTR, pastes it here.
// Status stays PENDING until admin manually verifies and calls mark-paid.
router.post('/submit-utr', requireRole('RESIDENT'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { utrNumber } = req.body
  if (!utrNumber || String(utrNumber).trim().length < 6) {
    res.status(400).json({ error: 'Please enter a valid transaction reference (UTR)' }); return
  }

  const owner = await prisma.owner.findUnique({
    where: { userId: req.user!.id },
    include: { flat: true },
  })
  if (!owner) { res.status(404).json({ error: 'Resident profile not found' }); return }

  const { month, year } = currentMonthYear()
  const payment = await prisma.maintenancePayment.upsert({
    where: { ownerId_month_year: { ownerId: owner.id, month, year } },
    create: {
      ownerId: owner.id, flatLabel: owner.flat.label, residentName: owner.name,
      amount: AMOUNT, month, year,
      status: inferStatus(month, year),
      utrNumber: String(utrNumber).trim(),
      method: 'upi',
      note: 'Pending admin verification',
    },
    update: { utrNumber: String(utrNumber).trim(), method: 'upi', note: 'Pending admin verification' },
  })
  res.json({ success: true, payment })
})

// ── Admin + Accounts: all payments for a month ────────────────────────────────
router.get('/all', requireRole('ADMIN', 'ACCOUNTS'), async (req: AuthRequest, res: Response): Promise<void> => {
  const now = new Date()
  const month = parseInt(req.query.month as string) || now.getMonth() + 1
  const year  = parseInt(req.query.year  as string) || now.getFullYear()

  const payments = await prisma.maintenancePayment.findMany({
    where: { month, year },
    orderBy: [{ status: 'asc' }, { flatLabel: 'asc' }],
  })

  // Owners who have no payment record yet for this month
  const allOwners = await prisma.owner.findMany({
    include: { flat: true },
    orderBy: { flat: { label: 'asc' } },
  })
  const paidOwnerIds = new Set(payments.map(p => p.ownerId))
  const missing = allOwners
    .filter(o => !paidOwnerIds.has(o.id))
    .map(o => ({
      id: null, ownerId: o.id, flatLabel: o.flat.label, residentName: o.name,
      amount: AMOUNT, month, year, status: inferStatus(month, year),
      paidAt: null, method: null, note: null, utrNumber: null, createdAt: null,
    }))

  res.json({ payments: [...payments, ...missing], amount: AMOUNT })
})

// ── Admin + Accounts: summary stats ──────────────────────────────────────────
router.get('/summary', requireRole('ADMIN', 'ACCOUNTS'), async (req: AuthRequest, res: Response): Promise<void> => {
  const now = new Date()
  const month = parseInt(req.query.month as string) || now.getMonth() + 1
  const year  = parseInt(req.query.year  as string) || now.getFullYear()

  const [paid, overdue, pending, waived, totalOwners] = await Promise.all([
    prisma.maintenancePayment.count({ where: { month, year, status: 'PAID' } }),
    prisma.maintenancePayment.count({ where: { month, year, status: 'OVERDUE' } }),
    prisma.maintenancePayment.count({ where: { month, year, status: 'PENDING' } }),
    prisma.maintenancePayment.count({ where: { month, year, status: 'WAIVED' } }),
    prisma.owner.count(),
  ])
  const unpaidCount = totalOwners - paid - waived
  res.json({
    month, year, totalOwners, paid, overdue, pending,
    waived, unpaidCount,
    collected: paid * AMOUNT,
    outstanding: unpaidCount * AMOUNT,
    amount: AMOUNT,
  })
})

// ── Admin + Accounts: mark paid (cash / bank transfer) ────────────────────────
router.post('/mark-paid', requireRole('ADMIN', 'ACCOUNTS'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { ownerId, month, year, method = 'cash', note } = req.body
  if (!ownerId || !month || !year) { res.status(400).json({ error: 'ownerId, month, year required' }); return }

  const owner = await prisma.owner.findUnique({ where: { id: ownerId }, include: { flat: true } })
  if (!owner) { res.status(404).json({ error: 'Owner not found' }); return }

  const payment = await prisma.maintenancePayment.upsert({
    where: { ownerId_month_year: { ownerId, month, year } },
    create: {
      ownerId, flatLabel: owner.flat.label, residentName: owner.name,
      amount: AMOUNT, month, year,
      status: 'PAID', paidAt: new Date(), method, note,
    },
    update: { status: 'PAID', paidAt: new Date(), method, note },
  })
  res.json(payment)
})

// ── Admin: waive payment ──────────────────────────────────────────────────────
router.post('/waive', requireRole('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { ownerId, month, year, note } = req.body
  if (!ownerId || !month || !year) { res.status(400).json({ error: 'ownerId, month, year required' }); return }

  const owner = await prisma.owner.findUnique({ where: { id: ownerId }, include: { flat: true } })
  if (!owner) { res.status(404).json({ error: 'Owner not found' }); return }

  const payment = await prisma.maintenancePayment.upsert({
    where: { ownerId_month_year: { ownerId, month, year } },
    create: {
      ownerId, flatLabel: owner.flat.label, residentName: owner.name,
      amount: AMOUNT, month, year,
      status: 'WAIVED', paidAt: new Date(), method: 'waived', note,
    },
    update: { status: 'WAIVED', note, method: 'waived' },
  })
  res.json(payment)
})

// ── Admin: generate records for all owners for a month ────────────────────────
router.post('/generate', requireRole('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { month, year } = req.body
  if (!month || !year) { res.status(400).json({ error: 'month and year required' }); return }

  const owners = await prisma.owner.findMany({ include: { flat: true } })
  const status = inferStatus(month, year)

  const created = await Promise.all(
    owners.map(o =>
      prisma.maintenancePayment.upsert({
        where: { ownerId_month_year: { ownerId: o.id, month, year } },
        create: { ownerId: o.id, flatLabel: o.flat.label, residentName: o.name, amount: AMOUNT, month, year, status },
        update: {},
      })
    )
  )
  res.json({ generated: created.length, month, year })
})

export default router
