# ADR 0002: Keep the Project Registry Canonical

- Status: Accepted
- Date: July 31, 2026

## Context

The homepage, project index, and Showcase must agree about publication state and ordering. Duplicating lifecycle values in page markup, build configuration, or documentation would recreate contradictions the existing registry validator is designed to prevent.

## Decision

Keep `data/projects.json` as the canonical source for project lifecycle metadata, public visibility, featured selection, creation date, route, and card content. Consumers must use the shared publishability and newest-first ordering behavior. A future build may derive entries or checks from the registry, but it must not create a competing manual publication list.

## Consequences

- Route presence does not make a project public.
- Invalid lifecycle metadata continues to fail closed.
- Homepage, project index, and Showcase contradictions are validation defects.
- Secondary documentation should be generated from the registry or checked against it where practical.
- Schema work belongs to Pass 16.2 and must preserve the current browser contract.
