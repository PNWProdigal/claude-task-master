# Dependency Management Guide

## Overview

Task Master AI provides robust dependency tracking and management capabilities to help you organize tasks with complex relationships. This guide covers how to create, manage, and visualize task dependencies.

## Table of Contents

- [Understanding Task Dependencies](#understanding-task-dependencies)
- [Creating Dependencies](#creating-dependencies)
- [Viewing Dependencies](#viewing-dependencies)
- [Managing Dependencies](#managing-dependencies)
- [Dependency Validation](#dependency-validation)
- [Blocker Detection](#blocker-detection)
- [Visualization](#visualization)
- [Advanced Techniques](#advanced-techniques)
- [Common Issues](#common-issues)

## Understanding Task Dependencies

Task dependencies define relationships between tasks, indicating that one task depends on the completion of another. Key aspects of the dependency system include:

- **Direct Dependencies**: Tasks that must be completed before a task can start
- **Dependent Tasks**: Tasks that are waiting for the current task
- **Dependency Types**: Different types of relationships (blocks, relates-to, etc.)
- **Circular Detection**: Automatic detection of circular dependencies
- **Critical Path**: Identification of the critical path in a dependency chain

## Creating Dependencies

You can create dependencies between tasks using several methods:

### Command Line

```bash
# Create a dependency where task 2 depends on task 1
task-master add-dependency --source=1 --target=2

# Create a dependency with a specific type
task-master add-dependency --source=1 --target=2 --type=blocks
```

### API Usage

```javascript
import { DependencyManager } from 'task-master-ai/modules/dependency-manager';

const dependencyManager = new DependencyManager();

// Create a dependency
dependencyManager.addDependency({
  sourceTaskId: 1,
  targetTaskId: 2,
  dependencyType: 'blocks'
});
```

## Viewing Dependencies

You can view dependencies using these commands:

```bash
# Show dependencies for a specific task
task-master show-dependencies --id=3

# Show all dependencies in the project
task-master show-dependencies --all

# Show the dependency graph
task-master show-graph
```

## Managing Dependencies

### Removing Dependencies

```bash
# Remove a dependency
task-master remove-dependency --source=1 --target=2
```

API Usage:

```javascript
import { DependencyManager } from 'task-master-ai/modules/dependency-manager';

const dependencyManager = new DependencyManager();

// Remove a dependency
dependencyManager.removeDependency({
  sourceTaskId: 1,
  targetTaskId: 2
});
```

### Updating Dependencies

```bash
# Change a dependency type
task-master update-dependency --source=1 --target=2 --type=relates-to
```

## Dependency Validation

Task Master AI automatically validates dependencies to prevent issues:

- **Circular Dependencies**: Prevents A → B → C → A situations
- **Self-Dependencies**: Prevents a task from depending on itself
- **Invalid Tasks**: Validates that both tasks in a dependency exist

If validation fails, you'll see an error message explaining the issue.

## Blocker Detection

The system can identify blocked tasks and blocking relationships:

```bash
# Show blocked tasks
task-master show-blocked

# Show tasks blocking a specific task
task-master show-blockers --id=3
```

API Usage:

```javascript
import { DependencyManager } from 'task-master-ai/modules/dependency-manager';

const dependencyManager = new DependencyManager();

// Get blocked tasks
const blockedTasks = dependencyManager.getBlockedTasks();

// Get blockers for a specific task
const blockers = dependencyManager.getBlockersForTask(3);
```

## Visualization

Task Master AI provides visualization tools for dependencies:

```bash
# Generate a visual dependency graph
task-master generate-graph --output=graph.png

# Show the critical path
task-master show-critical-path
```

The dashboard also includes an interactive dependency graph:

```bash
# Launch the dashboard
task-master dashboard
```

## Advanced Techniques

### Dependency Chains

You can analyze the complete dependency chain for a task:

```bash
# Show the full dependency chain for a task
task-master show-chain --id=5
```

API Usage:

```javascript
import { DependencyManager } from 'task-master-ai/modules/dependency-manager';

const dependencyManager = new DependencyManager();

// Get the dependency chain
const chain = dependencyManager.getDependencyChain(5);
console.log(chain);
```

### Dependency Statistics

You can view statistics about your dependency structure:

```bash
# Show dependency statistics
task-master dependency-stats
```

## Common Issues

### Circular Dependencies

If you encounter a circular dependency error, you need to restructure your dependencies:

1. Identify the circular chain using `task-master validate-dependencies`
2. Remove one of the dependencies in the circle
3. Consider creating a new intermediate task if needed

### Orphaned Tasks

Tasks with no dependencies might be overlooked. Find them with:

```bash
# Find tasks with no dependencies
task-master find-orphans
```

### Too Many Dependencies

If a task has too many dependencies, it may indicate a design issue:

```bash
# Show tasks with excessive dependencies
task-master show-complex-tasks
```

### Missing Blockers

To ensure all blocking relationships are captured:

```bash
# Suggest potential missing dependencies
task-master suggest-dependencies
```