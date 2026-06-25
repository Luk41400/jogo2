import * as THREE from "three";

const canvas = document.querySelector("#game-canvas");
const speedValue = document.querySelector("#speed-value");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87a6b8);
scene.fog = new THREE.Fog(0x87a6b8, 45, 210);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const camera = new THREE.PerspectiveCamera(64, 1, 0.1, 700);
camera.position.set(0, 7, -12);

const clock = new THREE.Clock();
const keys = new Set();

const carState = {
  speed: 0,
  heading: 0,
  steerVisual: 0,
  previousHeading: 0,
};

const CONFIG = {
  maxForwardSpeed: 48,
  maxReverseSpeed: -14,
  acceleration: 30,
  brakeForce: 46,
  reverseAcceleration: 18,
  drag: 1.65,
  rollingResistance: 3.2,
  steeringPower: 2.15,
  trackHalfWidth: 8.5,
  cameraBaseDistance: 13,
  cameraSpeedDistance: 6,
  cameraHeight: 6,
};

setupLights();
const world = createWorld();
scene.add(world);

const car = createCar();
scene.add(car);

window.addEventListener("keydown", (event) => {
  keys.add(event.code);
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

window.addEventListener("resize", resize);
resize();
animate();

function setupLights() {
  const sun = new THREE.DirectionalLight(0xffffff, 2.8);
  sun.position.set(-35, 70, -25);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 180;
  sun.shadow.camera.left = -90;
  sun.shadow.camera.right = 90;
  sun.shadow.camera.top = 90;
  sun.shadow.camera.bottom = -90;
  scene.add(sun);

  scene.add(new THREE.HemisphereLight(0xcfe9ff, 0x243018, 1.6));
}

function createWorld() {
  const group = new THREE.Group();

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(420, 420, 42, 42),
    new THREE.MeshStandardMaterial({
      color: 0x253324,
      roughness: 0.92,
      metalness: 0,
    }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  const grid = new THREE.GridHelper(420, 84, 0x5d725e, 0x344637);
  grid.position.y = 0.018;
  group.add(grid);

  createTrack(group);
  createSpeedMarkers(group);
  return group;
}

function createTrack(group) {
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(CONFIG.trackHalfWidth * 2, 420),
    new THREE.MeshStandardMaterial({
      color: 0x24292c,
      roughness: 0.78,
      metalness: 0.03,
    }),
  );
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.03;
  road.receiveShadow = true;
  group.add(road);

  const shoulderMaterial = new THREE.MeshStandardMaterial({
    color: 0xbfc8c0,
    roughness: 0.8,
  });

  [-CONFIG.trackHalfWidth, CONFIG.trackHalfWidth].forEach((x) => {
    const shoulder = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.08, 420),
      shoulderMaterial,
    );
    shoulder.position.set(x, 0.08, 0);
    shoulder.receiveShadow = true;
    group.add(shoulder);
  });

  const centerMaterial = new THREE.MeshStandardMaterial({
    color: 0xf2d64b,
    roughness: 0.55,
  });

  for (let z = -200; z <= 200; z += 14) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.055, 7), centerMaterial);
    stripe.position.set(0, 0.085, z);
    stripe.receiveShadow = true;
    group.add(stripe);
  }
}

function createSpeedMarkers(group) {
  const postMaterial = new THREE.MeshStandardMaterial({
    color: 0xe9eef2,
    roughness: 0.45,
  });
  const capMaterial = new THREE.MeshStandardMaterial({
    color: 0xff3d28,
    roughness: 0.5,
  });

  for (let z = -205; z <= 205; z += 12) {
    [-13, 13].forEach((x) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.7, 10), postMaterial);
      post.position.set(x, 1.35, z);
      post.castShadow = true;
      group.add(post);

      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.24, 0.24), capMaterial);
      cap.position.set(x, 2.8, z);
      cap.castShadow = true;
      group.add(cap);
    });
  }

  const obstacleMaterial = new THREE.MeshStandardMaterial({
    color: 0x16191c,
    roughness: 0.5,
  });

  [
    [-5.8, -75],
    [5.5, -22],
    [-5.4, 48],
    [5.8, 112],
  ].forEach(([x, z]) => {
    const tireStack = new THREE.Group();
    for (let i = 0; i < 4; i += 1) {
      const tire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.7, 0.7, 0.38, 24),
        obstacleMaterial,
      );
      tire.rotation.z = Math.PI / 2;
      tire.position.y = 0.22 + i * 0.4;
      tire.castShadow = true;
      tire.receiveShadow = true;
      tireStack.add(tire);
    }
    tireStack.position.set(x, 0, z);
    group.add(tireStack);
  });
}

