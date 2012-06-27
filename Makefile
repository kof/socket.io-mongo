test:
	node_modules/.bin/qunit -c ./lib/mongo -t ./test/mongo

.PHONY: test
