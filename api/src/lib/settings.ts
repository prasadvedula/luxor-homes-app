import { prisma } from './prisma'

const DEFAULT_AMOUNT = parseFloat(process.env.MAINTENANCE_AMOUNT || '2500')

export async function getMaintenanceAmount(): Promise<number> {
  const s = await prisma.setting.findUnique({ where: { key: 'maintenance_amount' } })
  return s ? parseFloat(s.value) : DEFAULT_AMOUNT
}

export async function setMaintenanceAmount(amount: number): Promise<void> {
  await prisma.setting.upsert({
    where: { key: 'maintenance_amount' },
    create: { key: 'maintenance_amount', value: String(amount) },
    update: { value: String(amount) },
  })
}
