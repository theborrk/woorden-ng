# Sense-entry validation

T-110 adopts the 0.2 exchange contract in
[`schemas/sense-entry.schema.json`](schemas/sense-entry.schema.json). Validate a **single entry**
(not the enclosing research pack):

```sh
npm run content:validate-entry -- entry.json evidence.json
```

The command prints JSON with structural/source errors and task-family blockers for EN and PL,
returns 0 for a valid draft or 1 for an invalid import, and never writes content or review state.
The existing `content:validate` command still checks the immutable legacy seed. `verify` runs the
new validator's unit tests too. No network, Python or provider service is involved.

`content/id-registry.json` preserves every research allocation and adds sense-to-lexeme bindings.
Labels are allocation metadata: spelling edits retain the issued UUID. New allocations must be
committed deliberately; import input cannot replace the registry. The semantic hash excludes
`review` and `content_sha256`, sorts object keys and uses compact UTF-8 JSON. NT2Lex exposure
counts retain the prototype's float serialization, including `.0`, to preserve the starter hashes.

The separately supplied evidence bundle has this shape:

```json
{
  "records": { "dictionary-record-id": { "forms": [{ "form": "neem mee" }] } },
  "claims": [
    {
      "pointer": "/forms/0/surface",
      "source_id": "dictionary-record-id",
      "selector": "/forms/0/form"
    }
  ]
}
```

A claim must select the exact asserted value from a record whose canonical SHA-256 matches the
entry's source manifest. Inline form/IPA selectors must agree with that selection. URLs alone
provide no support. Source importers supply acquired observations; this validator checks support,
not the trustworthiness of the dictionary or the operator supplying its pinned record. Authored
interpretations cannot be promoted by citing a source gloss. For transformed/group facts, supply
an exact scoped observation or retain draft status until the relevant source importer exists.
JSON-pointer prefixes inherit provenance, more specific prefixes override parents, and direct
form/IPA references override their group. Dangling pointers and source IDs fail validation.

Missing meanings/translations are explicit `null` or empty meaning arrays; missing examples are
`[]`. EN/PL keys remain required. These values do not count as coverage. The report distinguishes
`data_ready` from curated `eligible`: T-110 validates drafts, so independent review is always a
release blocker. Audio/image QA remains a required gate (T-118 and later media work); a URL or an
imported approval flag cannot satisfy it. T-113/T-114 own actual review acceptance and compilation.
Missing optional IPA does not block written tasks. No locale fallback or content is generated.

The research starter pack remains unchanged and unreviewed. Its omitted source archives and
broad research source tags are insufficient evidence for this stricter import boundary; missing
observations produce explicit errors rather than inheriting the prototype's blanket fact status.
