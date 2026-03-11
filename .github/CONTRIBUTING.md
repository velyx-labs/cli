# Contributing to Velyx CLI

This repository contains the Velyx CLI that initializes projects, fetches components from the registry, installs dependencies, and writes component files into Laravel applications.

## Code of Conduct

Participation in this repository is governed by the [Code of Conduct](CODE_OF_CONDUCT.md).

## Before You Open Work

- Search existing issues, discussions, and pull requests first.
- Keep changes narrow. Do not combine unrelated refactors with behavior changes.
- If the change affects generated paths, dependency handling, registry contracts, or terminal output, state that scope explicitly.

## Contribution Standard

Useful contributions in this repository include:

- fixing command regressions
- improving file generation or JS injection
- hardening registry integration and dependency handling
- improving prompts, help output, and error clarity
- adding or tightening unit, integration, and E2E coverage

Low-value contributions include untested contract changes, output churn with no user benefit, and registry assumptions that are not enforced by tests.

## Local Setup

```bash
pnpm install
pnpm build
```

Useful local commands:

```bash
pnpm typecheck
pnpm test
pnpm start -- --help
```

A pull request is not ready if the build or relevant test suite fails.

## Required Verification

Run the checks relevant to your change:

```bash
pnpm typecheck
pnpm test
```

Also verify manually when applicable:

- the affected CLI command works against a Laravel fixture
- generated file paths and names are correct
- JS imports and Alpine registration are correct
- dependency installation behavior is correct
- output and error messages are intentional

## Engineering Standard

- Keep command behavior explicit and deterministic.
- Do not change user-facing contracts silently.
- Prefer precise failures over generic errors.
- Heavily test path handling, dependency parsing, and generated output.
- Update docs and examples when command behavior changes.

## Pull Requests

A pull request should state:

- what changed
- why it changed
- which commands or flows are affected
- how the result was verified

If the change affects terminal output or generated files, show that explicitly.

## Architecture Constraints

When editing the CLI:

- keep registry contracts, generated files, and docs aligned
- prefer integration tests when the change spans multiple services
- use E2E coverage for flows that depend on built output or mock registry behavior
- treat file paths, dependency versions, and output formatting as stable external contracts

## Security

Do not report security issues in public issues or discussions. Follow [SECURITY.md](SECURITY.md).
