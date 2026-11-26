// The ring course: amber torus gates hung over the river, the farmland and the
// hills, one after the next, always reachable from the runway. A ring is passed
// when the plane crosses its plane within its radius; threading the middle
// earns a centre bonus. Rings are rebuilt per sortie from the mission's seed.
import * as THREE from 'three';
import { RINGS } from './config.js';
import { heightAt } from './terrain.js';
import { mulberry32, range } from './random.js';

export function buildRings(scene, mission, sortieIndex) {
  const rng = mulberry32(9000 + sortieIndex * 131 + mission.rings * 17);
  const group = new THREE.Group();
  const rings = [];
  // The course wanders: start near the runway, follow the river south, swing
  // east over the town, then climb back over the ridge toward the field.
  const waypoints = courseWaypoints(mission, rng);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffb02e });
  const matNext = new THREE.MeshBasicMaterial({ color: 0xffe08a });
  const matDone = new THREE.MeshBasicMaterial({ color: 0x37c978 });
  waypoints.forEach((wp, i) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(RINGS.radius, RINGS.tube, 10, 28), mat);
    ring.position.set(wp.x, wp.y, wp.z);
    // Face the ring along the course direction.
    const next = waypoints[Math.min(i + 1, waypoints.length - 1)];
    const prev = waypoints[Math.max(i - 1, 0)];
    const dir = new THREE.Vector3(next.x - prev.x, next.y - prev.y, next.z - prev.z).normalize();
    ring.lookAt(ring.position.clone().add(dir));
    ring.userData.index = i;
    group.add(ring);
    // A small floating beacon above each ring so the next gate is easy to spot.
    const beacon = new THREE.Mesh(
      new THREE.ConeGeometry(3, 9, 6),
      new THREE.MeshBasicMaterial({ color: 0xffd23e }),
    );
    beacon.position.set(wp.x, wp.y + RINGS.radius + 14, wp.z);
    beacon.rotation.x = Math.PI;
    group.add(beacon);
    rings.push({ x: wp.x, y: wp.y, z: wp.z, dir, mesh: ring, beacon, passed: false, centre: false });
  });
  scene.add(group);
  return {
    rings,
    nextIndex: 0,
    setState(index, state) {
      // state: 'next' | 'done' | 'idle' — recolour the ring so the pilot can
      // always tell which gate is theirs.
      const ring = rings[index];
      if (!ring) return;
      ring.mesh.material = state === 'done' ? matDone : state === 'next' ? matNext : mat;
    },
    // Returns the ring just passed, or null. Call every frame with the plane.
    checkPass(px, py, pz, prevZ) {
      const ring = rings[this.nextIndex];
      if (!ring || ring.passed) return null;
      const dx = px - ring.x;
      const dy = py - ring.y;
      const dz = pz - ring.z;
      // Distance from the ring's centre plane, along its facing direction.
      const along = dx * ring.dir.x + dy * ring.dir.y + dz * ring.dir.z;
      const radial = Math.sqrt(Math.max(0, dx * dx + dy * dy + dz * dz - along * along));
      // Crossed the plane this frame and inside the hoop.
      if (Math.abs(along) < 6 && radial < RINGS.radius) {
        ring.passed = true;
        ring.centre = radial < RINGS.radius * 0.45;
        this.nextIndex += 1;
        return ring;
      }
      return null;
    },
    dispose() {
      scene.remove(group);
    },
  };
}

function courseWaypoints(mission, rng) {
  const points = [];
  // Leg 1: down the river valley, south.
  const riverLeg = Math.ceil(mission.rings * 0.45);
  for (let i = 0; i < riverLeg; i += 1) {
    const t = (i + 1) / (riverLeg + 1);
    points.push({
      x: -560 + range(rng, -90, 90),
      y: range(rng, mission.ringFloor, mission.ringCeiling),
      z: 620 - t * 1500,
    });
  }
  // Leg 2: east over the farmland and the town.
  const farmLeg = Math.ceil(mission.rings * 0.35);
  for (let i = 0; i < farmLeg; i += 1) {
    const t = (i + 1) / (farmLeg + 1);
    points.push({
      x: -560 + t * 1100,
      y: range(rng, mission.ringFloor, mission.ringCeiling),
      z: -880 + range(rng, -160, 160) + t * 700,
    });
  }
  // Leg 3: back over the ridge toward the airfield.
  while (points.length < mission.rings) {
    const t = (points.length - riverLeg - farmLeg + 1) / (mission.rings - riverLeg - farmLeg + 1);
    points.push({
      x: 540 - t * 540 + range(rng, -80, 80),
      y: range(rng, mission.ringFloor + 10, mission.ringCeiling + 20),
      z: -180 + t * 800,
    });
  }
  // Keep every ring clear of the ground.
  for (const p of points) {
    p.y = Math.max(p.y, heightAt(p.x, p.z) + RINGS.radius + 12);
  }
  return points;
}
