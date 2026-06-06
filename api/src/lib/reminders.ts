import cron from 'node-cron'
import { prisma } from './prisma'
import { sendMaintenanceReminder } from './mailer'
import { getMaintenanceAmount } from './settings'

async function ensureMonthRecords(month: number, year: number) {
  const [owners, AMOUNT] = await Promise.all([
    prisma.owner.findMany({ include: { flat: true } }),
    getMaintenanceAmount(),
  ])
  const dueDate = new Date(year, month - 1, 5, 23, 59, 59)
  const status = new Date() > dueDate ? 'OVERDUE' : 'PENDING'

  await Promise.all(owners.map(o =>
    prisma.maintenancePayment.upsert({
      where: { ownerId_month_year: { ownerId: o.id, month, year } },
      create: {
        ownerId: o.id, flatLabel: o.flat.label, residentName: o.name,
        amount: AMOUNT, month, year, status,
      },
      update: {},
    })
  ))
}

async function sendMonthlyReminders(type: 'monthly' | 'overdue') {
  const now = new Date()
  const month = now.getMonth() + 1
  const year  = now.getFullYear()

  await ensureMonthRecords(month, year)

  // Find all unpaid/overdue records with owner email
  const unpaid = await prisma.maintenancePayment.findMany({
    where: { month, year, status: { in: ['PENDING', 'OVERDUE'] } },
    include: { owner: true },
  })

  let sent = 0
  for (const p of unpaid) {
    if (!p.owner.email) continue
    try {
      await sendMaintenanceReminder({
        to: p.owner.email,
        name: p.owner.name,
        flat: p.flatLabel,
        amount: p.amount,
        month, year, type,
      })
      await prisma.maintenancePayment.update({
        where: { id: p.id },
        data: { reminderSentAt: new Date() },
      })
      sent++
    } catch (err) {
      console.error(`[REMINDER] Failed to send to ${p.owner.email}:`, err)
    }
  }

  // Update PENDING → OVERDUE after due date passes
  if (type === 'overdue') {
    await prisma.maintenancePayment.updateMany({
      where: { month, year, status: 'PENDING' },
      data: { status: 'OVERDUE' },
    })
  }

  console.log(`[REMINDER] ${type} run complete — ${sent}/${unpaid.length} emails sent`)
}

async function sendDailyOverdueReminders() {
  const now = new Date()
  const month = now.getMonth() + 1
  const year  = now.getFullYear()

  // Only send daily reminders after the 5th
  if (now.getDate() <= 5) return

  const overdue = await prisma.maintenancePayment.findMany({
    where: { month, year, status: 'OVERDUE' },
    include: { owner: true },
  })

  let sent = 0
  for (const p of overdue) {
    if (!p.owner.email) continue
    try {
      await sendMaintenanceReminder({
        to: p.owner.email,
        name: p.owner.name,
        flat: p.flatLabel,
        amount: p.amount,
        month, year, type: 'overdue',
      })
      sent++
    } catch { /* continue */ }
  }
  console.log(`[REMINDER] Daily overdue run — ${sent}/${overdue.length} emails sent`)
}

export function startReminders() {
  // 1st of every month at 9:00 AM — generate records + send first reminder
  cron.schedule('0 9 1 * *', () => {
    console.log('[CRON] 1st of month reminder fired')
    sendMonthlyReminders('monthly').catch(console.error)
  }, { timezone: 'Asia/Kolkata' })

  // 5th of every month at 9:00 AM — last chance + mark overdue
  cron.schedule('0 9 5 * *', () => {
    console.log('[CRON] 5th of month reminder fired')
    sendMonthlyReminders('overdue').catch(console.error)
  }, { timezone: 'Asia/Kolkata' })

  // Daily at 8:00 AM — overdue reminders (from 6th onwards)
  cron.schedule('0 8 * * *', () => {
    console.log('[CRON] Daily overdue reminder fired')
    sendDailyOverdueReminders().catch(console.error)
  }, { timezone: 'Asia/Kolkata' })

  console.log('[CRON] Maintenance payment reminders scheduled')
}
