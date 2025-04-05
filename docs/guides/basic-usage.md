# Basic Usage Guide

This guide covers the fundamental concepts and commands for using Task Master AI effectively.

## Installation

Task Master AI can be installed globally using npm:

```bash
npm install task-master-ai -g
```

Or locally in your project:

```bash
npm install task-master-ai --save-dev
```

## Project Initialization

To initialize a new Task Master AI project:

```bash
task-master init
```

This will create the necessary configuration files and directories:

- `tasks/` - Directory to store task files
- `tasks.json` - Main tasks data file
- `.taskmaster-config.json` - Configuration file

## Core Commands

### Generating Tasks from Requirements

Task Master AI can generate tasks from a Product Requirements Document (PRD):

```bash
task-master parse-prd --input=prd.txt [--tasks=10]
```

This uses AI to analyze your PRD and create well-structured tasks with dependencies and priorities.

### Viewing Tasks

List all tasks in the project:

```bash
task-master list [--status=<status>] [--with-subtasks]
```

View detailed information about a specific task:

```bash
task-master show <id>
```

Get a recommendation for what to work on next:

```bash
task-master next
```

### Managing Task Status

Update the status of a task:

```bash
task-master set-status --id=<id> --status=<status>
```

Available status values:
- `not-started` - Task has not been started
- `in-progress` - Task is currently being worked on
- `done` - Task is completed
- `blocked` - Task is blocked by an issue
- `review` - Task is in review
- `deferred` - Task is postponed

### Adding and Updating Tasks

Add a new task:

```bash
task-master add-task --prompt="<description>" [--dependencies=<ids>] [--priority=<priority>]
```

Update tasks based on new requirements:

```bash
task-master update --from=<id> --prompt="<context>"
```

### Managing Dependencies

Add a dependency:

```bash
task-master add-dependency --id=<id> --depends-on=<id>
```

Remove a dependency:

```bash
task-master remove-dependency --id=<id> --depends-on=<id>
```

Validate all dependencies:

```bash
task-master validate-dependencies
```

Fix invalid dependencies automatically:

```bash
task-master fix-dependencies
```

## Environment Variables

Task Master AI can be configured with the following environment variables:

- `ANTHROPIC_API_KEY` - Your Anthropic API key (required)
- `MODEL` - Claude model to use (default: claude-3-7-sonnet-20250219)
- `MAX_TOKENS` - Maximum tokens for responses (default: 4000)
- `TEMPERATURE` - Temperature for model responses (default: 0.7)
- `PERPLEXITY_API_KEY` - Perplexity API key for research (optional)
- `PERPLEXITY_MODEL` - Perplexity model to use (default: sonar-pro)
- `DEBUG` - Enable debug logging (default: false)
- `LOG_LEVEL` - Console output level (debug, info, warn, error) (default: info)
- `DEFAULT_SUBTASKS` - Default number of subtasks to generate (default: 3)
- `DEFAULT_PRIORITY` - Default task priority (default: medium)
- `PROJECT_NAME` - Project name displayed in UI (default: Task Master)

## Getting Help

For information about available commands:

```bash
task-master --help
```

For information about a specific command:

```bash
task-master <command> --help
```

## Next Steps

Now that you understand the basics, check out these guides for more advanced functionality:

- [Task Management](./task-management.md)
- [Dependency Management](./dependency-management.md)
- [Status Enhancements](./status-enhancements.md)