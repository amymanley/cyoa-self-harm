import {Component} from 'angular2/core';

import {Http, Response} from 'angular2/http';

import 'rxjs/Rx';

declare var Papa: any;
declare var Tabletop: any;

function parse_csv(text)
{
    return spreadsheet_to_questions(Papa.parse(text, {header: true}).data)
}

function spreadsheet_to_questions(list)
{
    var out = {};
    list.forEach(function (row) {
        try {
            out[row['Item']] = {
                doctor_line: row['Dr'],
                patient_line: row['Patient'],
                conflicts: row['Exclude Items'].split(/\s+/),
                options: [
                    row['Option 1 list'].split(/\s+/).filter(x => x),
                    row['Option 2 list'].split(/\s+/).filter(x => x),
                    row['Option 3 list'].split(/\s+/).filter(x => x)
                ],
                exit: (row['Force feedback'] == "End"),
                end: (!!row['Force feedback'])
            };
        } catch (ex) {
            console.log("Couldn't parse row " + row['Item'] + ": "
                        + ex.message);
        }
    });
    return out;
}

function shift_option(opts, order)
{
    for (var i = 0; i < order.length; i++) {
        if (opts[i].length > 0) {
            return [opts[i].shift()];
        }
    }
    return [];
}

@Component({
    selector: 'my-app',
    template: `
        <video></video>
        <dl>
          <dt>Doctor</dt><dd>{{ script[current].doctor_line }}</dd>
          <dt>Patient</dt><dd>{{ script[current].patient_line }}</dd>
        </dl>

        <div *ngIf='current && !script[current].end'>
          <p>Choose:</p>
          <ol>
            <li *ngFor='#opt of available_choices()'>
              <a *ngIf="script[opt]" (click)="choose_option(opt)">
                {{ script[opt].doctor_line }}
              </a>
              <div *ngIf="!script[opt]">
                  ERROR: Video {{opt}} is unknown
              </div>
            </li>
          </ol>
          Or end the consultation:
          <ol>
              <li *ngFor='#opt of exit_questions()'>
                  <a *ngIf="script[opt]" (click)="choose_option(opt)">
                      {{ script[opt].doctor_line }}
                  </a>
              </li>
          </ol>
        </div>
        <div *ngIf='current && script[current].end'>
          This consulation is now over <a (click)="receive_feedback()">Receive
          Feedback</a>
        </div>
        `
})
export class AppComponent {
    current: string;
    script;
    choices;
    excludes;
    use_gdocs;
    constructor(private http: Http) {
        this.use_gdocs = true;
        this.choices = [];
        this.excludes = [];
        this.script = {
            "0": {
                "doctor_line": "Loading...",
                "patient_line": "Loading...",
                "options": [[], [], []]
            }};
        this.current = "0";

        if (this.use_gdocs) {
            var comp = this;
            Tabletop.init( {
                key: '1IvHzhdow5H2pAHgFk59NbZ0KKxKijxquTQvfUAxgno0',
                callback: function(data, tabletop) {
                    console.log(data);
                    comp.script = spreadsheet_to_questions(data.Sheet1.elements);
                    console.log(comp.script);
                }});
        } else {
            this.http.get('script.csv')
              .map((res:Response) => parse_csv(res.text()))
              .subscribe(
                data => {
                    this.script = data;
                    console.log(this.script);
                },
                err => console.error(err),
                () => console.log('done')
              );
        }
    }
    choose_option(opt_id) {
        this.choices.push(opt_id);
        this.excludes.push(opt_id);
        this.excludes.concat(this.script[this.current].conflicts);
        this.current = opt_id;
    }
    available_choices() {
        var out = [];
        var opts = [[], [], []];

        // Exclude the options that we've seen:
        for (var i = 0; i < 3; i++) {
            opts[i] = this.script[this.current].options[i].filter(
                x => this.excludes.indexOf(x) < 0);
        }

        out = out.concat(shift_option(opts, [0, 2, 1]));
        out = out.concat(shift_option(opts, [1, 0, 2]));
        out = out.concat(shift_option(opts, [2, 0, 1]));

        return out;
    };
    exit_questions() {
        return Object.keys(this.script).filter(x => this.script[x].exit);
    }
    receive_feedback() {
    }
}
