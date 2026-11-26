// Sorties: three missions of rising difficulty, each a ring course plus a
// landing back on Runway 36. The mission tracks rings, score and time, and
// decides when a sortie is cleared, failed, or ready to advance.
import { MISSIONS, SCORE, RINGS } from './config.js';
import { buildRings } from './rings.js';
import { PHASE } from './flight.js';

export function newMissionState(scene, sortieIndex) {
  const mission = MISSIONS[sortieIndex];
  const course = buildRings(scene, mission, sortieIndex);
  course.setState(0, 'next');
  return {
    sortieIndex,
    mission,
    course,
    score: 0,
    ringsPassed: 0,
    time: 0,
    started: false,
    cleared: false,
    failed: false,
    failReason: '',
    wind: {
      speed: mission.wind,
      // Crosswind from the west, so the pilot must crab into it.
      direction: Math.PI / 2,
    },
    dusk: sortieIndex === 2 ? 0.55 : sortieIndex === 1 ? 0.15 : 0,
  };
}

export function stepMission(state, flight, dt, onEvent) {
  if (flight.phase === PHASE.FLYING && !state.started) {
    state.started = true;
    onEvent('takeoff');
  }
  if (state.started && !state.cleared && !state.failed) state.time += dt;

  // Ring passes.
  if (state.started && !state.cleared) {
    const ring = state.course.checkPass(flight.x, flight.y, flight.z);
    if (ring) {
      state.ringsPassed += 1;
      let points = RINGS.passScore;
      if (ring.centre) points += RINGS.centreBonus;
      state.score += points;
      state.course.setState(ring.userData.index, 'done');
      state.course.setState(state.course.nextIndex, 'next');
      onEvent(ring.centre ? 'ring-centre' : 'ring', state.ringsPassed, state.mission.rings);
      if (state.ringsPassed >= state.mission.rings) onEvent('all-rings');
    }
  }

  // Landing after the rings: a gentle touchdown on the strip clears the sortie.
  if (flight.phase === PHASE.LANDED && state.started) {
    if (state.ringsPassed >= state.mission.rings) {
      state.cleared = true;
      state.score += SCORE.landing;
      const par = SCORE.parSeconds[state.sortieIndex];
      if (state.time < par) state.score += Math.round((par - state.time) * SCORE.timeBonus);
      onEvent('landed-clear', state.score);
    } else {
      state.failed = true;
      state.failReason = 'You landed before finishing the rings.';
      onEvent('landed-early');
    }
  }

  // Crash, fuel and damage end the sortie.
  if (flight.phase === PHASE.CRASHED && !state.failed && !state.cleared) {
    state.failed = true;
    state.failReason = 'Kutilang One is down. The valley keeps her this time.';
    onEvent('crashed');
  }
  if (flight.phase === PHASE.OUT_OF_FUEL && !state.failed && !state.cleared) {
    state.failed = true;
    state.failReason = 'Out of fuel — she glided down into the valley.';
    onEvent('out-of-fuel');
  }
  if (flight.damage >= 50 && !state.failed && !state.cleared) {
    state.failed = true;
    state.failReason = 'Too much damage — the sortie is over.';
    onEvent('damaged');
  }
  return state;
}

export function nextSortie(state) {
  return state.sortieIndex + 1 < MISSIONS.length ? state.sortieIndex + 1 : -1;
}
