# Server Interfaces

This directory contains the core TypeScript interfaces for the simulation API.

## Interface Files

- `commands.ts` - Command definitions (RunSimulation, UpdateParameters, ClearCache, CompareScenarios)
- `projections.ts` - Read-model shapes returned by `/api/simulation/projections`
- `session.ts` - Session management interfaces, including the cached simulation result

## Key Concepts

### Commands
Commands represent requests handled by `/api/simulation/commands`. `RunSimulation` runs
`SimulationEngine` and caches the result on the session; the others read or update session state.

### Projections
Projections are read-only views over a session's cached simulation result - reshaped per
request, not reconstructed from a stored log.

### Sessions
Sessions provide isolation between different users and simulation runs, and hold the user's
parameters plus their most recent simulation result.
