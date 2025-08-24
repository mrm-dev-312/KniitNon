// Bring in jest-dom matchers so expect(...).toBeInTheDocument() etc are typed
import '@testing-library/jest-dom';

// Import the ESM globals from Jest with distinct names so we can re-declare them as true globals
// Rely on @types/jest for globals; this file only ensures jest-dom is loaded for type augmentation.

// Declare Jest globals for test environment
declare global {
  var describe: jest.Describe;
  var it: jest.It;
  var test: jest.It;
  var expect: jest.Expect;
  var beforeEach: jest.Lifecycle;
  var afterEach: jest.Lifecycle;
  var beforeAll: jest.Lifecycle;
  var afterAll: jest.Lifecycle;
  var jest: jest.Jest;
  
  namespace jest {
    interface Jest {
      fn<T extends (...args: any[]) => any>(implementation?: T): MockedFunction<T>;
      fn(): MockedFunction<(...args: any[]) => any>;
      mock(moduleName: string, factory?: () => any, options?: any): typeof jest;
      clearAllMocks(): typeof jest;
    }
    
    interface MockedFunction<T extends (...args: any[]) => any> {
      (...args: Parameters<T>): ReturnType<T>;
      mockResolvedValue(value: any): this;
      mockResolvedValueOnce(value: any): this;
      mockRejectedValue(value: any): this;
      mockRejectedValueOnce(value: any): this;
      mockReturnValue(value: any): this;
      mockReturnValueOnce(value: any): this;
      mockReset(): this;
      mockClear(): this;
      mockRestore(): void;
      mockImplementation(fn: T): this;
      mock: {
        calls: any[][];
      };
    }
    
    interface Mock<T = any, Y extends any[] = any> extends MockedFunction<(...args: Y) => T> {}
  }
}

export {}; // treated as a module so imports stay scoped
