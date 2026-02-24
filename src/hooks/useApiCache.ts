import { useCallback, useState, useEffect } from "react";
import {
  getCacheStats,
  clearAllCache,
  invalidateDocumentCache,
  forceRefreshDocument,
  forceRefreshDocumentList,
  debugCache,
} from "../services/api";

interface CacheStats {
  size: number;
  maxSize: number;
}

export function useApiCache() {
  const [cacheStats, setCacheStats] = useState<CacheStats>({
    size: 0,
    maxSize: 100,
  });
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const refreshStats = useCallback(() => {
    const stats = getCacheStats();
    setCacheStats(stats);
    setLastRefresh(new Date());
  }, []);

  const clearCache = useCallback(() => {
    clearAllCache();
    refreshStats();
  }, [refreshStats]);

  const invalidateDocument = useCallback(
    (documentId?: string) => {
      invalidateDocumentCache(documentId);
      refreshStats();
    },
    [refreshStats]
  );

  const refreshDocument = useCallback(
    (documentId: string) => {
      forceRefreshDocument(documentId);
      refreshStats();
    },
    [refreshStats]
  );

  const refreshDocumentList = useCallback(() => {
    forceRefreshDocumentList();
    refreshStats();
  }, [refreshStats]);

  const debug = useCallback(() => {
    debugCache();
    refreshStats();
  }, [refreshStats]);

  // Auto-refresh stats every 30 seconds
  useEffect(() => {
    refreshStats();
    const interval = setInterval(refreshStats, 30000);
    return () => clearInterval(interval);
  }, [refreshStats]);

  return {
    cacheStats,
    lastRefresh,
    clearCache,
    invalidateDocument,
    refreshDocument,
    refreshDocumentList,
    debug,
    refreshStats,
  };
}
