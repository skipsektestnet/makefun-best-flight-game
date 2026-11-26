// The flight model: a simple arcade sim with a real feel — throttle sets thrust,
// pitch trades speed for climb, bank turns the nose, and the wing stalls below
// flying speed. The plane starts parked on Runway 36; it can take off, fly,
// land, crash, or run out of fuel. Ground height comes from terrain.heightAt.
import { PLANE, RUNWAY } from './config.js';
import { heightAt } from './terrain.js';
import { clamp, lerp } from './random.js';

export const PHASE = {
  PARKED: 'parked',
  ROLLING: 'rolling',
  FLYING: 'flying',
  LANDED: 'landed',
  CRASHED: 'crashed',
  OUT_OF_FUEL: 'out-of-fuel',
};

export function newFlight() {
  return {
    phase: PHASE.PARKED,
    x: RUNWAY.x,
    y: 4.6,
    z: RUNWAY.z + RUNWAY.length / 2 - 40, // south end of the strip, facing north
    heading: RUNWAY.heading,
    pitch: 0,
    bank: 0,
    speed: 0,
    throttle: 0,
    flaps: false,
    verticalSpeed: 0,
    fuel: 100,
    damage: 0,
    groundTime: 0,
    airTime: 0,
  };
}

// True if the plane sits on the runway strip (within its bounds, facing it).
export function onRunway(f) {
  const dx = Math.abs(f.x - RUNWAY.x);
  const dz = Math.abs(f.z - RUNWAY.z);
  return dx < RUNWAY.width / 2 + 4 && dz < RUNWAY.length / 2 + 4;
}

