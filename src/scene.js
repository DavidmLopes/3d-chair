import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { createMaterials } from "./materials.js";
import { createLoadingState } from "./loading.js";
import { Pane } from "tweakpane";

// Debug
const pane = new Pane({
  title: "Settings",
  expanded: true,
});

pane.element.style.display = "none";

window.addEventListener("keydown", (event) => {
  if (event.key === "d") {
    if (pane.element.style.display === "none") {
      pane.element.style.display = "block";
    } else {
      pane.element.style.display = "none";
    }
  }
});

// Canvas
const canvas = document.getElementById("webgl");

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcccccc);

// Loader
const loading = createLoadingState(canvas);
const manager = loading.manager;

// Vite bundles the decoder assets supplied by the pinned Three.js package.
const dracoLoader = new DRACOLoader(manager);

const gltfLoader = new GLTFLoader(manager);
gltfLoader.setDRACOLoader(dracoLoader);

const { registerMesh } = createMaterials(pane, manager);

// Model
gltfLoader.load(`${import.meta.env.BASE_URL}models/chair.glb`, (gltf) => {
  const chair = gltf.scene;
  chair.traverse((child) => {
    child.castShadow = true;
    child.receiveShadow = true;

    registerMesh(child);
  });
  scene.add(chair);
  loading.setStage("Loading materials…");
});

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 5);
directionalLight.position.set(1.5, 1.5, 1.5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 1;
directionalLight.shadow.camera.far = 4;
directionalLight.shadow.camera.left = -0.5;
directionalLight.shadow.camera.right = 0.5;
directionalLight.shadow.camera.top = 1;
directionalLight.shadow.camera.bottom = -0.5;
scene.add(directionalLight);

// Camera Helper
const cameraHelper = new THREE.CameraHelper(directionalLight.shadow.camera);
scene.add(cameraHelper);
cameraHelper.visible = false;

// Debug camera helper
pane
  .addButton({
    title: "Toggle Camera Helper",
  })
  .on("click", () => {
    cameraHelper.visible = !cameraHelper.visible;
  });

// Sizes
const sizes = {
  width: window.innerWidth,
  height:
    window.innerWidth > 640 ? window.innerHeight : window.innerHeight * 0.87,
};

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  100,
);
camera.position.x = 0.1;
camera.position.y = 0.8;
camera.position.z = 0.8;
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enabled = false;
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 0.6;
controls.maxDistance = 1.5;
controls.target.set(0, 0.4, 0);
controls.maxPolarAngle = Math.PI / 2;

// Handle Resize
window.addEventListener("resize", () => {
  sizes.width = window.innerWidth;
  sizes.height =
    window.innerWidth > 640 ? window.innerHeight : window.innerHeight * 0.87;

  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.render(scene, camera);

// Animate
renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);

  // Reveal the viewer only after every asset has loaded and a frame is drawn.
  if (loading.finish()) {
    document.querySelectorAll("[data-material]").forEach((button) => {
      button.disabled = false;
    });
    controls.enabled = true;
  }
});
