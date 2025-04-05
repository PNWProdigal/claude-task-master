/**
 * command-enhancer.js
 * Extend command handling capabilities with Holocron's slash command system
 */

import { log, CONFIG } from './utils.js';
import { MemoryBridge } from './memory-bridge.js';

// Configuration for command enhancer
const COMMAND_ENHANCER_CONFIG = {
  enabled: process.env.ENABLE_COMMAND_ENHANCER === 'true' || true,
  commandPrefix: process.env.COMMAND_PREFIX || '/',
  verbose: process.env.VERBOSE_COMMANDS === 'true' || false,
};

/**
 * CommandEnhancer class for extending command handling with Holocron's slash command system
 */
class CommandEnhancer {
  /**
   * Create a new CommandEnhancer instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.config = { ...COMMAND_ENHANCER_CONFIG, ...options };
    this.commands = new Map();
    this.memoryBridge = options.memoryBridge || new MemoryBridge();
    this.initialized = false;
    
    // Initialize the event emitter for command events
    this.events = {
      listeners: {},
      on: (event, listener) => {
        if (!this.events.listeners[event]) {
          this.events.listeners[event] = [];
        }
        this.events.listeners[event].push(listener);
      },
      emit: (event, ...args) => {
        if (this.events.listeners[event]) {
          this.events.listeners[event].forEach(listener => listener(...args));
        }
      }
    };
    
    this.initialize();
  }
  
  /**
   * Initialize the command enhancer
   */
  initialize() {
    if (!this.config.enabled) {
      log('info', 'CommandEnhancer is disabled in configuration');
      return;
    }
    
    // Register standard commands
    this._registerStandardCommands();
    
    this.initialized = true;
    log('info', 'CommandEnhancer initialized');
  }
  
  /**
   * Enhance commands with Holocron slash commands
   * @param {Object} commandRegistry - The command registry to enhance
   * @returns {Object} Enhanced command registry
   */
  enhanceWithHolocronCommands(commandRegistry) {
    if (!this.initialized) {
      log('warn', 'CommandEnhancer not initialized, commands will not be enhanced');
      return commandRegistry;
    }
    
    try {
      // Create a copy of the command registry
      const enhancedRegistry = { ...commandRegistry };
      
      // Add all our enhanced commands to the registry
      this.commands.forEach((handler, name) => {
        const commandName = this.config.commandPrefix + name;
        enhancedRegistry[commandName] = handler;
        this.events.emit('command:registered', { name: commandName });
      });
      
      log('info', `Enhanced command registry with ${this.commands.size} Holocron commands`);
      return enhancedRegistry;
    } catch (error) {
      log('error', `Failed to enhance commands: ${error.message}`);
      return commandRegistry; // Return original if enhancement fails
    }
  }
  
  /**
   * Handle status command
   * @param {Object} options - Options for the status command
   * @returns {Object} Status information
   */
  async handleStatus(options = {}) {
    try {
      const detail = options.detail || 'basic'; // 'basic', 'detailed', 'full'
      const format = options.format || 'text'; // 'text', 'json', 'table'
      
      // Gather system status information
      const status = {
        system: {
          version: CONFIG.version || '0.0.0',
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        },
        commands: {
          enhanced: this.commands.size,
          prefix: this.config.commandPrefix,
          registered: [...this.commands.keys()],
        },
        memory: await this._getMemoryStatus(),
      };
      
      // Add detailed information if requested
      if (detail === 'detailed' || detail === 'full') {
        status.config = {
          ...this.config,
          // Redact sensitive information
          apiKeys: this.config.apiKeys ? '[REDACTED]' : undefined,
        };
      }
      
      // Add full information if requested
      if (detail === 'full') {
        status.environment = {
          node: process.version,
          platform: process.platform,
          arch: process.arch,
          memory: process.memoryUsage(),
        };
      }
      
      this.events.emit('command:executed', { command: 'status', options });
      
      // Format the status based on the requested format
      if (format === 'json') {
        return status;
      } else if (format === 'table') {
        return this._formatStatusAsTable(status);
      } else {
        return this._formatStatusAsText(status, detail);
      }
    } catch (error) {
      this.events.emit('command:error', { command: 'status', error });
      log('error', `Status command error: ${error.message}`);
      return { error: error.message };
    }
  }
  
