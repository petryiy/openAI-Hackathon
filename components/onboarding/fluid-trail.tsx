"use client";

import { useEffect, useRef } from "react";
import {
  AdditiveBlending,
  Camera,
  ClampToEdgeWrapping,
  Color,
  HalfFloatType,
  LinearFilter,
  Mesh,
  PlaneGeometry,
  RawShaderMaterial,
  Scene,
  Vector2,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";

const fullscreenVertex = `
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const forceVertex = `
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform vec2 center;
  uniform vec2 scale;
  uniform vec2 texel;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec2 point = position.xy * scale * 2.0 * texel + center;
    gl_Position = vec4(point, 0.0, 1.0);
  }
`;

const advectionFragment = `
  precision highp float;
  uniform sampler2D velocity;
  uniform vec2 texel;
  uniform vec2 fieldSize;
  uniform float dt;
  uniform float dissipation;
  varying vec2 vUv;
  void main() {
    vec2 ratio = max(fieldSize.x, fieldSize.y) / fieldSize;
    vec2 oldVelocity = texture2D(velocity, vUv).xy;
    vec2 oldPoint = vUv - oldVelocity * dt * ratio;
    vec2 transported = texture2D(velocity, oldPoint).xy;
    vec2 forwardPoint = oldPoint + transported * dt * ratio;
    vec2 error = forwardPoint - vUv;
    vec2 correctedPoint = vUv - error * 0.5;
    vec2 correctedVelocity = texture2D(velocity, correctedPoint).xy;
    vec2 sourcePoint = correctedPoint - correctedVelocity * dt * ratio;
    vec2 result = texture2D(velocity, sourcePoint).xy * dissipation;
    gl_FragColor = vec4(result, 0.0, 1.0);
  }
`;

const forceFragment = `
  precision highp float;
  uniform vec2 force;
  varying vec2 vUv;
  void main() {
    vec2 circle = (vUv - 0.5) * 2.0;
    float falloff = 1.0 - min(length(circle), 1.0);
    falloff *= falloff;
    gl_FragColor = vec4(force * falloff, 0.0, 1.0);
  }
`;

const divergenceFragment = `
  precision highp float;
  uniform sampler2D velocity;
  uniform vec2 texel;
  uniform float dt;
  varying vec2 vUv;
  void main() {
    float left = texture2D(velocity, vUv - vec2(texel.x, 0.0)).x;
    float right = texture2D(velocity, vUv + vec2(texel.x, 0.0)).x;
    float bottom = texture2D(velocity, vUv - vec2(0.0, texel.y)).y;
    float top = texture2D(velocity, vUv + vec2(0.0, texel.y)).y;
    float divergence = (right - left + top - bottom) * 0.5;
    gl_FragColor = vec4(divergence / dt, 0.0, 0.0, 1.0);
  }
`;

const poissonFragment = `
  precision highp float;
  uniform sampler2D pressure;
  uniform sampler2D divergence;
  uniform vec2 texel;
  varying vec2 vUv;
  void main() {
    float left = texture2D(pressure, vUv - vec2(texel.x * 2.0, 0.0)).r;
    float right = texture2D(pressure, vUv + vec2(texel.x * 2.0, 0.0)).r;
    float bottom = texture2D(pressure, vUv - vec2(0.0, texel.y * 2.0)).r;
    float top = texture2D(pressure, vUv + vec2(0.0, texel.y * 2.0)).r;
    float div = texture2D(divergence, vUv).r;
    gl_FragColor = vec4((left + right + bottom + top) * 0.25 - div, 0.0, 0.0, 1.0);
  }
`;

const pressureFragment = `
  precision highp float;
  uniform sampler2D pressure;
  uniform sampler2D velocity;
  uniform vec2 texel;
  uniform float dt;
  varying vec2 vUv;
  void main() {
    float left = texture2D(pressure, vUv - vec2(texel.x, 0.0)).r;
    float right = texture2D(pressure, vUv + vec2(texel.x, 0.0)).r;
    float bottom = texture2D(pressure, vUv - vec2(0.0, texel.y)).r;
    float top = texture2D(pressure, vUv + vec2(0.0, texel.y)).r;
    vec2 current = texture2D(velocity, vUv).xy;
    vec2 gradient = vec2(right - left, top - bottom) * 0.5;
    gl_FragColor = vec4(current - gradient * dt, 0.0, 1.0);
  }
