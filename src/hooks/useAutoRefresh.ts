import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface UseAutoRefreshOptions {
  /** Refresh interval in milliseconds (default: 30000 = 30 seconds) */
  interval?: number;
  /** Whether auto-refresh is enabled (default: true) */
  enabled?: boolean;
  /** Query keys to invalidate on refresh */
  queryKeys?: string[][];
}

/**
 * Hook to periodically refresh data at a specified interval.
 */
export function useAutoRefresh({
  interval = 30000,
  enabled = true,
  queryKeys = [['locations']],
}: UseAutoRefreshOptions = {}) {
  const queryClient = useQueryClient();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      console.log('Auto-refreshing locations...');
      queryKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, interval, queryClient, queryKeys]);
}
