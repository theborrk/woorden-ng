import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { StringDecoder } from 'node:string_decoder';
import { createGunzip } from 'node:zlib';
import { SaxesParser } from 'saxes';

const sourceManifestUrl = new URL('./odwn-1.4.source.json', import.meta.url);
const pinnedSha256 = '8e3b5bc0d151ce1672575b9201fec1105d3573759572910ffbc0581a8d8acb70';

function escapePointer(value) {
  return value.replaceAll('~', '~0').replaceAll('/', '~1');
}

function lineageFor(value) {
  const provenance = value ?? '';
  const lower = provenance.toLowerCase();
  if (lower.includes('wiktionary')) return 'wiktionary';
  if (lower.includes('google') || lower.includes('automatic')) return 'automatic';
  if (lower.includes('cdb') || lower.includes('cornetto') || lower.includes('rbn'))
    return 'rbn-cornetto';
  return provenance === '' ? 'unspecified' : 'other';
}

function makeNode(name, attributes) {
  return { name, attributes, children: [], text: '' };
}

function children(node, name) {
  return node.children.filter((child) => child.name === name);
}

function first(node, name) {
  return children(node, name)[0];
}

function recordHash(entry) {
  return createHash('sha256').update(JSON.stringify(entry)).digest('hex');
}

function observationFrom(entry) {
  const entryId = entry.attributes.id;
  if (!entryId) throw new Error('ODWN LexicalEntry has no id');
  const entryPointer = `/LexicalEntry[@id="${escapePointer(entryId)}"]`;
  const lemmaNode = first(entry, 'Lemma') ?? first(entry, 'MultiwordExpression');
  const wordFormsNode = first(entry, 'WordForms');
  const wordForms = wordFormsNode ? children(wordFormsNode, 'WordForm') : [];
  const morphologyNode = first(entry, 'Morphology');
  const morphoSyntaxNode = first(entry, 'MorphoSyntax');
  const senses = children(entry, 'Sense').map((sense) => {
    const senseId = sense.attributes.id ?? '';
    const provenance = sense.attributes.provenance ?? null;
    return {
      id: senseId,
      definition: sense.attributes.definition ?? null,
      provenance,
      lineage: lineageFor(provenance),
      independence: 'not_assessed',
      xml_pointer: `${entryPointer}/Sense[@id="${escapePointer(senseId)}"]`,
    };
  });
  const articles = [];
  const plurals = [];
  const conflicts = [];
  wordForms.forEach((form, index) => {
    const pointer = `${entryPointer}/WordForms/WordForm[${index + 1}]`;
    const number = form.attributes.grammaticalNumber ?? null;
    const writtenForm = form.attributes.writtenForm ?? null;
    if (number === 'singular') {
      const rawArticle = form.attributes.article ?? null;
      const alternatives =
        rawArticle === null
          ? []
          : rawArticle
              .split('/')
              .map((part) => part.trim())
              .filter(Boolean);
      const recognized = alternatives.filter((part) => part === 'de' || part === 'het');
      const state =
        recognized.length === 0
          ? 'missing'
          : recognized.length > 1 || rawArticle.includes('/')
            ? 'alternatives'
            : 'explicit';
      articles.push({
        written_form: writtenForm,
        state,
        raw_article: rawArticle,
        alternatives: recognized,
        xml_pointer: pointer,
      });
      const gender = morphoSyntaxNode?.attributes.pronominalAndGrammaticalGender;
      if (recognized.includes('het') && gender?.includes('m')) {
        conflicts.push({
          kind: 'explicit-article-vs-gender-like-metadata',
          explicit_article: 'het',
          gender_like_metadata: gender,
          xml_pointers: [pointer, `${entryPointer}/MorphoSyntax/@pronominalAndGrammaticalGender`],
        });
      }
      if (recognized.includes('de') && gender?.includes('n')) {
        conflicts.push({
          kind: 'explicit-article-vs-gender-like-metadata',
          explicit_article: 'de',
          gender_like_metadata: gender,
          xml_pointers: [pointer, `${entryPointer}/MorphoSyntax/@pronominalAndGrammaticalGender`],
        });
      }
    }
    if (number === 'plural') plurals.push({ written_form: writtenForm, xml_pointer: pointer });
  });
  if (articles.length === 0) {
    articles.push({
      written_form: null,
      state: 'missing',
      raw_article: null,
      alternatives: [],
      xml_pointer: `${entryPointer}/WordForms`,
    });
  }
  const auxiliaries = morphoSyntaxNode
    ? children(morphoSyntaxNode, 'auxiliaries').map((node, index) => ({
        value: node.attributes.auxiliary ?? null,
        xml_pointer: `${entryPointer}/MorphoSyntax/auxiliaries[${index + 1}]`,
      }))
    : [];
  const morphology = morphologyNode?.attributes ?? {};
  return {
    id: entryId,
    part_of_speech: entry.attributes.partOfSpeech ?? null,
    lemma: lemmaNode?.attributes.writtenForm ?? null,
    lemma_attributes: lemmaNode?.attributes ?? {},
    xml_pointer: entryPointer,
    record_sha256: recordHash(entry),
    source_lineage: {
      source_id: 'odwn-1.4',
      source_family: 'Open Dutch WordNet / RBN-Cornetto',
      source_version: '1.4',
      source_sha256: pinnedSha256,
      sense_provenance: senses,
      independence: 'not_assessed',
    },
    articles,
    plurals,
    morphology: { ...morphology },
    morphosyntax: {
      attributes: morphoSyntaxNode?.attributes ?? {},
      gender_like_metadata: morphoSyntaxNode?.attributes.pronominalAndGrammaticalGender ?? null,
      auxiliaries,
    },
    separability: morphology.separability ?? null,
    conflicts,
  };
}

