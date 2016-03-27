#!/usr/bin/python

import json
import sys
import textwrap
from itertools import count
from pprint import pprint

import jinja2
import yaml

def load(script_filename):
    script = open(script_filename, 'r').read().decode('utf-8')
    questions = script.split('\n\n')
    qs = {}
    for question in questions:
        try:
            q = {}
            line = question.split('\n')
            node_no = int(line[0].split(' ', 1)[0].replace('.', ''))
            conflicts = []
            q['doctor_line'] = line[0].split(' ', 1)[1]
            q['patient_line'] = line[1]
            q['options'] = [int(x) for x in line[2].replace('.', ' ').split()]
            if len(line) >= 4:
                q['conflicts'] = [
                    int(x) for x in line[3].replace('.', ' ').split()]
            qs[node_no] = q
        except Exception as e:
            print "Ignoring Invalid question:\n", question, "because", str(e)
    return qs


def questions_to_state_diagram(q):
    dot = open('states.dot', 'w')
    dot.write('digraph g {')
    dot.write(textwrap.dedent(
        '''\
        node [
        fontsize = "8"
        shape = "ellipse"
        ];
        edge [
        ];\n'''))
    for question in q.values():
        dot.write(textwrap.dedent((
            u"""\
            "node%i" [
            label = <<table><tr><td>%i</td></tr><tr><td>doctor: %s</td></tr>\
                     <tr><td>patient: %s</td></tr></table>>
            shape = "record"
            ];
            """) % (
            question['id'], question['id'],
            '<br/>'.join(textwrap.wrap(question['doctor_line'])),
            '<br/>'.join(textwrap.wrap(question['patient_line']))))
            .encode('utf-8'))
        for option in question['options']:
            dot.write((u'"node%i" -> "node%i";\n' % (question['id'], option))
                      .encode('utf-8'))
    dot.write('}')


class QAndA(object):
    def __init__(self, qs):
        self.qs = qs
        for q in self.qs.keys():
            self.qs[q]['id'] = q
        self.history = [0]
        self.excluded = []

    def current(self):
        return self.qs[self.history[-1]]

    def provide_options(self):
        valid_options = []
        n = 0
        for opt in self.current()['options']:
            if opt not in self.history and opt not in self.excluded \
                    and opt in self.qs:
                n += 1
                if n > 3:
                    break
                valid_options += [self.qs[opt]]
        return valid_options

    def choose(self, choice_idx):
        """Returns a list of states to go through"""
        opt_list = self.provide_options()
        if choice_idx >= len(opt_list):
            raise RuntimeError("No option %i" % choice_idx)
        self.excluded += self.current().get('conflicts', [])
        self.history += [opt_list[choice_idx]['id']]

    def serialise(self):
        return {
            'history': ','.join([str(x) for x in self.history]),
        }

    @staticmethod
    def deserialize(qs, data):
        qanda = QAndA(qs)
        if 'history' in data:
            qanda.history = [int(x) for x in data['history'].split(',')]
            for x in qanda.history:
                qanda.excluded += qs[x].get('conflicts', [])
        return qanda

test_questions = {
    0: {"options": [1, 2, 3, 4], },
    1: {"options": [2, 3], },
    2: {"options": [1], },
    3: {"options": [2, 1], },
    4: {"options": [2, 3], },
}

test_paths = [
    # Tests have the form (path taken through questions, expected options):
    ([], [1, 2, 3]),
    ([1], [2, 3]),
    ([3, 1], [2]),
]


def navigate(qanda, nodes):
    for next_node in nodes:
        chosen = False
        for n, opt in zip(count(), qanda.provide_options()):
            print "Checking ", n, opt
            if opt['id'] == next_node:
                qanda.choose(n)
                chosen = True
        if not chosen:
            return False
    return True


def ids(q):
    return [o['id'] for o in q.provide_options()]


def test_that_qanda_provides_correct_options():
    for path, expected_options in test_paths:
        def check():
            q = QAndA(test_questions)
            assert navigate(q, path), "Navigating path %s failed" % str(path)
            assert ids(q) == expected_options, "After navigating %s expected "\
                "options %s but got %s" % (str(path), str(expected_options),
                                           str(ids(q)))
        yield check


text_template = textwrap.dedent(u"""\
    Doctor:
        {{ current.doctor_line|wordwrap|indent }}

    Patient:
        {{ current.patient_line|wordwrap|indent }}

    Choose:
    {% for opt in options %}
    {{loop.index}}.  {{opt.doctor_line|wordwrap|indent}}
    {% endfor %}

    """)


def text_adventure(qanda):
    template = jinja2.Template(text_template)
    out = sys.stdout

    while True:
        out.write(template.render(
            current=qanda.current(),
            options=qanda.provide_options()))

        while True:
            try:
                choice = raw_input('Choose: ')
                if choice.startswith('q'):
                    return
                qanda.choose(int(choice) - 1)
                break
            except Exception as e:
                out.write("Invalid choice '%s' because %s\n"
                          % (choice, str(e)))
                pass
        out.write('\n' + '-' * 80 + '\n')


html_template = textwrap.dedent(u"""\
    <html>
      <head>
        <title>X-Files the Psychiatry Teaching Aid</title>
      </head>
      <body>
        <video>{{current.id}}</video>
        <dl>
          <dt>Doctor</dt><dd>{{ current.doctor_line }}</dd></dt>
          <dt>Patient</dt><dd>{{ current.patient_line }}</dd></dt>
        </dl>

        <p>Choose:</p>
        <ol>
        {% for opt in options %}
          <li>
            <a href="?{{state}}&amp;choose={{loop.index0}}">
              {{ opt.doctor_line }}
            </a>
          </li>
        {% endfor %}
        </ol>
      </body>
    </html>""")


def web_adventure(qs):
    from flask import Flask, request
    import jinja2
    app = Flask(__name__)
    template = jinja2.Template(html_template)

    @app.route("/")
    def start():
        qanda = QAndA.deserialize(qs, request.args)
        if 'choose' in request.args:
            qanda.choose(int(request.args['choose']))
        qanda.current()
        state = '&amp;'.join(["%s=%s" % (key, value)
                              for key, value in qanda.serialise().items()])
        return template.render(current=qanda.current(),
                               options=qanda.provide_options(),
                               state=state)

    app.debug = True
    app.run()


def main(argv):
    qs = load('script.txt')
    if len(argv) > 1:
        if argv[1] == '--web':
            web_adventure(qs)
        elif argv[1] == '--state':
            questions_to_state_diagram(qs)
        elif argv[1] == '--yaml':
            with open('script.yaml', 'w') as f:
                yaml.safe_dump(qs, f, encoding='utf-8', indent=4,
                               allow_unicode=True)
        elif argv[1] == '--json':
            with open('script.json', 'w') as f:
                f.write(
                    json.dumps(qs, encoding='utf-8', indent=4,
                               ensure_ascii=False).encode('utf-8'))
    else:
        qanda = QAndA(qs)
        text_adventure(qanda)
    return 0

if __name__ == '__main__':
    sys.exit(main(sys.argv))
