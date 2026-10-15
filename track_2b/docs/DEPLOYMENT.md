# Deployment and data boundaries

## Judging / single-instance Docker

Requires Docker Compose v2, a WebGL2 browser and an Apertus-compatible endpoint.

From repository root:

    cp track_2b/.env.example track_2b/.env
    # Set LLM_API_KEY in the ignored local file.
    make run

Open http://localhost:3000. Stop with make down. Configure LLM_NAME and LLM_BASE_URL if needed. Default inference is CSCS Apertus v1.5 70B. Docker runs a non-root Node 22 application, with bundled assets and in-memory two-hour sessions. The container does not need Redis or Vercel. No GPU is required for the app when using an external inference endpoint.

## Selected mandatory target: on-premise

Run the application on organization-administered infrastructure and configure an organization-administered Apertus-compatible model endpoint using LLM_BASE_URL, LLM_NAME and LLM_API_KEY. Keep single-instance in-memory sessions, or use organization-controlled Redis for multiple replicas. A local reverse proxy can terminate HTTPS; the default host binding is loopback. Model weights, inference server installation and model compute are not bundled and have not been tested on organization-owned hardware.

Build fetches the Node image and npm packages. Default CSCS runtime requires external network access. No air-gapped operation or Swiss-sovereign hosting claim is made.

## Public demonstration

https://scary-gate-keeper.vercel.app/ runs the frontend and API on Vercel. Upstash Redis persists session JSON, scoring and conversation history with expiry and atomic compare-and-set updates. It uses storage_KV_REST_API_URL and storage_KV_REST_API_TOKEN (standard Upstash/KV aliases are also supported). Never use the read-only token for writes. Credentials stay in server environment variables.

Vercel and Upstash are demo infrastructure, not evidence of the on-premise or sovereign Swiss architecture. Text/history reaches the app host, Redis and the inference provider. Audio, if used, reaches the app and inference provider and is not persisted by the app. Provider retention policies are separate. Microphone and Swiss German capability are unverified.

## Verification boundary

GitHub Actions Docker build/start/static/shift checks pass with a dummy inference key. A fresh checkout plus root make run and live-inference playthrough remains a final manual check. Local automated tests and production build pass; see SUBMISSION.md and LIVE_SMOKE.json for evidence and limitations.
