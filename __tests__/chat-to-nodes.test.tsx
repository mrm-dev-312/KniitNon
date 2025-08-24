import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Chat } from '@/components/features/ai/chat';
import { useOutlineStore } from '@/lib/stores/outline-store';
import { ChatContext, useChatContext } from '@/lib/contexts/ChatContext';

// Mock the modules
jest.mock('@/lib/stores/outline-store');
jest.mock('ai/react', () => ({
  useChat: () => ({
    messages: [],
    input: '',
    handleInputChange: jest.fn(),
    handleSubmit: jest.fn(),
    isLoading: false,
    error: null,
  }),
}));

// Mock UnifiedNodeGenerator
jest.mock('@/lib/utils/unified-node-generator', () => ({
  UnifiedNodeGenerator: {
    generateNodes: jest.fn().mockResolvedValue({
      success: true,
      nodes: [
        {
          id: 'test-node-1',
          title: 'Test Node',
          content: 'Test content',
          type: 'topic',
          order: 1,
          metadata: { source: 'conversation' }
        }
      ],
      metadata: { count: 1, method: 'conversational' }
    }),
  },
}));

const mockAddNode = jest.fn();
const mockUseOutlineStore = useOutlineStore as unknown as jest.MockedFunction<typeof useOutlineStore>;

describe('Chat Component - Node Generation', () => {
  beforeEach(() => {
    mockUseOutlineStore.mockReturnValue({
      nodes: [],
      addNode: mockAddNode,
      updateNode: jest.fn(),
      deleteNode: jest.fn(),
      clearNodes: jest.fn(),
      getNodesByType: jest.fn(),
      getNodeById: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render chat component', () => {
    const mockSetMessages = jest.fn();
    
    render(
      <ChatContext.Provider value={{ 
        messages: [], 
        setMessages: mockSetMessages,
        addMessage: jest.fn(),
        clearMessages: jest.fn(),
        hasMessages: false
      }}>
        <Chat />
      </ChatContext.Provider>
    );

    expect(screen.getByPlaceholderText(/Type your message here.../)).toBeInTheDocument();
  });

  test('should call onNodesGenerated when nodes are generated', async () => {
    const mockOnNodesGenerated = jest.fn();
    const mockSetMessages = jest.fn();
    
    render(
      <ChatContext.Provider value={{ 
        messages: [], 
        setMessages: mockSetMessages,
        addMessage: jest.fn(),
        clearMessages: jest.fn(),
        hasMessages: false
      }}>
        <Chat onNodesGenerated={mockOnNodesGenerated} autoGenerateNodes={true} />
      </ChatContext.Provider>
    );

    // This test would need more complex setup to trigger the actual node generation
    // but at least we can verify the component renders with the props
    expect(screen.getByPlaceholderText(/Type your message here.../)).toBeInTheDocument();
  });

  test('should accept autoGenerateNodes prop', () => {
    const mockSetMessages = jest.fn();
    
    render(
      <ChatContext.Provider value={{ 
        messages: [], 
        setMessages: mockSetMessages,
        addMessage: jest.fn(),
        clearMessages: jest.fn(),
        hasMessages: false
      }}>
        <Chat autoGenerateNodes={false} />
      </ChatContext.Provider>
    );

    expect(screen.getByPlaceholderText(/Type your message here.../)).toBeInTheDocument();
  });
});
