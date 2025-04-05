/**
 * dashboard-generator.js
 * Generates visualizations for tasks, dependencies, and critical paths
 */

import fs from 'fs';
import path from 'path';
import { log, CONFIG, readJSON, writeJSON } from './utils.js';
import { OptimizationAdapter } from './optimization-adapter.js';
import { StatusEnhancer } from './status-enhancer.js';

// Configuration for DashboardGenerator
const DASHBOARD_GENERATOR_CONFIG = {
  enabled: process.env.ENABLE_DASHBOARD === 'true' || true,
  outputDir: process.env.DASHBOARD_OUTPUT_DIR || './dashboard',
  templateDir: process.env.DASHBOARD_TEMPLATE_DIR || './templates',
  updateInterval: parseInt(process.env.DASHBOARD_UPDATE_INTERVAL || '5000'), // 5 seconds
  refreshThreshold: parseInt(process.env.DASHBOARD_REFRESH_THRESHOLD || '300000'), // 5 minutes
  maxGraphSize: parseInt(process.env.DASHBOARD_MAX_GRAPH_SIZE || '200'),
};

/**
 * Dashboard generator for visualizing tasks and dependencies
 */
class DashboardGenerator {
  /**
   * Create a new DashboardGenerator instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.config = { ...DASHBOARD_GENERATOR_CONFIG, ...options };
    this.optimizationAdapter = new OptimizationAdapter();
    this.statusEnhancer = options.statusEnhancer || new StatusEnhancer();
    this.lastUpdate = null;
    this.updateTimer = null;
    this.dashboardData = null;
    
    // For real-time updates
    this.listeners = new Map();
    this.nextListenerId = 1;
    
    // Initialize output directory
    this._initializeOutputDirectory();
  }
  
  /**
   * Initialize output directory
   * @private
   */
  _initializeOutputDirectory() {
    try {
      if (!fs.existsSync(this.config.outputDir)) {
        fs.mkdirSync(this.config.outputDir, { recursive: true });
        log('info', `Created dashboard output directory: ${this.config.outputDir}`);
      }
    } catch (error) {
      log('error', `Failed to initialize dashboard output directory: ${error.message}`);
    }
  }
  
  /**
   * Generate a master dashboard with all visualizations
   * @param {Object} options - Dashboard options
   * @returns {Promise<string>} HTML content for the dashboard
   */
  async generateMasterDashboard(options = {}) {
    try {
      const tasksPath = options.tasksPath || path.join(process.cwd(), 'tasks', 'tasks.json');
      
      // Get tasks data
      const tasksData = this._loadTasksData(tasksPath);
      if (!tasksData || !tasksData.tasks || !Array.isArray(tasksData.tasks)) {
        throw new Error('Invalid or empty tasks data');
      }
      
      // Process tasks data
      const filteredTasks = this._filterTasks(tasksData.tasks, options.filter);
      const processedTasks = this._processTasks(filteredTasks);
      
      // Generate dashboard components
      const summary = this._generateSummary(processedTasks);
      const taskTable = this._generateTaskTable(processedTasks, options.tableOptions);
      const statusChart = this._generateStatusChart(processedTasks);
      const dependencyGraph = await this.renderDependencyGraph({
        tasks: processedTasks,
        highlightCriticalPath: options.highlightCriticalPath !== false,
        layout: options.graphLayout || 'force',
      });
      
      // Save processed data for real-time updates
      this.dashboardData = {
        tasks: processedTasks,
        summary,
        lastUpdate: new Date().toISOString(),
      };
      this.lastUpdate = Date.now();
      
      // Generate full HTML
      const html = this._generateDashboardHtml({
        title: options.title || 'Task Master AI Dashboard',
        summary,
        taskTable,
        statusChart,
        dependencyGraph,
        options,
      });
      
      // Save to file if requested
      if (options.output) {
        const outputPath = path.resolve(this.config.outputDir, options.output);
        fs.writeFileSync(outputPath, html);
        log('info', `Dashboard saved to ${outputPath}`);
      }
      
      return html;
    } catch (error) {
      log('error', `Generate master dashboard error: ${error.message}`);
      // Return a basic error dashboard
      return this._generateErrorDashboard(error);
    }
  }
  
