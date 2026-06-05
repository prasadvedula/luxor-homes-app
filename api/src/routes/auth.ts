import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { phone, email, password } = req.body

  if ((!phone && !email) || !password) {
    res.status(400).json({ error: 'Mobile number and password required' })
    return
  }

  // Residents log in by phone; admin/security can use email as fallback
  let user = phone
    ? await prisma.user.findUnique({ where: { phone: String(phone).trim() } })
    : null

  if (!user && email) {
    user = await prisma.user.findUnique({ where: { email: String(email).trim().toLowerCase() } })
  }

  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  // Family members (isPrimaryResident=false) are auto-approved — only check primary residents
  if (user.isPrimaryResident && user.registrationStatus !== 'APPROVED') {
    res.status(403).json({ error: 'Account pending approval' })
    return
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  const token = jwt.sign(
    { id: user.id, phone: user.phone, role: user.role, name: user.name, isPrimaryResident: user.isPrimaryResident },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  )

  res.json({ token, user: { id: user.id, name: user.name, phone: user.phone, email: user.email, role: user.role, isPrimaryResident: user.isPrimaryResident } })
})

const registerSchema = z.object({
  name:     z.string().min(2),
  phone:    z.string().min(10),
  email:    z.string().email().optional().or(z.literal('')),
  password: z.string().min(8),
  flatId:   z.string().min(1),
})

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    return
  }

  const { name, phone, email, password, flatId } = parsed.data
  const cleanPhone = phone.trim()
  const cleanEmail = email?.trim().toLowerCase() || null

  const existingPhone = await prisma.user.findUnique({ where: { phone: cleanPhone } })
  if (existingPhone) {
    res.status(409).json({ error: 'Mobile number already registered' })
    return
  }

  if (cleanEmail) {
    const existingEmail = await prisma.user.findUnique({ where: { email: cleanEmail } })
    if (existingEmail) {
      res.status(409).json({ error: 'Email already registered' })
      return
    }
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
      name,
      phone: cleanPhone,
      email: cleanEmail,
      password: hashed,
      role: 'RESIDENT',
      registrationStatus: 'PENDING',
      isPrimaryResident: true,
      owner: { create: { name, phone: cleanPhone, email: cleanEmail ?? '', flatId } },
    },
  })

  res.status(201).json({ id: user.id, message: 'Registration submitted. Awaiting approval.' })
})

router.get('/me', authenticate, (req: AuthRequest, res: Response): void => {
  res.json(req.user)
})

export default router
