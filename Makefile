all :

check :
	pep8 adventure.py
	nosetests -v adventure.py

clean :
	rm *.pyc

.PHONY : all check clean
