import {Component} from 'angular2/core';

import { script } from './script';
import {Http, Response} from 'angular2/http';

import 'rxjs/Rx';

declare var Papa: any;

function parse_csv(text)
{
    var out = {};
    Papa.parse(text, {header: true}).data.forEach(function (line) {
        try {
            out[line['Item']] = {
                doctor_line: line['Doctor Says'],
                patient_line: line['Patient Says'],
                conflicts: line['Exclude Items'],
                options: [
                    line['Option 1 list'].split(/\s+/),
                    line['Option 2 list'].split(/\s+/),
                    line['Option 3 list'].split(/\s+/)
                ]
            };
        } catch (ex) {
            console.log("Couldn't parse line " + line['Item'] + ": "
                        + ex.message);
        }
    });
    return out;
}

@Component({
    selector: 'my-app',
    template: `
        <video></video>
        <dl>
          <dt>Doctor</dt><dd>{{ script[current].doctor_line }}</dd>
          <dt>Patient</dt><dd>{{ script[current].patient_line }}</dd>
        </dl>

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
        </ol>`
})
export class AppComponent {
    current: string;
    script: {};
    choices;
    constructor(private http: Http) {
        this.choices = [];
        this.script = {
            "0": {
                "doctor_line": "Loading...",
                "patient_line": "Loading...",
                "options": []
            }};
        this.current = "0";
        this.http.get('script.csv')
          .map((res:Response) => parse_csv(res.text()))
          .subscribe(
            data => {
                console.log(data);
                this.script = data; },
            err => console.error(err),
            () => console.log('done')
          );
    }
    choose_option(opt_id) {
        this.choices.push(opt_id);
        this.current = opt_id;
    }
    available_choices() {
        var out = [].concat.apply([], this.script[this.current].options);
        return out;
    };
}
