// The HUD: flight data, mission box, artificial horizon, throttle and fuel
// bars, and the centre flash message. Every DOM id comes from game/index.html.
import { toFeet, toKnots, headingDegrees } from './flight.js';
import { clamp } from './random.js';

export function createHud() {
  const el = {
    alt: document.getElementById('alt'),
    spd: document.getElementById('spd'),
    hdg: document.getElementById('hdg'),
    vs: document.getElementById('vs'),
    gear: document.getElementById('gear'),
    flaps: document.getElementById('flaps'),
    missionTitle: document.getElementById('mission-title'),
    missionDetail: document.getElementById('mission-detail'),
    missionProgress: document.getElementById('mission-progress'),
    horizon: document.getElementById('horizon'),
    thrPct: document.getElementById('thr-pct'),
    thrFill: document.getElementById('throttle-fill'),
    fuelPct: document.getElementById('fuel-pct'),
    fuelFill: document.getElementById('fuel-fill'),
    message: document.getElementById('message'),
  };
  const hctx = el.horizon.getContext('2d');
  let messageUntil = 0;

  function drawHorizon(pitch, bank) {
    const w = 112;
    const h = 112;
    const cx = w / 2;
    const cy = h / 2;
    hctx.clearRect(0, 0, w, h);
    hctx.save();
    hctx.beginPath();
    hctx.arc(cx, cy, 54, 0, Math.PI * 2);
    hctx.clip();
    hctx.translate(cx, cy);
    hctx.rotate(-bank);
    const dy = clamp(pitch, -0.5, 0.5) * 90;
    hctx.fillStyle = '#2f6fb8';
    hctx.fillRect(-60, -60 + dy, 120, 60);
    hctx.fillStyle = '#6b4a2a';
    hctx.fillRect(-60, dy, 120, 60);
    hctx.fillStyle = '#eaf6ff';
    hctx.fillRect(-60, dy - 1, 120, 2);
    hctx.restore();
    // Fixed wings marker, so the pilot reads bank against the horizon.
    hctx.fillStyle = '#ffd23e';
    hctx.fillRect(cx - 34, cy - 2, 24, 4);
    hctx.fillRect(cx + 10, cy - 2, 24, 4);
    hctx.fillRect(cx - 2, cy - 2, 4, 4);
  }

  return {
    setMission(m) {
      el.missionTitle.textContent = m.mission.name;
      el.missionDetail.textContent = m.mission.brief;
    },
    flash(text, ms = 2600) {
      if (!text) {
        el.message.classList.add('hidden');
        return;
      }
      el.message.textContent = text;
      el.message.classList.remove('hidden');
      messageUntil = performance.now() + ms;
    },
    update(flight, missionState) {
      el.alt.textContent = toFeet(flight.y);
      el.spd.textContent = toKnots(flight.speed);
      el.hdg.textContent = `${headingDegrees(flight.heading)}°`;
      el.vs.textContent = Math.round(flight.verticalSpeed * 196.85);
      el.gear.textContent = flight.phase === 'flying' ? 'UP' : 'DOWN';
      el.flaps.textContent = flight.flaps ? 'DOWN' : 'UP';
      el.missionProgress.textContent = `Rings ${missionState.ringsPassed} / ${missionState.mission.rings} · Score ${missionState.score}`;
      el.thrPct.textContent = `${Math.round(flight.throttle * 100)}%`;
      el.thrFill.style.width = `${Math.round(flight.throttle * 100)}%`;
      el.fuelPct.textContent = `${Math.round(flight.fuel)}%`;
      el.fuelFill.style.width = `${Math.round(flight.fuel)}%`;
      drawHorizon(flight.pitch, flight.bank);
      if (messageUntil && performance.now() > messageUntil) {
        el.message.classList.add('hidden');
        messageUntil = 0;
      }
    },
  };
}
