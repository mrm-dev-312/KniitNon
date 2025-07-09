/// <reference types="cypress" />

// Custom commands for Cypress tests

Cypress.Commands.add('dataCy', (value: string) => {
  return cy.get(`[data-cy=${value}]`)
})

// Command to mock authentication
Cypress.Commands.add('mockAuth', (user = null) => {
  cy.window().then((win) => {
    // Mock NextAuth session
    if (user) {
      win.localStorage.setItem('nextauth.session-token', 'mock-token')
      cy.intercept('GET', '/api/auth/session', {
        statusCode: 200,
        body: {
          user,
          expires: '2024-12-31T23:59:59.999Z'
        }
      })
    } else {
      win.localStorage.removeItem('nextauth.session-token')
      cy.intercept('GET', '/api/auth/session', {
        statusCode: 200,
        body: {}
      })
    }
  })
})

// Mock API responses for testing
Cypress.Commands.add('mockApiResponse', (method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, response: any, statusCode = 200) => {
  cy.intercept(method, url, {
    statusCode,
    body: response
  })
})
