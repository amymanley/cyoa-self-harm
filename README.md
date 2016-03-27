A video training aid for assisting psychiatry students to learn how to interact
with patients.

Usage:

    ./adventure.py [--web|--state]

The default mode is as an interactive text adventure.  The script is stored in
script.txt.

Options:

    --web   - Start a web-server and serve the Q and A session via the web.  The
              default address is [http://localhost:5000/].

    --state - Write a state diagram out to state.dot.  This can be turned into
              an SVG for viewing with:

                  dot -Tsvg -ostate.svg state.dot

For developing the AngularJS webapp run:

    make webapp/app/script.ts
    cd webapp
    npm install
    npm start
