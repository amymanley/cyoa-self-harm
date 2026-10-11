# Virtual patient: local prototype

Students ask questions and the application selects existing patient clips. It never generates new patient text, audio or video. This standalone prototype lives in `prototype/` alongside the original application; the original application's files are preserved.

## Start on this computer

Double-click **Start.cmd**, keep its window open, then visit **http://127.0.0.1:4317** in your normal browser. Close the server window to stop it. Transformers.js and the matching model have been installed in this prototype on this computer. No XAMPP or separate AI runner is required. The launcher uses an available Node.js installation or this computer's bundled development runtime.

The launcher defaults to **Transformers.js** matching on the server. Try “Can you tell me what has been happening?” from the initial screen. It selects the original clip 1. Patient transcripts work without the videos. Scripted questions remain available if a typed question cannot be matched. To start without AI, use `Start-Local.ps1 -Engine script`.

## Connect the existing videos

The original application expects `0.mp4`, `1.mp4`, `4.mp4`, and other clip-ID filenames in a `cyoaclips` folder. Videos are read from that folder and are not copied or altered. To connect a folder, run this in PowerShell from the prototype folder:

```powershell
.\Start-Local.ps1 -VideoFolder 'C:\path\to\cyoaclips'
```

The player shows the original transcript if a video is missing or cannot be played. Filenames must match the imported clip IDs. Different filenames need an explicit mapping before integration.

## Server-side Transformers.js

The installed package is `@huggingface/transformers` version 3.8.1. The small `Xenova/all-MiniLM-L6-v2` model converts questions into numerical meaning representations and compares them with the original doctor lines. It uses the CPU and selects only currently eligible clip IDs. It does not generate text, audio or video. Students never receive model files or send their questions to Hugging Face. Model download happens on the application server during initial setup; subsequent inference is local.

Model files are cached in `.cache/models`. Set `MODEL_CACHE` to use another directory. Keep that cache with the deployment if external downloads are prohibited. On a fresh computer, install the package with `npm install` (or `pnpm install --ignore-scripts` using the included lockfile) and start with `AI_ENGINE=transformers`. The first startup downloads the model. The prepackaged Windows CPU runtime was tested here; Bristol should verify its own operating system's runtime requirements.

Matching requires similarity of at least 0.55 and a gap of 0.08 over the next eligible candidate. These are provisional prototype settings, not calibrated probabilities. Obvious compound questions and uncertain matches are declined. Educators should evaluate a wider range of student questions, negations, ambiguity and wrong matches before teaching use. A small embedding model can miss context and reject valid paraphrases.

Both the library and this model are Apache 2.0 licensed:
- https://github.com/huggingface/transformers.js/blob/main/LICENSE
- https://huggingface.co/Xenova/all-MiniLM-L6-v2
- Server usage: https://huggingface.co/docs/transformers.js/tutorials/node

## Optional alternative: Ollama

Ollama remains an optional alternative for experimenting with larger matching models. It has not been installed. Install the runner and a suitable model separately if needed.

Start Ollama, find the exact installed model name with `ollama list`, then run:

```powershell
.\Start-Local.ps1 -Engine ollama -VideoFolder 'C:\path\to\cyoaclips' -Model 'your-installed-model-name'
```

AI requests go to `http://127.0.0.1:11434` by default, from the application server. Set `AI_URL` to connect a different university-managed Ollama-compatible service. All browser assets are served locally; no CDN, browser extension or browser-side model is used.

The model matches questions to currently eligible existing clips. It must return a clip ID and a confidence value; invalid IDs or values below the prototype threshold are rejected without advancing the consultation. That confidence value is self-reported, not a calibrated probability. Clinical educators should evaluate paraphrases, ambiguous questions and wrong matches before use with students. Exact scripted questions work even when AI is unavailable.

## Context, question wording and feedback

