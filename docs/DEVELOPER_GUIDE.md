# Developer Guide

## Overview

This guide covers the development setup, architecture, and implementation details for the KniitNon research platform. The application is built with Next.js 14, TypeScript, and includes comprehensive authentication, security, and accessibility features.

## Architecture

### Tech Stack
- **Frontend**: Next.js 14, React 18, TypeScript
- **UI Components**: Shadcn/UI, Tailwind CSS
- **State Management**: Zustand
- **Authentication**: NextAuth.js with OAuth providers
- **Database**: PostgreSQL with Prisma ORM
- **Visualization**: D3.js for interactive graphs
- **Testing**: Jest, Cypress, React Testing Library
- **Deployment**: Vercel with GitHub Actions CI/CD

### Project Structure
```
/
├── app/                    # Next.js 14 app router
│   ├── (dashboard)/        # Dashboard route group
│   ├── api/               # API routes
│   │   ├── auth/          # NextAuth.js endpoints
│   │   ├── projects/      # Project management APIs
│   │   └── research/      # Research-related APIs
│   ├── dashboard/         # Dashboard page
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/               # Shadcn/UI components
│   ├── providers/        # Context providers
│   └── __tests__/        # Component tests
├── lib/                  # Utilities and shared code
│   ├── stores/           # Zustand stores
│   ├── contexts/         # React contexts
│   └── accessibility.ts  # Accessibility utilities
├── docs/                 # Documentation
├── prisma/              # Database schema and migrations
└── __tests__/           # Global tests
```

## Development Setup

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- Git

### Initial Setup
1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd KniitNon
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

4. **Set up database**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

### Required Environment Variables
```bash
# Database
POSTGRES_PRISMA_URL="postgresql://username:password@localhost:5432/database"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_ID="your-github-client-id"
GITHUB_SECRET="your-github-client-secret"

# AI APIs
OPENAI_API_KEY="your-openai-api-key"
GEMINI_API_KEY="your-gemini-api-key"
```

## Core Features

### 1. User Authentication
- **Implementation**: NextAuth.js with OAuth providers
- **Providers**: Google, GitHub
- **Components**: `AuthButton`, `AuthProvider`
- **Security**: JWT tokens, secure cookies, CSRF protection

### 2. Project Management
- **Implementation**: Prisma-based project storage
- **Features**: Save/load projects, pagination, user isolation
- **Components**: `ProjectManager`
- **API**: `/api/projects` endpoints

### 3. Research Visualization
- **Implementation**: D3.js integration with React
- **Features**: Interactive graphs, node selection, drag-and-drop
- **Components**: `D3Visualization`, `OptimizedD3Visualization`
- **Performance**: Virtualization for large datasets

### 4. Outline Building
- **Implementation**: Zustand store with drag-and-drop
- **Features**: Node reordering, export functionality, detail levels
- **Components**: `OutlineBuilder`, `AdjustableDetailSlider`
- **State**: `outline-store.ts`

### 5. Security Features
- **Rate Limiting**: In-memory rate limiting for API endpoints
- **Input Validation**: Zod schema validation
- **Authentication**: Required for sensitive operations
- **CORS**: Configurable cross-origin resource sharing

### 6. Accessibility
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader**: ARIA labels and descriptions
- **Focus Management**: Proper focus handling
- **Utilities**: `lib/accessibility.ts`

### 7. Performance Optimization
- **Virtualization**: Large list optimization
- **Pagination**: API response pagination
- **D3.js Optimization**: Efficient rendering
- **Monitoring**: Performance tracking utilities

## Development Workflow

### Code Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **Git Hooks**: Pre-commit linting

### Testing Strategy
- **Unit Tests**: Jest with React Testing Library
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Cypress for user workflows
- **Component Tests**: Isolated component testing

### API Development
- **Middleware**: Centralized API middleware (`lib/api-middleware.ts`)
- **Validation**: Zod schema validation
- **Error Handling**: Consistent error responses
- **Rate Limiting**: Configurable rate limiting

### Database Management
- **Migrations**: Prisma migrations for schema changes
- **Seeds**: Database seeding for development
- **Queries**: Optimized database queries
- **Relationships**: Proper foreign key relationships

## Component Guidelines

### React Components
- **Functional Components**: Use hooks for state management
- **TypeScript**: Full type safety
- **Props**: Proper interface definitions
- **Error Boundaries**: Wrap components with error boundaries

