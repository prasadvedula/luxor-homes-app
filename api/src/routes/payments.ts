import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth'
import { getMaintenanceAmount } from '../lib/settings'
import Razorpay from 'razorpay'
import crypto from 'crypto'

const router = Router()
router.use(authenticate)

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

function computeStatus(
  paidAmount: number,
  totalAmount: number,
  month: number,
  year: number,
): 'PENDING' | 'PARTIAL' | 'OVERDUE' | 'PAID' {
  if (paidAmount >= totalAmount) return 'PAID'
  if (paidAmount > 0) return 'PARTIAL'
  return new Date() > dueDate(month, year) ? 'OVERDUE' : 'PENDING'
}

// ── Resident: get own payments ───────────────────────────────────────────────
router.get('/my', requireRole('RESIDENT'), async (req: AuthRequest, res: Response): Promise<void> => {
  const owner = await prisma.owner.findUnique({ where: { userId: req.user!.id } })
  if (!owner) { res.status(404).json({ error: 'Resident profile not found' }); return }

  const [payments, defaultAmount] = await Promise.all([
    prisma.maintenancePayment.findMany({
      where: { ownerId: owner.id },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    }),
    getMaintenanceAmount(),
  ])
  res.json({ payments, defaultAmount })
})

// ── Resident: ensure current month record exists ──────────────────────────────
router.post('/ensure-current', requireRole('RESIDENT'), async (req: AuthRequest, res: Response): Promise<void> => {
  const owner = await prisma.owner.findUnique({ where: { userId: req.user!.id }, include: { flat: true } })
  if (!owner) { res.status(404).json({ error: 'Resident profile not found' }); return }

  const { month, year } = currentMonthYear()
  const AMOUNT = await getMaintenanceAmount()

  const existing = await prisma.maintenancePayment.findUnique({
    where: { ownerId_month_year: { ownerId: owner.id, month, year } },
  })

  if (existing) {
    // Recalculate status in case due date passed or amount changed
    const correctStatus = existing.status === 'PAID' || existing.status === 'WAIVED'
      ? existing.status
      : computeStatus(existing.paidAmount, existing.amount, month, year)
    if (correctStatus !== existing.status) {
      const updated = await prisma.maintenancePayment.update({
        where: { id: existing.id },
        data: { status: correctStatus },
      })
      res.json(updated); return
    }
    res.json(existing); return
  }

  const payment = await prisma.maintenancePayment.create({
    data: {
      ownerId: owner.id,
      flatLabel: owner.flat.label,
      residentName: owner.name,
      amount: AMOUNT,
      paidAmount: 0,
      month, year,
      status: computeStatus(0, AMOUNT, month, year),
    },
  })
  res.json(payment)
})

// ── Resident: create Razorpay order (supports partial amount) ─────────────────
router.post('/create-order', requireRole('RESIDENT'), async (req: AuthRequest, res: Response): Promise<void> => {
  const rzp = getRazorpay()
  if (!rzp) { res.status(503).json({ error: 'Payment gateway not configured. Contact admin.' }); return }

  const owner = await prisma.owner.findUnique({ where: { userId: req.user!.id }, include: { flat: true } })
  if (!owner) { res.status(404).json({ error: 'Resident profile not found' }); return }

  const { month, year } = currentMonthYear()

  const existing = await prisma.maintenancePayment.findUnique({
    where: { ownerId_month_year: { ownerId: owner.id, month, year } },
  })
  if (existing?.status === 'PAID')   { res.status(400).json({ error: 'Already fully paid for this month' }); return }
  if (existing?.status === 'WAIVED') { res.status(400).json({ error: 'Payment waived for this month' }); return }

  const AMOUNT = await getMaintenanceAmount()
  const totalDue  = existing?.amount ?? AMOUNT
  const alreadyPaid = existing?.paidAmount ?? 0
  const remaining   = totalDue - alreadyPaid

  // Optional partial amount from request — clamp between ₹1 and remaining
  let payNow = remaining
  if (req.body.payAmount) {
    const requested = parseFloat(req.body.payAmount)
    if (isNaN(requested) || requested <= 0) { res.status(400).json({ error: 'Invalid payment amount' }); return }
    payNow = Math.min(requested, remaining)
  }

  const order = await rzp.orders.create({
    amount: Math.round(payNow * 100),  // paise
    currency: 'INR',
    receipt: `maint-${owner.id}-${month}-${year}`.slice(0, 40),
    notes: { ownerId: owner.id, month: String(month), year: String(year), payNow: String(payNow) },
  })

  await prisma.maintenancePayment.upsert({
    where: { ownerId_month_year: { ownerId: owner.id, month, year } },
    create: {
      ownerId: owner.id, flatLabel: owner.flat.label, residentName: owner.name,
      amount: totalDue, paidAmount: alreadyPaid, month, year,
      status: computeStatus(alreadyPaid, totalDue, month, year),
      razorpayOrderId: order.id,
    },
    update: { razorpayOrderId: order.id },
  })

  res.json({
    orderId: order.id,
    amount: order.amount,     // in paise — Razorpay SDK expects paise
    currency: 'INR',
    keyId: process.env.RAZORPAY_KEY_ID,
    prefill: { name: owner.name, email: owner.email, contact: owner.phone },
    payNow,
    remaining,
    totalDue,
    alreadyPaid,
  })
})