`data/question-phrases.json` holds alternative student wording linked to an existing clip ID. The opening phrases “what brought you here today” and “how are you today” are included. An optional `contexts` array limits a phrase to particular current clips; these broad opening phrases apply at clip 0. Alternatives and the original doctor lines are compared by the same model. No model retraining is required. Eligibility and exclusions still apply, so a phrase cannot revive a played or conflicting clip. Add clinically reviewed alternatives here and restart the server to load them.

The scripted-question panel shows at most three suggestions using the original `available_choices`/`shift_option` priorities: the first slot tries lists 1, 3, 2; the second tries 2, 1, 3; the third tries 3, 1, 2. Each slot consumes the first unasked, nonexcluded usable ID. Duplicate suggestions and missing clip IDs are skipped. End-of-consultation choices are displayed separately, as in the original application. Typed matching can still select another eligible question farther down the current lists; three suggestions are guidance, not the entire set of valid typed questions.

The original `choose_option` called `excludes.concat(...)` without saving its result. This prototype implements the intended exclusions by retaining the selected clip's excluded IDs. Original coverage and feedback evaluate every complete combination (all IDs within a combination, any matching combination between columns). Review includes covered and uncovered areas, original feedback, elapsed consultation time, and the original exercise's reflection tasks. Elapsed time includes thinking time; it is not a video-only timer. Spreadsheet notes about automatic time/closed-question interruptions were not implemented in the original TypeScript code and are not implemented here. Existing forced-feedback rows are preserved, but their detailed interruption behaviour needs a separate content review.

Reviewed original implementation: https://github.com/amymanley/cyoa-self-harm/blob/346bc99198fe43283adaf756bfe124b627fd2ca4/app/app.component.ts

## What is included

- 208 original scripted rows representing 207 unique clip IDs, imported from `amymanley/cyoa-self-harm`, master commit `346bc99198fe43283adaf756bfe124b627fd2ca4`. Duplicate clip 68 is treated as one clip.
- Original topic-coverage and feedback rules, applied to selected clip IDs.
- A video player, typed-question input, scripted-question preview, conversation history and consultation review.
- A Node.js server using built-in modules for HTTP and video delivery, plus Transformers.js for question matching.
- Video streaming with byte-range support, so the player can seek through clips.
- Sessions held in server memory, expiring after two hours of inactivity. Student questions and session records are not written to disk; restarting the server clears sessions. Software and model files are stored on disk.

Original source: https://github.com/amymanley/cyoa-self-harm

The supplied workbook `cyoa sh video numbers and related transcript.xlsx` was inspected without modification. `Sheet1` uses column A (`Item`) for the video ID, F (`Dr`) for the doctor line, and G (`Patient`) for the patient reply. Doctor lines and unique usable IDs agree with the imported script after ignoring punctuation/encoding differences. The repeated clip 68 rows are identical. F1 has no doctor or patient text and is not selectable. Several ending/interruption rows have blank patient text. Preserve both transcript columns: match against the doctor line and use the patient line for playback captions and verification. Videos can be played from a locally available folder, including a synced OneDrive folder. No personal sharing link is embedded in the app.

The imported script contains seven references to IDs without corresponding usable rows: `55`, `21`, `2`, `45`, `25B`, `N`, `189A`. Those unavailable options are omitted. The prototype preserves the scripted branches rather than allowing arbitrary out-of-sequence clips. Excluded clips and already played clips are filtered out. Review source content and branching with the scenario owner before teaching use. Feedback is an indication of scripted coverage, not a validated grade or assessment of clinical competence.

## Bristol hosting handover

The Windows launcher reads an optional `local-settings.json` beside the app and uses its `videoFolder` when no `-VideoFolder` argument is supplied. The settings file is ignored by Git; `local-settings.example.json` shows the format. Keep OneDrive videos available locally for reliable playback. Opening clip 0 and selecting clip 1 have both been verified in the consultation player. The development video folder contains 82 MP4 files with filename matches for 79 of the 207 unique scripted clip IDs; unmatched clips still show their transcripts. Filename matching is not a full review of every recording.

