# ATS Resume Parser

LLM-powered ATS with PostgreSQL, recruiter auth, job matching, and Vercel deployment.

## Features

- Resume parsing (Gemini) → structured DB records
- Recruiter login (NextAuth)
- Candidates CRUD, search, CSV export
- Job descriptions + fit-score ranking
- Credibility scoring + project review
- Audit trail (with user attribution)
- PostgreSQL (local Docker or cloud Neon/Supabase)
- Vercel-ready deployment

## Quick start (local)

### 1. Start PostgreSQL

**Option A — Docker (recommended locally)**

```bash
docker compose up -d
```

**Option B — Free cloud DB ([Neon](https://neon.tech) or [Supabase](https://supabase.com))**

Copy the connection string into `.env` as `DATABASE_URL`.

### 2. Configure environment

```bash
copy .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://ats:ats@localhost:5432/ats"
NEXTAUTH_SECRET="your-random-secret-at-least-32-chars"
NEXTAUTH_URL="http://localhost:3000"
GEMINI_API_KEY="your-key"
RECRUITER_EMAIL="recruiter@ats.local"
RECRUITER_PASSWORD="recruiter123"
```

Generate a secret: `openssl rand -base64 32` (or any random 32+ char string).

### 3. Install & setup DB

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

Open http://localhost:3000 → you'll be redirected to **/login**.

Default credentials (from seed):
- Email: `recruiter@ats.local`
- Password: `recruiter123`

## Pages

| Route | Description |
|-------|-------------|
| `/login` | Recruiter sign-in |
| `/` | Parse resumes |
| `/candidates` | Search & export |
| `/candidates/[id]` | Profile, edit, review |
| `/pipeline` | Recruitment kanban (drag & drop stages) |
| `/jobs` | Job descriptions |
| `/dashboard` | Rankings by fit score |
| `/audit` | Action history |

## Recruitment pipeline stages

| Stage | Meaning |
|-------|---------|
| Applied | Resume received / parsed |
| Screening | Resume review |
| Phone Screen | Initial call |
| Technical | Tech interview / assessment |
| Onsite / Final | Final rounds |
| Offer | Offer extended |
| Hired | Accepted |
| Rejected | Not proceeding |

Use **`/pipeline`** to drag candidates between stages or change stage from the card dropdown.

## Database

| | |
|---|---|
| **Engine** | PostgreSQL |
| **Local** | Docker (`docker compose up -d`) |
| **Cloud** | Neon, Supabase, Railway |
| **Browse** | `npx prisma studio` |

> SQLite (`prisma/dev.db`) was replaced by PostgreSQL for production compatibility.

## Deploy to Vercel

### 1. Push code to GitHub

### 2. Create a PostgreSQL database

Use [Neon](https://neon.tech) (free) → copy the **pooled** connection string.

### 3. Import project in [Vercel](https://vercel.com)

### 4. Set environment variables in Vercel dashboard

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `postgresql://...?sslmode=require` |
| `NEXTAUTH_SECRET` | random 32+ char string |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` |
| `GEMINI_API_KEY` | your Gemini key |
| `GEMINI_MODEL` | `gemini-2.5-flash-lite` |
| `RECRUITER_EMAIL` | your login email |
| `RECRUITER_PASSWORD` | your login password |
| `RECRUITER_NAME` | Recruiter |

### 5. Deploy

Vercel runs `vercel-build` which:
1. Generates Prisma client
2. Pushes schema to PostgreSQL
3. Seeds the recruiter account
4. Builds Next.js

After deploy, visit your URL → login with `RECRUITER_EMAIL` / `RECRUITER_PASSWORD`.

## API (auth required)

All routes except `/api/auth/*` require a logged-in session.

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/parse-resume` | Parse + save |
| GET | `/api/candidates` | List / search |
| GET | `/api/candidates?export=csv` | Export CSV |
| GET/PATCH/DELETE | `/api/candidates/[id]` | CRUD |
| GET/POST | `/api/jobs` | Jobs |
| POST | `/api/jobs/[id]` | Run matching |
| GET | `/api/dashboard?jobId=` | Metrics + rankings for job (omit `jobId` for metrics only) |
| GET | `/api/audit` | Audit log |

## Scripts

```bash
npm run dev          # Dev server
npm run db:push      # Sync schema to DB
npm run db:seed      # Create/update recruiter
npx prisma studio    # Visual DB browser
docker compose up -d # Start local Postgres
```

Sample resumes: `../ATS_Resume_Examples/`
