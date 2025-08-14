# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js App Router pages, layouts, and `app/api/*` route handlers.
- `components/`: Reusable UI components (file names in kebab-case, e.g., `goal-details.tsx`; component names in PascalCase).
- `actions/`: Server Actions and server-only logic (mutations, import/export flows).
- `lib/`: Utilities, data access, and integrations (e.g., `supabase.ts`, `goal-database.ts`).
- `hooks/`: Shared React hooks. `public/`: static assets. `styles/`: Tailwind CSS.
- `scripts/`: SQL for schema/seeds (e.g., `simplified-database-init.sql`).

## Build, Test, and Development Commands
- `cp .env.example .env.local`: Bootstrap local env; fill Supabase vars.
- `npm run dev` (port 3001): Start Next.js dev server with HMR.
- `npm run build`: Create a production build.
- `npm start`: Run the compiled production server.
- `npm run lint`: Lint with Next/ESLint rules; fix warnings before PRs.

## Coding Style & Naming Conventions
- **Language**: TypeScript + React functional components and hooks.
- **Files**: kebab-case for files (`create-goal-form.tsx`); components in PascalCase.
- **Code**: camelCase for variables/functions; avoid unused exports.
- **Server-only code**: keep in `actions/` or `app/api/`.
- **Styling**: Tailwind CSS; compose utilities; prefer shared helpers in `components/ui`.
- **Linting**: `eslint-config-next`; run `npm run lint` locally.

## Testing Guidelines
- No runner configured yet. If adding tests, colocate as `*.test.ts(x)` near sources and propose scripts (e.g., Vitest/Jest) in your PR.
- Prioritize `lib/*` utilities and critical components; keep tests deterministic with clear data setup.
- Example layout: `lib/goal-database.test.ts` next to `lib/goal-database.ts`.

## Commit & Pull Request Guidelines
- **Commits**: Imperative, present tense (e.g., “Add goal export API”, “Fix TypeScript errors”). Keep scope focused.
- **PRs**: Include description, linked issues, screenshots/GIFs for UI, and validation steps. Ensure `npm run lint` passes and the app builds locally.
- Update docs when changing workflows or environment variables.

## Security & Configuration Tips
- Never commit secrets; use `.env.local` for Supabase keys and app config.
- Sanitize inputs in API routes and server actions; avoid logging sensitive data.
- Review SQL in `scripts/*.sql` before running; prefer least-privileged access.