The same source can run on Windows or Linux with **Node.js 22 or later**, Transformers.js, the cached model and the original MP4 folder. No separate AI server is needed for this version. Hardware needs depend on speed requirements and simultaneous student sessions; concurrency and teaching-scale capacity have not been established.

Configuration:

| Variable | Default | Purpose |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | Interface for the application server |
| `PORT` | `4317` | Application port |
| `VIDEO_DIR` | unset | Absolute path to the existing MP4 folder |
| `AI_ENGINE` | `script` when running Node directly; `transformers` in the Windows launcher | Choose `transformers`, `script` or optional `ollama` |
| `MODEL_CACHE` | `.cache/models` | Server-only model cache |
| `AI_URL` | `http://127.0.0.1:11434` | Server-side model service |
| `AI_MODEL` | unset | Exact Ollama model name; unnecessary for Transformers.js |

Run `node server.mjs` with those settings. Keep the application and AI service behind university-managed access controls and HTTPS. A reverse proxy should preserve the public Host header so browser-origin checks work. Students connect only to the application URL; the AI service need not be publicly accessible. Bristol must establish service supervision, access, capacity and maintenance arrangements. This local prototype does not include university sign-in, multi-server session sharing or production availability guarantees.

## Verification

Run `node --test tests/*.test.mjs` (or `npm test` when npm is installed). All fifteen tests passed here, including a real Transformers.js test for the opening paraphrases and unsupported questions, three-list priorities and fallbacks, repeat/equivalent exclusions, compound coverage and all original feedback combinations, scripted selection, session isolation, simulated Ollama output validation, video-range delivery and request validation. Context tests cover 22 topic-dependent follow-ups, unrelated contexts, a missing source branch, opposite-meaning sample questions, and attempts to submit an unavailable scripted ID. This limited sample does not establish teaching readiness or performance at scale.

## Context-dependent questions

`data/context-rules.json` and `context.mjs` apply deterministic context checks before exact-text or AI matching. Short continuation prompts, quantities, strengths, dates, ages, effects and pronoun-based follow-ups require a mapped immediately preceding reply. Their destination must also survive the original branch lists and played/equivalent exclusions. A missing or unclear reference asks the student to name the topic without changing the current clip. A scripted button submits its explicit clip ID, which the server validates against the current offered options and question text.

For example, “hmm” after clip 7 or 211 may continue the café-job account with clip 8; it cannot play clip 8 after another topic. “How much?” after paracetamol follows clip 102; after fluoxetine confirmation it follows clip 107. The identical impact question distinguishes the breakup from job loss. Clip 192 requires the preceding childhood/divorce discussion at 191, preventing the original money-to-childhood branch. Targeted opposite-meaning guards protect selected yes/no answers from reversed questions; they are examples, not a general negation-understanding guarantee.

These rules cover the audited examples and common short prompt forms. Other paraphrases and context transitions still need scenario-owner review. The detailed phrasing workbook remains a draft review library: its proposals are not automatically activated or used to retrain the model. Any future import must carry approved wording, context, topic/time-period constraints and exclusions together. The existing videos and source transcript workbook have not been changed.

## Interface

The video and question panels sit side by side in landscape and stack in portrait. The patient transcript and scripted suggestions start collapsed; coverage feedback appears only in Review consultation. Get Wellbeing Support opens the university's support page in a new tab and stays accessible while scrolling and during review.

## What is saved in GitHub

This folder includes application source, scenario data imported from the original public script, dependency lockfile, tests and setup instructions. It excludes MP4 recordings, installed dependencies, downloaded models, local folder settings, development screenshots and the draft question-phrasing workbook. A fresh checkout needs dependencies and model setup plus a separately supplied video folder. Saving the source does not deploy the website or make the local server publicly accessible.
