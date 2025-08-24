const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
// NOTE: Removed ts-jest preset/globals (ts-jest not installed & we rely on next/jest + babel-jest)
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/types/(.*)$': '<rootDir>/types/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
  // Exclude build directories and integration test files from test runs
  testPathIgnorePatterns: [
    '<rootDir>/.next/', 
    '<rootDir>/node_modules/',
    '.integration.skip'
  ],
  // Handle file imports that Jest can't handle
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  // Enable ES modules support
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  // Transform ES modules that Jest can't handle
  transformIgnorePatterns: [
    'node_modules/(?!(jose|openid-client|@next-auth|next-auth|oauth4webapi|oidc-token-hash|uuid)/)',
  ],
  // Force transformation of specific ES modules
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