### UI Components
- **Shadcn/UI**: Use existing components when possible
- **Tailwind CSS**: Utility-first styling
- **Responsive Design**: Mobile-first approach
- **Accessibility**: ARIA attributes and keyboard support

### State Management
- **Zustand**: For global state
- **React Context**: For provider patterns
- **Local State**: useState for component-specific state
- **Server State**: React Query patterns

## API Guidelines

### Endpoint Structure
- **REST**: RESTful API design
- **Authentication**: Protect sensitive endpoints
- **Validation**: Input validation with Zod
- **Error Handling**: Consistent error responses

### Middleware Pattern
```typescript
import { EndpointMiddleware } from '@/lib/api-middleware'

export async function POST(request: NextRequest) {
  return EndpointMiddleware(request, {
    requireAuth: true,
    validation: {
      body: ValidationSchema,
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100,
    },
  }, async (req, { body }) => {
    // Your endpoint logic here
  })
}
```

### Security Considerations
- **Authentication**: Verify user sessions
- **Authorization**: Check user permissions
- **Input Validation**: Validate all inputs
- **Rate Limiting**: Prevent abuse

## Testing Guidelines

### Unit Tests
- **Coverage**: Aim for 80%+ coverage
- **Isolation**: Mock external dependencies
- **Assertions**: Clear and specific assertions
- **Setup**: Proper test setup and teardown

### Integration Tests
- **API Endpoints**: Test complete request/response cycles
- **Database**: Test database interactions
- **Authentication**: Test auth flows
- **Error Scenarios**: Test error handling

### E2E Tests
- **User Workflows**: Test complete user journeys
- **Cross-Browser**: Test in multiple browsers
- **Performance**: Test performance metrics
- **Accessibility**: Test with screen readers

## Deployment

### Production Setup
1. **Build the application**
   ```bash
   npm run build
   ```

2. **Run database migrations**
   ```bash
   npx prisma migrate deploy
   ```

3. **Start production server**
   ```bash
   npm start
   ```

### CI/CD Pipeline
- **GitHub Actions**: Automated testing and deployment
- **Vercel**: Automatic deployments on push
- **Database**: Automated migrations
- **Environment**: Proper environment variable management

### Monitoring
- **Error Tracking**: Monitor application errors
- **Performance**: Track performance metrics
- **User Analytics**: Monitor user behavior
- **Security**: Monitor security events

## Troubleshooting

### Common Issues

#### Authentication Problems
- **OAuth Setup**: Verify OAuth app configuration
- **Environment Variables**: Check required variables
- **Database**: Ensure user tables exist
- **Cookies**: Check cookie settings

#### Database Issues
- **Migrations**: Run pending migrations
- **Connection**: Verify database connection
- **Permissions**: Check user permissions
- **Schema**: Verify schema matches models

#### Build Issues
- **Dependencies**: Check for missing dependencies
- **Types**: Resolve TypeScript errors
- **Environment**: Verify environment variables
- **Imports**: Check import paths

### Debug Tools
- **Next.js Debug**: Enable debug mode
- **Database Logs**: Check database logs
- **Browser DevTools**: Use browser debugging
- **API Testing**: Test APIs with tools like Postman

## Contributing

### Pull Request Process
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Review Guidelines
- **Functionality**: Does it work as intended?
- **Performance**: Are there performance implications?
- **Security**: Are there security considerations?
- **Accessibility**: Is it accessible?
- **Testing**: Are tests included?

## Best Practices

### Performance
- **Bundle Size**: Keep bundle size minimal
- **Lazy Loading**: Implement lazy loading
- **Caching**: Use appropriate caching strategies
- **Optimization**: Optimize images and assets

### Security
- **Input Validation**: Always validate inputs
- **Authentication**: Protect sensitive routes
- **HTTPS**: Use HTTPS in production
- **Dependencies**: Keep dependencies updated

### Accessibility
- **ARIA**: Use appropriate ARIA attributes
- **Keyboard**: Ensure keyboard navigation
- **Screen Readers**: Test with screen readers
- **Contrast**: Ensure proper color contrast

### Code Quality
- **TypeScript**: Use strict TypeScript
- **Linting**: Follow linting rules
- **Testing**: Write comprehensive tests
- **Documentation**: Document your code

This developer guide provides a comprehensive overview of the KniitNon codebase and development practices. For specific implementation details, refer to the individual component and API documentation.