function createCar() {
  const group = new THREE.Group();

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x1f7aff,
    roughness: 0.28,
    metalness: 0.35,
  });
  const cabinMaterial = new THREE.MeshStandardMaterial({
    color: 0x101820,
    roughness: 0.22,
    metalness: 0.15,
  });
  const wheelMaterial = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.75,
  });
  const lightMaterial = new THREE.MeshStandardMaterial({
    color: 0xfff4b8,
    emissive: 0xffda6a,
    emissiveIntensity: 1.8,
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.72, 4.4), bodyMaterial);
  body.position.y = 0.72;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.34, 1.6), bodyMaterial);
  hood.position.set(0, 1.14, 0.92);
  hood.castShadow = true;
  group.add(hood);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.76, 1.65), cabinMaterial);
  cabin.position.set(0, 1.35, -0.58);
  cabin.castShadow = true;
  group.add(cabin);

  [-0.82, 0.82].forEach((x) => {
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.18, 0.08), lightMaterial);
    light.position.set(x, 0.82, 2.24);
    group.add(light);
  });

  [
    [-1.22, 0.45, 1.35],
    [1.22, 0.45, 1.35],
    [-1.22, 0.45, -1.35],
    [1.22, 0.45, -1.35],
  ].forEach(([x, y, z]) => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.34, 24), wheelMaterial);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, y, z);
    wheel.castShadow = true;
    group.add(wheel);
  });

  group.position.set(0, 0, -45);
  return group;
}

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.033);

  updateCar(delta);
  updateCamera(delta);
  updateHud();

  renderer.render(scene, camera);
}

function updateCar(delta) {
  const throttle = isPressed("KeyW", "ArrowUp") ? 1 : 0;
  const brake = isPressed("KeyS", "ArrowDown") ? 1 : 0;
  const steerInput = Number(isPressed("KeyA", "ArrowLeft")) - Number(isPressed("KeyD", "ArrowRight"));

  if (throttle) {
    const speedRatio = THREE.MathUtils.clamp(carState.speed / CONFIG.maxForwardSpeed, 0, 1);
    carState.speed += CONFIG.acceleration * (1 - speedRatio * 0.45) * delta;
  }

  if (brake) {
    if (carState.speed > 0.7) {
      carState.speed -= CONFIG.brakeForce * delta;
    } else {
      carState.speed -= CONFIG.reverseAcceleration * delta;
    }
  }

  if (!throttle && !brake) {
    const resistance = CONFIG.rollingResistance + Math.abs(carState.speed) * CONFIG.drag;
    carState.speed = moveToward(carState.speed, 0, resistance * delta);
  }

  carState.speed = THREE.MathUtils.clamp(
    carState.speed,
    CONFIG.maxReverseSpeed,
    CONFIG.maxForwardSpeed,
  );

  const speedFactor = THREE.MathUtils.clamp(Math.abs(carState.speed) / CONFIG.maxForwardSpeed, 0, 1);
  const minimumGrip = speedFactor > 0.025 ? 0.2 : 0;
  const turnAmount = steerInput * (minimumGrip + speedFactor * 0.8) * CONFIG.steeringPower * delta;
  carState.heading += turnAmount * Math.sign(carState.speed || 1);
  carState.steerVisual = THREE.MathUtils.lerp(carState.steerVisual, steerInput, 8 * delta);

  const forward = new THREE.Vector3(Math.sin(carState.heading), 0, Math.cos(carState.heading));
  car.position.addScaledVector(forward, carState.speed * delta);
  car.rotation.y = carState.heading;
  car.rotation.z = -carState.steerVisual * speedFactor * 0.12;

  const roadLimit = CONFIG.trackHalfWidth - 1.4;
  if (Math.abs(car.position.x) > roadLimit) {
    car.position.x = THREE.MathUtils.clamp(car.position.x, -roadLimit, roadLimit);
    carState.speed *= 0.94;
  }

  if (car.position.z > 205) car.position.z = -205;
  if (car.position.z < -205) car.position.z = 205;
}

function updateCamera(delta) {
  const speedRatio = THREE.MathUtils.clamp(Math.abs(carState.speed) / CONFIG.maxForwardSpeed, 0, 1);
  const turnVelocity = angleDifference(carState.heading, carState.previousHeading) / Math.max(delta, 0.0001);
  carState.previousHeading = carState.heading;

  const forward = new THREE.Vector3(Math.sin(carState.heading), 0, Math.cos(carState.heading));
  const side = new THREE.Vector3(Math.cos(carState.heading), 0, -Math.sin(carState.heading));
  const cameraDistance = CONFIG.cameraBaseDistance + CONFIG.cameraSpeedDistance * speedRatio;
  const targetPosition = car.position
    .clone()
    .addScaledVector(forward, -cameraDistance)
    .addScaledVector(side, -turnVelocity * 1.05)
    .add(new THREE.Vector3(0, CONFIG.cameraHeight + speedRatio * 1.35, 0));

  const lookTarget = car.position
    .clone()
    .addScaledVector(forward, 7 + speedRatio * 7)
    .add(new THREE.Vector3(0, 1.25, 0));

  camera.position.lerp(targetPosition, 1 - Math.exp(-4.7 * delta));
  camera.lookAt(lookTarget);

  const fovTarget = 64 + speedRatio * 12;
  camera.fov = THREE.MathUtils.lerp(camera.fov, fovTarget, 1 - Math.exp(-3.6 * delta));
  camera.rotation.z += THREE.MathUtils.clamp(-turnVelocity * 0.035, -0.07, 0.07);
  camera.updateProjectionMatrix();
}

function updateHud() {
  const kmh = Math.round(Math.abs(carState.speed) * 3.6);
  speedValue.textContent = String(kmh).padStart(3, "0");
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function isPressed(...codes) {
  return codes.some((code) => keys.has(code));
}

function moveToward(value, target, maxDelta) {
  if (Math.abs(target - value) <= maxDelta) return target;
  return value + Math.sign(target - value) * maxDelta;
}

function angleDifference(a, b) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}
