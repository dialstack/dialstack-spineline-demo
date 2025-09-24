# Repository Guidelines

## Project Structure & Module Organization

Spineline runs on Next.js 15 App Router inside `app/`. Layout-level server components live in route folders, while shared UI sits in `components/` and shadcn component metadata in `components.json`. Cross-cutting utilities and service clients stay in `lib/`, with reusable TypeScript contracts in `types/`. SQL seeds and migrations live under `database/`. Deployment workflows and infrastructure-as-code assets are split between `deploy/` (GitHub Actions, environment manifests) and `tofu/` (OpenTofu modules). Static assets reside in `public/`, and helper scripts in `scripts/`.

## Build, Test, and Development Commands

Run `npm run dev` for the local development server with DialStack widgets. Use `npm run build` to compile production output and `npm start` to serve it. `npm run lint` and `npm run lint:fix` execute ESLint with the Next.js preset. `npm run format` and `npm run format:check` apply or verify Prettier formatting, while `npm run typecheck` performs strict TypeScript verification. `npm run test` is currently a stub—replace it with the project’s first automated suite when added.

## Coding Style & Naming Conventions

Follow Prettier defaults (2-space indentation, semicolons on) and TypeScript strictness. Use PascalCase for React components and hooks, camelCase for variables and helper exports, and kebab-case for route segment folders (`app/dashboard/patients/page.tsx`). Co-locate styles via Tailwind utility classes; avoid ad-hoc CSS files unless necessary. Run `npm run lint` before opening a PR to catch JSX accessibility and auth guard issues.

## Testing Guidelines

Add tests alongside the feature under a `__tests__` folder or `*.test.ts[x]` file adjacent to the module. Prefer a headless runner (e.g., Vitest or Playwright) aligned with Next.js best practices, and update `npm run test` to invoke it. Keep the suite green in CI and include seed data via `database/init.sql` when integration tests need fixtures. Document new environment variables in `.env.example`.

## Commit & Pull Request Guidelines

Match the existing concise, imperative commit style (`Fix OpenTofu version in workflows`). Group related changes per commit and mention scripts touched. PRs should describe the business value, list validation commands (`npm run lint`, `npm run typecheck`), reference DialStack tickets or GitHub issues, and attach screenshots or terminal output for UI or deployment changes. Flag migrations or infrastructure updates so reviewers can plan rollouts.

## Environment Configuration

Copy `.env.example` to `.env` and supply DialStack keys, PostgreSQL credentials, and `NEXTAUTH_URL`. Keep secrets out of Git history. For AWS deployments, align `deploy/` variables with `tofu/` module inputs and rotate keys through the shared secrets manager.
