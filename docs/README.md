# float-app Docs

The [float-app](https://github.com/timmo001/float-app) documentation site, built
with Astro and Starlight.

Run these commands from the repository root:

- `mise run docs:install`
- `mise run docs:gen:cli`
- `mise run docs:typecheck`
- `mise run docs:build`

`mise run check` includes TypeScript 7 checking for the docs content config and
CLI reference generator. Oxlint also checks these files with type-aware rules.
The Astro build validates content and renders the site; it does not type-check
Astro templates or MDX. There are currently no local `.astro` files.

From this directory, use `bun run dev` for local development and `bun run deploy`
to deploy the static site to Cloudflare Workers.
