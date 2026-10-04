// A recorded cross-language conflict is not discoverable by comparing Dutch surface words.
// This scoped finding comes from work-01/S09.json, dimension task_ambiguity; it is not a synonym engine.
const recordedConflicts = new Map([
  ['d66ba490-4dcc-482e-885b-cf97a000a036', { en: ['possess'], pl: ['posiadać'] }],
]);
const words = (text) =>
  text
    .normalize('NFC')
    .toLocaleLowerCase('nl')
    .match(/[\p{L}\p{N}]+/gu) ?? [];
const includesWords = (text, answer) => {
  const cue = words(text);
  const target = words(answer);
  return target.length > 0 && cue.some((_, i) => target.every((word, j) => cue[i + j] === word));
};
const attributive = (form) =>
  form.features.source_tags.some((tag) =>
    ['attributive', 'definite', 'indefinite', 'neuter', 'masculine', 'feminine'].includes(tag),
  ) && !form.features.source_tags.includes('predicative');

/** Structural checks only: no language-quality or publication status is assigned. */
export function exerciseFindings(entry) {
  const findings = [];
  const add = (rule, field, message, example = null) =>
    findings.push({
      rule,
      entry_id: entry.id,
      fixture_ref: entry.fixture_ref,
      example_id: example?.id ?? null,
      field,
      message,
    });
  for (const [i, form] of entry.forms.entries()) {
    if (!form.surface.trim() || /^[-–—]+$/.test(form.surface.trim()))
      add('R4', `/forms/${i}/surface`, 'Placeholder is not an attested form.');
  }
  for (const locale of ['en', 'pl']) {
    const meanings = entry.sense.meanings[locale];
    for (const [i, meaning] of (meanings ?? []).entries()) {
      if (/\bin this context\b|\bw tym kontekście\b/iu.test(meaning))
        add('R5', `/sense/meanings/${locale}/${i}`, 'Remove learner-facing meta wording.');
    }
  }
  for (const [i, example] of entry.examples.entries()) {
    const path = `/examples/${i}`;
    const forms = example.target_form_ids
      .map((id) => entry.forms.find((form) => form.id === id))
      .filter(Boolean);
    if (
      forms.some((form) => form.features.kind === 'verb') &&
      (!example.cue?.tense?.trim() || !example.cue?.person?.trim())
    )
      add('R1', `${path}/cue`, 'Verb answers require an explicit tense and person.', example);
    const first = example.accepted_answers[0]?.ordered_segments.join(' ') ?? '';
    const wholeSentence = words(first).join(' ') === words(example.nl).join(' ');
    // Batch S04 is a multiword phrase cloze, not a whole-sentence span. It needs the same
    // alternatives/self-assessment guard; structure cannot enumerate its Dutch synonyms.
    const phrase = entry.lexeme.pos === 'phrase' && words(first).length > 1;
    const alternatives = new Set(
      example.accepted_answers.map((answer) => words(answer.ordered_segments.join(' ')).join(' ')),
    );
    if ((wholeSentence || phrase) && alternatives.size < 2 && example.self_graded !== true)
      add(
        'R2',
        `${path}/accepted_answers`,
        'Sentence/phrase production needs distinct alternatives or self-grading.',
        example,
      );
    const answers = [
      ...example.accepted_answers.map((answer) => answer.ordered_segments.join(' ')),
      ...entry.forms.map((form) => form.surface),
      entry.lexeme.lemma,
    ];
    // context is the legacy gloss; inspect both so a new structured cue cannot hide a leaking old cue.
    for (const field of ['context', 'cue/gloss']) {
      const gloss = field === 'context' ? example.context : example.cue?.gloss;
      for (const [locale, text] of Object.entries(gloss ?? {})) {
        if (typeof text !== 'string') continue;
        const matches = [...answers, ...(recordedConflicts.get(entry.id)?.[locale] ?? [])];
        if (matches.some((answer) => includesWords(text, answer)))
          add(
            'R3',
            `${path}/${field}/${locale}`,
            'Cue contains a target form or recorded competing-answer gloss.',
            example,
          );
      }
    }
    const predicative =
      example.cue?.adjective_use === 'predicative' ||
      forms.some((form) => form.features.source_tags.includes('predicative'));
    for (const [j, id] of example.target_form_ids.entries()) {
      const form = entry.forms.find((item) => item.id === id);
      if (predicative && form && attributive(form))
        add(
          'R4',
          `${path}/target_form_ids/${j}`,
          'Predicative example links to an attributive form.',
          example,
        );
    }
  }
  return findings;
}
