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
- `mise run docs:plan`: build the site, then show what deploying it would change
- `mise run docs:deploy`: build the site, then deploy it

`mise run check` runs `blume check --strict --isolated` against the pages, links
and types, and lints the docs scripts with the shared Oxlint rules.

From this directory, use `bun run dev` for local development and `bun run brand`
to regenerate the PNG branding from `src/assets/logo.svg`.

## Deployment

The site deploys to the `float-app-docs` Cloudflare Worker at
float-app.timmo.dev. [`alchemy.run.ts`](alchemy.run.ts) is its
[Alchemy](https://alchemy.run) stack: the Worker's name, custom domain and
compatibility settings. The Deploy docs workflow runs `mise run docs:deploy` on
pushes to `main`.

CI's Cloudflare token and the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`
repository secrets come from [`stacks/github.ts`](stacks/github.ts). Deploy it
once from a machine with `mise run docs:deploy:github`, and again to rotate the
token.
