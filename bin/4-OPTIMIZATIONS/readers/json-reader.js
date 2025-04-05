/**
 * JSON Reader Optimizer
 * Optimized reader for JSON files
 */

// Simple in-memory cache for JSON readers
export const jsonCache = new Map();

/**
 * Creates an optimized JSON reader with caching
 * @param {Function} originalReader - The original file reader function
 * @param {Object} options - Configuration options
 * @returns {Function} Optimized JSON reader function
 */
export function createJsonReader(originalReader, options = {}) {
  const { filePath } = options;
  
  return (encoding, ...args) => {
    // Check cache first for small files
    const cacheKey = `${filePath}_${encoding}`;
    if (jsonCache.has(cacheKey)) {
      const { data, timestamp } = jsonCache.get(cacheKey);
      const now = Date.now();
      
      // Use cached data if it's less than 5 seconds old
      if (now - timestamp < 5000) {
        return data;
      }
    }
    
    // Read data using the original reader
    const data = originalReader(encoding, ...args);
    
    // Cache the result with timestamp
    jsonCache.set(cacheKey, { 
      data, 
      timestamp: Date.now() 
    });
    
    // Maintain cache size
    if (jsonCache.size > 100) {
      // Delete oldest entry
      const oldestKey = Array.from(jsonCache.keys())
        .reduce((oldest, key) => {
          const oldestTime = jsonCache.get(oldest).timestamp;
          const currentTime = jsonCache.get(key).timestamp;
          return currentTime < oldestTime ? key : oldest;
        });
      jsonCache.delete(oldestKey);
    }
    
    return data;
  };
}