import { PrismaClient, FacilityType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// 70 resident names — 14 per floor (realistic Indian names)
const RESIDENT_NAMES = [
  // Floor 1 — 101 to 114
  'Aarav Sharma',     'Priya Verma',       'Rahul Kumar',      'Anjali Singh',
  'Vikram Patel',     'Meera Gupta',       'Suresh Reddy',     'Kavya Nair',
  'Arjun Iyer',       'Sunita Mehta',      'Ramesh Joshi',     'Deepa Shah',
  'Kiran Pillai',     'Mohan Rao',
  // Floor 2 — 201 to 214
  'Lakshmi Devi',     'Sanjay Chandra',    'Pooja Malhotra',   'Aditya Bose',
  'Nisha Tiwari',     'Ravi Krishnan',     'Ananya Sinha',     'Manoj Pandey',
  'Swati Bajaj',      'Rajesh Kapoor',     'Geeta Trivedi',    'Amit Saxena',
  'Divya Aggarwal',   'Nikhil Jain',
  // Floor 3 — 301 to 314
  'Varun Bhatt',      'Radha Murthy',      'Prakash Kaur',     'Sandhya Yadav',
  'Vivek Mishra',     'Usha Naik',         'Harish Goel',      'Madhuri Shetty',
  'Sachin Patil',     'Rekha Bansal',      'Ajay Khanna',      'Shilpa Dubey',
  'Rohit Rastogi',    'Neha Agarwal',
  // Floor 4 — 401 to 414
  'Tarun Mathur',     'Vijaya Kulkarni',   'Srinivas Rao',     'Leela Nambiar',
  'Dinesh Ghosh',     'Archana Desai',     'Gaurav Dixit',     'Smita Hegde',
  'Sunil Thakur',     'Padma Venkat',      'Rajiv Bhatia',     'Nalini Swamy',
  'Hemant Tyagi',     'Chandrika Menon',
  // Floor 5 — 501 to 514
  'Ashok Wagle',      'Vimala Kamath',     'Girish Pawar',     'Savita Deshpande',
  'Naveen Chettiar',  'Kamala Subramaniam','Suresh Nayak',     'Bhavna Parikh',
  'Devesh Lal',       'Sudha Narayan',     'Prabhu Pillai',    'Indira Gopal',
  'Murali Chatterjee','Yashodha Bhat',
]

async function main() {
  console.log('Clearing existing data…')

  // Clear all tables in dependency order
  await prisma.vote.deleteMany()
  await prisma.candidate.deleteMany()
  await prisma.election.deleteMany()
  await prisma.maintenanceRequest.deleteMany()
  await prisma.visitor.deleteMany()
  await prisma.vehicle.deleteMany()
  await prisma.emergencyContact.deleteMany()
  await prisma.owner.deleteMany()
  await prisma.user.deleteMany()
  await prisma.flat.deleteMany()
  await prisma.facility.deleteMany()

  console.log('  ✓ Database cleared\n')

  // ── 1. Create 70 flats (numeric labels 101–514) ─────────────────────────
  const flats: { id: string; floor: number; number: number; label: string }[] = []
  for (let floor = 1; floor <= 5; floor++) {
    for (let num = 1; num <= 14; num++) {
      const label = String(floor * 100 + num)
      const flat = await prisma.flat.create({
        data: { floor, number: num, label, status: 'OCCUPIED' },
      })
      flats.push(flat)
    }
  }
  console.log('  ✓ 70 flats created: 101–114, 201–214, 301–314, 401–414, 501–514')

  // ── 2. Facilities ────────────────────────────────────────────────────────
  const facilities = [
    { name: 'Main Lift',            type: FacilityType.LIFT,      location: 'Central lobby' },
    { name: 'Secondary Lift',       type: FacilityType.LIFT,      location: 'East wing' },
    { name: 'Gymnasium',            type: FacilityType.GYM,       location: 'Ground floor' },
    { name: 'Parking Area',         type: FacilityType.PARKING,   location: 'Basement' },
    { name: "Children's Play Area", type: FacilityType.PLAY_AREA, location: 'Terrace' },
  ]
  for (const f of facilities) {
    await prisma.facility.create({ data: f })
  }
  console.log('  ✓ 5 facilities created')

  // ── 3. Admin user ─────────────────────────────────────────────────────────
  const adminPwd = await bcrypt.hash('admin@123', 10)
  await prisma.user.create({
    data: {
      name: 'Society Admin',
      email: 'admin@luxorhomes.in',
      password: adminPwd,
      role: 'ADMIN',
      registrationStatus: 'APPROVED',
    },
  })
  console.log('  ✓ Admin  : admin@luxorhomes.in  /  admin@123')

  // ── 4. Security user ──────────────────────────────────────────────────────
  const secPwd = await bcrypt.hash('security@123', 10)
  await prisma.user.create({
    data: {
      name: 'Gate Security',
      email: 'security@luxorhomes.in',
      password: secPwd,
      role: 'SECURITY',
      registrationStatus: 'APPROVED',
    },
  })
  console.log('  ✓ Security: security@luxorhomes.in  /  security@123')

  // ── 5. 70 resident owners (one per flat) ──────────────────────────────────
  const resPwd = await bcrypt.hash('resident@123', 10)

  for (let i = 0; i < flats.length; i++) {
    const flat   = flats[i]
    const name   = RESIDENT_NAMES[i]
    const slug   = name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g, '')
    const email  = `${slug}@luxorhomes.in`
    // Phones: 9800000101, 9800000102 … 9800000514
    const phone  = `98000${flat.label}`

    await prisma.user.create({
      data: {
        name,
        email,
        password: resPwd,
        role: 'RESIDENT',
        registrationStatus: 'APPROVED',
        phone,
        owner: {
          create: { name, email, phone, flatId: flat.id },
        },
      },
    })
  }
  console.log('  ✓ 70 resident owners created  (password: resident@123)')

  console.log('\n✅ Seed complete!')
  console.log('──────────────────────────────────────────────────')
  console.log('  Admin   : admin@luxorhomes.in     / admin@123')
  console.log('  Security: security@luxorhomes.in  / security@123')
  console.log('  Residents e.g.: aarav.sharma@luxorhomes.in / resident@123')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
