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
 * footing for this structure (not a deck), so they stay at ground level. On
 * top of them, evenly spaced along X, are the joists — and the joists are
 * what climbs: each one sits one riser higher than the last, all the way from
 * the ground to totalHeight. The first two and last two joists are wide
 * enough to sit on (seating); the joists in between form the actual
 * staircase. Every joist spans across (Z) from one foundation beam to the
 * other, held up by a construction post at each end.
 */
const params = {
  layout: {
    spacing: 1000, // centre-to-centre distance between the two foundation beams, mm (100cm) — also the joist span
  },
  foundation: {
    width: 4, // cross-section width, cm (40mm)
    height: 12, // cross-section height, cm (120mm)
    length: 5000, // beam length, mm
  },
  joists: {
    count: 9, // total joists, evenly spaced along the foundation length (min 5: 2 seating + 1+ stairs + 2 seating)
    width: 4, // cross-section width (along X), cm
    height: 9, // cross-section height, cm
    totalHeight: 900, // total rise from the ground to the last joist, mm
  },
  posts: {
    size: 9, // square construction-post cross-section, cm — one under each end of every joist
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
const stairMaterial = new THREE.MeshStandardMaterial({ color: 0xd9b789, roughness: 0.8, metalness: 0.0 });
const seatMaterial = new THREE.MeshStandardMaterial({ color: 0xa8674a, roughness: 0.8, metalness: 0.0 });
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

  // Joists: evenly spaced along X (edge-aligned with the foundation ends), each one
  // spanning across (Z) from one foundation beam to the other. These are what climbs:
  // joist i sits one riser higher than joist i-1, all the way from the ground to
  // totalHeight. The first two and last two are wide sitting platforms (seating); the
  // joists in between are the actual staircase.
  const jw = params.joists.width * 10;
  const jh = params.joists.height * 10;
  const jCount = Math.max(5, Math.round(params.joists.count));
  const totalHeight = params.joists.totalHeight;
  const joistSpan = spacing + fw; // reaches the outer edge of both foundation beams
  const joistStep = (fl - jw) / (jCount - 1);
  const riser = totalHeight / jCount;
  const postSize = params.posts.size * 10;
  const isSeat = (i) => i < 2 || i >= jCount - 2; // the two flanking joists at each end

  const joistX = []; // centre X of every joist, in build order
  for (let i = 0; i < jCount; i++) {
    const x = -fl / 2 + jw / 2 + i * joistStep;
    joistX.push(x);
    const joistY = (i + 1) * riser; // riser 1 at the first joist, up to totalHeight at the last

    const joist = makeBox(jw, jh, joistSpan, isSeat(i) ? seatMaterial : stairMaterial);
    joist.position.set(x, joistY + jh / 2, 0);
    group.add(joist);

    // Construction post at each end, carrying this joist's load down to the foundation top.
    const postHeight = joistY - fh;
    if (postHeight > 1) {
      for (const z of [-spacing / 2, spacing / 2]) {
        const post = makeBox(postSize, postHeight, postSize, postMaterial);
        post.position.set(x, fh + postHeight / 2, z);
        group.add(post);
      }
    }
  }
  const runLength = fl; // joists are edge-aligned, so the flight runs the full foundation length

  if (params.view.labels) {
    const spacingLabel = makeLabel(`spacing ${fmt(spacing)}`);
    spacingLabel.position.set(0, fh + 20, 0);
    group.add(spacingLabel);

    const lengthLabel = makeLabel(`foundation ${fmt(fl)} (${params.foundation.width}×${params.foundation.height} cm) ×2`);
    lengthLabel.position.set(0, fh + 14, -spacing / 2 - fw / 2 - 6);
    group.add(lengthLabel);

    const stairCount = jCount - 4;
    const stairFrom = joistX[2];
    const stairTo = joistX[jCount - 3];
    const stairLabel = makeLabel(
      `stairs: ${stairCount} joists, ${fmt(riser)} rise each, ${fmt(joistStep)} apart, ${fmt(totalHeight)} total`
    );
    stairLabel.position.set((stairFrom + stairTo) / 2, totalHeight + 30, spacing / 2 + fw / 2 + 6);
    group.add(stairLabel);

    const seatNearFrom = joistX[0];
    const seatNearTo = joistX[1];
    const seatNearLabel = makeLabel(`seating (2 joists)`);
    seatNearLabel.position.set((seatNearFrom + seatNearTo) / 2, riser * 2 + 20, spacing / 2 + fw / 2 + 6);
    group.add(seatNearLabel);

    const seatFarFrom = joistX[jCount - 2];
    const seatFarTo = joistX[jCount - 1];
    const seatFarLabel = makeLabel(`seating (2 joists)`);
    seatFarLabel.position.set((seatFarFrom + seatFarTo) / 2, totalHeight + 30, spacing / 2 + fw / 2 + 6);
    group.add(seatFarLabel);

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

const joistsFolder = gui.addFolder("Joists (climbing)");
joistsFolder.add(params.joists, "count", 5, 40, 1).name("count").onChange(rebuild);
joistsFolder.add(params.joists, "totalHeight", 100, 3000, 10).name("total height (mm)").onChange(rebuild);
joistsFolder.add(params.joists, "width", 1, 20, 1).name("width (cm)").onChange(rebuild);
joistsFolder.add(params.joists, "height", 1, 30, 1).name("height (cm)").onChange(rebuild);

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
