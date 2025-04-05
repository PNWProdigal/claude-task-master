/**
 * Text Reader Optimizer
 * Optimized reader for text files
 */

// Cache for commonly accessed text files
export const textCache = new Map();

/**
 * Creates an optimized text reader with caching
 * @param {Function} originalReader - The original file reader function
 * @param {Object} options - Configuration options
 * @returns {Function} Optimized text reader function
 */
export function createTextReader(originalReader, options = {}) {
  const { filePath, fileSize = 0 } = options;
  
  return (encoding, ...args) => {
    // Small files can be cached for better performance
    if (fileSize < 1024 * 50) { // Only cache files smaller than 50KB
      const cacheKey = `${filePath}_${encoding}`;
      if (textCache.has(cacheKey)) {
        const { data, timestamp } = textCache.get(cacheKey);
        const now = Date.now();
        
        // Use cached data if it's less than 10 seconds old
        if (now - timestamp < 10000) {
          return data;
        }
      }
      
      // Read data using the original reader
      const data = originalReader(encoding, ...args);
      
      // Store in cache
      textCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      // Limit cache size
      if (textCache.size > 50) {
        // Delete oldest entry
        const oldestKey = Array.from(textCache.keys())
          .reduce((oldest, key) => {
            const oldestTime = textCache.get(oldest).timestamp;
            const currentTime = textCache.get(key).timestamp;
            return currentTime < oldestTime ? key : oldest;
          });
        textCache.delete(oldestKey);
      }
      
      return data;
    }
    
    // Large files don't use caching to avoid memory issues
    return originalReader(encoding, ...args);
  };
}