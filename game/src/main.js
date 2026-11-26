// Kutilang Valley Run — game bootstrap and main loop.
//
// Wires the valley, the sky, the plane, the ring course, the flight model,
// the HUD, the sound and the screens together. The loop runs at the display
// refresh rate: read the stick, step the flight model and the mission,
// pose the plane and the camera, then draw the HUD.
import * as THREE from 'three';
import { WORLD } from './config.js';
import { heightAt, buildTerrain } from './terrain.js';
import { buildSky } from './sky.js';
import { buildPlane } from './aircraft.js';
import { newFlight, stepFlight, PHASE } from './flight.js';
import { newMissionState, stepMission, nextSortie } from './missions.js';
import { MISSIONS } from './config.js';
import { createInput } from './input.js';
import { createHud } from './hud.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
// ?lowfx=1 turns shadows off for software rendering (headless play-tests);
// the shipped game always runs with shadows on.
const lowFx = params.has('lowfx');

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(lowFx ? 1 : Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = !lowFx;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xcfe6f2, 900, 3800);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.5, 9000);

buildTerrain(scene);
const sky = buildSky(scene, WORLD.seed);
const planeParts = buildPlane();
planeParts.group.rotation.order = 'YXZ';
scene.add(planeParts.group);

const input = createInput();
const hud = createHud();
const audio = createAudio();

let flight = newFlight();
let mission = newMissionState(scene, 0);
sky.setDusk(mission.dusk);

let screen = 'title';
let cameraMode = 'chase';
let paused = false;
let muted = false;
let sortieIndex = 0;
let shotFrames = 0;

const screenEl = document.getElementById('screen');
const cardEl = document.getElementById('screen-card');

function showCard(html) {
  cardEl.innerHTML = html;
  screenEl.classList.remove('hidden');
  screenEl.style.pointerEvents = 'auto';
}
function hideCard() {
  screenEl.classList.add('hidden');
  screenEl.style.pointerEvents = 'none';
}
function bindButton(id, fn) {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', fn);
}

function showTitle() {
  screen = 'title';
  showCard(`
    <h1>KUTILANG VALLEY RUN</h1>
    <h2>Fly the light prop plane out of the green valley</h2>
    <p>Take off from Runway 36, thread the amber rings over the river, the farmland
    and the hills, then bring her home to land before the fuel runs out. Three
    sorties, more rings and stronger wind each time.</p>
    <p class="keys"><b>W</b>/<b>&uarr;</b> nose up &nbsp; <b>S</b>/<b>&darr;</b> nose down &nbsp;
    <b>A</b> <b>D</b> bank &amp; turn &nbsp; <b>Shift</b> throttle up &nbsp; <b>Ctrl</b> throttle down<br>
    <b>F</b> flaps &nbsp; <b>C</b> camera &nbsp; <b>P</b> pause &nbsp; <b>R</b> restart &nbsp; <b>M</b> mute</p>
    <p class="go"><button id="btn-start">Start &mdash; Sortie 1</button></p>`);
  bindButton('btn-start', () => {
    audio.unlock();
    showBriefing();
  });
}

function showBriefing() {
  screen = 'briefing';
  const m = MISSIONS[sortieIndex];
  showCard(`
    <h1>${m.name}</h1>
    <p>${m.brief}</p>
    <p>Rings: <b>${m.rings}</b> &nbsp; Wind: <b>${m.wind} m/s</b> &nbsp; Fuel: <b>${m.fuel}%</b></p>
    <p class="keys">Full throttle on the strip, lift off past 30 m/s, pull up gently.<br>
    Thread each amber ring through its middle for a centre bonus.</p>
    <p class="go"><button id="btn-fly">Fly!</button></p>`);
  bindButton('btn-fly', () => {
    audio.unlock();
    hideCard();
    screen = 'flying';
  });
}

function resetSortie(index) {
  sortieIndex = index;
  if (mission) mission.course.dispose();
  flight = newFlight();
  mission = newMissionState(scene, index);
  sky.setDusk(mission.dusk);
  hud.setMission(mission);
}

function showEnd(cleared, title, detail) {
  screen = 'end';
  const next = nextSortie(mission);
  let buttons = '';
  if (cleared && next >= 0) {
    buttons = `<p class="go"><button id="btn-next">Next sortie &mdash; ${MISSIONS[next].name}</button></p>`;
  } else if (cleared) {
    buttons = `<p class="go">Campaign complete &mdash; you brought her home every time.</p>
      <p class="go"><button id="btn-again">Fly again</button></p>`;
  } else {
    buttons = `<p class="go"><button id="btn-retry">Retry ${MISSIONS[sortieIndex].name}</button></p>`;
  }
  showCard(`<h1>${title}</h1><p>${detail}</p><p>Score <b>${mission.score}</b> &middot; Rings ${mission.ringsPassed} / ${mission.mission.rings}</p>${buttons}`);
  bindButton('btn-next', () => { resetSortie(next); showBriefing(); });
  bindButton('btn-again', () => { resetSortie(0); showBriefing(); });
  bindButton('btn-retry', () => { resetSortie(sortieIndex); showBriefing(); });
}

