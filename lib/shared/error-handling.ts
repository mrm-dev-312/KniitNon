/**
 * Centralized Error Handling and Logging Utilities for KniitNon
 * 
 * This module provides consistent error handling, logging, and user-friendly
 * error messages across the application.
 */

// Custom error types for different scenarios
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, APIError);
    }
  }
}

export class ValidationError extends APIError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends APIError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends APIError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends APIError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends APIError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT_ERROR', details);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends APIError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

export class ExternalServiceError extends APIError {
  constructor(service: string, originalError?: Error) {
    super(`External service error: ${service}`, 502, 'EXTERNAL_SERVICE_ERROR', {
      service,
      originalError: originalError?.message
    });
    this.name = 'ExternalServiceError';
  }
}

// Log levels
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

// Logger interface
interface LogMeta {
  [key: string]: any;
}

// Environment-aware logger
class Logger {
  private level: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.level = this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.level;
  }

  private formatMessage(level: string, message: string, meta?: LogMeta): string {
    const timestamp = new Date().toISOString();
    const baseMessage = `[${level}] ${timestamp}: ${message}`;
    
    if (meta && Object.keys(meta).length > 0) {
      return `${baseMessage}\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return baseMessage;
  }

  error(message: string, meta?: LogMeta): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage('ERROR', message, meta));
    }
  }

  warn(message: string, meta?: LogMeta): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', message, meta));
    }
  }

  info(message: string, meta?: LogMeta): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage('INFO', message, meta));
    }
  }

  debug(message: string, meta?: LogMeta): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage('DEBUG', message, meta));
    }
  }

  // API request logging
  request(method: string, url: string, duration?: number, status?: number): void {
    const meta: LogMeta = { method, url };
    if (duration !== undefined) meta.duration = `${duration}ms`;
    if (status !== undefined) meta.status = status;
    
    this.info(`API Request: ${method} ${url}`, meta);
  }

  // User action logging
  userAction(action: string, userId?: string, meta?: LogMeta): void {
    this.info(`User Action: ${action}`, { userId, ...meta });
  }

  // Performance logging
  performance(operation: string, duration: number, meta?: LogMeta): void {
    const level = duration > 1000 ? LogLevel.WARN : LogLevel.INFO;
    const message = `Performance: ${operation} took ${duration}ms`;
    
    if (level === LogLevel.WARN) {
      this.warn(message, meta);
    } else {
      this.info(message, meta);
    }
  }
}

// Export singleton logger instance
export const logger = new Logger();

// Error response formatter for API routes
export function formatErrorResponse(error: Error) {
  if (error instanceof APIError) {
    return {
      error: {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        ...(error.details && { details: error.details })
      }
    };
  }

  // Log unexpected errors
  logger.error('Unexpected error occurred', {
    message: error.message,
    stack: error.stack,
    name: error.name
  });

  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    error: {
      message: isDevelopment ? error.message : 'Internal server error',
      code: 'INTERNAL_ERROR',
      statusCode: 500,
      ...(isDevelopment && { stack: error.stack })
    }
  };
}

// Next.js API route error handler wrapper
export function withErrorHandler(handler: Function) {
  return async (req: any, res: any) => {
    try {
      const startTime = Date.now();
      const result = await handler(req, res);
      const duration = Date.now() - startTime;
      
      logger.request(req.method, req.url, duration, res.statusCode);
      
      return result;
    } catch (error: any) {
      const response = formatErrorResponse(error);
      const statusCode = error instanceof APIError ? error.statusCode : 500;
      
      logger.request(req.method, req.url, undefined, statusCode);
      
      return res.status(statusCode).json(response);
    }
  };
}

// Client-side error boundary utility
export function logClientError(error: Error, errorInfo?: any) {
  logger.error('Client-side error occurred', {
    message: error.message,
    stack: error.stack,
    componentStack: errorInfo?.componentStack,
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
    url: typeof window !== 'undefined' ? window.location.href : undefined
  });
}

// Promise error wrapper for async operations
export async function withErrorLogging<T>(
  operation: () => Promise<T>,
  operationName: string,
  meta?: LogMeta
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await operation();
    const duration = Date.now() - startTime;
    
    logger.performance(operationName, duration, meta);
    
    return result;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    logger.error(`Operation failed: ${operationName}`, {
      duration: `${duration}ms`,
      error: error.message,
      ...meta
    });
    
    throw error;
  }
}

// Validation helper
export function validateRequired(value: any, fieldName: string): void {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError(`${fieldName} is required`);
  }
}

export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format');
  }
}

export function validateLength(value: string, fieldName: string, min: number, max?: number): void {
  if (value.length < min) {
    throw new ValidationError(`${fieldName} must be at least ${min} characters long`);
  }
  if (max && value.length > max) {
    throw new ValidationError(`${fieldName} must be no more than ${max} characters long`);
  }
}

// Rate limiting helper
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(identifier: string, maxRequests: number, windowMs: number): void {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  const current = rateLimitMap.get(identifier);
  
  if (!current || current.resetTime < windowStart) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return;
  }
  
  if (current.count >= maxRequests) {
    throw new RateLimitError(`Rate limit exceeded. Try again in ${Math.ceil((current.resetTime - now) / 1000)} seconds`);
  }
  
  current.count++;
}

// User-friendly error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Unable to connect to the server. Please check your internet connection and try again.',
  TIMEOUT_ERROR: 'The request took too long to complete. Please try again.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  AUTHENTICATION_ERROR: 'Please sign in to continue.',
  AUTHORIZATION_ERROR: 'You don\'t have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'Something went wrong on our end. Please try again later.',
  RATE_LIMIT: 'You\'re making requests too quickly. Please slow down and try again.',
} as const;

// Get user-friendly error message
export function getUserFriendlyErrorMessage(error: Error): string {
  if (error instanceof APIError) {
    switch (error.code) {
      case 'VALIDATION_ERROR':
        return ERROR_MESSAGES.VALIDATION_ERROR;
      case 'AUTHENTICATION_ERROR':
        return ERROR_MESSAGES.AUTHENTICATION_ERROR;
      case 'AUTHORIZATION_ERROR':
        return ERROR_MESSAGES.AUTHORIZATION_ERROR;
      case 'NOT_FOUND':
        return ERROR_MESSAGES.NOT_FOUND;
      case 'RATE_LIMIT_EXCEEDED':
        return ERROR_MESSAGES.RATE_LIMIT;
      case 'EXTERNAL_SERVICE_ERROR':
        return 'Unable to connect to external service. Please try again later.';
      default:
        return error.message;
    }
  }
  
  // Check for common browser errors
  if (error.message.includes('fetch')) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }
  
  if (error.message.includes('timeout')) {
    return ERROR_MESSAGES.TIMEOUT_ERROR;
  }
  
  return ERROR_MESSAGES.SERVER_ERROR;
}
