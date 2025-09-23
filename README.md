# Spineline - Chiropractic SaaS Platform

A vertical SaaS platform for chiropractors that showcases DialStack embedded voice components, allowing businesses to handle PBX telephony directly within the platform.

## Features

- **User Authentication**: Secure signup/login system with NextAuth.js
- **PostgreSQL Database**: Robust data storage with connection pooling
- **Modern UI**: Built with Next.js 15, React 19, and Tailwind CSS
- **Type Safety**: Full TypeScript support with strict type checking
- **Form Management**: React Hook Form with Zod validation
- **Responsive Design**: Mobile-first design with shadcn/ui components

## Tech Stack

### Frontend

- **Next.js 15** - React framework with App Router
- **React 19** - Latest React with concurrent features
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Reusable component library
- **Lucide React** - Beautiful icons

### Authentication & Backend

- **NextAuth.js** - Authentication solution
- **PostgreSQL** - Primary database
- **bcryptjs** - Password hashing

### Form Management & Validation

- **React Hook Form** - Performant forms with minimal re-renders
- **Zod** - TypeScript-first schema validation
- **@hookform/resolvers** - Validation library integrations

### Development Tools

- **TypeScript** - Static type checking
- **ESLint** - Code linting with Next.js config
- **GitHub Actions** - CI/CD pipeline

## Getting Started

### Prerequisites

- Node.js 20 or later
- PostgreSQL database
- npm or yarn

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/dialstack-spineline-demo.git
   cd dialstack-spineline-demo
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Update the `.env` file with your actual values:

   ```env
   DIALSTACK_SECRET_KEY="your_dialstack_secret_key"
   DIALSTACK_PUBLIC_KEY="your_dialstack_public_key"
   NEXTAUTH_URL="http://localhost:3000"
   DATABASE_URL="postgresql://username:password@localhost:5432/spineline_db"
   ```

4. **Set up the database**

   ```bash
   # Create the database
   psql postgres -c "CREATE DATABASE spineline_db;"

   # Initialize with schema
   psql spineline_db -f database/init.sql
   ```

5. **Run the development server**

   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

## Database Schema

The application uses PostgreSQL with the following main tables:

### practices

- `id` - Primary key (serial)
- `email` - User email (unique)
- `password` - Hashed password
- `created_at` - Account creation timestamp
- `updated_at` - Last update timestamp

## Authentication

The app uses NextAuth.js with custom credentials provider:

- **Signup**: Creates new practice accounts with email/password
- **Login**: Authenticates existing users
- **Password Security**: bcrypt with 12 salt rounds
- **Session Management**: JWT-based sessions

## Development

### Code Quality

- **TypeScript**: Strict type checking enabled
- **ESLint**: Next.js recommended configuration
- **Git Hooks**: Pre-commit validation (if configured)

### Database Connection

The app uses a singleton connection pool pattern to efficiently manage PostgreSQL connections:

- **Connection Pooling**: Shared pool across all database operations
- **Error Handling**: Automatic reconnection and error recovery
- **Performance**: Optimized with connection limits and timeouts

## Deployment

### Environment Setup

1. Set production environment variables
2. Configure PostgreSQL database
3. Run database migrations
4. Build and deploy the application

### CI/CD

GitHub Actions workflow automatically:

- Runs TypeScript type checking
- Performs ESLint validation
- Builds the application
- Tests for errors on every push
