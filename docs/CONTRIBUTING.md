# Contributing to KniitNon

Thank you for your interest in contributing to the KniitNon AI-powered research platform! This guide will help you get started with development, testing, and submitting contributions.

## 🚀 Quick Start for Contributors

### Development Environment Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR-USERNAME/KniitNon.git
   cd KniitNon
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Database Setup**
   ```bash
   # Run PostgreSQL (via Docker recommended)
   docker run --name kniitnon-dev-db \
     -e POSTGRES_DB=kniitnon_dev \
     -e POSTGRES_USER=dev \
     -e POSTGRES_PASSWORD=devpassword \
     -p 5432:5432 -d postgres:15
   
   # Apply migrations
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

## 🏗️ Project Architecture

### Technology Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **UI/Styling**: Tailwind CSS, Radix UI, Shadcn/UI
- **State Management**: Zustand
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: NextAuth.js
- **Visualization**: D3.js
- **Testing**: Jest, Cypress, React Testing Library
- **AI Integration**: OpenAI, Google Gemini APIs

### Folder Structure
```
KniitNon/
├── app/                    # Next.js 14 App Router
│   ├── api/               # API routes
│   ├── dashboard/         # Main dashboard
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── features/          # Feature-specific components
│   │   ├── outline/       # Outline building
│   │   ├── visualization/ # D3.js visualizations
│   │   ├── ai/           # AI assistant features
│   │   └── project/      # Project management
│   ├── shared/           # Reusable components
│   └── ui/               # Base UI primitives
├── lib/                  # Utility libraries
│   ├── api/             # API utilities
│   ├── features/        # Feature-specific logic
│   └── shared/          # Shared utilities
├── prisma/              # Database schema
├── __tests__/           # Test files
└── docs/               # Documentation
```

## 🧪 Development Guidelines

### Code Style
- **TypeScript**: Strictly typed, use interfaces for props
- **React**: Functional components with hooks
- **Naming**: PascalCase for components, camelCase for functions/variables
- **Imports**: Use absolute imports (`@/` prefix)

### Component Organization
```typescript
// Example component structure
'use client'; // If client component needed

import React from 'react';
import { ComponentProps } from './types';

interface MyComponentProps {
  title: string;
  onAction: () => void;
}

export default function MyComponent({ title, onAction }: MyComponentProps) {
  // Component logic
  return (
    <div className="component-styles">
      {/* JSX */}
    </div>
  );
}
```

### State Management
- **Local State**: React useState/useReducer
- **Global State**: Zustand stores in `lib/features/*/stores/`
- **Server State**: React Query/SWR for API calls

### Styling Guidelines
- **Tailwind CSS**: Use utility classes
- **Component Styles**: Create reusable UI components
- **Responsive**: Mobile-first design approach
- **Accessibility**: WCAG 2.1 AA compliance

## 🧪 Testing

### Running Tests
```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Type checking
npm run type-check

# All tests
npm run test:coverage
```

### Testing Guidelines
- **Unit Tests**: Jest + React Testing Library
- **Integration Tests**: Test component interactions
- **E2E Tests**: Cypress for user workflows
- **Coverage**: Maintain >80% test coverage

### Writing Tests
```typescript
// Example test
import { render, screen } from '@testing-library/react';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Test" onAction={jest.fn()} />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

## 📝 Pull Request Process

### Before Submitting
1. **Test Everything**
   ```bash
   npm run type-check
   npm test
   npm run test:e2e
   ```

2. **Code Formatting**
   ```bash
   npm run lint
   ```

3. **Build Verification**
   ```bash
   npm run build
   ```

### PR Requirements
- [ ] Tests pass (unit, integration, E2E)
- [ ] TypeScript compiles without errors
- [ ] Code follows style guidelines
- [ ] Changes are documented
- [ ] Accessibility requirements met
- [ ] Performance impact considered

### PR Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Added/updated unit tests
- [ ] Added/updated E2E tests
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests pass
```

## 🐛 Bug Reports

### Bug Report Template
```markdown
## Bug Description
Clear description of the issue

## Steps to Reproduce
1. Go to...
2. Click on...
3. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [e.g., Windows 10]
- Browser: [e.g., Chrome 91]
- Node version: [e.g., 18.17.0]

## Additional Context
Screenshots, logs, or other context
```

## 💡 Feature Requests

### Feature Request Template
```markdown
## Feature Description
Clear description of the proposed feature

## Problem Statement
What problem does this solve?

## Proposed Solution
How should this be implemented?

## Alternatives Considered
Other approaches that were considered

## Additional Context
Mockups, examples, or references
```

## 🎯 Current Development Priorities

### High Priority
- Mobile responsiveness improvements
- Performance optimizations
- Accessibility enhancements
- Test coverage improvements

### Medium Priority
- Multi-project support
- Real-time collaboration features
- Enhanced AI integrations
- Advanced export options

### Low Priority
- UI/UX polish
- Analytics implementation
- Additional AI providers
- Performance monitoring

## 📚 Resources

### Learning Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs/)

### Project-Specific Docs
- [API Documentation](./API.md)
- [Developer Guide](./DEVELOPER_GUIDE.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Architecture Overview](./README.md)

## 💬 Community

### Communication Channels
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and ideas
- **Pull Requests**: Code contributions and reviews

### Code of Conduct
- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Focus on what's best for the project

## 🏷️ Release Process

### Version Numbering
- **Major** (1.0.0): Breaking changes
- **Minor** (0.1.0): New features, backward compatible
- **Patch** (0.0.1): Bug fixes, backward compatible

### Release Checklist
- [ ] All tests pass
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Version bumped
- [ ] Tagged in git
- [ ] Deployed to production

---

## Getting Help

If you need help or have questions:
1. Check existing [GitHub Issues](https://github.com/mrm-dev-312/KniitNon/issues)
2. Read the [Developer Guide](./DEVELOPER_GUIDE.md)
3. Create a new issue with the question template

Thank you for contributing to KniitNon! 🚀
