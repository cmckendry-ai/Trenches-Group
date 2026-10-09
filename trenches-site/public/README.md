# trenches-site/public

Static pages meant for `env.ASSETS`. The live asset set is NOT in this repo (see
`trenches-site/README.md`). Deploying assets from this folder alone would replace the
live site's static files and take the rest of the site down. Before any deploy, export
the live assets into this folder first, then deploy. Worker route `/pricing/` falls
through to `env.ASSETS` (`trenches-site/dist/index.js` last line of the fetch handler).

- `pricing/index.html`: public pricing page. Numbers from `docs/PRICING.md` (proposal,
  2026-10-09). Outreach agent is intentionally not listed (staged, see CHANGELOG).
