/**
 * File Operations Optimizers - Main Entry Point
 * Exports file operation enhancement functions
 */

import { createCache } from './cache.js';
import { applyCompression } from './compression.js';
import { enableBatching } from './batching.js';

/**
 * Enhances file operations with optimizations
 * @param {Object} originalOps - Original file operation methods
 * @param {Object} options - Enhancement options
 * @returns {Object} Enhanced file operations
 */
export function enhanceOperations(originalOps, options = {}) {
  let enhancedOps = { ...originalOps };
  
  // Apply various enhancements
  enhancedOps = createCache(enhancedOps, options);
  enhancedOps = applyCompression(enhancedOps, options);
  enhancedOps = enableBatching(enhancedOps, options);
  
  return enhancedOps;
}