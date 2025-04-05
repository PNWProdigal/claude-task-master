/**
 * Writer Optimizers - Main Entry Point
 * Exports writer optimization functions
 */

import { createJsonWriter } from './json-writer.js';
import { createTextWriter } from './text-writer.js';
import { createBinaryWriter } from './binary-writer.js';

/**
 * Creates an optimized file writer based on file type
 * @param {Function} originalWriter - The original file writer function
 * @param {Object} options - Configuration options including fileExt
 * @returns {Function} Optimized writer function
 */
export function createOptimizedWriter(originalWriter, options = {}) {
  const { fileExt } = options;
  
  // Select appropriate writer based on file extension
  if (fileExt === '.json') {
    return createJsonWriter(originalWriter, options);
  } else if (['.txt', '.md', '.log', '.csv'].includes(fileExt)) {
    return createTextWriter(originalWriter, options);
  } else {
    return createBinaryWriter(originalWriter, options);
  }
}