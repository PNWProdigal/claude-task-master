# Knowledge Capture Guide

The Knowledge Capture system allows you to record, manage, and retrieve valuable project knowledge and insights. This guide explains how to use these features effectively.

## Overview

The Knowledge Capture system provides:

- Structured storage for project knowledge
- Integration with the task management system
- Contextual knowledge retrieval
- Bidirectional synchronization with Holocron's memory system

## Knowledge Entity Model

Knowledge in Task Master AI is represented as entities with the following structure:

- **ID**: Unique identifier for the knowledge entity
- **Title**: Descriptive title
- **Content**: The knowledge content (text, code, etc.)
- **Category**: Knowledge category (e.g., Technical, Process)
- **Tags**: Keywords for organization and searching
- **Metadata**: Additional information including:
  - Creation and update timestamps
  - Author
  - Related task IDs
  - Source information

## Capturing Knowledge

### From the Command Line

```bash
# Create new knowledge entity
task-master create-knowledge --title="Title" --content="Content" [--category="Category"] [--tags="tag1,tag2"] [--task-id=1]

# Capture knowledge from a task
task-master capture-task-knowledge --task-id=1 [--notes="Additional insights"] [--category="Category"]

# Capture knowledge from a file
task-master create-knowledge --title="Title" --file="path/to/file.md" [--category="Category"]
```

### During Task Completion

When marking a task as done, you'll be prompted to capture any knowledge or lessons learned:

```bash
task-master set-status --id=1 --status=done --capture-knowledge
```

## Searching and Retrieving Knowledge

### Basic Search

```bash
# Search by title
task-master search-knowledge --title="React Hooks"

# Search by category
task-master search-knowledge --category="Technical"

# Search by tags
task-master search-knowledge --tags="react,frontend"

# Search by task ID
task-master search-knowledge --task-id=1

# Full text search
task-master search-knowledge --query="performance optimization"
```

### Contextual Knowledge Retrieval

```bash
# Get knowledge relevant to current context
task-master get-contextual-knowledge --task-id=1 [--limit=5]

# Get knowledge with specific context
task-master get-contextual-knowledge --category="Technical" --tags="react" [--limit=5]
```

## Managing Knowledge Categories

```bash
# Create a new category
task-master create-category --name="Architecture" --description="System architecture decisions"

# List all categories
task-master list-categories
```

## Knowledge Export and Import

```bash
# Export knowledge base
task-master export-knowledge --output="knowledge-export.json" [--include-content]

# Import knowledge base
task-master import-knowledge --input="knowledge-export.json" [--overwrite]
```

## Integration with MemoryBridge

The Knowledge Capture system integrates with the MemoryBridge component to synchronize knowledge with Holocron's memory system.

### Automatic Synchronization

Knowledge is automatically synchronized with Holocron when:

1. A new knowledge entity is created
2. A knowledge entity is updated
3. Task status changes occur
4. The auto-mirroring schedule runs

### Manual Synchronization

```bash
# Force synchronization with Holocron
task-master sync-knowledge
```

## Programmatic Usage

If you're integrating Task Master AI into your own applications, you can use the KnowledgeCapture API directly:

```javascript
import { KnowledgeCaptureService } from 'task-master-ai';

// Create a new KnowledgeCaptureService instance
const knowledgeService = new KnowledgeCaptureService();
await knowledgeService.initialize();

// Create a knowledge entity
const result = await knowledgeService.createKnowledge({
  title: 'React Performance Tips',
  content: 'Here are some performance tips for React applications...',
  category: 'Technical',
  tags: ['react', 'performance', 'frontend']
});

// Search for knowledge
const searchResult = await knowledgeService.searchKnowledge({
  tags: ['react'],
  includeContent: true
});

// Get contextual knowledge
const contextualResult = await knowledgeService.getContextualKnowledge({
  taskId: 1,
  tags: ['react'],
  limit: 5
});
```

## Best Practices

1. **Be Specific**: Use clear, descriptive titles and categorize knowledge appropriately

2. **Add Context**: Include why the knowledge is important, not just what it is

3. **Link to Tasks**: Always associate knowledge with relevant tasks when possible

4. **Use Tags Consistently**: Establish a consistent tagging system for your project

5. **Regular Review**: Periodically review and update knowledge to keep it current

## Integration with Other Components

The Knowledge Capture system integrates with other Task Master AI components:

- **MemoryBridge**: Synchronizes knowledge with Holocron's memory system
- **CommandEnhancer**: Provides enhanced knowledge capture commands
- **DashboardGenerator**: Displays relevant knowledge in dashboards

## Troubleshooting

### Issue: Knowledge Not Synchronizing with Holocron

If knowledge is not synchronizing with Holocron:

1. Check that MemoryBridge is properly initialized
2. Verify Holocron connectivity
3. Check for any error messages in the logs
4. Try manual synchronization

### Issue: Search Not Finding Expected Results

If searches are not returning expected knowledge entities:

1. Verify the search parameters (case-sensitive, exact matches)
2. Try broadening your search terms
3. Check that the knowledge entity exists and has the expected tags/categories