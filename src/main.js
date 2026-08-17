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
 * A short, wide staircase. The two foundation beams are already installed in
 * the ground — they run along X (the wide dimension) and stay at ground
 * level, spaced apart along Z by `layout.spacing` — that short Z gap is the
 * climbing run. Bottom joists rest flush across the full width (variable
 * count), resting directly on the two beams — these are the seating. A
 * fixed 4-step staircase is cut into the middle, spanning however many
 * bottom-joist bays wide (variable), climbing across the same short Z gap
 * from the ground up to totalHeight. Every climbing step is held up by a
 * construction post at each end; flush joists rest on the beams directly.
 */
const params = {
  layout: {
    spacing: 1000, // the short climbing run: centre-to-centre distance between the two foundation beams, mm
  },
  foundation: {
    width: 4, // cross-section width, cm (40mm)
    height: 12, // cross-section height, cm (120mm)
    length: 5000, // beam length, mm — the wide dimension
  },
  joists: {
    count: 9, // total bottom joists, evenly spaced across the full width (variable) — the seating
    stairSpan: 3, // width of the middle stair section, in bottom-joist bays (variable)
    width: 4, // cross-section thickness along the climb (Z), cm
    height: 9, // cross-section height, cm
    totalHeight: 900, // total rise from the ground to the top stair step, mm
  },
  posts: {
    size: 9, // square construction-post cross-section, cm — one under each end of every climbing step
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

  // Bottom joists: a flush grid spanning the full width, evenly spaced along X and
  // resting directly on the two beams (no posts needed — this is the seating). The
  // count is always odd, so a joist always sits exactly at the centre (X = 0) — that
  // centre joist stays in place even though the stair sits above it, so there's always
  // a real joist for a middle support post to rest on, not just the two edge posts.
  const jw = params.joists.width * 10;
  const jh = params.joists.height * 10;
  const totalHeight = params.joists.totalHeight;
  const postSize = params.posts.size * 10;
  const STAIR_STEPS = 4; // always 4 steps in the middle section

  let jCount = Math.max(STAIR_STEPS + 3, Math.round(params.joists.count));
  if (jCount % 2 === 0) jCount++; // force odd so a joist always lands exactly at the centre
  const joistPitch = (fl - jw) / (jCount - 1);
  const joistX = [];
  for (let i = 0; i < jCount; i++) joistX.push(-fl / 2 + jw / 2 + i * joistPitch);
  const midIndex = (jCount - 1) / 2;

  // Stair span is measured in removed joist-bays per side (the centre joist is kept as
  // a middle support, not counted as removed). The two edge posts land exactly on the
  // nearest joist positions still standing just outside the span.
  const removedPerSide = Math.max(1, Math.min(Math.round(params.joists.stairSpan), midIndex - 1));
  const leftEdgeIndex = midIndex - removedPerSide;
  const rightEdgeIndex = midIndex + removedPerSide;
  const stairHalfWidth = joistX[rightEdgeIndex]; // = -joistX[leftEdgeIndex] by symmetry

  // Flush bottom joists: every joist gets one, resting directly on the two beams —
  // outside the stair span this is the seating; inside the span it's the base the
  // stair posts stand on, so the posts never float above nothing.
  let seatJoistCount = 0;
  for (let i = 0; i < jCount; i++) {
    const inStairSpan = i >= leftEdgeIndex && i <= rightEdgeIndex;
    if (!inStairSpan) seatJoistCount++;
    const joist = makeBox(jw, jh, spacing + fw, seatMaterial);
    joist.position.set(joistX[i], fh + jh / 2, 0);
    group.add(joist);
  }

  // Fixed 4-step staircase, climbing across Z within the carved-out middle span. The
  // pattern repeats above every joist in the span (not just the two edges and centre):
  // each one gets its own beam running in the walking direction (Z), as deep as the
  // actual step run (zStep) — a beam, not one wide flat board — held up by a post at
  // its trailing edge (where you land after the riser) and another at its leading edge
  // (where the next riser starts). The leading post is set back half a post-width so it
  // sits right next to next step's trailing post instead of overlapping it.
  const joistTopY = fh + jh;
  const zStep = (spacing - jw) / (STAIR_STEPS - 1);
  const riser = totalHeight / (STAIR_STEPS - 1); // 3 risers across 4 steps: first is flush, last reaches totalHeight
  for (let i = 0; i < STAIR_STEPS; i++) {
    const zTrailing = -spacing / 2 + jw / 2 + i * zStep;
    const zLeading = zTrailing + zStep; // the end pointing in the walking direction
    const stepTopY = joistTopY + i * riser; // walking-surface height for step i (i = 0 is the joist's own top)
    const stepBottomY = i === 0 ? joistTopY : stepTopY - jh; // beam sized so its top lands exactly on stepTopY
    const postHeight = stepBottomY - joistTopY;

    for (let idx = leftEdgeIndex; idx <= rightEdgeIndex; idx++) {
      const x = joistX[idx];

      // Step 0 sits flush on the joist top, so its beam would just duplicate the
      // flush joist already there — skip it. The beam matches the posts' square
      // cross-section, and is extended half a post-width past each post's centre so
      // its ends land flush with the posts' outer edges instead of stopping mid-post.
      if (i > 0) {
        const beam = makeBox(postSize, postSize, zStep + postSize, stairMaterial);
        beam.position.set(x, stepTopY - postSize / 2, zTrailing + zStep / 2);
        group.add(beam);
      }

      if (postHeight > 1) {
        const trailingPost = makeBox(postSize, postHeight, postSize, postMaterial);
        trailingPost.position.set(x, joistTopY + postHeight / 2, zTrailing);
        group.add(trailingPost);

        const leadingPost = makeBox(postSize, postHeight, postSize, postMaterial);
        leadingPost.position.set(x, joistTopY + postHeight / 2, zLeading - postSize);
        group.add(leadingPost);
      }
    }
  }

  if (params.view.labels) {
    const spacingLabel = makeLabel(`run (spacing) ${fmt(spacing)}`);
    spacingLabel.position.set(0, fh + 20, 0);
    group.add(spacingLabel);

    const lengthLabel = makeLabel(`foundation ${fmt(fl)} (${params.foundation.width}×${params.foundation.height} cm) ×2`);
    lengthLabel.position.set(0, fh + 14, -spacing / 2 - fw / 2 - 6);
    group.add(lengthLabel);

    const stairLabel = makeLabel(
      `stairs: ${STAIR_STEPS} steps, ${fmt(riser)} rise each, ${removedPerSide * 2} joist bays (${fmt(stairHalfWidth * 2)}) wide`
    );
    stairLabel.position.set(0, joistTopY + totalHeight + 30, spacing / 2 + fw / 2 + 6);
    group.add(stairLabel);

    const seatLabel = makeLabel(`seating: ${seatJoistCount} joists, ${fmt(joistPitch)} apart`);
    seatLabel.position.set(0, fh + jh + 20, spacing / 2 + fw / 2 + 6);
    group.add(seatLabel);
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

const layoutFolder = gui.addFolder("Layout");
layoutFolder.add(params.layout, "spacing", 100, 20000, 10).name("beam spacing (mm)").onChange(rebuild);

const foundationFolder = gui.addFolder("Foundation (beams)");
foundationFolder.add(params.foundation, "width", 1, 40, 1).name("width (cm)").onChange(rebuild);
foundationFolder.add(params.foundation, "height", 1, 40, 1).name("height (cm)").onChange(rebuild);
foundationFolder.add(params.foundation, "length", 100, 20000, 10).name("length (mm)").onChange(rebuild);

const joistsFolder = gui.addFolder("Joists");
joistsFolder.add(params.joists, "count", 6, 40, 1).name("bottom joist count").onChange(rebuild);
joistsFolder.add(params.joists, "stairSpan", 1, 20, 1).name("stair width (joist bays)").onChange(rebuild);
joistsFolder.add(params.joists, "totalHeight", 100, 3000, 10).name("stair total height (mm)").onChange(rebuild);
joistsFolder.add(params.joists, "width", 1, 20, 1).name("thickness (cm)").onChange(rebuild);
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
