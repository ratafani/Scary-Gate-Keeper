# Input/output contract

Application endpoints accept/return JSON. The track page currently specifies no additional batch schema. API keys stay server-side.

| Endpoint | Input | Successful output |
| --- | --- | --- |
| GET /api/health | None | ok, configured, model |
| GET /api/register | None | Public name/address/occupation records |
| POST /api/shifts | Empty object | id, visitor, index, total, score, mistakes, over, won, time |
| POST /api/shifts/:id/dialogue | text (1-2000 chars), language (en/de), encounterId | id, encounterId, speech, action, optional fallSeconds |
| POST /api/shifts/:id/decision | admit (boolean), encounterId | correct, shift |
| POST /api/transcribe | audio (base64 WAV), language (en/de) | text; endpoint compatibility unverified |

Visitor includes opaque encounter id, model URL, card fields and card image URL, excluding private profiles. Use identifiers returned by the prior response.

Model envelope: `{"speech":"Of course.","action":"turn_around"}`. Allowed actions: none, turn_around, jump. Invalid envelopes get one repair attempt. The server adds event identity and trusted jump timing. No commands are inferred from prose.

Errors: `{"error":"message"}`. HTTP 400 for input validation, 404 for missing/expired sessions, 409 for stale/busy dialogue encounters, 502 for upstream errors, 503 for missing configuration, 504 for upstream timeouts, otherwise 500. Request bodies are capped at 8 MB; audio validation caps base64 at 7,000,000 characters. Sessions disappear on restart.
