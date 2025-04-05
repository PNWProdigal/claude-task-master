# Core API Reference

This document provides a comprehensive reference for the core API of Task Master AI.

## Table of Contents

- [Core Modules](#core-modules)
- [Task Manager](#task-manager)
- [Utils](#utils)
- [UI](#ui)
- [AI Services](#ai-services)
- [Configuration](#configuration)

## Core Modules

Task Master AI consists of several core modules that provide the fundamental functionality:

| Module | Description |
|--------|-------------|
| `task-manager.js` | Task CRUD operations and data management |
| `dependency-manager.js` | Task dependency management |
| `ui.js` | User interface formatting and display |
| `utils.js` | Reusable utilities and configuration |
| `ai-services.js` | AI model integration (Claude/Perplexity) |
| `commands.js` | CLI command definitions using Commander.js |

## Task Manager

The Task Manager is responsible for creating, reading, updating, and deleting tasks.

### Methods

#### `loadTasks(tasksPath)`

Loads tasks from the specified file path.

```javascript
const taskManager = require('task-master-ai/scripts/modules/task-manager');
const tasks = taskManager.loadTasks('/path/to/tasks.json');
```

#### `saveTasks(tasksPath, tasks)`

Saves tasks to the specified file path.

```javascript
taskManager.saveTasks('/path/to/tasks.json', tasks);
```

#### `createTask(tasksPath, taskData)`

Creates a new task.

```javascript
const newTask = await taskManager.createTask('/path/to/tasks.json', {
  title: 'New Task',
  description: 'Task description',
  priority: 'high',
  dependencies: [1, 2]
});
```

#### `updateTask(tasksPath, taskId, updates)`

Updates an existing task.

```javascript
await taskManager.updateTask('/path/to/tasks.json', 1, {
  status: 'in-progress',
  priority: 'medium'
});
```

#### `deleteTask(tasksPath, taskId)`

Deletes a task.

```javascript
await taskManager.deleteTask('/path/to/tasks.json', 1);
```

#### `setTaskStatus(tasksPath, taskId, status)`

Sets the status of a task.

```javascript
await taskManager.setTaskStatus('/path/to/tasks.json', 1, 'in-progress');
```

#### `generateTaskFiles(tasksPath, outputDir)`

Generates individual task files from tasks.json.

```javascript
await taskManager.generateTaskFiles('/path/to/tasks.json', 'tasks');
```

#### `getNextTask(tasksPath)`

Gets the next task to work on based on dependencies and priorities.

```javascript
const nextTask = await taskManager.getNextTask('/path/to/tasks.json');
```

#### `expandTask(tasksPath, taskId, options)`

Expands a task into subtasks.

```javascript
await taskManager.expandTask('/path/to/tasks.json', 1, {
  num: 5,
  research: true
});
```

## Utils

The Utils module provides utility functions for file operations, logging, and other common tasks.

### Functions

#### `readJSON(filepath)`

Reads and parses a JSON file.

```javascript
const utils = require('task-master-ai/scripts/modules/utils');
const data = utils.readJSON('/path/to/file.json');
```

#### `writeJSON(filepath, data)`

Writes data to a JSON file.

```javascript
utils.writeJSON('/path/to/file.json', data);
```

#### `log(level, ...args)`

Logs a message at the specified level.

```javascript
utils.log('info', 'This is an info message');
utils.log('error', 'This is an error message');
```

#### `findTaskById(tasks, taskId)`

Finds a task by ID in the tasks array.

```javascript
const task = utils.findTaskById(tasks, 1);
```

#### `taskExists(tasks, taskId)`

Checks if a task exists in the tasks array.

```javascript
const exists = utils.taskExists(tasks, 1);
```

#### `formatTaskId(id)`

Formats a task ID as a string.

```javascript
const formattedId = utils.formatTaskId(1); // "1"
const formattedSubtaskId = utils.formatTaskId('1.2'); // "1.2"
```

## UI

The UI module provides functions for formatting and displaying data in the command line interface.

### Functions

#### `displayBanner()`

Displays the Task Master banner.

```javascript
const ui = require('task-master-ai/scripts/modules/ui');
ui.displayBanner();
```

#### `displayTaskTable(tasks, options)`

Displays tasks in a table format.

```javascript
ui.displayTaskTable(tasks, {
  showSubtasks: true,
  filter: 'status=in-progress'
});
```

#### `displayTaskDetails(task)`

Displays detailed information about a task.

```javascript
ui.displayTaskDetails(task);
```

#### `formatDependenciesWithStatus(dependencies, tasks, forConsole)`

Formats task dependencies with status information.

```javascript
const formattedDeps = ui.formatDependenciesWithStatus(task.dependencies, allTasks, true);
```

#### `getStatusWithColor(status, forTable)`

Gets a status string with appropriate color formatting.

```javascript
const formattedStatus = ui.getStatusWithColor('in-progress', true);
```

## AI Services

The AI Services module provides integrations with various AI models for generating tasks, expanding tasks, and conducting research.

### Methods

#### `generateTasksFromPRD(prdText, options)`

Generates tasks from a Product Requirements Document.

```javascript
const aiServices = require('task-master-ai/scripts/modules/ai-services');
const tasks = await aiServices.generateTasksFromPRD(prdText, {
  maxTasks: 10,
  requireDependencies: true
});
```

#### `expandTaskWithAI(task, options)`

Expands a task into subtasks using AI.

```javascript
const subtasks = await aiServices.expandTaskWithAI(task, {
  numSubtasks: 5,
  detailed: true
});
```

#### `researchTopicWithAI(topic, options)`

Conducts research on a topic using AI.

```javascript
const research = await aiServices.researchTopicWithAI('React performance optimization', {
  maxResults: 5,
  model: 'perplexity'
});
```

## Configuration

Task Master AI can be configured using environment variables and configuration files.

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key | (required) |
| `MODEL` | Claude model to use | claude-3-7-sonnet-20250219 |
| `MAX_TOKENS` | Maximum tokens for responses | 4000 |
| `TEMPERATURE` | Temperature for model responses | 0.7 |
| `PERPLEXITY_API_KEY` | Perplexity API key for research | (optional) |
| `PERPLEXITY_MODEL` | Perplexity model to use | sonar-pro |
| `DEBUG` | Enable debug logging | false |
| `LOG_LEVEL` | Console output level | info |
| `DEFAULT_SUBTASKS` | Default number of subtasks to generate | 3 |
| `DEFAULT_PRIORITY` | Default task priority | medium |
| `PROJECT_NAME` | Project name displayed in UI | Task Master |

### Configuration File

Task Master AI can be configured using a `.taskmaster-config.json` file in the project root:

```json
{
  "projectName": "My Project",
  "tasksPath": "custom/path/to/tasks.json",
  "taskFilesDir": "custom/path/to/task/files",
  "defaultPriority": "high",
  "defaultSubtasks": 5,
  "statusValues": {
    "custom-status": {
      "color": "blue",
      "icon": "🔷",
      "tableIcon": "C",
      "aliases": ["custom", "c-status"]
    }
  }
}
```