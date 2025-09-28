# SkillSync

A minimalistic, professional skill training and collaboration platform built with Next.js, TypeScript, Clerk (auth), Prisma and PostgreSQL (Neon recommended). The UI uses shadcn/ui + Tailwind CSS and is optimized for a compact, accessible, green/white visual theme.

This README covers the essentials to get the project running locally, prepare it for production, and understand the code layout.

Table of contents

- [Features](#features)
- [Requirements](#requirements)
- [Local setup](#local-setup)
- [Development workflow](#development-workflow)
- [Production build & deployment](#production-build--deployment)
- [Project structure](#project-structure)
- [API & database](#api--database)
- [Common tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## Features

- User authentication (Clerk)
- Skill management (add/remove skills)
- Projects: browse, create, join, apply, and manage team membership
- Dashboard: shows only projects the current user has created or joined
- Graceful API fallbacks: when Prisma is not available, APIs fall back to a local JSON store under /data
- Prisma for DB modeling and migrations
- shadcn/ui + Tailwind for accessible components and consistent design tokens

## Requirements

- Node.js 18+ (LTS recommended)
- pnpm (preferred) or npm/yarn
- PostgreSQL-compatible database (Neon recommended)
- Clerk account (for production auth)

## Local setup

1. Clone the repository

   ```bash
   git clone <repo-url> && cd SkillSync
   ```

2. Install dependencies

   ```bash
   pnpm install
   ```

3. Copy environment variables

   ```bash
   cp .env.example .env
   ```

   Create a `.env` file (do not commit secrets). Example variables are shown below — replace the placeholders with your real keys and connection string. Never paste production secrets into public repositories or share them in plain text.

   .env.example (safe template)

   ```env
   
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_cmVuZXdlZC10cm9sbC04NC5jbGVyay5hY2NvdW50cy5kZXk
CLERK_SECRET_KEY=sk_test_mrbvAhQUZpchP2oZXdklVQWUluNjlkD8JbuAD7bum4
DATABASE_URL='postgresql://neondb_owner:npg_x5nEBDoYp6iT@ep-wild-star-adbcmde1-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'   


   # Optional: other env vars used by the app
   # NEXTAUTH_URL=http://localhost:3000
   # NEXT_PUBLIC_APP_NAME=SkillSync
   ```

   If you have received secret values from a provider, paste them into `.env` on your local machine only. For deployment, set these values in your host's environment (Vercel/Netlify/Azure) rather than committing them.

4. Prisma

   ```bash
   pnpm prisma generate
   pnpm prisma migrate dev --name init
   ```

5. Run development server

   ```bash
   pnpm dev
   ```

   App: [http://localhost:3000](http://localhost:3000)

## Development workflow

- Run lint/type checks before commits:

  ```bash
  pnpm lint
  pnpm type-check
  ```

- Start a local socket server for real-time events (optional):

  ```bash
  node socket.server.js
  ```

## Project structure (important files)

- `src/app` — Next.js app routes and pages (dashboard, projects, learn, api routes, etc.)
- `src/components` — shared UI components (Navbar, HeroSection, SkillFormDialog, CardRotator, etc.)
- `src/lib` — utilities
- `prisma/schema.prisma` — Prisma models
- `src/app/api` — server API routes (projects, join, member, user-skills, save-user, etc.)
- `data/` — local JSON fallback storage used when Prisma is not present

## API & database

- `/api/projects` — list/create/delete projects; attempts to use Prisma, falls back to JSON
- `/api/projects/join` — apply/join project (creates ProjectMember)
- `/api/projects/member` — update/remove project member (approve/reject/remove)
- `/api/user-skills` — manage user's skills

The API routes are defensive: they detect available Prisma client methods and provide fallbacks where possible. For full feature parity ensure the Prisma client is generated against `prisma/schema.prisma` and your database is migrated.

## Common tasks

- Add a migration after changing Prisma schema:

  ```bash
  pnpm prisma migrate dev --name my-change
  ```

- Regenerate Prisma client:

  ```bash
  pnpm prisma generate
  ```

- Type-check and lint:

  ```bash
  pnpm type-check
  pnpm lint
  ```

## Troubleshooting

- Prisma client missing at build time: run `pnpm prisma generate` before `pnpm build`.
- Missing environment variables: many features will silently fallback; add Clerk and DATABASE_URL settings for full behavior.
- Dashboard still showing mock data: ensure the server-side `/api/projects` returns actual records and that you are authenticated (Clerk).

## Contributing

- Fork and create feature branches from `main`.
- Include tests where feasible. Run lint & type checks.
- Open a PR with a clear description and screenshots for UI changes.

## License

MIT

## Maintainers

- Open issues or PRs in the repository for bugs, feature requests, or questions.
