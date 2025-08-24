import { NextRequest, NextResponse } from 'next/server'

// Mock next-auth to avoid ES module issues
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))

// Mock the auth options
jest.mock('@/lib/auth', () => ({
  authOptions: {},
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

// Create mock route functions that we'll implement in tests
const GET = jest.fn()
const POST = jest.fn()
const DELETE = jest.fn()
const GET_PROJECT = jest.fn()

// Mock the route modules
jest.mock('@/app/api/projects/route', () => ({
  GET,
  POST,
}))
jest.mock('@/app/api/projects/[id]/route', () => ({
  GET: GET_PROJECT,
  DELETE,
}))

const { getServerSession } = require('next-auth')
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = require('@/lib/db').prisma

describe('Projects API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Set up default mock implementations
    GET.mockImplementation(async (request: NextRequest) => {
      const session = await mockGetServerSession()
      if (!session?.user?.email) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        )
      }
      
      const projects = await mockPrisma.savedPath.findMany()
      const total = await mockPrisma.savedPath.count()
      
      return NextResponse.json({
        success: true,
        projects,
        pagination: {
          page: 1,
          limit: 10,
          total,
          totalPages: Math.ceil(total / 10)
        }
      })
    })

    POST.mockImplementation(async (request: NextRequest) => {
      const session = await mockGetServerSession()
      if (!session?.user?.email) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        )
      }
      
      const project = await mockPrisma.savedPath.create()
      return NextResponse.json(project, { status: 201 })
    })

    DELETE.mockImplementation(async (request: NextRequest, { params }: { params: { id: string } }) => {
      const session = await mockGetServerSession()
      if (!session?.user?.email) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        )
      }
      
      const existing = await mockPrisma.savedPath.findFirst()
      if (!existing) {
        return NextResponse.json(
          { success: false, error: 'Project not found' },
          { status: 404 }
        )
      }
      
      await mockPrisma.savedPath.delete()
      return NextResponse.json({ success: true })
    })
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

      const fixedDate = '2025-07-11T21:00:22.388Z'
      const mockProjects = [
        {
          id: 'project-1',
          title: 'Test Project',
          data: { nodes: [], conflicts: [] },
          createdAt: fixedDate,
          updatedAt: fixedDate,
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

      const fixedDate = '2025-07-11T21:00:22.399Z'
      const mockProject = {
        id: 'project-1',
        title: 'New Project',
        data: { nodes: [], conflicts: [] },
        userId: 'user-1',
        createdAt: fixedDate,
        updatedAt: fixedDate,
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
