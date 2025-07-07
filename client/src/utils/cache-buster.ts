/**
 * Cache busting utilities to handle stale asset issues
 */

export const cacheBuster = {
  /**
   * Clear all caches and reload the page
   */
  async hardRefresh() {
    try {
      // Clear service worker caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }

      // Unregister service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(registration => registration.unregister())
        );
      }

      // Force reload without cache
      window.location.reload();
    } catch (error) {
      console.error('Error during cache clear:', error);
      // Fallback to simple reload
      window.location.reload();
    }
  },

  /**
   * Check if assets are stale and prompt user to refresh
   */
  async checkForStaleAssets() {
    try {
      // Check if we're getting 404s for expected assets
      const response = await fetch('/assets/', { method: 'HEAD' });
      if (!response.ok) {
        console.warn('Assets may be stale, considering refresh');
        return true;
      }
      return false;
    } catch (error) {
      console.warn('Could not check asset freshness:', error);
      return false;
    }
  },

  /**
   * Add cache-busting parameters to URLs
   */
  bustUrl(url: string): string {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${Date.now()}`;
  },

  /**
   * Setup error handlers for failed module loads
   */
  setupErrorHandlers() {
    // Handle script loading errors
    window.addEventListener('error', (event) => {
      if (event.target && 'src' in event.target) {
        const src = (event.target as HTMLScriptElement).src;
        if (src && src.includes('/assets/') && src.includes('.js')) {
          console.error('Failed to load JS asset:', src);
          console.info('This may be due to cached assets. Try clearing cache.');
        }
      }
    });

    // Handle unhandled promise rejections that might be module load failures
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason && typeof event.reason === 'string') {
        if (event.reason.includes('Failed to fetch dynamically imported module') ||
            event.reason.includes('Loading chunk')) {
          console.error('Module loading failed:', event.reason);
          console.info('This may be due to cached assets. Try clearing cache.');
        }
      }
    });
  }
};

// Auto-setup error handlers when this module is imported
if (typeof window !== 'undefined') {
  cacheBuster.setupErrorHandlers();
}