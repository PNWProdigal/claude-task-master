# Project Organization Guidelines

## Project Structure
- **Root Directory:** Maintain clear separation by logical component:
  - `/airapdf`, `/holocron`, `/telegram_mini_app` - Project directories
  - `/migration-tools` - Migration utilities and algorithms
  - `/task-tools` - Task management utilities
  - `/tests` - Test scripts
  - `/docs` - Documentation
  - `/libs` - Libraries and utility modules
- **Standard Directories:** All projects should include:
  - `/scripts` - For utility scripts and task management
  - `/tasks` - For individual task files
  - `.gitignore` - With standardized patterns across projects
  - `package.json` - With consistent formatting
- **Node Modules:** Never commit node_modules/ to version control
- **Subproject Structure:** Maintain consistent directory structures across similar project types
- **Structure Documentation:** See `docs/REPOSITORY_STRUCTURE.md` for detailed organization

## Commands
- **Test:** `npm test` (Note: Test framework not yet configured)
- **Test Optimizers:** `npm run test-optimizers`
- **Test Duplicate Detection:** `npm run test-duplications`
- **Lint JS Files:** `npm run lint`
- **Scripts:** Run utility scripts with `node script-name.js`
- **Task Tools:** Manage project tasks with `node task-tools/task-master-wrapper.js <command>` (see Taskmaster section)
- **Dev Environment:** Run `node scripts/dev.js` for development workflow

## Code Style
- **Imports:** CommonJS style with `require()` preferred over ES6 imports
- **Classes:** Use ES6 classes with clear method organization
- **Naming:**
  - camelCase for variables/functions
  - PascalCase for classes
  - snake_case for file names
  - UPPER_CASE for constants
- **Performance:** Use optimizers from `../libs/optimizers` when handling files
- **Error Handling:**
  - Always use try/catch blocks with detailed error messages
  - Log errors with appropriate severity levels
  - Include stack traces in development
- **Comments:**
  - JSDoc style for classes and public methods
  - Inline comments for complex logic only
  - Keep comments up-to-date with code changes
- **Formatting:**
  - Use 2-space indentation
  - Maximum line length: 80 characters
  - Use semicolons to terminate statements
- **File Size:**
  - Tools should be no longer than 500 lines of code
  - If a tool exceeds 500 lines, break it down into smaller, specialized modules

## File Standards
- **Path Handling:**
  - Always use `path.join()` for joining paths
  - Use absolute paths in configuration files
  - Maintain consistent path formatting across projects
- **Paths in Bash:** Always quote paths in bash commands
- **File Operations:**
  - Use MultiFileOptimizer and SmartBatchOptimizer for bulk operations
  - Use FileSearchOptimizer for efficient file searching
  - Use FastEditOptimizer for stream-based file editing
  - Import optimizers from `../libs/optimizers` with appropriate paths
  - Implement proper error handling for all file operations
  - Close file handles promptly after use
- **Repository Structure:**
  - Maintain organization by project in dedicated folders
  - Use consistent naming conventions for related files
  - Group related functionality in dedicated directories

## Documentation Standards
- **README Files:**
  - Include a README.md in each project and major subdirectory
  - Describe purpose, setup instructions, and key components
  - Document environment requirements and dependencies
- **API Documentation:**
  - Document all public APIs with examples
  - Include parameter descriptions and return values
  - Note any side effects or potential errors
- **Change Logs:**
  - Maintain CHANGELOG.md for each project
  - Follow semantic versioning principles
  - Document breaking changes prominently

## Project Status Format
- Not Started: 🔴 Not Started
- In Progress: 🟡 In Progress (XX%)
- Completed: 🟢 Completed
- Blocked: ⚠️ Blocked (Reason)
- Review: 🔍 In Review
- Testing: 🧪 Testing
- Deployed: 🚀 Deployed

## Version Control Practices
- **Commit Messages:**
  - Use present tense ("Add feature" not "Added feature")
  - First line as summary (max 50 chars)
  - Include task ID when applicable
- **Branching:**
  - main/master: Production-ready code
  - development: Integration branch
  - feature/*, fix/*, chore/*: Task-specific branches
- **Pull Requests:**
  - Include task reference in title
  - Complete the PR template with test results
  - Request review from appropriate team members

## Environment Configuration
- **Environment Variables:**
  - Store in .env files (never commit to version control)
  - Document required variables in README.md
  - Use consistent naming (UPPERCASE_WITH_UNDERSCORES)
- **Configuration Files:**
  - Use JSON or YAML for configuration
  - Include sample configuration files in version control
  - Document all configuration options

## Task Tools Usage
- **Initialize Project:** `node task-tools/task-master-wrapper.js init` in each project directory
- **Generate Tasks from PRD:** `node task-tools/task-master-wrapper.js parse-prd scripts/prd.txt`
- **View Tasks:** `node task-tools/task-master-wrapper.js list` or `node task-tools/task-master-wrapper.js next` for next priority task
- **Generate Task Files:** `node task-tools/task-master-wrapper.js generate`
- **Update Task Status:** `node task-tools/task-master-wrapper.js set-status --id=<id> --status=<status>`
- **Break Down Complex Tasks:** `node task-tools/task-master-wrapper.js expand --id=<id> --prompt="Focus on specific aspect"`
- **Analyze Task Complexity:** `node task-tools/task-master-wrapper.js analyze-complexity` followed by `node task-tools/task-master-wrapper.js complexity-report`
- **Manage Dependencies:** `node task-tools/task-master-wrapper.js add-dependency --id=<id> --depends-on=<id>`
- **View Task Details:** `node task-tools/task-master-wrapper.js show <id>` for comprehensive task information
- **Handle Implementation Drift:** `node task-tools/task-master-wrapper.js update --from=<id> --prompt="<context>"` to adapt to changing requirements

## Dependency Management
- **Package Management:**
  - Lock files (package-lock.json) must be committed
  - Keep dependencies up-to-date with security patches
  - Audit dependencies regularly
- **Shared Code:**
  - Extract common functionality into shared libraries
  - Use proper versioning for internal packages
  - Document dependencies between projects

## Testing Standards
- **Unit Tests:**
  - Co-locate tests with implementation files
  - Maintain high test coverage (>80%)
  - Mock external dependencies appropriately
- **Integration Tests:**
  - Test API endpoints and data flows
  - Maintain test data separate from production
  - Automate integration tests in CI pipeline
- **Test Naming:**
  - Descriptive test names (describe_what_is_being_tested_when_conditions_should_behavior)
  - Group related tests in describe blocks
  - Use consistent naming patterns

## Development Workflow
- **Task Selection:**
  - Use `node task-tools/task-master-wrapper.js next` to identify the next task to work on
  - Consider dependencies and project priorities
  - Update task status when starting work
- **Implementation:**
  - Follow the implementation details provided in the task
  - Reference related tasks when implementing shared functionality
  - Use consistent coding patterns defined in this document
- **Review Process:**
  - Self-review code before submission
  - Request peer review through pull requests
  - Address all review comments before merging
- **Task Completion:**
  - Update task status to completed when finished
  - Ensure all tests pass before marking as complete
  - Document any implementation details that differ from the original plan

## Project Consolidation
- **File Migration:**
  - Follow the migration strategy document
  - Validate functionality after migration
  - Update documentation to reflect new locations
- **Shared Components:**
  - Identify and extract shared functionality
  - Create modular, reusable components
  - Document integration points between projects
- **Standards Implementation:**
  - Apply these guidelines consistently across all projects
  - Use scripts/standardize_rules.js to synchronize standards
  - Validate compliance with standards during review