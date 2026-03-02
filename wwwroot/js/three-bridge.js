import * as THREE from "../lib/three/three.module.js";
import { OrbitControls } from "../lib/three/addons/controls/OrbitControls.js";
import { FontLoader } from "../lib/three/addons/loaders/FontLoader.js";
import { TextGeometry } from "../lib/three/addons/geometries/TextGeometry.js";

let current = null;
let instanceId = 0;
let cachedFont = null;
let cachedFontUrl = null;

function loadFont(url) {
  return new Promise((resolve, reject) => {
    if (cachedFont && cachedFontUrl === url) {
      resolve(cachedFont);
      return;
    }
    const loader = new FontLoader();
    loader.load(url, (font) => {
      cachedFont = font;
      cachedFontUrl = url;
      resolve(font);
    }, undefined, reject);
  });
}

const DEFAULT_CONFIG = {
  text: "CV 3D",
  fontUrl: "https://threejs.org/examples/fonts/helvetiker_regular.typeface.json",
  textSize: 1.5,
  textDepth: 0.05,
  textColor: 0x111111,
  emissiveColor: 0x00ffff,
  emissiveIntensity: 0.2,
  backgroundColor: 0x9021C0,
  fogNear: 15,
  fogFar: 35,
  cameraZ: 2.1,
  cameraY: 1.0,
  accentColor: 0xD55F10,
  accentIntensity: 10
};

export function initThree(canvas, options = {}, dotNetRef = null) {
  // Guardar estado de cámara antes de destruir la escena
  let savedCamera = null;
  if (current && current.camera && current.controls) {
    savedCamera = {
      position: current.camera.position.clone(),
      target: current.controls.target.clone()
    };
  }

  disposeThree();

  // Incrementar ID para detectar si esta instancia sigue activa
  const currentInstanceId = ++instanceId;

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
  scene.fog = new THREE.Fog(config.backgroundColor, config.fogNear, config.fogFar);
  const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 200);
  camera.position.set(0, config.cameraY, config.cameraZ);

  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 10),
    new THREE.MeshStandardMaterial({ color: config.backgroundColor })
  );
  backdrop.position.z = -2;
  scene.add(backdrop);

  const ambient = new THREE.AmbientLight(0xffffff, 0.05);
  scene.add(ambient);
  const fill = new THREE.DirectionalLight(0xffffff, 0.2);
  fill.position.set(3, 3, 3);
  scene.add(fill);
  
  // PointLight: color, intensity, distance (0=infinito), decay (1=lineal, 2=físico)
  // Reducimos decay a 1 para que la intensidad tenga más efecto visible
  const accent = new THREE.PointLight(config.accentColor, config.accentIntensity, 0, 1);
  accent.position.set(0, 1.3, 2.5);
  scene.add(accent);

  const sourceText = config.text;
  const { textOnly, emojis } = splitTextAndEmoji(sourceText);

  loadFont(config.fontUrl).then((font) => {
    if (currentInstanceId !== instanceId || !current) {
      return;
    }

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
    current.textMesh = mesh;

    if (emojis.length > 0) {
      const textWidth = boundingBox.max.x - boundingBox.min.x;
      const spacing = 0.36;
      emojis.forEach((emoji, index) => {
        const emojiSprite = createEmojiSprite(emoji);
        emojiSprite.position.set(offsetX + textWidth + 0.35 + (index * spacing), 1 + offsetY + 0.15, 0.05);
        scene.add(emojiSprite);
      });
    }

    accent.position.set(offsetX, 1 + offsetY + 0.25, 2.2);
  });

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  if (savedCamera) {
    camera.position.copy(savedCamera.position);
    controls.target.copy(savedCamera.target);
  } else {
    controls.target.set(0, 1, 0);
  }
  controls.update();

  // Callback throttled para sincronizar cámara con Blazor
  let cameraThrottleId = null;
  const onControlsChange = () => {
    if (cameraThrottleId || !dotNetRef) return;
    cameraThrottleId = setTimeout(() => {
      cameraThrottleId = null;
      if (current && current.camera) {
        const p = current.camera.position;
        dotNetRef.invokeMethodAsync("OnCameraChanged",
          Math.round(p.y * 100) / 100,
          Math.round(p.z * 100) / 100
        ).catch(() => {});
      }
    }, 120);
  };
  controls.addEventListener("change", onControlsChange);

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
    // Verificar que esta instancia sigue activa
    if (currentInstanceId !== instanceId) {
      return;
    }
    controls.update();
    renderer.render(scene, camera);
    animationId = requestAnimationFrame(animate);
  }

  animate();

  current = {
    renderer,
    scene,
    camera,
    controls,
    onResize,
    animationId,
    instanceId: currentInstanceId,
    accent,
    backdrop,
    textMesh: null,
    dotNetRef,
    onControlsChange
  };
}

