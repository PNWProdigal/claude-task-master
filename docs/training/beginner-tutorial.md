# Task Master AI Beginner Tutorial

## Introduction

Welcome to Task Master AI! This beginner tutorial will guide you through the basics of using Task Master AI to manage your project tasks efficiently. By the end of this tutorial, you'll be able to create, manage, and track tasks with confidence.

## Prerequisites

Before you begin, ensure you have the following:

- Node.js (v14 or later) installed on your system
- Basic knowledge of command-line interfaces
- A project you want to manage with tasks

## Installation

Install Task Master AI globally to use it from any directory:

```bash
npm install task-master-ai -g
```

Verify the installation:

```bash
task-master --version
```

## Getting Started

### Initializing a Project

To start using Task Master AI in your project, navigate to your project directory and run:

```bash
task-master init
```

This will create the necessary configuration files and a tasks directory to store your tasks.

### Understanding the Structure

After initialization, you'll have:

- `/tasks` - Directory containing individual task files
- `/tasks/tasks.json` - Master file listing all tasks and their relationships

## Creating Tasks

### Manual Task Creation

Create your first task:

```bash
task-master create --title="My First Task" --description="This is a description of my first task" --priority=medium
```

You'll see a confirmation that your task was created with an assigned ID.

### Creating Tasks from a PRD

For larger projects, you can generate tasks directly from a Product Requirements Document (PRD):

```bash
task-master parse-prd --input=prd.txt
```

Task Master AI will analyze the PRD and automatically create structured tasks with appropriate relationships.

### Viewing Your Tasks

List all your tasks:

```bash
task-master list
```

Get details about a specific task:

```bash
task-master show --id=1
```

## Managing Task Status

### Understanding Status

Task Master AI supports these standard statuses:

- `not-started` - Task has not been started yet
- `in-progress` - Task is currently being worked on
- `done` - Task is completed
- `blocked` - Task is blocked by an issue

### Updating Task Status

Change a task's status:

```bash
task-master set-status --id=1 --status=in-progress
```

With the StatusEnhancer, you'll see enhanced status indicators:

```bash
task-master list
# Example output: 🔄 Task 1: My First Task (In Progress)
```

## Working with Dependencies

### Creating Dependencies

Establish a dependency between tasks (task 2 depends on task 1):

```bash
task-master add-dependency --source=1 --target=2
```

### Viewing Dependencies

View dependencies for a task:

```bash
task-master show-dependencies --id=2
```

### Understanding Blocked Tasks

When a task depends on another unfinished task, it's considered blocked:

```bash
task-master show-blocked
```

## Practical Exercise: Managing a Small Project

Let's practice by creating a simple blog project with tasks.

1. Initialize a new project:
   ```bash
   mkdir blog-project
   cd blog-project
   task-master init
   ```

2. Create the main tasks:
   ```bash
   task-master create --title="Design Blog Layout" --priority=high
   task-master create --title="Implement HTML Structure" --priority=medium
   task-master create --title="Add CSS Styling" --priority=medium
   task-master create --title="Create Sample Content" --priority=low
   task-master create --title="Deploy to Test Server" --priority=low
   ```

3. Add dependencies:
   ```bash
   # HTML depends on Design
   task-master add-dependency --source=1 --target=2
   # CSS depends on HTML
   task-master add-dependency --source=2 --target=3
   # Sample Content can be done independently
   # Deploy depends on HTML, CSS, and Content
   task-master add-dependency --source=2 --target=5
   task-master add-dependency --source=3 --target=5
   task-master add-dependency --source=4 --target=5
   ```

4. Start working on the first task:
   ```bash
   task-master set-status --id=1 --status=in-progress
   ```

5. View your progress:
   ```bash
   task-master list
   task-master show-blocked
   ```

6. Complete the first task:
   ```bash
   task-master set-status --id=1 --status=done
   ```

7. Check what to work on next:
   ```bash
   task-master next
   ```

## Using Enhanced Features

### Status Enhancement

Task Master AI provides enhanced status indicators with emoji support:

```bash
task-master list
# Example output:
# ✅ Task 1: Design Blog Layout (Done)
# 🆕 Task 2: Implement HTML Structure (Not Started)
# 🆕 Task 3: Add CSS Styling (Not Started)
# 🆕 Task 4: Create Sample Content (Not Started)
# 🚫 Task 5: Deploy to Test Server (Blocked)
```

### Knowledge Capture

Record insights or decisions related to a task:

```bash
task-master capture-knowledge --id=1 --note="Decided to use a two-column layout for better readability on mobile devices"
```

Retrieve knowledge later:

```bash
task-master get-knowledge --id=1
```

### Basic Dashboard

Launch a simple dashboard to visualize your tasks:

```bash
task-master dashboard
```

This will open a browser window with an interactive visualization of your tasks and their relationships.

## Next Steps

Now that you've mastered the basics, you can explore more advanced features:

1. Try the [Advanced Features Workshop](./advanced-features.md) to learn about batch operations, metrics collection, and automation
2. Review the [Best Practices](./best-practices.md) guide for tips on effective task management
3. Explore [Integration Examples](../examples/basic-integration.md) to connect Task Master AI with your development workflow

## Common Issues

### Command Not Found

If you get a "command not found" error when running task-master commands, ensure:

- The package is installed globally (`npm install task-master-ai -g`)
- Your PATH includes npm's global bin directory
- Try using npx: `npx task-master <command>`

### Task File Errors

If you encounter errors with task files:

- Ensure you've initialized the project with `task-master init`
- Check file permissions in the tasks directory
- Try running `task-master repair` to fix common issues with task files

## Conclusion

Congratulations! You've completed the beginner tutorial for Task Master AI. You now know how to create and manage tasks, work with dependencies, and use enhanced status indicators.

Remember that Task Master AI is designed to be flexible and adapt to your workflow. As you become more comfortable with the basics, explore the advanced features to make task management even more efficient.

For more detailed information, refer to the [API Reference](../api-reference/core-api.md) or join our community for support and inspiration.