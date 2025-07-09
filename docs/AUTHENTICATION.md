# User Authentication & Project Management

## Overview

The KniitNon application now includes a comprehensive user authentication and project management system built with NextAuth.js. This allows users to:

- Sign in with Google or GitHub OAuth providers
- Save and manage research projects
- Load previously saved work
- Secure access to personal data

## Features

### Authentication
- **OAuth Integration**: Support for Google and GitHub sign-in
- **Session Management**: JWT-based sessions with automatic refresh
- **Security**: Secure cookie handling and CSRF protection
- **User Experience**: Seamless sign-in/sign-out flow with modal dialogs

### Project Management
- **Save Projects**: Store complete research sessions with nodes, conflicts, and summaries
- **Load Projects**: Restore previous work with full state restoration
- **Delete Projects**: Remove unwanted projects with confirmation
- **Pagination**: Efficient handling of large project collections
- **Metadata**: Track creation/modification dates and project statistics

## Components

### AuthButton
Location: `components/AuthButton.tsx`

The main authentication component that provides:
- Sign-in button with modal dialog
- User avatar dropdown when authenticated
- Sign-out functionality
- User profile information display

```tsx
import { AuthButton } from '@/components/AuthButton'

// Usage in header
<AuthButton />
```

### ProjectManager
Location: `components/ProjectManager.tsx`

The project management component that provides:
- Save current project dialog
- List of saved projects
- Load project functionality
- Delete project with confirmation
- Project metadata display

```tsx
import { ProjectManager } from '@/components/ProjectManager'

// Usage in dashboard
<ProjectManager />
```

## API Endpoints

### Authentication
- `GET/POST /api/auth/[...nextauth]` - NextAuth.js authentication endpoints
- Automatically handles OAuth flows and session management

### Projects
- `GET /api/projects` - List user's projects with pagination
- `POST /api/projects` - Create new project
- `GET /api/projects/[id]` - Get specific project
- `DELETE /api/projects/[id]` - Delete project
- `PUT /api/projects/[id]` - Update project (if implemented)

### Request/Response Examples

#### List Projects
```bash
GET /api/projects?page=1&limit=10
Authorization: Bearer <session-token>

Response:
{
  "projects": [
    {
      "id": "cuid",
      "title": "My Research Project",
      "data": {
        "nodes": [...],
        "conflicts": [...],
        "summary": "..."
      },
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

#### Save Project
```bash
POST /api/projects
Authorization: Bearer <session-token>
Content-Type: application/json

{
  "title": "New Research Project",
  "data": {
    "nodes": [...],
    "conflicts": [...],
    "summary": "Project summary"
  }
}

Response:
{
  "id": "new-project-id",
  "title": "New Research Project",
  "data": { ... },
  "userId": "user-id",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

## Database Schema

### User Model
```sql
CREATE TABLE "User" (
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  accounts      Account[]
  savedPaths    SavedPath[]
  sessions      Session[]
)
```

### SavedPath Model
```sql
CREATE TABLE "SavedPath" (
  id        String   @id @default(cuid())
  title     String
  data      Json
  userId    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
)
```

## Configuration

### Environment Variables
Required environment variables for authentication:

```bash
# NextAuth.js Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-here"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_ID="your-github-client-id"
GITHUB_SECRET="your-github-client-secret"

# Database
POSTGRES_PRISMA_URL="postgresql://username:password@localhost:5432/database"
```

### NextAuth Configuration
Location: `lib/auth.ts`

```typescript
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  // ... additional configuration
}
```

## Security Features

### Authentication Security
- **OAuth 2.0**: Secure third-party authentication
- **JWT Tokens**: Stateless session management
- **CSRF Protection**: Built-in protection against cross-site request forgery
- **Secure Cookies**: HttpOnly and Secure flag cookies

### API Security
- **Authentication Required**: All project endpoints require authentication
- **User Isolation**: Users can only access their own projects
- **Rate Limiting**: Configurable rate limiting on API endpoints
- **Input Validation**: Zod schema validation for all inputs

### Data Protection
- **Ownership Verification**: Projects are linked to user accounts
- **Cascade Deletion**: User data is properly cleaned up
- **No Data Leakage**: Strict user-based filtering

## Usage Patterns

### Basic Authentication Flow
1. User clicks "Sign In" button
2. Modal opens with OAuth provider options
3. User selects Google or GitHub
4. Redirected to provider for authentication
5. Returned to app with authenticated session
6. User profile displayed in header

### Project Management Flow
1. User works on research in the dashboard
2. Clicks "Projects" to open project manager
3. Enters title and clicks "Save" to store current work
4. Previously saved projects appear in the list
5. User can load previous work or delete projects

### State Management Integration
The project system integrates with the Zustand store:

```typescript
// Save current state
const { nodes, conflicts, summary } = useOutlineStore()
const projectData = { nodes, conflicts, summary, timestamp: new Date().toISOString() }

// Load saved state
const { loadProject } = useOutlineStore()
loadProject(savedProject.data)
```

## Error Handling

### Authentication Errors
- Invalid credentials redirect to error page
- Session expiration triggers re-authentication
- OAuth provider errors are gracefully handled

### API Errors
- 401 Unauthorized for missing authentication
- 403 Forbidden for insufficient permissions
- 404 Not Found for non-existent projects
- 500 Internal Server Error for server issues

### User Experience
- Toast notifications for success/error states
- Loading indicators during operations
- Confirmation dialogs for destructive actions
- Graceful degradation when unauthenticated

## Testing

### Manual Testing Checklist
- [ ] Sign in with Google OAuth
- [ ] Sign in with GitHub OAuth
- [ ] Save current project
- [ ] Load saved project
- [ ] Delete project
- [ ] Sign out functionality
- [ ] Session persistence across browser refresh
- [ ] Unauthorized access protection

### Integration Tests
See `__tests__/auth-projects.test.ts` for API endpoint tests covering:
- Authentication requirements
- Project CRUD operations
- User isolation
- Error scenarios

## Deployment Considerations

### Environment Setup
1. Configure OAuth applications in Google/GitHub consoles
2. Set up production database with proper user permissions
3. Configure environment variables in deployment platform
4. Enable HTTPS for production (required for OAuth)

### Database Migrations
Run Prisma migrations in production:
```bash
npx prisma migrate deploy
npx prisma generate
```

### Monitoring
Monitor authentication metrics:
- Sign-in success/failure rates
- Session duration
- API endpoint usage
- Error rates

## Future Enhancements

### Planned Features
- [ ] Email/password authentication option
- [ ] Two-factor authentication
- [ ] Project sharing and collaboration
- [ ] Project templates and categories
- [ ] Export/import functionality
- [ ] Advanced search and filtering

### Performance Optimizations
- [ ] Implement project thumbnail previews
- [ ] Add pagination for large project lists
- [ ] Cache frequently accessed projects
- [ ] Optimize database queries with indexes

This authentication and project management system provides a solid foundation for user data persistence and security in the KniitNon research platform.
