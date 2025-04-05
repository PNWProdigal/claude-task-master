# Command Enhancer API Reference

The CommandEnhancer module extends Task Master AI's command handling capabilities by integrating with Holocron's slash command system.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Classes](#classes)
  - [CommandEnhancer](#commandenhancer)
- [Methods](#methods)
  - [enhanceWithHolocronCommands()](#enhancewithholocroncommands)
  - [handleStatus()](#handlestatus)
  - [handleKnowledgeCapture()](#handleknowledgecapture)
  - [provideCommandHelp()](#providecommandhelp)
- [Events](#events)
- [Configuration](#configuration)
- [Examples](#examples)
- [Common Issues and Solutions](#common-issues-and-solutions)

## Overview

The CommandEnhancer module provides a bridge between Task Master AI's native commands and Holocron's slash command system. It enhances the command handling capabilities with additional functionality while maintaining backward compatibility with existing commands.

## Installation

The CommandEnhancer module is automatically included when you install Task Master AI. No additional installation steps are required.

## Classes

### CommandEnhancer

The main class that handles command registration and execution.

```javascript
import { CommandEnhancer } from 'task-master-ai/modules/command-enhancer';

const enhancer = new CommandEnhancer({
  holocronClient: holocronClientInstance,
  verbose: true
});
```

#### Constructor

```javascript
new CommandEnhancer(options)
```

**Parameters:**

- `options` (Object): Configuration options for the CommandEnhancer
  - `holocronClient` (Object): Instance of the Holocron client for slash command integration
  - `verbose` (Boolean, optional): Enable verbose logging (default: false)
  - `commandPrefix` (String, optional): Prefix for enhanced commands (default: '/')

## Methods

### enhanceWithHolocronCommands()

Registers Holocron slash commands alongside existing Task Master AI commands.

```javascript
enhancer.enhanceWithHolocronCommands(commandRegistry);
```

**Parameters:**

- `commandRegistry` (Object): The command registry to enhance

**Returns:**

- (Object): The enhanced command registry

### handleStatus()

Processes status commands and reports system status information.

```javascript
enhancer.handleStatus(options);
```

**Parameters:**

- `options` (Object): Options for the status command
  - `detail` (String, optional): Level of detail for status report ('basic', 'detailed', 'full')
  - `format` (String, optional): Output format ('text', 'json', 'table')

**Returns:**

- (Object): Status information

### handleKnowledgeCapture()

Handles knowledge capture commands for storing project insights.

```javascript
enhancer.handleKnowledgeCapture(knowledge, options);
```

**Parameters:**

- `knowledge` (String): The knowledge or insight to capture
- `options` (Object): Options for knowledge capture
  - `tags` (Array, optional): Tags to associate with the knowledge
  - `category` (String, optional): Category for organizing knowledge
  - `related` (Array, optional): Related task IDs

**Returns:**

- (Object): Result of the knowledge capture operation

### provideCommandHelp()

Provides detailed usage instructions for enhanced commands.

```javascript
enhancer.provideCommandHelp(command);
```

**Parameters:**

- `command` (String, optional): Specific command to get help for

**Returns:**

- (String): Help information for the specified command or all commands

## Events

The CommandEnhancer emits the following events:

- `command:registered`: Emitted when a new command is registered
- `command:executed`: Emitted when a command is executed
- `command:error`: Emitted when a command encounters an error

## Configuration

The CommandEnhancer can be configured via the following environment variables:

- `TASK_MASTER_COMMAND_PREFIX`: Sets the default command prefix
- `TASK_MASTER_VERBOSE_COMMANDS`: Enables verbose command logging

Alternatively, you can create a `.taskmasterrc` file in your project root:

```json
{
  "commands": {
    "prefix": "/",
    "verbose": true,
    "customCommands": [
      {
        "name": "my-command",
        "handler": "./custom-command-handler.js"
      }
    ]
  }
}
```

## Examples

### Registering a Custom Command

```javascript
import { CommandEnhancer } from 'task-master-ai/modules/command-enhancer';

const enhancer = new CommandEnhancer();

enhancer.registerCommand({
  name: 'custom-action',
  description: 'Performs a custom action',
  handler: (args) => {
    console.log('Custom action executed with args:', args);
    return { success: true };
  }
});
```

### Using Enhanced Status Command

```javascript
import { CommandEnhancer } from 'task-master-ai/modules/command-enhancer';

const enhancer = new CommandEnhancer();

// Get detailed status in JSON format
const status = enhancer.handleStatus({
  detail: 'detailed',
  format: 'json'
});

console.log(status);
```

## Common Issues and Solutions

### Command Not Found

**Issue**: Command not recognized when using custom prefix

**Solution**: Ensure the command prefix matches your configuration

```javascript
// Check current prefix
console.log(enhancer.getCommandPrefix());

// Update prefix if needed
enhancer.setCommandPrefix('/');
```

### Holocron Integration Failed

**Issue**: Commands fail to register with Holocron

**Solution**: Verify Holocron client is properly initialized

```javascript
// Verify Holocron connection
if (!enhancer.isHolocronConnected()) {
  // Reinitialize connection
  enhancer.reconnectHolocron();
}
```