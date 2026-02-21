import * as THREE from "../lib/three/three.module.js";
import { OrbitControls } from "../lib/three/addons/controls/OrbitControls.js";
import { FontLoader } from "../lib/three/addons/loaders/FontLoader.js";
import { TextGeometry } from "../lib/three/addons/geometries/TextGeometry.js";

let current = null;

const DEFAULT_CONFIG = {
  text: "3D",
  fontUrl: "https://threejs.org/examples/fonts/helvetiker_regular.typeface.json",
  textSize: 0.5,
  textDepth: 0.1,
  textColor: 0x111111,
  emissiveColor: 0x00ffff,
  emissiveIntensity: 2,
  backgroundColor: 0x050505,
  fogNear: 15,
  fogFar: 35,
  cameraZ: 6,
  cameraY: 1.5,
  accentColor: 0x00ffff,
  accentIntensity: 3
};

export function initThree(canvas, options = {}) {
  disposeThree();

  const config = {
    ...DEFAULT_CONFIG,
    ...options,
    textColor: toColor(options.textColor, DEFAULT_CONFIG.textColor),
    emissiveColor: toColor(options.emissiveColor, DEFAULT_CONFIG.emissiveColor),
    backgroundColor: toColor(options.backgroundColor, DEFAULT_CONFIG.backgroundColor),
    accentColor: toColor(options.accentColor, DEFAULT_CONFIG.accentColor)
  };

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  const { width, height } = getCanvasSize(canvas);
  renderer.setSize(width, height, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x000000, config.fogNear, config.fogFar);
  const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 200);
  camera.position.set(0, config.cameraY, config.cameraZ);

  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 10),
    new THREE.MeshStandardMaterial({ color: config.backgroundColor })
  );
  backdrop.position.z = -2;
  scene.add(backdrop);

  const ambient = new THREE.AmbientLight(0xffffff, 0.1);
  scene.add(ambient);
  const fill = new THREE.DirectionalLight(0xffffff, 0.4);
  fill.position.set(3, 3, 3);
  scene.add(fill);
  const accent = new THREE.PointLight(config.accentColor, config.accentIntensity, 12, 1.5);
  accent.position.set(0, 1.3, 2.5);
  scene.add(accent);

  const sourceText = config.text;
  const { textOnly, emojis } = splitTextAndEmoji(sourceText);

  const loader = new FontLoader();
  loader.load(config.fontUrl, (font) => {
    const geometry = new TextGeometry(textOnly || sourceText, {
      font,
      size: config.textSize,
      depth: config.textDepth,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.008
    });
    geometry.computeBoundingBox();
    const boundingBox = geometry.boundingBox;
    if (!boundingBox) {
      return;
    }

    const offsetX = -0.5 * (boundingBox.max.x - boundingBox.min.x);
    const offsetY = -0.5 * (boundingBox.max.y - boundingBox.min.y);
    const material = new THREE.MeshStandardMaterial({
      color: config.textColor,
      emissive: config.emissiveColor,
      emissiveIntensity: config.emissiveIntensity,
      metalness: 0.25,
      roughness: 0.35
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(offsetX, 1 + offsetY, 0);
    scene.add(mesh);

    if (emojis.length > 0) {
      const textWidth = boundingBox.max.x - boundingBox.min.x;
      const spacing = 0.36;
      emojis.slice(0, 3).forEach((emoji, index) => {
        const emojiSprite = createEmojiSprite(emoji);
        emojiSprite.position.set(offsetX + textWidth + 0.35 + (index * spacing), 1 + offsetY + 0.15, 0.05);
        scene.add(emojiSprite);
      });
    }

    accent.position.set(offsetX, 1 + offsetY + 0.25, 2.2);
  });

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 1, 0);
  controls.update();

  const onResize = () => {
    const { width: newWidth, height: newHeight } = getCanvasSize(canvas);
    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(newWidth, newHeight, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  };
  window.addEventListener("resize", onResize);

  let animationId = 0;

  function animate() {
    controls.update();
    renderer.render(scene, camera);
    animationId = requestAnimationFrame(animate);
  }

  animate();

  current = {
    renderer,
    scene,
    controls,
    onResize,
    animationId
  };
}

export function disposeThree() {
  if (!current) {
    return;
  }

  cancelAnimationFrame(current.animationId);
  window.removeEventListener("resize", current.onResize);
  current.controls.dispose();
  current.scene.traverse((obj) => {
    if (obj.isMesh) {
      obj.geometry?.dispose?.();
      if (Array.isArray(obj.material)) {
        obj.material.forEach((material) => {
          material?.map?.dispose?.();
          material?.dispose?.();
        });
      } else {
        obj.material?.map?.dispose?.();
        obj.material?.dispose?.();
      }
    } else if (obj.isSprite) {
      obj.material?.map?.dispose?.();
      obj.material?.dispose?.();
    }
  });
  current.renderer.dispose();
  current = null;
}

function getCanvasSize(canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    width: Math.max(1, Math.floor(rect.width || window.innerWidth || 800)),
    height: Math.max(1, Math.floor(rect.height || window.innerHeight || 400))
  };
}

function splitTextAndEmoji(text) {
  const matches = [...text.matchAll(/\p{Extended_Pictographic}/gu)];
  const emojis = matches.map((m) => m[0]);
  const textOnly = text.replace(/\p{Extended_Pictographic}|\uFE0F/gu, "").replace(/\s+/g, " ").trim();
  return { textOnly, emojis };
}

function createEmojiSprite(emoji) {
  const size = 256;
  const emojiCanvas = document.createElement("canvas");
  emojiCanvas.width = size;
  emojiCanvas.height = size;
  const ctx = emojiCanvas.getContext("2d");

  if (!ctx) {
    return new THREE.Sprite();
  }

  ctx.clearRect(0, 0, size, size);
  ctx.font = "180px Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, size / 2, size / 2 + 8);

  const texture = new THREE.CanvasTexture(emojiCanvas);
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.55, 0.55, 1);
  return sprite;
}

function toColor(value, fallback) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}
