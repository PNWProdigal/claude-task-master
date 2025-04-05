# Memory Bridge API Reference

The MemoryBridge module provides bidirectional synchronization between Task Master AI and Holocron's memory system.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Classes](#classes)
  - [MemoryBridge](#memorybridge)
- [Methods](#methods)
  - [mirrorTaskToMemory()](#mirrortasktomemory)
  - [syncMemoryToTask()](#syncmemorytotask)
  - [initializeAutoMirroring()](#initializeautomirroring)
  - [captureKnowledge()](#captureknowledge)
- [Events](#events)
- [Configuration](#configuration)
- [Examples](#examples)
- [Common Issues and Solutions](#common-issues-and-solutions)

## Overview

The MemoryBridge module handles task-to-memory and memory-to-task synchronization, ensuring that task information is properly reflected in the Holocron memory system and vice versa. It operates in a non-blocking manner with silent failures to prevent disruption to core functionality.

## Installation

The MemoryBridge module is automatically included when you install Task Master AI. No additional installation steps are required.

## Classes

### MemoryBridge

The main class that manages bidirectional synchronization between tasks and memory.

```javascript
import { MemoryBridge } from 'task-master-ai/modules/memory-bridge';

const bridge = new MemoryBridge({
  holocronClient: holocronClientInstance,
  syncInterval: 5000
});
```

#### Constructor

```javascript
new MemoryBridge(options)
```

**Parameters:**

- `options` (Object): Configuration options for the MemoryBridge
  - `holocronClient` (Object): Instance of the Holocron client
  - `syncInterval` (Number, optional): Interval for auto-mirroring in milliseconds (default: 60000)
  - `taskManager` (Object, optional): Task manager instance for direct integration
  - `silent` (Boolean, optional): Suppress non-critical errors (default: true)

## Methods

### mirrorTaskToMemory()

Synchronizes a task to Holocron's memory system.

```javascript
bridge.mirrorTaskToMemory(taskId);
```

**Parameters:**

- `taskId` (Number|String|Object): The task ID or task object to mirror
- `options` (Object, optional): Options for mirroring
  - `force` (Boolean): Force update even if no changes detected
  - `includeSubtasks` (Boolean): Include subtasks in the mirroring

**Returns:**

- (Promise): Resolves with the mirroring result object

### syncMemoryToTask()

Synchronizes data from Holocron's memory system to a task.

```javascript
bridge.syncMemoryToTask(memoryEntityId, options);
```

**Parameters:**

- `memoryEntityId` (String): The ID of the memory entity to sync from
- `options` (Object, optional): Sync options
  - `targetTaskId` (Number|String): Specific task to update
  - `createIfMissing` (Boolean): Create a new task if no matching task exists
  - `updateStrategy` (String): How to handle conflicts ('overwrite', 'merge', 'prompt')

**Returns:**

- (Promise): Resolves with the sync result object

### initializeAutoMirroring()

Sets up automatic bidirectional synchronization between tasks and memory.

```javascript
bridge.initializeAutoMirroring(options);
```

**Parameters:**

- `options` (Object, optional): Auto-mirroring options
  - `interval` (Number): Synchronization interval in milliseconds
  - `direction` (String): Sync direction ('bidirectional', 'to-memory', 'from-memory')
  - `filter` (Function): Function to filter which tasks/entities to sync

**Returns:**

- (Object): Auto-mirroring controller with start/stop methods

### captureKnowledge()

Captures task-related knowledge and stores it in Holocron's memory system.

```javascript
bridge.captureKnowledge(knowledge, options);
```

**Parameters:**

- `knowledge` (String|Object): The knowledge to capture
- `options` (Object, optional): Knowledge capture options
  - `taskId` (Number|String): Related task ID
  - `tags` (Array): Tags for categorization
  - `importance` (Number): Importance level (1-5)

**Returns:**

- (Promise): Resolves with the knowledge entity ID

## Events

The MemoryBridge emits the following events:

- `memory:mirrored`: Emitted when a task has been mirrored to memory
- `task:synced`: Emitted when a task has been updated from memory
- `sync:started`: Emitted when a synchronization operation begins
- `sync:completed`: Emitted when a synchronization operation completes
- `sync:error`: Emitted when a synchronization error occurs
- `knowledge:captured`: Emitted when knowledge is successfully captured

## Configuration

The MemoryBridge can be configured via the following environment variables:

- `TASK_MASTER_SYNC_INTERVAL`: Sets the default synchronization interval
- `TASK_MASTER_SYNC_DIRECTION`: Sets the default synchronization direction
- `TASK_MASTER_HOLOCRON_ENDPOINT`: Holocron API endpoint URL

Alternatively, you can create a `.taskmasterrc` file in your project root:

```json
{
  "memoryBridge": {
    "syncInterval": 60000,
    "syncDirection": "bidirectional",
    "silent": true,
    "holocron": {
      "endpoint": "https://holocron-api.example.com/v1",
      "apiKey": "${HOLOCRON_API_KEY}"
    }
  }
}
```

## Examples

### Basic Task Mirroring

```javascript
import { MemoryBridge } from 'task-master-ai/modules/memory-bridge';

const bridge = new MemoryBridge({
  holocronClient: holocronClientInstance
});

// Mirror a specific task to memory
async function mirrorTask() {
  try {
    const result = await bridge.mirrorTaskToMemory(42, {
      includeSubtasks: true
    });
    console.log('Task mirrored successfully:', result.entityId);
  } catch (error) {
    console.error('Mirroring failed:', error.message);
  }
}

mirrorTask();
```

### Setting Up Auto-Mirroring

```javascript
import { MemoryBridge } from 'task-master-ai/modules/memory-bridge';
import { TaskManager } from 'task-master-ai/modules/task-manager';

const taskManager = new TaskManager();
const bridge = new MemoryBridge({
  holocronClient: holocronClientInstance,
  taskManager: taskManager
});

// Set up bidirectional synchronization
const mirroringController = bridge.initializeAutoMirroring({
  interval: 30000, // 30 seconds
  direction: 'bidirectional',
  filter: (task) => task.priority === 'high' // Only sync high priority tasks
});

// Stop mirroring when needed
function stopMirroring() {
  mirroringController.stop();
  console.log('Auto-mirroring stopped');
}

// Restart mirroring
function restartMirroring() {
  mirroringController.start();
  console.log('Auto-mirroring restarted');
}
```

## Common Issues and Solutions

### Connection Issues

**Issue**: Unable to connect to Holocron memory system

**Solution**: Verify connection settings and credentials

```javascript
// Check connection status
if (!bridge.isConnected()) {
  // Attempt to reconnect
  bridge.reconnect({
    forceRefresh: true,
    timeout: 5000
  });
}
```

### Sync Conflicts

**Issue**: Conflicts between task data and memory data

**Solution**: Use a custom conflict resolution strategy

```javascript
// Set up custom conflict resolution
bridge.setConflictResolutionStrategy((taskData, memoryData) => {
  // Always prefer task update timestamps
  if (new Date(taskData.updatedAt) > new Date(memoryData.updatedAt)) {
    return taskData;
  }
  return memoryData;
});
```