// ── Resident: verify & confirm Razorpay payment ───────────────────────────────
router.post('/verify', requireRole('RESIDENT'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    res.status(400).json({ error: 'Missing payment details' }); return
  }

  const secret = process.env.RAZORPAY_KEY_SECRET!
  const expected = crypto.createHmac('sha256', secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex')
  if (expected !== razorpay_signature) { res.status(400).json({ error: 'Invalid payment signature' }); return }

  // Fetch the order from Razorpay to get the authoritative amount paid
  const rzp = getRazorpay()
  if (!rzp) { res.status(503).json({ error: 'Payment gateway not configured' }); return }

  const rzpOrder   = await rzp.orders.fetch(razorpay_order_id)
  const paidInRzp  = Number(rzpOrder.amount) / 100   // paise → rupees

  const record = await prisma.maintenancePayment.findUnique({ where: { razorpayOrderId: razorpay_order_id } })
  if (!record) { res.status(404).json({ error: 'Payment record not found' }); return }

  const newPaid   = record.paidAmount + paidInRzp
  const newStatus = computeStatus(newPaid, record.amount, record.month, record.year)

  const payment = await prisma.maintenancePayment.update({
    where: { razorpayOrderId: razorpay_order_id },
    data: {
      paidAmount: newPaid,
      status: newStatus,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      paidAt: newStatus === 'PAID' ? new Date() : null,
      method: 'online',
    },
  })
  res.json({ success: true, payment, remaining: record.amount - newPaid })
})

// ── Resident: submit UTR (with optional partial amount) ───────────────────────
router.post('/submit-utr', requireRole('RESIDENT'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { utrNumber, amountPaid } = req.body
  if (!utrNumber || String(utrNumber).trim().length < 6) {
    res.status(400).json({ error: 'Please enter a valid transaction reference (UTR)' }); return
  }

  const owner = await prisma.owner.findUnique({ where: { userId: req.user!.id }, include: { flat: true } })
  if (!owner) { res.status(404).json({ error: 'Resident profile not found' }); return }

  const { month, year } = currentMonthYear()
  const AMOUNT   = await getMaintenanceAmount()
  const existing = await prisma.maintenancePayment.findUnique({
    where: { ownerId_month_year: { ownerId: owner.id, month, year } },
  })

  const totalDue    = existing?.amount ?? AMOUNT
  const alreadyPaid = existing?.paidAmount ?? 0
  const payingNow   = amountPaid ? Math.min(parseFloat(amountPaid) || totalDue, totalDue - alreadyPaid) : (totalDue - alreadyPaid)

  const payment = await prisma.maintenancePayment.upsert({
    where: { ownerId_month_year: { ownerId: owner.id, month, year } },
    create: {
      ownerId: owner.id, flatLabel: owner.flat.label, residentName: owner.name,
      amount: totalDue, paidAmount: alreadyPaid, month, year,
      status: computeStatus(alreadyPaid, totalDue, month, year),
      utrNumber: String(utrNumber).trim(),
      method: 'upi',
      note: `UTR submitted — ₹${payingNow} pending admin verification`,
    },
    update: {
      utrNumber: String(utrNumber).trim(),
      method: 'upi',
      note: `UTR submitted — ₹${payingNow} pending admin verification`,
    },
  })
  res.json({ success: true, payment, payingNow })
})

