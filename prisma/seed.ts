import { PrismaClient, FacilityType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database…')

  // 1. Seed 70 flats — 5 floors × 14 per floor
  const letters = 'ABCDEFGHIJKLN'
  for (let floor = 1; floor <= 5; floor++) {
    for (let num = 1; num <= 14; num++) {
      const label = `${floor}${letters[num - 1]}`
      await prisma.flat.upsert({
        where: { label },
        update: {},
        create: { floor, number: num, label, status: 'OCCUPIED' },
      })
    }
  }
  console.log('  ✓ 70 flats seeded')

  // 2. Seed facilities
  const facilities = [
    { name: 'Main Lift', type: FacilityType.LIFT, location: 'Central lobby' },
    { name: 'Secondary Lift', type: FacilityType.LIFT, location: 'East wing' },
    { name: 'Gymnasium', type: FacilityType.GYM, location: 'Ground floor' },
    { name: 'Parking Area', type: FacilityType.PARKING, location: 'Basement' },
    { name: "Children's Play Area", type: FacilityType.PLAY_AREA, location: 'Terrace' },
  ]
  for (const f of facilities) {
    await prisma.facility.upsert({
      where: { name: f.name },
      update: {},
      create: f,
    })
  }
  console.log('  ✓ Facilities seeded')

  // 3. Admin user
  const adminPassword = await bcrypt.hash('admin@123', 10)
  await prisma.user.upsert({
    where: { email: 'admin@luxorhomes.in' },
    update: {},
    create: {
      name: 'Society Admin',
      email: 'admin@luxorhomes.in',
      password: adminPassword,
      role: 'ADMIN',
      registrationStatus: 'APPROVED',
    },
  })
  console.log('  ✓ Admin: admin@luxorhomes.in / admin@123')

  // 4. Security user
  const secPassword = await bcrypt.hash('security@123', 10)
  await prisma.user.upsert({
    where: { email: 'security@luxorhomes.in' },
    update: {},
    create: {
      name: 'Gate Security',
      email: 'security@luxorhomes.in',
      password: secPassword,
      role: 'SECURITY',
      registrationStatus: 'APPROVED',
    },
  })
  console.log('  ✓ Security: security@luxorhomes.in / security@123')

  console.log('\nSeed complete!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
