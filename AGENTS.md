# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js App Router pages, layouts, and `app/api/*` route handlers.
- `components/`: Reusable UI (file names use kebab-case, e.g., `goal-details.tsx`).
- `actions/`: Server Actions and server-only logic (data mutations, imports/exports).
- `lib/`: Utilities, data access, and integrations (e.g., `supabase.ts`, `goal-database.ts`).
- `hooks/`: Shared React hooks.  `public/`: static assets.  `styles/`: Tailwind CSS.
- `scripts/`: SQL for schema and seeds (e.g., `simplified-database-init.sql`).

## Build, Test, and Development Commands
- `cp .env.example .env.local`: Bootstrap local env; fill Supabase vars.
- `npm run dev` (port 3001): Start the development server with HMR.
- `npm run build`: Production build via Next.js.
- `npm start`: Run the compiled production server.
- `npm run lint`: Lint the project using Next/ESLint rules.

## Coding Style & Naming Conventions
- Language: TypeScript + React. Prefer functional components and hooks.
- Files: kebab-case for files (`create-goal-form.tsx`); components named in PascalCase.
- Code: camelCase for variables/functions; avoid unused exports; keep server-only code in `actions/` or `app/api/`.
- Styling: Tailwind CSS; compose classes, avoid inline styles; prefer utility helpers in `components/ui`.
- Linting: follow `eslint-config-next`; run `npm run lint` and fix warnings before PRs.

## Testing Guidelines
- The repository has no test runner configured yet. If adding tests, colocate as `*.test.ts(x)` near sources and propose scripts (e.g., Jest/Vitest) in the PR.
- Focus on `lib/*` utilities and critical components. Aim for deterministic tests and clear data setup.

## Commit & Pull Request Guidelines
- Commits: imperative, present tense and concise (e.g., “Add threaded comment system”, “Fix TypeScript build errors”).
- PRs: include a clear description, linked issues, screenshots/GIFs for UI, and steps to validate. Keep scope focused.
- Checklists: pass `npm run lint`, build locally, update docs when changing workflows or environment.

## Security & Configuration Tips
- Never commit secrets. Use `.env.local` for Supabase keys and app config.
- Sanitize inputs in API routes and server actions; avoid logging sensitive data.
- Use `scripts/*.sql` to init or seed local databases; review before running.