  /**
   * Format a dashboard specifically for Holocron display
   * @param {Object} options - Dashboard options
   * @returns {Promise<Object>} Formatted dashboard data
   */
  async formatHolocronDashboard(options = {}) {
    try {
      // Generate regular dashboard data first
      if (!this.dashboardData || (Date.now() - this.lastUpdate) > this.config.refreshThreshold) {
        await this.generateMasterDashboard(options);
      }
      
      if (!this.dashboardData) {
        throw new Error('Failed to generate dashboard data');
      }
      
      // Format for Holocron
      const holocronFormat = {
        type: 'dashboard',
        title: options.title || 'Task Master AI Dashboard',
        lastUpdate: this.dashboardData.lastUpdate,
        summary: this.dashboardData.summary,
        sections: [
          {
            id: 'tasks',
            title: 'Tasks',
            type: 'table',
            data: this.dashboardData.tasks.map(task => ({
              id: task.id,
              title: task.title,
              status: task.status,
              priority: task.priority,
              progress: task.progressPercentage,
              dependencies: task.dependencies ? task.dependencies.length : 0,
            })),
          },
          {
            id: 'status',
            title: 'Status Distribution',
            type: 'chart',
            chartType: 'pie',
            data: Object.entries(this.dashboardData.summary.statusCounts).map(([status, count]) => ({
              label: status,
              value: count,
              color: this._getStatusColor(status),
            })),
          },
        ],
      };
      
      // Add dependency graph if available
      if (this.dashboardData.dependencyGraph) {
        holocronFormat.sections.push({
          id: 'dependencies',
          title: 'Dependency Graph',
          type: 'graph',
          data: {
            nodes: this.dashboardData.dependencyGraph.nodes,
            edges: this.dashboardData.dependencyGraph.edges,
          },
        });
      }
      
      return holocronFormat;
    } catch (error) {
      log('error', `Format Holocron dashboard error: ${error.message}`);
      return {
        type: 'dashboard',
        title: 'Error Dashboard',
        error: error.message,
      };
    }
  }
  
  /**
   * Render a dependency graph visualization
   * @param {Object} options - Graph options
   * @returns {Promise<Object>} Graph rendering data
   */
  async renderDependencyGraph(options = {}) {
    try {
      // Get tasks
      const tasks = options.tasks || this.dashboardData?.tasks;
      if (!tasks || !Array.isArray(tasks)) {
        throw new Error('No tasks available for graph rendering');
      }
      
      // Limit graph size if needed
      let graphTasks = tasks;
      if (tasks.length > this.config.maxGraphSize) {
        graphTasks = this._limitGraphSize(tasks, this.config.maxGraphSize);
        log('info', `Limited dependency graph to ${graphTasks.length} tasks`);
      }
      
      // Prepare nodes and edges
      const nodes = graphTasks.map(task => ({
        id: task.id.toString(),
        label: task.title,
        status: task.status,
        priority: task.priority,
        color: this._getStatusColor(task.status),
        size: this._getNodeSize(task),
      }));
      
      const edges = [];
      for (const task of graphTasks) {
        if (task.dependencies && task.dependencies.length > 0) {
          for (const depId of task.dependencies) {
            // Check if both source and target exist in our graph tasks
            if (graphTasks.some(t => t.id === depId)) {
              edges.push({
                source: depId.toString(),
                target: task.id.toString(),
                label: 'depends on',
                type: 'dependency',
              });
            }
          }
        }
      }
      
      // Calculate critical path if requested
      if (options.highlightCriticalPath) {
        const criticalPath = this._calculateCriticalPath(graphTasks);
        
        // Mark critical path edges
        for (let i = 0; i < criticalPath.length - 1; i++) {
          const source = criticalPath[i].toString();
          const target = criticalPath[i + 1].toString();
          
          // Find and mark the edge
          const edge = edges.find(e => 
            e.source === source && e.target === target ||
            e.source === target && e.target === source
          );
          
          if (edge) {
            edge.critical = true;
            edge.color = '#ff0000'; // Red for critical path
            edge.width = 3; // Thicker line for emphasis
          }
        }
        
        // Mark critical path nodes
        for (const nodeId of criticalPath) {
          const node = nodes.find(n => n.id === nodeId.toString());
          if (node) {
            node.critical = true;
            node.borderColor = '#ff0000'; // Red border
            node.borderWidth = 3; // Thicker border
          }
        }
      }
      
      // Store the rendered graph data
      const graphData = { nodes, edges };
      if (this.dashboardData) {
        this.dashboardData.dependencyGraph = graphData;
      }
      
      // Apply layout algorithm
      const layout = options.layout || 'force';
      const layoutedGraph = this._applyGraphLayout(graphData, layout);
      
      return layoutedGraph;
    } catch (error) {
      log('error', `Render dependency graph error: ${error.message}`);
      return { nodes: [], edges: [], error: error.message };
    }
  }
  
