import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { cacheBuster } from '@/utils/cache-buster';

export function CacheManager() {
  const [showCacheWarning, setShowCacheWarning] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Check for stale assets on mount
    const checkAssets = async () => {
      const isStale = await cacheBuster.checkForStaleAssets();
      if (isStale) {
        setShowCacheWarning(true);
      }
    };

    checkAssets();

    // Listen for specific error patterns that indicate cache issues
    const handleError = (event: ErrorEvent) => {
      if (event.message && (
        event.message.includes('Loading chunk') ||
        event.message.includes('Failed to fetch dynamically imported module') ||
        event.filename?.includes('/assets/') ||
        event.filename?.includes('.js')
      )) {
        setShowCacheWarning(true);
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await cacheBuster.hardRefresh();
  };

  if (!showCacheWarning) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg max-w-sm">
      <div className="flex items-start space-x-3">
        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-yellow-800">
            App Update Available
          </h3>
          <p className="text-sm text-yellow-700 mt-1">
            Your browser has cached old files. Please refresh to get the latest version.
          </p>
          <div className="mt-3 flex space-x-2">
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              size="sm"
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Refresh Now
                </>
              )}
            </Button>
            <Button
              onClick={() => setShowCacheWarning(false)}
              variant="ghost"
              size="sm"
              className="text-yellow-700 hover:text-yellow-800"
            >
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}