# Testing Patterns

## Test Framework

- **Framework**: Vitest
- **Run tests**: `bun run test`
- **Watch mode**: `bun run test:watch`

## Test Structure

- Tests are in `tests/` directory
- Unit tests for utilities in `tests/utils/`
- Database tests in `tests/db/`
- Component tests should be colocated or in `tests/components/`

## Test Patterns

- Use `describe` blocks to group related tests
- Use `it` or `test` for individual test cases
- Mock browser APIs when needed
- Test async operations with `async/await`

## Database Testing

- Use Dexie's in-memory database for tests
- Clean up test data after each test
- Test IndexedDB operations with proper error handling

## Component Testing

- Use Vue Test Utils for component testing
- Mock dependencies when necessary
- Test component props, events, and slots

## Coverage

- Aim for meaningful test coverage
- Focus on critical business logic
- Test edge cases and error scenarios
