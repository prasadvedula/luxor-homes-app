# Luxor Homes — Deployment Guide

> Complete steps to go from a code change to a live production update across all surfaces:
> API (Railway), Web UI (Vercel), Database (PostgreSQL on Railway), and Android APK.

---

## Prerequisites

| Tool | Install / Login |
|---|---|
| Git | `git --version` |
| Node.js ≥ 18 | `node --version` |
| Railway CLI | `npm i -g @railway/cli` → `railway login` |
| Vercel CLI | `npm i -g vercel` → `vercel login` |
| Android Studio | Required only for APK builds |
| Java JDK ≥ 17 | Required only for APK builds |

Check everything is ready:

```bash
git --version
railway whoami        # should show your email
vercel whoami         # should show your email
railway status        # should show: Project: luxor-homes-api
```

---

## Step 1 — Make Code Changes

Work in the appropriate sub-directory:

| What changed | Directory |
|---|---|
| Database schema | `prisma/schema.prisma` |
| REST API routes | `api/src/routes/` |
| Web / Mobile UI | `ui/app/` · `ui/components/` |
| Global styles | `ui/app/globals.css` |
| Auth / middleware | `ui/proxy.ts` · `ui/lib/auth.config.ts` |

**Local dev servers** (run in separate terminals):

```bash
# Terminal 1 — API
cd api
npm run dev
# Starts Express on http://localhost:4000

# Terminal 2 — UI
cd ui
npm run dev
# Starts Next.js on http://localhost:3000
```

**TypeScript check before committing:**

```bash
cd ui && npx tsc --noEmit     # UI
cd api && npx tsc --noEmit    # API
```

---

## Step 2 — Push to Git

Stage only the files you changed (avoid committing temp scripts or `.env`):

```bash
# Stage specific files
git add api/src/routes/admin.ts
git add api/src/routes/auth.ts
git add prisma/schema.prisma
git add "ui/app/(app)/visitors/page.tsx"
git add ui/components/layout/sidebar.tsx
git add ui/proxy.ts
# ... add remaining changed files

# Commit
git commit -m "feat: describe what changed"

# Push — triggers Railway and Vercel auto-deploy
git push origin master
```

> **Note:** Paths containing parentheses like `ui/app/(app)/` must be quoted in PowerShell.

**Verify the push:**

```bash
git log --oneline -3
```

---

## Step 3 — Build APK

The Android APK is a Capacitor wrapper that loads the live Railway URL.
**Rebuild the APK only when:**
- The Capacitor config (`ui/capacitor.config.ts`) changes (e.g., server URL)
- Native Android assets change (icons, splash screen, permissions)
- A new Capacitor plugin is added

### 3a — Sync web assets into Android project

```bash
cd ui
npm run build          # builds Next.js → out/
npx cap sync android   # copies web assets + updates plugins
```

### 3b — Build the release APK

```bash
cd ui/android
./gradlew assembleRelease
```

The signed APK is output to:
```
ui/android/app/build/outputs/apk/release/app-release.apk
```

### 3c — Copy APK to Railway download folder and commit

```bash
copy ui\android\app\build\outputs\apk\release\app-release.apk api\public\download\luxor-homes.apk

git add api/public/download/luxor-homes.apk
git commit -m "build: update APK"
git push origin master
```

The APK is served by the Express API as a static file at:
```
https://luxor-homes-api-production.up.railway.app/download/luxor-homes.apk
```

> **No separate upload needed.** Railway serves the APK directly from git via `express.static`.

---

## Step 4 — Vercel UI Build

Vercel automatically triggers a production build on every push to `master`.

**Monitor the build:**

```bash
vercel logs --follow --project ui
```

Or watch it in the Vercel dashboard:
```
https://vercel.com/prasadvedula-1246s-projects/ui
```

**Production URL:** `https://ui-psi-sepia.vercel.app`

**To trigger a manual redeploy without a code change:**

```bash
cd ui
vercel --prod
```

**If environment variables change on Vercel**, redeploy to pick them up:

```bash
vercel --prod --force
```

---

## Step 5 — Deploy on Railway

