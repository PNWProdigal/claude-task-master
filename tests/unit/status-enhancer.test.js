/**
 * status-enhancer.test.js
 * Tests for the StatusEnhancer class
 */

import { jest } from '@jest/globals';
import { StatusEnhancer } from '../../scripts/modules/status-enhancer.js';

// Mock chalk
jest.mock('chalk', () => {
  const origChalkFn = text => text;
  const chalk = origChalkFn;
  
  // Define color functions that return identifiable strings
  chalk.green = text => `green:${text}`;
  chalk.yellow = text => `yellow:${text}`;
  chalk.red = text => `red:${text}`;
  chalk.cyan = text => `cyan:${text}`;
  chalk.gray = text => `gray:${text}`;
  chalk.hex = () => ({
    // Orange for in-progress
    __proto__: chalk,
    // Return identifiable string for in-progress
    call: jest.fn((_this, text) => `orange:${text}`)
  });
  chalk.magenta = text => `magenta:${text}`;
  
  return chalk;
});

describe('StatusEnhancer', () => {
  let statusEnhancer;
  
  beforeEach(() => {
    statusEnhancer = new StatusEnhancer();
  });
  
  test('applyStatusStandards standardizes status values', () => {
    expect(statusEnhancer.applyStatusStandards('in progress')).toBe('in-progress');
    expect(statusEnhancer.applyStatusStandards('done')).toBe('done');
    expect(statusEnhancer.applyStatusStandards('completed')).toBe('done');
    expect(statusEnhancer.applyStatusStandards('notstarted')).toBe('not-started');
    expect(statusEnhancer.applyStatusStandards('todo')).toBe('not-started');
    expect(statusEnhancer.applyStatusStandards('stuck')).toBe('blocked');
    expect(statusEnhancer.applyStatusStandards('needs review')).toBe('review');
    
    // Preserves unknown status values
    expect(statusEnhancer.applyStatusStandards('custom-status')).toBe('custom-status');
    
    // Handles case insensitivity
    expect(statusEnhancer.applyStatusStandards('IN PROGRESS')).toBe('in-progress');
    expect(statusEnhancer.applyStatusStandards('DONE')).toBe('done');
    
    // Handles null/undefined
    expect(statusEnhancer.applyStatusStandards(null)).toBe('not-started');
    expect(statusEnhancer.applyStatusStandards(undefined)).toBe('not-started');
  });
  
  test('formatTaskStatus returns formatted status string', () => {
    // Regular display mode
    expect(statusEnhancer.formatTaskStatus('in-progress')).toContain('in-progress');
    expect(statusEnhancer.formatTaskStatus('done')).toContain('done');
    expect(statusEnhancer.formatTaskStatus('blocked')).toContain('blocked');
    
    // Table display mode
    expect(statusEnhancer.formatTaskStatus('in-progress', true)).toContain('in-progress');
    expect(statusEnhancer.formatTaskStatus('done', true)).toContain('done');
    expect(statusEnhancer.formatTaskStatus('blocked', true)).toContain('blocked');
    
    // Handles null/undefined
    expect(statusEnhancer.formatTaskStatus(null)).toContain('unknown');
    expect(statusEnhancer.formatTaskStatus(undefined)).toContain('unknown');
  });
  
  test('parseStatusInput standardizes input from user', () => {
    expect(statusEnhancer.parseStatusInput('in progress')).toBe('in-progress');
    expect(statusEnhancer.parseStatusInput('done')).toBe('done');
    expect(statusEnhancer.parseStatusInput('stuck')).toBe('blocked');
    
    // Handles null/undefined
    expect(statusEnhancer.parseStatusInput(null)).toBe('not-started');
    expect(statusEnhancer.parseStatusInput(undefined)).toBe('not-started');
  });
  
  test('trackStatusChange and getStatusHistory maintain history', () => {
    const taskId = '1';
    
    // Initially empty
    expect(statusEnhancer.getStatusHistory(taskId)).toEqual([]);
    
    // Add status changes
    statusEnhancer.trackStatusChange(taskId, 'not-started');
    statusEnhancer.trackStatusChange(taskId, 'in progress');
    statusEnhancer.trackStatusChange(taskId, 'blocked');
    statusEnhancer.trackStatusChange(taskId, 'in-progress');
    statusEnhancer.trackStatusChange(taskId, 'done');
    
    // Check history
    const history = statusEnhancer.getStatusHistory(taskId);
    expect(history).toHaveLength(5);
    expect(history[0].status).toBe('not-started');
    expect(history[1].status).toBe('in-progress');
    expect(history[2].status).toBe('blocked');
    expect(history[3].status).toBe('in-progress');
    expect(history[4].status).toBe('done');
    
    // Each entry should have a timestamp
    history.forEach(entry => {
      expect(entry).toHaveProperty('timestamp');
      expect(new Date(entry.timestamp)).toBeInstanceOf(Date);
    });
  });
  
  test('getStatusConfig returns config for a status', () => {
    const inProgressConfig = statusEnhancer.getStatusConfig('in progress');
    expect(inProgressConfig).toHaveProperty('icon');
    expect(inProgressConfig).toHaveProperty('tableIcon');
    expect(inProgressConfig).toHaveProperty('color');
    
    const doneConfig = statusEnhancer.getStatusConfig('done');
    expect(doneConfig).toHaveProperty('icon');
    expect(doneConfig).toHaveProperty('tableIcon');
    expect(doneConfig).toHaveProperty('color');
    
    // Unknown status should return default config
    const unknownConfig = statusEnhancer.getStatusConfig('unknown-status');
    expect(unknownConfig).toHaveProperty('icon', '❓');
    expect(unknownConfig).toHaveProperty('tableIcon', '?');
  });
  
  test('getAvailableStatuses returns all status names', () => {
    const statuses = statusEnhancer.getAvailableStatuses();
    expect(statuses).toContain('not-started');
    expect(statuses).toContain('in-progress');
    expect(statuses).toContain('done');
    expect(statuses).toContain('blocked');
    expect(statuses).toContain('review');
    expect(statuses).toContain('deferred');
  });
  
  test('getStatusAliases returns all aliases for a status', () => {
    const inProgressAliases = statusEnhancer.getStatusAliases('in-progress');
    expect(inProgressAliases).toContain('in-progress');
    expect(inProgressAliases).toContain('wip');
    expect(inProgressAliases).toContain('ongoing');
    
    const doneAliases = statusEnhancer.getStatusAliases('done');
    expect(doneAliases).toContain('done');
    expect(doneAliases).toContain('completed');
    
    // Should work with aliases too
    const wipAliases = statusEnhancer.getStatusAliases('wip');
    expect(wipAliases).toContain('in-progress');
    
    // Should return empty array for unknown status
    expect(statusEnhancer.getStatusAliases('unknown-status')).toEqual([]);
  });
});