function emptyReport(source = {}) {
  return {
    source_id: source.id ?? 'odwn-1.4',
    source_lineage: source.lineage?.source_family ?? 'Open Dutch WordNet / RBN-Cornetto',
    source_version: source.version ?? '1.4',
    source_sha256: source.sha256 ?? pinnedSha256,
    ...(source.bytes === undefined ? {} : { source_bytes: source.bytes }),
    ...(source.url === undefined ? {} : { source_url: source.url }),
    ...(source.retrieved_at === undefined ? {} : { retrieved_at: source.retrieved_at }),
    independence: source.lineage?.independence ?? 'not_assessed',
    lexical_entries: 0,
    lexical_entries_with_singular_article: 0,
    distinct_lemmas_with_singular_article: 0,
    lexical_entries_with_plural: 0,
    lexical_entries_with_auxiliary: 0,
    lexical_entries_with_separability: 0,
    article_observations: 0,
    article_missing_observations: 0,
    plural_observations: 0,
    auxiliary_observations: 0,
    sense_observations: 0,
    article_conflicts: 0,
    provenance_lineages: {},
    _article_lemmas: new Set(),
    records: [],
    conflicts: [],
  };
}

function addRecord(
  report,
  record,
  includeRecords,
  recordFilter,
  maxConflictRecords = Number.POSITIVE_INFINITY,
) {
  report.lexical_entries += 1;
  const explicitArticles = record.articles.filter((article) => article.state !== 'missing');
  report.lexical_entries_with_singular_article += Number(explicitArticles.length > 0);
  if (explicitArticles.length > 0 && record.lemma) report._article_lemmas.add(record.lemma);
  report.article_observations += explicitArticles.length;
  report.article_missing_observations += record.articles.length - explicitArticles.length;
  report.plural_observations += record.plurals.length;
  report.lexical_entries_with_plural += Number(record.plurals.length > 0);
  report.auxiliary_observations += record.morphosyntax.auxiliaries.length;
  report.lexical_entries_with_auxiliary += Number(record.morphosyntax.auxiliaries.length > 0);
  report.lexical_entries_with_separability += Number(record.separability !== null);
  report.sense_observations += record.source_lineage.sense_provenance.length;
  report.article_conflicts += record.conflicts.length;
  for (const conflict of record.conflicts) {
    if (report.conflicts.length >= maxConflictRecords) break;
    report.conflicts.push({ record_id: record.id, lemma: record.lemma, ...conflict });
  }
  for (const sense of record.source_lineage.sense_provenance) {
    report.provenance_lineages[sense.lineage] =
      (report.provenance_lineages[sense.lineage] ?? 0) + 1;
  }
  if (includeRecords && recordFilter(record)) report.records.push(record);
}

