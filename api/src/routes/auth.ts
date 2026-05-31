import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password required' })
    return
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }
  if (user.registrationStatus !== 'APPROVED') {
    res.status(403).json({ error: 'Account pending approval' })
    return
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  )

  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } })
})

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  password: z.string().min(8),
  flatId: z.string().min(1),
})

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    return
  }

  const { name, email, phone, password, flatId } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    res.status(409).json({ error: 'Email already registered' })
    return
  }

  const flat = await prisma.flat.findUnique({ where: { id: flatId } })
  if (!flat) {
    res.status(404).json({ error: 'Flat not found' })
    return
  }

  const existingOwner = await prisma.owner.findUnique({ where: { flatId } })
  if (existingOwner) {
    res.status(409).json({ error: 'This flat already has a registered owner' })
    return
  }

  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: {
      name, email, phone, password: hashed,
      role: 'RESIDENT',
      registrationStatus: 'PENDING',
      owner: { create: { name, phone, email, flatId } },
    },
  })

  res.status(201).json({ id: user.id, message: 'Registration submitted. Awaiting approval.' })
})

router.get('/me', authenticate, (req: AuthRequest, res: Response): void => {
  res.json(req.user)
})

export default router
