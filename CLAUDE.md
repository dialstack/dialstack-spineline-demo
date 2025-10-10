# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This application is a vertical SaaS platform for chiropractors that showcases DialStack embedded voice components, allowing businesses to handle PBX telephony directly within the platform. Because this is an example, the code needs to be simple and to-the-point, without fluff. Everything will be well documented and commented.

## Development Commands

- `npm run dev` - Start development server on port 3000
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint with Next.js configuration
- `npm run typecheck` - Run TypeScript type checking without emitting files

## Database Commands

- `npm run migrate` - Run all pending migrations (using custom script)
- `npm run migrate:up` - Run next migration
- `npm run migrate:down` - Rollback last migration
- `npm run migrate:create <name>` - Create a new migration file
- `npm run start:migrate` - Run migrations then start production server

## Architecture Overview

### Authentication Flow

- Uses NextAuth.js with custom credentials providers for both login and signup
- Two providers configured: 'login' and 'signup' (both CredentialsProvider)
- JWT session strategy with custom callbacks for session/token management
- Passwords hashed with bcryptjs using 12 salt rounds

### Database Architecture

- **Connection Pooling**: Uses singleton pattern in `lib/dbConnect.ts` with cached PostgreSQL pool
- **Model Pattern**: `app/models/practice.ts` contains static methods for database operations
- **Multi-Tenancy**: Practices own their own patients (practice_id foreign key relationship)
- **Important**: All database operations use the shared connection pool, never create new connections

### Database Migration System

- **Tool**: node-pg-migrate (not raw SQL files)
- **Migration Files**: Located in `migrations/` directory as timestamped .mjs files
- **Custom Runner**: `scripts/migrate.mjs` parses RDS-managed secrets and runs migrations
- **Environment Variables**:
  - `DATABASE_SECRET` - JSON string with `{"username":"...", "password":"..."}`
  - `DB_HOST` - Database host (e.g., localhost)
  - `DB_PORT` - Database port (default: 5432)
  - `DB_NAME` - Database name (e.g., spineline_db)
  - `DB_SSL_ENABLED` - Set to "false" for local development (default: true)
- **Migration Structure**: Each migration exports `up()` and `down()` functions
  - `up(pgm)` - Apply the migration
  - `down(pgm)` - Rollback the migration
- **Creating Migrations**:
  1. Run `npm run migrate:create <descriptive-name>`
  2. Edit the generated file in `migrations/`
  3. Follow the pattern in `1760100000000_initial-schema.mjs`
  4. Use `pgm.createTable()`, `pgm.addColumn()`, `pgm.createIndex()`, etc.
  5. Reuse `update_updated_at_column()` trigger for timestamp management
  6. Run `npm run migrate:up` to apply
- **Migrations Table**: Tracks applied migrations in `pgmigrations` table

### Form Management

- React Hook Form with Zod validation via `@hookform/resolvers`
- Form schemas defined in `lib/forms.ts` (currently `UserFormSchema`)
- shadcn/ui form components in `components/ui/form.tsx` with custom validation display

### UI Components

- Built on shadcn/ui foundation with Tailwind CSS
- Core components: Button, Input, Label, Form (all in `components/ui/`)
- Next.js 15 App Router with route groups: `app/(auth)/` for authentication pages

## Key Files

- `lib/dbConnect.ts` - Singleton database connection pool (NEVER bypass this)
- `app/models/practice.ts` - Practice model with CRUD operations
- `app/models/patient.ts` - Patient model with multi-tenant CRUD operations
- `lib/auth.ts` - NextAuth configuration with dual credential providers
- `lib/forms.ts` - Zod validation schemas
- `migrations/` - Database migration files (node-pg-migrate)
- `scripts/migrate.mjs` - Custom migration runner for RDS-managed secrets
- `.github/workflows/ci.yml` - CI pipeline (typecheck, lint, build)

## Technology Stack

- **Next.js 15** with App Router and React 19
- **PostgreSQL** with connection pooling and node-pg-migrate for migrations
- **NextAuth.js** for authentication
- **TypeScript** with strict checking
- **Tailwind CSS** + shadcn/ui components
- **React Hook Form** + Zod validation
- **bcryptjs** for password hashing
- **React Query** for data fetching and caching

## Important Notes

- The connection pool in `lib/dbConnect.ts` is critical - all database operations must use `await dbConnect()`
- Use node-pg-migrate for all schema changes - never modify the database directly
- All patient data is scoped to practices (multi-tenant) - always filter by practice_id
- NextAuth providers are configured for both login and signup flows in the same file
- ESLint configuration was migrated from deprecated `next lint` to ESLint CLI
- Database timestamps use automatic triggers for `updated_at` field
- Form validation errors are handled through React Hook Form's error system
