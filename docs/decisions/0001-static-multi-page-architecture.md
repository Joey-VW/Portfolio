# ADR 0001: Retain the Static Multi-Page Architecture

- Status: Accepted
- Date: July 31, 2026

## Context

The portfolio has independent HTML routes, shared and project-specific CSS/JavaScript, browser-readable JSON, and Python tooling. Its strongest projects do not require an application server or a client framework. The modernization program needs reproducible tooling and output boundaries, not a product rewrite.

## Decision

Retain a static multi-page browser architecture. Add npm as a cross-platform task surface and permit a static production build, while keeping Python for validation and data preparation. Do not add a persistent backend, database, server runtime, SPA router, or framework without a separate product requirement and decision record.

## Consequences

- Current URLs and direct navigation remain first-class contracts.
- Existing HTML, CSS, classic scripts, ES modules, and browser JSON remain valid inputs.
- Shared behavior may be modularized later in focused passes, but framework conversion is out of scope.
- Local development continues through an HTTP static server until Pass 16.3 introduces a truthful build-aware command.
- npm does not make the browser application a Node backend.
