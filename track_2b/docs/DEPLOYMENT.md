# Deployment and data boundaries

Docker Compose v2 builds a non-root Node 22 application. Port 3000 binds to host loopback for local judging. Set the three prescribed LLM variables via track_2b/.env or environment; missing keys fail with a clear Compose configuration error. make down stops the service.

Build-time network dependencies: Node image registry and npm registry. Runtime dependencies: browser, app, configured Apertus endpoint. Assets are bundled; there are no analytics, CDN or implicit speech-recognition providers. Rendering uses browser WebGL2. Hosted inference requires no GPU in the app container; model weights are not included.

## Selected target: sovereign Swiss cloud

Deploy the image on infrastructure operated in Switzerland, under Swiss jurisdiction and residency, behind an HTTPS reverse proxy. Inference must meet the same conditions. CSCS is the configured default. Verify operator, jurisdiction, residency and retention policies before claiming compliance. No cloud resources or compliance evidence have been created yet. Default loopback binding supports a proxy on the same host; remote publication needs an explicit deployment network configuration. Microphone use outside localhost requires HTTPS.

Player text, fictional NPC profiles/history and requested audio reach the configured inference provider. The app holds history in memory and does not persist audio or response logs. Expiry is checked on access; expired sessions are removed when new shifts are created. Provider retention is separate and unverified.

An organization-controlled compatible Apertus endpoint can be configured, but this does not provision its model server or establish air-gapped readiness. The default hosted setup requires network access. Docker is absent on the development host; CI is configured to build/smoke-test the container but no successful CI/container result is claimed. Complete a clean Docker plus live-inference run before submission.
