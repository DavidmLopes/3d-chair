import { SRGBColorSpace, TextureLoader } from "three";
import { createMaterialReveal } from "./material-reveal.js";

export function createMaterials(pane, manager) {
  const textureLoader = new TextureLoader(manager);
  const definitions = {
    LightWood: { label: "Light Wood", file: "Wood1.jpg" },
    DarkWood: { label: "Dark Wood", file: "Wood2.jpg" },
    Black: { label: "Black", file: "Wood3.jpg" },
    White: { label: "White", file: "Wood4.jpg" },
  };
  const textures = Object.fromEntries(
    Object.entries(definitions).map(([key, { file }]) => {
      const texture = textureLoader.load(
        `${import.meta.env.BASE_URL}textures/Wood/${file}`,
      );
      texture.colorSpace = SRGBColorSpace;
      return [key, texture];
    }),
  );
  const reveal = createMaterialReveal(Object.values(textures));
  const meshes = [];
  const buttons = document.querySelectorAll("[data-material]");
  let selectedMaterial = "LightWood";
  let hasSelection = false;

  function applyTexture(mesh, key) {
    reveal.transition(mesh, textures[key]);
  }

  function selectMaterial(key) {
    if (!Object.hasOwn(definitions, key)) return;
    selectedMaterial = key;
    hasSelection = true;
    meshes.forEach((mesh) => applyTexture(mesh, key));
    buttons.forEach((button) => {
      const active = button.dataset.material === key;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    document.getElementById("woodLabel").textContent = definitions[key].label;
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () =>
      selectMaterial(button.dataset.material),
    );
  });

  return {
    setRevealBounds: reveal.setBounds,
    update: reveal.update,
    registerMesh(mesh) {
      if (!mesh.isMesh || !mesh.name.includes("Chair")) return;
      mesh.material = mesh.material.clone();
      reveal.register(mesh);
      meshes.push(mesh);
      // A selection made before the model finishes loading still takes effect.
      // Preserve the model's original default map until a swatch is selected.
      if (hasSelection) applyTexture(mesh, selectedMaterial);
      const state = { [mesh.name]: selectedMaterial };
      pane
        .addBinding(state, mesh.name, {
          options: Object.fromEntries(
            Object.keys(definitions).map((key) => [key, key]),
          ),
        })
        .on("change", (event) => applyTexture(mesh, event.value));
    },
  };
}
