import { useCallback, useEffect, useRef, useState } from "react";

// How many pixels from the bottom of the container to enable auto-scroll
const ACTIVATION_THRESHOLD = 50;
// Minimum pixels of scroll-up movement required to disable auto-scroll
const MIN_SCROLL_UP_THRESHOLD = 10;
// Throttle scroll events to prevent excessive calculations
const SCROLL_THROTTLE_MS = 16; // ~60fps

export function useAutoScroll(dependencies: React.DependencyList) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previousScrollTop = useRef<number | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, []);

  const handleScroll = useCallback(() => {
    // Throttle scroll events to prevent excessive calculations
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      if (containerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;

        const distanceFromBottom = Math.abs(
          scrollHeight - scrollTop - clientHeight
        );

        const isScrollingUp = previousScrollTop.current
          ? scrollTop < previousScrollTop.current
          : false;

        const scrollUpDistance = previousScrollTop.current
          ? previousScrollTop.current - scrollTop
          : 0;

        const isDeliberateScrollUp =
          isScrollingUp && scrollUpDistance > MIN_SCROLL_UP_THRESHOLD;

        if (isDeliberateScrollUp) {
          setShouldAutoScroll(false);
        } else {
          const isScrolledToBottom = distanceFromBottom < ACTIVATION_THRESHOLD;
          setShouldAutoScroll(isScrolledToBottom);
        }

        previousScrollTop.current = scrollTop;
      }
    }, SCROLL_THROTTLE_MS);
  }, []);

  const handleTouchStart = useCallback(() => {
    setShouldAutoScroll(false);
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      previousScrollTop.current = containerRef.current.scrollTop;
    }
  }, []);

  useEffect(() => {
    if (shouldAutoScroll) {
      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return {
    containerRef,
    scrollToBottom,
    handleScroll,
    shouldAutoScroll,
    handleTouchStart,
  };
}
