'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  title: string;
  message?: string;
  type: ToastType;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => string;
  hideToast: (id: string) => void;
  clearAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: React.ReactNode;
  maxToasts?: number;
  defaultDuration?: number;
}

export function ToastProvider({ 
  children, 
  maxToasts = 5, 
  defaultDuration = 5000 
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? defaultDuration,
    };

    setToasts(prev => {
      const updated = [newToast, ...prev];
      return updated.slice(0, maxToasts);
    });

    // Auto-remove toast after duration (unless persistent)
    if (!newToast.persistent && (newToast.duration || 0) > 0) {
      setTimeout(() => {
        hideToast(id);
      }, newToast.duration || defaultDuration);
    }

    return id;
  }, [maxToasts, defaultDuration]);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, hideToast, clearAll }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  const { showToast, hideToast, clearAll } = context;

  // Convenience methods for different toast types
  const success = useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    return showToast({ ...options, title, message, type: 'success' });
  }, [showToast]);

  const error = useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    return showToast({ ...options, title, message, type: 'error', persistent: true });
  }, [showToast]);

  const warning = useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    return showToast({ ...options, title, message, type: 'warning' });
  }, [showToast]);

  const info = useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    return showToast({ ...options, title, message, type: 'info' });
  }, [showToast]);

  // Promise-based toasts for async operations
  const promise = useCallback(<T,>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((result: T) => string);
      error: string | ((error: Error) => string);
    }
  ): Promise<T> => {
    const loadingId = showToast({
      title: options.loading,
      type: 'info',
      persistent: true,
    });

    return promise
      .then((result) => {
        hideToast(loadingId);
        const successMessage = typeof options.success === 'function' 
          ? options.success(result) 
          : options.success;
        success(successMessage);
        return result;
      })
      .catch((err) => {
        hideToast(loadingId);
        const errorMessage = typeof options.error === 'function' 
          ? options.error(err) 
          : options.error;
        error(errorMessage);
        throw err;
      });
  }, [showToast, hideToast, success, error]);

  return {
    success,
    error,
    warning,
    info,
    promise,
    show: showToast,
    hide: hideToast,
    clearAll,
  };
}

function ToastContainer() {
  const { toasts } = useContext(ToastContext)!;

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
}

function ToastItem({ toast }: ToastItemProps) {
  const { hideToast } = useContext(ToastContext)!;
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  React.useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = useCallback(() => {
    setIsRemoving(true);
    setTimeout(() => hideToast(toast.id), 200); // Wait for animation
  }, [toast.id, hideToast]);

  const getToastStyles = () => {
    const baseStyles = "min-w-[300px] max-w-md p-4 rounded-lg shadow-lg border backdrop-blur-sm transition-all duration-200 transform";
    
    const typeStyles = {
      success: "bg-green-50 border-green-200 text-green-800",
      error: "bg-red-50 border-red-200 text-red-800",
      warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
      info: "bg-blue-50 border-blue-200 text-blue-800",
    };

    const visibilityStyles = isRemoving 
      ? "translate-x-full opacity-0"
      : isVisible 
        ? "translate-x-0 opacity-100"
        : "translate-x-full opacity-0";

    return `${baseStyles} ${typeStyles[toast.type]} ${visibilityStyles}`;
  };

  const getIcon = () => {
    const iconProps = { className: "w-5 h-5 mr-3 flex-shrink-0" };
    
    switch (toast.type) {
      case 'success':
        return <CheckCircle {...iconProps} className="w-5 h-5 mr-3 flex-shrink-0 text-green-600" />;
      case 'error':
        return <AlertCircle {...iconProps} className="w-5 h-5 mr-3 flex-shrink-0 text-red-600" />;
      case 'warning':
        return <AlertTriangle {...iconProps} className="w-5 h-5 mr-3 flex-shrink-0 text-yellow-600" />;
      case 'info':
        return <Info {...iconProps} className="w-5 h-5 mr-3 flex-shrink-0 text-blue-600" />;
      default:
        return null;
    }
  };

  return (
    <div className={getToastStyles()}>
      <div className="flex items-start">
        {getIcon()}
        
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm mb-1">
            {toast.title}
          </div>
          
          {toast.message && (
            <div className="text-sm opacity-90">
              {toast.message}
            </div>
          )}
          
          {toast.action && (
            <div className="mt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={toast.action.onClick}
                className="text-xs"
              >
                {toast.action.label}
              </Button>
            </div>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="p-1 h-6 w-6 ml-2 opacity-70 hover:opacity-100"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

// Utility functions for common toast scenarios
export const toastUtils = {
  // Network request helpers
  networkError: (error?: string) => ({
    title: 'Network Error',
    message: error || 'Please check your internet connection and try again.',
    type: 'error' as ToastType,
    persistent: true,
  }),

  // Validation helpers
  validationError: (field: string, message: string) => ({
    title: `Invalid ${field}`,
    message,
    type: 'warning' as ToastType,
  }),

  // Success scenarios
  saved: (item: string = 'Changes') => ({
    title: 'Saved Successfully',
    message: `${item} have been saved.`,
    type: 'success' as ToastType,
  }),

  deleted: (item: string) => ({
    title: 'Deleted',
    message: `${item} has been deleted successfully.`,
    type: 'success' as ToastType,
  }),

  copied: (item: string = 'Content') => ({
    title: 'Copied',
    message: `${item} copied to clipboard.`,
    type: 'info' as ToastType,
    duration: 2000,
  }),

  // Loading scenarios
  loading: (action: string) => ({
    title: 'Loading...',
    message: `${action} in progress.`,
    type: 'info' as ToastType,
    persistent: true,
  }),

  // Authentication
  loginSuccess: () => ({
    title: 'Welcome back!',
    message: 'You have been successfully logged in.',
    type: 'success' as ToastType,
  }),

  loginError: () => ({
    title: 'Login Failed',
    message: 'Please check your credentials and try again.',
    type: 'error' as ToastType,
    persistent: true,
  }),

  sessionExpired: () => ({
    title: 'Session Expired',
    message: 'Please log in again to continue.',
    type: 'warning' as ToastType,
    persistent: true,
  }),
};
