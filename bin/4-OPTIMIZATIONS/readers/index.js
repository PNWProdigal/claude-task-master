/**
 * Reader Optimizers - Main Entry Point
 * Exports reader optimization functions
 */

import { createJsonReader } from './json-reader.js';
import { createTextReader } from './text-reader.js';
import { createBinaryReader } from './binary-reader.js';

/**
 * Creates an optimized file reader based on file type
 * @param {Function} originalReader - The original file reader function
 * @param {Object} options - Configuration options including fileExt and fileSize
 * @returns {Function} Optimized reader function
 */
export function createOptimizedReader(originalReader, options = {}) {
  const { fileExt, fileSize } = options;
  
  // Select appropriate reader based on file extension
  if (fileExt === '.json') {
    return createJsonReader(originalReader, options);
  } else if (['.txt', '.md', '.log', '.csv'].includes(fileExt)) {
    return createTextReader(originalReader, options);
  } else {
    return createBinaryReader(originalReader, options);
  }
}