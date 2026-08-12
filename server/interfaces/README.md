# Server Interfaces

This directory contains the core TypeScript interfaces for the event-sourced financial simulation system.

## Interface Files

- `events.ts` - Financial event definitions and types
- `commands.ts` - Command definitions and handlers
- `projections.ts` - Projection interfaces for read models
- `session.ts` - Session management interfaces
- `cache.ts` - Event cache interfaces
- `aggregate.ts` - Aggregate root and repository interfaces

## Key Concepts

### Events
Events represent immutable facts about what happened in the system. Each event has:
- Unique ID and timestamp
- Session and aggregate association
- Type-specific data payload
- Metadata for traceability

### Commands
Commands represent requests to change system state. They are processed by aggregates and may generate events.

### Projections
Projections are read-only views built from events, optimized for specific queries and use cases.

### Sessions
Sessions provide isolation between different users and simulation runs.

### Aggregates
Aggregates are the consistency boundaries that process commands and generate events.