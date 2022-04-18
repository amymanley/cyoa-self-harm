import {Component} from 'angular2/core';

import {Http, Response} from 'angular2/http';

import 'rxjs/Rx';
import {Observable} from 'rxjs/Rx';

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
                clip: row['Item'],
                doctor_line: row['Dr'],
                patient_line: row['Patient'],
                conflicts: row['Exclude Items'].split(/\s+/),
                options: [
                    row['Option 1 list'].split(/\s+/).filter(x => x),
                    row['Option 2 list'].split(/\s+/).filter(x => x),
                    row['Option 3 list'].split(/\s+/).filter(x => x)
                ],
                exit: (row['Force feedback'] == "End"),
                end: (!!row['Force feedback']),
                feedback: row["Feedback"]
            };
        } catch (ex) {
            console.log("Couldn't parse row " + row['Item'] + ": "
                        + ex.message);
        }
    });
    return out;
}
function spreadsheet_to_areas(sheet)
{
    console.log(sheet);
    var out = [];
    sheet.forEach(function (row) {
        try {
            var name = row[0];
            var in_list = [];
            for (var i=1; row[i]; i++) {
                in_list.push(row[i].split(/\s+/).filter(x => x));
            }
            out.push({name: name, in_list: in_list});
        } catch (ex) {
            console.log("Couldn't parse row " + row['Item'] + ": "
                        + ex.message);
        }
    });
    return out;
}

function shift_option(opts, order)
{
    for (let i of order) {
        if (opts[i].length > 0) {
            return [opts[i].shift()];
        }
    }
    return [];
}

 function area_covered(area, choices)
{
    for (var i=0; i < area.in_list.length; i++) {
        var unmatched = area.in_list[i].filter(x => choices.indexOf(x) < 0);
        if (unmatched.length == 0) {
            return true;
        }
    }
    return false;
}

function area_feedback(area, choices)
{
    for (var i=0; i < area.in_list.length; i++) {
        var unmatched = area.in_list[i].filter(x => choices.indexOf(x) < 0);
        if (unmatched.length == 0) {
            return true;
        }
    }
    return false;
}

@Component({
    selector: 'my-app',
    template: `
      <div class="container" *ngIf="!show_feedback_page">
        <video width="477" height="360" [src]="'/assets/cyoaclips/' + script[current].clip + '.mp4'" autoplay>
                  Alt text - Patient line: {{ script[current].patient_line }}</video>
        <div class="timer" *ngIf="!show_feedback_page">
          <p>TIMER: {{ticks}}</p>
        </div>
        <div class="overlay">
          <div *ngIf='current && !script[current].end'>
            <p>Choose an option:</p>
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
            <div class="endcontainer">
              Or end the consultation:
              <ol class="endoptions">
                  <li *ngFor='#opt of exit_questions()'>
                      <a *ngIf="script[opt]" (click)="choose_option(opt)">
                          {{ script[opt].doctor_line }}
                      </a>
                  </li>
              </ol>
            </div>
          </div>
          <div *ngIf='current && script[current].end'>
            This consulation is now over <a (click)="receive_feedback()">Receive
            Feedback</a>
          </div>
        </div>
      </div>
      <div *ngIf='show_feedback_page' class="feedback">
        <h1>Here's how you did</h1>
        <p>Well done on completing the assessment of self harm simulated patient scenario.</p>
        <h2>What you covered</h2>
        <h3>You covered these areas well:</h3>
        <ul>
          <li *ngFor="#area of areas_covered">
            {{ area.name }}
          </li>
        </ul>
        <h3>You could have explored these areas further:</h3>
        <ul>
          <li *ngFor="#area of areas_not_covered">
            {{ area.name }}
          </li>
        </ul>
        <h2>How you did it</h2>
        
          <p id="para1" *ngFor="#area of questions_feedback">
            {{ area.name }}
          </p>

        <h2>Time taken</h2>
        <p>You spent .... minutes completing the consultation.  This is longer than it would take you in practice as you don't take as much thinking time between questions in practice.  </p>
        <h1>What should I do next?</h1>
        <ul><li>To learn more about self harm and it's management, complete the elearning module on self harm.</li>
        <li>Assess a patient presenting following an episode of self harm with supervision from the liaison psychiatry team.</li>
        </ul>
        <h1>Student Mental Health</h1>
        <p>Clearly this simulated patient scenario involves some upsetting material. If you have been affected by this and would like to talk to someone please contact the student support service or see the student support page <a href="http://www.bristol.ac.uk/students/wellbeing/">here</a> for details of services, including confidential helplines, which you may find helpful. </p><p>If you have concerns about another student please speak to a member of staff or <a href="http://www.bristol.ac.uk/students/wellbeing/help-someone/">follow this link</a> to find out about how you can help.</p>


        </div>

        `
})
export class AppComponent {
    current: string;
    script;
    choices;
    excludes;
    show_feedback_page:boolean;
    questions_feedback;
    key_areas;
    feedback: any[];
    ticks;
    areas_covered;
    areas_not_covered;
    constructor(private http: Http) {
        this.ticks = 0;
        this.choices = [];
        this.excludes = [];
        this.key_areas = [];
        this.feedback = [];
        this.script = {
            "0": {
                "doctor_line": "Loading...",
                "patient_line": "Loading...",
                "options": [[], [], []]
            }};
        this.current = "0";
        let timer =  Observable.timer(1000, 1000);
        timer.subscribe(t=>this.ticks = t);

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
        this.http.get('key_areas.csv')
          .subscribe(
            data => {
              this.key_areas = spreadsheet_to_areas(Papa.parse(data.text()).data.slice(1));
            },
            err => console.error(err),
            () => console.log('done')
          );
        this.http.get('feedback.csv')
          .subscribe(
            data => {
              this.feedback = spreadsheet_to_areas(Papa.parse(data.text()).data.slice(1));
            },
            err => console.error(err),
            () => console.log('done')
          );
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
        this.show_feedback_page=true;
        this.areas_covered = this.key_areas.filter(
          x => area_covered(x, this.choices));
        this.areas_not_covered = this.key_areas.filter(
          x => !area_covered(x, this.choices));
        this.questions_feedback = this.feedback.filter(
          x => area_feedback(x, this.choices));
    };
}
