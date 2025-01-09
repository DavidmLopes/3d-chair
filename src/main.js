import * as THREE from "three";
import { Timer } from "three/examples/jsm/Addons.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { Pane } from "tweakpane";

// Debug
const pane = new Pane({
  title: "Settings",
  expanded: true,
});

// Canvas
const canvas = document.getElementById("webgl");

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcccccc);

// Loader
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/draco/");

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

const textureLoader = new THREE.TextureLoader();

const wood1BaseColor = textureLoader.load("/textures/Wood/Wood1.jpg");
const wood2BaseColor = textureLoader.load("/textures/Wood/Wood2.jpg");
const wood3BaseColor = textureLoader.load("/textures/Wood/Wood3.jpg");
const wood4BaseColor = textureLoader.load("/textures/Wood/Wood4.jpg");

// Set correct color space for all textures
[wood1BaseColor, wood2BaseColor, wood3BaseColor, wood4BaseColor].forEach(
  (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
  }
);

const woodOptions = {
  Wood1: wood1BaseColor,
  Wood2: wood2BaseColor,
  Wood3: wood3BaseColor,
  Wood4: wood4BaseColor,
};

// Model
gltfLoader.load("/models/chair.glb", (gltf) => {
  const chair = gltf.scene;
  chair.traverse((child) => {
    child.castShadow = true;
    child.receiveShadow = true;

    if (child.isMesh && child.name.includes("Chair")) {
      // Clone material to avoid affecting other meshes
      child.material = child.material.clone();

      // Create state object for this mesh
      const state = {
        [child.name]: "Wood1",
      };

      // Add dropdown for wood selection
      pane
        .addBinding(state, child.name, {
          options: {
            Wood1: "Wood1",
            Wood2: "Wood2",
            Wood3: "Wood3",
            Wood4: "Wood4",
          },
        })
        .on("change", (ev) => {
          child.material.map = woodOptions[ev.value];
          child.material.needsUpdate = true;
        });
    }
  });
  scene.add(chair);
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
  height: window.innerHeight,
};

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.x = 0;
camera.position.y = 0.8;
camera.position.z = 1;
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.target.set(0, 0.4, 0);

// Handle Resize
window.addEventListener("resize", () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

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
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.render(scene, camera);

// Animate
const timer = new Timer();
function tick() {
  // Timer
  timer.update();
  const elapsedTime = timer.getElapsed();

  // Update controls
  controls.update();

  // Render
  renderer.render(scene, camera);

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
}
tick();
