import { useCallback, useRef, useEffect } from "react";

interface StreamingOptimizationOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeoutMs?: number;
}

export function useStreamingOptimization(
  options: StreamingOptimizationOptions = {}
) {
  const { maxRetries = 3, retryDelay = 1000, timeoutMs = 60000 } = options;

  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const createAbortController = useCallback(() => {
    // Clean up existing controller
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new controller
    abortControllerRef.current = new AbortController();
    return abortControllerRef.current;
  }, []);

  const setRequestTimeout = useCallback(
    (onTimeout: () => void) => {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          onTimeout();
        }
      }, timeoutMs);

      // Return cleanup function
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };
    },
    [timeoutMs]
  );

  const handleRetry = useCallback(
    async (retryFn: () => Promise<void>) => {
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;

        // Wait before retrying
        await new Promise((resolve) =>
          setTimeout(resolve, retryDelay * retryCountRef.current)
        );

        try {
          await retryFn();
          retryCountRef.current = 0; // Reset on success
        } catch (error) {
          console.warn(`Retry ${retryCountRef.current} failed:`, error);
          if (retryCountRef.current >= maxRetries) {
            throw new Error(`Max retries (${maxRetries}) exceeded`);
          }
        }
      }
    },
    [maxRetries, retryDelay]
  );

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    retryCountRef.current = 0;
  }, []);

  const reset = useCallback(() => {
    abort();
    retryCountRef.current = 0;
  }, [abort]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abort();
    };
  }, [abort]);

  return {
    createAbortController,
    setRequestTimeout,
    handleRetry,
    abort,
    reset,
    retryCount: retryCountRef.current,
  };
}