`;

const dyeAdvectionFragment = `
  precision highp float;
  uniform sampler2D velocity;
  uniform sampler2D dye;
  uniform vec2 fieldSize;
  uniform float dt;
  uniform float dissipation;
  varying vec2 vUv;
  void main() {
    vec2 ratio = max(fieldSize.x, fieldSize.y) / fieldSize;
    vec2 flow = texture2D(velocity, vUv).xy;
    vec2 sourcePoint = vUv - flow * dt * ratio;
    gl_FragColor = texture2D(dye, sourcePoint) * dissipation;
  }
`;

const inkFragment = `
  precision highp float;
  uniform vec3 inkColor;
  varying vec2 vUv;
  void main() {
    vec2 circle = (vUv - 0.5) * 2.0;
    float falloff = 1.0 - min(length(circle), 1.0);
    falloff = falloff * falloff * (3.0 - 2.0 * falloff);
    gl_FragColor = vec4(inkColor * falloff, falloff);
  }
`;

const outputFragment = `
  precision highp float;
  uniform sampler2D dye;
  varying vec2 vUv;
  void main() {
    vec4 ink = texture2D(dye, vUv);
    float density = clamp(max(max(ink.r, ink.g), ink.b), 0.0, 1.0);
    vec3 color = clamp(ink.rgb / max(density, 0.001), 0.0, 1.0);
    float alpha = pow(density, 1.14) * 0.7;
    gl_FragColor = vec4(color, alpha);
  }
