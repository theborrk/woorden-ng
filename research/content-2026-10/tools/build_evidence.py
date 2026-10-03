"""Pin source excerpts for this research delivery. No model calls or silent repairs."""
import collections, csv, gzip, hashlib, json, shutil, xml.etree.ElementTree as ET
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
RESEARCH=ROOT.parent/'woorden-research'
DATA=RESEARCH/'evidence/data'
OUT=ROOT/'evidence'
for p in ['content','docs/content','docs/adr','docs/tasks','review','schemas','evidence/sources','evidence/inputs']:
    (ROOT/p).mkdir(parents=True,exist_ok=True)
def write(path,obj):
    path.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
def lemma(e):
    a=e.get('article');w=e['nl'].strip()
    return w[len(a)+1:] if a and w.startswith(a+' ') else w
seed=json.load(open(RESEARCH/'inputs/seed-v1.json'))['entries']
extra=['pinnen','inschrijven','even','alsjeblieft','half drie','deksel','slim','meisje','kind','dank u wel','dankuwel','tot ziens','geen probleem','op tijd','hoe laat','een afspraak maken','het spijt me','kunt u dat herhalen','zich','drie','half','herhalen','spijten','DigiD','BSN','zorgverzekering','huurtoeslag','zorgtoeslag','eigen risico','statiegeld','inchecken','uitchecken','afvalpas','verblijfsvergunning','loonstrook','arbeidsovereenkomst','ziekmelden','huisartspraktijk']
targets={lemma(e) for e in seed}|set(extra)
idx={w:{'en':[],'nl':[],'pl':[],'odwn':[],'nt2':[],'subtlex':None} for w in targets}
manifest=[]
for src,name in [('en','kaikki-en-nl-postprocessed.jsonl'),('nl','kaikki-nl-raw.jsonl.gz'),('pl','kaikki-pl-raw.jsonl.gz')]:
    chosen=[]
    excerpt_path=RESEARCH/'evidence/inspection'/(name.split('.')[0]+'-selected.jsonl')
    with open(excerpt_path) as f:
        for ln,line in enumerate(f,1):
            d=json.loads(line)
            if d.get('lang_code')!='nl' or d.get('word') not in targets:continue
            rid=f'{src}:{ln}'
            r={'record_id':rid,'excerpt_file':excerpt_path.name,'excerpt_line':ln,'sha256':hashlib.sha256(line.encode()).hexdigest(),'data':d}
            idx[d['word']][src].append(r);chosen.append(r)
    if src=='en':
        # Two bulk files are currently incomplete local copies. Never recompute
        # bulk coverage from these; preserved, previously parsed excerpts are primary.
        # Complete records from the valid English prefix may fill NEW pilot lemmas.
        missing=set(extra)-{r['data']['word'] for r in chosen}
        with open(DATA/name) as f:
            for ln,line in enumerate(f,1):
                try:d=json.loads(line)
                except json.JSONDecodeError:break
                if d.get('lang_code')=='nl' and d.get('word') in missing:
                    r={'record_id':f'en-supplement:{ln}','source_file':name,'source_line':ln,'sha256':hashlib.sha256(line.encode()).hexdigest(),'data':d}
                    idx[d['word']]['en'].append(r);chosen.append(r)
    write(OUT/'sources'/f'kaikki-{src}-excerpts.json',chosen)
    print(src,len(chosen),flush=True)
with gzip.open(DATA/'odwn-1.4-checked.xml.gz','rb') as f:
    for _,e in ET.iterparse(f,events=('end',)):
        if e.tag=='LexicalEntry':
            le=e.find('Lemma');mw=e.find('MultiwordExpression')
            w=le.get('writtenForm') if le is not None else (mw.get('writtenForm') if mw is not None else None)
            if w in targets:
                xml=ET.tostring(e,encoding='unicode')
                r={'record_id':e.get('id'),'sha256':hashlib.sha256(xml.encode()).hexdigest(),'xml':xml}
                idx[w]['odwn'].append(r)
            e.clear()
        elif e.tag=='Synset':e.clear()
for r in csv.DictReader(open(DATA/'nt2lex-basic.tsv'),delimiter='\t'):
    if r['word'] in idx:idx[r['word']]['nt2'].append(r)
for r in json.load(open(RESEARCH/'evidence/inspection/subtlex-full.xlsx-selected.json')):
    if r['Word'] in idx:idx[r['Word']]['subtlex']=r
ot=set((DATA/'opentaal-wordlist.txt').read_text().splitlines())
for w,x in idx.items():x['opentaal_exact']=w in ot
write(OUT/'lexical-index.json',idx)
for p in (RESEARCH/'evidence').glob('*.manifest.json'):
    shutil.copy2(p,OUT/'sources'/p.name)
for n in ['seed-v1.json','blueprint.md']:shutil.copy2(RESEARCH/'inputs'/n,OUT/'inputs'/n)
for n in ['nt2lex-basic.tsv','nt2lex-senses.tsv']:shutil.copy2(DATA/n,OUT/'sources'/n)
shutil.copy2(RESEARCH/'docs/content/source-inspection.json',OUT/'source-inspection.json')
print('Index ready',len(idx),flush=True)
