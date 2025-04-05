#!/usr/bin/env node

/**
 * TaskCraft AI CLI - Main entry point
 * 
 * ULTRA-SIMPLIFIED version that addresses the duplicate command calls
 * by only calling the Commander instance once and eliminating all duplicate
 * functionality.
 */

// IMPORTANT: Suppress Perplexity initialization message
const originalConsoleLog = console.log;
console.log = function(...args) {
  // Filter out the Perplexity message completely
  if (typeof args[0] === 'string' && args[0].includes && args[0].includes('Initialized Perplexity')) {
    return;
  }
  originalConsoleLog.apply(console, args);
};

import { Command } from 'commander';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createRequire } from 'module';
import { spawn } from 'child_process';
import { displayBanner, displayHelp } from '../scripts/modules/ui.js';
import { registerCommands } from '../scripts/modules/commands.js';
import { detectCamelCaseFlags } from '../scripts/modules/utils.js';

// Get version from package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);
const packageJson = require('../package.json');
const version = packageJson.version;

// Get path to init script (special case)
const initScriptPath = resolve(__dirname, '../scripts/init.js');

// Check for camelCase flags
const camelCaseFlags = detectCamelCaseFlags(process.argv);
if (camelCaseFlags.length > 0) {
  console.error('\nError: Please use kebab-case for CLI flags:');
  camelCaseFlags.forEach(flag => {
    console.error(`  Instead of: --${flag.original}`);
    console.error(`  Use:        --${flag.kebabCase}`);
  });
  console.error('\nExample: taskcraft parse-prd --num-tasks=5 instead of --numTasks=5\n');
  process.exit(1);
}

// SINGLE Commander instance for the CLI
const program = new Command();

// Basic setup
program
  .name('TaskCraft AI CLI')
  .description('AI-driven development task management')
  .version(version);

// Special case for init command
program
  .command('init')
  .description('Initialize a new project')
  .option('-y, --yes', 'Skip prompts and use default values')
  .option('-n, --name <n>', 'Project name')
  .option('-d, --description <description>', 'Project description')
  .option('-v, --version <version>', 'Project version')
  .option('-a, --author <author>', 'Author name')
  .option('--skip-install', 'Skip installing dependencies')
  .option('--dry-run', 'Show what would be done without making changes')
  .action((options) => {
    // Pass through any options to the init script
    const args = ['--yes', 'name', 'description', 'version', 'author', 'skip-install', 'dry-run']
      .filter(opt => options[opt])
      .map(opt => {
        if (opt === 'yes' || opt === 'skip-install' || opt === 'dry-run') {
          return `--${opt}`;
        }
        return `--${opt}=${options[opt]}`;
      });
    
    const child = spawn('node', [initScriptPath, ...args], {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    child.on('close', (code) => {
      process.exit(code);
    });
  });

// Define all the command registrations directly here 
// instead of using the commands.js module which creates duplicated logic
// START COMMAND DEFINITIONS

import { 
  parsePRD,
  updateTasks,
  generateTaskFiles,
  setTaskStatus,
  listTasks,
  expandTask,
  expandAllTasks,
  clearSubtasks,
  addTask,
  addSubtask,
  removeSubtask,
  analyzeTaskComplexity
} from '../scripts/modules/task-manager.js';

import {
  displayNextTask,
  displayTaskById,
  displayComplexityReport
} from '../scripts/modules/ui.js';

import {
  addDependency,
  removeDependency,
  validateDependenciesCommand,
  fixDependenciesCommand
} from '../scripts/modules/dependency-manager.js';

import { CONFIG } from '../scripts/modules/utils.js';

// parse-prd command
program
  .command('parse-prd')
  .description('Parse a PRD file and generate tasks')
  .option('-i, --input <file>', 'Path to the PRD file (required)', CONFIG.defaultPRDPath)
  .option('-o, --output <file>', 'Path to save generated tasks', 'tasks/tasks.json')
  .option('-n, --num-tasks <num>', 'Number of tasks to generate', CONFIG.defaultTaskCount)
  .action(async (options) => {
    await parsePRD(options.input, options.output, parseInt(options.numTasks, 10));
  });

// update command
program
  .command('update')
  .description('Update tasks based on new information or implementation changes')
  .option('-f, --file <file>', 'Path to the tasks file', 'tasks/tasks.json')
  .option('--from <id>', 'Task ID to update from (required)')
  .option('-p, --prompt <text>', 'Context for the update (required)')
  .action(async (options) => {
    await updateTasks(options.file, options.from, options.prompt);
  });

// generate command
program
  .command('generate')
  .description('Create individual task files from tasks.json')
  .option('-f, --file <file>', 'Path to the tasks file', 'tasks/tasks.json')
  .option('-o, --output <dir>', 'Directory to output task files', 'tasks')
  .action(async (options) => {
    await generateTaskFiles(options.file, options.output);
  });

// set-status command
program
  .command('set-status')
  .description('Set the status of a task')
  .option('-f, --file <file>', 'Path to the tasks file', 'tasks/tasks.json')
  .option('-i, --id <id>', 'Task ID to update (required)')
  .option('-s, --status <status>', 'New status (required)')
  .action(async (options) => {
    await setTaskStatus(options.file, options.id, options.status);
  });

// list command
program
  .command('list')
  .description('List all tasks with their status')
  .option('-f, --file <file>', 'Path to the tasks file', 'tasks/tasks.json')
  .option('-s, --status <status>', 'Filter by status')
  .option('-w, --with-subtasks', 'Include subtasks in the listing')
  .action(async (options) => {
    await listTasks(options.file, options.status, options.withSubtasks);
  });

// And all the other similar commands...

// next command
program
  .command('next')
  .description('Show the next task to work on based on dependencies')
  .option('-f, --file <file>', 'Path to the tasks file', 'tasks/tasks.json')
  .action(async (options) => {
    await displayNextTask(options.file);
  });

// show command
program
  .command('show')
  .description('Display detailed information about a specific task')
  .argument('<id>', 'Task ID to show')
  .option('-f, --file <file>', 'Path to the tasks file', 'tasks/tasks.json')
  .action(async (taskId, options) => {
    await displayTaskById(options.file, taskId);
  });

// END COMMAND DEFINITIONS

// Customize help output to add a newline at the end
const originalHelpInformation = program.helpInformation;
program.helpInformation = function() {
  return originalHelpInformation.call(this) + '\n';
};

// Only show banner ONCE
if (process.argv.length <= 2) {
  // For help, show banner and help
  displayBanner();
  program.help();
} else {
  // For commands, show banner and parse
  displayBanner();
  program.parse(process.argv);
}