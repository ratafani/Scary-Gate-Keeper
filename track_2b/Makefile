.PHONY: run check down

# Replace with the command that starts the project in a Docker container,
# e.g. `docker compose up`. It must work from a clean checkout.
run:
	docker compose up --build
check:
	node scripts/check-submission.mjs
down:
	docker compose down
