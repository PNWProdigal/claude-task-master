/**
 * memory-bridge.js
 * Bidirectional synchronization between Task Master AI and Holocron's memory system
 */

import fs from 'fs';
import path from 'path';
import { log, CONFIG, readJSON, writeJSON } from './utils.js';
import { OptimizationAdapter } from './optimization-adapter.js';

// Configuration for MemoryBridge
const MEMORY_BRIDGE_CONFIG = {
  enabled: process.env.ENABLE_MEMORY_BRIDGE === 'true' || true,
  syncInterval: parseInt(process.env.MEMORY_SYNC_INTERVAL || '300000'), // 5 minutes in ms
  holocronMemoryApiUrl: process.env.HOLOCRON_MEMORY_API_URL || 'http://localhost:3030/api/memory',
  apiKey: process.env.HOLOCRON_API_KEY || '',
  maxRetries: parseInt(process.env.MEMORY_SYNC_MAX_RETRIES || '3'),
  retryDelay: parseInt(process.env.MEMORY_SYNC_RETRY_DELAY || '1000'), // 1 second in ms
  logSyncOperations: process.env.LOG_MEMORY_SYNC === 'true' || true,
};

/**
 * MemoryBridge class for bidirectional synchronization between tasks and Holocron's memory system
 */
class MemoryBridge {
  /**
   * Create a new MemoryBridge instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.config = { ...MEMORY_BRIDGE_CONFIG, ...options };
    this.optimizationAdapter = new OptimizationAdapter();
    this.syncState = {
      lastSyncTime: null,
      inProgress: false,
      syncErrors: [],
      taskHashes: new Map(), // Store hashes of tasks to detect changes
      memoryHashes: new Map(), // Store hashes of memory entities to detect changes
    };
    this.syncIntervalId = null;
    this.isInitialized = false;
    this.logSyncOperation('MemoryBridge instance created');
  }

  /**
   * Initialize the MemoryBridge and test connection to Holocron memory system
   * @returns {Promise<boolean>} True if initialization was successful
   */
  async initialize() {
    try {
      if (!this.config.enabled) {
        log('info', 'MemoryBridge is disabled in configuration');
        return false;
      }

      // Test connection to Holocron memory system
      const connected = await this._testConnection();
      if (!connected) {
        log('warn', 'Failed to connect to Holocron memory system, MemoryBridge will operate in offline mode');
        this.isInitialized = false;
        return false;
      }

      this.isInitialized = true;
      log('info', 'MemoryBridge initialized and connected to Holocron memory system');
      return true;
    } catch (error) {
      this._handleError('Initialization error', error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Mirror a task to the Holocron memory system
   * @param {Object|number|string} task - Task object or task ID
   * @param {string} tasksPath - Path to tasks.json file (required if task is ID)
   * @returns {Promise<Object>} Result of the mirroring operation
   */
  async mirrorTaskToMemory(task, tasksPath) {
    try {
      const taskObj = await this._resolveTask(task, tasksPath);
      if (!taskObj) {
        return { success: false, error: 'Task not found' };
      }

      // Transform task to memory entity format
      const memoryEntity = this._transformTaskToMemoryEntity(taskObj);
      
      // Calculate hash of the task to detect changes
      const taskHash = this._calculateEntityHash(taskObj);
      const savedHash = this.syncState.taskHashes.get(taskObj.id);
      
      // Skip if the task hasn't changed since last sync
      if (savedHash === taskHash) {
        this.logSyncOperation(`Task ${taskObj.id} unchanged, skipping mirror operation`);
        return { success: true, status: 'unchanged' };
      }
      
      // Send to Holocron memory system
      const result = await this._sendToMemorySystem(memoryEntity);
      
      if (result.success) {
        // Update the hash in the sync state
        this.syncState.taskHashes.set(taskObj.id, taskHash);
        this.logSyncOperation(`Task ${taskObj.id} mirrored to memory system`);
        return { success: true, taskId: taskObj.id, memoryEntityId: result.entityId };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      this._handleError('Mirror task error', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Synchronize task data from Holocron's memory system to Task Master
   * @param {string} tasksPath - Path to tasks.json file
   * @returns {Promise<Object>} Result of the synchronization operation
   */
  async syncMemoryToTask(tasksPath) {
    if (!this.isInitialized) {
      this.logSyncOperation('MemoryBridge not initialized, skipping syncMemoryToTask');
      return { success: false, error: 'MemoryBridge not initialized' };
    }

    try {
      this.syncState.inProgress = true;
      this.logSyncOperation('Starting memory-to-task synchronization');
      
      // Get memory entities related to tasks
      const memoryEntities = await this._fetchMemoryEntities();
      if (!memoryEntities || !Array.isArray(memoryEntities)) {
        return { success: false, error: 'Failed to fetch memory entities' };
      }
      
      // Load current tasks
      const tasksData = await this._safeReadJSON(tasksPath);
      if (!tasksData || !tasksData.tasks) {
        return { success: false, error: 'Failed to read tasks data' };
      }
      
      // Track operations performed
      const operations = {
        created: [],
        updated: [],
        skipped: [],
        failed: []
      };
      
      // Process each memory entity
      for (const entity of memoryEntities) {
        try {
          // Skip entities that don't have task data
          if (!entity.metadata || !entity.metadata.taskId) {
            operations.skipped.push(entity.id);
            continue;
          }
          
          // Calculate hash of the memory entity
          const entityHash = this._calculateEntityHash(entity);
          const savedHash = this.syncState.memoryHashes.get(entity.id);
          
          // Skip if the entity hasn't changed since last sync
          if (savedHash === entityHash) {
            operations.skipped.push(entity.id);
            continue;
          }
          
          // Transform memory entity to task format
          const taskData = this._transformMemoryEntityToTask(entity);
          const taskId = parseInt(entity.metadata.taskId, 10);
          
          // Find if the task already exists
          const existingTaskIndex = tasksData.tasks.findIndex(t => t.id === taskId);
          
          if (existingTaskIndex >= 0) {
            // Update existing task
            const mergedTask = this._mergeTaskData(tasksData.tasks[existingTaskIndex], taskData);
            tasksData.tasks[existingTaskIndex] = mergedTask;
            operations.updated.push(taskId);
          } else {
            // Create new task
            tasksData.tasks.push(taskData);
            operations.created.push(taskId);
          }
          
          // Update the hash in the sync state
          this.syncState.memoryHashes.set(entity.id, entityHash);
        } catch (error) {
          this._handleError(`Error processing memory entity ${entity.id}`, error);
          operations.failed.push(entity.id);
        }
      }
      
      // Write updated tasks back to file
      const writer = this.optimizationAdapter.createOptimizedWriter(tasksPath);
      writer(JSON.stringify(tasksData, null, 2));
      
      this.syncState.lastSyncTime = new Date();
      this.syncState.inProgress = false;
      
      this.logSyncOperation(`Memory-to-task sync completed: ${operations.created.length} created, ${operations.updated.length} updated, ${operations.skipped.length} skipped, ${operations.failed.length} failed`);
      
      return { 
        success: true, 
        operations 
      };
    } catch (error) {
      this.syncState.inProgress = false;
      this._handleError('Sync memory to task error', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Initialize automatic mirroring between tasks and memory
   * @param {string} tasksPath - Path to tasks.json file
   * @param {Object} options - Additional options for auto-mirroring
   * @returns {Promise<boolean>} True if auto-mirroring was successfully initialized
   */
  async initializeAutoMirroring(tasksPath, options = {}) {
    try {
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          log('warn', 'Failed to initialize MemoryBridge, auto-mirroring will not be enabled');
          return false;
        }
      }
      
      const mirrorOptions = {
        interval: options.interval || this.config.syncInterval,
        direction: options.direction || 'bidirectional', // 'taskToMemory', 'memoryToTask', 'bidirectional'
        initialSync: options.initialSync !== false, // Default to true
        ...options
      };
      
      // Clear any existing interval
      if (this.syncIntervalId) {
        clearInterval(this.syncIntervalId);
        this.syncIntervalId = null;
      }
      
      // Perform initial synchronization if requested
      if (mirrorOptions.initialSync) {
        this.logSyncOperation('Performing initial synchronization');
        
        if (mirrorOptions.direction === 'bidirectional' || mirrorOptions.direction === 'taskToMemory') {
          await this._mirrorAllTasksToMemory(tasksPath);
        }
        
        if (mirrorOptions.direction === 'bidirectional' || mirrorOptions.direction === 'memoryToTask') {
          await this.syncMemoryToTask(tasksPath);
        }
      }
      
      // Set up the interval for automatic mirroring
      this.syncIntervalId = setInterval(async () => {
        if (this.syncState.inProgress) {
          this.logSyncOperation('Sync already in progress, skipping scheduled sync');
          return;
        }
        
        try {
          if (mirrorOptions.direction === 'bidirectional' || mirrorOptions.direction === 'taskToMemory') {
            await this._mirrorAllTasksToMemory(tasksPath);
          }
          
          if (mirrorOptions.direction === 'bidirectional' || mirrorOptions.direction === 'memoryToTask') {
            await this.syncMemoryToTask(tasksPath);
          }
        } catch (error) {
          this._handleError('Auto mirror error', error);
        }
      }, mirrorOptions.interval);
      
      this.logSyncOperation(`Auto-mirroring initialized with ${mirrorOptions.interval}ms interval, direction: ${mirrorOptions.direction}`);
      return true;
    } catch (error) {
      this._handleError('Initialize auto mirroring error', error);
      return false;
    }
  }

  /**
   * Stop automatic mirroring
   */
  stopAutoMirroring() {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
      this.logSyncOperation('Auto-mirroring stopped');
    }
  }

  /**
   * Capture knowledge snippets or insights related to tasks
   * @param {Object} knowledgeData - Knowledge data to capture
   * @param {number|string} [taskId] - Related task ID (optional)
   * @returns {Promise<Object>} Result of the knowledge capture operation
   */
  async captureKnowledge(knowledgeData, taskId = null) {
    try {
      if (!this.isInitialized) {
        this.logSyncOperation('MemoryBridge not initialized, skipping captureKnowledge');
        return { success: false, error: 'MemoryBridge not initialized' };
      }
      
      if (!knowledgeData || typeof knowledgeData !== 'object') {
        return { success: false, error: 'Invalid knowledge data' };
      }
      
      // Format the knowledge data
      const formattedKnowledge = {
        content: knowledgeData.content || knowledgeData.text || knowledgeData.snippet || '',
        type: knowledgeData.type || 'general',
        metadata: {
          ...knowledgeData.metadata || {},
          source: 'task-master-ai',
          captured: new Date().toISOString()
        },
        tags: [...(knowledgeData.tags || []), 'task-master']
      };
      
      // Add task reference if provided
      if (taskId) {
        formattedKnowledge.metadata.relatedTaskId = taskId;
        formattedKnowledge.tags.push(`task-${taskId}`);
      }
      
      // Send to Holocron memory system
      const result = await this._sendKnowledgeToMemory(formattedKnowledge);
      
      if (result.success) {
        this.logSyncOperation(`Knowledge captured${taskId ? ` for task ${taskId}` : ''}`);
        return { success: true, knowledgeId: result.knowledgeId };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      this._handleError('Capture knowledge error', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get synchronization status
   * @returns {Object} Current sync state
   */
  getSyncStatus() {
    return {
      enabled: this.config.enabled,
      initialized: this.isInitialized,
      autoMirroringActive: !!this.syncIntervalId,
      lastSyncTime: this.syncState.lastSyncTime,
      inProgress: this.syncState.inProgress,
      syncErrors: this.syncState.syncErrors.slice(-5), // Return last 5 errors
      tasksSynced: this.syncState.taskHashes.size,
      memoriesSynced: this.syncState.memoryHashes.size
    };
  }

  /**
   * Reset synchronization state
   */
  resetSyncState() {
    this.syncState = {
      lastSyncTime: null,
      inProgress: false,
      syncErrors: [],
      taskHashes: new Map(),
      memoryHashes: new Map(),
    };
    this.logSyncOperation('Sync state reset');
  }

  /**
   * Test connection to Holocron memory system
   * @returns {Promise<boolean>} True if connection is successful
   * @private
   */
  async _testConnection() {
    try {
      // Make an API call to test connectivity to Holocron memory system
      const url = `${this.config.holocronMemoryApiUrl}/status`;
      
      // We're using the built-in fetch API for HTTP requests
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-Task-Master-Client': 'MemoryBridge'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      
      const data = await response.json();
      return data && data.status === 'ok';
    } catch (error) {
      // If connection fails but silent mode is enabled, log but don't throw
      this._handleError('Connection test error', error);
      return false;
    }
  }

  /**
   * Mirror all tasks to memory
   * @param {string} tasksPath - Path to tasks.json file
   * @returns {Promise<Object>} Result of the operation
   * @private
   */
  async _mirrorAllTasksToMemory(tasksPath) {
    try {
      this.syncState.inProgress = true;
      
      // Load tasks
      const tasksData = await this._safeReadJSON(tasksPath);
      if (!tasksData || !tasksData.tasks) {
        this.syncState.inProgress = false;
        return { success: false, error: 'Failed to read tasks data' };
      }
      
      const operations = {
        succeeded: [],
        failed: [],
        skipped: []
      };
      
      // Process each task
      for (const task of tasksData.tasks) {
        const result = await this.mirrorTaskToMemory(task);
        
        if (result.success) {
          if (result.status === 'unchanged') {
            operations.skipped.push(task.id);
          } else {
            operations.succeeded.push(task.id);
          }
        } else {
          operations.failed.push(task.id);
        }
      }
      
      this.syncState.lastSyncTime = new Date();
      this.syncState.inProgress = false;
      
      this.logSyncOperation(`All tasks mirrored to memory: ${operations.succeeded.length} succeeded, ${operations.skipped.length} skipped, ${operations.failed.length} failed`);
      
      return { success: true, operations };
    } catch (error) {
      this.syncState.inProgress = false;
      this._handleError('Mirror all tasks error', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Resolve a task from either an object or ID
   * @param {Object|number|string} task - Task object or ID
   * @param {string} tasksPath - Path to tasks.json file (required if task is ID)
   * @returns {Promise<Object>} Resolved task object
   * @private
   */
  async _resolveTask(task, tasksPath) {
    // If task is already an object, return it
    if (task && typeof task === 'object' && !Array.isArray(task)) {
      return task;
    }
    
    // If task is an ID, load it from the tasks file
    if ((typeof task === 'number' || typeof task === 'string') && tasksPath) {
      try {
        const taskId = parseInt(task, 10);
        const tasksData = await this._safeReadJSON(tasksPath);
        
        if (!tasksData || !tasksData.tasks) {
          throw new Error('Invalid tasks data');
        }
        
        return tasksData.tasks.find(t => t.id === taskId) || null;
      } catch (error) {
        this._handleError('Task resolution error', error);
        return null;
      }
    }
    
    return null;
  }

  /**
   * Transform a task to memory entity format
   * @param {Object} task - Task object
   * @returns {Object} Memory entity object
   * @private
   */
  _transformTaskToMemoryEntity(task) {
    // Basic entity structure for Holocron memory system
    return {
      type: 'task',
      id: `task-${task.id}`,
      title: task.title,
      content: this._formatTaskContent(task),
      metadata: {
        taskId: task.id.toString(),
        status: task.status || 'pending',
        priority: task.priority || 'medium',
        dependencies: task.dependencies || [],
        updated: new Date().toISOString(),
        source: 'task-master-ai'
      },
      tags: ['task', `priority-${task.priority || 'medium'}`, `status-${task.status || 'pending'}`]
    };
  }

  /**
   * Format task content for memory storage
   * @param {Object} task - Task object
   * @returns {string} Formatted task content
   * @private
   */
  _formatTaskContent(task) {
    let content = '';
    
    if (task.description) {
      content += `# Description\n${task.description}\n\n`;
    }
    
    if (task.details) {
      content += `# Details\n${task.details}\n\n`;
    }
    
    if (task.subtasks && task.subtasks.length > 0) {
      content += `# Subtasks\n`;
      task.subtasks.forEach(subtask => {
        content += `- ${subtask.title} [${subtask.status || 'pending'}]\n`;
        if (subtask.description) {
          content += `  ${subtask.description}\n`;
        }
      });
      content += '\n';
    }
    
    return content.trim();
  }

  /**
   * Transform a memory entity to task format
   * @param {Object} entity - Memory entity
   * @returns {Object} Task object
   * @private
   */
  _transformMemoryEntityToTask(entity) {
    // Extract task ID from entity metadata
    const taskId = entity.metadata && entity.metadata.taskId 
      ? parseInt(entity.metadata.taskId, 10) 
      : null;
    
    if (!taskId) {
      throw new Error('Memory entity missing taskId in metadata');
    }
    
    // Basic task structure
    const task = {
      id: taskId,
      title: entity.title || 'Task from memory',
      status: entity.metadata.status || 'pending',
      priority: entity.metadata.priority || 'medium',
      dependencies: entity.metadata.dependencies || [],
      description: '',
      details: ''
    };
    
    // Parse content to extract description and details
    if (entity.content) {
      const parts = this._parseEntityContent(entity.content);
      task.description = parts.description || '';
      task.details = parts.details || '';
      
      // Convert subtasks if they exist in the parsed content
      if (parts.subtasks && parts.subtasks.length > 0) {
        task.subtasks = parts.subtasks;
      }
    }
    
    return task;
  }

  /**
   * Parse entity content to extract structured information
   * @param {string} content - Entity content
   * @returns {Object} Parsed content parts
   * @private
   */
  _parseEntityContent(content) {
    const result = {
      description: '',
      details: '',
      subtasks: []
    };
    
    // Simple parser for markdown-like content with sections
    const sections = content.split(/#+\s+/);
    
    sections.forEach(section => {
      if (!section.trim()) return;
      
      const firstLineBreak = section.indexOf('\n');
      if (firstLineBreak === -1) return;
      
      const sectionName = section.substring(0, firstLineBreak).trim().toLowerCase();
      const sectionContent = section.substring(firstLineBreak).trim();
      
      if (sectionName === 'description') {
        result.description = sectionContent;
      } else if (sectionName === 'details') {
        result.details = sectionContent;
      } else if (sectionName === 'subtasks') {
        // Parse subtasks
        const subtaskLines = sectionContent.split('\n');
        let currentSubtask = null;
        
        subtaskLines.forEach(line => {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('-')) {
            // New subtask
            if (currentSubtask) {
              result.subtasks.push(currentSubtask);
            }
            
            // Extract title and status
            const subtaskMatch = trimmedLine.match(/^-\s+(.*?)\s+\[(.*?)\]$/);
            if (subtaskMatch) {
              currentSubtask = {
                id: result.subtasks.length + 1,  // Sequential ID
                title: subtaskMatch[1],
                status: subtaskMatch[2],
                description: ''
              };
            } else {
              currentSubtask = {
                id: result.subtasks.length + 1,
                title: trimmedLine.substring(1).trim(),
                status: 'pending',
                description: ''
              };
            }
          } else if (currentSubtask && trimmedLine) {
            // Continuation of subtask description
            currentSubtask.description += (currentSubtask.description ? '\n' : '') + trimmedLine;
          }
        });
        
        // Add the last subtask if exists
        if (currentSubtask) {
          result.subtasks.push(currentSubtask);
        }
      }
    });
    
    return result;
  }

  /**
   * Merge task data with preference for existing values if specified
   * @param {Object} existingTask - Existing task object
   * @param {Object} newTaskData - New task data
   * @returns {Object} Merged task
   * @private
   */
  _mergeTaskData(existingTask, newTaskData) {
    // Create a deep copy of the existing task
    const mergedTask = JSON.parse(JSON.stringify(existingTask));
    
    // Update simple fields, preferring existing values for some fields
    mergedTask.title = existingTask.title || newTaskData.title;
    
    // Keep existing status unless it's 'pending' and there's a new status
    if (existingTask.status === 'pending' && newTaskData.status !== 'pending') {
      mergedTask.status = newTaskData.status;
    }
    
    // Merge description and details if empty in existing task
    if (!existingTask.description && newTaskData.description) {
      mergedTask.description = newTaskData.description;
    }
    
    if (!existingTask.details && newTaskData.details) {
      mergedTask.details = newTaskData.details;
    }
    
    // Merge dependencies
    const allDependencies = [...new Set([
      ...(existingTask.dependencies || []),
      ...(newTaskData.dependencies || [])
    ])];
    mergedTask.dependencies = allDependencies;
    
    // Merge subtasks
    if (newTaskData.subtasks && newTaskData.subtasks.length > 0) {
      if (!existingTask.subtasks || existingTask.subtasks.length === 0) {
        // Just use new subtasks if there are none existing
        mergedTask.subtasks = newTaskData.subtasks;
      } else {
        // Otherwise, merge by title
        const existingSubtaskTitles = new Set(existingTask.subtasks.map(st => st.title.toLowerCase()));
        
        // Add new subtasks that don't exist in the existing task
        newTaskData.subtasks.forEach(newSubtask => {
          if (!existingSubtaskTitles.has(newSubtask.title.toLowerCase())) {
            // Adjust ID to be next available
            newSubtask.id = Math.max(...existingTask.subtasks.map(st => st.id), 0) + 1;
            mergedTask.subtasks.push(newSubtask);
          }
        });
      }
    }
    
    return mergedTask;
  }

  /**
   * Calculate a hash of an entity for change detection
   * @param {Object} entity - Entity to hash
   * @returns {string} Hash string
   * @private
   */
  _calculateEntityHash(entity) {
    // Simple hash function for change detection
    // In a real implementation, this would use a proper hash algorithm
    const jsonStr = JSON.stringify(entity);
    let hash = 0;
    for (let i = 0; i < jsonStr.length; i++) {
      const char = jsonStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }

  /**
   * Send data to Holocron memory system
   * @param {Object} entity - Entity to send
   * @returns {Promise<Object>} Result of the operation
   * @private
   */
  async _sendToMemorySystem(entity) {
    try {
      // Send entity to Holocron memory API
      const url = `${this.config.holocronMemoryApiUrl}/entities`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-Task-Master-Client': 'MemoryBridge'
        },
        body: JSON.stringify(entity)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      
      const data = await response.json();
      
      return { 
        success: true, 
        entityId: data.id || entity.id
      };
    } catch (error) {
      this._handleError('Send to memory system error', error);
      
      // In silent mode, return failure but don't throw
      return { success: false, error: error.message };
    }
  }

  /**
   * Send knowledge to Holocron memory system
   * @param {Object} knowledge - Knowledge to send
   * @returns {Promise<Object>} Result of the operation
   * @private
   */
  async _sendKnowledgeToMemory(knowledge) {
    try {
      // Send knowledge to Holocron memory API
      const url = `${this.config.holocronMemoryApiUrl}/knowledge`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-Task-Master-Client': 'MemoryBridge'
        },
        body: JSON.stringify(knowledge)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      
      const data = await response.json();
      
      return { 
        success: true, 
        knowledgeId: data.id || `knowledge-${Date.now()}`
      };
    } catch (error) {
      this._handleError('Send knowledge error', error);
      
      // In silent mode, return failure but don't throw
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetch memory entities from Holocron
   * @returns {Promise<Array>} Array of memory entities
   * @private
   */
  async _fetchMemoryEntities() {
    try {
      // Fetch entities from Holocron memory API
      // Add query parameters for filtering by type and source
      const queryParams = new URLSearchParams({
        type: 'task',
        source: 'task-master-ai'
      });
      
      const url = `${this.config.holocronMemoryApiUrl}/entities?${queryParams}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-Task-Master-Client': 'MemoryBridge'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.entities || [];
    } catch (error) {
      this._handleError('Fetch memory entities error', error);
      
      // Return empty array in case of error to prevent disruption
      return [];
    }
  }

  // Note: All mock API calls have been replaced with real implementation
  // using fetch API. The _simulateApiCall method has been removed as it's no longer needed.

  /**
   * Safely read a JSON file with optimized adapter
   * @param {string} filePath - Path to the file
   * @returns {Promise<Object>} Parsed JSON data
   * @private
   */
  async _safeReadJSON(filePath) {
    try {
      const reader = this.optimizationAdapter.createOptimizedReader(filePath);
      const content = reader('utf8');
      return JSON.parse(content);
    } catch (error) {
      this._handleError(`Failed to read JSON from ${filePath}`, error);
      return null;
    }
  }

  /**
   * Handle errors in a non-blocking way
   * @param {string} context - Error context description
   * @param {Error} error - Error object
   * @private
   */
  _handleError(context, error) {
    // Log the error but don't throw
    const errorInfo = {
      context,
      message: error.message,
      timestamp: new Date().toISOString()
    };
    
    // Add to error history
    this.syncState.syncErrors.push(errorInfo);
    
    // Keep only the last 20 errors
    if (this.syncState.syncErrors.length > 20) {
      this.syncState.syncErrors.shift();
    }
    
    // Log the error
    log('error', `MemoryBridge error: ${context} - ${error.message}`);
    
    // Don't rethrow - silently handle the error
  }

  /**
   * Log synchronization operations if enabled
   * @param {string} message - Log message
   * @private
   */
  logSyncOperation(message) {
    if (this.config.logSyncOperations) {
      log('debug', `MemoryBridge: ${message}`);
    }
  }
}

export { MemoryBridge, MEMORY_BRIDGE_CONFIG };