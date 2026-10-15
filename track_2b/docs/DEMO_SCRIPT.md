# Siskamling - two-minute demo script

Record the actual game at https://scary-gate-keeper.vercel.app/ with readable UI, system audio optional. Keep the final video under 2:00. Do not show Vercel settings, terminal secrets or environment files. Upload as publicly viewable/unlisted and test the link while signed out.

0:00-0:12 - Title screen
Narration: "We are Siskamling. Kampung Sambau is a 3D night-watch mystery powered by Apertus v1.5 70B. Your task is to identify visitors before opening the village gate."

0:12-0:30 - Start a shift and open the ID and resident map.
Narration: "Every shift randomly selects eight scenarios from thirteen. Compare the visitor's ID with their answers and the resident information."

0:30-0:52 - Type: "Where do you live?"
Show the actual response. Narration: "Apertus roleplays the visitor using their private character profile. The server validates a structured speech-and-action response."

0:52-1:12 - Type: "Can you turn around for me?"
Let the full turn finish. Narration: "The model selects the action; the NPC consumes that command and plays the authored animation."

1:12-1:32 - Select German in settings; type: "Spring bitte."
Let the jump finish. Narration: "Requests can be in English or German. An impostor falls more slowly, providing a physical clue. German response-language consistency is still being improved."

1:32-1:47 - Admit or reject after inspecting the evidence; show the departure and next NPC.
Narration: "Trusted game logic handles scoring, gate access and animation timing. Shared Redis sessions keep the public serverless demo consistent."

1:47-1:58 - Finish on gameplay.
Narration: "The project is open source and Docker-runnable through make run. Our deployment target is an organization-controlled application and Apertus endpoint. Vercel hosts this demo."

If inference is slow, shorten narration or edit waiting periods; preserve the real request/response sequence. Do not present a successful run as an accuracy benchmark. Microphone support is unverified and should not be claimed in the demo.
