# Original application inventory

Read-only inventory of `legacy/index.html` at baseline commit
`e66ad1551a91ee31fe354a33a03cbfff4a66030d`. References below point into that frozen file.
This documents behavior for later tasks; ADR 0003 excludes migration of progress, settings,
custom words and v1 backups. No old storage or backup is read by the new app or extractor.

## Features

| Feature              | Original behavior                                                                                                                                                                                               | Source                                                                                                                                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Study                | Due reviews and daily new cards, plus extra practice; reveal then self-rate Again/Hard/Good. Box intervals, daily introduction count, streak and learned/seen statistics.                                       | [scheduling and queues](../../legacy/index.html#L2580-L2669), [cards and statistics](../../legacy/index.html#L2708-L2868)                                                                        |
| Browse               | Search Dutch/Russian/English; filter by part of speech, conjugation metadata or theme; show article and learned/seen status.                                                                                    | [filters and list](../../legacy/index.html#L2870-L2906)                                                                                                                                          |
| de/het drill         | Random article-bearing noun, choose de or het, show correctness and a session score.                                                                                                                            | [article drill](../../legacy/index.html#L3113-L3162)                                                                                                                                             |
| Conjugation drill    | Random verb with past-tense metadata; reveal singular/plural past and participle/auxiliary, then self-mark known or unknown. Score is local to the drill.                                                       | [verb drill](../../legacy/index.html#L3163-L3214)                                                                                                                                                |
| TTS                  | Browser speech synthesis for Dutch, preferring nl-NL and local voices; rate 0.9 and a speaking indicator. Actual offline availability depends on the device voice.                                              | [TTS selection and playback](../../legacy/index.html#L2672-L2706)                                                                                                                                |
| Themes               | `sep` (separable verbs), `agro` (farming), `slang`; slang is excluded by default. The conjugation filter does not prove irregularity.                                                                           | [default exclusion](../../legacy/index.html#L2570-L2578), [theme filters](../../legacy/index.html#L2871-L2884)                                                                                   |
| Settings             | Daily new words (default 10, slider 3–40), reverse translation-to-Dutch direction (default false), RU/EN interface and translation preference (default EN), slang (default false).                              | [controls](../../legacy/index.html#L469-L494), [defaults](../../legacy/index.html#L2576-L2577), [handlers](../../legacy/index.html#L2938-L2967), [language](../../legacy/index.html#L3217-L3234) |
| Export/import        | JSON v1 backup download and file upload; restores progress, settings, daily/streak metadata and custom words. No seed revision in the format. Documented only; no backup fixture or importer is provided in NG. | [backup functions](../../legacy/index.html#L2971-L2998)                                                                                                                                          |
| Generated husky icon | Canvas draws a husky and produces a PNG data URL for the logo, favicon, Apple touch icon and generated manifest.                                                                                                | [icon generation](../../legacy/index.html#L3052-L3111)                                                                                                                                           |
| Custom words         | Form accepts Dutch, Russian, English, article, part of speech and example; timestamp-based custom ID.                                                                                                           | [custom-word handler](../../legacy/index.html#L2908-L2935)                                                                                                                                       |
| Keyboard and reset   | Space/Enter reveals; 1/2/3 rates. Confirmed reset clears progress, metadata and custom words.                                                                                                                   | [keyboard](../../legacy/index.html#L3035-L3050), [reset](../../legacy/index.html#L2962-L2967)                                                                                                    |

## Storage keys

The original app wraps JSON `localStorage` with an in-memory fallback
([storage wrapper](../../legacy/index.html#L529-L535)). These keys are inventory only.

| Key                | Original contents                                                                                         | Source                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `woorden.progress` | Positional/custom ID to `{box, due, reps, lapses}`; no complete review log or separate direction history. | [load and save](../../legacy/index.html#L2579-L2588), [rating updates](../../legacy/index.html#L2609-L2644) |
| `woorden.settings` | `{dailyNew, reverse, lang, slang}`.                                                                       | [defaults](../../legacy/index.html#L2576-L2577), [save](../../legacy/index.html#L2586-L2588)                |
| `woorden.meta`     | `{introDate, introCount, streak, lastStudy}`.                                                             | [defaults and save](../../legacy/index.html#L2580-L2588)                                                    |
| `woorden.custom`   | User-authored word array, concatenated with the filtered seed.                                            | [deck assembly](../../legacy/index.html#L2570-L2575), [custom save](../../legacy/index.html#L2924-L2928)    |

## Verified seed fixture

`content/legacy/seed-v1.json` preserves all 1,946 entries with positional provenance IDs
`s0`–`s1945`. It retains the original Russian, English, Dutch, articles, examples, conjugation
values (including nested nulls), and themes. Missing trailing conjugation/theme fields become
`null`. This is structural preservation, not a claim of linguistic review.

Regenerate with `node tools/content/extract-legacy-seed.mjs`; check with
`npm run content:validate` (also part of `npm run verify`). The extractor evaluates only the seed
declaration in a fresh VM with no supplied globals, disabled dynamic code generation and a timeout.
It uses no runtime dependency and does not execute the rest of the HTML. Validation compares the
SHA-256 of the entire source and the exact serialized fixture, including baseline provenance.

Baseline counts are tested in `tools/content/extract-legacy-seed.test.mjs`: 35 slang entries,
1,911 outside slang, 169 examples, 1,005 articles (993 outside slang: 712 de / 281 het),
163 conjugation records and 191 farming entries. Conjugation count is not an irregular-verb count.
