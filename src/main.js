/* // src/main.js
import "./style.css";
import * as THREE from "three";
import { SplatMesh, SparkControls } from "@sparkjsdev/spark";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const scene = new THREE.Scene();

// ---------- Camera ----------
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.05,
  2000,
);

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.style.margin = "0";
document.body.appendChild(renderer.domElement);

// ---------- Gaussian Splat ----------
const splat = new SplatMesh({ url: "/splats/Jardin17_1m_30k.sog" });
splat.rotateZ(Math.PI);
scene.add(splat);

// ---------- Controls ----------
const controls = new SparkControls({ canvas: renderer.domElement });

// ---------- Walkable floor (GLB) ----------
const loader = new GLTFLoader();
const walkables = [];
const SHOW_HITBOX = false;

loader.load(
  "/models/hitbox.glb",
  (gltf) => {
    const root = gltf.scene;

    root.traverse((obj) => {
      if (!obj.isMesh) return;

      obj.geometry.computeBoundingBox?.();
      obj.geometry.computeBoundingSphere?.();

      walkables.push(obj);

      if (!SHOW_HITBOX) obj.visible = false;
      else obj.material = new THREE.MeshBasicMaterial({ wireframe: true });
    });

    scene.add(root);
    console.log("Hitbox GLB cargado. Walkables:", walkables.length);
  },
  undefined,
  (err) => console.error("Error cargando hitbox.glb:", err),
);

// ---------- “No volar / no salir de la malla” ----------
const raycaster = new THREE.Raycaster();
const down = new THREE.Vector3(0, -1, 0);

const EYE_HEIGHT = 0.75;
const RAY_START = 0.0;
const MAX_DROP = 30;
const SMOOTHING = 0.35;

let lastValidFloorY = null;

function getFloorYAt(x, y, z) {
  if (walkables.length === 0) return null;

  const origin = new THREE.Vector3(x, y + RAY_START, z);
  raycaster.set(origin, down);
  raycaster.far = MAX_DROP;

  const hits = raycaster.intersectObjects(walkables, true);
  return hits.length ? hits[0].point.y : null;
}

function stickAndClampToWalkable(prevPos) {
  const floorY = getFloorYAt(
    camera.position.x,
    camera.position.y,
    camera.position.z,
  );

  if (floorY == null) {
    camera.position.x = prevPos.x;
    camera.position.z = prevPos.z;

    if (lastValidFloorY != null) {
      const targetY = lastValidFloorY + EYE_HEIGHT;
      camera.position.y = THREE.MathUtils.lerp(
        camera.position.y,
        targetY,
        SMOOTHING,
      );
    }
    return;
  }

  lastValidFloorY = floorY;
  const targetY = floorY + EYE_HEIGHT;
  camera.position.y = THREE.MathUtils.lerp(
    camera.position.y,
    targetY,
    SMOOTHING,
  );
}

// ---------- Walk speed (post-scale movement) ----------
const WALK_SPEED_MULT = 0.3; // 👈 1.0 = normal, 0.35 = más lento, prueba 0.2–0.6

function applyWalkSpeed(prevPos) {
  const delta = camera.position.clone().sub(prevPos);

  // No afectes Y aquí (la Y la controla el “stick to floor”)
  delta.y = 0;

  // Escala movimiento horizontal
  camera.position.copy(prevPos).add(delta.multiplyScalar(WALK_SPEED_MULT));
}

// ---------- Resize ----------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Loop ----------
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);

  // 1) Guarda la posición antes del movimiento
  const prevPos = camera.position.clone();

  // 2) Deja que SparkControls mueva la cámara
  controls.update(camera);

  // 3) Reduce la velocidad del movimiento horizontal
  applyWalkSpeed(prevPos);

  // 4) Mantente sobre la malla (y evita salirte)
  stickAndClampToWalkable(prevPos);
});
 */
////

// src/main.js
import "./style.css";
import * as THREE from "three";
import { SplatMesh } from "@sparkjsdev/spark";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";

