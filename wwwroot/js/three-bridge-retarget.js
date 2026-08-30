import * as THREE from "three/webgpu";
import {
  color, screenUV, hue, reflector, time, Fn, vec2, length, atan,
  float, sin, cos, vec3, sub, mul, pow, blendDodge, normalWorldGeometry
} from "three/tsl";

import { OrbitControls } from "../lib/three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "../lib/three/addons/loaders/GLTFLoader.js";
import { Inspector } from "../lib/three/addons/inspector/Inspector.js";
import * as SkeletonUtils from "../lib/three/addons/utils/SkeletonUtils.js";

let current = null;
let instanceId = 0;

const DEFAULT_CONFIG = {
  sourceUrl: "models/gltf/Michelle.glb",
  targetUrl: "models/gltf/Soldier.glb",
  showHelpers: false,
  reflectorOpacity: 0.2,
  cameraZ: 4,
  cameraY: 1
};

const SOURCE_MODELS = {
  "Michelle.glb": "models/gltf/Michelle.glb"
};

const TARGET_MODELS = {
  "Soldier.glb": "models/gltf/Soldier.glb"
};

// Puerto directo del shader "lightSpeed" del ejemplo three.js webgpu_animation_retargeting
const lightSpeed = /*@__PURE__*/ Fn(([suvImmutable]) => {
  const suv = vec2(suvImmutable);
  const uv = vec2(length(suv), atan(suv.y, suv.x));
  const offset = float(
    float(0.1).mul(sin(uv.y.mul(10).sub(time.mul(0.6))))
      .mul(cos(uv.y.mul(48).add(time.mul(0.3))))
      .mul(cos(uv.y.mul(3.7).add(time)))
  );
  const rays = vec3(
    vec3(sin(uv.y.mul(150).add(time)).mul(0.5).add(0.5))
      .mul(vec3(sin(uv.y.mul(80).sub(time.mul(0.6))).mul(0.5).add(0.5)))
      .mul(vec3(sin(uv.y.mul(45).add(time.mul(0.8))).mul(0.5).add(0.5)))
      .mul(vec3(sub(1, cos(uv.y.add(mul(22, time).sub(pow(uv.x.add(offset), 0.3).mul(60)))))))
      .mul(vec3(uv.x.mul(2)))
  );
  return rays;
}).setLayout({
  name: "lightSpeed",
  type: "vec3",
  inputs: [{ name: "suv", type: "vec2" }]
});

// Mapa de retargeting mixamo -> mixamo, idéntico al ejemplo oficial
const RETARGET_OPTIONS = {
  hip: "mixamorigHips",
  localOffsets: {
    mixamorigLeftShoulder: () => new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(45)),
    mixamorigRightShoulder: () => new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(-180)),
    mixamorigLeftArm: () => new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(45)),
    mixamorigRightArm: () => new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(-180)),
    mixamorigLeftForeArm: () => new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(45)),
    mixamorigRightForeArm: () => new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(-180)),
    mixamorigLeftHand: () => new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(45)),
    mixamorigRightHand: () => new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(-180)),
    mixamorigLeftUpLeg: () => new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(180)),
    mixamorigRightUpLeg: () => new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(180)),
    mixamorigLeftLeg: () => new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(180)),
    mixamorigRightLeg: () => new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(180)),
    mixamorigLeftFoot: () => new THREE.Matrix4().makeRotationFromEuler(
      new THREE.Euler(THREE.MathUtils.degToRad(45), THREE.MathUtils.degToRad(180), 0)
    ),
    mixamorigRightFoot: () => new THREE.Matrix4().makeRotationFromEuler(
      new THREE.Euler(THREE.MathUtils.degToRad(45), THREE.MathUtils.degToRad(180), 0)
    ),
    mixamorigLeftToeBase: () => new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(180)),
    mixamorigRightToeBase: () => new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(180))
  },
  names: {
    mixamorigHips: "mixamorigHips",
    mixamorigSpine: "mixamorigSpine",
    mixamorigSpine2: "mixamorigSpine2",
    mixamorigHead: "mixamorigHead",
    mixamorigLeftShoulder: "mixamorigLeftShoulder",
    mixamorigRightShoulder: "mixamorigRightShoulder",
    mixamorigLeftArm: "mixamorigLeftArm",
    mixamorigRightArm: "mixamorigRightArm",
    mixamorigLeftForeArm: "mixamorigLeftForeArm",
    mixamorigRightForeArm: "mixamorigRightForeArm",
    mixamorigLeftHand: "mixamorigLeftHand",
    mixamorigRightHand: "mixamorigRightHand",
    mixamorigLeftUpLeg: "mixamorigLeftUpLeg",
    mixamorigRightUpLeg: "mixamorigRightUpLeg",
    mixamorigLeftLeg: "mixamorigLeftLeg",
    mixamorigRightLeg: "mixamorigRightLeg",
    mixamorigLeftFoot: "mixamorigLeftFoot",
    mixamorigRightFoot: "mixamorigRightFoot",
    mixamorigLeftToeBase: "mixamorigLeftToeBase",
    mixamorigRightToeBase: "mixamorigRightToeBase"
  }
};

