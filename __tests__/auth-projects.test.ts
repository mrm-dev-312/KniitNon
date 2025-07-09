import { NextRequest, NextResponse } from 'next/server'
import { createMocks } from 'node-mocks-http'
import { GET, POST } from '@/app/api/projects/route'
import { GET as GET_PROJECT, DELETE } from '@/app/api/projects/[id]/route'
import { getServerSession } from 'next-auth'

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    savedPath: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

// Mock middleware
jest.mock('@/lib/api-middleware', () => ({
  EndpointMiddleware: jest.fn((req, config, handler) => {
    return handler(req, {
      query: {},
      body: {},
    })
  }),
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = require('@/lib/db').prisma

describe('Projects API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/projects', () => {
    it('should return 401 for unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/projects')
      const response = await GET(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should return projects for authenticated user', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'test@example.com' }
      }
      mockGetServerSession.mockResolvedValue(mockSession)

      const mockProjects = [
        {
          id: 'project-1',
          title: 'Test Project',
          data: { nodes: [], conflicts: [] },
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ]

      mockPrisma.savedPath.findMany.mockResolvedValue(mockProjects)
      mockPrisma.savedPath.count.mockResolvedValue(1)

      const request = new NextRequest('http://localhost:3000/api/projects')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.projects).toEqual(mockProjects)
      expect(data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      })
    })
  })

  describe('POST /api/projects', () => {
    it('should create a new project for authenticated user', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'test@example.com' }
      }
      mockGetServerSession.mockResolvedValue(mockSession)

      const mockProject = {
        id: 'project-1',
        title: 'New Project',
        data: { nodes: [], conflicts: [] },
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.savedPath.create.mockResolvedValue(mockProject)

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New Project',
          data: { nodes: [], conflicts: [] },
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data).toEqual(mockProject)
    })
  })

  describe('DELETE /api/projects/[id]', () => {
    it('should delete a project owned by the authenticated user', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'test@example.com' }
      }
      mockGetServerSession.mockResolvedValue(mockSession)

      const mockProject = {
        id: 'project-1',
        title: 'Test Project',
        userId: 'user-1',
      }

      mockPrisma.savedPath.findFirst.mockResolvedValue(mockProject)
      mockPrisma.savedPath.delete.mockResolvedValue(mockProject)

      const request = new NextRequest('http://localhost:3000/api/projects/project-1', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: { id: 'project-1' } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })

    it('should return 404 for non-existent project', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'test@example.com' }
      }
      mockGetServerSession.mockResolvedValue(mockSession)

      mockPrisma.savedPath.findFirst.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/projects/non-existent', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: { id: 'non-existent' } })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Project not found')
    })
  })
})
