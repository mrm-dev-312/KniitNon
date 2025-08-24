import '@testing-library/jest-dom';

// This file is imported by jest.config.js to set up Jest environment
// It includes Jest DOM matchers like toBeInTheDocument()

// Extend global expect with jest-dom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toBeDisabled(): R;
      toHaveValue(value?: any): R;
      toBeVisible(): R;
      toBeChecked(): R;
    }
  }
}

// Mock Next.js
jest.mock('next/router', () => require('next-router-mock'));
jest.mock('next/navigation', () => ({
  useRouter: () => require('next-router-mock').useRouter(),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

// Global fetch mock setup
global.fetch = jest.fn();

// Basic Response/Request polyfills if not present (jsdom minimal)
if (typeof Response === 'undefined') {
  (global as any).Response = class {
    body: any;
    ok: boolean;
    status: number;
    private _json: any;
    constructor(body: any = {}, init: any = { status: 200 }) {
      this.body = body;
      this.status = init.status ?? 200;
      this.ok = this.status >= 200 && this.status < 300;
      this._json = body;
    }
    async json() { return this._json; }
    async text() { return typeof this._json === 'string' ? this._json : JSON.stringify(this._json); }
    
    // Static json() method for NextResponse.json() compatibility
    static json(data: any, init?: any) {
      return new this(data, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
    }
  } as any;
}
if (typeof Request === 'undefined') {
  (global as any).Request = class { constructor(public input: any, public init?: any) {} } as any;
}

// Mock NextResponse for API route tests
if (typeof (global as any).NextResponse === 'undefined') {
  (global as any).NextResponse = {
    json: (data: any, init?: any) => {
      const response = new (global as any).Response(data, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
      return response;
    }
  };
}

// Mock Headers for API route tests
if (typeof Headers === 'undefined') {
  (global as any).Headers = class {
    private map = new Map();
    constructor(init?: any) {
      if (init) {
        if (typeof init === 'object') {
          for (const [key, value] of Object.entries(init)) {
            this.map.set(key.toLowerCase(), value);
          }
        }
      }
    }
    get(name: string) { return this.map.get(name.toLowerCase()) || null; }
    set(name: string, value: string) { this.map.set(name.toLowerCase(), value); }
    has(name: string) { return this.map.has(name.toLowerCase()); }
    delete(name: string) { return this.map.delete(name.toLowerCase()); }
    forEach(callback: (value: string, key: string) => void) {
      this.map.forEach((value, key) => callback(value, key));
    }
    *[Symbol.iterator]() {
      for (const [key, value] of this.map) {
        yield [key, value];
      }
    }
  } as any;
}

// Mock NextRequest for API route tests
if (typeof (global as any).NextRequest === 'undefined') {
  (global as any).NextRequest = class {
    public url: string;
    public method: string;
    public headers: any;
    public cookies: any;
    private body: string | null;
    
    constructor(input: string, init?: any) {
      this.url = input;
      this.method = init?.method || 'GET';
      this.headers = new (global as any).Headers(init?.headers);
      this.body = init?.body || null;
      
      // Mock cookies object
      this.cookies = {
        get: () => null,
        set: () => {},
        delete: () => {},
        has: () => false,
        getAll: () => [],
      };
    }
    
    async json() {
      return this.body ? JSON.parse(this.body) : {};
    }
  } as any;
}
