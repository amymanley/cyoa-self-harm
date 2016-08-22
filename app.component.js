System.register(['angular2/core', 'angular2/http', 'rxjs/Rx'], function(exports_1, context_1) {
    "use strict";
    var __moduleName = context_1 && context_1.id;
    var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata = (this && this.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    var core_1, http_1;
    var AppComponent;
    function parse_csv(text) {
        return spreadsheet_to_questions(Papa.parse(text, { header: true }).data);
    }
    function spreadsheet_to_questions(list) {
        var out = {};
        list.forEach(function (row) {
            try {
                out[row['Item']] = {
                    clip: row['Item'],
                    doctor_line: row['Dr'],
                    patient_line: row['Patient'],
                    conflicts: row['Exclude Items'].split(/\s+/),
                    options: [
                        row['Option 1 list'].split(/\s+/).filter(function (x) { return x; }),
                        row['Option 2 list'].split(/\s+/).filter(function (x) { return x; }),
                        row['Option 3 list'].split(/\s+/).filter(function (x) { return x; })
                    ],
                    exit: (row['Force feedback'] == "End"),
                    end: (!!row['Force feedback'])
                };
            }
            catch (ex) {
                console.log("Couldn't parse row " + row['Item'] + ": "
                    + ex.message);
            }
        });
        return out;
    }
    function spreadsheet_to_areas(sheet) {
        console.log(sheet);
        var out = [];
        sheet.forEach(function (row) {
            try {
                var name = row[0];
                var in_list = [];
                for (var i = 1; row[i]; i++) {
                    in_list.push(row[i].split(/\s+/).filter(function (x) { return x; }));
                }
                out.push({ name: name, in_list: in_list });
            }
            catch (ex) {
                console.log("Couldn't parse row " + row['Item'] + ": "
                    + ex.message);
            }
        });
        return out;
    }
    function shift_option(opts, order) {
        for (var i = 0; i < order.length; i++) {
            if (opts[i].length > 0) {
                return [opts[i].shift()];
            }
        }
        return [];
    }
    function area_covered(area, choices) {
        for (var i = 0; i < area.in_list.length; i++) {
            var unmatched = area.in_list[i].filter(function (x) { return choices.indexOf(x) < 0; });
            if (unmatched.length == 0) {
                return true;
            }
        }
        return false;
    }
    return {
        setters:[
            function (core_1_1) {
                core_1 = core_1_1;
            },
            function (http_1_1) {
                http_1 = http_1_1;
            },
            function (_1) {}],
        execute: function() {
            AppComponent = (function () {
                function AppComponent(http) {
                    var _this = this;
                    this.http = http;
                    this.use_gdocs = true;
                    this.choices = [];
                    this.excludes = [];
                    this.key_areas = [];
                    this.script = {
                        "0": {
                            "doctor_line": "Loading...",
                            "patient_line": "Loading...",
                            "options": [[], [], []]
                        } };
                    this.current = "0";
                    if (this.use_gdocs) {
                        var comp = this;
                        Tabletop.init({
                            key: '1IvHzhdow5H2pAHgFk59NbZ0KKxKijxquTQvfUAxgno0',
                            callback: function (data, tabletop) {
                                console.log(data);
                                comp.script = spreadsheet_to_questions(data.Sheet1.elements);
                                comp.key_areas = spreadsheet_to_areas(data.KeyAreas.toArray());
                                console.log(comp.script);
                                console.log(comp.key_areas);
                            } });
                    }
                    else {
                        this.http.get('script.csv')
                            .map(function (res) { return parse_csv(res.text()); })
                            .subscribe(function (data) {
                            _this.script = data;
                            console.log(_this.script);
                        }, function (err) { return console.error(err); }, function () { return console.log('done'); });
                    }
                }
                AppComponent.prototype.choose_option = function (opt_id) {
                    this.choices.push(opt_id);
                    this.excludes.push(opt_id);
                    this.excludes.concat(this.script[this.current].conflicts);
                    this.current = opt_id;
                };
                AppComponent.prototype.available_choices = function () {
                    var _this = this;
                    var out = [];
                    var opts = [[], [], []];
                    // Exclude the options that we've seen:
                    for (var i = 0; i < 3; i++) {
                        opts[i] = this.script[this.current].options[i].filter(function (x) { return _this.excludes.indexOf(x) < 0; });
                    }
                    out = out.concat(shift_option(opts, [0, 2, 1]));
                    out = out.concat(shift_option(opts, [1, 0, 2]));
                    out = out.concat(shift_option(opts, [2, 0, 1]));
                    return out;
                };
                ;
                AppComponent.prototype.exit_questions = function () {
                    var _this = this;
                    return Object.keys(this.script).filter(function (x) { return _this.script[x].exit; });
                };
                AppComponent.prototype.receive_feedback = function () {
                    var _this = this;
                    this.feedback = true;
                    this.areas_covered = this.key_areas.filter(function (x) { return area_covered(x, _this.choices); });
                    this.areas_not_covered = this.key_areas.filter(function (x) { return !area_covered(x, _this.choices); });
                };
                AppComponent = __decorate([
                    core_1.Component({
                        selector: 'my-app',
                        template: "\n        <dl>\n          <dt>Node Number</dt>\n          <dd>{{ script[current].clip }}</dd>\n        </dl>\n        <video width=\"320\" height=\"240\" autoplay>\n                <source src=\"/assets/cyoaclips/{{ script[current].clip }}.mp4\" type=\"video/mp4\">\n                Your browser does not support this video</video>\n        <dl>\n          <dt>Doctor</dt><dd>{{ script[current].doctor_line }}</dd>\n          <dt>Patient</dt><dd>{{ script[current].patient_line }}</dd>\n        </dl>\n\n        <div *ngIf='current && !script[current].end'>\n          <p>Choose:</p>\n          <ol>\n            <li *ngFor='#opt of available_choices()'>\n              <a *ngIf=\"script[opt]\" (click)=\"choose_option(opt)\">\n                {{ script[opt].doctor_line }}\n              </a>\n              <div *ngIf=\"!script[opt]\">\n                  ERROR: Video {{opt}} is unknown\n              </div>\n            </li>\n          </ol>\n          Or end the consultation:\n          <ol>\n              <li *ngFor='#opt of exit_questions()'>\n                  <a *ngIf=\"script[opt]\" (click)=\"choose_option(opt)\">\n                      {{ script[opt].doctor_line }}\n                  </a>\n              </li>\n          </ol>\n        </div>\n        <div *ngIf='current && script[current].end'>\n          This consulation is now over <a (click)=\"receive_feedback()\">Receive\n          Feedback</a>\n        </div>\n        <div *ngIf='feedback'>\n          <p>Here's how you did</p>\n          <p>You covered these areas well:</p>\n          <ul>\n            <li *ngFor=\"#area of areas_covered\">\n              {{ area.name }}\n            </li>\n          </ul>\n          <p>You could have explored these areas further:</p>\n          <ul>\n            <li *ngFor=\"#area of areas_not_covered\">\n              {{ area.name }}\n            </li>\n          </ul>\n        </div>\n\n        "
                    }), 
                    __metadata('design:paramtypes', [http_1.Http])
                ], AppComponent);
                return AppComponent;
            }());
            exports_1("AppComponent", AppComponent);
        }
    }
});
//# sourceMappingURL=app.component.js.map