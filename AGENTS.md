# float-app agents

This repo contains the standalone `float-app` CLI.

## Stack

- Runtime and package manager: Bun.
- Language: TypeScript.
- Effects and services: Effect v4.
- Task runner: mise.

## Rules

- Keep code at the repo root under `src/`.
- Keep CLI metadata in `src/cli/spec.ts`; help and completions consume it.
- Keep compositor-specific behavior behind adapters.
- Write generated rules only under the user's compositor config directory.

## Validation

Run `mise run check` and `mise run build` after source changes.
