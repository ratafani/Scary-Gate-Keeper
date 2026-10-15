# Kampung Sambau - Of the Dark

A browser night-watch mystery built with Apertus v1.5 for Hack Apertus Track 2B. Interview visitors in English or German, inspect their IDs, and ask them to turn or jump before deciding who enters.

## Run for judging

Requires Docker with Compose v2, an available Apertus endpoint/key, and a WebGL2 browser.

```sh
cp track_2b/.env.example track_2b/.env
# Set LLM_API_KEY in that local file.
make run
```

Open http://localhost:3000. Select Start the night shift, then Take your post. The required variables are `LLM_NAME`, `LLM_BASE_URL`, and `LLM_API_KEY`. Exported variables override the local file. Defaults select `swiss-ai/Apertus-v1.5-70B` at CSCS. The key stays server-side. Never commit `.env`.

Docker packages the app, not the 70B weights. The inference endpoint must be reachable from the container. No Xcode, Blender, or asset conversion is needed by judges. `make down` stops the service.

## Repository

The official template's `track_2b/` directory and prerequisite files are retained; the other challenge directories were removed. `make run` works from this root or inside `track_2b/`.

- [Track guide](track_2b/README.md)
- [Technical report source](track_2b/technical_report.md) and [PDF](track_2b/Siskamling_Report.pdf)
- [Submission audit](track_2b/docs/SUBMISSION.md)
- [API contract](track_2b/docs/API.md)
- [Deployment boundaries](track_2b/docs/DEPLOYMENT.md)

`make check` validates files and data size. Development: Node 22, then `npm ci`, `npm run build`, `npm start` inside track_2b. `make test` runs automated tests.

## Status

Team: **Siskamling**. Public repository: https://github.com/ratafani/Scary-Gate-Keeper. Demo: https://scary-gate-keeper.vercel.app/.

Repository checks, 11 automated tests, production build and GitHub Actions Docker smoke checks pass. Docker CI uses a dummy inference key; a clean root `make run` with live inference remains a final manual check. The public Vercel demo uses Redis sessions; Docker uses in-memory sessions by default. The selected mandatory architecture is on-premise deployment with an organization-administered Apertus endpoint. Vercel is a demo host, not Swiss-sovereign hosting evidence. See the submission audit for remaining video and validation items.


Code: Apache-2.0. Documentation/report: CC-BY-4.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE). Public materials use the project identifier without adding personal/team identities.
