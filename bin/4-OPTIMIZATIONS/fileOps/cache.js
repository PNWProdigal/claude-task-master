/**
 * File Operations Caching
 * Provides caching mechanisms for file operations
 */

// Cache for file operation results
const opsCache = new Map();

/**
 * Creates caching layer for file operations
 * @param {Object} originalOps - Original file operation methods
 * @param {Object} options - Enhancement options
 * @returns {Object} Enhanced file operations with caching
 */
export function createCache(originalOps, options = {}) {
  const enhancedOps = { ...originalOps };
  const { cacheEnabled = true, cacheTTL = 5000 } = options;
  
  if (!cacheEnabled) {
    return enhancedOps;
  }
  
  // Add caching to applicable operations
  if (typeof enhancedOps.readFile === 'function') {
    const originalReadFile = enhancedOps.readFile;
    enhancedOps.readFile = (path, options, callback) => {
      // Handle different argument patterns
      if (typeof options === 'function') {
        callback = options;
        options = undefined;
      }
      
      const cacheKey = `readFile_${path}_${JSON.stringify(options)}`;
      if (opsCache.has(cacheKey)) {
        const { data, timestamp } = opsCache.get(cacheKey);
        const now = Date.now();
        
        if (now - timestamp < cacheTTL) {
          // Return cached data
          if (typeof callback === 'function') {
            // Async version
            process.nextTick(() => callback(null, data));
            return;
          } else {
            // Sync version
            return data;
          }
        }
      }
      
      // Call original function if cache miss or expired
      if (typeof callback === 'function') {
        // Async version
        return originalReadFile(path, options, (err, data) => {
          if (!err) {
            // Cache successful results
            opsCache.set(cacheKey, {
              data,
              timestamp: Date.now()
            });
          }
          callback(err, data);
        });
      } else {
        // Sync version
        try {
          const data = originalReadFile(path, options);
          opsCache.set(cacheKey, {
            data,
            timestamp: Date.now()
          });
          return data;
        } catch (error) {
          throw error;
        }
      }
    };
  }
  
  // Add other cacheable operations as needed...
  
  // Maintain cache size
  setInterval(() => {
    if (opsCache.size > 100) {
      const now = Date.now();
      // Delete expired entries
      Array.from(opsCache.entries()).forEach(([key, { timestamp }]) => {
        if (now - timestamp > cacheTTL) {
          opsCache.delete(key);
        }
      });
    }
  }, 60000); // Check every minute
  
  return enhancedOps;
}