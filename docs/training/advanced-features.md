# Task Master AI Advanced Features Workshop

## Overview

This workshop will guide you through the advanced features of Task Master AI. You'll learn how to leverage powerful capabilities like batch operations, metrics collection, knowledge capture, and integration with Holocron. By the end of this workshop, you'll be able to optimize your workflow and get the most out of Task Master AI.

## Prerequisites

Before proceeding, ensure you have:

- Completed the [Beginner Tutorial](./beginner-tutorial.md)
- Task Master AI v0.9.0 or higher installed
- A project with at least 5-10 tasks already created
- Basic understanding of JavaScript (for API examples)

## Table of Contents

- [Optimization Adapter](#optimization-adapter)
- [Memory Bridge](#memory-bridge)
- [Knowledge Capture System](#knowledge-capture-system)
- [Dependency Tracking](#dependency-tracking)
- [Batch Operations](#batch-operations)
- [Metrics Collection](#metrics-collection)
- [Dashboard Generator](#dashboard-generator)
- [Command Enhancer](#command-enhancer)
- [Integration Patterns](#integration-patterns)

## Optimization Adapter

The OptimizationAdapter improves performance for file operations by 200-300%.

### Enabling Optimization

```bash
# Enable optimization globally
task-master config set optimize true

# Check current optimization settings
task-master config get optimize
```

### API Usage

```javascript
import { OptimizationAdapter } from 'task-master-ai/modules/optimization-adapter';
import { TaskManager } from 'task-master-ai/modules/task-manager';

// Create an optimized task manager
const adapter = new OptimizationAdapter();
const optimizedFileOps = adapter.enhanceFileOperations(originalFileOps);
const taskManager = new TaskManager({ fileOperations: optimizedFileOps });

// Now all operations will be faster
const tasks = await taskManager.getAllTasks();
```

### Exercise: Benchmarking Performance

1. Create a script to compare performance:

```javascript
// benchmark.js
import { OptimizationAdapter } from 'task-master-ai/modules/optimization-adapter';
import { TaskManager } from 'task-master-ai/modules/task-manager';

async function benchmark() {
  // Standard operations
  console.time('standard');
  const standardManager = new TaskManager();
  await standardManager.getAllTasks();
  console.timeEnd('standard');

  // Optimized operations
  console.time('optimized');
  const adapter = new OptimizationAdapter();
  const optimizedFileOps = adapter.enhanceFileOperations(standardManager.fileOperations);
  const optimizedManager = new TaskManager({ fileOperations: optimizedFileOps });
  await optimizedManager.getAllTasks();
  console.timeEnd('optimized');
}

benchmark();
```

2. Run the benchmark:

```bash
node benchmark.js
```

## Memory Bridge

The MemoryBridge enables bidirectional synchronization between Task Master AI and Holocron's memory system.

### Setting Up Memory Bridge

```bash
# Initialize memory bridge with Holocron
task-master init-memory-bridge --holocron-endpoint=https://your-holocron-instance.com/api

# Test the connection
task-master test-memory-connection
```

### Synchronizing Tasks

```bash
# Mirror a specific task to Holocron memory
task-master mirror-task --id=3

# Mirror all tasks
task-master mirror-all-tasks

# Sync from Holocron to tasks
task-master sync-from-memory --entity-id=memory-123
```

### API Usage

```javascript
import { MemoryBridge } from 'task-master-ai/modules/memory-bridge';

const bridge = new MemoryBridge({
  holocronClient: yourHolocronClient,
  syncInterval: 60000 // 1 minute
});

// Mirror a task to memory
await bridge.mirrorTaskToMemory(taskId);

// Set up automatic mirroring
const controller = bridge.initializeAutoMirroring({
  direction: 'bidirectional',
  filter: task => task.priority === 'high'
});

// Later, stop auto-mirroring
controller.stop();
```

### Exercise: Bidirectional Synchronization

1. Set up the memory bridge with auto-mirroring:

```bash
task-master init-memory-bridge --holocron-endpoint=https://example.com/api --auto-mirror --interval=5
```

2. Create a task and observe it being mirrored to Holocron:

```bash
task-master create --title="Test Mirroring" --priority=high
```

3. Verify the mirroring:

```bash
task-master check-mirror-status --id=[newly-created-task-id]
```

## Knowledge Capture System

The knowledge capture system allows recording lessons and best practices related to tasks.

### Capturing Knowledge

```bash
# Capture knowledge related to a task
task-master capture-knowledge --id=3 --content="Discovered that the API rate limit can be increased by contacting support" --tags=api,performance

# Capture general project knowledge
task-master capture-knowledge --content="Team decided to use Jest for all testing" --tags=testing,standards
```

### Retrieving Knowledge

```bash
# Get all knowledge for a task
task-master get-knowledge --id=3

# Search knowledge by tags
task-master search-knowledge --tags=performance

# Contextual knowledge search
task-master context-knowledge --keywords="API rate limit"
```

### API Usage

```javascript
import { KnowledgeCapture } from 'task-master-ai/modules/knowledge-capture';

const knowledgeSystem = new KnowledgeCapture();

// Capture knowledge
await knowledgeSystem.captureKnowledge({
  content: "Found a better approach for database indexing",
  taskId: 5, // Optional task reference
  tags: ["database", "optimization"],
  importance: 4
});

// Retrieve knowledge contextually
const relevantKnowledge = await knowledgeSystem.findRelevantKnowledge({
  context: "database performance issues",
  limit: 5,
  minRelevance: 0.7
});
```

### Exercise: Knowledge Workflow

1. Capture knowledge for multiple tasks:

```bash
task-master capture-knowledge --id=1 --content="Design should follow Material UI guidelines" --tags=design,standards
task-master capture-knowledge --id=2 --content="HTML structure uses semantic elements for better accessibility" --tags=html,accessibility
```

2. Retrieve knowledge contextually:

```bash
task-master context-knowledge --keywords="accessibility guidelines"
```

## Dependency Tracking

The dependency tracking system provides advanced management of task relationships.

### Advanced Dependency Management

```bash
# Create a dependency with a specific type
task-master add-dependency --source=1 --target=2 --type=blocks

# Analyze the critical path
task-master analyze-critical-path

# Detect potential circular dependencies
task-master validate-dependencies --check-circular
```

### API Usage

```javascript
import { DependencyManager } from 'task-master-ai/modules/dependency-manager';

const dependencyManager = new DependencyManager();

// Check if adding a dependency would create a cycle
const wouldCreateCycle = await dependencyManager.validateDependency({
  sourceTaskId: 5,
  targetTaskId: 2
});

if (!wouldCreateCycle) {
  // Add the dependency
  await dependencyManager.addDependency({
    sourceTaskId: 5,
    targetTaskId: 2,
    dependencyType: 'blocks'
  });
}

// Get the critical path
const criticalPath = await dependencyManager.getCriticalPath();
console.log('Critical tasks:', criticalPath.map(task => task.id));
```

### Exercise: Critical Path Analysis

1. Set up a complex dependency structure:

```bash
# Create tasks
task-master create --title="Task A" --priority=high
task-master create --title="Task B" --priority=high
task-master create --title="Task C" --priority=medium
task-master create --title="Task D" --priority=medium
task-master create --title="Task E" --priority=low

# Create dependencies (assuming IDs 1-5)
task-master add-dependency --source=1 --target=2
task-master add-dependency --source=1 --target=3
task-master add-dependency --source=2 --target=4
task-master add-dependency --source=3 --target=4
task-master add-dependency --source=4 --target=5
```

2. Analyze the critical path:

```bash
task-master analyze-critical-path
```

3. Visualize the dependencies:

```bash
task-master generate-graph --output=dependencies.png
```

## Batch Operations

Batch operations enable efficient processing of multiple tasks simultaneously.

### Using Batch Commands

```bash
# Create multiple tasks at once
task-master batch-create --file=tasks.json

# Update status for multiple tasks
task-master batch-update-status --ids=1,2,3,4,5 --status=in-progress

# Delete multiple tasks
task-master batch-delete --ids=10,11,12
```

### API Usage

```javascript
import { BatchOperations } from 'task-master-ai/modules/batch-operations';

const batchOps = new BatchOperations({
  maxConcurrent: 5,
  priorityBased: true
});

// Update multiple tasks in parallel
const results = await batchOps.batchUpdate([
  { id: 1, status: 'in-progress' },
  { id: 2, status: 'in-progress' },
  { id: 3, status: 'in-progress' },
  { id: 4, status: 'in-progress' }
]);

console.log(`Updated ${results.successCount} tasks successfully`);
```

### Exercise: Performance Comparison

1. Create a test script to compare sequential vs. batch operations:

```javascript
// batch-test.js
import { TaskManager } from 'task-master-ai/modules/task-manager';
import { BatchOperations } from 'task-master-ai/modules/batch-operations';

async function test() {
  const taskManager = new TaskManager();
  const batchOps = new BatchOperations();
  
  // Prepare task IDs (assuming you have at least 20 tasks)
  const taskIds = Array.from({ length: 20 }, (_, i) => i + 1);
  
  // Sequential updates
  console.time('sequential');
  for (const id of taskIds) {
    await taskManager.updateTask(id, { priority: 'medium' });
  }
  console.timeEnd('sequential');
  
  // Batch updates
  console.time('batch');
  await batchOps.batchUpdate(
    taskIds.map(id => ({ id, priority: 'high' }))
  );
  console.timeEnd('batch');
}

test();
```

2. Run the test:

```bash
node batch-test.js
```

## Metrics Collection

The metrics collection system tracks operation timing, optimization gains, and usage patterns.

### Collecting Metrics

```bash
# Enable metrics collection
task-master config set collectMetrics true

# Generate a performance report
task-master generate-metrics-report
```

### API Usage

```javascript
import { MetricsCollector } from 'task-master-ai/modules/metrics-collector';

const metrics = new MetricsCollector();

// Record an operation metric
metrics.recordOperationMetrics({
  operation: 'readTask',
  duration: 15, // milliseconds
  success: true,
  details: { taskId: 123 }
});

// Get a performance report
const report = metrics.getPerformanceReport();
console.log('Average operation time:', report.averages.readTask, 'ms');

// Track optimization gains
const gains = metrics.trackOptimizationGains({
  operation: 'readAllTasks',
  beforeTime: 250,
  afterTime: 85
});
console.log('Performance improvement:', gains.percentageImprovement, '%');
```

### Exercise: Monitoring Performance

1. Enable metrics collection:

```bash
task-master config set collectMetrics true
```

2. Perform various operations:

```bash
task-master list
task-master create --title="Metrics Test" --priority=medium
task-master show --id=1
```

3. Generate a metrics report:

```bash
task-master generate-metrics-report --format=json --output=metrics.json
```

4. Analyze the metrics:

```bash
cat metrics.json
```

## Dashboard Generator

The dashboard generator creates visualizations for tasks and dependencies.

### Using the Dashboard

```bash
# Launch the interactive dashboard
task-master dashboard

# Generate a static dashboard
task-master generate-dashboard --output=dashboard.html

# Create a focused dashboard for specific tasks
task-master generate-dashboard --tasks=1,2,3,4 --output=focused.html
```

### API Usage

```javascript
import { DashboardGenerator } from 'task-master-ai/modules/dashboard-generator';

const dashboard = new DashboardGenerator();

// Generate a complete dashboard
const html = await dashboard.generateMasterDashboard();

// Render just the dependency graph
const graphSvg = await dashboard.renderDependencyGraph({
  highlightCriticalPath: true,
  layout: 'hierarchical'
});

// Set up real-time updates
const updater = dashboard.updateRealTimeDisplay({
  interval: 5000, // 5 seconds
  selector: '#dashboard-container'
});

// Later, stop updates
updater.stop();
```

### Exercise: Custom Dashboard

1. Launch the interactive dashboard:

```bash
task-master dashboard
```

2. Explore the different views and filters

3. Create a custom dashboard for high-priority tasks:

```bash
task-master generate-dashboard --filter="priority=high" --output=high-priority.html
```

## Command Enhancer

The command enhancer extends Task Master AI with Holocron's slash command system.

### Using Enhanced Commands

```bash
# List all enhanced commands
task-master command-list --enhanced

# Use a Holocron command
task-master /holocron-status

# Get help for enhanced commands
task-master help-enhanced --command=/knowledge-search
```

### API Usage

```javascript
import { CommandEnhancer } from 'task-master-ai/modules/command-enhancer';

const enhancer = new CommandEnhancer({
  holocronClient: yourHolocronClient
});

// Register enhanced commands
enhancer.enhanceWithHolocronCommands(existingCommands);

// Handle a status command
const statusResult = await enhancer.handleStatus({
  detail: 'full',
  format: 'json'
});

// Help information
const helpText = enhancer.provideCommandHelp('/holocron-status');
console.log(helpText);
```

### Exercise: Custom Command

1. Create a simple custom command handler:

```javascript
// custom-command.js
export default function handleCustomCommand(args) {
  return `Executed custom command with args: ${JSON.stringify(args)}`;
}
```

2. Register the command:

```bash
task-master register-command --name=my-custom --handler=./custom-command.js --description="A custom command example"
```

3. Use the custom command:

```bash
task-master my-custom --param1=value1 --param2=value2
```

## Integration Patterns

### Integrating with External Systems

#### CI/CD Integration

```bash
# Add Task Master to CI pipeline
task-master ci-report --format=junit --output=task-status.xml

# Update task status based on build result
task-master set-status --id=4 --status=done --ci-source=jenkins
```

#### Version Control Integration

```bash
# Link tasks to commits
task-master link-commit --id=3 --commit=a1b2c3d4 --message="Implemented feature X"

# Generate release notes from completed tasks
task-master generate-release-notes --since-tag=v1.0.0
```

#### API Integration

```javascript
import express from 'express';
import { TaskManager } from 'task-master-ai/modules/task-manager';

const app = express();
app.use(express.json());

const taskManager = new TaskManager();

// API endpoint to get tasks
app.get('/api/tasks', async (req, res) => {
  const tasks = await taskManager.getAllTasks();
  res.json(tasks);
});

// API endpoint to update a task
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const task = await taskManager.updateTask(req.params.id, req.body);
    res.json(task);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Task Master API running on port 3000');
});
```

### Exercise: Building a Simple Integration

1. Create a script that integrates Task Master with GitHub issues:

```javascript
// github-sync.js
import { TaskManager } from 'task-master-ai/modules/task-manager';
import { BatchOperations } from 'task-master-ai/modules/batch-operations';
import fetch from 'node-fetch';

async function syncWithGitHub() {
  const taskManager = new TaskManager();
  const batchOps = new BatchOperations();
  
  // Fetch GitHub issues (replace with your repo details)
  const response = await fetch('https://api.github.com/repos/owner/repo/issues');
  const issues = await response.json();
  
  // Prepare batch operations
  const operations = issues.map(issue => ({
    type: 'create',
    data: {
      title: issue.title,
      description: issue.body,
      status: issue.state === 'open' ? 'in-progress' : 'done',
      priority: issue.labels.some(l => l.name === 'high') ? 'high' : 'medium',
      metadata: { githubIssueId: issue.number }
    }
  }));
  
  // Execute batch operations
  const results = await batchOps.batchProcess(operations);
  console.log(`Synced ${results.successCount} issues from GitHub`);
}

syncWithGitHub();
```

2. Run the script:

```bash
node github-sync.js
```

## Conclusion

You've now explored the advanced features of Task Master AI. With these powerful capabilities, you can optimize your workflow, track dependencies effectively, and integrate with external systems.

Key takeaways:

- The OptimizationAdapter significantly improves performance for file operations
- MemoryBridge enables seamless integration with Holocron
- Knowledge Capture preserves important project insights
- Batch Operations enable efficient processing of multiple tasks
- Metrics Collection provides visibility into performance
- Dashboard Generator creates informative visualizations
- Command Enhancer extends functionality with Holocron commands

Next steps:

1. Review the [API References](../api-reference/core-api.md) for detailed documentation
2. Explore the [Integration Examples](../examples/holocron-integration.md) for real-world use cases
3. Join our community to share your advanced Task Master AI implementations