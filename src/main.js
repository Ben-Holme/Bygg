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
/*
 * The two foundation beams are already installed in the ground — they're the
 * footing for this staircase (not a deck), so they stay at ground level. The
 * stair climbs along X, on top of them: each "step" is a tread-support beam
 * spanning across (Z) from one foundation beam to the other, sitting higher
 * than the last by one riser, held up by a construction post at each end.
 */
const params = {
  layout: {
    spacing: 1000, // centre-to-centre distance between the two foundation beams, mm (100cm) — also the stair width
  },
  foundation: {
    width: 4, // cross-section width, cm (40mm)
    height: 12, // cross-section height, cm (120mm)
    length: 5000, // beam length, mm
  },
  steps: {
    smallCount: 4, // number of small-tread steps in the middle section
    width: 4, // tread-support cross-section width (along X), cm
    height: 9, // tread-support cross-section height, cm
    largeTread: 28, // tread depth (X) of each of the 4 large steps — 2 at the bottom, 2 at the top, cm
    smallTread: 15, // tread depth (X) of each small step in the middle section, cm
    totalHeight: 900, // total rise from the foundation top to the top step, mm
  },
  posts: {
    size: 9, // square construction-post cross-section, cm — one under each end of every step
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
group.rotation.y = Math.PI / 2; // rotate the whole staircase 90° about the vertical axis
scene.add(group);

const foundationMaterial = new THREE.MeshStandardMaterial({ color: 0xb08a5c, roughness: 0.8, metalness: 0.0 });
const stepMaterial = new THREE.MeshStandardMaterial({ color: 0xd9b789, roughness: 0.8, metalness: 0.0 });
const postMaterial = new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.6, metalness: 0.2 });
const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x0a0d10 });
const dimensionMaterial = new THREE.LineDashedMaterial({ color: 0xf5c451, dashSize: 20, gapSize: 12 });

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

  const { spacing } = params.layout;
  // Cross-section is entered in cm (trade shorthand, e.g. "12x4" = 120x40mm); convert to mm.
  const fw = params.foundation.width * 10;
  const fh = params.foundation.height * 10;
  const fl = params.foundation.length;

  // Two foundation beams, already installed in the ground — they stay flat at ground
  // level and run along X, parallel and centred on the origin along Z.
  const beamA = makeBox(fl, fh, fw, foundationMaterial);
  beamA.position.set(0, fh / 2, -spacing / 2);
  const beamB = makeBox(fl, fh, fw, foundationMaterial);
  beamB.position.set(0, fh / 2, spacing / 2);
  group.add(beamA, beamB);

  // Dimension line showing the centre-to-centre spacing between the two beams.
  const dimGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, fh + 20, -spacing / 2),
    new THREE.Vector3(0, fh + 20, spacing / 2),
  ]);
  const dimLine = new THREE.Line(dimGeometry, dimensionMaterial);
  dimLine.computeLineDistances();
  group.add(dimLine);

  // Steps: tread-support beams spanning across (Z) between the two foundation beams,
  // climbing from +X toward -X. Two large-tread steps, then the small-tread middle
  // section, then two more large-tread steps — symmetric, equal risers (code requires
  // uniform risers; "large" vs "small" only changes tread depth, i.e. step spacing).
  const sw = params.steps.width * 10;
  const sh = params.steps.height * 10;
  const smallCount = Math.max(1, Math.round(params.steps.smallCount));
  const largeTread = params.steps.largeTread * 10;
  const smallTread = params.steps.smallTread * 10;
  const totalHeight = params.steps.totalHeight;
  const stepSpan = spacing + fw; // reaches the outer edge of both foundation beams
  const postSize = params.posts.size * 10;

  const treadDepths = [largeTread, largeTread, ...Array(smallCount).fill(smallTread), largeTread, largeTread];
  const stepCount = treadDepths.length;
  const riser = totalHeight / stepCount;

  let cumX = fl / 2; // steps climb from one end of the foundation beams (x = +fl/2) toward -X
  for (let i = 0; i < stepCount; i++) {
    cumX -= treadDepths[i];
    const stepY = (i + 1) * riser; // riser 1 at the first step, up to totalHeight at the last

    const tread = makeBox(sw, sh, stepSpan, stepMaterial);
    tread.position.set(cumX, stepY + sh / 2, 0);
    group.add(tread);

    // Construction post at each end, carrying this step's load down to the foundation top.
    const postHeight = stepY - fh;
    if (postHeight > 1) {
      for (const z of [-spacing / 2, spacing / 2]) {
        const post = makeBox(postSize, postHeight, postSize, postMaterial);
        post.position.set(cumX, fh + postHeight / 2, z);
        group.add(post);
      }
    }
  }
  const runLength = fl / 2 - cumX; // total horizontal run of the whole flight

  if (params.view.labels) {
    const spacingLabel = makeLabel(`spacing ${fmt(spacing)}`);
    spacingLabel.position.set(0, fh + 20, 0);
    group.add(spacingLabel);

    const lengthLabel = makeLabel(`foundation ${fmt(fl)} (${params.foundation.width}×${params.foundation.height} cm) ×2`);
    lengthLabel.position.set(0, fh + 14, -spacing / 2 - fw / 2 - 6);
    group.add(lengthLabel);

    const stepLabel = makeLabel(
      `${stepCount} steps (2 large + ${smallCount} small + 2 large), ${fmt(riser)} rise each, ${fmt(totalHeight)} total`
    );
    stepLabel.position.set(0, totalHeight + 30, spacing / 2 + fw / 2 + 6);
    group.add(stepLabel);

    const runLabel = makeLabel(`run ${fmt(runLength)}`);
    runLabel.position.set(fl / 2 - runLength / 2, 6, -spacing / 2 - fw / 2 - 30);
    group.add(runLabel);
  }

  if (params.view.grid) {
    const gridSize = Math.max(fl * 1.4, spacing * 4, runLength * 2, 1000);
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

const layoutFolder = gui.addFolder("Layout");
layoutFolder.add(params.layout, "spacing", 100, 20000, 10).name("beam spacing (mm)").onChange(rebuild);

const foundationFolder = gui.addFolder("Foundation (beams)");
foundationFolder.add(params.foundation, "width", 1, 40, 1).name("width (cm)").onChange(rebuild);
foundationFolder.add(params.foundation, "height", 1, 40, 1).name("height (cm)").onChange(rebuild);
foundationFolder.add(params.foundation, "length", 100, 20000, 10).name("length (mm)").onChange(rebuild);

const stepsFolder = gui.addFolder("Steps");
stepsFolder.add(params.steps, "totalHeight", 100, 3000, 10).name("total height (mm)").onChange(rebuild);
stepsFolder.add(params.steps, "smallCount", 1, 12, 1).name("small steps (middle)").onChange(rebuild);
stepsFolder.add(params.steps, "largeTread", 10, 50, 1).name("large tread depth (cm)").onChange(rebuild);
stepsFolder.add(params.steps, "smallTread", 5, 40, 1).name("small tread depth (cm)").onChange(rebuild);
stepsFolder.add(params.steps, "width", 1, 20, 1).name("support width (cm)").onChange(rebuild);
stepsFolder.add(params.steps, "height", 1, 30, 1).name("support height (cm)").onChange(rebuild);

const postsFolder = gui.addFolder("Posts");
postsFolder.add(params.posts, "size", 4, 30, 1).name("size (cm)").onChange(rebuild);

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
