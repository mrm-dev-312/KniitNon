/**
 * Jest Setup File
 * 
 * This file configures the testing environment and sets up
 * necessary mocks and utilities for Jest tests.
 * 
 * Key Features:
 * - Polyfills for TextEncoder and TextDecoder.
 * - Mock implementations for Headers, Request, and Response objects.
 * - Mock Next.js utilities including router, navigation, image, and link components.
 * - Mock Prisma client for database interactions.
 * - Mock D3.js for data visualization.
 * - Mock React DnD for drag-and-drop functionality.
 * - Mock Zustand stores for state management.
 * - Mock AI providers for Google Generative AI and OpenAI.
 * - Mock fetch for API calls.
 * - Mock localStorage and sessionStorage.
 * - Mock window.matchMedia, IntersectionObserver, and ResizeObserver.
 * - Suppression of known console errors.
 * - Automatic clearing of mocks after each test.
 * 
 * Usage:
 * Import this file in your Jest configuration to ensure consistent test behavior.
 * Example:
 * ```
 * // jest.config.js
 * setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
 * ```
 */

import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Add global polyfills for Request/Response
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock Headers for web APIs
if (!global.Headers) {
  global.Headers = class MockHeaders {
    constructor(init) {
      this._headers = new Map();
      if (init) {
        if (init instanceof Headers || init instanceof MockHeaders) {
          init.forEach((value, key) => this.set(key, value));
        } else if (Array.isArray(init)) {
          init.forEach(([key, value]) => this.set(key, value));
        } else {
          Object.entries(init).forEach(([key, value]) => this.set(key, value));
        }
      }
    }
    
    get(name) {
      return this._headers.get(name.toLowerCase());
    }
    
    set(name, value) {
      this._headers.set(name.toLowerCase(), String(value));
    }
    
    has(name) {
      return this._headers.has(name.toLowerCase());
    }
    
    delete(name) {
      this._headers.delete(name.toLowerCase());
    }
    
    forEach(callback, thisArg) {
      this._headers.forEach((value, key) => callback.call(thisArg, value, key, this));
    }
    
    entries() {
      return this._headers.entries();
    }
    
    keys() {
      return this._headers.keys();
    }
    
    values() {
      return this._headers.values();
    }
  };
}

// Mock Request/Response for Next.js
if (!global.Request) {
  global.Request = class MockRequest {
    constructor(url, options = {}) {
      // Define url as a getter to match NextRequest behavior
      Object.defineProperty(this, 'url', {
        value: url,
        writable: false,
        enumerable: true,
        configurable: false
      });
      
      this.method = options.method || 'GET';
      this.headers = new Headers(options.headers || {});
      this.body = options.body;
      this._bodyInit = options.body;
    }
    
    async json() {
      return JSON.parse(this.body || '{}');
    }
    
    async text() {
      return this.body || '';
    }
    
    clone() {
      return new MockRequest(this.url, {
        method: this.method,
        headers: this.headers,
        body: this.body
      });
    }
  };
}

if (!global.Response) {
  global.Response = class MockResponse {
    constructor(body, options = {}) {
      this.body = body;
      this.status = options.status || 200;
      this.statusText = options.statusText || 'OK';
      this.headers = new Headers(options.headers || {});
      this.ok = this.status >= 200 && this.status < 300;
    }
    
    static json(data, options = {}) {
      return new global.Response(JSON.stringify(data), {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
    }
    
    async json() {
      return JSON.parse(this.body || '{}');
    }
    
    async text() {
      return this.body || '';
    }
    
    clone() {
      return new MockResponse(this.body, {
        status: this.status,
        statusText: this.statusText,
        headers: this.headers
      });
    }
  };
}

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      replace: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    };
  },
}));

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
}));

// Mock Next.js image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt} />;
  },
}));

// Mock Next.js link component
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }) => {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  useSession() {
    return {
      data: null,
      status: 'unauthenticated',
    };
  },
  signIn: jest.fn(),
  signOut: jest.fn(),
  SessionProvider: ({ children }) => children,
}));

// Mock Prisma client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    node: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    source: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    conflict: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  })),
}));

