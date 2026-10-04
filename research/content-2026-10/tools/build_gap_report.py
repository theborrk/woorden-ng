import collections,csv,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
audit=json.load(open(ROOT/'content/legacy-audit-evidence.json'));lemmas={e['lemma'] for e in audit}
items=[
('DigiD','digital identity/login service','tożsamość cyfrowa; logowanie do usług','services','https://www.digid.nl/en/about-digid/what-digid','service meaning checked on official page; PL wording is model draft'),
('BSN','citizen service number','numer identyfikacyjny mieszkańca','services','https://www.government.nl/themes/government-and-democracy/personal-data/citizen-service-number-bsn','identity-number meaning checked on official page; PL wording is model draft'),
('zorgverzekering','health insurance','ubezpieczenie zdrowotne','health',None,'editorial addition; retrieve same-sense dictionary evidence'),
('huurtoeslag','housing/rent benefit','dodatek mieszkaniowy','services',None,'editorial addition; vocabulary only, no eligibility/rules claim'),
('zorgtoeslag','healthcare benefit','dodatek do ubezpieczenia zdrowotnego','services',None,'editorial addition; vocabulary only, no eligibility/rules claim'),
('eigen risico','deductible/excess in insurance','udział własny w ubezpieczeniu','health',None,'construction/sense candidate; not a policy amount or rule'),
('statiegeld','refundable container deposit','kaucja za opakowanie','shopping',None,'editorial addition; no fee/regulation claim'),
('inchecken','check in; tap in for public transport','odprawić się; zarejestrować wejście w transporcie','travel','https://en.wiktionary.org/wiki/inchecken','Kaikki en-supplement:63354; split travel-service and transit senses'),
('uitchecken','check out; tap out for public transport','wymeldować się; zarejestrować wyjście w transporcie','travel',None,'editorial addition; needs source and sense split'),
('afvalpas','waste-disposal access card','karta dostępu do pojemników na odpady','home',None,'editorial local-service candidate; availability depends on municipality'),
('verblijfsvergunning','residence permit','zezwolenie na pobyt','services',None,'editorial vocabulary candidate; no advice about who needs one'),
('loonstrook','payslip','pasek wynagrodzenia','work',None,'editorial addition; check variant loonstrookje'),
('arbeidsovereenkomst','employment contract','umowa o pracę','work',None,'editorial vocabulary candidate, no contract interpretation'),
('ziekmelden','report sick','zgłosić chorobę/niezdolność do pracy','work',None,'retrieve spelling and reflexive zich ziekmelden construction before activation'),
('huisartspraktijk','GP practice','praktyka lekarza rodzinnego','health',None,'editorial addition; verify compound morphology'),
('pinnen','pay by debit card','płacić kartą debetową','shopping','https://en.wiktionary.org/wiki/pinnen','pilot S53; sourced sense and forms, independent review pending'),
('spijker','nail as metal fastener','gwóźdź','home',None,'editorial gap; helps distinguish body nail nagel; source verification pending')]
with (ROOT/'content/priority-gaps.csv').open('w',encoding='utf-8-sig',newline='') as f:
 wr=csv.DictWriter(f,fieldnames=['nl','proposed_en','proposed_pl','theme','legacy_headword_present','evidence_url','status']);wr.writeheader()
 for w,en,pl,t,url,note in items:wr.writerow({'nl':w,'proposed_en':en,'proposed_pl':pl,'theme':t,'legacy_headword_present':w in lemmas,'evidence_url':url or '', 'status':note})
rare=sorted([e for e in audit if e['frequency_surface_zipf'] is not None and e['frequency_surface_zipf']<3],key=lambda e:(e['frequency_surface_zipf'],e['legacyId']))
with (ROOT/'content/legacy-rare-surface-forms.csv').open('w',encoding='utf-8-sig',newline='') as f:
 wr=csv.DictWriter(f,fieldnames=['legacyId','lemma','surface_zipf','decision','interpretation']);wr.writeheader()
 for e in rare:wr.writerow({'legacyId':e['legacyId'],'lemma':e['lemma'],'surface_zipf':e['frequency_surface_zipf'],'decision':e['decision'],'interpretation':'SUBTLEX exact surface Zipf below editorial threshold 3; not lemma/sense rarity or a drop rule.'})
