all :

check :
	nosetests -v adventure.py

clean :
	rm *.pyc

.PHONY : all check clean
