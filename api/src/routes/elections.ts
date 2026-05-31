import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/', async (_req, res: Response): Promise<void> => {
  const elections = await prisma.election.findMany({
    include: {
      candidates: { include: { user: { select: { name: true } } } },
      _count: { select: { votes: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json(elections)
})

router.post('/', requireRole('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, description, nominationStart, nominationEnd, votingStart, votingEnd } = req.body
  const election = await prisma.election.create({
    data: { title, description, nominationStart, nominationEnd, votingStart, votingEnd, status: 'DRAFT' },
  })
  res.status(201).json(election)
})

router.get('/:id', async (req, res: Response): Promise<void> => {
  const election = await prisma.election.findUnique({
    where: { id: req.params.id },
    include: {
      candidates: {
        include: {
          user: { select: { name: true, id: true } },
          _count: { select: { votes: true } },
        },
      },
      _count: { select: { votes: true } },
    },
  })
  if (!election) { res.status(404).json({ error: 'Not found' }); return }
  res.json(election)
})

router.patch('/:id', requireRole('ADMIN'), async (req, res: Response): Promise<void> => {
  const { status } = req.body
  const election = await prisma.election.update({ where: { id: req.params.id }, data: { status } })
  res.json(election)
})

// Nominate self
router.post('/:id/candidates', async (req: AuthRequest, res: Response): Promise<void> => {
  const election = await prisma.election.findUnique({ where: { id: req.params.id } })
  if (!election || election.status !== 'NOMINATIONS_OPEN') {
    res.status(400).json({ error: 'Nominations are not open' }); return
  }

  const { position, bio } = req.body
  const existing = await prisma.candidate.findFirst({
    where: { electionId: req.params.id, userId: req.user!.id, position },
  })
  if (existing) { res.status(409).json({ error: 'Already nominated for this position' }); return }

  const candidate = await prisma.candidate.create({
    data: { electionId: req.params.id, userId: req.user!.id, position, bio, approved: false },
    include: { user: { select: { name: true } } },
  })
  res.status(201).json(candidate)
})

// Approve / reject candidate
router.patch('/:id/candidates/:candidateId', requireRole('ADMIN'), async (req, res: Response): Promise<void> => {
  const { approved } = req.body
  const candidate = await prisma.candidate.update({
    where: { id: req.params.candidateId },
    data: { approved },
    include: { user: { select: { name: true } } },
  })
  res.json(candidate)
})

// Cast vote
router.post('/:id/vote', async (req: AuthRequest, res: Response): Promise<void> => {
  const election = await prisma.election.findUnique({ where: { id: req.params.id } })
  if (!election || election.status !== 'VOTING_OPEN') {
    res.status(400).json({ error: 'Voting is not open' }); return
  }

  const owner = await prisma.owner.findUnique({ where: { userId: req.user!.id } })
  if (!owner) { res.status(403).json({ error: 'Only flat owners can vote' }); return }

  const { votes } = req.body as { votes: { candidateId: string }[] }
  if (!Array.isArray(votes) || votes.length === 0) {
    res.status(400).json({ error: 'No votes provided' }); return
  }

  const existingVotes = await prisma.vote.findMany({
    where: { electionId: req.params.id, flatId: owner.flatId },
    include: { candidate: { select: { position: true } } },
  })
  const votedPositions = new Set(existingVotes.map(v => v.candidate.position))

  const toCreate = []
  for (const v of votes) {
    const candidate = await prisma.candidate.findUnique({ where: { id: v.candidateId } })
    if (!candidate?.approved) {
      res.status(400).json({ error: `Candidate not found or not approved` }); return
    }
    if (votedPositions.has(candidate.position)) {
      res.status(409).json({ error: `Already voted for: ${candidate.position}` }); return
    }
    toCreate.push({ electionId: req.params.id, candidateId: v.candidateId, voterId: req.user!.id, flatId: owner.flatId })
  }

  await prisma.vote.createMany({ data: toCreate })
  res.json({ message: 'Vote cast successfully' })
})

export default router
