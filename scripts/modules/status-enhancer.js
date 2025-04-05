/**
 * status-enhancer.js
 * Enhances status formatting while preserving backward compatibility
 */

import chalk from 'chalk';

/**
 * Status enhancer class for improved status formatting
 */
class StatusEnhancer {
  /**
   * Initialize the status enhancer with default status mappings
   */
  constructor() {
    // Define status mapping with emoji indicators
    this.statusConfig = {
      'not-started': { 
        color: chalk.gray, 
        icon: '⭕', 
        tableIcon: '○',
        aliases: ['todo', 'not started', 'notstarted', 'new']
      },
      'in-progress': { 
        color: chalk.hex('#FFA500'), 
        icon: '🔄', 
        tableIcon: '►',
        aliases: ['in progress', 'inprogress', 'wip', 'ongoing']
      },
      'done': { 
        color: chalk.green, 
        icon: '✅', 
        tableIcon: '✓',
        aliases: ['complete', 'completed', 'finished']
      },
      'blocked': { 
        color: chalk.red, 
        icon: '❌', 
        tableIcon: '!',
        aliases: ['blocked', 'waiting', 'stuck']
      },
      'review': { 
        color: chalk.magenta, 
        icon: '👀', 
        tableIcon: '?',
        aliases: ['in review', 'reviewing', 'needs review', 'pending review']
      },
      'deferred': { 
        color: chalk.cyan, 
        icon: '📅', 
        tableIcon: '→',
        aliases: ['postponed', 'delayed', 'later']
      },
      // Backward compatibility with existing statuses
      'pending': { 
        color: chalk.yellow, 
        icon: '⏱️', 
        tableIcon: '⏱',
        aliases: ['waiting', 'to-do', 'todo']
      }
    };

    // Track status history
    this.statusHistory = new Map();
  }

  /**
   * Apply standardized status format
   * @param {string} status - Raw status input
   * @returns {string} Standardized status value
   */
  applyStatusStandards(status) {
    if (!status) return 'not-started';
    
    const lowercaseStatus = status.toLowerCase().trim();

    // Check for direct match
    if (this.statusConfig[lowercaseStatus]) {
      return lowercaseStatus;
    }

    // Check for aliases
    for (const [standardStatus, config] of Object.entries(this.statusConfig)) {
      if (config.aliases.includes(lowercaseStatus)) {
        return standardStatus;
      }
    }

    // If no match found, return original but normalized
    // This ensures backward compatibility
    return lowercaseStatus;
  }

  /**
   * Format task status with appropriate color and icon
   * @param {string} status - Task status
   * @param {boolean} forTable - Whether the status is being displayed in a table
   * @returns {string} Formatted status string
   */
  formatTaskStatus(status, forTable = false) {
    if (!status) {
      return chalk.gray('❓ unknown');
    }
    
    // Standardize the status
    const standardStatus = this.applyStatusStandards(status);
    
    // Get configuration or default to an unknown config
    const config = this.statusConfig[standardStatus] || { 
      color: chalk.gray, 
      icon: '❓', 
      tableIcon: '?'
    };
    
    // For table display, use simpler icons
    if (forTable) {
      return config.color(`${config.tableIcon} ${standardStatus}`);
    }
    
    // For regular display, use full emoji icons
    return config.color(`${config.icon} ${standardStatus}`);
  }

  /**
   * Parse and standardize status input
   * @param {string} input - Raw status input from user
   * @returns {string} Standardized status value
   */
  parseStatusInput(input) {
    if (!input) return 'not-started';
    
    return this.applyStatusStandards(input);
  }

  /**
   * Track status change for a task
   * @param {string|number} taskId - Task ID
   * @param {string} newStatus - New status value
   */
  trackStatusChange(taskId, newStatus) {
    if (!taskId) return;
    
    const standardStatus = this.applyStatusStandards(newStatus);
    
    // Get current history or initialize empty array
    const history = this.statusHistory.get(taskId) || [];
    
    // Add new status with timestamp
    history.push({
      status: standardStatus,
      timestamp: new Date().toISOString()
    });
    
    // Update history
    this.statusHistory.set(taskId, history);
  }

  /**
   * Get status history for a task
   * @param {string|number} taskId - Task ID
   * @returns {Array} Array of status changes with timestamps
   */
  getStatusHistory(taskId) {
    if (!taskId) return [];
    
    return this.statusHistory.get(taskId) || [];
  }
  
  /**
   * Get status config object for a given status
   * @param {string} status - Status value
   * @returns {Object} Status configuration object
   */
  getStatusConfig(status) {
    const standardStatus = this.applyStatusStandards(status);
    return this.statusConfig[standardStatus] || { 
      color: chalk.gray, 
      icon: '❓', 
      tableIcon: '?'
    };
  }

  /**
   * Get list of all available statuses
   * @returns {Array} Array of status names
   */
  getAvailableStatuses() {
    return Object.keys(this.statusConfig);
  }

  /**
   * Get status with all its aliases
   * @param {string} status - Status to get aliases for
   * @returns {Array} Array of aliases
   */
  getStatusAliases(status) {
    const standardStatus = this.applyStatusStandards(status);
    const config = this.statusConfig[standardStatus];
    
    if (!config) return [];
    
    return [standardStatus, ...config.aliases];
  }
}

export { StatusEnhancer };
