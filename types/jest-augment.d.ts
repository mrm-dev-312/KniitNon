// Additional Jest testing conveniences & matcher typings
import '@testing-library/jest-dom';

declare global {
  // Some tests call fail('message') – provide typing
  function fail(message?: string): never;
}

declare namespace jest {
  // Loosen mock method argument typing to avoid 'never' inference friction in ad-hoc mocks
  interface Mock<TArgs extends any[] = any, TReturn = any> {
    mockResolvedValue(value: any): this;
    mockResolvedValueOnce(value: any): this;
    mockRejectedValue(value: any): this;
    mockRejectedValueOnce(value: any): this;
    mockReturnValue(value: any): this;
    mockReturnValueOnce(value: any): this;
  }

  // Minimal matcher augmentations (in case jest-dom types not picked up for some reason)
  interface Matchers<R = any> {
    toBeInTheDocument(): R;
    toHaveValue(value?: any): R;
    toBeDisabled(): R;
  }
}

export {};