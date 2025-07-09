// Import commands.js using ES2015 syntax
import './commands'

// Add custom types
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to select DOM element by data-cy attribute.
       * @example cy.dataCy('greeting')
       */
      dataCy(value: string): Chainable<JQuery<HTMLElement>>
      
      /**
       * Custom command to mock authentication
       * @example cy.mockAuth({ name: 'John Doe', email: 'john@example.com' })
       */
      mockAuth(user?: any): Chainable<void>
      
      /**
       * Custom command to mock API responses
       * @example cy.mockApiResponse('GET', '/api/projects', [])
       */
      mockApiResponse(method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, response: any, statusCode?: number): Chainable<void>
    }
  }
}
