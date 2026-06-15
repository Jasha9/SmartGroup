# SmartGroup

SmartGroup is an AI-powered student collaboration platform that helps teams plan work, track accountability, and complete group projects with transparency.

## Project Summary

SmartGroup provides:
- Google-based sign-in and session auth
- Group and member management
- AI-assisted task planning
- Task lifecycle management (status, subtasks, comments, change requests)
- Team contribution tracking and insights
- Charter and notification workflows

Tech stack:
- Frontend: Next.js (App Router), React, Tailwind CSS
- Backend: Node.js, Express
- Database: PostgreSQL
- AI: OpenAI API

## Repository Structure

```text
SmartGroup/
  client/   # Next.js frontend
  server/   # Express API backend
  DEPLOYMENT.md
  TECHNICAL_IMPLEMENTATION.md
```

## Prerequisites

- Node.js 18+
- npm 9+
- PostgreSQL 14+
- Google OAuth Client ID
- OpenAI API key (for AI features)

## Environment Variables

### Backend (`server/.env`)

Start from `server/.env.example`.

- `PORT` (example: `5000`)
- `CLIENT_URL` (example: `http://localhost:3000`)
- `CLIENT_URLS` (optional comma-separated additional frontend URLs)
- `ALLOW_VERCEL_PREVIEWS` (`true` or `false`)
- `DATABASE_URL` (PostgreSQL connection string)
- `JWT_SECRET` (strong random secret)
- `GOOGLE_CLIENT_ID` (same Google OAuth client ID as frontend)
- `OPENAI_API_KEY`

### Frontend (`client/.env.local`)

Start from `client/.env.example`.

- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `BACKEND_URL` (backend base URL for Next.js rewrites in production/deployment)

## Local Setup

From repository root:

1. Install frontend dependencies:
```bash
cd client
npm install
```

2. Install backend dependencies:
```bash
cd ../server
npm install
```

3. Create env files:
- copy `server/.env.example` to `server/.env`
- copy `client/.env.example` to `client/.env.local`

4. Configure Google OAuth origins:
- `http://localhost:3000` for local frontend

5. Initialize database schema:
- run `server/db/schema.sql` against your PostgreSQL database

## Run Locally

Open two terminals.

Terminal 1 (backend):
```bash
cd server
npm run dev
```

Terminal 2 (frontend):
```bash
cd client
npm run dev
```

App URLs:
- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:5000/api/health`

## Scripts

Backend (`server/package.json`):
- `npm run dev` - start backend with nodemon
- `npm start` - start backend with node

Frontend (`client/package.json`):
- `npm run dev` - start Next.js dev server
- `npm run build` - build production frontend
- `npm run start` - start production frontend
- `npm run lint` - run lint checks

## Deployment

Recommended production split:
- Frontend on Vercel (`client` root)
- Backend on Render/Railway/Fly/etc.

See:
- `DEPLOYMENT.md` for deployment steps
- `TECHNICAL_IMPLEMENTATION.md` for architecture and implementation details

## Submission Packaging (Important)

For a clean submission zip, include source and docs only.

Include:
- `client/`
- `server/`
- `README.md`
- `DEPLOYMENT.md`
- `TECHNICAL_IMPLEMENTATION.md`

Do not include:
- `.git/`
- `node_modules/`
- `.next/`
- `.env`
- `.env.local`
- any local cache/build artifacts

### PowerShell Zip Command (Windows)

Run from repository root:

```powershell
$stage = "submission_stage"
$dest = "SmartGroup_Submission.zip"

if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
if (Test-Path $dest) { Remove-Item $dest -Force }

New-Item -ItemType Directory -Path $stage | Out-Null

robocopy . "$stage" client /E /XD node_modules .next /XF .env .env.local > $null
robocopy . "$stage" server /E /XD node_modules /XF .env .env.local > $null
Copy-Item README.md, DEPLOYMENT.md, TECHNICAL_IMPLEMENTATION.md -Destination $stage

Compress-Archive -Path "$stage\*" -DestinationPath $dest -CompressionLevel Optimal
Remove-Item $stage -Recurse -Force
```

## Current Cleanup Applied

The repository was cleaned for submission by removing non-essential generated/legacy items:
- `client/node_modules`
- `server/node_modules`
- `client/.next`
- `client/src` (legacy duplicate folder)
- `client/README.md` (template file)
- root `services/` (empty folder)