// ── Admin + Accounts: all payments for a month ────────────────────────────────
router.get('/all', requireRole('ADMIN', 'ACCOUNTS'), async (req: AuthRequest, res: Response): Promise<void> => {
  const now = new Date()
  const month = parseInt(req.query.month as string) || now.getMonth() + 1
  const year  = parseInt(req.query.year  as string) || now.getFullYear()

  const [payments, allOwners, AMOUNT] = await Promise.all([
    prisma.maintenancePayment.findMany({
      where: { month, year },
      orderBy: [{ status: 'asc' }, { flatLabel: 'asc' }],
    }),
    prisma.owner.findMany({ include: { flat: true }, orderBy: { flat: { label: 'asc' } } }),
    getMaintenanceAmount(),
  ])

  const recordedOwnerIds = new Set(payments.map(p => p.ownerId))
  const missing = allOwners
    .filter(o => !recordedOwnerIds.has(o.id))
    .map(o => ({
      id: null, ownerId: o.id, flatLabel: o.flat.label, residentName: o.name,
      amount: AMOUNT, paidAmount: 0, month, year,
      status: computeStatus(0, AMOUNT, month, year),
      paidAt: null, method: null, note: null, utrNumber: null, createdAt: null,
    }))

  res.json({ payments: [...payments, ...missing], amount: AMOUNT })
})

// ── Admin + Accounts: summary stats ──────────────────────────────────────────
router.get('/summary', requireRole('ADMIN', 'ACCOUNTS'), async (req: AuthRequest, res: Response): Promise<void> => {
  const now = new Date()
  const month = parseInt(req.query.month as string) || now.getMonth() + 1
  const year  = parseInt(req.query.year  as string) || now.getFullYear()

  const [paid, partial, overdue, pending, waived, totalOwners, AMOUNT, paidAmtAgg, unpaidAgg] = await Promise.all([
    prisma.maintenancePayment.count({ where: { month, year, status: 'PAID' } }),
    prisma.maintenancePayment.count({ where: { month, year, status: 'PARTIAL' } }),
    prisma.maintenancePayment.count({ where: { month, year, status: 'OVERDUE' } }),
    prisma.maintenancePayment.count({ where: { month, year, status: 'PENDING' } }),
    prisma.maintenancePayment.count({ where: { month, year, status: 'WAIVED' } }),
    prisma.owner.count(),
    getMaintenanceAmount(),
    // Total collected = sum of all paidAmount across all records
    prisma.maintenancePayment.aggregate({ where: { month, year }, _sum: { paidAmount: true } }),
    // Outstanding = sum(amount) - sum(paidAmount) for unpaid records
    prisma.maintenancePayment.aggregate({
      where: { month, year, status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } },
      _sum: { amount: true, paidAmount: true },
    }),
  ])

  const collected   = paidAmtAgg._sum.paidAmount ?? 0
  const outstanding = (unpaidAgg._sum.amount ?? 0) - (unpaidAgg._sum.paidAmount ?? 0)
  const unpaidCount = overdue + pending + partial

  res.json({
    month, year, totalOwners, paid, partial, overdue, pending, waived, unpaidCount,
    collected, outstanding, amount: AMOUNT,
  })
})

// ── Admin + Accounts: mark paid / partial paid (cash / bank transfer) ─────────
router.post('/mark-paid', requireRole('ADMIN', 'ACCOUNTS'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { ownerId, month, year, method = 'cash', note, amountPaid } = req.body
  if (!ownerId || !month || !year) { res.status(400).json({ error: 'ownerId, month, year required' }); return }

  const [owner, AMOUNT] = await Promise.all([
    prisma.owner.findUnique({ where: { id: ownerId }, include: { flat: true } }),
    getMaintenanceAmount(),
  ])
  if (!owner) { res.status(404).json({ error: 'Owner not found' }); return }

  const existing = await prisma.maintenancePayment.findUnique({
    where: { ownerId_month_year: { ownerId, month, year } },
  })
  const totalDue    = existing?.amount ?? AMOUNT
  const alreadyPaid = existing?.paidAmount ?? 0

  // If amountPaid is given, add it; otherwise mark the full remaining as paid
  const paying   = amountPaid ? Math.min(parseFloat(amountPaid), totalDue - alreadyPaid) : (totalDue - alreadyPaid)
  const newPaid   = alreadyPaid + paying
  const newStatus = computeStatus(newPaid, totalDue, month, year)

  const payment = await prisma.maintenancePayment.upsert({
    where: { ownerId_month_year: { ownerId, month, year } },
    create: {
      ownerId, flatLabel: owner.flat.label, residentName: owner.name,
      amount: totalDue, paidAmount: newPaid, month, year,
      status: newStatus, paidAt: newStatus === 'PAID' ? new Date() : null, method, note,
    },
    update: {
      paidAmount: newPaid, status: newStatus,
      paidAt: newStatus === 'PAID' ? new Date() : null, method, note,
    },
  })
  res.json(payment)
})

