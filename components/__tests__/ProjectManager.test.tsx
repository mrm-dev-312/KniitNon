import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { ProjectManager } from '../ProjectManager';

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

// Mock outline store
const mockLoadProject = jest.fn();
const mockOutlineStore = {
  nodes: [
    { id: '1', title: 'Test Node', content: 'Test content', type: 'topic', order: 1 },
  ],
  conflicts: null,
  summary: null,
  loadProject: mockLoadProject,
};

jest.mock('@/lib/stores/outline-store', () => ({
  useOutlineStore: () => mockOutlineStore,
}));

// Mock fetch
global.fetch = jest.fn();

describe('ProjectManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
    mockLoadProject.mockClear();
  });

  it('renders nothing when user is not authenticated', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    });

    const { container } = render(<ProjectManager />);
    expect(container.firstChild).toBeNull();
  });

  it('renders project manager when user is authenticated', () => {
    const mockSession = {
      user: {
        name: 'John Doe',
        email: 'john@example.com',
      },
      expires: '2024-12-31',
    };

    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    });

    render(<ProjectManager />);
    expect(screen.getByText('Projects')).toBeInTheDocument();
  });

  it('loads saved projects when dialog is opened', async () => {
    const mockSession = {
      user: {
        name: 'John Doe',
        email: 'john@example.com',
      },
      expires: '2024-12-31',
    };

    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    });

    const mockProjects = [
      {
        id: '1',
        title: 'Test Project',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        data: { nodes: [], conflicts: null, summary: null },
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockProjects,
    });

    render(<ProjectManager />);

    const projectsButton = screen.getByText('Projects');
    fireEvent.click(projectsButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/projects');
    });
  });

  it('saves current project when save button is clicked', async () => {
    const mockSession = {
      user: {
        name: 'John Doe',
        email: 'john@example.com',
      },
      expires: '2024-12-31',
    };

    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [], // Initial load
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '1', title: 'New Project' }), // Save response
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [], // Reload after save
      });

    render(<ProjectManager />);

    const projectsButton = screen.getByText('Projects');
    fireEvent.click(projectsButton);

    await waitFor(() => {
      expect(screen.getByText('My Projects')).toBeInTheDocument();
    });

    const titleInput = screen.getByPlaceholderText('Enter project title...');
    fireEvent.change(titleInput, { target: { value: 'New Project' } });

    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    await waitFor(() => {
      const calls = (global.fetch as jest.Mock).mock.calls;
      const saveCall = calls.find(call => call[0] === '/api/projects' && call[1]?.method === 'POST');
      expect(saveCall).toBeDefined();
      
      if (saveCall) {
        const body = JSON.parse(saveCall[1].body);
        expect(body.title).toBe('New Project');
      }
    });
  });

  it('loads a project when load button is clicked', async () => {
    const mockSession = {
      user: {
        name: 'John Doe',
        email: 'john@example.com',
      },
      expires: '2024-12-31',
    };

    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    });

    const mockProjects = [
      {
        id: '1',
        title: 'Test Project',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        data: { 
          nodes: [{ id: '1', title: 'Loaded Node' }], 
          conflicts: [], 
          summary: null 
        },
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockProjects,
    });

    render(<ProjectManager />);

    const projectsButton = screen.getByText('Projects');
    fireEvent.click(projectsButton);

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    const loadButton = screen.getByText('Load');
    fireEvent.click(loadButton);

    await waitFor(() => {
      expect(mockLoadProject).toHaveBeenCalledWith(mockProjects[0].data);
    });
  });
});
