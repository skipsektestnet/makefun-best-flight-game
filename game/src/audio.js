// Synthesised sound: no audio files, everything comes from the Web Audio API.
// The engine is a low sawtooth whose pitch follows the throttle, plus
// filtered noise for the wind; rings, takeoff and landing get short blips.
export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let windSrc = null;
  let windGain = null;
  let windFilter = null;
  let muted = false;

  function ensure() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    const engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 420;
    engineOsc.connect(engineFilter).connect(engineGain).connect(ctx.destination);
    engineOsc.start();
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    windSrc = ctx.createBufferSource();
    windSrc.buffer = buf;
    windSrc.loop = true;
    windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 600;
    windFilter.Q.value = 0.6;
    windGain = ctx.createGain();
    windGain.gain.value = 0;
    windSrc.connect(windFilter).connect(windGain).connect(ctx.destination);
    windSrc.start();
    return true;
  }

  function blip(freq, dur, type = 'sine', gain = 0.18, when = 0) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  return {
    unlock() {
      if (ensure() && ctx.state === 'suspended') void ctx.resume();
    },
    setEngine(throttle, speed, airborne) {
      if (!ctx || muted) return;
      const t = ctx.currentTime;
      engineGain.gain.setTargetAtTime(0.05 + throttle * 0.10, t, 0.1);
      engineOsc.frequency.setTargetAtTime(52 + throttle * 55 + speed * 0.25, t, 0.1);
      windGain.gain.setTargetAtTime(airborne ? Math.min(0.14, speed * 0.0022) : 0, t, 0.2);
      windFilter.frequency.setTargetAtTime(400 + speed * 9, t, 0.2);
    },
    setMuted(m) {
      muted = m;
      if (!ctx) return;
      if (m) {
        engineGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
        windGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      }
    },
    ring(centre) {
      blip(880, 0.16);
      if (centre) blip(1318, 0.2, 'sine', 0.16, 0.08);
    },
    takeoff() {
      blip(523, 0.18);
      blip(784, 0.22, 'sine', 0.16, 0.1);
    },
    landed() {
      blip(392, 0.2);
      blip(523, 0.25, 'sine', 0.16, 0.12);
      blip(659, 0.3, 'sine', 0.16, 0.24);
    },
    crash() {
      blip(110, 0.5, 'sawtooth', 0.22);
      blip(65, 0.6, 'square', 0.14, 0.05);
    },
  };
}
