import { Box3, Vector2, Vector3 } from "three";

const DURATION = 750;

export function createMaterialReveal(textures) {
  const states = new Map();
  const center = { value: new Vector2() };
  const extent = { value: 1 };
  const viewport = new Vector2();
  const projected = new Vector3();
  const corners = [];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function commit(state, texture) {
    state.material.map = texture;
    state.material.needsUpdate = true;
  }

  function settle(state, texture) {
    commit(state, texture);
    state.waves.length = 0;
    state.uniforms.revealCount.value = 0;
  }

  function ensureCapacity(state) {
    if (state.waves.length <= state.capacity) return;
    state.capacity *= 2;
    state.uniforms.revealProgress.value = new Float32Array(state.capacity);
    state.uniforms.revealIndices.value = new Int32Array(state.capacity);
    state.material.needsUpdate = true;
  }

  return {
    register(mesh) {
      const material = mesh.material;
      const state = {
        material,
        waves: [],
        capacity: 16,
        uniforms: {
          revealTextures: { value: textures },
          revealProgress: { value: new Float32Array(16) },
          revealIndices: { value: new Int32Array(16) },
          revealCount: { value: 0 },
          revealCenter: center,
          revealExtent: extent,
        },
      };

      // Extend Three.js's base-color sampling, preserving the model's lighting,
      // normal maps, roughness, and shadows.
      material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, state.uniforms);
        shader.vertexShader = shader.vertexShader
          .replace(
            "#include <common>",
            `#include <common>
            varying vec2 vRevealUv;`,
          )
          .replace(
            "#include <uv_vertex>",
            `#include <uv_vertex>
            vRevealUv = uv;`,
          );
        shader.fragmentShader = shader.fragmentShader
          .replace(
            "#include <common>",
            `#include <common>
            uniform sampler2D revealTextures[4];
            uniform float revealProgress[${state.capacity}];
            uniform int revealIndices[${state.capacity}];
            uniform int revealCount;
            uniform vec2 revealCenter;
            uniform float revealExtent;
            varying vec2 vRevealUv;`,
          )
          .replace(
            "#include <map_fragment>",
            `vec4 materialColor = vec4(1.0);
            #ifdef USE_MAP
              materialColor = texture2D(map, vMapUv);
            #endif
            if (revealCount > 0) {
              vec4 colors[4];
              colors[0] = texture2D(revealTextures[0], vRevealUv);
              colors[1] = texture2D(revealTextures[1], vRevealUv);
              colors[2] = texture2D(revealTextures[2], vRevealUv);
              colors[3] = texture2D(revealTextures[3], vRevealUv);
              float feather = revealExtent * 0.025;
              float distanceFromCenter = distance(gl_FragCoord.xy, revealCenter);
              for (int i = 0; i < ${state.capacity}; i++) {
                if (i >= revealCount) break;
                float radius = mix(-feather, revealExtent + feather, revealProgress[i]);
                float amount = smoothstep(distanceFromCenter - feather, distanceFromCenter + feather, radius);
                materialColor = mix(materialColor, colors[revealIndices[i]], amount);
              }
            }
            diffuseColor *= materialColor;`,
          );
      };
      material.customProgramCacheKey = () =>
        `chair-radial-reveal-${state.capacity}`;
      states.set(mesh, state);
    },

    setBounds(model) {
      const bounds = new Box3().setFromObject(model);
      corners.length = 0;
      for (const x of [bounds.min.x, bounds.max.x]) {
        for (const y of [bounds.min.y, bounds.max.y]) {
          for (const z of [bounds.min.z, bounds.max.z]) {
            corners.push(new Vector3(x, y, z));
          }
        }
      }
    },

    transition(mesh, texture) {
      const state = states.get(mesh);
      if (reducedMotion.matches) {
        settle(state, texture);
        return;
      }
      const index = textures.indexOf(texture);
      const latest = state.waves.at(-1);
      if (
        latest?.index === index ||
        (!latest && state.material.map === texture)
      )
        return;
      // Coalesce clicks received within the same frame. Otherwise, each click
      // adds a wave immediately over the ones already expanding underneath it.
      if (latest?.startedAt === null) {
        latest.index = index;
      } else {
        state.waves.push({ index, startedAt: null });
        ensureCapacity(state);
      }
    },

    update(time, camera, renderer) {
      let viewUpdated = false;
      for (const state of states.values()) {
        if (!state.waves.length) continue;
        if (reducedMotion.matches) {
          settle(state, textures[state.waves.at(-1).index]);
          continue;
        }
        if (!viewUpdated) {
          // Framebuffer pixels keep every ripple circular and centered in the
          // user's view, including while orbiting, zooming, or resizing.
          camera.updateMatrixWorld();
          renderer.getDrawingBufferSize(viewport);
          center.value.copy(viewport).multiplyScalar(0.5);
          extent.value = 1;
          for (const corner of corners) {
            projected.copy(corner).project(camera);
            extent.value = Math.max(
              extent.value,
              Math.hypot(
                projected.x * viewport.x * 0.5,
                projected.y * viewport.y * 0.5,
              ),
            );
          }
          viewUpdated = true;
        }
        for (const wave of state.waves) wave.startedAt ??= time;
        // A completed wave covers the whole chair, so it becomes the base map
        // and can be removed without disturbing any newer ripples.
        while (
          state.waves.length &&
          time - state.waves[0].startedAt >= DURATION
        ) {
          commit(state, textures[state.waves.shift().index]);
        }
        state.uniforms.revealCount.value = state.waves.length;
        state.waves.forEach((wave, i) => {
          const progress = (time - wave.startedAt) / DURATION;
          state.uniforms.revealProgress.value[i] =
            progress * progress * (3 - 2 * progress);
          state.uniforms.revealIndices.value[i] = wave.index;
        });
      }
    },
  };
}
