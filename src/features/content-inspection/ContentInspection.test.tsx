import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { createLocalization } from '../../i18n';
import { ContentInspection } from './ContentInspection';
import artifact from '../../../content/inspection/starter-s01-s60.json';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('W20: a failed bundled asset load shows an error and retry recovers the full unreviewed inspection', async () => {
  const fetchAsset = vi
    .fn<typeof fetch>()
    .mockRejectedValueOnce(new Error('asset unavailable'))
    .mockResolvedValue(new Response(JSON.stringify(artifact)));
  vi.stubGlobal('fetch', fetchAsset);
  render(
    <I18nextProvider i18n={createLocalization('en')}>
      <ContentInspection />
    </I18nextProvider>,
  );
  expect((await screen.findByRole('alert')).textContent).toContain('Draft content is unavailable');
  await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }));
  expect((await screen.findByLabelText('Draft sense')).querySelectorAll('option')).toHaveLength(60);
  expect(screen.getByTestId('inspection-review').textContent).toContain('Release: blocked');
  expect(fetchAsset).toHaveBeenCalledTimes(2);
});
it('T50: an unsupported artifact is visibly rejected without presenting content as reviewed', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ ...artifact, inspection_only: false }))),
  );
  render(
    <I18nextProvider i18n={createLocalization('en')}>
      <ContentInspection />
    </I18nextProvider>,
  );
  expect((await screen.findByRole('alert')).textContent).toContain('Draft content is unavailable');
  expect(screen.queryByTestId('inspection-entry')).toBeNull();
});
it('T43: AC3 inspecting separable and reflexive verbs exposes exact answer spans and task contracts', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(artifact))),
  );
  render(
    <I18nextProvider i18n={createLocalization('en')}>
      <ContentInspection />
    </I18nextProvider>,
  );
  const select = await screen.findByLabelText('Draft sense');
  const user = userEvent.setup();
  for (const lemma of ['meenemen', 'opstaan', 'invullen', 'inschrijven']) {
    const entry = artifact.entries.find((sense) => sense.lexeme.lemma === lemma);
    if (!entry) throw new Error(`Missing ${lemma} fixture`);
    await user.selectOptions(select, entry.id);
    const contracts = screen.getAllByTestId('inspection-answer-contract');
    expect(contracts).toHaveLength(entry.examples.length);
    for (const [i, example] of entry.examples.entries()) {
      const contract = contracts[i];
      if (!contract) throw new Error(`Missing answer contract ${example.id}`);
      await user.click(contract.parentElement!.querySelector('summary')!);
      expect(JSON.parse(contract.textContent)).toEqual({
        target_sense_id: example.target_sense_id,
        target_form_ids: example.target_form_ids,
        answer_spans: example.answer_spans,
        offset_unit: example.offset_unit,
        accepted_answers: example.accepted_answers,
        task_contract: example.task_contract,
      });
    }
  }
});