no_article=[e for e in audit if e['checks'].get('article_status')=='no_structured_evidence']
text='''# Legacy audit interpretation

`legacy-audit.csv` contains all 1,946 original IDs exactly once. `legacy-audit-evidence.json` retains each entire original row, source observations, proposed POS, frequency lookup, decision and review limitations. The six-column CSV is the requested working artifact; the JSON supports reproducibility and inspection.

| Decision | Count | Meaning |
|---|---:|---|
| keep | 1,268 | Retain intended sense as core candidate; universal enrichment and independent review still required. |
| fix | 554 | Correct/scope meaning, POS, morphology structure, article variants or pack assignment. A proposal can be an ambiguity repair rather than a demonstrably false word. |
| move to opt-in | 122 | 106 specialist-agriculture and 16 register-specific/slang entries. Any additional fixes remain in the same row. |
| drop | 2 | Retire redundant inflected presentation as an independently taught concept; preserve archive ID and alias to the canonical entry. |

Decision precedence: a redundant same-sense form receives drop-as-alias; specialist/optional scope receives move-to-opt-in even if it also needs a correction; otherwise any specific correction/qualification gives fix; remaining screened candidates receive keep. None of these decisions grants curated-release approval. No original Russian text or old ID is erased.

## Factual checks and their scope

988/1,005 noun-labelled entries had lemma-level article support in the pinned observations; 17 did not have a usable structured singular-article observation. No clear incorrect de/het was established by this pass. Some unverified rows are plural presentations or nominalized forms, so absence of a singular article is not evidence of an error. Source alternatives remain sense-dependent. deksel accepts de/het; soort category can use either, while biological species uses de. A union of unsensed records must not make an otherwise incorrect sense/article combination pass.

All 479 non-empty vt/vtp/vd fields across 163 legacy rows matched feature-filtered source surfaces, and ten fields were null. This is **surface support**, not full verb verification: auxiliary conditions, reflexivity, word order, stress, source homograph alignment and incorrect attachment to a noun need separate review. The audit catches noun het eten carrying a verb paradigm. Blank fields are missing content, not automatically erroneous forms. Modal IPP and conditional hebben/zijn require contextual tasks.

The author inspected every compact NL/RU/EN/POS row. Individual split/correction notes are model judgments grounded in the linked observations where available; they have not been independently reviewed. Broad dictionary existence checks cannot validate all translations. This audit is a comprehensive first-pass classification with traceable proposed fixes, not proof that no further Dutch error exists.

## Why the original order underperforms the goal

The first 40 entries are nouns including many abstractions; the next sections include a long block of irregular verbs. Basic pronoun ik is s1506; huisarts is s1499. There are 191 agro and 35 slang labels, but many of those words are ordinary foods or everyday concepts. Only 169 rows contain an NL example, none has a supplied EN/PL example translation, and no entry has Polish. Separate daily usefulness, grammar prerequisites, frequency and difficulty; neither original array order nor an alphabetical tail should define lessons.

## Rarity is a measurement with a unit

113 legacy rows have an **exact-surface** SUBTLEX Zipf below 3 in this snapshot; 33 have no exact surface row in the full workbook lookup. This editorial threshold is a diagnostic, not a research-supported exclusion cutoff. `legacy-rare-surface-forms.csv` lists all 113. Rare subtitle forms include specialist bestuiven, bestuiver, akkerbouw, areaal and dorsen. But low-frequency forms also include everyday fietspad, houdbaarheid, cursist, postbezorger, kroket and frikandel: those are retained/repaired for practical usefulness. A compound's low surface frequency is not proof it is rare in the learner's life.

The 5,000-candidate baseline has 2,120 headword-matched candidate senses and 2,880 without a legacy headword match, across 3,328 distinct candidate headwords. It is not a finalized curriculum or a measured sense-coverage percentage. 873 legacy lemma strings are outside that provisional list; use the row decision and situation evidence, not list absence alone. Missing-candidate definitions are in `core-missing-candidates.csv`; focused Dutch-life additions are in `priority-gaps.csv`.

The pilot additionally exposes two missing meanings at existing headwords: bank as sofa is absent from legacy bank/bench glosses, and alsjeblieft as here you are is absent from the legacy please gloss. A meaning that happens to be related to an existing word still requires its own review and task contract.

## Source gaps for singular articles

'''
text+='| Legacy ID | Original headword | Follow-up |\n|---|---|---|\n'
for e in no_article:text+=f"| {e['legacyId']} | {e['original']['nl']} | Check intended sense/number in an explicit dictionary record; never fill from model memory. |\n"
text+='\nAll proposed source/translation/selection changes remain reversible annotations until reviewed. ADR 0003 excludes old-app learner-progress migration; legacy mappings here concern content provenance only.\n'
(ROOT/'docs/content/legacy-audit-report.md').write_text(text)
print('Wrote priority gaps and audit interpretation')
