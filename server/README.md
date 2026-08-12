# Server-Side Event-Sourced Architecture

This directory contains the server-side implementation of the event-sourced financial simulation system.

## Structure

- `interfaces/` - Core TypeScript interfaces for events, commands, and projections
- `cache/` - Event cache and session management
- `aggregates/` - Domain aggregates and command handlers
- `projections/` - Projection builders and state reconstruction
- `api/` - API handlers and endpoints
- `utils/` - Utility functions and helpers

## Architecture

The system follows event sourcing patterns with:
- Commands processed by aggregates
- Events stored in session-based cache
- Projections built from event replay
- Session isolation for concurrent users