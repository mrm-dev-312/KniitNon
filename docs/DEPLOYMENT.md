# Deployment Guide

Complete deployment guide for the KniitNon research platform covering Docker, Google Cloud Platform, and local development.

## 🏗️ Local Development Setup

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- PostgreSQL database
- Git

### Quick Start
```bash
# Clone repository
git clone <repository-url>
cd KniitNon

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Run database migrations
npx prisma migrate dev
npx prisma generate

# Start development server
npm run dev
```

## 🐳 Docker Deployment

### Build Configuration
The project includes optimized Docker configuration with multi-stage builds:

```dockerfile
# See Dockerfile for complete configuration
FROM node:18-alpine AS base
# Dependencies, build, and runner stages optimized for production
```

### Environment Setup
1. **Create `.env.local`** (copy from `.env.example`)
2. **Configure database URL** for PostgreSQL
3. **Add API keys**: OPENAI_API_KEY, GEMINI_API_KEY
4. **Set NextAuth configuration**

### Build Commands
```bash
# Local build and run
docker build -t kniitnon:latest .
docker run -p 3000:3000 --env-file .env.local kniitnon:latest

# Using Docker Compose
docker-compose up --build
```

### Common Docker Issues & Solutions

**Issue: Prisma OpenSSL Dependencies**
```bash
# Fixed by adding to Dockerfile:
RUN apk add --no-cache openssl1.1-compat
```

**Issue: Next.js Static Generation Errors**
```javascript
// Fixed by adding to next.config.mjs:
module.exports = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client']
  }
}

// And to API routes:
export const dynamic = 'force-dynamic'
```

## ☁️ Google Cloud Platform Deployment

### Project Configuration
- **Project Name**: Kniitnon
- **Project ID**: kniitnon
- **Project Number**: 61175122918
- **Region**: us-central1
- **Zone**: us-central1-a

### Prerequisites Setup
```bash
# Install Google Cloud CLI
# Authenticate
gcloud auth login
gcloud auth application-default login

# Configure Docker for GCP
gcloud auth configure-docker

# Enable required services
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

### Deployment Methods

#### Method 1: VS Code Cloud Code Extension (Recommended)
1. Install Google Cloud Code extension
2. Open project in VS Code
3. Use Command Palette: "Cloud Run: Deploy to Cloud Run"
4. Follow guided deployment process

#### Method 2: Command Line Deployment
```bash
# Build and tag for GCP
docker build -t gcr.io/kniitnon/kniitnon:latest .

# Push to Google Container Registry
docker push gcr.io/kniitnon/kniitnon:latest

# Deploy to Cloud Run
gcloud run deploy kniitnon \
  --image gcr.io/kniitnon/kniitnon:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated
```

### Environment Variables for Production
Set these in Google Cloud Run console:
```bash
DATABASE_URL=<your-production-database-url>
NEXTAUTH_URL=<your-cloud-run-service-url>
NEXTAUTH_SECRET=<secure-random-string>
OPENAI_API_KEY=<your-openai-api-key>
GEMINI_API_KEY=<your-gemini-api-key>
```

### CI/CD with GitHub Actions
```yaml
# .github/workflows/cloud-run.yml
name: Deploy to Cloud Run
on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: google-github-actions/setup-gcloud@v0
      - run: |
          gcloud auth configure-docker
          docker build -t gcr.io/kniitnon/kniitnon:$GITHUB_SHA .
          docker push gcr.io/kniitnon/kniitnon:$GITHUB_SHA
          gcloud run deploy kniitnon --image gcr.io/kniitnon/kniitnon:$GITHUB_SHA
```

## 🔧 Database Setup

### Local PostgreSQL
```bash
# Using Docker
docker run --name kniitnon-postgres \
  -e POSTGRES_DB=kniitnon \
  -e POSTGRES_USER=kniitnon \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 -d postgres:15

# Apply migrations
DATABASE_URL="postgresql://kniitnon:password@localhost:5432/kniitnon" npx prisma migrate dev
```

### Production Database
- Use Google Cloud SQL or managed PostgreSQL service
- Ensure connection pooling for Cloud Run
- Configure SSL connections for security

## 🚨 Troubleshooting

### Build Issues
1. **Prisma Client Generation**: Ensure `npx prisma generate` runs before build
2. **Environment Variables**: Check all required variables are set
3. **Dependencies**: Clear node_modules and reinstall if needed

### Runtime Issues
1. **Database Connections**: Verify DATABASE_URL format and accessibility
2. **API Keys**: Ensure all external service API keys are valid
3. **Memory Issues**: Cloud Run may need memory limits increased

### Performance Optimization
1. **Enable caching**: Configure appropriate cache headers
2. **Database indexing**: Ensure proper indexes on frequently queried columns
3. **Image optimization**: Use Next.js Image component for automatic optimization

## 📊 Monitoring & Logs

### Google Cloud Monitoring
```bash
# View logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=kniitnon"

# Monitor metrics
gcloud monitoring metrics list --filter="resource.type=cloud_run_revision"
```

### Health Checks
The application includes health check endpoints:
- `/api/health` - Basic health check
- `/api/health/database` - Database connectivity check

## 🔒 Security Considerations

1. **Environment Variables**: Never commit sensitive data
2. **Database Security**: Use connection pooling and SSL
3. **API Rate Limiting**: Configure appropriate rate limits
4. **Authentication**: Ensure NextAuth.js is properly configured
5. **CORS**: Configure allowed origins for production

## 📱 Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificates configured
- [ ] Custom domain mapped (if applicable)
- [ ] Health checks passing
- [ ] Monitoring and alerting set up
- [ ] Backup strategy implemented
- [ ] Security headers configured
- [ ] Performance testing completed
