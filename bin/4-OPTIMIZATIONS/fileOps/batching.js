/**
 * File Operations Batching
 * Provides batching capabilities for file operations
 */

// Queue of batched operations
const operationQueue = [];
let batchTimer = null;

/**
 * Enables batching for file operations
 * @param {Object} originalOps - Original file operation methods
 * @param {Object} options - Enhancement options
 * @returns {Object} Enhanced file operations with batching
 */
export function enableBatching(originalOps, options = {}) {
  const enhancedOps = { ...originalOps };
  const { batchingEnabled = false, batchDelay = 10 } = options;
  
  if (!batchingEnabled) {
    return enhancedOps;
  }
  
  // Add batching to write operations where appropriate
  if (typeof enhancedOps.writeFile === 'function') {
    const originalWriteFile = enhancedOps.writeFile;
    
    enhancedOps.writeFile = (path, data, options, callback) => {
      // Handle different argument patterns
      if (typeof options === 'function') {
        callback = options;
        options = undefined;
      }
      
      if (typeof callback === 'function') {
        // Async version - can be batched
        operationQueue.push({
          operation: 'writeFile',
          args: [path, data, options],
          callback
        });
        
        // Set timer to process batch if not already scheduled
        if (!batchTimer) {
          batchTimer = setTimeout(processBatch, batchDelay, originalOps);
        }
        
        return;
      } else {
        // Sync version - execute immediately
        return originalWriteFile(path, data, options);
      }
    };
  }
  
  // Add other batchable operations as needed...
  
  return enhancedOps;
}

/**
 * Process the batch of operations
 * @param {Object} originalOps - Original file operation methods
 */
function processBatch(originalOps) {
  // Clear the timer
  batchTimer = null;
  
  if (operationQueue.length === 0) {
    return;
  }
  
  // Group operations by type
  const writeOperations = operationQueue.filter(op => op.operation === 'writeFile');
  // Add other operation types as needed...
  
  // Process write operations
  writeOperations.forEach(op => {
    const { args, callback } = op;
    originalOps.writeFile(...args, callback);
  });
  
  // Clear the queue
  operationQueue.length = 0;
}