function getCanvasSize(canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    width: Math.max(1, Math.floor(rect.width || window.innerWidth || 800)),
    height: Math.max(1, Math.floor(rect.height || window.innerHeight || 400))
  };
}

function loadGltf(url) {
  return new Promise((resolve, reject) => {
    new GLTFLoader().load(url, resolve, undefined, reject);
  });
}

function buildRetargetOptions(targetModel) {
  const localOffsets = {};
  for (const [bone, factory] of Object.entries(RETARGET_OPTIONS.localOffsets)) {
    localOffsets[bone] = factory();
  }
  return {
    hip: RETARGET_OPTIONS.hip,
    scale: 1 / targetModel.scene.scale.y,
    localOffsets,
    names: RETARGET_OPTIONS.names
  };
}

function getSource(sourceModel, helpers) {
  const clip = sourceModel.animations[0];
  const helper = new THREE.SkeletonHelper(sourceModel.scene);
  helpers.add(helper);

  const skeleton = new THREE.Skeleton(helper.bones);
  const mixer = new THREE.AnimationMixer(sourceModel.scene);
  mixer.clipAction(clip).play();

  return { clip, skeleton, mixer };
}

function retargetModel(sourceRig, targetModel, helpers) {
  const targetSkin = targetModel.scene.children[0].children[0];
  helpers.add(new THREE.SkeletonHelper(targetModel.scene));

  const retargetedClip = SkeletonUtils.retargetClip(
    targetSkin, sourceRig.skeleton, sourceRig.clip, buildRetargetOptions(targetModel)
  );

  const mixer = new THREE.AnimationMixer(targetSkin);
  mixer.clipAction(retargetedClip).play();
  return mixer;
}

async function reloadSceneFromInspector() {
  if (!current) return;
  const nextConfig = { ...current.config };
  const canvas = current.canvas;
  const dotNetRef = current.dotNetRef;
  await initThree(canvas, nextConfig, dotNetRef);
}

function notifyConfigChanged() {
  if (!current?.dotNetRef) return;

  const cfg = current.config;

  current.dotNetRef.invokeMethodAsync(
    "OnConfigChanged",
    cfg.sourceUrl,
    cfg.targetUrl,
    !!cfg.showHelpers,
    Number(cfg.reflectorOpacity ?? 0),
    Number(cfg.cameraY ?? 0),
    Number(cfg.cameraZ ?? 0)
  ).catch(() => {});
}

function setupNativeInspectorControls() {
  if (!current?.renderer?.inspector || typeof current.renderer.inspector.createParameters !== "function") {
    return;
  }

  const params = current.renderer.inspector.createParameters("Retargeting");
  const live = params.addFolder("Live");

  live.add(current.config, "showHelpers")
    .name("Mostrar helpers")
    .onChange((value) => {
      updateConfig({ showHelpers: value });
    })
    .listen();

  live.add(current.config, "reflectorOpacity", 0, 1, 0.05)
    .name("Opacidad suelo")
    .onChange((value) => {
      updateConfig({ reflectorOpacity: value });
    })
    .listen();

  live.add(current.config, "cameraZ", 3, 12, 0.5)
    .name("Camara Z")
    .onChange((value) => {
      updateConfig({ cameraZ: value });
    })
    .listen();

  live.add(current.config, "cameraY", 0, 5, 0.1)
    .name("Camara Y")
    .onChange((value) => {
      updateConfig({ cameraY: value });
    })
    .listen();

  const models = params.addFolder("Modelos");

  models.add(current.config, "sourceUrl", SOURCE_MODELS)
    .name("Fuente")
    .onChange(() => {
      notifyConfigChanged();
      reloadSceneFromInspector();
    })
    .listen();

  models.add(current.config, "targetUrl", TARGET_MODELS)
    .name("Destino")
    .onChange(() => {
      notifyConfigChanged();
      reloadSceneFromInspector();
    })
    .listen();

  const actions = {
    recargar: () => reloadSceneFromInspector(),
    reset: () => {
      current.config = { ...DEFAULT_CONFIG };
      notifyConfigChanged();
      return reloadSceneFromInspector();
    }
  };

  models.add(actions, "recargar").name("Recargar modelos");
  models.add(actions, "reset").name("Reset");
}

