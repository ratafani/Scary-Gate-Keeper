.PHONY: run test build check down
run:
	$(MAKE) -C track_2b run
test:
	cd track_2b && npm test
build:
	cd track_2b && npm run build
check:
	$(MAKE) -C track_2b check
down:
	$(MAKE) -C track_2b down
