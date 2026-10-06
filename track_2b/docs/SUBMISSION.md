# Track 2B submission audit

Rechecked on 6 October 2026 against https://hackapertus.notion.site/track-2-b-own-project and the official template.

| Requirement | Status |
| --- | --- |
| Apertus v1.5 | Default 70B nonthinking; configurable endpoint. |
| New hackathon work | Web implementation new; existing concept/assets disclosed. Resolve eligibility if needed. |
| track_2b structure | Required files and src/data/docs retained. Other tracks removed. |
| Docker through root make run | Files supplied; actual Docker launch still unverified. |
| LLM_NAME/LLM_BASE_URL/LLM_API_KEY | Configured; key excluded from Git/image context. |
| End-to-end judge execution | Local browser checked; clean Docker plus live model still required. |
| Input/output formats | docs/API.md defines the app contract; no separate batch schema appears on the current page. |
| Mandatory architecture | Swiss-cloud target documented; hosting/residency evidence outstanding. |
| data/ <=100 MB | Enforced by make check. |
| Public project repository | Not published; origin is the template, not a submission URL. |
| Report source and <=6-page PDF | Filled source and generated draft in track_2b; final results/metadata pending. |
| TeamName_Report.pdf | KampungSambau_Report.pdf uses anonymous project identifier; confirm registered alias. |
| Demo URL, <=2 minutes | Not yet recorded/uploaded. |
| Optional public dataset | Not submitted separately. If added, use event HF template, cases, responses and licensing metadata. |
| Open licensing | Apache LICENSE retained, documentation CC-BY-4.0; asset-level inventory still needs review. |

Submit at https://hackapertus.ch/online-hack/submissions, not Devpost.

## Final verification

1. Fresh checkout, only documented environment configuration, make run with Docker.
2. Check scene loading, an English question, two consecutive turns, and a German jump request.
3. Reject: right exit and closed gate. Repeat commands on the next visitor. Admit: open gate and left exit.
4. Test negations, malformed responses, network interruption and bad credentials. Measure action accuracy, validity, repairs and latency. Evaluate microphone separately.
5. Review assets for names/portraits and attribution before public release. Keep .env ignored.
6. Publish your own template-derived GitHub repo; record its URL and implementation commit SHA. Do not use the template origin as a submission URL.
7. Finalize team alias, <=6-page report, <=2-minute demo and architecture evidence.
