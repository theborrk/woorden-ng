# Apertium Dutch excerpt

`excerpt.xml` copies source lines 10762, 16901, 21963 and 29794–29796 from the
pinned `apertium-nld.nld.dix` (SHA-256
`2d14839e0e32f0b057460fa20689060d370eb178b16a51495c00f2b4403250c4`).
Only the XML declaration/dictionary/section wrappers were added. The commented `s` entry is
retained verbatim alongside active auto, landbouw and three opstaan observations.
`records.json` retains original line locators and hashes of exact `<e>…</e>` bytes (without
surrounding whitespace/comment markers or newline), including the ignored commented entry.

Source: [Apertium Dutch](https://github.com/apertium/apertium-nld), dictionary URL and
research retrieval timestamp in `manifest.json`; bulk pin in
`tools/content/sources/apertium-nld.json`. Copyright belongs to the Apertium Dutch contributors.
The source project's GNU GPL v2 license is retained in `COPYING.txt`. This fixture is for
source-parser tests only and is not bundled into the application.

The masculine primary comparison in the unit test is explicitly synthetic, exercising the
boundary against the real pinned landbouw observation. It is not represented as a retrieved
ODWN/Kaikki record or language review.