`;

type Pass = {
  scene: Scene;
  material: RawShaderMaterial;
};

const FIELD_RESOLUTION = 0.28;
const PRESSURE_ITERATIONS = 12;

export function FluidTrail() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    const finePointer = window.matchMedia("(pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!mount || !finePointer.matches || reducedMotion.matches) return;

    let renderer: WebGLRenderer | null = null;
    let frame = 0;
    let disposed = false;
    const pointer = new Vector2();
    const previousPointer = new Vector2();
    const pointerDelta = new Vector2();
    let hasPointer = false;
    let pendingPointer = false;
    const camera = new Camera();
    const geometry = new PlaneGeometry(2, 2);
    const forceGeometry = new PlaneGeometry(1, 1);
    const materials: RawShaderMaterial[] = [];
    let targets: WebGLRenderTarget[] = [];

    const makePass = (
      fragmentShader: string,
      uniforms: Record<string, { value: unknown }>,
      passGeometry = geometry,
      additive = false,
    ): Pass => {
      const material = new RawShaderMaterial({
        vertexShader: passGeometry === forceGeometry ? forceVertex : fullscreenVertex,
        fragmentShader,
        uniforms,
        transparent: additive,
        blending: additive ? AdditiveBlending : undefined,
        depthWrite: false,
        depthTest: false,
      });
      const scene = new Scene();
      scene.add(new Mesh(passGeometry, material));
      materials.push(material);
      return { scene, material };
    };

    const texel = new Vector2(1, 1);
    const fieldSize = new Vector2(1, 1);
    const advection = makePass(advectionFragment, {
      velocity: { value: null },
      texel: { value: texel },
      fieldSize: { value: fieldSize },
      dt: { value: 0.014 },
      dissipation: { value: 0.99 },
    });
    const force = makePass(forceFragment, {
      center: { value: pointer },
      scale: { value: new Vector2(22, 22) },
      texel: { value: texel },
      force: { value: new Vector2() },
    }, forceGeometry, true);
    const divergence = makePass(divergenceFragment, {
      velocity: { value: null },
      texel: { value: texel },
      dt: { value: 0.014 },
    });
    const poisson = makePass(poissonFragment, {
      pressure: { value: null },
      divergence: { value: null },
      texel: { value: texel },
    });
    const pressure = makePass(pressureFragment, {
      pressure: { value: null },
      velocity: { value: null },
      texel: { value: texel },
      dt: { value: 0.014 },
    });
    const dyeAdvection = makePass(dyeAdvectionFragment, {
      velocity: { value: null },
      dye: { value: null },
      fieldSize: { value: fieldSize },
      dt: { value: 0.014 },
      dissipation: { value: 0.965 },
    });
    const cyan = new Color("#78f3ff");
    const violet = new Color("#8a6cff");
    const ink = makePass(inkFragment, {
      center: { value: pointer },
      scale: { value: new Vector2(14, 14) },
      texel: { value: texel },
      inkColor: { value: cyan.clone() },
    }, forceGeometry, true);
    const output = makePass(outputFragment, {
      dye: { value: null },
    });

    const makeTarget = (width: number, height: number) => new WebGLRenderTarget(width, height, {
      type: HalfFloatType,
      depthBuffer: false,
      stencilBuffer: false,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      wrapS: ClampToEdgeWrapping,
      wrapT: ClampToEdgeWrapping,
    });

    try {
      renderer = new WebGLRenderer({ alpha: true, antialias: false, powerPreference: "high-performance" });
      renderer.autoClear = false;
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(1);
      renderer.domElement.setAttribute("aria-hidden", "true");
      mount.appendChild(renderer.domElement);
    } catch (error) {
      console.warn("Fluid trail could not initialize; the standard cursor remains available.", error);
      geometry.dispose();
      forceGeometry.dispose();
      materials.forEach((material) => material.dispose());
      return;
    }

    const resize = () => {
      if (!renderer) return;
      const width = Math.max(1, window.innerWidth);
      const height = Math.max(1, window.innerHeight);
      const fieldWidth = Math.max(48, Math.round(width * FIELD_RESOLUTION));
      const fieldHeight = Math.max(48, Math.round(height * FIELD_RESOLUTION));
      renderer.setSize(width, height, false);
      renderer.domElement.style.width = `${width}px`;
      renderer.domElement.style.height = `${height}px`;
      targets.forEach((target) => target.dispose());
      targets = Array.from({ length: 7 }, () => makeTarget(fieldWidth, fieldHeight));
      fieldSize.set(fieldWidth, fieldHeight);
      texel.set(1 / fieldWidth, 1 / fieldHeight);
      targets.forEach((target) => {
        renderer?.setRenderTarget(target);
        renderer?.clear();
      });
      renderer.setRenderTarget(null);
      renderer.clear();
    };

    const renderPass = (pass: Pass, target: WebGLRenderTarget | null, clear = true) => {
      if (!renderer) return;
      renderer.setRenderTarget(target);
      if (clear) renderer.clear();
      renderer.render(pass.scene, camera);
    };

    const move = (event: PointerEvent) => {
      const x = event.clientX / Math.max(1, window.innerWidth);
      const y = event.clientY / Math.max(1, window.innerHeight);
      pointer.set(x * 2 - 1, -(y * 2 - 1));
      if (!hasPointer) {
        previousPointer.copy(pointer);
        hasPointer = true;
      }
      pendingPointer = true;
    };

    const render = () => {
      if (!renderer || disposed || targets.length !== 7) return;
      const [velocityA, velocityB, divergenceTarget, pressureA, pressureB, dyeRead, dyeWrite] = targets;

      advection.material.uniforms.velocity.value = velocityA.texture;
      renderPass(advection, velocityB);

      pointerDelta.subVectors(pointer, previousPointer);
      previousPointer.copy(pointer);
      const injectInk = pendingPointer && pointerDelta.lengthSq() > 0.0000001;
      if (injectInk) {
        const speedBoost = Math.min(1.15, 0.68 + pointerDelta.length() * 3.2);
        force.material.uniforms.force.value.copy(pointerDelta).multiplyScalar(8.5 * speedBoost);
        renderPass(force, velocityB, false);
      }
      pendingPointer = false;

      divergence.material.uniforms.velocity.value = velocityB.texture;
      renderPass(divergence, divergenceTarget);

      poisson.material.uniforms.divergence.value = divergenceTarget.texture;
      let pressureRead = pressureA;
      let pressureWrite = pressureB;
      for (let index = 0; index < PRESSURE_ITERATIONS; index += 1) {
        poisson.material.uniforms.pressure.value = pressureRead.texture;
        renderPass(poisson, pressureWrite);
        [pressureRead, pressureWrite] = [pressureWrite, pressureRead];
      }

      pressure.material.uniforms.velocity.value = velocityB.texture;
      pressure.material.uniforms.pressure.value = pressureRead.texture;
      renderPass(pressure, velocityA);

      dyeAdvection.material.uniforms.velocity.value = velocityA.texture;
      dyeAdvection.material.uniforms.dye.value = dyeRead.texture;
      renderPass(dyeAdvection, dyeWrite);
      if (injectInk) {
        const colorMix = 0.18 + (Math.sin(performance.now() * 0.0014) + 1) * 0.28;
        ink.material.uniforms.inkColor.value.copy(cyan).lerp(violet, colorMix);
        renderPass(ink, dyeWrite, false);
      }

      output.material.uniforms.dye.value = dyeWrite.texture;
      renderPass(output, null);
      targets[5] = dyeWrite;
      targets[6] = dyeRead;
      frame = requestAnimationFrame(render);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", move, { passive: true });
    frame = requestAnimationFrame(render);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", move);
      targets.forEach((target) => target.dispose());
      materials.forEach((material) => material.dispose());
      geometry.dispose();
      forceGeometry.dispose();
      if (renderer) {
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.remove();
      }
    };
  }, []);

  return <div ref={mountRef} className="landing-fluid-trail" aria-hidden="true" />;
}
