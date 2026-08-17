import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import GUI from "lil-gui";
import "./style.css";

/*
 * Units: the 3D scene works in millimetres (mm) internally — one three.js
 * unit = 1mm. Panel inputs follow common trade convention: timber
 * cross-sections are entered in cm ("12x4" = a 120x40mm bearer) while
 * lengths and spacings are entered in mm. Every mesh position/size below is
 * derived from `params`, so changing a value in the panel recalculates
 * every location and distance in the scene.
 */
const params = {
  posts: {
    spacing: 1000, // distance between the two post cubes, mm (100cm)
    size: 200, // cube edge length, mm
  },
  foundation: {
    width: 12, // cross-section width, cm (120mm)
    height: 4, // cross-section height, cm (40mm)
    length: 5000, // beam length, mm
  },
  view: {
    grid: true,
    labels: true,
  },
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x14181d);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  50000
);

const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = "absolute";
labelRenderer.domElement.style.top = "0";
labelRenderer.domElement.style.left = "0";
labelRenderer.domElement.style.pointerEvents = "none";
document.getElementById("app").appendChild(labelRenderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
// Explicit touch mapping: one finger rotates, two fingers pinch-zoom + pan.
controls.touches = {
  ONE: THREE.TOUCH.ROTATE,
  TWO: THREE.TOUCH.DOLLY_PAN,
};
controls.mouseButtons = {
  LEFT: THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.PAN,
};

const hemi = new THREE.HemisphereLight(0xffffff, 0x2a2f36, 1.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(300, 500, 200);
scene.add(sun);

let grid = null;
const group = new THREE.Group();
scene.add(group);

const postMaterial = new THREE.MeshStandardMaterial({ color: 0x4f8ff0, roughness: 0.5, metalness: 0.1 });
const foundationMaterial = new THREE.MeshStandardMaterial({ color: 0xb08a5c, roughness: 0.8, metalness: 0.0 });
const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x0a0d10 });

function makeBox(width, height, depth, material) {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const mesh = new THREE.Mesh(geometry, material);
  const edges = new THREE.EdgesGeometry(geometry);
  const line = new THREE.LineSegments(edges, edgeMaterial);
  mesh.add(line);
  return mesh;
}

function makeLabel(text) {
  const div = document.createElement("div");
  div.className = "dim-label";
  div.textContent = text;
  return new CSS2DObject(div);
}

function fmt(mm) {
  if (Math.abs(mm) >= 1000) return `${(mm / 1000).toFixed(2)} m`;
  return `${mm.toFixed(0)} mm`;
}

/** Rebuilds the whole scene from `params`. All positions are computed here. */
function rebuild() {
  group.clear();
  if (grid) {
    scene.remove(grid);
    grid.geometry.dispose();
    grid.material.dispose();
    grid = null;
  }

  const { spacing, size } = params.posts;
  // Cross-section is entered in cm (trade shorthand, e.g. "12x4" = 120x40mm); convert to mm.
  const fw = params.foundation.width * 10;
  const fh = params.foundation.height * 10;
  const fl = params.foundation.length;

  // Post cubes: centred on the origin along X, sitting on the ground (y = 0).
  const postA = makeBox(size, size, size, postMaterial);
  postA.position.set(-spacing / 2, size / 2, 0);
  const postB = makeBox(size, size, size, postMaterial);
  postB.position.set(spacing / 2, size / 2, 0);
  group.add(postA, postB);

  // Foundation beam: centred on the origin, running along X, resting on the ground.
  const foundation = makeBox(fl, fh, fw, foundationMaterial);
  foundation.position.set(0, fh / 2, 0);
  group.add(foundation);

  if (params.view.labels) {
    const spacingLabel = makeLabel(`spacing ${fmt(spacing)}`);
    spacingLabel.position.set(0, size + 6, 0);
    group.add(spacingLabel);

    const lengthLabel = makeLabel(`foundation ${fmt(fl)} (${params.foundation.width}×${params.foundation.height} cm)`);
    lengthLabel.position.set(0, fh + 14, fw / 2 + 6);
    group.add(lengthLabel);
  }

  if (params.view.grid) {
    const gridSize = Math.max(fl * 1.4, spacing * 4, 1000);
    grid = new THREE.GridHelper(gridSize, Math.round(gridSize / 50), 0x30363f, 0x22262c);
    scene.add(grid);
  }

  if (!rebuild.hasFramed) {
    frameCamera();
    rebuild.hasFramed = true;
  }
}

/** Fits the camera to the current group's bounding box (call on load or on demand). */
function frameCamera() {
  const box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 100);

  const fov = (camera.fov * Math.PI) / 180;
  const distance = (maxDim / 2 / Math.tan(fov / 2)) * 1.6;

  const dir = new THREE.Vector3(0.6, 0.55, 0.9).normalize();
  camera.position.copy(center).add(dir.multiplyScalar(distance));
  camera.near = Math.max(distance / 1000, 0.1);
  camera.far = distance * 10 + maxDim * 4;
  camera.updateProjectionMatrix();

  controls.target.copy(center);
  controls.update();
}

rebuild();

// ---------- Parameter panel (togglable) ----------
const gui = new GUI({ title: "Parameters" });

const postsFolder = gui.addFolder("Posts (cubes)");
postsFolder.add(params.posts, "spacing", 100, 20000, 10).name("spacing (mm)").onChange(rebuild);
postsFolder.add(params.posts, "size", 50, 1000, 10).name("cube size (mm)").onChange(rebuild);

const foundationFolder = gui.addFolder("Foundation (beam)");
foundationFolder.add(params.foundation, "width", 1, 40, 1).name("width (cm)").onChange(rebuild);
foundationFolder.add(params.foundation, "height", 1, 40, 1).name("height (cm)").onChange(rebuild);
foundationFolder.add(params.foundation, "length", 100, 20000, 10).name("length (mm)").onChange(rebuild);

const viewFolder = gui.addFolder("View");
viewFolder.add(params.view, "grid").name("show grid").onChange(rebuild);
viewFolder.add(params.view, "labels").name("show labels").onChange(rebuild);
viewFolder.add({ reset: () => frameCamera() }, "reset").name("reset view");

let panelVisible = true;
function togglePanel() {
  panelVisible = !panelVisible;
  gui.domElement.style.display = panelVisible ? "" : "none";
}

const toggleButton = document.createElement("button");
toggleButton.id = "panel-toggle";
toggleButton.textContent = "☰";
toggleButton.title = "Toggle parameter panel (P)";
toggleButton.addEventListener("click", togglePanel);
document.getElementById("app").appendChild(toggleButton);

window.addEventListener("keydown", (event) => {
  if (event.key === "p" || event.key === "P") togglePanel();
});

// ---------- Resize + render loop ----------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}
animate();
