// src/main.js
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
camera.position.set(-0.6, 0.5, 0);

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
