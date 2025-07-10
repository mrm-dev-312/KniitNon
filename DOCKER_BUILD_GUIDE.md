# Docker Build Guide for KniitNon

## 📋 Prerequisites Checklist

### Required Files and Configuration

1. **Environment Configuration**
   - [ ] `.env.local` file created (copy from `.env.example`)
   - [ ] Database URL configured in `.env.local`
   - [ ] API keys configured (OPENAI_API_KEY, GEMINI_API_KEY)
   - [ ] NextAuth configuration complete

2. **Dependencies Installed**
   - [ ] Node.js 18+ installed
   - [ ] Docker and Docker Compose installed
   - [ ] npm packages installed (`npm install`)

3. **Database Setup**
   - [ ] PostgreSQL database available
   - [ ] Prisma migrations applied (`npx prisma migrate dev`)
   - [ ] Prisma client generated (`npx prisma generate`)

## 🔧 Build Issues Resolution

### Issue 1: Prisma OpenSSL Dependencies
**Problem**: `Error loading shared library libssl.so.1.1: No such file or directory`

**Solution Applied**:
- Added OpenSSL installation to all Docker stages
- Added Alpine Linux binary target to Prisma schema
- Updated Dockerfile with proper package installations

### Issue 2: Next.js Static Generation Errors
**Problem**: `Dynamic server usage: Route couldn't be rendered statically because it used request.headers`

**Solution Applied**:
- Added `output: 'standalone'` to next.config.mjs
- Added `export const dynamic = 'force-dynamic'` to API routes using middleware
- Added Prisma to external packages list

### Issue 3: Missing Docker Configuration
**Problem**: Next.js build not optimized for Docker containers

**Solution Applied**:
- Configured standalone output mode
- Added proper binary targets for Alpine Linux
- Fixed Dockerfile stage dependencies

## 🚀 Build Steps

### Step 1: Environment Setup
```powershell
# Copy environment file
cp .env.example .env.local

# Edit .env.local with your actual values
# POSTGRES_PRISMA_URL="postgresql://..."
# OPENAI_API_KEY="sk-..."
# GEMINI_API_KEY="..."
# NEXTAUTH_SECRET="your-secret-key"
```

### Step 2: Database Preparation
```powershell
# Install dependencies
npm install

# Generate Prisma client with Alpine target
npx prisma generate

# Run migrations
npx prisma migrate dev
```

### Step 3: Docker Build
```powershell
# Build the Docker image
docker-compose build

# Start the application
docker-compose up
```

### Step 4: Verification
- [ ] Application starts without errors
- [ ] Database connections work
- [ ] API endpoints respond correctly
- [ ] Authentication flows work

## 🐛 Troubleshooting

### Build Failures

**Prisma Client Issues**:
```bash
# Force regenerate Prisma client
rm -rf node_modules/.prisma
npx prisma generate
```

**Docker Build Cache Issues**:
```bash
# Clear Docker build cache
docker-compose down
docker system prune -f
docker-compose build --no-cache
```

**Next.js Build Errors**:
```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

### Runtime Issues

**Database Connection**:
- Verify POSTGRES_PRISMA_URL in .env.local
- Ensure database is accessible from Docker container
- Check firewall and network settings

**API Keys**:
- Verify all API keys are properly set
- Check environment variable names match .env.example
- Ensure keys have correct permissions

**Authentication**:
- Verify NEXTAUTH_URL matches your domain
- Check NEXTAUTH_SECRET is set
- Ensure OAuth provider settings match

## 📁 Required Files Summary

### Configuration Files
- [ ] `Dockerfile` - Updated with OpenSSL and proper stages
- [ ] `docker-compose.yml` - Services configuration
- [ ] `next.config.mjs` - Next.js configuration with standalone output
- [ ] `prisma/schema.prisma` - Database schema with Alpine targets
- [ ] `.env.local` - Environment variables (create from .env.example)

### API Routes (Updated with dynamic exports)
- [ ] All routes in `app/api/` directories
- [ ] Middleware files in `lib/` directory
- [ ] Authentication configuration

### Dependencies
- [ ] `package.json` - All required dependencies
- [ ] `package-lock.json` - Lock file for consistent installs

## ✅ Success Criteria

1. **Docker Build Completes**: No errors during `docker-compose build`
2. **Application Starts**: Container runs without crashes
3. **Database Connects**: Prisma client connects successfully
4. **API Responds**: All endpoints return expected responses
5. **Authentication Works**: Login/logout flows function correctly

## 🔄 Next Steps After Docker Success

Once Docker build succeeds, proceed with remaining tasks from TASK.md:

1. **Testing Setup**: Configure Jest and Cypress
2. **Performance Optimization**: Implement caching and optimization
3. **Feature Completion**: Finish remaining MVP features
4. **Documentation**: Update README and API documentation

## 🎯 Breadcrumbs for Resolution

1. **Foundation Issues** → Update Dockerfile and Next.js config
2. **Prisma Compatibility** → Add Alpine targets and OpenSSL
3. **Static Generation** → Add dynamic exports to API routes
4. **Environment Setup** → Verify all required files exist
5. **Build Process** → Follow step-by-step build guide
6. **Verification** → Check all success criteria
7. **Continue Development** → Move to remaining tasks

This guide ensures a systematic approach to resolving Docker build issues and provides clear breadcrumbs for troubleshooting any problems that arise.
