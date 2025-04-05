/**
 * JSON Writer Optimizer
 * Optimized writer for JSON files
 */

// Keeps track of written JSON files for invalidating reader cache
import { jsonCache } from '../readers/json-reader.js';

/**
 * Creates an optimized JSON writer
 * @param {Function} originalWriter - The original file writer function
 * @param {Object} options - Configuration options
 * @returns {Function} Optimized JSON writer function
 */
export function createJsonWriter(originalWriter, options = {}) {
  const { filePath } = options;
  
  return (data, ...args) => {
    // Perform the write operation
    const result = originalWriter(data, ...args);
    
    // Invalidate any cache entries for this file
    if (jsonCache && typeof jsonCache.delete === 'function') {
      // Clear all cache entries for this file with any encoding
      Array.from(jsonCache.keys())
        .filter(key => key.startsWith(`${filePath}_`))
        .forEach(key => jsonCache.delete(key));
    }
    
    return result;
  };
}