/**
 * batch-operations.js
 * Framework for executing multiple operations in parallel
 */

import { log, CONFIG } from './utils.js';
import { OptimizationAdapter } from './optimization-adapter.js';
import { MetricsCollector } from './metrics-collector.js';

// Configuration for batch operations
const BATCH_OPERATIONS_CONFIG = {
  enabled: process.env.ENABLE_BATCH_OPERATIONS === 'true' || true,
  maxConcurrent: parseInt(process.env.BATCH_MAX_CONCURRENT || '5'),
  batchSize: parseInt(process.env.BATCH_SIZE || '50'),
  retryAttempts: parseInt(process.env.BATCH_RETRY_ATTEMPTS || '3'),
  retryDelay: parseInt(process.env.BATCH_RETRY_DELAY || '1000'),
  priorityBased: process.env.BATCH_PRIORITY_BASED === 'true' || false,
  adaptiveConcurrency: process.env.BATCH_ADAPTIVE_CONCURRENCY === 'true' || false,
};

/**
 * Handler registry for batch operation types
 */
class BatchOperationFactory {
  static handlers = new Map();
  
  /**
   * Register a handler for an operation type
   * @param {string} type - Operation type
   * @param {Function|Class} handlerClass - Handler class or function
   */
  static register(type, handlerClass) {
    if (!type || typeof type !== 'string') {
      throw new Error('Operation type must be a string');
    }
    
    if (!handlerClass) {
      throw new Error('Handler class is required');
    }
    
    BatchOperationFactory.handlers.set(type, handlerClass);
    log('debug', `Registered batch operation handler for type: ${type}`);
  }
  
  /**
   * Get a handler for an operation type
   * @param {string} type - Operation type
   * @returns {Function|Class} Handler class or function
   */
  static getHandler(type) {
    if (!BatchOperationFactory.handlers.has(type)) {
      throw new Error(`No handler registered for operation type: ${type}`);
    }
    
    return BatchOperationFactory.handlers.get(type);
  }
  
  /**
   * Check if a handler exists for an operation type
   * @param {string} type - Operation type
   * @returns {boolean} True if handler exists
   */
  static hasHandler(type) {
    return BatchOperationFactory.handlers.has(type);
  }
  
  /**
   * Get all registered operation types
   * @returns {Array<string>} Array of operation types
   */
  static getRegisteredTypes() {
    return Array.from(BatchOperationFactory.handlers.keys());
  }
}

/**
 * Base class for batch operations
 */
class BatchOperation {
  /**
   * Create a new BatchOperation
   * @param {Object} options - Operation options
   */
  constructor(options = {}) {
    this.options = options;
  }
  
  /**
   * Execute the operation on batch items
   * @param {Array} items - Items to process
   * @returns {Promise<Array>} Results of the operation
   */
  async execute(items) {
    throw new Error('execute() must be implemented by subclasses');
  }
  
  /**
   * Validate operation items
   * @param {Array} items - Items to validate
   * @returns {boolean} True if items are valid
   */
  validate(items) {
    return Array.isArray(items) && items.length > 0;
  }
  
  /**
   * Handle execution errors
   * @param {Error} error - Error that occurred
   * @param {Object} item - Item that caused the error
   * @returns {Object} Error result
   */
  handleError(error, item) {
    return {
      success: false,
      error: error.message,
      item,
    };
  }
}

/**
 * Create operation for creating new items
 */
class CreateOperation extends BatchOperation {
  /**
   * Execute create operation on batch items
   * @param {Array} items - Items to create
   * @returns {Promise<Array>} Created items
   */
  async execute(items) {
    const { repository, validateItem } = this.options;
    
    if (!repository || typeof repository.create !== 'function') {
      throw new Error('Repository with create() method is required');
    }
    
    const results = [];
    
    for (const item of items) {
      try {
        // Validate if a validator function was provided
        if (validateItem && typeof validateItem === 'function') {
          const validationResult = validateItem(item);
          if (validationResult !== true) {
            results.push({
              success: false,
              error: typeof validationResult === 'string' ? validationResult : 'Validation failed',
              item,
            });
            continue;
          }
        }
        
        // Create the item
        const result = await repository.create(item);
        results.push({
          success: true,
          result,
          item,
        });
      } catch (error) {
        results.push(this.handleError(error, item));
      }
    }
    
    return results;
  }
}