Railway automatically redeploys the API service on every push to `master`.

### 5a — Monitor the deployment

```bash
railway status
railway logs --tail
```

Or in the Railway dashboard:
```
https://railway.app/project/84111110-e536-4423-96f6-c158f04f04d9
```

**Production URL:** `https://luxor-homes-api-production.up.railway.app`

### 5b — Push Prisma schema (run when `schema.prisma` changes)

The internal Railway database is not reachable from your local machine.
Use the **public proxy URL** to push schema changes:

```bash
# Get the public DB URL (run once to find it)
railway variables --service Postgres --json

# Push schema using the public URL
$env:DATABASE_URL="postgresql://postgres:<PASSWORD>@acela.proxy.rlwy.net:57120/railway"
cd c:\luxor-homes-app
npx prisma db push --schema prisma/schema.prisma --accept-data-loss
```

**Current public DATABASE_URL:**
```
postgresql://postgres:eVENTVlBporYkNbxeahAnxsbCUGvbjAh@acela.proxy.rlwy.net:57120/railway
```

> The `--accept-data-loss` flag is safe here because we only add nullable/defaulted columns.
> Never use it when removing or renaming columns in production.

### 5c — Trigger a manual redeploy (if needed)

```bash
railway up --service luxor-homes-api
```

### 5d — Verify the API is healthy

```bash
curl https://luxor-homes-api-production.up.railway.app/health
# Expected: {"status":"ok","service":"luxor-homes-api"}
```

---

## Quick Reference — Full Deployment Checklist

```
[ ] 1. Make code changes and test locally
[ ] 2. Run: npx tsc --noEmit  (in both api/ and ui/)
[ ] 3. git add <files>
[ ] 4. git commit -m "feat/fix/build: ..."
[ ] 5. git push origin master
         → Vercel build starts automatically
         → Railway redeploy starts automatically
[ ] 6. If schema.prisma changed:
         → Run prisma db push with public DATABASE_URL
[ ] 7. If APK needs a rebuild:
         → cd ui && npm run build && npx cap sync android
         → cd ui/android && ./gradlew assembleRelease
         → Copy APK → api/public/download/luxor-homes.apk
         → git add + commit + push
[ ] 8. Verify:
         → curl https://luxor-homes-api-production.up.railway.app/health
         → Open https://ui-psi-sepia.vercel.app
         → Download https://luxor-homes-api-production.up.railway.app/download/luxor-homes.apk
```

---

## Service URLs

| Service | URL |
|---|---|
| API (Railway) | https://luxor-homes-api-production.up.railway.app |
| Web UI (Vercel) | https://ui-psi-sepia.vercel.app |
| APK Download | https://luxor-homes-api-production.up.railway.app/download/luxor-homes.apk |
| Railway Dashboard | https://railway.app/project/84111110-e536-4423-96f6-c158f04f04d9 |
| Vercel Dashboard | https://vercel.com/prasadvedula-1246s-projects/ui |
| Git Repository | https://github.com/prasadvedula/luxor-homes-app |

---

## Troubleshooting

### Railway build fails
```bash
railway logs --tail --service luxor-homes-api
```
Most common cause: TypeScript errors in `api/src/`. Run `npx tsc --noEmit` in `api/` locally first.

### Vercel build fails
```bash
vercel logs --project ui
```
Most common cause: TypeScript errors or missing env vars. Check `ui/.env.local` matches Vercel env vars.

### Database schema out of sync
```bash
# Check what's in the DB vs schema
$env:DATABASE_URL="postgresql://postgres:eVENTVlBporYkNbxeahAnxsbCUGvbjAh@acela.proxy.rlwy.net:57120/railway"
npx prisma db push --schema prisma/schema.prisma
```

### APK won't install on device
- Enable "Install from unknown sources" in Android Settings
- Uninstall the old version first if the signing key changed

### Prisma can't reach Railway internally
- Use `DATABASE_PUBLIC_URL` (the `acela.proxy.rlwy.net` address), not `DATABASE_URL` (internal hostname)
- Internal hostname `postgres.railway.internal` only works from inside Railway's network