function onEvent(event, a, b) {
  if (event === 'takeoff') { hud.flash('Airborne!'); audio.takeoff(); }
  else if (event === 'ring') { hud.flash(`Ring ${a} / ${b} — +100`); audio.ring(false); }
  else if (event === 'ring-centre') { hud.flash(`Ring ${a} / ${b} — centre! +140`); audio.ring(true); }
  else if (event === 'all-rings') { hud.flash('All rings — bring her home!'); }
  else if (event === 'landed-clear') { audio.landed(); showEnd(true, 'SORTIE CLEAR', `Gentle touchdown on Runway 36. Score ${a}.`); }
  else if (event === 'landed-early') { showEnd(false, 'LANDED EARLY', mission.failReason); }
  else if (event === 'crashed') { audio.crash(); showEnd(false, 'CRASHED', mission.failReason); }
  else if (event === 'out-of-fuel') { audio.crash(); showEnd(false, 'OUT OF FUEL', mission.failReason); }
  else if (event === 'damaged') { audio.crash(); showEnd(false, 'TOO MUCH DAMAGE', mission.failReason); }
}

const clock = new THREE.Clock();
const chasePos = new THREE.Vector3();
const chaseLook = new THREE.Vector3();
const tmpV = new THREE.Vector3();
const tmpV2 = new THREE.Vector3();

function updateCamera(dt) {
  const g = planeParts.group;
  if (cameraMode === 'cockpit') {
    camera.position.copy(g.localToWorld(tmpV.set(0, 1.35, -1.0)));
    camera.lookAt(g.localToWorld(tmpV2.set(0, 0.7, -80)));
  } else {
    const target = g.localToWorld(tmpV.set(0, 4.5, 16));
    const look = g.localToWorld(tmpV2.set(0, 1, -30));
    const k = 1 - Math.exp(-dt * 5);
    chasePos.lerp(target, k);
    chaseLook.lerp(look, k);
    camera.position.copy(chasePos);
    camera.lookAt(chaseLook);
  }
}

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(Math.max(clock.getDelta(), 1 / 240), 0.05);
  const toggles = input.consume();
  // Snapshot the stick before consume() clears the one-shot flaps flag,
  // so the flight model still sees this frame's flap press.
  const stick = {
    pitch: input.state.pitch,
    roll: input.state.roll,
    throttleUp: input.state.throttleUp,
    throttleDown: input.state.throttleDown,
    flapsToggle: input.state.flapsToggle,
  };
  if (toggles.cameraToggle) cameraMode = cameraMode === 'chase' ? 'cockpit' : 'chase';
  if (toggles.pauseToggle && screen === 'flying') {
    paused = !paused;
    hud.flash(paused ? 'Paused — press P to resume' : '');
  }
  if (toggles.restart && (screen === 'flying' || screen === 'end')) {
    resetSortie(sortieIndex);
    showBriefing();
  }
  if (toggles.muteToggle) {
    muted = !muted;
    audio.setMuted(muted);
  }

  if (!paused && screen === 'flying') {
    stepFlight(flight, stick, mission.wind, dt);
    stepMission(mission, flight, dt, onEvent);
  }

  // Pose the plane mesh from the flight model. The model counts negative
  // pitch as nose-up and positive bank as a right bank, so both flip here.
  const g = planeParts.group;
  g.position.set(flight.x, flight.y, flight.z);
  g.rotation.set(-flight.pitch, flight.heading, -flight.bank);
  planeParts.spinner.rotation.z += dt * (3 + flight.throttle * 55);
  const t = clock.elapsedTime;
  planeParts.lights.tail.visible = (t % 1.4) < 0.9;
  planeParts.lights.landing.visible = flight.phase !== PHASE.FLYING || flight.y < 70;
  g.updateMatrixWorld(true);

  updateCamera(dt);
  sky.step(dt);
  audio.setEngine(flight.throttle, flight.speed, flight.phase === PHASE.FLYING);
  hud.update(flight, mission);
  flight.state = flight.phase;
  renderer.render(scene, camera);

  if (shotName) {
    shotFrames += 1;
    if (shotFrames >= 3) window.__shotReady = true;
  }
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Handle for the play-test and the screenshot staging. The flight object is
// reached through getters because a restart swaps it for a fresh one.
window.__kutilang = {
  get screen() { return screen; },
  get plane() { return flight; },
  get mission() { return mission; },
  get groundBelow() { return heightAt(flight.x, flight.z); },
  camera,
  setCamera(mode) { cameraMode = mode; },
};

hud.setMission(mission);
if (shotName) {
  // Staged screenshot: pose the scene, hide the menu card, and let the
  // loop render a few frames before the shot is taken.
  screen = 'flying';
  hideCard();
  stageShot({ flight, mission, setCamera: (mode) => { cameraMode = mode; } }, shotName);
  const g = planeParts.group;
  g.position.set(flight.x, flight.y, flight.z);
  g.rotation.set(-flight.pitch, flight.heading, -flight.bank);
  g.updateMatrixWorld(true);
  chasePos.copy(g.localToWorld(new THREE.Vector3(0, 4.5, 16)));
  chaseLook.copy(g.localToWorld(new THREE.Vector3(0, 1, -30)));
} else {
  showTitle();
}
frame();
