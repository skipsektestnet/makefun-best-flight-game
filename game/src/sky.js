// Sky, sun and clouds: a big gradient dome, a low sun with a warm disc, and
// soft billboard clouds that drift slowly across the valley. buildSky also
// returns a setDusk(t) handle so the third sortie can fly in fading light.
import * as THREE from 'three';
import { mulberry32, range } from './random.js';

export function buildSky(scene, seed) {
  const rng = mulberry32(seed + 77);
  // Gradient dome: vertex colours from horizon haze to zenith blue.
  const geo = new THREE.SphereGeometry(4200, 24, 14);
  const pos = geo.attributes.position;
  const colours = new Float32Array(pos.count * 3);
  const top = new THREE.Color(0x2f6fb8);
  const horizon = new THREE.Color(0xcfe6f2);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i += 1) {
    const t = (pos.getY(i) / 4200 + 1) / 2;
    c.copy(horizon).lerp(top, Math.pow(Math.max(0, t), 0.7));
    colours[i * 3] = c.r;
    colours[i * 3 + 1] = c.g;
    colours[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  const dome = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false }),
  );
  scene.add(dome);

  const sun = new THREE.DirectionalLight(0xfff2d8, 2.4);
  sun.position.set(-900, 1500, -600);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -900;
  sun.shadow.camera.right = 900;
  sun.shadow.camera.top = 900;
  sun.shadow.camera.bottom = -900;
  sun.shadow.camera.far = 5000;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xbfd9ee, 0x5a6b4a, 0.9));

  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(90, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff6c8, fog: false }),
  );
  disc.position.set(-2600, 1500, -2600);
  disc.lookAt(0, 0, 0);
  scene.add(disc);

  // Clouds: clusters of flattened white spheres, drifting east.
  const clouds = [];
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.88 });
  for (let i = 0; i < 26; i += 1) {
    const group = new THREE.Group();
    const puffs = 3 + Math.floor(rng() * 3);
    for (let k = 0; k < puffs; k += 1) {
      const s = range(rng, 26, 60);
      const puff = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 8), cloudMat);
      puff.scale.y = 0.45;
      puff.position.set(range(rng, -70, 70), range(rng, -8, 8), range(rng, -30, 30));
      group.add(puff);
    }
    group.position.set(range(rng, -1700, 1700), range(rng, 320, 520), range(rng, -1700, 1700));
    group.userData.speed = range(rng, 2, 5);
    scene.add(group);
    clouds.push(group);
  }

  function setDusk(t) {
    // t in [0, 1]: 0 is midday, 1 is dusk. Warms the light and dims the dome.
    sun.color.setHex(0xfff2d8).lerp(new THREE.Color(0xff8a3d), t);
    sun.intensity = 2.4 - t * 1.2;
    dome.material.color.setScalar(1 - t * 0.45);
    disc.material.color.setHex(0xfff6c8).lerp(new THREE.Color(0xff6a2a), t);
  }

  function step(dt) {
    for (const cloud of clouds) {
      cloud.position.x += cloud.userData.speed * dt;
      if (cloud.position.x > 1900) cloud.position.x = -1900;
    }
  }

  return { setDusk, step };
}
