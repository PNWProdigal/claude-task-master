# Dashboard & Visualization Guide

## Overview

Task Master AI provides powerful visualization capabilities through its dashboard to help you understand task relationships, status, and progress. This guide covers how to use the dashboard for maximum effectiveness.

## Table of Contents

- [Getting Started with the Dashboard](#getting-started-with-the-dashboard)
- [Dashboard Components](#dashboard-components)
- [Dependency Visualization](#dependency-visualization)
- [Real-Time Updates](#real-time-updates)
- [Filtering and Sorting](#filtering-and-sorting)
- [Critical Path Analysis](#critical-path-analysis)
- [Customization](#customization)
- [Exporting and Sharing](#exporting-and-sharing)
- [Troubleshooting](#troubleshooting)

## Getting Started with the Dashboard

To launch the Task Master dashboard, use the following command:

```bash
task-master dashboard
```

This will open the dashboard in your default web browser. You can also specify a custom port:

```bash
task-master dashboard --port=3030
```

Or launch it in headless mode for scripting:

```bash
task-master dashboard --headless --output=dashboard.html
```

## Dashboard Components

The dashboard consists of several key components:

### Task Overview

The main task table shows all tasks with their status, priority, and dependencies. You can:

- Click column headers to sort tasks
- Use the search box to filter tasks
- Click on a task to view details
- Right-click for context menu options

### Status Distribution

A visual chart showing the distribution of tasks by status, including:

- Percentage of tasks in each status
- Progress towards completion
- Status trends over time

### Dependency Graph

An interactive network diagram showing task relationships, including:

- Direct dependencies between tasks
- Critical path highlighting
- Blocker identification
- Zoom and pan controls

### Timeline View

A Gantt-style chart showing task scheduling, including:

- Task duration and deadlines
- Dependency links
- Resource allocation

## Dependency Visualization

The dependency graph is a powerful tool for understanding task relationships:

### Navigation

- **Zoom**: Use the mouse wheel or '+/-' buttons
- **Pan**: Click and drag to move around the graph
- **Select**: Click on a node to select a task
- **Focus**: Double-click a node to focus on its dependencies

### Visual Elements

- **Nodes**: Represent tasks, colored by status
- **Edges**: Represent dependencies, with arrows showing direction
- **Red Edges**: Indicate blocking relationships
- **Highlighted Path**: Shows the critical path

### Interaction

You can interact with the graph to manage tasks:

- Right-click a node for task actions
- Drag nodes to rearrange the visualization
- Click an edge to view or edit the dependency
- Use the controls panel to adjust display settings

## Real-Time Updates

The dashboard updates in real-time to reflect changes in your tasks:

- Status changes are immediately reflected
- New tasks appear automatically
- Completed tasks update progress charts
- Dependency changes update the graph

You can control update frequency in the settings panel or use the manual refresh button for on-demand updates.

## Filtering and Sorting

The dashboard provides powerful filtering capabilities:

### Quick Filters

- **Status Filter**: Show only tasks in specific statuses
- **Priority Filter**: Focus on high, medium, or low priority tasks
- **Tag Filter**: Filter by task tags

### Advanced Filtering

Use the advanced filter panel for complex queries:

```
status:in-progress AND priority:high OR assignee:john
```

You can save custom filters for future use.

### Sorting Options

- Sort by ID, status, priority, or dependencies
- Group tasks by status, assignee, or category
- Use custom sorting with drag-and-drop

## Critical Path Analysis

The dashboard helps identify critical path items:

- The critical path is highlighted in the dependency graph
- Critical tasks are marked with a special indicator
- Hover over a critical task to see its impact on the project timeline

You can run a critical path analysis with:

```bash
task-master analyze-critical-path
```

## Customization

The dashboard can be customized to fit your workflow:

### Theme Options

- Light/Dark mode toggle
- Custom color schemes for status and priority
- Adjustable layout density

### Layout Configuration

- Drag panels to rearrange the dashboard
- Resize panels as needed
- Save multiple layout configurations

### Display Options

- Show/hide specific columns or charts
- Adjust graph rendering style
- Change timeline scale

## Exporting and Sharing

You can export dashboard data in various formats:

```bash
# Export the full dashboard as HTML
task-master dashboard --export=html --output=dashboard.html

# Export just the dependency graph
task-master export-graph --format=png --output=dependencies.png

# Export task data as CSV
task-master export --format=csv --output=tasks.csv
```

You can also share dashboard URLs with team members for collaborative viewing (if running in server mode).

## Troubleshooting

### Slow Dashboard Loading

If the dashboard loads slowly:

- Reduce the number of tasks shown with filters
- Simplify the dependency graph using grouping
- Adjust the rendering quality in settings

### Graph Visualization Issues

If the dependency graph is difficult to read:

- Use the "Auto Layout" button to rearrange nodes
- Try different layout algorithms (force-directed, hierarchical, etc.)
- Filter to show only direct dependencies of selected tasks

### Browser Compatibility

The dashboard works best with modern browsers. If you experience issues:

- Update your browser to the latest version
- Try using Chrome or Firefox for best compatibility
- Use the simplified view option for older browsers