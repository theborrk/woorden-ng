# Temporal and study-day spike (T-003)

Verified on 3 October 2026. Implements A10 and the **one-study-day** example from blueprint
sections 12.1–12.3; scheduler integration, wider intervals, exposure gates, review windows,
persisted history and clock-anomaly handling belong to W11.

## Choice and runtime support

Use the native `globalThis.Temporal` namespace when present, otherwise
**`@js-temporal/polyfill` at exactly `0.5.1`**, recorded in `package.json` and the lockfile.
The adapter never installs or replaces a global. This is the maintained js-temporal project,
listed by the Temporal champions as an external polyfill; its repository was not archived and
had activity on 22 September 2026 when checked. Its published README still describes its
release as alpha, so this spike proves the APIs used here rather than claiming whole-spec or
whole-product certification. Do not use the proposal repository's test-only polyfill.

The dependency is called for by A10 and T-003. It is ISC licensed; its transitive JSBI dependency
is Apache-2.0 licensed and locked to the resolved version. No Capacitor plugin or Android
permission is needed.

| Runtime | Native support / fallback requirement |
| --- | --- |
| Chromium / Chrome | Temporal shipped in 144; current versions use native Temporal. Older supported browsers need the fallback. |
| Android WebView | MDN compatibility data mirrors Chrome (144 onward). WebView versions below 144 need the fallback; Android OS/API level alone does not establish Temporal support. |
| Local unit runner | Node 24.21.0 has no native Temporal, so the fixtures exercise the pinned fallback. |
| Local browser checks | System Chromium 151.0.7922.173 and Google Chrome 154.0.8037.97 have native Temporal. The browser tests run the same literal fixtures with native Temporal, then with the global removed to force the fallback. |

The environment denied the Playwright 1.63.0 Chromium 153 download at `cdn.playwright.dev`.
System Chromium 151 passed the new time fixtures but failed the existing offline smoke test.
Google Chrome stable 154.0.8037.97 was downloaded from the allowed official distribution host
`dl.google.com` and extracted outside the repository. The full suite passes using the existing
fallback mechanism:

```bash
PW_CHROMIUM_PATH=/tmp/t-003-chrome-stable/opt/google/chrome/chrome npm run test:e2e:web
```

CI still uses the browser matching Playwright. No test or Playwright configuration was weakened
to accommodate the environment. No Android SDK/emulator/device was run here;
actual WebView verification remains a device gate, not a claim based on browser emulation.

