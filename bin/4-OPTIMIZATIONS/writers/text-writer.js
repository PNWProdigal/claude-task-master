/**
 * Text Writer Optimizer
 * Optimized writer for text files
 */

// Imported from text-reader.js for cache invalidation
import { textCache } from '../readers/text-reader.js';

/**
 * Creates an optimized text writer
 * @param {Function} originalWriter - The original file writer function
 * @param {Object} options - Configuration options
 * @returns {Function} Optimized text writer function
 */
export function createTextWriter(originalWriter, options = {}) {
  const { filePath } = options;
  
  return (data, ...args) => {
    // Perform the write operation
    const result = originalWriter(data, ...args);
    
    // Invalidate any cache entries for this file
    if (textCache && typeof textCache.delete === 'function') {
      // Clear all cache entries for this file with any encoding
      Array.from(textCache.keys())
        .filter(key => key.startsWith(`${filePath}_`))
        .forEach(key => textCache.delete(key));
    }
    
    return result;
  };
}