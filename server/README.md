# Server-Side Simulation API

This directory contains the server-side implementation backing `/api/simulation/*`.

## Structure

- `interfaces/` - Core TypeScript interfaces for commands, sessions, and projections
- `cache/` - In-memory session management (parameters + the session's cached simulation result)
- `projections/` - Pure functions that reshape a cached simulation result into the financial/timeline/milestone views the client requests

## Architecture

Each session holds the user's `UserParameters` and the most recent `SimulationResult` from
`SimulationEngine.runSimulation()`/`runSimulationWithTransitions()`. A `RunSimulation` command
re-runs the simulation and caches the new result on the session; projections are just different
views over that cached result, computed on read rather than reconstructed from an event log.
