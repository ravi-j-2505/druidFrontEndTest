import React from "react";
import { useApiCache } from "../hooks/useApiCache";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

export function CacheManager() {
  const {
    cacheStats,
    lastRefresh,
    clearCache,
    refreshDocumentList,
    debug,
    refreshStats,
  } = useApiCache();

  const cacheUtilization = (cacheStats.size / cacheStats.maxSize) * 100;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          API Cache Manager
          <Badge variant={cacheUtilization > 80 ? "destructive" : "secondary"}>
            {cacheStats.size}/{cacheStats.maxSize}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Cache Utilization:</span>
            <span>{cacheUtilization.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                cacheUtilization > 80
                  ? "bg-red-500"
                  : cacheUtilization > 60
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }`}
              style={{ width: `${cacheUtilization}%` }}
            />
          </div>
        </div>

        <div className="text-sm text-gray-600">
          Last updated: {lastRefresh.toLocaleTimeString()}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={refreshStats}>
            Refresh Stats
          </Button>
          <Button variant="outline" size="sm" onClick={refreshDocumentList}>
            Refresh List
          </Button>
          <Button variant="outline" size="sm" onClick={debug}>
            Debug
          </Button>
          <Button variant="destructive" size="sm" onClick={clearCache}>
            Clear All
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