  /**
   * Handle knowledge capture command
   * @param {string} knowledge - The knowledge or insight to capture
   * @param {Object} options - Options for knowledge capture
   * @returns {Object} Result of the knowledge capture operation
   */
  async handleKnowledgeCapture(knowledge, options = {}) {
    try {
      if (!knowledge || typeof knowledge !== 'string') {
        throw new Error('Knowledge content is required');
      }
      
      const knowledgeData = {
        content: knowledge,
        type: options.type || 'insight',
        tags: options.tags || [],
        metadata: { ...(options.metadata || {}) },
      };
      
      // Add task ID if provided
      const taskId = options.taskId || options.related;
      
      // Use memory bridge to capture knowledge
      const result = await this.memoryBridge.captureKnowledge(knowledgeData, taskId);
      
      this.events.emit('command:executed', { 
        command: 'knowledge-capture', 
        knowledge: knowledgeData,
        result 
      });
      
      return result;
    } catch (error) {
      this.events.emit('command:error', { command: 'knowledge-capture', error });
      log('error', `Knowledge capture error: ${error.message}`);
      return { error: error.message };
    }
  }
  
  /**
   * Provide command help information
   * @param {string} command - Command to get help for
   * @returns {string} Help information
   */
  provideCommandHelp(command = '') {
    try {
      // If a specific command is requested
      if (command) {
        // Strip prefix if present
        const commandName = command.startsWith(this.config.commandPrefix) 
          ? command.substring(this.config.commandPrefix.length) 
          : command;
        
        const helpInfo = this._getCommandHelp(commandName);
        if (!helpInfo) {
          return `No help available for command: ${command}`;
        }
        return helpInfo;
      }
      
      // If no specific command, provide general help
      let helpText = 'Available Enhanced Commands:\n\n';
      
      // Sort commands alphabetically
      const commandNames = [...this.commands.keys()].sort();
      
      commandNames.forEach(name => {
        const commandHelp = this._getCommandHelpBrief(name);
        helpText += `${this.config.commandPrefix}${name}: ${commandHelp}\n`;
      });
      
      helpText += '\nUse "/help <command>" for detailed help on a specific command.';
      
      return helpText;
    } catch (error) {
      log('error', `Help command error: ${error.message}`);
      return 'Error retrieving help information.';
    }
  }
  
