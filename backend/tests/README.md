# Backend Test Suite

Unit and integration tests for the flight rescheduler backend.

## Running Tests

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run a specific test file
bun test tests/time.test.ts

# Run with coverage (if configured)
bun test --coverage
```

## Test Files

- **time.test.ts** - Simulation time management (get, set, advance, fast forward)
- **flights-status.test.ts** - Flight status progression (scheduled → in_progress → completed)
- **weather.test.ts** - Weather simulation and retrieval
- **safety.test.ts** - Safety checks and flight marking
- **calendar.test.ts** - Available slots and rescheduling
- **flights.test.ts** - Flight generation and cleanup
- **seed.test.ts** - Database seeding
- **alerts.test.ts** - Alert creation and retrieval
- **routes.test.ts** - Route status with weather
- **cleanup.test.ts** - Simulation reset
- **api.test.ts** - API endpoint integration tests
- **endpoints.test.ts** - Endpoint response validation

## Test Architecture

### In-Memory Store

All tests use the in-memory store (`store.ts`) instead of SQLite. This ensures:
- ✅ Tests don't affect production data
- ✅ Tests run in isolation
- ✅ Fast test execution
- ✅ No cleanup needed between tests
- ✅ No file system dependencies

### Test Helpers

The `test-helpers.ts` file provides utilities for test setup (currently deprecated but kept for compatibility).

### Test Patterns

1. **Isolation**: Each test sets up its own data
2. **Cleanup**: Tests use fresh store instances or clear data between tests
3. **Assertions**: Use Bun's built-in `expect` API
4. **Async**: Tests support async/await for API calls

## Test Coverage

Current test coverage includes:

- ✅ Simulation time management
- ✅ Flight status transitions
- ✅ Weather event creation and filtering
- ✅ Safety check logic (marking flights as affected)
- ✅ Available slot calculation
- ✅ Flight rescheduling
- ✅ Flight generation and cleanup
- ✅ Alert creation
- ✅ Route status with weather
- ✅ API endpoint responses
- ✅ Error handling

## Writing New Tests

### Example Test Structure

```typescript
import { describe, it, expect, beforeEach } from "bun:test";
import { store } from "../src/store";
import { functionToTest } from "../src/routes/module";

describe("Module Tests", () => {
  beforeEach(() => {
    // Clear store before each test
    store.clearAll();
  });

  it("should do something", () => {
    // Arrange
    store.addStudent("Test Student", "beginner", "morning");
    
    // Act
    const result = functionToTest();
    
    // Assert
    expect(result).toBe(expected);
  });
});
```

### Best Practices

1. **Clear state**: Use `beforeEach` to reset the store
2. **Isolated tests**: Each test should be independent
3. **Descriptive names**: Test names should clearly describe what they test
4. **Arrange-Act-Assert**: Structure tests clearly
5. **Edge cases**: Test boundary conditions and error cases

## Known Test Limitations

- Tests use in-memory store, so they don't test SQLite-specific behavior (but we've migrated away from SQLite)
- Some integration tests may need backend server running (use `fetch` with actual endpoints)
- Background processes (setInterval) are not automatically tested in unit tests

## Continuous Integration

Tests should pass on:
- ✅ Bun latest stable
- ✅ All test files
- ✅ No flaky tests

Run `bun test` before committing to ensure all tests pass.
