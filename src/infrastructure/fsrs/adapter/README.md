# Versioned FSRS adapter

`createFsrsAdapter(parameterSet)` accepts the existing validated runtime parameter-set record,
requires fuzz off and rejects silently changed resolved parameters under the same identity.
`metadata()` returns detached package/engine, resolved weights, parameter identity and interval policy.
All vendor imports remain here; application callers see JSON scheduler snapshots and string ratings.

- `createTask(instantMs)` creates a validated New snapshot with injected time.
- `preview(snapshot, instantMs)` produces all four detached native proposals and effective intervals.
- `applyRating(snapshot, instantMs, rating)` recomputes a single transition from current state/time;
  it cannot accept a preview object. The caller captures the actual grading instant once.
- `serialize(snapshot)` and `deserialize(json)` use the existing version-1 scheduler envelope and
  T-123 validator. Vendor Date restoration stays internal, after validation. Dates serialize as
  canonical ISO UTC strings; optional New-card `last_review` remains absent.

Native `after.nativeCard`, `after.rawDueAt`, `after.scheduledDays` and `nativeLog` preserve ts-fsrs
5.4.2 output exactly. The `fsrs-interval-cap-v1` policy caps `effectiveScheduledDays` at the smaller
of 365 and the parameter-set maximum; `effectiveRawDueAt` removes only excess elapsed days. A native
367-day proposal is still serialized as 367 days. Eligibility projection must use the separate
effective interval and include the cap version in its policy identity. This adapter does not
implement calendar eligibility, repository writes, clock capture, replay or optimization.

Inspect the committed learning/relearning sequence directly on Node 24:

```sh
node tools/learning/inspect-fsrs.ts tests/fixtures/learning/fsrs/sequence.json
```

Input has `parameterSet`, injected `createdAt`, optional `initial` scheduler envelope and `steps`
with epoch-millisecond `at` and string `rating`. The inspector emits one JSON report per file with
resolved metadata, initial state, all four previews and the freshly calculated selected result at
every step. Unsupported/malformed input exits nonzero and never writes the source files. Spike
fixtures are unchanged; their readable enum names are only a fixture convention, not persistence.
