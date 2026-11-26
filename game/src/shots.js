// Staged screenshots: ?shot=flight|takeoff|cockpit|landing poses the plane,
// the camera and the mission, then main.js renders a few frames and sets
// window.__shotReady. Every pose is exact, so the same URL always renders
// the same picture.
import { PHASE } from './flight.js';

function poseInFlight(flight, mission, rings, index) {
  const ring = rings[Math.min(index, rings.length - 1)];
  const prev = rings[Math.max(0, index - 1)];
  flight.phase = PHASE.FLYING;
  // Park the plane 260 m short of the ring, on its approach line.
  const dx = ring.x - prev.x;
  const dz = ring.z - prev.z;
  const len = Math.hypot(dx, dz) || 1;
  flight.x = ring.x - (dx / len) * 260;
  flight.z = ring.z - (dz / len) * 260;
  flight.y = ring.y;
  flight.heading = Math.atan2(-dx, -dz);
  flight.pitch = -0.03;
  flight.bank = 0.12;
  flight.speed = 58;
  flight.throttle = 0.72;
  flight.verticalSpeed = 1.5;
  mission.started = true;
  mission.ringsPassed = index;
  mission.course.nextIndex = index;
  for (let i = 0; i < rings.length; i += 1) {
    mission.course.setState(i, i < index ? 'done' : i === index ? 'next' : 'idle');
  }
}

export function stageShot(ctx, name) {
  const { flight, mission, setCamera } = ctx;
  const rings = mission.course.rings;
  if (name === 'takeoff') {
    setCamera('chase');
    flight.phase = PHASE.ROLLING;
    flight.speed = 34;
    flight.throttle = 1;
    flight.pitch = -0.1;
    return;
  }
  if (name === 'cockpit') {
    setCamera('cockpit');
    poseInFlight(flight, mission, rings, 2);
    return;
  }
  if (name === 'landing') {
    setCamera('chase');
    flight.phase = PHASE.FLYING;
    flight.x = 0;
    flight.y = 42;
    flight.z = 1100;
    flight.heading = 0;
    flight.pitch = -0.04;
    flight.bank = 0;
    flight.speed = 46;
    flight.throttle = 0.45;
    flight.flaps = true;
    flight.verticalSpeed = -2.5;
    mission.started = true;
    mission.ringsPassed = mission.mission.rings;
    mission.course.nextIndex = mission.mission.rings;
    for (let i = 0; i < rings.length; i += 1) mission.course.setState(i, 'done');
    return;
  }
  // Default: 'flight' — chase view, mid-course, the next ring ahead.
  setCamera('chase');
  poseInFlight(flight, mission, rings, 2);
}
