# Test Suite

This directory contains unit tests for the flight rescheduler backend.

## Running Tests

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test:watch

# Run a specific test file
bun test tests/schema.test.ts
```

## Test Files

- **db.test.ts** - Tests for basic database operations (insert, query, prepared statements)
- **schema.test.ts** - Tests for database schema creation and table structure
- **seed.test.ts** - Tests for database seeding functionality
- **api.test.ts** - Tests for API route handlers

## Test Coverage

- ✅ Database schema initialization
- ✅ Database CRUD operations
- ✅ Seed function (instructors, planes, students, flights)
- ✅ API route handlers
- ✅ Data relationships and constraints

## Test Database

All tests use in-memory SQLite databases (`:memory:`) to ensure:
- Tests don't affect the production database
- Tests run in isolation
- Fast test execution
- No cleanup needed between tests