// Actualización in-place de colores, luces y cámara sin recrear la escena
export function updateConfig(options = {}) {
  if (!current) return;

  const accentColor = toColor(options.accentColor, null);
  const textColor = toColor(options.textColor, null);
  const emissiveColor = toColor(options.emissiveColor, null);
  const backgroundColor = toColor(options.backgroundColor, null);

  // Actualizar luz accent
  if (current.accent) {
    if (accentColor !== null) current.accent.color.setHex(accentColor);
    if (options.accentIntensity != null) current.accent.intensity = options.accentIntensity;
  }

  // Actualizar material del texto
  if (current.textMesh) {
    const mat = current.textMesh.material;
    if (textColor !== null) mat.color.setHex(textColor);
    if (emissiveColor !== null) mat.emissive.setHex(emissiveColor);
    if (options.emissiveIntensity != null) mat.emissiveIntensity = options.emissiveIntensity;
  }

  // Actualizar fondo y fog
  if (backgroundColor !== null) {
    if (current.backdrop) current.backdrop.material.color.setHex(backgroundColor);
    if (current.scene && current.scene.fog) current.scene.fog.color.setHex(backgroundColor);
  }

  // Actualizar cámara
  if (current.camera && current.controls) {
    let changed = false;
    if (options.cameraZ != null) { current.camera.position.z = options.cameraZ; changed = true; }
    if (options.cameraY != null) { current.camera.position.y = options.cameraY; changed = true; }
    if (changed) current.controls.update();
  }
}

export function disposeThree() {
  if (!current) {
    return;
  }

  // Detener animación inmediatamente
  if (current.animationId) {
    cancelAnimationFrame(current.animationId);
    current.animationId = 0;
  }

  // Remover event listener
  window.removeEventListener("resize", current.onResize);

  // Dispose de controles
  if (current.controls) {
    if (current.onControlsChange) {
      current.controls.removeEventListener("change", current.onControlsChange);
    }
    current.controls.dispose();
  }

  // Limpiar todos los objetos de la escena
  if (current.scene) {
    while (current.scene.children.length > 0) {
      const obj = current.scene.children[0];
      current.scene.remove(obj);
      
      if (obj.geometry) {
        obj.geometry.dispose();
      }
      
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((mat) => {
            if (mat.map) mat.map.dispose();
            mat.dispose();
          });
        } else {
          if (obj.material.map) obj.material.map.dispose();
          obj.material.dispose();
        }
      }
    }
  }

  // Limpiar renderer
  if (current.renderer) {
    current.renderer.renderLists.dispose();
    current.renderer.dispose();
  }

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
  // Regex mejorada para capturar emojis completos incluyendo:
  // - Modificadores de tono de piel
  // - Secuencias ZWJ (familia, profesiones)
  // - Banderas
  // - Variaciones de presentación
  const emojiRegex = /(\p{Extended_Pictographic}|\p{Emoji_Modifier_Base})([\u{1F3FB}-\u{1F3FF}])?(\u{FE0F})?(\u{200D}(\p{Extended_Pictographic}|\p{Emoji_Modifier_Base})([\u{1F3FB}-\u{1F3FF}])?(\u{FE0F})?)*|[\u{1F1E6}-\u{1F1FF}]{2}/gu;
  const matches = [...text.matchAll(emojiRegex)];
  const emojis = matches.map((m) => m[0]);
  // Eliminar todos los emojis capturados del texto
  let textOnly = text;
  for (const emoji of emojis) {
    textOnly = textOnly.replace(emoji, "");
  }
  textOnly = textOnly.replace(/\s+/g, " ").trim();
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
