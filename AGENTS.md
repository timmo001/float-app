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

## Background Dev Servers

- Start the docs dev server with `mise run serve:docs`, which runs it through
  Pitchfork in the background and restarts it if it exits or stops responding.
  Do not run `astro dev` in the foreground from an agent.
- Use `mise run serve:docs:status`, `mise run serve:docs:logs`,
  `mise run serve:docs:restart` and `mise run serve:docs:stop` to manage it.
- The daemon is configured in `pitchfork.toml`. It serves
  `http://127.0.0.1:7990/`, or the next free port, and is always at
  `https://docs.float-app.localhost` through the Pitchfork proxy.
- Test through that HTTPS address, in the browser, with curl and anywhere else.
  Never add the proxy's own port, such as `:8443`, even if Pitchfork prints
  one: that means the 443 redirect is missing (it's lost on reboot), so run
  `pitchfork proxy doctor`, then `pitchfork proxy setup -y` to restore it. Use
  the `127.0.0.1` port only when the proxy isn't running.

## Validation

Run `mise run check` and `mise run build` after source changes.
