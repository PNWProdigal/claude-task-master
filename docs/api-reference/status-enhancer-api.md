# Status Enhancer API Reference

The StatusEnhancer module provides enhanced status indicators with emoji support and percentage tracking for Task Master AI.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Classes](#classes)
  - [StatusEnhancer](#statusenhancer)
- [Methods](#methods)
  - [applyStatusStandards()](#applystatusstandards)
  - [formatTaskStatus()](#formattaskstatus)
  - [parseStatusInput()](#parsestatusinput)
  - [getStatusHistory()](#getstatushistory)
- [Status Types](#status-types)
- [Configuration](#configuration)
- [Examples](#examples)
- [Common Issues and Solutions](#common-issues-and-solutions)

## Overview

The StatusEnhancer module enhances status formatting while preserving backward compatibility with existing status values. It provides emoji indicators, percentage tracking, and standardized status representation across the Task Master AI system.

## Installation

The StatusEnhancer module is automatically included when you install Task Master AI. No additional installation steps are required.

## Classes

### StatusEnhancer

The main class that handles status enhancement, parsing, and formatting.

```javascript
import { StatusEnhancer } from 'task-master-ai/modules/status-enhancer';

const enhancer = new StatusEnhancer({
  useEmoji: true,
  trackHistory: true
});
```

#### Constructor

```javascript
new StatusEnhancer(options)
```

**Parameters:**

- `options` (Object): Configuration options for the StatusEnhancer
  - `useEmoji` (Boolean, optional): Enable emoji indicators (default: true)
  - `trackHistory` (Boolean, optional): Track status history (default: true)
  - `customStatusMap` (Object, optional): Custom status mapping with emoji

## Methods

### applyStatusStandards()

Normalizes status values according to defined standards.

```javascript
enhancer.applyStatusStandards(status);
```

**Parameters:**

- `status` (String|Object): The status value to normalize

**Returns:**

- (Object): Standardized status object with normalized value, emoji, and percentage

### formatTaskStatus()

Formats a task status with emoji, percentage, and display attributes.

```javascript
enhancer.formatTaskStatus(task, options);
```

**Parameters:**

- `task` (Object): The task object containing status information
- `options` (Object, optional): Formatting options
  - `format` (String, optional): Output format ('text', 'json', 'html')
  - `colorize` (Boolean, optional): Add color to the output (default: false)
  - `includePercentage` (Boolean, optional): Include percentage indicator (default: true)

**Returns:**

- (String|Object): Formatted status representation

### parseStatusInput()

Extracts and normalizes status information from various input formats.

```javascript
enhancer.parseStatusInput(input);
```

**Parameters:**

- `input` (String|Object): The status input to parse

**Returns:**

- (Object): Parsed status object

### getStatusHistory()

Retrieves the history of status changes for a given task.

```javascript
enhancer.getStatusHistory(taskId, options);
```

**Parameters:**

- `taskId` (Number|String): ID of the task to get history for
- `options` (Object, optional): Options for history retrieval
  - `limit` (Number, optional): Maximum number of history entries to return
  - `sortDirection` (String, optional): Sort direction ('asc' or 'desc')
  - `includeMetadata` (Boolean, optional): Include additional metadata

**Returns:**

- (Array): History of status changes with timestamps

## Status Types

The StatusEnhancer supports the following standard status types, each with associated emoji and percentage values:

| Status        | Emoji | Percentage | Description |
|---------------|-------|------------|-------------|
| not-started   | 🆕    | 0%         | Task has not been started |
| in-progress   | 🔄    | 50%        | Task is currently being worked on |
| done          | ✅    | 100%       | Task is complete |
| blocked       | 🚫    | 25%        | Task is blocked by an issue |
| under-review  | 👀    | 75%        | Task is being reviewed |
| deferred      | ⏳    | 10%        | Task has been postponed |
| canceled      | ❌    | 0%         | Task has been canceled |

Custom status types can be added through configuration.

## Configuration

The StatusEnhancer can be configured via the following environment variables:

- `TASK_MASTER_USE_EMOJI`: Enable/disable emoji indicators
- `TASK_MASTER_TRACK_STATUS_HISTORY`: Enable/disable status history tracking

Alternatively, you can create a `.taskmasterrc` file in your project root:

```json
{
  "status": {
    "useEmoji": true,
    "trackHistory": true,
    "customStatuses": [
      {
        "name": "waiting-for-client",
        "emoji": "🙋",
        "percentage": 60,
        "aliases": ["waiting", "client-review"]
      }
    ]
  }
}
```

## Examples

### Normalizing Status Values

```javascript
import { StatusEnhancer } from 'task-master-ai/modules/status-enhancer';

const enhancer = new StatusEnhancer();

// Convert various input formats to standardized status
const status1 = enhancer.applyStatusStandards('in progress');
// { value: 'in-progress', emoji: '🔄', percentage: 50 }

const status2 = enhancer.applyStatusStandards('done');
// { value: 'done', emoji: '✅', percentage: 100 }

// Handle aliases
const status3 = enhancer.applyStatusStandards('completed');
// { value: 'done', emoji: '✅', percentage: 100 }
```

### Formatting Task Status

```javascript
import { StatusEnhancer } from 'task-master-ai/modules/status-enhancer';

const enhancer = new StatusEnhancer();

const task = {
  id: 1,
  title: 'Example Task',
  status: 'in-progress'
};

// Format for display
const formatted = enhancer.formatTaskStatus(task, { colorize: true });
// "🔄 In Progress (50%)"

// Format for JSON
const jsonFormatted = enhancer.formatTaskStatus(task, { format: 'json' });
// { value: 'in-progress', emoji: '🔄', percentage: 50, display: '🔄 In Progress (50%)' }
```

## Common Issues and Solutions

### Custom Status Not Recognized

**Issue**: Custom status values are not properly recognized or formatted

**Solution**: Ensure custom statuses are properly configured

```javascript
// Check current status configuration
console.log(enhancer.getStatusConfiguration());

// Register a custom status
enhancer.registerCustomStatus({
  name: 'waiting-for-client',
  emoji: '🙋',
  percentage: 60,
  aliases: ['waiting', 'client-review']
});
```

### Status History Not Available

**Issue**: Status history is not being tracked or retrieved

**Solution**: Verify history tracking is enabled

```javascript
// Enable history tracking
enhancer.setHistoryTracking(true);

// Manually record a status change
enhancer.recordStatusChange(taskId, 'in-progress', 'done', {
  timestamp: new Date(),
  user: 'user@example.com'
});
```