export async function initThree(canvas, options = {}, dotNetRef = null) {
  disposeThree();

  const currentInstanceId = ++instanceId;
  const config = { ...DEFAULT_CONFIG, ...options };

  const scene = new THREE.Scene();

  const coloredVignette = screenUV.distance(0.5).mix(
    hue(color(0x0175ad), time.mul(0.1)),
    hue(color(0x02274f), time.mul(0.5))
  );
  const lightSpeedEffect = lightSpeed(normalWorldGeometry).clamp();
  const lightSpeedSky = normalWorldGeometry.y.remapClamp(-0.1, 1).mix(0, lightSpeedEffect);
  scene.backgroundNode = blendDodge(coloredVignette, lightSpeedSky);

  const helpers = new THREE.Group();
  helpers.visible = !!config.showHelpers;
  scene.add(helpers);

  scene.add(new THREE.HemisphereLight(0xe9c0a5, 0x0175ad, 5));

  const dirLight = new THREE.DirectionalLight(0xfff9ea, 4);
  dirLight.position.set(2, 5, 2);
  scene.add(dirLight);

  const { width, height } = getCanvasSize(canvas);
  const camera = new THREE.PerspectiveCamera(40, width / height, 0.25, 50);
  camera.position.set(0, config.cameraY, config.cameraZ);

  const renderer = new THREE.WebGPURenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
  renderer.toneMapping = THREE.NeutralToneMapping;

  try {
    renderer.inspector = new Inspector();
    if (!renderer.inspector.domElement.parentElement) {
      document.body.appendChild(renderer.inspector.domElement);
    }
  } catch (err) {
    console.warn("Inspector no disponible en este entorno:", err);
  }

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 3;
  controls.maxDistance = 12;
  controls.target.set(0, 1, 0);
  controls.maxPolarAngle = Math.PI / 2;

  const timer = new THREE.Timer();
  timer.connect(document);

  const reflection = reflector();
  reflection.target.rotateX(-Math.PI / 2);
  scene.add(reflection.target);

  const floorMaterial = new THREE.NodeMaterial();
  floorMaterial.colorNode = reflection;
  floorMaterial.opacity = config.reflectorOpacity;
  floorMaterial.transparent = true;

  const floor = new THREE.Mesh(new THREE.BoxGeometry(50, 0.001, 50), floorMaterial);
  floor.receiveShadow = true;
  scene.add(floor);

  const onResize = () => {
    const { width: w, height: h } = getCanvasSize(canvas);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };
  window.addEventListener("resize", onResize);

  current = {
    renderer, scene, camera, controls, helpers, timer, floorMaterial,
    onResize,
    instanceId: currentInstanceId,
    source: null,
    mixer: null,
    canvas,
    dotNetRef,
    config
  };

  setupNativeInspectorControls();
  notifyConfigChanged();

  function animate() {
    if (currentInstanceId !== instanceId) return;
    timer.update();
    const delta = timer.getDelta();
    current.source?.mixer.update(delta);
    current.mixer?.update(delta);
    controls.update();
    renderer.render(scene, camera);
  }

  renderer.setAnimationLoop(animate);

  try {
    const [sourceModel, targetModel] = await Promise.all([
      loadGltf(config.sourceUrl),
      loadGltf(config.targetUrl)
    ]);

    if (currentInstanceId !== instanceId) {
      return;
    }

    scene.add(sourceModel.scene);
    scene.add(targetModel.scene);

    sourceModel.scene.position.x -= 0.8;
    targetModel.scene.position.x += 0.7;
    targetModel.scene.position.z -= 0.1;
    targetModel.scene.scale.setScalar(0.01);

    sourceModel.scene.rotation.y = Math.PI / 2;
    targetModel.scene.rotation.y = -Math.PI / 2;

    current.source = getSource(sourceModel, helpers);
    current.mixer = retargetModel(current.source, targetModel, helpers);
  } catch (err) {
    console.error("No se pudieron cargar los modelos GLB de retargeting:", err);
    if (dotNetRef) {
      dotNetRef.invokeMethodAsync("OnModelLoadError", String(err?.message ?? err)).catch(() => {});
    }
  }
}

export function updateConfig(options = {}) {
  if (!current) return;

  Object.assign(current.config, options);

  if (typeof options.showHelpers === "boolean") {
    current.helpers.visible = options.showHelpers;
  }

  if (typeof options.reflectorOpacity === "number") {
    current.floorMaterial.opacity = options.reflectorOpacity;
  }

  let cameraChanged = false;
  if (typeof options.cameraZ === "number") { current.camera.position.z = options.cameraZ; cameraChanged = true; }
  if (typeof options.cameraY === "number") { current.camera.position.y = options.cameraY; cameraChanged = true; }
  if (cameraChanged) current.controls.update();

  notifyConfigChanged();
}

export function disposeThree() {
  if (!current) return;

  instanceId++;
  current.renderer.setAnimationLoop(null);
  window.removeEventListener("resize", current.onResize);
  current.controls.dispose();
  current.timer.disconnect(document);

  current.scene.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      materials.forEach((mat) => {
        if (mat.map) mat.map.dispose();
        mat.dispose();
      });
    }
  });

  current.renderer.dispose();

  const inspectorShell = document.getElementById("profiler-shell");
  if (inspectorShell) {
    inspectorShell.remove();
  }

  current = null;
}