// ========== Scene Setup ==========
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.05,
  2000,
);
camera.position.set(-0.6, 0.5, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.style.margin = "0";
document.body.appendChild(renderer.domElement);

// ========== Gaussian Splat ==========
const splat = new SplatMesh({ url: "/splats/Jardin17_1m_30k.sog" });
splat.rotateZ(Math.PI);
scene.add(splat);

// ========== FPS Controls ==========
const controls = new PointerLockControls(camera, renderer.domElement);

// Click to lock pointer
renderer.domElement.addEventListener("click", () => {
  controls.lock();
});

// ========== Walkable Floor (Collision) ==========
const loader = new GLTFLoader();
const walkables = [];
const SHOW_HITBOX = true; // Set to true to debug collision mesh

loader.load(
  "/models/hitbox.glb",
  (gltf) => {
    const root = gltf.scene;

    root.traverse((obj) => {
      if (!obj.isMesh) return;

      obj.geometry.computeBoundingBox?.();
      obj.geometry.computeBoundingSphere?.();
      walkables.push(obj);

      if (!SHOW_HITBOX) {
        obj.visible = false;
      } else {
        obj.material = new THREE.MeshBasicMaterial({ wireframe: true });
      }
    });

    scene.add(root);
    console.log("Collision mesh loaded. Walkables:", walkables.length);
  },
  undefined,
  (err) => console.error("Error loading hitbox.glb:", err),
);

// ========== Movement Configuration ==========
const EYE_HEIGHT = 0.7; // Camera height above floor
const MAX_RAYCAST_DIST = 30; // Max distance to check for floor
const MOVE_SPEED = 0.015; // Units per frame (ajusta esto para velocidad)

// ========== Keyboard Input ==========
const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
};

window.addEventListener("keydown", (e) => {
  switch (e.code) {
    case "KeyW":
    case "ArrowUp":
      keys.forward = true;
      break;
    case "KeyS":
    case "ArrowDown":
      keys.backward = true;
      break;
    case "KeyA":
    case "ArrowLeft":
      keys.left = true;
      break;
    case "KeyD":
    case "ArrowRight":
      keys.right = true;
      break;
  }
});

window.addEventListener("keyup", (e) => {
  switch (e.code) {
    case "KeyW":
    case "ArrowUp":
      keys.forward = false;
      break;
    case "KeyS":
    case "ArrowDown":
      keys.backward = false;
      break;
    case "KeyA":
    case "ArrowLeft":
      keys.left = false;
      break;
    case "KeyD":
    case "ArrowRight":
      keys.right = false;
      break;
  }
});

// ========== Floor Detection ==========
const raycaster = new THREE.Raycaster();
const downVector = new THREE.Vector3(0, -1, 0);

function getFloorHeight(x, z) {
  if (walkables.length === 0) return null;

  // Cast ray from above the position
  const origin = new THREE.Vector3(x, 100, z);
  raycaster.set(origin, downVector);
  raycaster.far = MAX_RAYCAST_DIST + 100;

  const hits = raycaster.intersectObjects(walkables, true);
  return hits.length > 0 ? hits[0].point.y : null;
}

// ========== Movement System ==========
const moveDirection = new THREE.Vector3();
const sideDirection = new THREE.Vector3();

function updateMovement() {
  if (!controls.isLocked) return;

  // Get camera's horizontal direction (ignore pitch)
  const cameraDirection = new THREE.Vector3();
  camera.getWorldDirection(cameraDirection);
  cameraDirection.y = 0; // Project to horizontal plane
  cameraDirection.normalize();

  // Get perpendicular direction for strafing
  const cameraRight = new THREE.Vector3();
  cameraRight.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0));
  cameraRight.normalize();

  // Calculate movement vector based on keys
  moveDirection.set(0, 0, 0);

  if (keys.forward) moveDirection.add(cameraDirection);
  if (keys.backward) moveDirection.sub(cameraDirection);
  if (keys.right) moveDirection.add(cameraRight);
  if (keys.left) moveDirection.sub(cameraRight);

  // Normalize to prevent faster diagonal movement
  if (moveDirection.length() > 0) {
    moveDirection.normalize();
    moveDirection.multiplyScalar(MOVE_SPEED);

    // Store previous position
    const prevX = camera.position.x;
    const prevZ = camera.position.z;

    // Try to move
    camera.position.x += moveDirection.x;
    camera.position.z += moveDirection.z;

    // Check if new position is valid
    const floorY = getFloorHeight(camera.position.x, camera.position.z);

    if (floorY === null) {
      // Out of bounds - revert
      camera.position.x = prevX;
      camera.position.z = prevZ;
    } else {
      // Valid position - snap to floor height
      camera.position.y = floorY + EYE_HEIGHT;
    }
  }
}

// ========== Window Resize ==========
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ========== Animation Loop ==========
renderer.setAnimationLoop(() => {
  updateMovement();
  renderer.render(scene, camera);
});