Sources checked: [Temporal implementation status](https://github.com/tc39/proposal-temporal#status),
[MDN compatibility data](https://github.com/mdn/browser-compat-data/blob/main/javascript/builtins/Temporal.json),
[polyfill repository](https://github.com/js-temporal/temporal-polyfill), and its installed README.

## Bundle cost

With the locked Vite 8.3.2 toolchain, a standalone minified IIFE exporting the three policy
functions from `src/infrastructure/time/study-day.ts` is **160,582 bytes** (156.8 KiB), or
**45,790 bytes gzip** (44.7 KiB). This includes the policy, polyfill and JSBI, excludes source
maps, and is a spike measurement rather than an app load-time estimate. Reproduce from the repo root:

```bash
node --input-type=module <<'JS'
import { build } from 'vite';
import { gzipSync } from 'node:zlib';
const result = await build({
  configFile: false, logLevel: 'silent',
  build: {
    write: false, minify: true,
    lib: {
      entry: 'src/infrastructure/time/study-day.ts',
      name: 'StudyDaySpike', formats: ['iife'],
    },
  },
});
const chunk = result[0].output.find(item => item.type === 'chunk');
console.log({ minifiedBytes: Buffer.byteLength(chunk.code), gzipBytes: gzipSync(chunk.code).length });
JS
```

The fallback is statically imported, so once the adapter is wired into the application its bundle
cost also applies to native-capable runtimes. T-003 does not wire a spike into the study UI;
the current app bundle does not import it. W11 can evaluate lazy fallback loading during bootstrap,
while preserving synchronous, pure calendar functions and offline availability on both targets.

## Injected inputs and results

All functions accept values, read neither the live clock nor the device timezone, and perform
no storage or network operations:

- `studyDate(instant, zone, boundary)` returns an ISO date label.
- `studyDayBoundary(date, zone, boundary)` returns a canonical UTC instant.
- `oneStudyDayEligibility(instant, zone, boundary, minimumGapHours = 6)` returns the target
  `dueStudyDate`, canonical UTC `eligibleAt`, and `projectedInTimeZone`.

`instant` is a Temporal-compatible ISO instant string with an explicit UTC offset; `zone` is the
profile's IANA timezone, and `boundary` is an ISO local time such as `06:00`. Invalid inputs throw
rather than falling back to a system setting. The gap accepts nonnegative whole hours for this
spike. A caller captures the actual grading instant once and passes the profile zone and boundary;
clock access and preference storage stay at the application edge. Temporal objects and vendor
types do not escape into the returned policy values.

Eligibility advances the attempt's study date with `PlainDate.add({ days: 1 })`, resolves that
date's zoned boundary, then takes the later of this instant and
`Instant.add({ hours: minimumGapHours })`. Calendar days and elapsed hours are deliberately
different operations. The raw engine due instant remains the caller's unchanged scheduler data;
this spike has no scheduler input and does not overwrite it.

For Amsterdam at `06:00`:

| Attempt (local) | Attempt study date | Target study date | Eligibility (local) |
| --- | --- | --- | --- |
| 2 Oct 2026, 01:00 | 1 Oct | 2 Oct | 2 Oct, 07:00 (six elapsed hours) |
| 1 Oct 2026, 23:50 | 1 Oct | 2 Oct | 2 Oct, 06:00 |
| 2 Oct 2026, 05:59 | 1 Oct | 2 Oct | 2 Oct, 11:59 (six elapsed hours) |
| 2 Oct 2026, 06:00 | 2 Oct | 3 Oct | 3 Oct, 06:00 |

The wording in section 12.3 describing the 01:00 attempt as belonging to the day beginning
that morning is interpreted as its **target review day**. Section 12.2 and AC1 explicitly put
the attempt itself on 1 October; no blueprint or task references are changed.

## DST disambiguation and independent fixtures

Boundary resolution explicitly uses Temporal's **`compatible`** option: advance by the gap
when a local time does not exist; choose the earlier occurrence when it repeats.

- On 29 March 2026 Amsterdam jumps from 01:59:59 CET to 03:00:00 CEST at 01:00 UTC.
  A `02:30` boundary resolves to 03:30 CEST / `01:30Z`, not 03:00.
- On 25 October 2026 the clock repeats 02:00–02:59 at 01:00 UTC. A `02:30` boundary resolves
  to the first occurrence, 02:30 CEST / `00:30Z`, not the later `01:30Z` occurrence.

Study dates compare the instant with the **resolved boundary instant on its local calendar date**.
This matches section 12.2's local-time comparison on ordinary days and at the default `06:00`
boundary. For a boundary inside a gap/overlap it makes the documented resolved instant authoritative:
03:00–03:29 in the spring example is still yesterday; after the first autumn 02:30, even the
repeated 02:00 belongs to today. A literal wall-clock-only comparison would reopen yesterday
after the rollback and split today's daily budget into duplicate segments. This interpretation
keeps each study day a contiguous half-open interval between resolved boundaries.

Literal UTC expectations in `tests/fixtures/study-day.ts` were cross-checked independently with
Python `zoneinfo` using the system IANA tzdata **2026b**, including the transitions immediately
before/after 01:00 UTC. IANA's [Europe rules](https://github.com/eggert/tz/blob/main/europe) specify
the EU change at 01:00 UTC on March/October's last Sunday. At `06:00` the March 28–29 boundary
interval is 23 elapsed hours and October 24–25 is 25. Tests check every minute in each interval,
plus exact boundaries and one nanosecond before them. February 29, 2028 has its own full date
label between February 28 and March 1.

`study-day.test.ts` proves AC1–AC5, including DST tomorrow projections that would fail if a day
were treated as 86,400,000 milliseconds. Source review confirms the policy uses calendar-day
addition/subtraction only; no `Date`, epoch arithmetic, live clock or fixed-day duration occurs.
`e2e/time.spec.ts` bundles the real adapter in memory and applies the shared fixtures in Chromium
with the browser namespace and the forced fallback. It introduces no production test route or UI.

## Open questions for W11

- Adopt the resolved-boundary interpretation explicitly in the full policy, including configurable
  boundaries in DST gaps/overlaps. Define behavior for rarer zones that skip a whole calendar date.
- Define the general interval contract, policy version, fractional gap configuration, raw engine
  due/eligibility persistence, review windows crossing midnight and the remaining exposure gates.
- Preserve historical dates/zones and existing due instants on profile-zone changes; specify
  explicit rescheduling and clock-anomaly handling independently of these pure functions.
- Re-run fixtures on the actual supported Android WebView/device versions and the broader browser
  matrix, and decide whether the measured eager fallback cost warrants lazy loading.
