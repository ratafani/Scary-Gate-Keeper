# Web prototype status

The browser prototype reuses the original title, paper, button artwork, village meshes, and all eight visitor variants. The game uses React/Three.js and a same-origin Node service for Apertus dialogue. The original projects remain unchanged.

## Run

From `track_2b`, copy `.env.example` to `.env` and supply `LLM_API_KEY`. Use `make run` with Docker Compose, or `npm ci && npm run build && npm start` with Node 22. Open http://localhost:3000. The repository-root Makefile forwards to this directory.

The existing local credential was copied into an ignored `.env` for development; it is excluded from Docker build context. Never publish that file.

## Implemented

- Full shift with shuffled visitors, ID inspection, resident register, admit/reject, scoring and end states.
- English/German interface and Apertus prompts.
- JSON-validated model commands, unique response IDs, repeated actions, and slower anomaly descent.
- WAV microphone capture sent to the configured Apertus endpoint; transcript review before sending.
- Source asset conversion script, GLB meshes and local textures.
- Camera positioned outside the exported booth geometry, bounded drag and Reset view.

## Verification and remaining work

- TypeScript and production build passed; six game/contract tests passed.
- Browser preview has been inspected. Full original visionOS visual parity is not yet established.
- Docker launch remains unverified: Docker is not installed on the development host.
- Microphone endpoint compatibility and Swiss German accuracy remain unverified. Input errors retain a usable text path.
- Characters play the original `Alfa_Walk.usdc` motion on their compatible rig, exported as sampled glTF morph animation at 12 FPS. Arrival and departure use this clip; stationary visitors blend back to the base idle pose. No procedural bob/sway substitutes remain. The idle loop itself is not yet ported.
- Rejection exits right outside the gate and leaves the gate closed; admission exits left through the open gate. The next visitor waits for departure animation completion.
- Source foliage material conversion still needs refinement.
- Live bilingual model evaluation, report PDF, demo video, and final sovereign hosting verification remain outstanding.

## Asset provenance

Assets originate from the user's NeighborhoodWatchVision project. `public/assets/conversion-manifest.json` records source textures. `scripts/convert_assets.py` requires usd-core, NumPy and Pillow and converts source meshes without modifying them. Judges use the committed converted files and do not need conversion tools.

After base conversion, run `scripts/export_walk.py` with the same rkassets path. It verifies matching source joints, evaluates the authored walk through USD skinning, and adds a `Walk` clip to every visitor GLB. Always regenerate clean base assets before rerunning this second step.

The source scene layout is preserved. Reality Composer Pro timelines are replaced with browser behavior. The source resident prompt's contradictory claim that B-3 is empty is corrected to match Peja's resident entry; anomaly contradictions remain intentional.
