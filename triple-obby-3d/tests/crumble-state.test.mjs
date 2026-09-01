import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCrumbleId, advanceCrumble, applyAuthoritativeCrumble } from '../network/crumble-state.mjs';

test('crumble id is deterministic and state follows 600ms/2500ms timings', () => {
  assert.equal(makeCrumbleId('sky', 12, 3), 'sky:crumble:12:03');
  const cracking = applyAuthoritativeCrumble(
    { state: 'active', transitionId: null, effectiveAt: 0, respawnAt: 0 },
    { state: 'cracking', transitionId: 't1', effectiveAt: 1000, respawnAt: 4100 },
  );
  assert.equal(advanceCrumble(cracking, 1599).state, 'cracking');
  assert.equal(advanceCrumble(cracking, 1600).state, 'hidden');
  assert.equal(advanceCrumble(cracking, 4100).state, 'active');
});

test('duplicate or older crumble events do not overwrite the current transition', () => {
  const current = { state: 'hidden', transitionId: 't2', effectiveAt: 3000, respawnAt: 6000 };
  assert.equal(applyAuthoritativeCrumble(current, { state: 'hidden', transitionId: 't2', effectiveAt: 3000, respawnAt: 6000 }), current);
  assert.equal(applyAuthoritativeCrumble(current, { state: 'cracking', transitionId: 't1', effectiveAt: 2000, respawnAt: 5100 }), current);
});