// ── Admin: waive payment ──────────────────────────────────────────────────────
router.post('/waive', requireRole('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { ownerId, month, year, note } = req.body
  if (!ownerId || !month || !year) { res.status(400).json({ error: 'ownerId, month, year required' }); return }

  const [owner, AMOUNT] = await Promise.all([
    prisma.owner.findUnique({ where: { id: ownerId }, include: { flat: true } }),
    getMaintenanceAmount(),
  ])
  if (!owner) { res.status(404).json({ error: 'Owner not found' }); return }

  const payment = await prisma.maintenancePayment.upsert({
    where: { ownerId_month_year: { ownerId, month, year } },
    create: {
      ownerId, flatLabel: owner.flat.label, residentName: owner.name,
      amount: AMOUNT, paidAmount: 0, month, year,
      status: 'WAIVED', paidAt: new Date(), method: 'waived', note,
    },
    update: { status: 'WAIVED', method: 'waived', note },
  })
  res.json(payment)
})

// ── Admin: generate records for all owners for a month ────────────────────────
router.post('/generate', requireRole('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { month, year } = req.body
  if (!month || !year) { res.status(400).json({ error: 'month and year required' }); return }

  const [owners, AMOUNT] = await Promise.all([
    prisma.owner.findMany({ include: { flat: true } }),
    getMaintenanceAmount(),
  ])
  const status = computeStatus(0, AMOUNT, month, year)

  const created = await Promise.all(
    owners.map(o =>
      prisma.maintenancePayment.upsert({
        where: { ownerId_month_year: { ownerId: o.id, month, year } },
        create: {
          ownerId: o.id, flatLabel: o.flat.label, residentName: o.name,
          amount: AMOUNT, paidAmount: 0, month, year, status,
        },
        update: {},
      })
    )
  )
  res.json({ generated: created.length, month, year })
})

// ── Admin: update maintenance fee + update all unpaid records ─────────────────
// (handled in admin.ts — kept here for reference)

const MONTHS_SHORT = ['January','February','March','April','May','June','July','August','September','October','November','December']

// ── Admin + Accounts: notify one resident ─────────────────────────────────────
router.post('/notify/:ownerId', requireRole('ADMIN', 'ACCOUNTS'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { ownerId } = req.params
  const { month, year } = currentMonthYear()

  const payment = await prisma.maintenancePayment.findUnique({
    where: { ownerId_month_year: { ownerId, month, year } },
  })
  if (!payment || payment.status === 'PAID' || payment.status === 'WAIVED') {
    res.status(400).json({ error: 'No outstanding payment for this resident' }); return
  }

  const remaining = payment.amount - payment.paidAmount
  await prisma.residentNotification.create({
    data: {
      ownerId,
      title: '⚠️ Maintenance Payment Due',
      body: `₹${remaining.toLocaleString('en-IN')} remaining for ${MONTHS_SHORT[month - 1]} ${year}. Please pay via the app.`,
      type: 'payment_reminder',
    },
  })
  res.json({ success: true })
})

// ── Admin + Accounts: notify all overdue ─────────────────────────────────────
router.post('/notify-all', requireRole('ADMIN', 'ACCOUNTS'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { month, year } = currentMonthYear()

  const unpaid = await prisma.maintenancePayment.findMany({
    where: { month, year, status: { in: ['OVERDUE', 'PARTIAL', 'PENDING'] } },
  })
  if (unpaid.length === 0) { res.json({ success: true, count: 0 }); return }

  await prisma.residentNotification.createMany({
    data: unpaid.map(p => ({
      ownerId: p.ownerId,
      title: '⚠️ Maintenance Payment Due',
      body: `₹${(p.amount - p.paidAmount).toLocaleString('en-IN')} remaining for ${MONTHS_SHORT[month - 1]} ${year}. Please pay via the app.`,
      type: 'payment_reminder',
    })),
  })
  res.json({ success: true, count: unpaid.length })
})

export default router