/**
 * Update operation for updating existing items
 */
class UpdateOperation extends BatchOperation {
  /**
   * Execute update operation on batch items
   * @param {Array} items - Items to update
   * @returns {Promise<Array>} Updated items
   */
  async execute(items) {
    const { repository, validateItem, idField = 'id' } = this.options;
    
    if (!repository || typeof repository.update !== 'function') {
      throw new Error('Repository with update() method is required');
    }
    
    const results = [];
    
    for (const item of items) {
      try {
        // Ensure item has an ID
        if (!item[idField]) {
          results.push({
            success: false,
            error: `Item is missing ${idField} field`,
            item,
          });
          continue;
        }
        
        // Validate if a validator function was provided
        if (validateItem && typeof validateItem === 'function') {
          const validationResult = validateItem(item);
          if (validationResult !== true) {
            results.push({
              success: false,
              error: typeof validationResult === 'string' ? validationResult : 'Validation failed',
              item,
            });
            continue;
          }
        }
        
        // Update the item
        const result = await repository.update(item[idField], item);
        results.push({
          success: true,
          result,
          item,
        });
      } catch (error) {
        results.push(this.handleError(error, item));
      }
    }
    
    return results;
  }
}

/**
 * Delete operation for deleting items
 */
class DeleteOperation extends BatchOperation {
  /**
   * Execute delete operation on batch items
   * @param {Array} items - IDs or items to delete
   * @returns {Promise<Array>} Deletion results
   */
  async execute(items) {
    const { repository, idField = 'id' } = this.options;
    
    if (!repository || typeof repository.delete !== 'function') {
      throw new Error('Repository with delete() method is required');
    }
    
    const results = [];
    
    for (const item of items) {
      try {
        // Handle both ID values and objects with ID field
        const id = typeof item === 'object' ? item[idField] : item;
        
        if (!id) {
          results.push({
            success: false,
            error: `Item is missing ${idField} field`,
            item,
          });
          continue;
        }
        
        // Delete the item
        const result = await repository.delete(id);
        results.push({
          success: true,
          result,
          id,
          item,
        });
      } catch (error) {
        results.push(this.handleError(error, item));
      }
    }
    
    return results;
  }
}

/**
 * Custom operation for executing custom functions on items
 */
class CustomOperation extends BatchOperation {
  /**
   * Execute custom operation on batch items
   * @param {Array} items - Items to process
   * @returns {Promise<Array>} Operation results
   */
  async execute(items) {
    const { processor } = this.options;
    
    if (!processor || typeof processor !== 'function') {
      throw new Error('Processor function is required');
    }
    
    const results = [];
    
    for (const item of items) {
      try {
        // Process the item with the custom function
        const result = await processor(item);
        results.push({
          success: true,
          result,
          item,
        });
      } catch (error) {
        results.push(this.handleError(error, item));
      }
    }
    
    return results;
  }
}

// Register standard operation handlers
BatchOperationFactory.register('create', CreateOperation);
BatchOperationFactory.register('update', UpdateOperation);
BatchOperationFactory.register('delete', DeleteOperation);
BatchOperationFactory.register('custom', CustomOperation);

/**
 * Main batch operations controller for parallel processing
 */
