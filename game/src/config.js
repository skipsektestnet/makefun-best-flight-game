// Tuning constants for Kutilang Valley Run: one place for every number that
// shapes how the plane flies, how the valley looks and how a sortie is scored.
export const WORLD = {
  size: 3600,          // valley is size x size metres, centred on (0, 0)
  seed: 20261126,      // valley layout seed; the same seed always builds the same valley
  waterLevel: 2,       // river surface height
  runwayHeading: 0,    // runway 36 points north (-Z)
};

export const RUNWAY = {
  x: 0, z: 620,        // centre of the strip
  length: 620, width: 34,
  heading: 0,          // degrees, 0 = north
};

export const PLANE = {
  stallSpeed: 26,      // m/s; below this the wing stops lifting
  cruiseSpeed: 62,     // m/s at full throttle, level
  maxSpeed: 88,
  climbRate: 9,        // m/s at full throttle, nose up
  sinkRate: 7,         // m/s gliding, nose down
  turnRate: 0.55,      // rad/s at full bank
  maxBank: 1.05,       // rad
  pitchRate: 0.5,      // rad/s
  maxPitch: 0.45,      // rad
  accel: 14,           // m/s^2 at full throttle
  drag: 0.16,          // 1/s speed bleed
  groundRoll: 0.55,    // rolling friction on the runway
  takeoffSpeed: 30,    // m/s before the plane can lift
  fuelBurn: 0.55,      // % of tank per second at full throttle
  fuelIdle: 0.08,      // % per second at idle
  crashSpeed: 26,      // m/s vertical speed that breaks the plane on touchdown
  hardLanding: 12,     // m/s vertical speed that damages but survives
};

export const RINGS = {
  radius: 26,          // ring inner radius in metres
  tube: 2.2,           // torus tube thickness
  passScore: 100,      // points per ring
  centreBonus: 40,     // extra points for threading the middle
};

export const MISSIONS = [
  {
    name: 'SORTIE 1 — RIVER RUN',
    brief: 'Take off from Runway 36, thread the amber rings down the river, then land back home.',
    rings: 6, wind: 2, ringFloor: 55, ringCeiling: 150, fuel: 100,
  },
  {
    name: 'SORTIE 2 — HILL WEAVE',
    brief: 'Low rings over the farmland and the pine ridge. Mind the crosswind — it pushes you sideways.',
    rings: 8, wind: 6, ringFloor: 35, ringCeiling: 120, fuel: 100,
  },
  {
    name: 'SORTIE 3 — DUSK RIDGE',
    brief: 'Ten rings, low and tight, in a stiff wind and fading light. Bring her home in one piece.',
    rings: 10, wind: 10, ringFloor: 28, ringCeiling: 95, fuel: 90,
  },
];

export const SCORE = {
  landing: 250,        // gentle touchdown on the strip
  landingCentre: 100,  // extra for stopping near the centre line
  sortieClear: 500,    // finishing all rings and landing
  timeBonus: 2,        // points per second under par
  parSeconds: [240, 300, 360],
};
