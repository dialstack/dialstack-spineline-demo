# Spineline - Chiropractic SaaS Platform

A vertical SaaS platform for chiropractors that showcases DialStack embedded voice components, allowing businesses to handle PBX telephony directly within the platform.

## Features

- **User Authentication**: Secure signup/login system with NextAuth.js
- **PostgreSQL Database**: Robust data storage with connection pooling
- **Modern UI**: Built with Next.js 15, React 19, and Tailwind CSS
- **Type Safety**: Full TypeScript support with strict type checking
- **Form Management**: React Hook Form with Zod validation
- **Responsive Design**: Mobile-first design with shadcn/ui components
- **Blue/Green Deployment**: Zero-downtime deployments with automatic rollback
- **Infrastructure as Code**: Complete AWS infrastructure with OpenTofu
- **Production Security**: SSH bastion, encrypted storage, SSL certificates

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

### Infrastructure & Deployment

- **OpenTofu** - Infrastructure as Code (Terraform alternative)
- **AWS EC2** - Blue/green application servers
- **AWS RDS** - PostgreSQL database with automated backups
- **Route53** - DNS management with health checks
- **Let's Encrypt** - SSL certificates with DNS-01 challenge
- **GitHub Actions** - CI/CD pipeline with blue/green deployment

### Development Tools

- **TypeScript** - Static type checking
- **ESLint** - Code linting with Next.js config
- **Prettier** - Code formatting

## Getting Started

### Prerequisites

- Node.js 24 or later
- PostgreSQL database (or use AWS RDS)
- npm or yarn
- AWS account (for production deployment)
- OpenTofu/Terraform (for infrastructure management)

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
   DATABASE_SECRET='{"username":"your_user","password":"your_password","host":"localhost","port":5432,"dbname":"spineline_db"}'
   ```

   **Note**: `DATABASE_SECRET` uses RDS-managed secret format (JSON). In production, this is automatically injected from AWS Secrets Manager.

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

This application uses a complete blue/green deployment strategy with Infrastructure as Code (OpenTofu) for zero-downtime deployments.

### Architecture

- **Blue/Green Environments**: Independent EC2 + RDS instances for seamless switching
- **SSH Bastion**: Secure access to private application servers
- **DNS-01 Challenge**: Let's Encrypt SSL certificates without port 80
- **60-second TTL**: Fast rollback capability on DNS records
- **Production Security**: Deletion protection, encrypted storage, automated backups

### Quick Start (Production)

1. **Set up AWS credentials** in GitHub Secrets:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`

2. **Deploy infrastructure** (manual only):

   ```bash
   # Via GitHub Actions
   Go to Actions → Infrastructure Deployment → Run workflow → Select "apply"
   ```

3. **Deploy to staging** (automatic on push):

   ```bash
   # Push to main branch auto-deploys to staging (inactive environment)
   git push origin main
   ```

4. **Promote to production** (manual only):
   ```bash
   # Via GitHub Actions
   Go to Actions → Blue/Green Deployment → Run workflow → Select "deploy-production"
   ```

### Manual Deployment

1. **Install OpenTofu**:

   ```bash
   # macOS
   brew install opentofu

   # Linux/Windows - see https://opentofu.org/docs/intro/install/
   ```

2. **Initialize infrastructure**:

   ```bash
   cd tofu/
   tofu init
   tofu plan
   tofu apply
   ```

3. **Deploy application**:

   ```bash
   # Deploy to staging (inactive environment)
   ACTIVE_ENV=$(cd tofu && tofu output -raw active_environment)
   if [[ "$ACTIVE_ENV" == "blue" ]]; then
     ./scripts/deploy.sh green staging
   else
     ./scripts/deploy.sh blue staging
   fi

   # Promote staging to production
   ./scripts/deploy.sh green production  # if green was staging
   ```

4. **Rollback if needed**:
   ```bash
   ./scripts/deploy.sh rollback
   ```

### Infrastructure Components

- **VPC**: Multi-AZ setup with public/private subnets
- **EC2**: t3.micro instances (free tier eligible)
- **RDS**: PostgreSQL 17 with automated backups
- **Route53**: DNS with health checks and fast TTL
- **Security Groups**: Restrictive access controls
- **IAM**: Least-privilege roles for all components
- **CloudWatch**: Comprehensive logging and monitoring

### Environment URLs

- **Production**: https://spineline.dev (points to active environment)
- **Blue Environment**: https://blue.spineline.dev
- **Green Environment**: https://green.spineline.dev
- **SSH Bastion**: https://bastion.spineline.dev
- **Health Check**: https://spineline.dev/api/health

### Deployment Flow

1. **Code Push**: Push to main → Auto-deploys to staging (inactive environment)
2. **Test Staging**: Verify changes at `https://[inactive-env].spineline.dev`
3. **Promote**: Manual trigger switches DNS to make staging → production
4. **Result**: Previous production becomes new staging for next deployment

### CI/CD Workflows

1. **Infrastructure Pipeline** (`infrastructure.yml`):
   - **PR validation**: Runs `tofu plan` and security scans on pull requests
   - **Manual deployment**: Only applies changes via manual workflow trigger
   - **Security scanning**: Runs Checkov to catch configuration issues
   - **No auto-apply**: Infrastructure changes require explicit approval

2. **Application Pipeline** (`deploy.yml`):
   - **Auto staging**: Push to main auto-deploys to inactive environment (staging)
   - **Manual production**: Requires manual trigger to promote staging → production
   - **Smart targeting**: Automatically detects which environment is active/inactive
   - **Health checks**: Validates deployment before completing
   - **Rollback capability**: One-click rollback to previous environment

### Monitoring

- **Application Logs**: CloudWatch logs for app and nginx
- **Infrastructure Metrics**: CPU, memory, disk usage
- **Health Checks**: Automated endpoint monitoring
- **Database Monitoring**: RDS Performance Insights

### Security Features

- **SSH Bastion**: No direct SSH to application servers
- **Private Subnets**: Database and app servers isolated
- **Encrypted Storage**: All EBS volumes and RDS encrypted
- **SSL Certificates**: Automatic Let's Encrypt with Route53
- **IAM Policies**: Minimal required permissions
- **Security Groups**: Port-specific access controls
