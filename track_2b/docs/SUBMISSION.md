# Siskamling - submission checklist

Prepared 15 October 2026. Project: Kampung Sambau - Of the Dark.

## Ready

- Public template-derived repository: https://github.com/ratafani/Scary-Gate-Keeper
- Browser demo: https://scary-gate-keeper.vercel.app/
- Track directory remains track_2b; other track directories excluded.
- Apertus v1.5 70B runtime; configurable LLM_NAME, LLM_BASE_URL, LLM_API_KEY.
- data/ is 25,378 bytes, below 100 MB; credentials excluded from Git.
- 11 tests, production build and Docker CI pass. CI evidence: https://github.com/ratafani/Scary-Gate-Keeper/actions/runs/38511334198
- Technical report source and Siskamling_Report.pdf, maximum six pages.
- Selected architecture: on-premise app with organization-administered inference; see DEPLOYMENT.md. This target is documented, not a tested installation of the 70B model.
- LIVE_SMOKE.json records four live text/action checks and two gate decisions, all passing expected action/endpoint checks. German speech was mixed with English, so language quality is a limitation.

## Required before pressing Submit

1. Record and upload a video of at most two minutes, then obtain a publicly viewable URL. Use DEMO_SCRIPT.md.
2. Do a clean root make run with a valid inference key and play through at least one model question and gate decision. CI verifies Docker startup with a dummy key, not live inference.
3. Review the report and required submission form registration/contact fields. Team name: Siskamling.
4. Verify the chosen branch/commit is present on main or submit a clear branch link. Do not claim production updates before merging the submission commit.
5. Confirm the organizer's interpretation of new hackathon work with reused, team-owned concept/assets if needed. Reuse is disclosed in the report.

## Submit fields

Team: Siskamling
Project: Kampung Sambau - Of the Dark
Repository: https://github.com/ratafani/Scary-Gate-Keeper
Demo application: https://scary-gate-keeper.vercel.app/
Technical report: upload track_2b/Siskamling_Report.pdf
Video URL: supply after recording/uploading; application URL is not a video URL.
Track: 2B - Own Project
Architecture: on-premise (configurable organization-administered Apertus endpoint).
Dataset: no separate dataset submission proposed.

Submission portal specified by the retained track instructions: https://hackapertus.ch/online-hack/submissions . Portal verified in the browser on 15 October 2026. Final deadline: 16 October 2026, 12:00 CEST / 17:00 WIB (no extensions). Required fields: first/last name, registration email, GitHub username, team name, team members, project name, Swiss-student-team status, model, report PDF, repository URL, demo video URL, and terms acceptance. Hugging Face username, dataset URL and message are optional.