class BatchOperations {
  /**
   * Create a new BatchOperations instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.config = { ...BATCH_OPERATIONS_CONFIG, ...options };
    this.optimizationAdapter = new OptimizationAdapter();
    this.metricsCollector = options.metricsCollector || new MetricsCollector();
    
    // Event listeners
    this.eventListeners = {
      'operation:start': [],
      'operation:complete': [],
      'operation:error': [],
      'batch:start': [],
      'batch:complete': [],
      'batch:error': [],
    };
    
    // Performance monitoring
    this.profiling = options.profiling || false;
    
    log('debug', `BatchOperations initialized with config: ${JSON.stringify(this.config)}`);
  }
  
  /**
   * Register an event listener
   * @param {string} event - Event name
   * @param {Function} listener - Event listener function
   */
  on(event, listener) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    
    this.eventListeners[event].push(listener);
  }
  
  /**
   * Emit an event to registered listeners
   * @param {string} event - Event name
   * @param {Object} data - Event data
   * @private
   */
  _emit(event, data) {
    if (!this.eventListeners[event]) return;
    
    for (const listener of this.eventListeners[event]) {
      try {
        listener(data);
      } catch (error) {
        log('error', `Error in event listener for ${event}: ${error.message}`);
      }
    }
  }
  
  /**
   * Process a batch of items with a specific operation type
   * @param {string} operationType - Operation type
   * @param {Array} items - Items to process
   * @param {Object} options - Operation options
   * @returns {Promise<Object>} Batch processing results
   */
  async execute(operationType, items, options = {}) {
    if (!this.config.enabled) {
      return { 
        success: false, 
        error: 'Batch operations are disabled',
        operations: 0,
        succeeded: 0,
        failed: 0,
      };
    }
    
    if (!BatchOperationFactory.hasHandler(operationType)) {
      throw new Error(`Unknown operation type: ${operationType}`);
    }
    
    if (!Array.isArray(items) || items.length === 0) {
      return { 
        success: true, 
        message: 'No items to process',
        operations: 0,
        succeeded: 0,
        failed: 0,
      };
    }
    
    try {
      const startTime = this.profiling ? Date.now() : null;
      const mergedOptions = { ...this.config, ...options };
      
      // Emit batch start event
      this._emit('batch:start', { 
        operationType, 
        itemCount: items.length, 
        options: mergedOptions 
      });
      
      // Create operation handler
      const HandlerClass = BatchOperationFactory.getHandler(operationType);
      const operation = new HandlerClass(mergedOptions);
      
      // Validate items
      if (!operation.validate(items)) {
        throw new Error('Items validation failed');
      }
      
      // Break items into batches if needed
      const batchSize = mergedOptions.batchSize;
      const batches = [];
      
      for (let i = 0; i < items.length; i += batchSize) {
        batches.push(items.slice(i, i + batchSize));
      }
      
      // Process batches in parallel
      const batchResults = await this._processBatchesInParallel(
        operation,
        batches,
        mergedOptions
      );
      
      // Combine results
      const combinedResults = batchResults.flat();
      
      // Generate summary
      const successCount = combinedResults.filter(r => r.success).length;
      const failureCount = combinedResults.filter(r => !r.success).length;
      
      const summary = {
        success: true,
        operations: combinedResults.length,
        succeeded: successCount,
        failed: failureCount,
        successRate: (successCount / combinedResults.length) * 100,
        results: combinedResults,
      };
      
      // Record metrics
      if (startTime) {
        const duration = Date.now() - startTime;
        
        // Record operation metrics
        this.metricsCollector.recordOperationMetrics({
          operation: `batch_${operationType}`,
          duration,
          success: failureCount === 0,
          details: {
            totalItems: items.length,
            batchCount: batches.length,
            successCount,
            failureCount,
            options: mergedOptions,
          }
        });
        
        summary.duration = duration;
        summary.itemsPerSecond = (items.length / duration) * 1000;
      }
      
      // Emit batch complete event
      this._emit('batch:complete', { 
        operationType, 
        summary,
        options: mergedOptions 
      });
      
      return summary;
    } catch (error) {
      // Emit batch error event
      this._emit('batch:error', { 
        operationType, 
        error: error.message,
        options
      });
      
      log('error', `Batch operation error (${operationType}): ${error.message}`);
      
      return { 
        success: false, 
        error: error.message,
        operations: 0,
        succeeded: 0,
        failed: items.length,
      };
    }
  }
  
  /**
   * Process batches in parallel with concurrency control
   * @param {BatchOperation} operation - Operation instance
   * @param {Array<Array>} batches - Batches of items
   * @param {Object} options - Processing options
   * @returns {Promise<Array>} Array of batch results
   * @private
   */
  async _processBatchesInParallel(operation, batches, options) {
    const maxConcurrent = options.maxConcurrent;
    const results = new Array(batches.length);
    let active = 0;
    let nextBatchIndex = 0;
    
    // Function to process a single batch
    const processBatch = async (batchIndex) => {
      const batch = batches[batchIndex];
      
      try {
        // Emit operation start event
        this._emit('operation:start', { 
          batchIndex, 
          itemCount: batch.length 
        });
        
        // Execute the operation with retry logic
        const batchResults = await this._executeWithRetry(
          () => operation.execute(batch),
          options.retryAttempts,
          options.retryDelay
        );
        
        // Store results
        results[batchIndex] = batchResults;
        
        // Emit operation complete event
        this._emit('operation:complete', { 
          batchIndex, 
          results: batchResults 
        });
      } catch (error) {
        // Handle batch failure
        log('error', `Batch ${batchIndex} failed: ${error.message}`);
        
        // Create error results for all items in the batch
        results[batchIndex] = batch.map(item => ({
          success: false,
          error: error.message,
          item,
        }));
        
        // Emit operation error event
        this._emit('operation:error', { 
          batchIndex, 
          error: error.message 
        });
      }
      
      // Decrement active count
      active--;
    };
    
    // Process batches with concurrency control
    const promises = [];
    
    while (nextBatchIndex < batches.length || active > 0) {
      // Start new batches if under concurrency limit and batches remain
      while (active < maxConcurrent && nextBatchIndex < batches.length) {
        const batchIndex = nextBatchIndex++;
        active++;
        
        // Process batch and add to promises
        promises.push(processBatch(batchIndex));
      }
      
      // Wait a bit before checking again
      if (active >= maxConcurrent || nextBatchIndex >= batches.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    // Wait for all promises to complete
    await Promise.all(promises);
    
    return results;
  }
  
  /**
   * Execute a function with retry logic
   * @param {Function} fn - Function to execute
   * @param {number} maxAttempts - Maximum retry attempts
   * @param {number} delay - Delay between retries in milliseconds
   * @returns {Promise<any>} Function result
   * @private
   */
  async _executeWithRetry(fn, maxAttempts, delay) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt < maxAttempts) {
          // Exponential backoff with jitter
          const jitter = Math.random() * 0.3 + 0.85; // 0.85-1.15
          const backoffDelay = delay * Math.pow(1.5, attempt - 1) * jitter;
          
          log('debug', `Retry ${attempt}/${maxAttempts} after ${Math.round(backoffDelay)}ms`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
      }
    }
    
    throw lastError;
  }
  
  /**
   * Batch create operation - create multiple items
   * @param {Array} items - Items to create
   * @param {Object} options - Operation options
   * @returns {Promise<Object>} Batch results
   */
  async batchCreate(items, options = {}) {
    return this.execute('create', items, options);
  }
  
  /**
   * Batch update operation - update multiple items
   * @param {Array} items - Items to update
   * @param {Object} options - Operation options
   * @returns {Promise<Object>} Batch results
   */
  async batchUpdate(items, options = {}) {
    return this.execute('update', items, options);
  }
  
  /**
   * Batch delete operation - delete multiple items
   * @param {Array} items - IDs or items to delete
   * @param {Object} options - Operation options
   * @returns {Promise<Object>} Batch results
   */
  async batchDelete(items, options = {}) {
    return this.execute('delete', items, options);
  }
  
  /**
   * Batch custom operation - apply custom function to multiple items
   * @param {Array} items - Items to process
   * @param {Function} processor - Custom processing function
   * @param {Object} options - Operation options
   * @returns {Promise<Object>} Batch results
   */
  async batchCustom(items, processor, options = {}) {
    return this.execute('custom', items, { ...options, processor });
  }
  
  /**
   * Process mixed batch operations
   * @param {Array<Object>} operations - Array of operation descriptors
   * @param {Object} options - Global options for all operations
   * @returns {Promise<Object>} Batch results
   */
  async batchProcess(operations, options = {}) {
    if (!this.config.enabled) {
      return { 
        success: false, 
        error: 'Batch operations are disabled',
        operations: 0,
        succeeded: 0,
        failed: 0,
      };
    }
    
    if (!Array.isArray(operations) || operations.length === 0) {
      return { 
        success: true, 
        message: 'No operations to process',
        operations: 0,
        succeeded: 0,
        failed: 0,
      };
    }
    
    try {
      const startTime = this.profiling ? Date.now() : null;
      const mergedOptions = { ...this.config, ...options };
      
      // Group operations by type for efficiency
      const operationsByType = new Map();
      
      for (const op of operations) {
        if (!op.type || !op.data) {
          throw new Error('Each operation must have a type and data');
        }
        
        if (!operationsByType.has(op.type)) {
          operationsByType.set(op.type, []);
        }
        
        operationsByType.get(op.type).push(op.data);
      }
      
      // Process each operation type in parallel
      const results = {};
      const allResults = [];
      
      const promises = Array.from(operationsByType.entries()).map(
        async ([type, items]) => {
          const opResult = await this.execute(type, items, {
            ...mergedOptions,
            ...(options[type] || {}),
          });
          
          results[type] = opResult;
          
          if (opResult.results) {
            allResults.push(...opResult.results);
          }
        }
      );
      
      await Promise.all(promises);
      
      // Generate summary
      const totalOperations = allResults.length;
      const successCount = allResults.filter(r => r.success).length;
      const failureCount = totalOperations - successCount;
      
      const summary = {
        success: true,
        operations: totalOperations,
        succeeded: successCount,
        failed: failureCount,
        successRate: totalOperations > 0 ? (successCount / totalOperations) * 100 : 100,
        typeResults: results,
        results: allResults,
      };
      
      // Record metrics
      if (startTime) {
        const duration = Date.now() - startTime;
        
        // Record operation metrics
        this.metricsCollector.recordOperationMetrics({
          operation: 'batch_mixed',
          duration,
          success: failureCount === 0,
          details: {
            totalOperations,
            operationTypes: Array.from(operationsByType.keys()),
            successCount,
            failureCount,
          }
        });
        
        summary.duration = duration;
        summary.operationsPerSecond = (totalOperations / duration) * 1000;
      }
      
      return summary;
    } catch (error) {
      log('error', `Batch process error: ${error.message}`);
      
      return { 
        success: false, 
        error: error.message,
        operations: 0,
        succeeded: 0,
        failed: operations.length,
      };
    }
  }
  
  /**
   * Update multiple items with optimal batch size determination
   * @param {Array} items - Items to update
   * @param {Object} options - Update options
   * @returns {Promise<Object>} Batch update results
   */
  async batchUpdateWithOptimalSize(items, options = {}) {
    // Skip optimization if small batch
    if (items.length < 10) {
      return this.batchUpdate(items, options);
    }
    
    try {
      // Determine optimal batch size based on a small sample
      const sampleSize = Math.min(5, items.length);
      const sample = items.slice(0, sampleSize);
      
      const testStart = Date.now();
      await this.batchUpdate(sample, { 
        ...options, 
        batchSize: sampleSize,
        maxConcurrent: 1,
      });
      const testDuration = Date.now() - testStart;
      
      // Calculate optimal batch size based on sample performance
      const itemTimeMs = testDuration / sampleSize;
      const targetBatchTimeMs = 500; // Target 0.5s per batch for responsiveness
      const optimalBatchSize = Math.max(
        5, 
        Math.min(
          100, 
          Math.round(targetBatchTimeMs / itemTimeMs)
        )
      );
      
      // Determine concurrency based on total workload
      const estimatedTotalTimeMs = itemTimeMs * items.length;
      const optimalConcurrency = Math.max(
        1,
        Math.min(
          this.config.maxConcurrent,
          Math.ceil(estimatedTotalTimeMs / 5000) // Aim to complete in ~5 seconds
        )
      );
      
      log('debug', `Calculated optimal batch size: ${optimalBatchSize}, concurrency: ${optimalConcurrency}`);
      
      // Run with optimized parameters
      return this.batchUpdate(items, {
        ...options,
        batchSize: optimalBatchSize,
        maxConcurrent: optimalConcurrency,
      });
    } catch (error) {
      // Fall back to default parameters on optimization error
      log('warn', `Error optimizing batch size: ${error.message}, using defaults`);
      return this.batchUpdate(items, options);
    }
  }
}

export { 
  BatchOperations, 
  BatchOperationFactory, 
  BatchOperation,
  CreateOperation,
  UpdateOperation,
  DeleteOperation,
  CustomOperation,
  BATCH_OPERATIONS_CONFIG
};