# float-app Docs

The [float-app](https://github.com/timmo001/float-app) documentation site, built
with [Blume](https://github.com/haydenbleasel/blume) and
[docs-kit](https://github.com/timmo001/groundwork/tree/main/packages/docs-kit).

Run these commands from the repository root:

- `mise run docs:install`
- `mise run docs:gen:cli`
- `mise run docs:lint`
- `mise run docs:check`
- `mise run docs:build`

`mise run check` runs `blume check --strict --isolated` against the pages, links
and types, and lints the docs scripts with the shared Oxlint rules.

From this directory, use `bun run dev` for local development, `bun run brand` to
regenerate the PNG branding from `src/assets/logo.svg` and `bun run deploy` to
deploy to Cloudflare Workers.
