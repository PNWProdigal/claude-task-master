/**
 * memory-bridge.test.js
 * Tests for the MemoryBridge class
 */

import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { MemoryBridge } from '../../scripts/modules/memory-bridge.js';

// Mock dependencies
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  statSync: jest.fn().mockReturnValue({ size: 1024 })
}));

// Mock path
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  dirname: jest.fn(path => path.split('/').slice(0, -1).join('/')),
  extname: jest.fn(path => {
    const parts = path.split('.');
    return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
  })
}));

// Sample task data for tests
const sampleTask = {
  id: 1,
  title: 'Test Task',
  description: 'Test task description',
  details: 'Test task details',
  status: 'in-progress',
  priority: 'high',
  dependencies: [2, 3],
  subtasks: [
    {
      id: 1,
      title: 'Subtask 1',
      description: 'Subtask 1 description',
      status: 'pending'
    },
    {
      id: 2,
      title: 'Subtask 2',
      description: 'Subtask 2 description',
      status: 'done'
    }
  ]
};

const sampleTasksData = {
  tasks: [sampleTask]
};

// Setup mock implementations
beforeEach(() => {
  jest.clearAllMocks();
  
  // Mock file exists
  fs.existsSync.mockReturnValue(true);
  
  // Mock file read
  fs.readFileSync.mockImplementation((filePath, encoding) => {
    if (filePath.includes('tasks.json')) {
      return JSON.stringify(sampleTasksData);
    }
    return '';
  });
});

