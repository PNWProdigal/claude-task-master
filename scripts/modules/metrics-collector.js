/**
 * metrics-collector.js
 * System for collecting and analyzing performance metrics
 */

import fs from 'fs';
import path from 'path';
import { log, CONFIG, readJSON, writeJSON } from './utils.js';
import { OptimizationAdapter } from './optimization-adapter.js';

// Configuration for MetricsCollector
const METRICS_COLLECTOR_CONFIG = {
  enabled: process.env.ENABLE_METRICS === 'true' || true,
  storagePath: process.env.METRICS_STORAGE_PATH || './metrics',
  retentionDays: parseInt(process.env.METRICS_RETENTION_DAYS || '90'),
  autoFlushInterval: parseInt(process.env.METRICS_AUTO_FLUSH_INTERVAL || '300000'), // 5 minutes
  trackResourceUsage: process.env.METRICS_TRACK_RESOURCES === 'true' || true,
};

/**
 * Metrics collector for operation timing, optimization gains, and usage patterns
 */
class MetricsCollector {
  /**
   * Create a new MetricsCollector instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.config = { ...METRICS_COLLECTOR_CONFIG, ...options };
    this.optimizationAdapter = new OptimizationAdapter();
    this.metrics = {
      operations: [], // Individual operation metrics
      optimizations: [], // Optimization gain records
      resourceUsage: [], // Resource usage snapshots
      aggregates: {
        // Aggregated metrics by operation type
        operationCounts: {},
        operationDurations: {},
        optimizationGains: {},
      },
    };
    
    this.flushTimer = null;
    this.lastFlush = null;
    this.isInitialized = false;
    
    // Initialize storage if metrics are enabled
    if (this.config.enabled) {
      this._initializeStorage();
      this._setupAutoFlush();
    }
  }
  
  /**
   * Initialize metrics storage
   * @private
   */
  _initializeStorage() {
    try {
      if (!fs.existsSync(this.config.storagePath)) {
        fs.mkdirSync(this.config.storagePath, { recursive: true });
        
        // Create subdirectories
        fs.mkdirSync(path.join(this.config.storagePath, 'operations'), { recursive: true });
        fs.mkdirSync(path.join(this.config.storagePath, 'optimizations'), { recursive: true });
        fs.mkdirSync(path.join(this.config.storagePath, 'resources'), { recursive: true });
        fs.mkdirSync(path.join(this.config.storagePath, 'reports'), { recursive: true });
        
        log('info', `Created metrics storage directories in ${this.config.storagePath}`);
      }
      
      // Create daily metrics file if it doesn't exist
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const dailyMetricsPath = path.join(this.config.storagePath, 'operations', `${today}.json`);
      
      if (!fs.existsSync(dailyMetricsPath)) {
        writeJSON(dailyMetricsPath, {
          date: today,
          operations: [],
          aggregates: {
            operationCounts: {},
            operationDurations: {},
          },
        });
      }
      
      this.isInitialized = true;
    } catch (error) {
      log('error', `Failed to initialize metrics storage: ${error.message}`);
      this.isInitialized = false;
    }
  }
  
  /**
   * Set up automatic metric flushing
   * @private
   */
  _setupAutoFlush() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    this.flushTimer = setInterval(() => {
      this.flushMetrics().catch(error => {
        log('error', `Auto-flush error: ${error.message}`);
      });
    }, this.config.autoFlushInterval);
    
