# Luxor Homes — Society Management App

Apartment society management platform for **Luxor Homes** (70 flats, 5 floors).

## Structure

```
luxor-homes-app/
├── api/   Express.js + TypeScript REST API (port 4000)
└── ui/    Next.js 15 frontend (port 3000)
```

## Features
- **Resident Directory** — flat owners, emergency contacts, vehicles
- **Society Elections** — nominations, voting (1 vote per flat), results
- **Maintenance Tracking** — lifts, gym, parking, play area
- **Visitor Management** — security logs, resident approval, entry/exit

## Roles
| Role | Capabilities |
|------|-------------|
| Admin | Full access, approves users, manages elections |
| Resident | Self-registers, views their flat, votes, approves visitors |
| Security | Logs visitors, marks check-in/out |

## Quick Start

### 1. Set up the API
```bash
cd api
cp .env.example .env          # fill in DATABASE_URL and JWT_SECRET
npm install
npm run db:push               # apply schema to PostgreSQL
npm run db:seed               # seed 70 flats, facilities, admin user
npm run dev                   # http://localhost:4000
```

### 2. Set up the UI
```bash
cd ui
# edit .env.local — set API_URL and NEXT_PUBLIC_API_URL to http://localhost:4000
npm install
npm run dev                   # http://localhost:3000
```

### Root convenience scripts
```bash
npm run dev:api    # start backend
npm run dev:ui     # start frontend
npm run db:seed    # seed via api/
```

## Default Credentials (after seed)
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@luxorhomes.in | admin@123 |
| Security | security@luxorhomes.in | security@123 |

Residents self-register at `/register` and require admin approval.
