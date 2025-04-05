# Status Enhancements Guide

The StatusEnhancer component provides enhanced status formatting with emoji support, standardized status values, and status tracking capabilities. This guide explains how to use these features effectively.

## Status Standardization

The StatusEnhancer automatically standardizes status values to ensure consistency across your project.

### Standard Status Values

| Status       | Description                               | Emoji | Table Icon |
|--------------|-------------------------------------------|-------|------------|
| not-started  | Task has not been started                 | ⭕    | ○          |
| in-progress  | Task is currently being worked on         | 🔄    | ►          |
| done         | Task is completed                         | ✅    | ✓          |
| blocked      | Task is blocked by an issue               | ❌    | !          |
| review       | Task is waiting for or in review          | 👀    | ?          |
| deferred     | Task is postponed                         | 📅    | →          |
| pending      | Legacy status (for backward compatibility)| ⏱️     | ⏱          |

### Status Aliases

StatusEnhancer supports various aliases for each status, making it easier for users to input statuses:

- **not-started**: todo, not started, notstarted, new
- **in-progress**: in progress, inprogress, wip, ongoing
- **done**: complete, completed, finished
- **blocked**: waiting, stuck
- **review**: in review, reviewing, needs review, pending review
- **deferred**: postponed, delayed, later
- **pending**: waiting, to-do, todo

## Using Enhanced Statuses

### Setting a Task Status

```bash
task-master set-status --id=<id> --status=<status>
```

You can use any of the standard status values or their aliases:

```bash
task-master set-status --id=1 --status=wip  # Sets to "in-progress"
task-master set-status --id=2 --status=completed  # Sets to "done"
```

### Status Formatting in Output

When listing tasks, the status will be displayed with appropriate colors and icons:

```bash
task-master list  # Shows status with emoji indicators
```

## Status History Tracking

StatusEnhancer automatically tracks status changes, allowing you to view the history of a task's progress.

### Viewing Status History

To view the status history of a task:

```bash
task-master show <id>  # Shows task details including status history
```

The history includes the status value and the timestamp of each change.

## Programmatic Usage

If you're integrating Task Master AI into your own applications, you can use the StatusEnhancer directly:

```javascript
import { StatusEnhancer } from 'task-master-ai';

// Create a new StatusEnhancer instance
const statusEnhancer = new StatusEnhancer();

// Standardize status input
const standardStatus = statusEnhancer.applyStatusStandards('wip');
console.log(standardStatus);  // Outputs: "in-progress"

// Format a status with color and emoji
const formattedStatus = statusEnhancer.formatTaskStatus('in-progress');
console.log(formattedStatus);  // Outputs colored text with emoji

// Track a status change
statusEnhancer.trackStatusChange(1, 'in-progress');

// Retrieve status history
const history = statusEnhancer.getStatusHistory(1);
console.log(history);
```

## Customizing Status Values

You can customize the available statuses by creating a configuration file:

```json
// .taskmaster-config.json
{
  "statusValues": {
    "planning": {
      "color": "blue",
      "icon": "🗓️",
      "tableIcon": "P",
      "aliases": ["plan", "designing"]
    }
    // Add more custom statuses...
  }
}
```

## Best Practices

1. **Use Standard Terminology**: Stick to the standard status values when possible to maintain consistency.

2. **Leverage Status Tracking**: Use the status history to track progress and identify bottlenecks.

3. **Clear Status Updates**: When changing a task's status, consider adding a comment to provide context.

4. **Status Workflows**: Define a clear workflow for status transitions (e.g., not-started → in-progress → review → done).

## Integration with Other Components

The StatusEnhancer integrates with other Task Master AI components:

- **DashboardGenerator**: Uses status information to create visual dashboards
- **CommandEnhancer**: Provides enhanced status commands
- **KnowledgeCapture**: Records status changes as part of project knowledge

## Troubleshooting

### Issue: Status Not Updating

If the status is not updating when you use the `set-status` command:

1. Check that you're using a valid status value or alias
2. Verify that the task ID exists
3. Check for any error messages in the console

### Issue: Custom Status Not Working

If your custom status configuration is not working:

1. Verify the format of your configuration file
2. Ensure the configuration file is in the correct location
3. Try restarting the Task Master CLI