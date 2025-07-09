describe('Application Basic Flow', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('should display the main page with KniitNon heading', () => {
    cy.get('h1').should('contain', 'KniitNon')
    cy.contains('This is a functional, full-stack chat application scaffold.')
    cy.contains('Open Research Explorer').should('be.visible')
  })

  it('should navigate to dashboard when Open Research Explorer is clicked', () => {
    cy.contains('Open Research Explorer').click()
    cy.url().should('include', '/dashboard')
    cy.get('h1').should('contain', 'Research Explorer')
  })

  it('should display visualization canvas and outline builder in dashboard', () => {
    cy.visit('/dashboard')
    
    // Should have the main dashboard elements
    cy.get('h1').should('contain', 'Research Explorer')
    cy.contains('Outline Builder').should('be.visible')
  })
})

describe('Chat Interface', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('should have functional chat interface', () => {
    // Should be able to see the chat input
    cy.get('textarea').should('be.visible')
    cy.get('textarea').type('Tell me about artificial intelligence in healthcare')
    
    // Should be able to submit (even if it's mocked)
    cy.get('button[type="submit"]').should('be.visible')
  })
})