function xmlScanner(
  report,
  includeRecords,
  recordFilter,
  maxConflictRecords = Number.POSITIVE_INFINITY,
) {
  const parser = new SaxesParser({ xmlns: false });
  let nodeStack = [];
  parser.on('opentag', (tag) => {
    const node = makeNode(tag.name, { ...tag.attributes });
    if (nodeStack.length > 0) {
      nodeStack.at(-1).children.push(node);
      nodeStack.push(node);
    } else if (tag.name === 'LexicalEntry') {
      nodeStack.push(node);
    }
  });
  parser.on('text', (value) => {
    if (nodeStack.length > 0) nodeStack.at(-1).text += value;
  });
  parser.on('cdata', (value) => {
    if (nodeStack.length > 0) nodeStack.at(-1).text += value;
  });
  parser.on('closetag', (tag) => {
    if (nodeStack.length === 0) return;
    const node = nodeStack.pop();
    if (node.name !== tag.name)
      throw new Error(`Malformed ODWN XML: expected </${node.name}>, found </${tag.name}>`);
    if (node.name === 'LexicalEntry')
      addRecord(report, observationFrom(node), includeRecords, recordFilter, maxConflictRecords);
  });
  return parser;
}

export function parseOdwnXml(
  xml,
  { includeRecords = true, recordFilter = () => true, source = {} } = {},
) {
  const report = emptyReport(source);
  const parser = xmlScanner(report, includeRecords, recordFilter);
  parser.write(xml).close();
  report.distinct_lemmas_with_singular_article = report._article_lemmas.size;
  delete report._article_lemmas;
  return report;
}

export async function inspectOdwnFile(
  inputPath,
  {
    manifestPath = sourceManifestUrl,
    includeRecords = false,
    recordFilter = () => true,
    maxConflictRecords = 20,
  } = {},
) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const inputStat = await stat(inputPath);
  if (inputStat.size !== manifest.bytes) {
    throw new Error(
      `ODWN source size mismatch: expected ${manifest.bytes} bytes, received ${inputStat.size}`,
    );
  }
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(inputPath)) hash.update(chunk);
  const actualHash = hash.digest('hex');
  if (actualHash !== manifest.sha256) {
    throw new Error(
      `ODWN source SHA-256 mismatch: expected ${manifest.sha256}, received ${actualHash}`,
    );
  }
  const report = emptyReport(manifest);
  const parser = xmlScanner(report, includeRecords, recordFilter, maxConflictRecords);
  const decoder = new StringDecoder('utf8');
  const gunzip = createReadStream(inputPath).pipe(createGunzip());
  for await (const chunk of gunzip) parser.write(decoder.write(chunk));
  parser.write(decoder.end()).close();
  report.distinct_lemmas_with_singular_article = report._article_lemmas.size;
  delete report._article_lemmas;
  return report;
}

async function main() {
  const args = process.argv.slice(2);
  const inputIndex = args.indexOf('--input');
  if (inputIndex < 0 || !args[inputIndex + 1]) {
    throw new Error(
      'Usage: node tools/content/import-odwn.mjs --input .cache/content-sources/odwn-1.4.xml.gz [--lemma <lemma> | --record-id <id>]',
    );
  }
  const lemmaIndex = args.indexOf('--lemma');
  const recordIdIndex = args.indexOf('--record-id');
  if (lemmaIndex >= 0 && recordIdIndex >= 0)
    throw new Error('Choose only one of --lemma and --record-id');
  const selectedLemma = lemmaIndex >= 0 ? args[lemmaIndex + 1] : undefined;
  const selectedId = recordIdIndex >= 0 ? args[recordIdIndex + 1] : undefined;
  if ((lemmaIndex >= 0 && !selectedLemma) || (recordIdIndex >= 0 && !selectedId)) {
    throw new Error('--lemma and --record-id each require a value');
  }
  const hasFilter = selectedLemma !== undefined || selectedId !== undefined;
  const report = await inspectOdwnFile(args[inputIndex + 1], {
    includeRecords: hasFilter,
    recordFilter: (record) =>
      (selectedLemma === undefined || record.lemma === selectedLemma) &&
      (selectedId === undefined || record.id === selectedId),
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
