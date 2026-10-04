# OpenTaal excerpt

`wordlist.txt` contains five unchanged rows, with their original newlines, cut from the
research-pinned OpenTaal 2.20.23 list (bulk SHA-256
`12e5fb5e3c73840b583b30016926d1f63a75e9bf1652a3a6634b2ba7c49ad7be`).
`records.json` records each row's original bulk line, excerpt line, spelling and raw line hash.
The excerpt manifest hashes only these five rows; its lineage identifies the full snapshot.
Importer observations use lines within the named excerpt, not the original bulk locators.

`version.txt` is the complete 28-byte pinned marker, unchanged. Its manifest and the full
pins in `tools/content/sources/` preserve the URL, retrieval timestamp, size and hash from
`research/content-2026-10/evidence/sources/opentaal-*.txt.manifest.json`.

`entries.json` contains test inputs, not source observations or reviewed content. It deliberately
includes absent phrases, a declared productive compound and case differences. DigiD and BSN
are excluded from the excerpt to exercise absence; they are present in the full pinned list.
All tests use local fixtures only. Full downloads and reports belong in `.cache/content-sources/`.

Source and attribution: [Dutch word list](https://github.com/OpenTaal/opentaal-wordlist),
© 2020 OpenTaal (Simon Brouwer, Sander van Geloven), © 2006–2011 OpenTaal (Ruud Baars,
Simon Brouwer), © 2001–2005 Simon Brouwer and others, © 1996 Nederlandstalige TeX
Gebruikersgroep. These unchanged excerpts are used under
[CC BY 3.0](https://creativecommons.org/licenses/by/3.0/); the upstream
[license](https://github.com/OpenTaal/opentaal-wordlist/blob/master/LICENSE.txt) also offers
BSD-3-Clause. The list version and date are preserved in `version.txt`.
List membership does not confer language review or publication approval.
