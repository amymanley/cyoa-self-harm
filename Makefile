all :

check :
	pep8 adventure.py
	nosetests -v adventure.py

clean :
	rm *.pyc states.svg states.dot

states.dot : script.txt adventure.py
	./adventure.py --state

states.svg : states.dot
	dot -Tsvg -o $@ $<

.PHONY : all check clean
