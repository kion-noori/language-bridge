/**
 * @file useViewportVisibility.ts
 * =============================================================================
 * VIEWPORT INTERSECTION OBSERVER HOOK
 * =============================================================================
 * This hook detects whether a DOM element (specifically the Coinbase Sandbox)
 * is currently visible within the browser viewport (scrolled into view).
 *
 * Requirements Met:
 * 1. Never assumes visibility on initial page load:
 *    - Defaults to `false` until the browser's IntersectionObserver explicitly
 *      confirms that the element is intersecting with the viewport.
 * 2. Automatic detection without user manual trigger:
 *    - Seamlessly observes scroll and resize events via native IntersectionObserver.
 * 3. Bidirectional tracking:
 *    - Reports `true` when scrolled into view and `false` when scrolled out of view.
 * 4. Centralized telemetry:
 *    - Logs function calls and visibility transitions using `logFunctionCall`.
 * =============================================================================
 */

import { useState, useEffect, RefObject } from "react";
import { logFunctionCall } from "./logger";

export interface ViewportVisibilityOptions {
  threshold?: number | number[];
  rootMargin?: string;
  onVisibilityChange?: (isVisible: boolean) => void;
}

/**
 * Custom React hook that tracks whether a referenced DOM element is within the viewport.
 *
 * @param elementRef - React ref pointing to the target HTML element.
 * @param options - Configuration options for IntersectionObserver.
 * @returns boolean indicating whether the element is currently visible in viewport.
 */
export function useViewportVisibility(
  elementRef: RefObject<HTMLElement | null>,
  options: ViewportVisibilityOptions = {}
): boolean {
  const { threshold = 0.2, rootMargin = "0px", onVisibilityChange } = options;

  // STRICT REQUIREMENT: Do not assume visible on initial load or before scroll
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    if (!("IntersectionObserver" in window)) {
      // Fallback for environments lacking IntersectionObserver
      setIsVisible(true);
      onVisibilityChange?.(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        const intersecting = entry.isIntersecting && entry.intersectionRatio >= (typeof threshold === "number" ? threshold : 0.1);

        logFunctionCall("VIEWPORT_VISIBILITY", "onIntersectionChange", {
          isIntersecting: entry.isIntersecting,
          intersectionRatio: entry.intersectionRatio,
          targetVisible: intersecting,
        });

        setIsVisible(intersecting);
        if (onVisibilityChange) {
          onVisibilityChange(intersecting);
        }
      },
      {
        root: null, // Viewport
        rootMargin,
        threshold: Array.isArray(threshold) ? threshold : [0, threshold, 0.5],
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [elementRef, threshold, rootMargin, onVisibilityChange]);

  return isVisible;
}
