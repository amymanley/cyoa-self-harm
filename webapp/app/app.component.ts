import {Component} from 'angular2/core';

import { script } from './script';

@Component({
    selector: 'my-app',
    templateUrl: 'app/question.html'
})
export class AppComponent {
    current: string;
    script: {};
    choices;
    constructor() {
        this.choices = [];
        this.script = script;
        this.current = "0";
    }
    choose_option(opt_id) {
        this.choices.push(opt_id);
        this.current = opt_id;
    }
    available_choices() {
        return this.script[this.current].options;
    };
}