describe('MemoryBridge', () => {
  let memoryBridge;
  
  beforeEach(() => {
    memoryBridge = new MemoryBridge({
      enabled: true,
      syncInterval: 60000, // 1 minute
      logSyncOperations: false
    });
    
    // Mock the _simulateApiCall method to always succeed
    memoryBridge._simulateApiCall = jest.fn().mockImplementation((options) => {
      if (options.method === 'GET' && options.endpoint === '/status') {
        return Promise.resolve({ status: 'ok', version: '1.0.0' });
      } else if (options.method === 'GET' && options.endpoint === '/entities') {
        return Promise.resolve({
          entities: [
            {
              id: 'task-1',
              type: 'task',
              title: 'Sample task from memory',
              content: '# Description\nThis is a sample task from memory.\n\n# Details\nSome detailed information about the task.\n\n# Subtasks\n- Implement feature A [pending]\n- Test functionality [in-progress]',
              metadata: {
                taskId: '1',
                status: 'in-progress',
                priority: 'high',
                dependencies: [2],
                updated: new Date().toISOString(),
                source: 'task-master-ai'
              },
              tags: ['task', 'priority-high', 'status-in-progress']
            }
          ]
        });
      } else if (options.method === 'POST') {
        return Promise.resolve({
          id: options.data.id || `generated-id-${Date.now()}`,
          success: true
        });
      }
      return Promise.resolve({ success: true });
    });
  });
  
  describe('initialization', () => {
    test('should initialize successfully', async () => {
      const result = await memoryBridge.initialize();
      expect(result).toBe(true);
      expect(memoryBridge.isInitialized).toBe(true);
    });
    
    test('should handle initialization failure gracefully', async () => {
      memoryBridge._simulateApiCall = jest.fn().mockRejectedValue(new Error('Connection failed'));
      const result = await memoryBridge.initialize();
      expect(result).toBe(false);
      expect(memoryBridge.isInitialized).toBe(false);
    });
  });
  
  describe('mirrorTaskToMemory', () => {
    test('should mirror a task successfully', async () => {
      await memoryBridge.initialize();
      const result = await memoryBridge.mirrorTaskToMemory(sampleTask);
      expect(result.success).toBe(true);
      expect(memoryBridge.syncState.taskHashes.get(sampleTask.id)).toBeDefined();
    });
    
    test('should resolve a task by ID', async () => {
      await memoryBridge.initialize();
      const result = await memoryBridge.mirrorTaskToMemory(1, '/path/to/tasks.json');
      expect(result.success).toBe(true);
    });
    
    test('should handle task not found', async () => {
      await memoryBridge.initialize();
      const result = await memoryBridge.mirrorTaskToMemory(999, '/path/to/tasks.json');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Task not found');
    });
  });
  
  describe('syncMemoryToTask', () => {
    test('should sync memory to tasks successfully', async () => {
      await memoryBridge.initialize();
      const result = await memoryBridge.syncMemoryToTask('/path/to/tasks.json');
      expect(result.success).toBe(true);
      expect(result.operations).toBeDefined();
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
    
    test('should handle sync failure gracefully', async () => {
      await memoryBridge.initialize();
      fs.readFileSync.mockImplementation(() => { throw new Error('Read failed'); });
      const result = await memoryBridge.syncMemoryToTask('/path/to/tasks.json');
      expect(result.success).toBe(false);
    });
    
    test('should not sync if not initialized', async () => {
      const result = await memoryBridge.syncMemoryToTask('/path/to/tasks.json');
      expect(result.success).toBe(false);
      expect(result.error).toBe('MemoryBridge not initialized');
    });
  });
  
  describe('initializeAutoMirroring', () => {
    test('should initialize auto mirroring', async () => {
      await memoryBridge.initialize();
      const result = await memoryBridge.initializeAutoMirroring('/path/to/tasks.json');
      expect(result).toBe(true);
      expect(memoryBridge.syncIntervalId).toBeDefined();
      
      // Clean up the interval
      memoryBridge.stopAutoMirroring();
    });
    
    test('should initialize with custom options', async () => {
      await memoryBridge.initialize();
      const result = await memoryBridge.initializeAutoMirroring('/path/to/tasks.json', {
        interval: 120000,
        direction: 'taskToMemory',
        initialSync: false
      });
      expect(result).toBe(true);
      
      // Clean up the interval
      memoryBridge.stopAutoMirroring();
    });
  });
  
  describe('captureKnowledge', () => {
    test('should capture knowledge successfully', async () => {
      await memoryBridge.initialize();
      const result = await memoryBridge.captureKnowledge({
        content: 'Test knowledge content',
        type: 'decision',
        tags: ['important']
      }, 1);
      
      expect(result.success).toBe(true);
      expect(result.knowledgeId).toBeDefined();
    });
    
    test('should handle invalid knowledge data', async () => {
      await memoryBridge.initialize();
      const result = await memoryBridge.captureKnowledge(null);
      expect(result.success).toBe(false);
    });
    
    test('should not capture if not initialized', async () => {
      const result = await memoryBridge.captureKnowledge({
        content: 'Test knowledge content'
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe('MemoryBridge not initialized');
    });
  });
  
  describe('utility methods', () => {
    test('should transform task to memory entity format', () => {
      const entity = memoryBridge._transformTaskToMemoryEntity(sampleTask);
      expect(entity.type).toBe('task');
      expect(entity.id).toBe(`task-${sampleTask.id}`);
      expect(entity.title).toBe(sampleTask.title);
      expect(entity.metadata.taskId).toBe(sampleTask.id.toString());
    });
    
    test('should transform memory entity to task format', () => {
      const entity = {
        id: 'task-5',
        type: 'task',
        title: 'Memory Task',
        content: '# Description\nTask from memory\n\n# Details\nDetailed info',
        metadata: {
          taskId: '5',
          status: 'done',
          priority: 'low'
        }
      };
      
      const task = memoryBridge._transformMemoryEntityToTask(entity);
      expect(task.id).toBe(5);
      expect(task.title).toBe('Memory Task');
      expect(task.status).toBe('done');
      expect(task.description).toBe('Task from memory');
    });
    
    test('should merge task data correctly', () => {
      const existingTask = {
        id: 1,
        title: 'Existing Task',
        description: '',
        details: 'Existing details',
        status: 'pending',
        dependencies: [2]
      };
      
      const newTaskData = {
        id: 1,
        title: 'New Task',
        description: 'New description',
        details: '',
        status: 'in-progress',
        dependencies: [3]
      };
      
      const merged = memoryBridge._mergeTaskData(existingTask, newTaskData);
      expect(merged.id).toBe(1);
      expect(merged.title).toBe('Existing Task'); // Prefer existing title
      expect(merged.description).toBe('New description'); // Use new description as existing was empty
      expect(merged.details).toBe('Existing details'); // Keep existing details
      expect(merged.status).toBe('in-progress'); // Update from pending to in-progress
      expect(merged.dependencies).toContain(2); // Keep existing dependency
      expect(merged.dependencies).toContain(3); // Add new dependency
    });
  });
});