# Batch Operations Guide

## Overview

Task Master AI's batch operations system allows you to perform multiple task operations in parallel, significantly improving performance for bulk actions. This guide explains how to use the batch operations framework effectively.

## Table of Contents

- [Introduction to Batch Operations](#introduction-to-batch-operations)
- [When to Use Batch Operations](#when-to-use-batch-operations)
- [Basic Usage](#basic-usage)
- [Command Line Interface](#command-line-interface)
- [API Usage](#api-usage)
- [Parallel Processing](#parallel-processing)
- [Error Handling](#error-handling)
- [Advanced Features](#advanced-features)
- [Performance Considerations](#performance-considerations)
- [Troubleshooting](#troubleshooting)

## Introduction to Batch Operations

The batch operations framework enables you to process multiple task operations concurrently, with these key features:

- Parallel execution of operations for improved performance
- Intelligent scheduling based on operation priority
- Comprehensive error handling with graceful degradation
- Support for various operation types (create, update, delete, etc.)
- Performance monitoring and optimization

With batch operations, you can achieve up to 3x performance improvement compared to sequential processing.

## When to Use Batch Operations

Batch operations are ideal for:

- Creating multiple tasks at once
- Updating status for multiple tasks
- Processing imported tasks from external systems
- Generating reports across many tasks
- Performing bulk operations on tasks matching specific criteria

## Basic Usage

### Command Line Interface

Task Master AI provides several batch commands:

```bash
# Create multiple tasks from a JSON file
task-master batch-create --file=tasks.json

# Update status for multiple tasks
task-master batch-update-status --ids=1,2,3,4,5 --status=in-progress

# Delete multiple tasks
task-master batch-delete --ids=10,11,12
```

### API Usage

```javascript
import { BatchOperations } from 'task-master-ai/modules/batch-operations';

const batchOps = new BatchOperations();

// Create a batch of tasks
const createResults = await batchOps.batchCreate([
  { title: 'Task 1', description: 'Description for task 1' },
  { title: 'Task 2', description: 'Description for task 2' },
  { title: 'Task 3', description: 'Description for task 3' }
]);

console.log(`Created ${createResults.successCount} tasks successfully`);
```

## Parallel Processing

The batch operations framework automatically processes operations in parallel:

```javascript
import { BatchOperations } from 'task-master-ai/modules/batch-operations';

const batchOps = new BatchOperations({
  maxConcurrent: 5, // Control max parallel operations
  priorityBased: true // Enable priority-based scheduling
});

// Update multiple tasks in parallel
const updateResults = await batchOps.batchUpdate([
  { id: 1, status: 'in-progress' },
  { id: 2, status: 'blocked' },
  { id: 3, status: 'done' },
  { id: 4, status: 'in-progress' }
]);

console.log(`Updated ${updateResults.successCount} tasks successfully`);
console.log(`Failed to update ${updateResults.failureCount} tasks`);
```

## Error Handling

Batch operations provide robust error handling:

```javascript
import { BatchOperations } from 'task-master-ai/modules/batch-operations';

const batchOps = new BatchOperations({
  continueOnError: true, // Continue processing despite errors
  detailedErrors: true // Get detailed error information
});

const results = await batchOps.batchUpdate(tasks);

// Handle errors
if (results.failures.length > 0) {
  console.log('Failed operations:');
  results.failures.forEach(failure => {
    console.log(`Task ID ${failure.taskId}: ${failure.error}`);
  });
}
```

## Advanced Features

### Operation Grouping

Group similar operations for improved performance:

```javascript
import { BatchOperations } from 'task-master-ai/modules/batch-operations';

const batchOps = new BatchOperations();

// Automatically groups similar operations
const results = await batchOps.batchProcess([
  { type: 'create', data: { title: 'Task 1' } },
  { type: 'create', data: { title: 'Task 2' } },
  { type: 'update', data: { id: 3, status: 'done' } },
  { type: 'update', data: { id: 4, status: 'done' } }
]);
```

### Custom Batch Operations

Create custom batch operations for specialized needs:

```javascript
import { BatchOperations, BatchOperationFactory } from 'task-master-ai/modules/batch-operations';

// Define a custom batch operation
class CustomImportOperation {
  async execute(items) {
    // Implementation
  }
}

// Register the custom operation
BatchOperationFactory.register('import', CustomImportOperation);

// Use the custom operation
const batchOps = new BatchOperations();
const results = await batchOps.execute('import', importItems);
```

### Throttling and Rate Limiting

Control resource usage with throttling:

```javascript
import { BatchOperations } from 'task-master-ai/modules/batch-operations';

const batchOps = new BatchOperations({
  throttle: {
    rate: 10, // Operations per second
    concurrency: 3 // Max concurrent operations
  },
  resourceMonitoring: true // Monitor resource usage
});

// This will run at controlled rates to prevent resource exhaustion
const results = await batchOps.batchUpdate(largeNumberOfTasks);
```

## Performance Considerations

### Optimizing Batch Size

The optimal batch size depends on your environment. General guidelines:

- **Small Batches (10-50 items)**: Good for immediate operations with minimal overhead
- **Medium Batches (50-200 items)**: Balance between performance and memory usage
- **Large Batches (200+ items)**: Best for background processing with sufficient resources

```javascript
import { BatchOperations } from 'task-master-ai/modules/batch-operations';

const batchOps = new BatchOperations();

// Automatically determine optimal batch size
const results = await batchOps.batchUpdateWithOptimalSize(tasks);

// Or manually control batch size
const results = await batchOps.batchUpdate(tasks, { batchSize: 100 });
```

### Resource Monitoring

Monitor resource usage during batch operations:

```javascript
import { BatchOperations } from 'task-master-ai/modules/batch-operations';

const batchOps = new BatchOperations({
  resourceMonitoring: true,
  adaptiveConcurrency: true // Adjust concurrency based on resources
});

// Get resource usage after operation
const results = await batchOps.batchUpdate(tasks);
console.log('Resource usage:', results.resourceUsage);
```

## Troubleshooting

### Common Issues

#### High Memory Usage

**Issue**: Batch operations consuming too much memory

**Solution**: Reduce batch size or concurrency

```javascript
const batchOps = new BatchOperations({
  maxConcurrent: 3, // Reduce from default
  batchSize: 50 // Process in smaller chunks
});
```

#### Slow Performance

**Issue**: Batch operations running slower than expected

**Solution**: Profile and optimize

```javascript
const batchOps = new BatchOperations({
  profiling: true // Enable performance profiling
});

const results = await batchOps.batchUpdate(tasks);
console.log('Performance profile:', results.performanceProfile);
```

#### Batch Failures

**Issue**: Some batch operations failing

**Solution**: Use retry mechanisms

```javascript
const batchOps = new BatchOperations({
  retry: {
    attempts: 3,
    backoff: 'exponential',
    initialDelay: 1000
  }
});

const results = await batchOps.batchUpdate(tasks);
```

### Debugging Batch Operations

Enhanced logging can help debug issues:

```javascript
const batchOps = new BatchOperations({
  debug: true, // Enable debug mode
  verboseLogging: true // Detailed logs
});

// Log all batch operations
batchOps.on('operationStart', (op) => console.log(`Starting: ${op.type}`));
batchOps.on('operationComplete', (op) => console.log(`Completed: ${op.type}`));
batchOps.on('operationError', (op, error) => console.log(`Error in ${op.type}: ${error}`));
```