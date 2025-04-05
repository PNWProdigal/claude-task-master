# Holocron Integration Guide

This guide explains how to integrate Task Master AI with Holocron's optimization, memory, and command systems.

## Prerequisites

Before integrating with Holocron, you need:

1. Access to a Holocron installation
2. Holocron API key
3. Task Master AI installed
4. Required environment variables configured

## Configuration

Set the following environment variables for Holocron integration:

```bash
# Core Holocron Integration
HOLOCRON_API_KEY=your_api_key
HOLOCRON_BASE_URL=https://your-holocron-instance.com/api

# Optimization Adapter
ENABLE_OPTIMIZATIONS=true
HOLOCRON_PATH=/path/to/holocron/optimizations
LOG_OPTIMIZATION_PERFORMANCE=true
OPTIMIZATION_SILENT_FALLBACK=true

# Memory Bridge
ENABLE_MEMORY_BRIDGE=true
MEMORY_SYNC_INTERVAL=300000
HOLOCRON_MEMORY_API_URL=https://your-holocron-instance.com/api/memory
MEMORY_SYNC_MAX_RETRIES=3
MEMORY_SYNC_RETRY_DELAY=1000
LOG_MEMORY_SYNC=true

# Command Enhancer
ENABLE_COMMAND_ENHANCER=true
COMMAND_PREFIX=/
```

## OptimizationAdapter Integration

The OptimizationAdapter integrates with Holocron's performance optimizers to enhance file operations.

### Basic Usage

The OptimizationAdapter is used automatically by Task Master AI when enabled. You can also use it directly:

```javascript
import { OptimizationAdapter } from 'task-master-ai';

// Create an optimization adapter
const adapter = new OptimizationAdapter();

// Create optimized reader
const reader = adapter.createOptimizedReader('/path/to/file.json');
const data = reader('utf8');

// Create optimized writer
const writer = adapter.createOptimizedWriter('/path/to/file.json');
writer(JSON.stringify(data, null, 2));

// Enhance existing file operations
const enhancedOps = adapter.enhanceFileOperations(originalFileOps);
```

### Performance Benchmarking

To benchmark optimization performance:

```bash
node scripts/benchmark-optimizations.js
```

## MemoryBridge Integration

The MemoryBridge enables bidirectional synchronization between Task Master AI and Holocron's memory system.

### Automatic Mirroring

Task Master AI automatically mirrors tasks to Holocron's memory system when:

1. A task is created or updated
2. A task's status changes
3. The auto-mirroring schedule runs

### Manual Synchronization

```bash
# Mirror a specific task to memory
task-master mirror-task --id=1

# Sync memory updates to tasks
task-master sync-memory-to-tasks

# Initialize auto-mirroring
task-master init-auto-mirroring --interval=300000 --direction=bidirectional
```

### Knowledge Capture

MemoryBridge also enables knowledge capture and retrieval:

```bash
# Capture knowledge with memory integration
task-master capture-knowledge --title="Title" --content="Content" --task-id=1

# Retrieve contextual knowledge
task-master get-contextual-knowledge --task-id=1
```

## CommandEnhancer Integration

The CommandEnhancer integrates with Holocron's slash command system.

### Slash Commands

```bash
# Use slash commands
task-master /status  # Shows system status
task-master /help    # Shows command help
task-master /list    # Lists tasks with enhanced formatting
```

### Custom Commands

You can define custom slash commands in your configuration:

```json
// .taskmaster-config.json
{
  "customCommands": {
    "report": {
      "description": "Generate a custom report",
      "handler": "generateReport",
      "args": ["type", "format"]
    }
  }
}
```

Then use:

```bash
task-master /report --type=performance --format=markdown
```

## Setting Up Holocron Directories

Task Master AI expects certain directories for Holocron integration:

```
/bin/4-OPTIMIZATIONS/
  ├── readers/
  │   └── optimized-reader.js
  ├── writers/
  │   └── optimized-writer.js
  ├── fileOps/
  │   └── enhanced-ops.js
  └── metrics/
      └── performance-tracker.js
```

Create these directories and files:

```bash
mkdir -p /bin/4-OPTIMIZATIONS/readers
mkdir -p /bin/4-OPTIMIZATIONS/writers
mkdir -p /bin/4-OPTIMIZATIONS/fileOps
mkdir -p /bin/4-OPTIMIZATIONS/metrics
```

## Common Integration Issues

### Optimization Not Working

If optimizations aren't working:

1. Verify the `HOLOCRON_PATH` points to the correct location
2. Check that Holocron optimization libraries are present
3. Enable `DEBUG=true` for more detailed logs

### Memory Synchronization Failing

If memory synchronization fails:

1. Check the connection to Holocron's memory API
2. Verify your API key has the necessary permissions
3. Check for any error messages in the logs
4. Try with a lower sync interval

### Slash Commands Not Working

If slash commands aren't working:

1. Verify `ENABLE_COMMAND_ENHANCER` is set to true
2. Check the command format (use the right prefix)
3. Make sure the command is registered in the system

## Advanced Integration

For advanced integration scenarios, such as custom optimizers or memory handlers, refer to the API reference:

- [OptimizationAdapter API](../api-reference/optimization-adapter-api.md)
- [MemoryBridge API](../api-reference/memory-bridge-api.md)
- [CommandEnhancer API](../api-reference/command-enhancer-api.md)