  /**
   * Register a custom command
   * @param {Object} commandDefinition - Command definition
   * @returns {boolean} True if registration was successful
   */
  registerCommand(commandDefinition) {
    try {
      if (!commandDefinition || !commandDefinition.name) {
        throw new Error('Command name is required');
      }
      
      if (!commandDefinition.handler || typeof commandDefinition.handler !== 'function') {
        throw new Error('Command handler function is required');
      }
      
      const name = commandDefinition.name;
      this.commands.set(name, commandDefinition.handler);
      
      // Store help information
      this._setCommandHelp(name, {
        description: commandDefinition.description || `Command: ${name}`,
        usage: commandDefinition.usage || `${this.config.commandPrefix}${name}`,
        examples: commandDefinition.examples || [],
        options: commandDefinition.options || {}
      });
      
      this.events.emit('command:registered', { name });
      log('info', `Registered command: ${name}`);
      return true;
    } catch (error) {
      log('error', `Command registration error: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Execute a command
   * @param {string} commandName - Name of the command to execute
   * @param {Object} args - Command arguments
   * @returns {Promise<any>} Command result
   */
  async executeCommand(commandName, args = {}) {
    try {
      // Strip prefix if present
      const name = commandName.startsWith(this.config.commandPrefix) 
        ? commandName.substring(this.config.commandPrefix.length) 
        : commandName;
      
      const handler = this.commands.get(name);
      if (!handler) {
        throw new Error(`Command not found: ${name}`);
      }
      
      if (this.config.verbose) {
        log('info', `Executing command: ${name} with args: ${JSON.stringify(args)}`);
      }
      
      const result = await handler(args);
      this.events.emit('command:executed', { command: name, args, result });
      return result;
    } catch (error) {
      this.events.emit('command:error', { command: commandName, error });
      log('error', `Command execution error: ${error.message}`);
      throw error; // Re-throw to allow calling code to handle the error
    }
  }
  
  /**
   * Get the command prefix
   * @returns {string} Command prefix
   */
  getCommandPrefix() {
    return this.config.commandPrefix;
  }
  
  /**
   * Set the command prefix
   * @param {string} prefix - New command prefix
   */
  setCommandPrefix(prefix) {
    if (!prefix || typeof prefix !== 'string') {
      log('warn', 'Invalid command prefix, using default');
      return;
    }
    this.config.commandPrefix = prefix;
    log('info', `Command prefix set to: ${prefix}`);
  }
  
  /**
   * Check if Holocron is connected
   * @returns {Promise<boolean>} True if connected
   */
  async isHolocronConnected() {
    try {
      const status = await this.memoryBridge.getSyncStatus();
      return status.initialized;
    } catch (error) {
      log('error', `Failed to check Holocron connection: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Reconnect to Holocron
   * @returns {Promise<boolean>} True if reconnection was successful
   */
  async reconnectHolocron() {
    try {
      const result = await this.memoryBridge.initialize();
      return result;
    } catch (error) {
      log('error', `Failed to reconnect to Holocron: ${error.message}`);
      return false;
    }
  }
  
  // Private methods
  
  /**
   * Register standard commands
   * @private
   */
  _registerStandardCommands() {
    // Help command
    this.registerCommand({
      name: 'help',
      description: 'Get help for enhanced commands',
      usage: `${this.config.commandPrefix}help [command]`,
      examples: [
        `${this.config.commandPrefix}help`,
        `${this.config.commandPrefix}help status`
      ],
      options: {
        command: 'Optional command name to get help for'
      },
      handler: (args) => this.provideCommandHelp(args.command || '')
    });
    
    // Status command
    this.registerCommand({
      name: 'status',
      description: 'Get system status information',
      usage: `${this.config.commandPrefix}status [--detail=<level>] [--format=<format>]`,
      examples: [
        `${this.config.commandPrefix}status`,
        `${this.config.commandPrefix}status --detail=full`,
        `${this.config.commandPrefix}status --format=json`
      ],
      options: {
        detail: 'Detail level: basic, detailed, full',
        format: 'Output format: text, json, table'
      },
      handler: (args) => this.handleStatus(args)
    });
    
    // Knowledge capture command
    this.registerCommand({
      name: 'capture',
      description: 'Capture knowledge or insights',
      usage: `${this.config.commandPrefix}capture <text> [--task=<id>] [--tags=<tag1,tag2>]`,
      examples: [
        `${this.config.commandPrefix}capture "This is an important insight"`,
        `${this.config.commandPrefix}capture "Task requires careful testing" --task=5`,
        `${this.config.commandPrefix}capture "API rate limits can be increased" --tags=api,performance`
      ],
      options: {
        task: 'Related task ID',
        tags: 'Comma-separated list of tags',
        type: 'Knowledge type (insight, decision, reference)'  
      },
      handler: (args) => {
        // Extract the main content from the first unnamed argument
        const content = args._?.join(' ') || args.text || args.content;
        
        // Process tags if provided as comma-separated string
        let tags = args.tags;
        if (typeof tags === 'string') {
          tags = tags.split(',').map(t => t.trim()).filter(t => t);
        }
        
        return this.handleKnowledgeCapture(content, {
          taskId: args.task || args.taskId,
          tags,
          type: args.type
        });
      }
    });
    
    // Other standard commands can be added here
  }
  
  /**
   * Get memory system status
   * @returns {Promise<Object>} Memory status
   * @private
   */
  async _getMemoryStatus() {
    try {
      return await this.memoryBridge.getSyncStatus();
    } catch (error) {
      log('error', `Failed to get memory status: ${error.message}`);
      return { error: 'Memory status unavailable' };
    }
  }
  
  /**
   * Store command help information
   * @param {string} command - Command name
   * @param {Object} helpInfo - Help information
   * @private
   */
  _setCommandHelp(command, helpInfo) {
    // Store in a property for simplicity (could be stored elsewhere for persistence)
    if (!this._helpInfo) {
      this._helpInfo = new Map();
    }
    this._helpInfo.set(command, helpInfo);
  }
  
  /**
   * Get detailed help for a command
   * @param {string} command - Command name
   * @returns {string} Help text
   * @private
   */
  _getCommandHelp(command) {
    if (!this._helpInfo || !this._helpInfo.has(command)) {
      return null;
    }
    
    const help = this._helpInfo.get(command);
    let helpText = `Command: ${this.config.commandPrefix}${command}\n\n`;
    helpText += `Description: ${help.description}\n\n`;
    helpText += `Usage: ${help.usage}\n\n`;
    
    if (help.options && Object.keys(help.options).length > 0) {
      helpText += 'Options:\n';
      Object.entries(help.options).forEach(([option, description]) => {
        helpText += `  --${option}: ${description}\n`;
      });
      helpText += '\n';
    }
    
    if (help.examples && help.examples.length > 0) {
      helpText += 'Examples:\n';
      help.examples.forEach(example => {
        helpText += `  ${example}\n`;
      });
    }
    
    return helpText;
  }
  
  /**
   * Get brief help for a command
   * @param {string} command - Command name
   * @returns {string} Brief help text
   * @private
   */
  _getCommandHelpBrief(command) {
    if (!this._helpInfo || !this._helpInfo.has(command)) {
      return 'No description available';
    }
    
    return this._helpInfo.get(command).description;
  }
  
  /**
   * Format status as text
   * @param {Object} status - Status object
   * @param {string} detail - Detail level
   * @returns {string} Formatted status
   * @private
   */
  _formatStatusAsText(status, detail) {
    let text = `System Status (${status.system.timestamp})\n\n`;
    text += `Version: ${status.system.version}\n`;
    text += `Uptime: ${Math.floor(status.system.uptime / 60)} minutes\n`;
    text += `Enhanced Commands: ${status.commands.enhanced}\n`;
    text += `Command Prefix: ${status.commands.prefix}\n\n`;
    
    // Memory bridge status
    text += 'Memory Bridge:\n';
    text += `  Connected: ${status.memory.initialized ? 'Yes' : 'No'}\n`;
    text += `  Auto-Mirroring: ${status.memory.autoMirroringActive ? 'Active' : 'Inactive'}\n`;
    if (status.memory.lastSyncTime) {
      text += `  Last Sync: ${status.memory.lastSyncTime}\n`;
    }
    
    // Add more details for higher detail levels
    if (detail === 'detailed' || detail === 'full') {
      text += '\nConfiguration:\n';
      Object.entries(status.config).forEach(([key, value]) => {
        text += `  ${key}: ${JSON.stringify(value)}\n`;
      });
    }
    
    if (detail === 'full') {
      text += '\nEnvironment:\n';
      text += `  Node: ${status.environment.node}\n`;
      text += `  Platform: ${status.environment.platform} (${status.environment.arch})\n`;
      text += `  Memory: ${Math.round(status.environment.memory.heapUsed / 1024 / 1024)}MB used of ${Math.round(status.environment.memory.heapTotal / 1024 / 1024)}MB total\n`;
    }
    
    return text;
  }
  
  /**
   * Format status as table
   * @param {Object} status - Status object
   * @returns {string} Formatted status table
   * @private
   */
  _formatStatusAsTable(status) {
    // This would use a table formatting library in a real implementation
    // For simplicity, return a basic text representation
    return this._formatStatusAsText(status, 'basic');
  }
}

export { CommandEnhancer, COMMAND_ENHANCER_CONFIG };