export function stepFlight(f, input, wind, dt) {
  const wasFlying = f.phase === PHASE.FLYING;
  const ground = heightAt(f.x, f.z);

  // Throttle: Shift up, Ctrl down, smooth so the engine spools.
  if (input.throttleUp) f.throttle = clamp(f.throttle + dt * 0.7, 0, 1);
  if (input.throttleDown) f.throttle = clamp(f.throttle - dt * 0.7, 0, 1);
  if (input.flapsToggle) { f.flaps = !f.flaps; input.flapsToggle = false; }

  // Fuel burns with throttle; an empty tank glides the plane down.
  const burn = lerp(PLANE.fuelIdle, PLANE.fuelBurn, f.throttle) * dt;
  f.fuel = Math.max(0, f.fuel - burn);
  if (f.fuel <= 0 && f.phase === PHASE.FLYING) f.phase = PHASE.OUT_OF_FUEL;

  // Stick: pitch and bank chase the pilot's input, faster on the ground roll.
  const pitchTarget = clamp(input.pitch * PLANE.maxPitch, -PLANE.maxPitch, PLANE.maxPitch);
  const bankTarget = clamp(input.roll * PLANE.maxBank, -PLANE.maxBank, PLANE.maxBank);
  const agility = f.phase === PHASE.FLYING ? 1 : 0.4;
  f.pitch += (pitchTarget - f.pitch) * Math.min(1, dt * 3 * agility);
  f.bank += (bankTarget - f.bank) * Math.min(1, dt * 3 * agility);

  // Heading follows the bank, and the wind pushes the plane sideways.
  const turn = -Math.sin(f.bank) * PLANE.turnRate * (f.speed / PLANE.cruiseSpeed);
  f.heading += turn * dt;
  const windX = Math.sin(wind.direction) * wind.speed * dt;
  const windZ = Math.cos(wind.direction) * wind.speed * dt;

  // Speed: thrust minus drag, with flaps adding drag and lift.
  const flapDrag = f.flaps ? 0.35 : 0;
  const thrust = (f.fuel > 0 ? f.throttle : 0) * PLANE.accel * (f.phase === PHASE.FLYING ? 1 : 0.9);
  const drag = (PLANE.drag + flapDrag) * f.speed;
  f.speed = Math.max(0, f.speed + (thrust - drag) * dt);
  if (f.phase !== PHASE.FLYING && f.speed < 0.5) f.speed = Math.max(0, f.speed - PLANE.groundRoll * dt * 10);

  const forwardX = -Math.sin(f.heading);
  const forwardZ = -Math.cos(f.heading);

  if (f.phase === PHASE.PARKED || f.phase === PHASE.ROLLING) {
    // On the ground the plane rolls along the strip.
    f.x += forwardX * f.speed * dt;
    f.z += forwardZ * f.speed * dt;
    f.y = ground + 0.6;
    f.pitch = 0;
    if (f.speed > 2) f.phase = PHASE.ROLLING;
    if (f.speed >= PLANE.takeoffSpeed && input.pitch < -0.15) {
      f.phase = PHASE.FLYING;
      f.pitch = 0.08;
      f.verticalSpeed = 2;
    }
    // Rolling off the strip onto grass slows the plane hard.
    if (!onRunway(f) && f.speed > 8) f.speed = Math.max(8, f.speed - 18 * dt);
  } else if (f.phase === PHASE.FLYING || f.phase === PHASE.OUT_OF_FUEL) {
    // In the air: pitch sets climb, the wing needs speed to lift.
    const lift = clamp(f.speed / PLANE.stallSpeed, 0, 1.4);
    const climb = -Math.sin(f.pitch) * (f.phase === PHASE.OUT_OF_FUEL ? PLANE.sinkRate : PLANE.climbRate) * lift
      + (f.flaps ? 1.2 : 0);
    f.verticalSpeed = lerp(f.verticalSpeed, climb, Math.min(1, dt * 2));
    if (f.speed < PLANE.stallSpeed) f.verticalSpeed -= (PLANE.stallSpeed - f.speed) * 0.25;
    f.y += f.verticalSpeed * dt;
    f.x += forwardX * f.speed * dt + windX * 0.4;
    f.z += (forwardZ * f.speed) * dt + windZ * 0.4;
    f.airTime += dt;
    // Stall warning is shown by the HUD; the nose drops on its own.
    if (f.speed < PLANE.stallSpeed * 0.8) f.pitch = lerp(f.pitch, -0.18, dt * 1.5);
    // Ground contact: a gentle touchdown on the strip lands, anything else crashes.
    if (f.y <= ground + 0.6) {
      f.y = ground + 0.6;
      const hard = -f.verticalSpeed;
      if (onRunway(f) && hard < PLANE.crashSpeed && Math.abs(f.bank) < 0.5 && f.speed > 12) {
        f.phase = PHASE.LANDED;
        f.verticalSpeed = 0;
        if (hard > PLANE.hardLanding) f.damage += 25;
      } else {
        f.phase = PHASE.CRASHED;
        f.damage = 100;
      }
    }
    // The valley is bounded: turn back at the edge.
    const edge = 1750;
    if (Math.abs(f.x) > edge || Math.abs(f.z) > edge) {
      f.heading += Math.PI * dt * 0.4;
    }
  } else if (f.phase === PHASE.LANDED) {
    // Roll out after landing.
    f.speed = Math.max(0, f.speed - PLANE.groundRoll * 22 * dt);
    f.x += forwardX * f.speed * dt;
    f.z += forwardZ * f.speed * dt;
    f.y = ground + 0.6;
    f.pitch = 0;
    f.bank *= 0.9;
    if (f.speed < 1) f.phase = PHASE.PARKED;
  }
  if (wasFlying && f.phase !== PHASE.FLYING) f.groundTime += dt;
  return f;
}

export function toFeet(metres) { return Math.round(metres * 3.28084); }
export function toKnots(ms) { return Math.round(ms * 1.94384); }
export function headingDegrees(rad) {
  const deg = ((-rad * 180) / Math.PI) % 360;
  return Math.round((deg + 360) % 360) || 360;
}