// Mock D3.js
jest.mock('d3', () => ({
  select: jest.fn(() => ({
    selectAll: jest.fn(() => ({
      data: jest.fn(() => ({
        enter: jest.fn(() => ({
          append: jest.fn(() => ({
            attr: jest.fn(() => ({
              style: jest.fn(),
              text: jest.fn(),
              on: jest.fn(),
            })),
            style: jest.fn(() => ({
              attr: jest.fn(),
              text: jest.fn(),
              on: jest.fn(),
            })),
            text: jest.fn(() => ({
              attr: jest.fn(),
              style: jest.fn(),
              on: jest.fn(),
            })),
            on: jest.fn(),
          })),
        })),
        exit: jest.fn(() => ({
          remove: jest.fn(),
        })),
        attr: jest.fn(),
        style: jest.fn(),
        text: jest.fn(),
        on: jest.fn(),
      })),
      attr: jest.fn(),
      style: jest.fn(),
      text: jest.fn(),
      on: jest.fn(),
    })),
    attr: jest.fn(() => ({
      style: jest.fn(),
      text: jest.fn(),
      on: jest.fn(),
    })),
    style: jest.fn(() => ({
      attr: jest.fn(),
      text: jest.fn(),
      on: jest.fn(),
    })),
    text: jest.fn(() => ({
      attr: jest.fn(),
      style: jest.fn(),
      on: jest.fn(),
    })),
    on: jest.fn(),
    append: jest.fn(),
    remove: jest.fn(),
  })),
  forceSimulation: jest.fn(() => ({
    nodes: jest.fn(() => ({
      force: jest.fn(() => ({
        on: jest.fn(),
        alpha: jest.fn(),
        restart: jest.fn(),
      })),
      on: jest.fn(),
      alpha: jest.fn(),
      restart: jest.fn(),
    })),
    force: jest.fn(() => ({
      nodes: jest.fn(),
      on: jest.fn(),
      alpha: jest.fn(),
      restart: jest.fn(),
    })),
    on: jest.fn(() => ({
      nodes: jest.fn(),
      force: jest.fn(),
      alpha: jest.fn(),
      restart: jest.fn(),
    })),
    alpha: jest.fn(),
    restart: jest.fn(),
  })),
  forceManyBody: jest.fn(),
  forceCenter: jest.fn(),
  forceLink: jest.fn(() => ({
    id: jest.fn(),
    distance: jest.fn(),
  })),
  scaleOrdinal: jest.fn(() => ({
    domain: jest.fn(() => ({
      range: jest.fn(),
    })),
    range: jest.fn(),
  })),
  schemeCategory10: [],
}));

// Mock React DnD
jest.mock('react-dnd', () => ({
  useDrag: jest.fn(() => [
    { isDragging: false },
    jest.fn(),
    jest.fn(),
  ]),
  useDrop: jest.fn(() => [
    { isOver: false, canDrop: false },
    jest.fn(),
  ]),
  DndProvider: ({ children }) => children,
}));

jest.mock('react-dnd-html5-backend', () => ({
  HTML5Backend: {},
}));

// Mock Zustand stores
jest.mock('@/lib/stores/outline-store', () => ({
  useOutlineStore: jest.fn(() => ({
    nodes: [],
    selectedNodes: [],
    detailLevel: 'medium',
    addNode: jest.fn(),
    removeNode: jest.fn(),
    reorderNodes: jest.fn(),
    clearNodes: jest.fn(),
    setDetailLevel: jest.fn(),
    toggleNodeSelection: jest.fn(),
  })),
}), { virtual: true });

// Mock AI providers
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn(() => ({
      generateContent: jest.fn(() => Promise.resolve({
        response: {
          text: jest.fn(() => 'Mocked AI response'),
        },
      })),
    })),
  })),
}));

jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(() => Promise.resolve({
          choices: [{
            message: {
              content: 'Mocked OpenAI response',
            },
          }],
        })),
      },
    },
  })),
}));

// Setup globals for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock fetch for API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
);

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Console error suppression for known issues
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
       args[0].includes('Warning: findDOMNode is deprecated'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  sessionStorageMock.getItem.mockClear();
  sessionStorageMock.setItem.mockClear();
  sessionStorageMock.removeItem.mockClear();
  sessionStorageMock.clear.mockClear();
});
