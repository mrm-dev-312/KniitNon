# BUGS - Issues That Need to Be Fixed

## Critical Bugs 🚨

### OAuth Authentication Error
**Priority: HIGH**
- **Issue**: OAuth not working - Error: `http://localhost:3000/auth/signin?callbackUrl=http%3A%2F%2Flocalhost%3A3000%2F&error=OAuthSignin`
- **Impact**: Users cannot sign in with Google or GitHub
- **Status**: Needs investigation and fix
- **Potential Causes**: 
  - OAuth app configuration issues
  - Environment variables not properly set
  - NextAuth.js configuration problems
  - Callback URL mismatch

### D3.js Graph Node Connection Issues
**Priority: MEDIUM**
- **Issue**: The deeper nodes are not connected and flying off
- **Impact**: Graph visualization becomes unusable for complex data
- **Status**: Needs debugging and force simulation adjustment
- **Potential Solutions**:
  - Adjust force simulation parameters
  - Improve node relationship mapping
  - Fix connection rendering for deeper levels

### D3.js Depth Limitation
**Priority: MEDIUM**
- **Issue**: D3 graph still does not drill down deeper than 2 levels
- **Impact**: Limited exploration depth for complex research topics
- **Status**: Requires API and visualization enhancement
- **Potential Solutions**:
  - Enhance API to support deeper hierarchies
  - Improve D3.js rendering for multi-level data
  - Add progressive loading for deep structures

## Testing & Configuration Bugs 🔧

### Jest/Cypress Type Conflicts
**Priority: LOW**
- **Issue**: Jest configuration has persistent TypeScript parsing errors
- **Impact**: Automated unit tests cannot run properly
- **Status**: Non-blocking (manual testing works)
- **Note**: Currently skipped due to persistent parsing errors
- **Potential Solutions**:
  - Separate Jest and Cypress configurations
  - Update TypeScript configuration
  - Resolve conflicting type definitions

### API Detail Level Integration
**Priority: MEDIUM**
- **Issue**: Detail level selected should fetch nodes from backend with correct detail level
- **Impact**: Detail slider doesn't properly affect data granularity
- **Status**: Requires backend integration enhancement
- **Potential Solutions**:
  - Enhance API endpoints to respect detail levels
  - Improve frontend-backend communication
  - Add proper data filtering based on detail level

## User Interface Bugs 🎨

### D3.js Node Pinning
**Priority: LOW**
- **Issue**: Need to be able to pin down nodes in the d3 graph
- **Impact**: Users cannot fix important nodes in place
- **Status**: Feature enhancement needed
- **Potential Solutions**:
  - Add pin/unpin functionality to D3.js visualization
  - Implement node locking mechanism
  - Add UI controls for node positioning

---

## Bug Fix Priority Matrix

| Priority | Bug | Estimated Effort | Impact |
|----------|-----|------------------|---------|
| HIGH | OAuth Authentication Error | 2-4 hours | Critical - blocks user login |
| MEDIUM | D3.js Node Connections | 4-6 hours | High - affects visualization usability |
| MEDIUM | D3.js Depth Limitation | 6-8 hours | Medium - limits exploration depth |
| MEDIUM | API Detail Level Integration | 3-5 hours | Medium - affects user experience |
| LOW | Jest/Cypress Type Conflicts | 4-8 hours | Low - manual testing works |
| LOW | D3.js Node Pinning | 2-3 hours | Low - nice to have feature |

## Debugging Information

### OAuth Debug Steps
1. Check OAuth app configuration in Google/GitHub consoles
2. Verify environment variables are correctly set
3. Test NextAuth.js configuration
4. Check callback URLs match exactly
5. Review server logs for detailed error messages

### D3.js Debug Steps
1. Console log force simulation parameters
2. Check node relationship data structure
3. Verify connection rendering logic
4. Test with different dataset sizes
5. Monitor performance during complex visualizations

### Jest Configuration Debug Steps
1. Review jest.config.js for conflicts
2. Check TypeScript configuration
3. Separate test configurations for different frameworks
4. Update dependency versions for compatibility

---

**Last Updated**: July 2025  
**Total Open Bugs**: 6  
**Critical Bugs**: 1  
**Medium Priority**: 3  
**Low Priority**: 2
