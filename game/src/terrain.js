// The valley: a seeded heightfield with a river, a flat airfield, a small town,
// pine forest and rolling hills that ring the whole map. heightAt(x, z) is the
// single source of truth for the ground — the flight model uses it for crashes
// and landings, and the rings use it to sit above the terrain.
import * as THREE from 'three';
import { WORLD, RUNWAY } from './config.js';
import { mulberry32, range, clamp } from './random.js';

const SEGMENTS = 120;

// Rolling hills from a few layered sine waves, flattened near the runway and
// carved into a river valley that runs north–south through the west half.
export function heightAt(x, z) {
  const s = WORLD.size / 2;
  let h = 26 * Math.sin(x * 0.0016 + 1.3) * Math.cos(z * 0.0013 + 0.4)
    + 14 * Math.sin(x * 0.004 + z * 0.003)
    + 7 * Math.sin(x * 0.011 - z * 0.008 + 2.0);
  // Hills rise toward the map edge so the valley reads as a bowl.
  const edge = Math.max(Math.abs(x), Math.abs(z)) / s;
  h += Math.pow(Math.max(0, edge - 0.55) / 0.45, 2) * 190;
  // River valley: a channel along x = -560, deepening toward the south.
  const river = Math.exp(-Math.pow((x + 560) / 190, 2));
  h -= river * 30;
  // Airfield plateau: flat ground around the runway.
  const dx = x - RUNWAY.x;
  const dz = z - RUNWAY.z;
  const d = Math.sqrt(dx * dx + dz * dz);
  const flat = clamp(1 - (d - 260) / 220, 0, 1);
  h = h * (1 - flat) + 4 * flat;
  return h;
}

function groundColour(h, x, z, rng) {
  // Valley grass, darker in the river channel, dry gold on the high hills.
  if (h < WORLD.waterLevel + 1.5) return [0.42, 0.55, 0.30];
  const t = clamp((h - 4) / 120, 0, 1);
  const g = 0.55 - t * 0.22 + rng() * 0.05;
  return [0.32 + t * 0.25, g, 0.20 + t * 0.06];
}

export function buildTerrain(scene) {
  const rng = mulberry32(WORLD.seed);
  const half = WORLD.size / 2;
  const geo = new THREE.PlaneGeometry(WORLD.size, WORLD.size, SEGMENTS, SEGMENTS);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colours = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = heightAt(x, z);
    pos.setY(i, h);
    const c = groundColour(h, x, z, rng);
    colours[i * 3] = c[0];
    colours[i * 3 + 1] = c[1];
    colours[i * 3 + 2] = c[2];
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(
    geo,
    new THREE.MeshLambertMaterial({ vertexColors: true }),
  );
  ground.receiveShadow = true;
  scene.add(ground);

  // River ribbon, a flat blue strip that follows the valley floor.
  const riverGeo = new THREE.PlaneGeometry(260, WORLD.size, 1, 60);
  riverGeo.rotateX(-Math.PI / 2);
  const rpos = riverGeo.attributes.position;
  for (let i = 0; i < rpos.count; i += 1) {
    const x = rpos.getX(i) - 560;
    const z = rpos.getZ(i);
    rpos.setX(i, x);
    rpos.setY(i, WORLD.waterLevel);
    void z;
  }
  const river = new THREE.Mesh(
    riverGeo,
    new THREE.MeshLambertMaterial({ color: 0x2f7fb8, transparent: true, opacity: 0.92 }),
  );
  scene.add(river);

  buildRunway(scene);
  buildTown(scene, rng);
  buildForest(scene, rng);
  buildHills(scene, rng);
}

function buildRunway(scene) {
  const group = new THREE.Group();
  const strip = new THREE.Mesh(
    new THREE.PlaneGeometry(RUNWAY.width, RUNWAY.length),
    new THREE.MeshLambertMaterial({ color: 0x3a3f45 }),
  );
  strip.rotation.x = -Math.PI / 2;
  strip.position.set(RUNWAY.x, 4.3, RUNWAY.z);
  strip.receiveShadow = true;
  group.add(strip);
  // White centre dashes and the big "36" threshold numbers as flat boxes.
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xf2f2e8 });
  for (let z = RUNWAY.z - RUNWAY.length / 2 + 60; z < RUNWAY.z + RUNWAY.length / 2 - 40; z += 60) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 26), dashMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(RUNWAY.x, 4.35, z);
    group.add(dash);
  }
  // Threshold bars at both ends.
  for (const end of [-1, 1]) {
    for (let k = -2; k <= 2; k += 1) {
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(3, 22), dashMat);
      bar.rotation.x = -Math.PI / 2;
      bar.position.set(RUNWAY.x + k * 6, 4.35, RUNWAY.z + end * (RUNWAY.length / 2 - 18));
      group.add(bar);
    }
  }
  // Windsock and a small hangar beside the strip.
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 14, 8),
    new THREE.MeshLambertMaterial({ color: 0xd8d8d8 }),
  );
  pole.position.set(RUNWAY.x + 42, 11, RUNWAY.z - 120);
  group.add(pole);
  const sock = new THREE.Mesh(
    new THREE.ConeGeometry(2.2, 9, 8),
    new THREE.MeshLambertMaterial({ color: 0xff7a2a }),
  );
  sock.rotation.z = Math.PI / 2;
  sock.position.set(RUNWAY.x + 47, 17.5, RUNWAY.z - 120);
  group.add(sock);
  const hangar = new THREE.Mesh(
    new THREE.BoxGeometry(46, 16, 30),
    new THREE.MeshLambertMaterial({ color: 0x8a97a3 }),
  );
  hangar.position.set(RUNWAY.x - 58, 12, RUNWAY.z + 60);
  hangar.castShadow = true;
  group.add(hangar);
  const roof = new THREE.Mesh(
    new THREE.CylinderGeometry(15, 15, 46, 12, 1, false, 0, Math.PI),
    new THREE.MeshLambertMaterial({ color: 0x5d6b78 }),
  );
  roof.rotation.z = Math.PI / 2;
  roof.rotation.y = Math.PI / 2;
  roof.position.set(RUNWAY.x - 58, 20, RUNWAY.z + 60);
  group.add(roof);
  scene.add(group);
}

