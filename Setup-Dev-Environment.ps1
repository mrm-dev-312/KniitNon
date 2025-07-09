# KniitNon Development Environment Setup Script
# This script automates the complete setup process for the KniitNon project

param(
    [switch]$SkipDocker,
    [switch]$SkipDatabase,
    [switch]$SkipDependencies,
    [switch]$Verbose
)

# Function to write colored output
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    } else {
        $input | Write-Output
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Success { Write-ColorOutput Green $args }
function Write-Warning { Write-ColorOutput Yellow $args }
function Write-Error { Write-ColorOutput Red $args }

Write-Success "🚀 Setting up KniitNon development environment..."

# Check if we're in the correct directory
if (!(Test-Path "package.json")) {
    Write-Error "❌ package.json not found. Please run this script from the KniitNon project root directory."
    exit 1
}

# Check for required tools
$requiredTools = @("node", "npm", "docker", "docker-compose")
foreach ($tool in $requiredTools) {
    if (!(Get-Command $tool -ErrorAction SilentlyContinue)) {
        Write-Error "❌ $tool is not installed or not in PATH. Please install $tool and try again."
        exit 1
    } else {
        Write-Success "✅ $tool found"
    }
}

# Install Node.js dependencies
if (!$SkipDependencies) {
    Write-Success "📦 Installing Node.js dependencies..."
    try {
        npm install
        Write-Success "✅ Dependencies installed successfully"
    } catch {
        Write-Error "❌ Failed to install dependencies: $_"
        exit 1
    }
} else {
    Write-Warning "⏭️ Skipping dependency installation"
}

# Start Docker services
if (!$SkipDocker) {
    Write-Success "🐳 Starting Docker services..."
    try {
        docker-compose up -d postgres
        Start-Sleep -Seconds 10  # Wait for PostgreSQL to be ready
        Write-Success "✅ PostgreSQL container started"
    } catch {
        Write-Error "❌ Failed to start Docker services: $_"
        exit 1
    }
} else {
    Write-Warning "⏭️ Skipping Docker startup"
}

# Setup database
if (!$SkipDatabase) {
    Write-Success "🗄️ Setting up database..."
    try {
        # Generate Prisma client
        npx prisma generate
        Write-Success "✅ Prisma client generated"
        
        # Run database migrations
        npx prisma migrate dev --name init
        Write-Success "✅ Database migrations completed"
        
        # Check if seed script exists and run it
        if (Test-Path "prisma/seed.ts" -or Test-Path "prisma/seed.js") {
            npx prisma db seed
            Write-Success "✅ Database seeded with initial data"
        } else {
            Write-Warning "⚠️ No seed script found, skipping database seeding"
        }
    } catch {
        Write-Error "❌ Database setup failed: $_"
        Write-Warning "💡 Try running 'docker-compose down' and 'docker-compose up -d postgres' to reset the database"
        exit 1
    }
} else {
    Write-Warning "⏭️ Skipping database setup"
}

# Verify environment variables
Write-Success "🔧 Checking environment configuration..."
$envFile = ".env.local"
if (Test-Path $envFile) {
    Write-Success "✅ Environment file found: $envFile"
    
    # Check for critical environment variables
    $envContent = Get-Content $envFile -Raw
    $criticalVars = @("DATABASE_URL", "NEXTAUTH_SECRET", "NEXTAUTH_URL")
    
    foreach ($var in $criticalVars) {
        if ($envContent -match "$var\s*=\s*.+") {
            Write-Success "✅ $var is configured"
        } else {
            Write-Warning "⚠️ $var is not configured in $envFile"
        }
    }
} else {
    Write-Warning "⚠️ No .env.local file found. You may need to configure environment variables."
    Write-Success "💡 Create a .env.local file with the following variables:"
    Write-Output @"
DATABASE_URL="postgresql://postgres:password@localhost:5432/kniitnon"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GEMINI_API_KEY="your-gemini-api-key"
OPENAI_API_KEY="your-openai-api-key"
"@
}

# Run type checking
Write-Success "🔍 Running TypeScript type checking..."
try {
    npm run type-check
    Write-Success "✅ TypeScript type checking passed"
} catch {
    Write-Warning "⚠️ TypeScript type checking failed. You may need to fix type errors before running the application."
}

# Test database connection
Write-Success "🔌 Testing database connection..."
try {
    npx prisma db pull --preview-feature 2>$null
    Write-Success "✅ Database connection successful"
} catch {
    Write-Warning "⚠️ Database connection test failed. Check your DATABASE_URL and PostgreSQL container status."
}

Write-Success "🎉 Development environment setup completed!"
Write-Success "🚀 You can now start the development server with: npm run dev"
Write-Success "🌐 The application will be available at: http://localhost:3000"

# Optionally start the development server
$startServer = Read-Host "Would you like to start the development server now? (y/N)"
if ($startServer -eq "y" -or $startServer -eq "Y") {
    Write-Success "🚀 Starting development server..."
    npm run dev
} else {
    Write-Success "✨ Setup complete! Run 'npm run dev' when you're ready to start developing."
}

# Display helpful commands
Write-Success "`n📋 Helpful commands:"
Write-Output "  npm run dev          - Start development server"
Write-Output "  npm run build        - Build for production"
Write-Output "  npm run test         - Run tests"
Write-Output "  npm run lint         - Run linting"
Write-Output "  npx prisma studio    - Open database GUI"
Write-Output "  docker-compose logs  - View container logs"
Write-Output "  docker-compose down  - Stop all containers"

if ($Verbose) {
    Write-Success "`n🔧 System Information:"
    Write-Output "  Node.js: $(node --version)"
    Write-Output "  NPM: $(npm --version)"
    Write-Output "  Docker: $(docker --version)"
    Write-Output "  Docker Compose: $(docker-compose --version)"
}
