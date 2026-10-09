# runner (not yet in git)

The runner is `runner.py` plus a `.env`, running on the Windows PC
`McK-Home-Office` as `connor-windows-runner-01` (Python 3.12.10, Claude Code
2.1.259, Claude Pro login, runnerVersion 0.9, provider CLAUDE only). It polls
`trenches-os-api` at `/integrations/runner/*`: heartbeat every minute, claims
campaigns and demo jobs, runs discovery and enrichment through the Claude
Code CLI, and posts results back. A second copy on an Orgo cloud desktop died
on 2026-09-28 when its Claude OAuth session expired.

## To do from the desktop, once

1. Copy `runner.py` and any helper files into this folder.
2. Copy `.env` to `.env.example` with every value blanked. Never commit `.env`.
3. Add `requirements.txt` (`pip freeze` from the runner's venv).
4. Commit and push.

Until that is done this folder is the only reminder that the runner exists.
If the PC is reimaged, the prospector pipeline is gone.

## Known behavior worth fixing (from the API side, 2026-10-01)

- It retries a campaign 6 times over about 90 minutes on an auth error
  instead of failing fast. 220 campaigns failed this way in September.
- It depends on an interactive Claude login that expires. Week 4 of the
  operating review replaces it with an API key.
