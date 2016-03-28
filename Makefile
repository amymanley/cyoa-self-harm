all:

NEEDED_FILES = \
    index.html \
    styles.css \
    external/es6-shim/es6-shim.min.js \
    external/systemjs/dist/system-polyfills.js \
    external/angular2/es6/dev/src/testing/shims_for_IE.js \
    external/angular2/bundles/angular2-polyfills.js \
    external/systemjs/dist/system.src.js \
    external/rxjs/bundles/Rx.js \
    external/angular2/bundles/angular2.dev.js \
    external/angular2/bundles/http.dev.js \
    external/papaparse/papaparse.js \
    external/tabletop.js \
    app/main.js \
    app/app.component.js

copy-external :
	npm install || true
	for x in $(patsubst external/%,%,$(filter external/%,$(NEEDED_FILES))); do \
	    mkdir -p $$(dirname external/$$x) && \
	    cp node_modules/$$x external/$$x ; \
	done

tarball: $(NEEDED_FILES)
	tar -cf cyoa.tar $(NEEDED_FILES)
