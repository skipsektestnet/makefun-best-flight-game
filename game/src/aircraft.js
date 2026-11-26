// Kutilang One, a light prop plane built from primitives: a cream fuselage
// with a red cheatline, a high wing, tail feathers, a spinning prop and lit
// navigation lights, so the aircraft reads clearly in both chase and cockpit
// views. buildPlane returns the group plus handles the flight code animates.
import * as THREE from 'three';

export function buildPlane() {
  const group = new THREE.Group();
  const cream = new THREE.MeshLambertMaterial({ color: 0xf2ead8 });
  const red = new THREE.MeshLambertMaterial({ color: 0xc23b2e });
  const dark = new THREE.MeshLambertMaterial({ color: 0x2e3438 });
  const glass = new THREE.MeshLambertMaterial({ color: 0x9fd4ef, emissive: 0x274b5e });

  // Fuselage: a stretched cylinder with a rounded nose.
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.75, 7.2, 12), cream);
  body.rotation.x = Math.PI / 2;
  body.castShadow = true;
  group.add(body);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1.05, 12, 10), cream);
  nose.position.z = -3.6;
  nose.scale.set(1, 1, 0.7);
  group.add(nose);
  // Red cheatline along the side.
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 6.4), red);
  stripe.position.set(1.02, -0.1, 0.1);
  group.add(stripe);
  const stripe2 = stripe.clone();
  stripe2.position.x = -1.02;
  group.add(stripe2);

  // Canopy: a glass bubble the pilot sits under.
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.85, 12, 10), glass);
  canopy.scale.set(0.95, 0.8, 1.7);
  canopy.position.set(0, 0.85, -1.1);
  group.add(canopy);

  // High wing and tailplane.
  const wing = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.22, 1.9), cream);
  wing.position.set(0, 0.75, -0.4);
  wing.castShadow = true;
  group.add(wing);
  const wingTipL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 1.9), red);
  wingTipL.position.set(-5.7, 0.75, -0.4);
  group.add(wingTipL);
  const wingTipR = wingTipL.clone();
  wingTipR.position.x = 5.7;
  group.add(wingTipR);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.18, 1.3), cream);
  tail.position.set(0, 0.35, 3.4);
  group.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.9, 1.5), red);
  fin.position.set(0, 1.15, 3.5);
  group.add(fin);

  // Propeller: a hub and two blades on a spinner group that spins in flight.
  const spinner = new THREE.Group();
  spinner.position.set(0, 0, -4.35);
  const hub = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.1, 10), red);
  hub.rotation.x = -Math.PI / 2;
  spinner.add(hub);
  const bladeMat = new THREE.MeshLambertMaterial({ color: 0x1e2226 });
  const bladeGeo = new THREE.BoxGeometry(0.28, 2.6, 0.12);
  const blade1 = new THREE.Mesh(bladeGeo, bladeMat);
  spinner.add(blade1);
  const blade2 = new THREE.Mesh(bladeGeo, bladeMat);
  blade2.rotation.z = Math.PI / 2;
  spinner.add(blade2);
  group.add(spinner);

  // Fixed gear: three little wheels.
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x181c1f });
  for (const [x, z] of [[-1.15, -1.4], [1.15, -1.4], [0, 2.6]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 6), dark);
    leg.position.set(x, -1.1, z);
    group.add(leg);
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, -1.65, z);
    group.add(wheel);
  }

  // Navigation lights: red left, green right, white tail — small glowing spheres.
  const lights = {};
  const nav = [
    ['left', -5.7, 0xff2a2a, -5.7, 0.75, -0.4],
    ['right', 5.7, 0x2aff66, 5.7, 0.75, -0.4],
    ['tail', 0, 0xffffff, 0, 0.4, 4.1],
  ];
  for (const [name, , colour, x, y, z] of nav) {
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 8, 6),
      new THREE.MeshBasicMaterial({ color: colour }),
    );
    lamp.position.set(x, y, z);
    group.add(lamp);
    lights[name] = lamp;
  }
  // A warm landing light under the nose, lit on the ground and on approach.
  const landing = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0 }),
  );
  landing.position.set(0, -0.9, -3.4);
  group.add(landing);
  lights.landing = landing;

  return { group, spinner, lights };
}