  /**
   * Set up real-time dashboard updates
   * @param {Object} options - Update options
   * @returns {Object} Controller for the updates
   */
  updateRealTimeDisplay(options = {}) {
    try {
      const interval = options.interval || this.config.updateInterval;
      const callback = options.callback;
      const selector = options.selector;
      
      // Clear existing timer
      if (this.updateTimer) {
        clearInterval(this.updateTimer);
        this.updateTimer = null;
      }
      
      // Set up the update timer
      this.updateTimer = setInterval(async () => {
        try {
          // Update the dashboard data
          const html = await this.generateMasterDashboard({
            ...options,
            output: false, // Don't save to file on auto-updates
          });
          
          // Call the callback if provided
          if (callback && typeof callback === 'function') {
            callback(html, this.dashboardData);
          }
          
          // Notify all listeners
          this._notifyListeners({
            type: 'update',
            data: this.dashboardData,
            timestamp: new Date().toISOString(),
          });
        } catch (updateError) {
          log('error', `Real-time update error: ${updateError.message}`);
        }
      }, interval);
      
      // Return a controller object
      const listenerId = this._addListener(options.onUpdate);
      
      const controller = {
        stop: () => {
          if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
          }
          this._removeListener(listenerId);
          log('info', 'Real-time updates stopped');
        },
        isRunning: () => !!this.updateTimer,
        forceUpdate: async () => {
          try {
            const html = await this.generateMasterDashboard({
              ...options,
              output: false,
            });
            if (callback && typeof callback === 'function') {
              callback(html, this.dashboardData);
            }
            return true;
          } catch (error) {
            log('error', `Force update error: ${error.message}`);
            return false;
          }
        }
      };
      
      log('info', `Real-time updates started with ${interval}ms interval`);
      return controller;
    } catch (error) {
      log('error', `Setup real-time updates error: ${error.message}`);
      return {
        stop: () => {},
        isRunning: () => false,
        forceUpdate: async () => false,
      };
    }
  }
  
  // Private methods
  
  /**
   * Load tasks data from file
   * @param {string} tasksPath - Path to tasks.json file
   * @returns {Object} Tasks data
   * @private
   */
  _loadTasksData(tasksPath) {
    try {
      const reader = this.optimizationAdapter.createOptimizedReader(tasksPath);
      const content = reader();
      return JSON.parse(content);
    } catch (error) {
      log('error', `Load tasks data error: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Filter tasks based on criteria
   * @param {Array} tasks - Tasks to filter
   * @param {Object|Function} filter - Filter criteria or function
   * @returns {Array} Filtered tasks
   * @private
   */
  _filterTasks(tasks, filter) {
    if (!filter) return tasks;
    
    // If filter is a function, use it directly
    if (typeof filter === 'function') {
      return tasks.filter(filter);
    }
    
    // Otherwise, filter based on properties
    return tasks.filter(task => {
      for (const [key, value] of Object.entries(filter)) {
        // Special case for IDs
        if (key === 'ids' && Array.isArray(value)) {
          if (!value.includes(task.id)) return false;
          continue;
        }
        
        // Handle various filter types
        if (key === 'status' && task.status !== value) return false;
        if (key === 'priority' && task.priority !== value) return false;
        if (key === 'search' && !this._searchTask(task, value)) return false;
      }
      return true;
    });
  }
  
  /**
   * Search a task for text
   * @param {Object} task - Task to search
   * @param {string} searchText - Text to search for
   * @returns {boolean} True if task matches search
   * @private
   */
  _searchTask(task, searchText) {
    if (!searchText) return true;
    
    const search = searchText.toLowerCase();
    
    // Search in title and description
    if (task.title && task.title.toLowerCase().includes(search)) return true;
    if (task.description && task.description.toLowerCase().includes(search)) return true;
    if (task.details && task.details.toLowerCase().includes(search)) return true;
    
    // Search in subtasks
    if (task.subtasks && Array.isArray(task.subtasks)) {
      for (const subtask of task.subtasks) {
        if (subtask.title && subtask.title.toLowerCase().includes(search)) return true;
        if (subtask.description && subtask.description.toLowerCase().includes(search)) return true;
      }
    }
    
    return false;
  }
  
  /**
   * Process tasks for display
   * @param {Array} tasks - Tasks to process
   * @returns {Array} Processed tasks
   * @private
   */
  _processTasks(tasks) {
    return tasks.map(task => {
      // Calculate progress percentage
      let progressPercentage = 0;
      
      // Use status enhancer to get status information
      const enhancedStatus = this.statusEnhancer.parseStatusInput(task.status);
      if (enhancedStatus && typeof enhancedStatus.percentage === 'number') {
        progressPercentage = enhancedStatus.percentage;
      } else {
        // Fallback calculation based on status
        switch(task.status) {
          case 'done':
            progressPercentage = 100;
            break;
          case 'in-progress':
            progressPercentage = 50;
            break;
          case 'blocked':
            progressPercentage = 25;
            break;
          case 'not-started':
          default:
            progressPercentage = 0;
        }
      }
      
      // Calculate subtask progress if available
      if (task.subtasks && task.subtasks.length > 0) {
        const completedSubtasks = task.subtasks.filter(
          st => st.status === 'done'
        ).length;
        const subtaskPercentage = (completedSubtasks / task.subtasks.length) * 100;
        
        // Weighted average between status and subtasks
        progressPercentage = (progressPercentage * 0.6) + (subtaskPercentage * 0.4);
      }
      
      return {
        ...task,
        progressPercentage: Math.round(progressPercentage),
        enhancedStatus,
      };
    });
  }
  
  /**
   * Generate summary statistics
   * @param {Array} tasks - Processed tasks
   * @returns {Object} Summary statistics
   * @private
   */
  _generateSummary(tasks) {
    const summary = {
      totalTasks: tasks.length,
      statusCounts: {},
      priorityCounts: {},
      completionPercentage: 0,
      blockedTasks: 0,
    };
    
    // Count tasks by status
    for (const task of tasks) {
      // Status counts
      const status = task.status || 'unknown';
      summary.statusCounts[status] = (summary.statusCounts[status] || 0) + 1;
      
      // Priority counts
      const priority = task.priority || 'medium';
      summary.priorityCounts[priority] = (summary.priorityCounts[priority] || 0) + 1;
      
      // Count blocked tasks
      if (status === 'blocked') {
        summary.blockedTasks++;
      }
    }
    
    // Calculate completion percentage
    const completedTasks = summary.statusCounts['done'] || 0;
    summary.completionPercentage = Math.round((completedTasks / summary.totalTasks) * 100) || 0;
    
    return summary;
  }
  
  /**
   * Generate task table HTML
   * @param {Array} tasks - Processed tasks
   * @param {Object} options - Table options
   * @returns {string} Table HTML
   * @private
   */
  _generateTaskTable(tasks, options = {}) {
    // Sort tasks if requested
    let sortedTasks = [...tasks];
    if (options.sort) {
      const [field, direction] = options.sort.split(':');
      const multiplier = direction === 'desc' ? -1 : 1;
      
      sortedTasks.sort((a, b) => {
        if (field === 'id') return (a.id - b.id) * multiplier;
        if (field === 'priority') {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return (priorityOrder[a.priority] - priorityOrder[b.priority]) * multiplier;
        }
        
        // String comparison for other fields
        const aVal = String(a[field] || '');
        const bVal = String(b[field] || '');
        return aVal.localeCompare(bVal) * multiplier;
      });
    }
    
    // Limit tasks if requested
    if (options.limit && sortedTasks.length > options.limit) {
      sortedTasks = sortedTasks.slice(0, options.limit);
    }
    
    // Generate the table
    let html = '<table class="task-table">\n';
    
    // Headers
    html += '<thead>\n<tr>\n';
    html += '<th>ID</th>\n';
    html += '<th>Title</th>\n';
    html += '<th>Status</th>\n';
    html += '<th>Priority</th>\n';
    html += '<th>Progress</th>\n';
    html += '</tr>\n</thead>\n';
    
    // Body
    html += '<tbody>\n';
    for (const task of sortedTasks) {
      html += '<tr>\n';
      html += `<td>${task.id}</td>\n`;
      html += `<td>${task.title}</td>\n`;
      
      // Status with enhanced formatting if available
      if (task.enhancedStatus && task.enhancedStatus.emoji) {
        html += `<td>${task.enhancedStatus.emoji} ${task.status}</td>\n`;
      } else {
        html += `<td>${task.status}</td>\n`;
      }
      
      html += `<td>${task.priority}</td>\n`;
      
      // Progress bar
      html += '<td>\n';
      html += `<div class="progress-bar">\n`;
      html += `<div class="progress-fill" style="width: ${task.progressPercentage}%;"></div>\n`;
      html += `<span>${task.progressPercentage}%</span>\n`;
      html += `</div>\n`;
      html += '</td>\n';
      
      html += '</tr>\n';
    }
    html += '</tbody>\n';
    html += '</table>\n';
    
    return html;
  }
  
  /**
   * Generate status chart HTML
   * @param {Array} tasks - Processed tasks
   * @returns {string} Chart HTML
   * @private
   */
  _generateStatusChart(tasks) {
    // Count tasks by status
    const statusCounts = {};
    for (const task of tasks) {
      const status = task.status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    }
    
    // Generate chart data
    const chartData = Object.entries(statusCounts).map(([status, count]) => ({
      label: status,
      value: count,
      color: this._getStatusColor(status),
    }));
    
    // Generate chart HTML (just a data container - actual chart would be rendered with JavaScript)
    let html = '<div class="status-chart" id="status-chart" data-chart="pie">\n';
    html += `<script type="application/json">${JSON.stringify(chartData)}</script>\n`;
    html += '</div>\n';
    
    return html;
  }
  
  /**
   * Generate full dashboard HTML
   * @param {Object} components - Dashboard components
   * @returns {string} Complete HTML
   * @private
   */
  _generateDashboardHtml(components) {
    const { title, summary, taskTable, statusChart, dependencyGraph, options } = components;
    
    // Start HTML document
    let html = '<!DOCTYPE html>\n';
    html += '<html lang="en">\n';
    html += '<head>\n';
    html += `<title>${title}</title>\n`;
    html += '<meta charset="UTF-8">\n';
    html += '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n';
    
    // Add CSS styles
    html += '<style>\n';
    html += this._getDashboardStyles();
    html += '</style>\n';
    html += '</head>\n';
    html += '<body>\n';
    
    // Header
    html += `<h1>${title}</h1>\n`;
    html += `<p class="updated-at">Last updated: ${new Date().toLocaleString()}</p>\n`;
    
    // Summary section
    html += '<div class="summary-section">\n';
    html += '<h2>Project Summary</h2>\n';
    html += '<div class="summary-cards">\n';
    html += `<div class="summary-card"><div class="card-value">${summary.totalTasks}</div><div class="card-label">Total Tasks</div></div>\n`;
    html += `<div class="summary-card"><div class="card-value">${summary.completionPercentage}%</div><div class="card-label">Completion</div></div>\n`;
    html += `<div class="summary-card"><div class="card-value">${summary.statusCounts.done || 0}</div><div class="card-label">Completed</div></div>\n`;
    html += `<div class="summary-card"><div class="card-value">${summary.blockedTasks}</div><div class="card-label">Blocked</div></div>\n`;
    html += '</div>\n';
    html += '</div>\n';
    
    // Two-column layout for charts and table
    html += '<div class="dashboard-grid">\n';
    
    // Left column - Status Chart
    html += '<div class="grid-item">\n';
    html += '<h2>Status Distribution</h2>\n';
    html += statusChart;
    html += '</div>\n';
    
    // Right column - Task Table
    html += '<div class="grid-item">\n';
    html += '<h2>Tasks</h2>\n';
    html += taskTable;
    html += '</div>\n';
    
    html += '</div>\n';
    
    // Dependency graph section (full width)
    html += '<div class="dependency-section">\n';
    html += '<h2>Dependency Graph</h2>\n';
    html += '<div class="dependency-graph" id="dependency-graph">\n';
    
    // Add SVG placeholder for graph
    html += '<svg width="100%" height="500px" id="graph-svg">\n';
    html += '<g id="graph-container"></g>\n';
    html += '</svg>\n';
    
    // Add graph data as JSON
    html += `<script type="application/json" id="graph-data">${JSON.stringify(dependencyGraph)}</script>\n`;
    html += '</div>\n';
    html += '</div>\n';
    
    // Add JavaScript for interactive features
    html += '<script>\n';
    html += this._getDashboardScripts();
    html += '</script>\n';
    
    // Close body and HTML
    html += '</body>\n';
    html += '</html>\n';
    
    return html;
  }
  
  /**
   * Generate a simple error dashboard
   * @param {Error} error - The error that occurred
   * @returns {string} Error dashboard HTML
   * @private
   */
  _generateErrorDashboard(error) {
    let html = '<!DOCTYPE html>\n';
    html += '<html lang="en">\n';
    html += '<head>\n';
    html += '<title>Dashboard Error</title>\n';
    html += '<meta charset="UTF-8">\n';
    html += '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n';
    html += '<style>\n';
    html += `
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
      .error-container { background-color: #fff3f3; border-left: 4px solid #e53935; padding: 15px; margin: 20px 0; }
      h1 { color: #e53935; }
      pre { background-color: #f8f8f8; padding: 15px; overflow: auto; border-radius: 4px; }
    `;
    html += '</style>\n';
    html += '</head>\n';
    html += '<body>\n';
    html += '<h1>Dashboard Error</h1>\n';
    html += '<div class="error-container">\n';
    html += `<p>Error generating dashboard: ${error.message}</p>\n`;
    html += `<pre>${error.stack}</pre>\n`;
    html += '</div>\n';
    html += '<p>Please check the logs for more details or try again later.</p>\n';
    html += '</body>\n';
    html += '</html>\n';
    
    return html;
  }
  
  /**
   * Get CSS styles for the dashboard
   * @returns {string} CSS styles
   * @private
   */
  _getDashboardStyles() {
    return `
      /* Base styles */
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
        background-color: #f9f9f9;
      }
      h1, h2 {
        color: #2c3e50;
      }
      .updated-at {
        color: #7f8c8d;
        font-style: italic;
        margin-bottom: 20px;
      }
      
      /* Summary cards */
      .summary-section {
        margin-bottom: 30px;
      }
      .summary-cards {
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
        margin-top: 20px;
      }
      .summary-card {
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        padding: 20px;
        min-width: 150px;
        flex: 1;
        text-align: center;
      }
      .card-value {
        font-size: 2.5rem;
        font-weight: bold;
        color: #3498db;
      }
      .card-label {
        font-size: 1rem;
        color: #7f8c8d;
      }
      
      /* Dashboard grid */
      .dashboard-grid {
        display: grid;
        grid-template-columns: 1fr 2fr;
        gap: 20px;
        margin-bottom: 30px;
      }
      .grid-item {
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        padding: 20px;
      }
      
      /* Task table */
      .task-table {
        width: 100%;
        border-collapse: collapse;
      }
      .task-table th {
        background-color: #f2f2f2;
        padding: 10px;
        text-align: left;
        border-bottom: 2px solid #ddd;
      }
      .task-table td {
        padding: 10px;
        border-bottom: 1px solid #ddd;
      }
      .task-table tr:hover {
        background-color: #f5f5f5;
      }
      .progress-bar {
        width: 100%;
        background-color: #f2f2f2;
        border-radius: 4px;
        position: relative;
        height: 20px;
      }
      .progress-fill {
        height: 100%;
        background-color: #3498db;
        border-radius: 4px;
      }
      .progress-bar span {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #333;
        font-size: 12px;
        font-weight: bold;
      }
      
      /* Dependency graph */
      .dependency-section {
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        padding: 20px;
        margin-bottom: 30px;
      }
      .dependency-graph {
        width: 100%;
        height: 500px;
        border: 1px solid #ddd;
        border-radius: 4px;
        overflow: hidden;
      }
      #graph-svg {
        background-color: #f9f9f9;
      }
      .node circle {
        fill: white;
        stroke-width: 2px;
      }
      .node text {
        font-size: 12px;
      }
      .link {
        stroke: #999;
        stroke-opacity: 0.6;
        stroke-width: 1px;
      }
      .link.critical {
        stroke: #ff0000;
        stroke-width: 3px;
      }
      
      /* Status colors */
      .status-done { color: #27ae60; }
      .status-in-progress { color: #3498db; }
      .status-not-started { color: #95a5a6; }
      .status-blocked { color: #e74c3c; }
    `;
  }
  
  /**
   * Get JavaScript for interactive dashboard features
   * @returns {string} JavaScript code
   * @private
   */
  _getDashboardScripts() {
    // Note: This is a simplified version. In a real implementation,
    // this would use proper visualization libraries like D3.js
    return `
      // Simple pie chart renderer
      function renderPieChart() {
        const chartContainer = document.getElementById('status-chart');
        if (!chartContainer) return;
        
        const chartData = JSON.parse(chartContainer.querySelector('script').textContent);
        if (!chartData || !chartData.length) return;
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '300px');
        svg.setAttribute('viewBox', '-1 -1 2 2');
        chartContainer.appendChild(svg);
        
        // Calculate total for percentages
        const total = chartData.reduce((sum, item) => sum + item.value, 0);
        
        // Draw pie segments
        let startAngle = 0;
        for (const item of chartData) {
          const percentage = item.value / total;
          const endAngle = startAngle + percentage * 2 * Math.PI;
          
          // Calculate path
          const x1 = Math.cos(startAngle);
          const y1 = Math.sin(startAngle);
          const x2 = Math.cos(endAngle);
          const y2 = Math.sin(endAngle);
          
          // Create path element
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          const largeArc = percentage > 0.5 ? 1 : 0;
          
          path.setAttribute(
            'd',
            \`M 0 0 L \${x1} \${y1} A 1 1 0 \${largeArc} 1 \${x2} \${y2} Z\`
          );
          path.setAttribute('fill', item.color || '#ccc');
          path.setAttribute('stroke', 'white');
          path.setAttribute('stroke-width', '0.01');
          
          // Add tooltip
          path.setAttribute('data-label', item.label);
          path.setAttribute('data-value', item.value);
          path.setAttribute('data-percentage', \`\${Math.round(percentage * 100)}%\`);
          
          // Add hover effect
          path.addEventListener('mouseover', function() {
            this.setAttribute('opacity', '0.8');
          });
          path.addEventListener('mouseout', function() {
            this.setAttribute('opacity', '1');
          });
          
          svg.appendChild(path);
          startAngle = endAngle;
        }
        
        // Add legend
        const legend = document.createElement('div');
        legend.className = 'chart-legend';
        legend.style.display = 'flex';
        legend.style.flexWrap = 'wrap';
        legend.style.marginTop = '10px';
        legend.style.justifyContent = 'center';
        
        for (const item of chartData) {
          const legendItem = document.createElement('div');
          legendItem.style.display = 'flex';
          legendItem.style.alignItems = 'center';
          legendItem.style.margin = '5px 10px';
          
          const colorBox = document.createElement('div');
          colorBox.style.width = '12px';
          colorBox.style.height = '12px';
          colorBox.style.backgroundColor = item.color || '#ccc';
          colorBox.style.marginRight = '5px';
          
          const label = document.createElement('span');
          const percentage = (item.value / total) * 100;
          label.textContent = \`\${item.label}: \${item.value} (\${percentage.toFixed(1)}%)\`;
          
          legendItem.appendChild(colorBox);
          legendItem.appendChild(label);
          legend.appendChild(legendItem);
        }
        
        chartContainer.appendChild(legend);
      }
      
      // Simple graph renderer
      function renderGraph() {
        const graphContainer = document.getElementById('dependency-graph');
        if (!graphContainer) return;
        
        const dataScript = document.getElementById('graph-data');
        if (!dataScript) return;
        
        try {
          const graphData = JSON.parse(dataScript.textContent);
          if (!graphData || !graphData.nodes || !graphData.edges) return;
          
          console.log('Graph data loaded:', graphData);
          
          // In a real implementation, this would use D3.js or a similar library
          // to render an interactive graph visualization
          
          // For this simplified version, we'll just display node and edge counts
          const infoDiv = document.createElement('div');
          infoDiv.style.padding = '20px';
          infoDiv.style.textAlign = 'center';
          
          infoDiv.innerHTML = \`
            <p>Graph visualization would be rendered here.</p>
            <p>Nodes: \${graphData.nodes.length}, Edges: \${graphData.edges.length}</p>
            <p>This is a placeholder. In a real implementation, an interactive graph would be displayed.</p>
          \`;
          
          graphContainer.appendChild(infoDiv);
        } catch (error) {
          console.error('Error rendering graph:', error);
        }
      }
      
      // Run when document is loaded
      document.addEventListener('DOMContentLoaded', function() {
        renderPieChart();
        renderGraph();
      });
    `;
  }
  
  /**
   * Get color for a status
   * @param {string} status - Status value
   * @returns {string} CSS color
   * @private
   */
  _getStatusColor(status) {
    const colors = {
      'done': '#27ae60', // Green
      'in-progress': '#3498db', // Blue
      'not-started': '#95a5a6', // Gray
      'blocked': '#e74c3c', // Red
      'under-review': '#f39c12', // Orange
      'deferred': '#8e44ad', // Purple
      'canceled': '#7f8c8d', // Dark gray
    };
    
    return colors[status] || '#95a5a6';
  }
  
  /**
   * Calculate node size based on task properties
   * @param {Object} task - Task
   * @returns {number} Node size
   * @private
   */
  _getNodeSize(task) {
    // Base size
    let size = 10;
    
    // Adjust based on priority
    if (task.priority === 'high') size += 4;
    if (task.priority === 'low') size -= 2;
    
    // Adjust based on subtasks
    if (task.subtasks && task.subtasks.length) {
      size += Math.min(5, task.subtasks.length);
    }
    
    // Larger size for blocked tasks to make them more visible
    if (task.status === 'blocked') size += 3;
    
    return size;
  }
  
  /**
   * Calculate the critical path through tasks
   * @param {Array} tasks - Tasks to analyze
   * @returns {Array} Critical path as array of task IDs
   * @private
   */
  _calculateCriticalPath(tasks) {
    // Build dependency graph
    const dependencyGraph = {};
    const reverseGraph = {}; // To track dependents of each task
    
    // Initialize graphs
    for (const task of tasks) {
      dependencyGraph[task.id] = [];
      reverseGraph[task.id] = [];
    }
    
    // Fill in dependencies
    for (const task of tasks) {
      if (task.dependencies && task.dependencies.length > 0) {
        for (const depId of task.dependencies) {
          if (dependencyGraph[depId]) {
            dependencyGraph[depId].push(task.id);
            reverseGraph[task.id].push(depId);
          }
        }
      }
    }
    
    // Find start nodes (tasks with no dependencies)
    const startNodes = tasks
      .filter(task => !reverseGraph[task.id].length)
      .map(task => task.id);
    
    // Find end nodes (tasks with no dependents)
    const endNodes = tasks
      .filter(task => !dependencyGraph[task.id].length)
      .map(task => task.id);
    
    // If no clear start or end, use tasks with least dependencies/dependents
    if (!startNodes.length) {
      const minDeps = Math.min(...tasks.map(task => reverseGraph[task.id].length));
      startNodes.push(...tasks
        .filter(task => reverseGraph[task.id].length === minDeps)
        .map(task => task.id));
    }
    
    if (!endNodes.length) {
      const minDeps = Math.min(...tasks.map(task => dependencyGraph[task.id].length));
      endNodes.push(...tasks
        .filter(task => dependencyGraph[task.id].length === minDeps)
        .map(task => task.id));
    }
    
    // Calculate longest path for each end node
    let criticalPath = [];
    let maxLength = -1;
    
    for (const endNode of endNodes) {
      for (const startNode of startNodes) {
        const paths = this._findAllPaths(dependencyGraph, startNode, endNode);
        
        for (const path of paths) {
          if (path.length > maxLength) {
            maxLength = path.length;
            criticalPath = path;
          }
        }
      }
    }
    
    return criticalPath;
  }
  
  /**
   * Find all paths between two nodes in a graph
   * @param {Object} graph - Dependency graph
   * @param {number|string} start - Start node ID
   * @param {number|string} end - End node ID
   * @returns {Array} Array of paths
   * @private
   */
  _findAllPaths(graph, start, end, path = [], visited = new Set()) {
    path = [...path, start];
    
    if (start === end) {
      return [path];
    }
    
    if (!graph[start] || visited.has(start)) {
      return [];
    }
    
    visited.add(start);
    let paths = [];
    
    for (const node of graph[start]) {
      const newPaths = this._findAllPaths(graph, node, end, path, new Set(visited));
      paths.push(...newPaths);
    }
    
    return paths;
  }
  
  /**
   * Apply a layout algorithm to graph data
   * @param {Object} graphData - Graph nodes and edges
   * @param {string} layout - Layout algorithm name
   * @returns {Object} Layouted graph data
   * @private
   */
  _applyGraphLayout(graphData, layout) {
    // This is a simplified version. In a real implementation,
    // this would use proper graph layout algorithms.
    
    // Make a copy of the data
    const result = JSON.parse(JSON.stringify(graphData));
    
    // Apply a simple circular layout as placeholder
    const nodes = result.nodes;
    const nodeCount = nodes.length;
    
    if (nodeCount > 0) {
      const radius = Math.min(250, nodeCount * 20);
      
      for (let i = 0; i < nodeCount; i++) {
        const angle = (i / nodeCount) * 2 * Math.PI;
        nodes[i].x = radius * Math.cos(angle);
        nodes[i].y = radius * Math.sin(angle);
      }
    }
    
    return result;
  }
  
  /**
   * Limit the graph size by selecting most important tasks
   * @param {Array} tasks - All tasks
   * @param {number} maxSize - Maximum number of tasks to include
   * @returns {Array} Limited task set
   * @private
   */
  _limitGraphSize(tasks, maxSize) {
    // Filter strategy: prioritize high-priority tasks and keep dependency chains intact
    
    // First, include all high priority tasks
    let selectedTasks = tasks.filter(task => task.priority === 'high');
    
    // If we still have space, add medium priority tasks
    if (selectedTasks.length < maxSize) {
      const mediumTasks = tasks.filter(task => task.priority === 'medium');
      selectedTasks.push(...mediumTasks.slice(0, maxSize - selectedTasks.length));
    }
    
    // If we still have space, add other tasks
    if (selectedTasks.length < maxSize) {
      const otherTasks = tasks.filter(
        task => task.priority !== 'high' && task.priority !== 'medium'
      );
      selectedTasks.push(...otherTasks.slice(0, maxSize - selectedTasks.length));
    }
    
    // Ensure we include direct dependencies of selected tasks to maintain graph integrity
    const selectedTaskIds = new Set(selectedTasks.map(task => task.id));
    const additionalTasks = [];
    
    // Look for dependencies not yet included
    for (const task of selectedTasks) {
      if (task.dependencies && task.dependencies.length) {
        for (const depId of task.dependencies) {
          if (!selectedTaskIds.has(depId)) {
            const depTask = tasks.find(t => t.id === depId);
            if (depTask) {
              additionalTasks.push(depTask);
              selectedTaskIds.add(depId);
              
              // Break if we've reached the limit
              if (selectedTasks.length + additionalTasks.length >= maxSize) {
                break;
              }
            }
          }
        }
        
        // Break if we've reached the limit
        if (selectedTasks.length + additionalTasks.length >= maxSize) {
          break;
        }
      }
    }
    
    // Add additional tasks up to maxSize
    selectedTasks.push(...additionalTasks.slice(0, maxSize - selectedTasks.length));
    
    return selectedTasks;
  }
  
  /**
   * Add an update listener
   * @param {Function} callback - Callback function
   * @returns {number} Listener ID
   * @private
   */
  _addListener(callback) {
    if (!callback || typeof callback !== 'function') return -1;
    
    const id = this.nextListenerId++;
    this.listeners.set(id, callback);
    return id;
  }
  
  /**
   * Remove an update listener
   * @param {number} id - Listener ID
   * @private
   */
  _removeListener(id) {
    this.listeners.delete(id);
  }
  
  /**
   * Notify all update listeners
   * @param {Object} data - Update data
   * @private
   */
  _notifyListeners(data) {
    for (const callback of this.listeners.values()) {
      try {
        callback(data);
      } catch (error) {
        log('error', `Listener callback error: ${error.message}`);
      }
    }
  }
}

export { DashboardGenerator, DASHBOARD_GENERATOR_CONFIG };