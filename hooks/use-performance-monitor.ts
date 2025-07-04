import { useCallback, useEffect, useRef } from "react";

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage?: number;
  frameRate: number;
}

interface PerformanceMonitorOptions {
  enableLogging?: boolean;
  warningThreshold?: number; // ms
  onPerformanceWarning?: (metrics: PerformanceMetrics) => void;
}

export function usePerformanceMonitor(options: PerformanceMonitorOptions = {}) {
  const {
    enableLogging = false,
    warningThreshold = 16, // 60fps = 16.67ms per frame
    onPerformanceWarning,
  } = options;

  const renderStartRef = useRef<number>(0);
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());
  const performanceObserverRef = useRef<PerformanceObserver | null>(null);

  const startRenderMeasurement = useCallback(() => {
    renderStartRef.current = performance.now();
  }, []);

  const endRenderMeasurement = useCallback(
    (componentName?: string) => {
      const renderTime = performance.now() - renderStartRef.current;

      if (renderTime > warningThreshold) {
        const metrics: PerformanceMetrics = {
          renderTime,
          frameRate: 1000 / renderTime,
          memoryUsage: (
            performance as unknown as { memory?: { usedJSHeapSize: number } }
          ).memory?.usedJSHeapSize,
        };

        if (enableLogging) {
          console.warn(
            `Performance warning${
              componentName ? ` in ${componentName}` : ""
            }: Render took ${renderTime.toFixed(2)}ms`,
            metrics
          );
        }

        onPerformanceWarning?.(metrics);
      }

      return renderTime;
    },
    [warningThreshold, enableLogging, onPerformanceWarning]
  );

  const measureFrameRate = useCallback(() => {
    const now = performance.now();
    const deltaTime = now - lastFrameTimeRef.current;
    lastFrameTimeRef.current = now;
    frameCountRef.current++;

    const fps = 1000 / deltaTime;

    if (fps < 30 && enableLogging) {
      // Warn if FPS drops below 30
      console.warn(`Low FPS detected: ${fps.toFixed(1)} fps`);
    }

    return fps;
  }, [enableLogging]);

  const throttle = useCallback(
    <T extends (...args: unknown[]) => unknown>(func: T, limit: number): T => {
      let inThrottle: boolean;
      return ((...args: unknown[]) => {
        if (!inThrottle) {
          func(...args);
          inThrottle = true;
          setTimeout(() => (inThrottle = false), limit);
        }
      }) as T;
    },
    []
  );

  const debounce = useCallback(
    <T extends (...args: unknown[]) => unknown>(func: T, delay: number): T => {
      let timeoutId: NodeJS.Timeout;
      return ((...args: unknown[]) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
      }) as T;
    },
    []
  );

  // Monitor long tasks
  useEffect(() => {
    if (typeof PerformanceObserver !== "undefined") {
      performanceObserverRef.current = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.duration > 50) {
            // Long task threshold
            if (enableLogging) {
              console.warn(
                `Long task detected: ${entry.duration.toFixed(2)}ms`,
                entry
              );
            }
            onPerformanceWarning?.({
              renderTime: entry.duration,
              frameRate: 1000 / entry.duration,
            });
          }
        });
      });

      try {
        performanceObserverRef.current.observe({ entryTypes: ["longtask"] });
      } catch {
        // Long task API not supported
        if (enableLogging) {
          console.info("Long task monitoring not supported in this browser");
        }
      }
    }

    return () => {
      if (performanceObserverRef.current) {
        performanceObserverRef.current.disconnect();
      }
    };
  }, [enableLogging, onPerformanceWarning]);

  return {
    startRenderMeasurement,
    endRenderMeasurement,
    measureFrameRate,
    throttle,
    debounce,
  };
}
