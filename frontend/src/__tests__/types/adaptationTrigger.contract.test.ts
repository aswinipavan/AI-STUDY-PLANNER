/**
 * Contract test: the frontend's adaptation triggers must match the backend's.
 *
 * Why this exists as a *test* rather than a comment: the backend's `buildSummary`
 * switch has a `default` arm, so an unrecognised trigger does not 4xx — it
 * silently swaps the specific "why your plan changed" sentence for a generic
 * one. That is invisible in the UI and invisible to `tsc`, because both sides
 * are just strings. Two of the six members had in fact drifted
 * (`SESSION_MISSED` vs `MISSED_SESSIONS`, `PERFORMANCE_CHANGED` vs
 * `MARKS_CHANGED`) and the only live call site was sending a dead one.
 *
 * This reads the Java source instead of hardcoding a second copy of the list,
 * so it fails when *either* side is edited alone. CI checks out the whole
 * monorepo, so the path resolves there the same as locally.
 */
import fs from 'node:fs';
import path from 'node:path';

import { ADAPTATION_TRIGGERS } from '@/types/api.types';

const SERVICE = path.join(
  __dirname,
  '../../../../backend/src/main/java/com/aistudyplanner/service/AdaptiveScheduleService.java',
);

describe('AdaptationTrigger ↔ AdaptiveScheduleService.TRIGGER_*', () => {
  it('has a readable backend source to compare against', () => {
    // Guard against the vacuous version of this test: if the file moves and we
    // silently skip, the contract stops being checked and nothing says so.
    expect(fs.existsSync(SERVICE)).toBe(true);
  });

  it('declares exactly the triggers the backend recognises', () => {
    const java = fs.readFileSync(SERVICE, 'utf8');
    const backend = [...java.matchAll(/TRIGGER_[A-Z_]+\s*=\s*"([A-Z_]+)"/g)].map(m => m[1]);

    // If this is empty the regex has drifted from the Java, which would make the
    // comparison below pass for the wrong reason.
    expect(backend.length).toBeGreaterThan(0);
    expect([...backend].sort()).toEqual([...ADAPTATION_TRIGGERS].sort());
  });

  it('is the set the summary switch actually branches on', () => {
    const java = fs.readFileSync(SERVICE, 'utf8');
    // Every trigger except MANUAL should have its own `case` arm — MANUAL is the
    // deliberate fall-through to the neutral wording.
    const branched = ADAPTATION_TRIGGERS.filter(t => t !== 'MANUAL').filter(t => {
      const constant = java.match(new RegExp(`(TRIGGER_[A-Z_]+)\\s*=\\s*"${t}"`))?.[1];
      return constant ? new RegExp(`case\\s+${constant}\\s*:`).test(java) : false;
    });

    expect(branched.sort()).toEqual(ADAPTATION_TRIGGERS.filter(t => t !== 'MANUAL').sort());
  });
});
