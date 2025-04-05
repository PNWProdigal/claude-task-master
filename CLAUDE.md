# Task Master AI - Developer Guidelines

## Commands
- **Test:** `npm test` - Run all tests
- **Single Test:** `npm test -- tests/unit/specific-file.test.js` - Run specific test file  
- **Test Pattern:** `npm test -- -t "pattern to match"` - Run tests matching pattern
- **Watch Tests:** `npm run test:watch` - Run tests in watch mode
- **Coverage:** `npm run test:coverage` - Generate test coverage report
- **Task Tools:** `node scripts/dev.js` - Run development workflow
- **Test Optimizers:** `npm run test-optimizers` - Test optimization adapters
- **Benchmark Optimizers:** `node scripts/benchmark-optimizations.js` - Benchmark optimization performance

## Code Style
- **Module Pattern:** ES modules with named exports (`"type": "module"` in package.json)
- **Imports:** Group imports by external libs, then internal modules
- **Naming:** 
  - camelCase for variables/functions
  - PascalCase for classes
  - kebab-case for files
- **Formatting:** 2-space indentation, semicolons for statement termination
- **Error Handling:** Try/catch with detailed error messages and appropriate logging
- **Functions:** Prefer small, focused, pure functions with explicit parameters
- **Types:** JSDoc comments for type documentation
- **Comments:** Keep inline comments minimal and up-to-date with code changes
- **File Size:** If a module exceeds 500 lines, consider breaking it into smaller, specialized components

## Architecture
- `commands.js`: CLI command definitions using Commander.js
- `task-manager.js`: Task CRUD operations and data management
- `dependency-manager.js`: Task dependency management
- `ui.js`: User interface formatting and display with chalk/boxen/cli-table3
- `utils.js`: Reusable utilities and configuration
- `ai-services.js`: AI model integration (Claude/Perplexity)
- `optimization-adapter.js`: Performance optimizations for file operations

## Testing Best Practices
- Follow mock-first-then-import pattern for Jest ES modules
- Mock external dependencies for unit tests
- Create fresh data copies with `JSON.parse(JSON.stringify())`
- Clear mocks between tests with `jest.clearAllMocks()`
- Test both success and error paths
- Avoid file system operations in tests
- Aim for 80%+ code coverage

## Task Status Format
- Not Started: Set with `set-status --id=<id> --status=not-started`
- In Progress: Set with `set-status --id=<id> --status=in-progress`
- Done: Set with `set-status --id=<id> --status=done`
- Blocked: Set with `set-status --id=<id> --status=blocked`

## Performance Guidelines
- **File Operations:** Use OptimizationAdapter for all file read/write operations
- **Batch Processing:** Use BatchTool for parallel processing of multiple operations
- **Caching:** Implement appropriate caching for frequently accessed data
- **Memory Management:** Close file handles promptly after use
- **Large Files:** Use streaming for processing large files

## File Operations
- Always use `path.join()` for joining paths
- Use absolute paths in configuration files
- Implement proper error handling for all file operations
- Use OptimizationAdapter for improved performance

## Development Workflow
- **Task Selection:** Use `node scripts/dev.js next` to identify the next task to work on
- **Implementation:** Follow the implementation details provided in the task
- **Review Process:** Self-review code before submission
- **Task Completion:** Only mark a task as complete when all implementation is fully functional

## Version Control Practices
- **Commit Messages:**
  - Use present tense ("Add feature" not "Added feature")
  - First line as summary (max 50 chars)
  - Include task ID when applicable
- **Branching:**
  - main/master: Production-ready code
  - feature/*, fix/*, chore/*: Task-specific branches
- **Pull Requests:**
  - Include task reference in title
  - Complete the PR template with test results