function buildTown(scene, rng) {
  // Kutilang town: two dozen small houses with warm roofs along two streets,
  // east of the river, south of the airfield.
  const group = new THREE.Group();
  const wallCols = [0xe8dcc0, 0xdfe8ee, 0xf0d8c8, 0xd8e2c8];
  const roofCols = [0xb5502e, 0x7a4a30, 0x94502e, 0x5d6b78];
  for (let i = 0; i < 26; i += 1) {
    const x = 180 + rng() * 420 + (rng() < 0.5 ? -260 : 0);
    const z = 900 + rng() * 420;
    const w = range(rng, 14, 24);
    const d = range(rng, 12, 20);
    const h = range(rng, 8, 14);
    const walls = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshLambertMaterial({ color: wallCols[Math.floor(rng() * wallCols.length)] }),
    );
    walls.position.set(x, heightAt(x, z) + h / 2, z);
    walls.castShadow = true;
    group.add(walls);
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(Math.max(w, d) * 0.75, range(rng, 5, 8), 4),
      new THREE.MeshLambertMaterial({ color: roofCols[Math.floor(rng() * roofCols.length)] }),
    );
    roof.position.set(x, heightAt(x, z) + h + 2.5, z);
    roof.rotation.y = Math.PI / 4;
    group.add(roof);
    // A lit window or two, so the town reads at dusk.
    const win = new THREE.Mesh(
      new THREE.PlaneGeometry(3, 4),
      new THREE.MeshBasicMaterial({ color: 0xffd98a }),
    );
    win.position.set(x, heightAt(x, z) + h * 0.55, z + d / 2 + 0.1);
    group.add(win);
  }
  // Church tower on the town square, the landmark pilots steer by.
  const tower = new THREE.Mesh(
    new THREE.BoxGeometry(14, 42, 14),
    new THREE.MeshLambertMaterial({ color: 0xe8e0cc }),
  );
  tower.position.set(320, heightAt(320, 1080) + 21, 1080);
  tower.castShadow = true;
  group.add(tower);
  const spire = new THREE.Mesh(
    new THREE.ConeGeometry(10, 18, 4),
    new THREE.MeshLambertMaterial({ color: 0x2e4a68 }),
  );
  spire.position.set(320, heightAt(320, 1080) + 51, 1080);
  spire.rotation.y = Math.PI / 4;
  group.add(spire);
  scene.add(group);
}

function buildForest(scene, rng) {
  // Pine stands on the eastern ridge and along the river banks.
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5a3d24 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2c5a2e });
  const leafMat2 = new THREE.MeshLambertMaterial({ color: 0x356b32 });
  for (let i = 0; i < 240; i += 1) {
    const cluster = rng();
    let x; let z;
    if (cluster < 0.55) { x = 700 + rng() * 800; z = -400 + rng() * 1600; }
    else if (cluster < 0.85) { x = -900 + rng() * 260; z = -1000 + rng() * 1800; }
    else { x = -1200 + rng() * 2200; z = -1500 + rng() * 500; }
    const y = heightAt(x, z);
    if (y < 6) continue;
    const s = range(rng, 0.8, 1.6);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.7 * s, 1 * s, 6 * s, 6), trunkMat);
    trunk.position.set(x, y + 3 * s, z);
    group.add(trunk);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(5 * s, 16 * s, 7), rng() < 0.5 ? leafMat : leafMat2);
    cone.position.set(x, y + 12 * s, z);
    cone.castShadow = true;
    group.add(cone);
  }
  scene.add(group);
}

function buildHills(scene, rng) {
  // A ring of big rounded peaks on the far edge so the horizon is never empty.
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0x4a6b4f });
  const snow = new THREE.MeshLambertMaterial({ color: 0xe8eef2 });
  for (let i = 0; i < 14; i += 1) {
    const angle = (i / 14) * Math.PI * 2 + rng() * 0.3;
    const r = 1650 + rng() * 250;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const h = range(rng, 180, 320);
    const peak = new THREE.Mesh(new THREE.ConeGeometry(range(rng, 180, 300), h, 9), mat);
    peak.position.set(x, h / 2 - 10, z);
    group.add(peak);
    if (h > 260) {
      const cap = new THREE.Mesh(new THREE.ConeGeometry(90, 70, 9), snow);
      cap.position.set(x, h - 45, z);
      group.add(cap);
    }
  }
  scene.add(group);
}