    // Record initial resource snapshot if enabled
    if (this.config.trackResourceUsage) {
      this._recordResourceSnapshot();
    }
  }
  
  /**
   * Record metrics for an operation
   * @param {Object} options - Operation metrics
   * @returns {Object} Recorded metrics
   */
  recordOperationMetrics(options) {
    if (!this.config.enabled) {
      return { recorded: false, reason: 'Metrics collection disabled' };
    }
    
    try {
      const now = new Date();
      
      // Validate required fields
      if (!options.operation) {
        throw new Error('Operation name is required');
      }
      
      const metrics = {
        operation: options.operation,
        timestamp: now.toISOString(),
        duration: options.duration || 0,
        success: options.success !== false, // Default to true if not specified
        details: options.details || {},
      };
      
      // Add resource info if tracking is enabled
      if (this.config.trackResourceUsage) {
        metrics.resources = this._getResourceInfo();
      }
      
      // Add to in-memory collection
      this.metrics.operations.push(metrics);
      
      // Update aggregate metrics
      this._updateAggregates(metrics);
      
      return { recorded: true, metrics };
    } catch (error) {
      log('error', `Record operation metrics error: ${error.message}`);
      return { recorded: false, error: error.message };
    }
  }
  
  /**
   * Record optimization gains
   * @param {Object} options - Optimization metrics
   * @returns {Object} Recorded optimization metrics
   */
  trackOptimizationGains(options) {
    if (!this.config.enabled) {
      return { recorded: false, reason: 'Metrics collection disabled' };
    }
    
    try {
      const now = new Date();
      
      // Validate required fields
      if (!options.operation) {
        throw new Error('Operation name is required');
      }
      
      if (typeof options.beforeTime !== 'number' || typeof options.afterTime !== 'number') {
        throw new Error('Before and after times are required as numbers');
      }
      
      // Calculate improvement metrics
      const timeDifference = options.beforeTime - options.afterTime;
      const percentageImprovement = (timeDifference / options.beforeTime) * 100;
      const speedupFactor = options.beforeTime / options.afterTime;
      
      const metrics = {
        operation: options.operation,
        timestamp: now.toISOString(),
        beforeTime: options.beforeTime,
        afterTime: options.afterTime,
        timeDifference,
        percentageImprovement,
        speedupFactor,
        details: options.details || {},
      };
      
      // Add to in-memory collection
      this.metrics.optimizations.push(metrics);
      
      // Update optimization aggregates
      this._updateOptimizationAggregates(metrics);
      
      return { 
        recorded: true, 
        metrics: {
          ...metrics,
          formattedImprovement: `${percentageImprovement.toFixed(2)}%`,
          formattedSpeedup: `${speedupFactor.toFixed(2)}x`,
        } 
      };
    } catch (error) {
      log('error', `Track optimization gains error: ${error.message}`);
      return { recorded: false, error: error.message };
    }
  }
  
  /**
   * Get a performance report
   * @param {Object} options - Report options
   * @returns {Object} Performance report
   */
  getPerformanceReport(options = {}) {
    try {
      // Determine date range
      const endDate = options.endDate ? new Date(options.endDate) : new Date();
      
      let startDate;
      if (options.startDate) {
        startDate = new Date(options.startDate);
      } else if (options.days) {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - options.days);
      } else {
        // Default to last 30 days
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
      }
      
      // Format dates for file paths
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      // Load metrics from storage
      const operationMetrics = this._loadOperationMetricsInRange(startDate, endDate);
      const optimizationMetrics = this._loadOptimizationMetricsInRange(startDate, endDate);
      
      // Calculate report data
      const report = {
        period: {
          start: startDateStr,
          end: endDateStr,
        },
        operations: {
          total: operationMetrics.length,
          success: operationMetrics.filter(m => m.success).length,
          failed: operationMetrics.filter(m => !m.success).length,
        },
        averages: this._calculateAverages(operationMetrics),
        optimizations: this._summarizeOptimizations(optimizationMetrics),
        topOperations: this._getTopOperations(operationMetrics),
      };
      
      // Add percentiles if requested
      if (options.includePercentiles) {
        report.percentiles = this._calculatePercentiles(operationMetrics);
      }
      
      // Add resource usage if tracked
      if (this.config.trackResourceUsage && options.includeResources) {
        report.resources = this._summarizeResourceUsage(startDate, endDate);
      }
      
      // Save report if requested
      if (options.saveReport) {
        const reportPath = path.join(
          this.config.storagePath, 
          'reports', 
          `report_${startDateStr}_to_${endDateStr}.json`
        );
        
        writeJSON(reportPath, report);
        log('info', `Performance report saved to ${reportPath}`);
      }
      
      return report;
    } catch (error) {
      log('error', `Get performance report error: ${error.message}`);
      return { error: error.message };
    }
  }
  
  /**
   * Flush metrics to persistent storage
   * @returns {Promise<boolean>} True if flush was successful
   */
  async flushMetrics() {
    if (!this.isInitialized) {
      log('warn', 'Metrics storage not initialized, skipping flush');
      return false;
    }
    
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Operations
      if (this.metrics.operations.length > 0) {
        const operationsPath = path.join(this.config.storagePath, 'operations', `${today}.json`);
        
        // Read existing file
        let existingData = {};
        try {
          existingData = readJSON(operationsPath);
        } catch (error) {
          // Create new file if it doesn't exist
          existingData = {
            date: today,
            operations: [],
            aggregates: {
              operationCounts: {},
              operationDurations: {},
            },
          };
        }
        
        // Append new operations
        existingData.operations.push(...this.metrics.operations);
        
        // Update aggregates
        for (const [operation, count] of Object.entries(this.metrics.aggregates.operationCounts)) {
          existingData.aggregates.operationCounts[operation] = 
            (existingData.aggregates.operationCounts[operation] || 0) + count;
        }
        
        for (const [operation, durations] of Object.entries(this.metrics.aggregates.operationDurations)) {
          if (!existingData.aggregates.operationDurations[operation]) {
            existingData.aggregates.operationDurations[operation] = [];
          }
          existingData.aggregates.operationDurations[operation].push(...durations);
        }
        
        // Write back to file
        writeJSON(operationsPath, existingData);
        
        // Clear in-memory operations
        this.metrics.operations = [];
        this.metrics.aggregates.operationCounts = {};
        this.metrics.aggregates.operationDurations = {};
      }
      
      // Optimizations
      if (this.metrics.optimizations.length > 0) {
        const optimizationsPath = path.join(this.config.storagePath, 'optimizations', `${today}.json`);
        
        // Read existing file
        let existingData = {};
        try {
          existingData = readJSON(optimizationsPath);
        } catch (error) {
          // Create new file if it doesn't exist
          existingData = {
            date: today,
            optimizations: [],
          };
        }
        
        // Append new optimizations
        existingData.optimizations.push(...this.metrics.optimizations);
        
        // Write back to file
        writeJSON(optimizationsPath, existingData);
        
        // Clear in-memory optimizations
        this.metrics.optimizations = [];
      }
      
      // Resource usage
      if (this.metrics.resourceUsage.length > 0) {
        const resourcesPath = path.join(this.config.storagePath, 'resources', `${today}.json`);
        
        // Read existing file
        let existingData = {};
        try {
          existingData = readJSON(resourcesPath);
        } catch (error) {
          // Create new file if it doesn't exist
          existingData = {
            date: today,
            snapshots: [],
          };
        }
        
        // Append new resource snapshots
        existingData.snapshots.push(...this.metrics.resourceUsage);
        
        // Write back to file
        writeJSON(resourcesPath, existingData);
        
        // Clear in-memory resource usage
        this.metrics.resourceUsage = [];
      }
      
      this.lastFlush = now;
      log('debug', 'Metrics flushed to storage');
      
      // Clean up old metrics files
      this._cleanupOldMetrics();
      
      return true;
    } catch (error) {
      log('error', `Flush metrics error: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Take a resource usage snapshot
   * @returns {Object} Resource metrics
   */
  takeResourceSnapshot() {
    if (!this.config.enabled || !this.config.trackResourceUsage) {
      return { recorded: false, reason: 'Resource tracking disabled' };
    }
    
    try {
      const snapshot = this._recordResourceSnapshot();
      return { recorded: true, snapshot };
    } catch (error) {
      log('error', `Resource snapshot error: ${error.message}`);
      return { recorded: false, error: error.message };
    }
  }
  
  /**
   * Reset metrics collection
   * @returns {boolean} True if reset was successful
   */
  resetMetrics() {
    try {
      // Reset in-memory metrics
      this.metrics = {
        operations: [],
        optimizations: [],
        resourceUsage: [],
        aggregates: {
          operationCounts: {},
          operationDurations: {},
          optimizationGains: {},
        },
      };
      
      log('info', 'In-memory metrics reset');
      return true;
    } catch (error) {
      log('error', `Reset metrics error: ${error.message}`);
      return false;
    }
  }
  
  // Private methods
  
  /**
   * Update aggregate metrics
   * @param {Object} metrics - New operation metrics
   * @private
   */
  _updateAggregates(metrics) {
    const operation = metrics.operation;
    
    // Update operation counts
    this.metrics.aggregates.operationCounts[operation] = 
      (this.metrics.aggregates.operationCounts[operation] || 0) + 1;
    
    // Update operation durations
    if (!this.metrics.aggregates.operationDurations[operation]) {
      this.metrics.aggregates.operationDurations[operation] = [];
    }
    this.metrics.aggregates.operationDurations[operation].push(metrics.duration);
  }
  
  /**
   * Update optimization aggregates
   * @param {Object} metrics - New optimization metrics
   * @private
   */
  _updateOptimizationAggregates(metrics) {
    const operation = metrics.operation;
    
    if (!this.metrics.aggregates.optimizationGains[operation]) {
      this.metrics.aggregates.optimizationGains[operation] = [];
    }
    
    this.metrics.aggregates.optimizationGains[operation].push({
      percentageImprovement: metrics.percentageImprovement,
      speedupFactor: metrics.speedupFactor,
    });
  }
  
  /**
   * Record a resource usage snapshot
   * @returns {Object} Resource snapshot
   * @private
   */
  _recordResourceSnapshot() {
    const resourceInfo = this._getResourceInfo();
    
    const snapshot = {
      timestamp: new Date().toISOString(),
      ...resourceInfo,
    };
    
    this.metrics.resourceUsage.push(snapshot);
    return snapshot;
  }
  
  /**
   * Get current resource usage information
   * @returns {Object} Resource info
   * @private
   */
  _getResourceInfo() {
    const memoryUsage = process.memoryUsage();
    
    return {
      memory: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external,
        arrayBuffers: memoryUsage.arrayBuffers,
      },
      cpuUsage: process.cpuUsage(),
      uptime: process.uptime(),
    };
  }
  
  /**
   * Load operation metrics within a date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Array} Operation metrics
   * @private
   */
  _loadOperationMetricsInRange(startDate, endDate) {
    const operations = [];
    
    // Convert dates to YYYY-MM-DD strings
    const currentDate = new Date(startDate);
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Iterate through dates in range
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const filePath = path.join(this.config.storagePath, 'operations', `${dateStr}.json`);
      
      if (fs.existsSync(filePath)) {
        try {
          const data = readJSON(filePath);
          if (data && Array.isArray(data.operations)) {
            operations.push(...data.operations);
          }
        } catch (error) {
          log('warn', `Failed to load operations for ${dateStr}: ${error.message}`);
        }
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Include in-memory operations if they fall within range
    const inMemoryOperations = this.metrics.operations.filter(op => {
      const opDate = new Date(op.timestamp);
      return opDate >= startDate && opDate <= endDate;
    });
    
    operations.push(...inMemoryOperations);
    
    return operations;
  }
  
  /**
   * Load optimization metrics within a date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Array} Optimization metrics
   * @private
   */
  _loadOptimizationMetricsInRange(startDate, endDate) {
    const optimizations = [];
    
    // Convert dates to YYYY-MM-DD strings
    const currentDate = new Date(startDate);
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Iterate through dates in range
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const filePath = path.join(this.config.storagePath, 'optimizations', `${dateStr}.json`);
      
      if (fs.existsSync(filePath)) {
        try {
          const data = readJSON(filePath);
          if (data && Array.isArray(data.optimizations)) {
            optimizations.push(...data.optimizations);
          }
        } catch (error) {
          log('warn', `Failed to load optimizations for ${dateStr}: ${error.message}`);
        }
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Include in-memory optimizations if they fall within range
    const inMemoryOptimizations = this.metrics.optimizations.filter(opt => {
      const optDate = new Date(opt.timestamp);
      return optDate >= startDate && optDate <= endDate;
    });
    
    optimizations.push(...inMemoryOptimizations);
    
    return optimizations;
  }
  
  /**
   * Calculate average metrics
   * @param {Array} operations - Operation metrics
   * @returns {Object} Average metrics
   * @private
   */
  _calculateAverages(operations) {
    const averages = {};
    const operationsByType = {};
    
    // Group operations by type
    for (const op of operations) {
      if (!operationsByType[op.operation]) {
        operationsByType[op.operation] = [];
      }
      operationsByType[op.operation].push(op);
    }
    
    // Calculate averages for each operation type
    for (const [opType, ops] of Object.entries(operationsByType)) {
      const durations = ops.map(op => op.duration);
      const successCount = ops.filter(op => op.success).length;
      
      if (durations.length > 0) {
        const sum = durations.reduce((a, b) => a + b, 0);
        const avg = sum / durations.length;
        
        averages[opType] = {
          averageDuration: avg,
          successRate: (successCount / ops.length) * 100,
          count: ops.length,
        };
      }
    }
    
    // Add overall average
    const allDurations = operations.map(op => op.duration);
    const successCount = operations.filter(op => op.success).length;
    
    if (allDurations.length > 0) {
      const sum = allDurations.reduce((a, b) => a + b, 0);
      const avg = sum / allDurations.length;
      
      averages.overall = {
        averageDuration: avg,
        successRate: (successCount / operations.length) * 100,
        count: operations.length,
      };
    }
    
    return averages;
  }
  
  /**
   * Calculate percentile metrics
   * @param {Array} operations - Operation metrics
   * @returns {Object} Percentile metrics
   * @private
   */
  _calculatePercentiles(operations) {
    const percentiles = {};
    const operationsByType = {};
    
    // Group operations by type
    for (const op of operations) {
      if (!operationsByType[op.operation]) {
        operationsByType[op.operation] = [];
      }
      operationsByType[op.operation].push(op);
    }
    
    // Calculate percentiles for each operation type
    for (const [opType, ops] of Object.entries(operationsByType)) {
      const durations = ops.map(op => op.duration).sort((a, b) => a - b);
      
      if (durations.length > 0) {
        percentiles[opType] = {
          p50: this._getPercentile(durations, 50),
          p90: this._getPercentile(durations, 90),
          p95: this._getPercentile(durations, 95),
          p99: this._getPercentile(durations, 99),
          min: durations[0],
          max: durations[durations.length - 1],
        };
      }
    }
    
    // Add overall percentiles
    const allDurations = operations.map(op => op.duration).sort((a, b) => a - b);
    
    if (allDurations.length > 0) {
      percentiles.overall = {
        p50: this._getPercentile(allDurations, 50),
        p90: this._getPercentile(allDurations, 90),
        p95: this._getPercentile(allDurations, 95),
        p99: this._getPercentile(allDurations, 99),
        min: allDurations[0],
        max: allDurations[allDurations.length - 1],
      };
    }
    
    return percentiles;
  }
  
  /**
   * Get a specific percentile from sorted data
   * @param {Array} sortedData - Sorted data array
   * @param {number} percentile - Percentile to calculate (0-100)
   * @returns {number} Percentile value
   * @private
   */
  _getPercentile(sortedData, percentile) {
    if (sortedData.length === 0) return 0;
    if (sortedData.length === 1) return sortedData[0];
    
    const index = Math.ceil((percentile / 100) * sortedData.length) - 1;
    return sortedData[index];
  }
  
  /**
   * Summarize optimization metrics
   * @param {Array} optimizations - Optimization metrics
   * @returns {Object} Optimization summary
   * @private
   */
  _summarizeOptimizations(optimizations) {
    const summary = {};
    const optimizationsByType = {};
    
    // Group optimizations by operation type
    for (const opt of optimizations) {
      if (!optimizationsByType[opt.operation]) {
        optimizationsByType[opt.operation] = [];
      }
      optimizationsByType[opt.operation].push(opt);
    }
    
    // Calculate summaries for each operation type
    for (const [opType, opts] of Object.entries(optimizationsByType)) {
      const percentageImprovements = opts.map(opt => opt.percentageImprovement);
      const speedupFactors = opts.map(opt => opt.speedupFactor);
      
      if (percentageImprovements.length > 0) {
        const sumPercentage = percentageImprovements.reduce((a, b) => a + b, 0);
        const avgPercentage = sumPercentage / percentageImprovements.length;
        
        const sumSpeedup = speedupFactors.reduce((a, b) => a + b, 0);
        const avgSpeedup = sumSpeedup / speedupFactors.length;
        
        summary[opType] = {
          averageImprovement: avgPercentage,
          averageSpeedup: avgSpeedup,
          count: opts.length,
          totalTimeSaved: opts.reduce((sum, opt) => sum + opt.timeDifference, 0),
        };
      }
    }
    
    // Add overall summary
    if (optimizations.length > 0) {
      const allPercentages = optimizations.map(opt => opt.percentageImprovement);
      const allSpeedups = optimizations.map(opt => opt.speedupFactor);
      
      const sumPercentage = allPercentages.reduce((a, b) => a + b, 0);
      const avgPercentage = sumPercentage / allPercentages.length;
      
      const sumSpeedup = allSpeedups.reduce((a, b) => a + b, 0);
      const avgSpeedup = sumSpeedup / allSpeedups.length;
      
      summary.overall = {
        averageImprovement: avgPercentage,
        averageSpeedup: avgSpeedup,
        count: optimizations.length,
        totalTimeSaved: optimizations.reduce((sum, opt) => sum + opt.timeDifference, 0),
      };
    }
    
    return summary;
  }
  
  /**
   * Get top operations by frequency and duration
   * @param {Array} operations - Operation metrics
   * @returns {Object} Top operations
   * @private
   */
  _getTopOperations(operations) {
    const topOperations = {
      byFrequency: [],
      byDuration: [],
      byFailureRate: [],
    };
    
    const operationsByType = {};
    
    // Group operations by type
    for (const op of operations) {
      if (!operationsByType[op.operation]) {
        operationsByType[op.operation] = [];
      }
      operationsByType[op.operation].push(op);
    }
    
    // Calculate metrics for each operation type
    const operationMetrics = Object.entries(operationsByType).map(([opType, ops]) => {
      const count = ops.length;
      const durations = ops.map(op => op.duration);
      const sum = durations.reduce((a, b) => a + b, 0);
      const avg = sum / durations.length;
      const failureCount = ops.filter(op => !op.success).length;
      const failureRate = (failureCount / count) * 100;
      
      return {
        operation: opType,
        count,
        averageDuration: avg,
        totalDuration: sum,
        failureRate,
      };
    });
    
    // Sort by frequency
    topOperations.byFrequency = [...operationMetrics]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Sort by average duration
    topOperations.byDuration = [...operationMetrics]
      .sort((a, b) => b.averageDuration - a.averageDuration)
      .slice(0, 10);
    
    // Sort by failure rate (if any failures)
    topOperations.byFailureRate = [...operationMetrics]
      .filter(m => m.failureRate > 0)
      .sort((a, b) => b.failureRate - a.failureRate)
      .slice(0, 10);
    
    return topOperations;
  }
  
  /**
   * Summarize resource usage
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Object} Resource usage summary
   * @private
   */
  _summarizeResourceUsage(startDate, endDate) {
    // This would typically load and analyze resource snapshots
    // For simplicity, we'll just return a basic summary
    
    return {
      memoryTrend: 'Resource usage trends would be analyzed here',
      cpuTrend: 'CPU usage patterns would be analyzed here',
      peakMemory: 'Peak memory usage would be calculated here',
      averageMemory: 'Average memory usage would be calculated here',
    };
  }
  
  /**
   * Clean up old metrics files based on retention policy
   * @private
   */
  _cleanupOldMetrics() {
    try {
      const now = new Date();
      const retentionDate = new Date();
      retentionDate.setDate(retentionDate.getDate() - this.config.retentionDays);
      
      const retentionDateStr = retentionDate.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Directories to clean up
      const directories = [
        'operations',
        'optimizations',
        'resources',
      ];
      
      for (const dir of directories) {
        const dirPath = path.join(this.config.storagePath, dir);
        
        // Skip if directory doesn't exist
        if (!fs.existsSync(dirPath)) continue;
        
        const files = fs.readdirSync(dirPath);
        
        for (const file of files) {
          // Only process JSON files with date names
          if (!file.endsWith('.json')) continue;
          
          const dateMatch = file.match(/^(\d{4}-\d{2}-\d{2})\.json$/);
          if (!dateMatch) continue;
          
          const fileDate = dateMatch[1];
          
          // Delete if older than retention date
          if (fileDate < retentionDateStr) {
            fs.unlinkSync(path.join(dirPath, file));
            log('debug', `Deleted old metrics file: ${dir}/${file}`);
          }
        }
      }
    } catch (error) {
      log('error', `Cleanup old metrics error: ${error.message}`);
    }
  }
}

export { MetricsCollector, METRICS_COLLECTOR_CONFIG };