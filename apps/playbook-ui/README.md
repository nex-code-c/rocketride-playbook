# Playbook

Playbook turns a recording of an experienced kitchen employee into a structured, reviewable training playbook with measurements, portion scaling, timers, safety checks, and workstation QR access.

The product targets the owner or operations manager of a restaurant or fast-food location, where training happens from memory and every shift does it differently. Starter templates cover ten cuisines as well as a boba café.

## Why this exists: the confident wrong answer

Ask a general-purpose AI how long to hold cooked tapioca pearls and it will tell you. It will sound certain. It will not tell you which food code it is drawing on, whether that code applies in your county, or that it is guessing. A shift lead reads it, believes it, and now your shop has a rule nobody can trace.

The danger is not that the model is wrong sometimes. It is that **nothing in the interface distinguishes a verified fact from a fluent guess.**

We hit this inside our own product twice while building it, and both are worth repeating because they are the whole argument.

**The run that failed and looked like it worked.** Our pipeline came back with `{"error": {"message": "Invalid API key."}}`. The app did not treat that as a failure — it opened a clean "Review the batch standard" screen with empty fields and a few soft warnings. Anyone glancing at it would have said the feature worked. It produced nothing, confidently, for days before we caught it.

**The verification that never happened.** Our own recipe screen displayed *"Last verified: Aug 29, 2026 — Process owner: Maya Tran."* No one verified anything on August 29. Maya Tran is not a real person. We had written a reassuring label and then believed it ourselves.

Both are fixed. They are in this README because they are exactly what happens to a shop that adopts an AI tool with no review gate — and because a product that claims to fix this problem should be honest about having had it.

## What Playbook does about it

- **Generated content is a draft, never a standard.** Every run lands in an owner review screen. Nothing reaches a worker until a human approves it.
- **Warnings must be acknowledged explicitly.** Missing measurements, absent safety checks, and fields the model was unsure about all block publishing until the owner ticks that they checked them against the source.
- **Low model confidence becomes a visible warning.** The pipeline reports per-field confidence; weak fields are named in the review gate rather than hidden.
- **Failures are shown as failures.** A run that errors, or returns no steps and no measurements, says so and offers a retry. It never renders an empty draft as a success.
- **Nothing claims a verification it does not have.** Starter content is labelled starter content. The app does not invent owners or verification dates.
- **Starter quantities carry an explicit warning** that the owner must confirm them against the location's approved recipe before publishing.

Playbook's value is not that the AI is right. It is that a human signs off before anyone in a kitchen acts on it.

## What actually runs

Two RocketRide pipelines do the work. Neither is simulated.

| Input | Limits | Pipeline |
| --- | --- | --- |
| Process video | MP4, MOV, WEBM · ≤ 250 MB · 1 s to 5 min | `src/process-video.pipe` |
| Photo of written instructions | JPG, PNG, WEBP · ≤ 15 MB | `src/process-instructions.pipe` |

The video pipeline samples up to 24 frames on scene transitions, reads machine-readable text in them, transcribes the audio, extracts a fixed set of structured fields, and passes them to a Groq-hosted model that returns the draft. The instruction pipeline runs the same extraction over a single image.

Both return: title, station, ingredients, ordered steps, timers, safety checks, quality cues, evidence, and per-field confidence.

**The video pipeline reads speech and on-screen text — it does not watch hands.** A silent clip produces nothing, and the app says so rather than inventing steps. Narrate the process out loud when recording.

Measured on staging: median **27 s** end to end, of which 11–15 s is pipeline instantiation.

## Demo flow

1. **The confident wrong answer.** A general assistant is asked a prep question and answers fluently, with no source and no way to check it.
2. **Create playbook** — the owner uploads a real process video, or a photo of a handwritten recipe card.
3. The RocketRide run reports each stage and returns a structured draft.
4. **The review gate.** Warnings name what the model was unsure about. The owner corrects the values and explicitly confirms them before publishing.
5. The employee scans the workstation QR, scales the batch, runs the timers, and completes the steps on a phone.
6. The owner sees the completion in team activity.

The first scene is the point of the product: same question, one answer you cannot check and one a human signed off on.

## Product surfaces

- Owner dashboard with operating metrics and location-scoped team activity
- Searchable playbook library with stations, owners, and publishing state
- Owner review of every generated field, with an explicit warning gate before publishing
- Worker mode with portion scaling on measured quantities, step completion, and timers
- Workstation QR that opens a published playbook on a second device
- Team roster with completion progress and certification
- Opening and closing checklists that read the same routine as the location's opening/closing playbook — one source of truth per location
- Per-location workspaces, goals, and ten cuisine starter templates
- Run telemetry: latency, success rate, and an estimated per-run spend

English, Spanish, and Chinese step titles are available on the built-in Brown Sugar Milk Tea recipe. Generated playbooks are not yet translated.

## Known limits

- **Single operator.** All state is stored per account, so an owner's playbooks are not visible to a second account. The worker QR is for the owner's own devices.
- **Starter quantities are ours, not yours.** Every built-in recipe is a starting point that must be checked against the location's approved standard. The app labels them as such.
- Portion scaling covers weights and volumes (g, kg, ml, l, oz, lb, cups, tbsp, tsp) and ranges. It leaves temperatures, times, and equipment sizes alone.

## Running it

Open `playbook.rrapp` in the RocketRide App Builder.

```
corepack pnpm --filter local-playbook build         # typecheck and production build
corepack pnpm --filter local-playbook check:setup   # validate both pipelines and cloud storage
```

Copy `env.example` to `.env` and supply the RocketRide development and deployment connections. The provider key the pipelines use is read from the RocketRide account environment at run time, not from the client — a deployed app has no `.env`.
