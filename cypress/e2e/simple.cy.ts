describe('Simple Application Test', () => {
  it('should load the home page', () => {
    cy.visit('/')
    cy.get('h1').should('contain', 'KniitNon')
  })

  it('should have the research explorer button', () => {
    cy.visit('/')
    cy.contains('Open Research Explorer').should('be.visible')
  })
})
