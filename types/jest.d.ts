import '@testing-library/jest-dom'

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R
      toBeVisible(): R
      toBeEmpty(): R
      toBeDisabled(): R
      toBeEnabled(): R
      toBeInvalid(): R
      toBeRequired(): R
      toBeValid(): R
      toBeChecked(): R
      toBePartiallyChecked(): R
      toHaveAttribute(attr: string, value?: any): R
      toHaveClass(...classNames: string[]): R
      toHaveFocus(): R
      toHaveFormValues(expectedValues: Record<string, any>): R
      toHaveStyle(css: Record<string, any> | string): R
      toHaveTextContent(text: string | RegExp, options?: { normalizeWhitespace: boolean }): R
      toHaveValue(value: string | string[] | number): R
      toHaveDisplayValue(value: string | RegExp | (string | RegExp)[]): R
      toBeChecked(): R
      toHaveLength(length: number): R
      toContain(item: any): R
      toBe(value: any): R
      toEqual(value: any): R
      toBeDefined(): R
      toBeNull(): R
      toBeUndefined(): R
      toBeTruthy(): R
      toBeFalsy(): R
      toHaveBeenCalled(): R
      toHaveBeenCalledWith(...args: any[]): R
      toHaveBeenCalledTimes(times: number): R
      toHaveBeenLastCalledWith(...args: any[]): R
      toHaveBeenNthCalledWith(nthCall: number, ...args: any[]): R
      toHaveProperty(keyPath: string, value?: any): R
      toMatchSnapshot(propertyMatchers?: any, hint?: string): R
      toMatchInlineSnapshot(inlineSnapshot?: string, propertyMatchers?: any): R
      toThrow(error?: string | Constructable | RegExp | Error): R
      toThrowErrorMatchingSnapshot(hint?: string): R
      toThrowErrorMatchingInlineSnapshot(inlineSnapshot?: string): R
    }
  }
}
