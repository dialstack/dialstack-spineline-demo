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

- `psql postgres -c "CREATE DATABASE spineline_db;"` - Create database
- `psql spineline_db -f database/init.sql` - Initialize database schema
- Database URL format: `postgresql://username:password@localhost:5432/spineline_db`

## Architecture Overview

### Authentication Flow

- Uses NextAuth.js with custom credentials providers for both login and signup
- Two providers configured: 'login' and 'signup' (both CredentialsProvider)
- JWT session strategy with custom callbacks for session/token management
- Passwords hashed with bcryptjs using 12 salt rounds

### Database Architecture

- **Connection Pooling**: Uses singleton pattern in `lib/dbConnect.ts` with cached PostgreSQL pool
- **Model Pattern**: `app/models/practice.ts` contains static methods for database operations
- **Schema**: Single `practices` table with auto-updating timestamps via triggers
- **Important**: All database operations use the shared connection pool, never create new connections

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
- `lib/auth.ts` - NextAuth configuration with dual credential providers
- `lib/forms.ts` - Zod validation schemas
- `database/init.sql` - Database initialization script
- `.github/workflows/ci.yml` - CI pipeline (typecheck, lint, build)

## Technology Stack

- **Next.js 15** with App Router and React 19
- **PostgreSQL** with connection pooling
- **NextAuth.js** for authentication
- **TypeScript** with strict checking
- **Tailwind CSS** + shadcn/ui components
- **React Hook Form** + Zod validation
- **bcryptjs** for password hashing

## Important Notes

- The connection pool in `lib/dbConnect.ts` is critical - all database operations must use `await dbConnect()`
- NextAuth providers are configured for both login and signup flows in the same file
- ESLint configuration was migrated from deprecated `next lint` to ESLint CLI
- Database timestamps use automatic triggers for `updated_at` field
- Form validation errors are handled through React Hook Form's error system
