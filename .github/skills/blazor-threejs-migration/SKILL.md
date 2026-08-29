---
name: blazor-threejs-migration
description: "Reconstruye o migra una integración de Three.js en Blazor WebAssembly hacia otro proyecto .NET, incluso cuando el proyecto destino no tenga acceso al código fuente original. Preserva vendoring local, bridge JS, página Razor, cleanup, y deploy consistente en GitHub Pages." 
license: MIT
metadata:
  author: GitHub Copilot
  version: "1.0.0"
---

# Blazor Three.js Migration

> **GUIDANCE DERIVED FROM A WORKING REPOSITORY**
>
> Esta skill empaqueta un flujo probado para mover o reconstruir una integración de Three.js en un proyecto Blazor WebAssembly nuevo. No asumas que el template vacío ya trae soporte para assets JS ESM, vendoring offline o deploy a GitHub Pages: verifícalo y añádelo explícitamente.
>
> **IMPORTANTE**: esta skill debe poder ejecutarse aunque el proyecto destino no tenga este repositorio ni acceso a sus archivos. Si el código original existe, úsalo sólo como referencia opcional; si no existe, genera los archivos equivalentes desde cero usando las plantillas y criterios de esta skill.

---

## Triggers

Activa esta skill cuando el usuario pida:
- Migrar Three.js a un Blazor WebAssembly nuevo o vacío
- Reproducir la página 3D de este repo en otro proyecto
- Portar el bridge JS y la lógica del mundo 3D a otro template .NET
- Reconstruir la integración desde cero en otro repo sin copiar archivos del original
- Dejar Three.js offline o sin CDN en Blazor
- Mantener el deploy a GitHub Pages funcionando después de agregar Three.js

---

## Operating Modes

### Mode A: Source-Assisted Migration

Usa este modo sólo si el repositorio original está disponible. En ese caso, toma como referencia:
- el `.csproj` con vendoring automático de Three.js en Build/Publish
- el bridge JS con el mundo 3D, ciclo de vida y limpieza
- una página Razor mínima y, si aplica, otra interactiva
- el workflow de GitHub Pages

### Mode B: Standalone Reconstruction

Usa este modo cuando el proyecto destino no tiene acceso al repo original. En ese caso, esta skill debe producir desde cero estos artefactos mínimos:
- un `.csproj` con target `VendorThreeJs`
- un módulo `wwwroot/js/three-bridge.js`
- una página Razor que importe el bridge
- opcionalmente, un workflow de GitHub Pages
- opcionalmente, assets locales como fuentes JSON para offline total

En modo standalone, no hagas referencia a archivos inexistentes del repo original. La skill debe generar el resultado final directamente.

---

## Rules

1. **No uses CDN para la librería Three.js**. Replica el vendoring local desde npm a `wwwroot/lib/three` vía MSBuild.
2. **Mantén un bridge JS separado**. La lógica del mundo 3D vive en un módulo ESM dentro de `wwwroot/js`; la página Razor sólo importa y coordina.
3. **Limpia recursos explícitamente**. Cancela `requestAnimationFrame`, remueve listeners globales, libera controles, geometrías, materiales y renderer.
4. **No recrees la escena sin motivo**. Si sólo cambian colores, luces o cámara, actualiza en sitio. Si cambia geometría o texto, recrea la escena preservando la cámara cuando aplique.
5. **GitHub Pages es un caso especial**. Si el destino publica bajo un subpath, actualiza `base href`, genera `404.html` y crea `.nojekyll`.
6. **Modo offline real requiere revisar fuentes y otros assets remotos**. En este repo, Three.js está vendorizado localmente, pero la fuente 3D por defecto sigue cargándose desde `threejs.org`. Si el objetivo es 100% offline, mueve también la fuente a `wwwroot` y usa una URL local.
7. **Valida con build real**. No cierres la migración si no pasa `dotnet build` y si no existen los archivos esperados bajo `wwwroot/lib/three`.
8. **La skill debe ser autosuficiente**. Si el usuario pide migrar a otro repo sin compartir el código original, entrega archivos nuevos completos o cambios concretos que puedan aplicarse directamente en el proyecto destino.

---

## Decision Points

### 1. Qué variante de página mover

- Si el usuario sólo necesita mostrar una escena o texto 3D sin edición en vivo, usa el patrón mínimo de `Pages/Love3d.razor`.
- Si el usuario necesita controles de UI, reconfiguración en caliente o sincronización cámara/UI, usa el patrón de `Pages/3D.razor`.
- Si el proyecto destino no tiene el código fuente anterior, genera una variante mínima primero y añade la avanzada sólo si el usuario la necesita.

### 2. Qué nivel de offline necesita

- Si basta con evitar CDN para Three.js y addons, replica el `VendorThreeJs` del `.csproj`.
- Si el requerimiento es cero dependencias remotas en runtime, localiza también la fuente JSON del texto 3D y cualquier asset externo adicional.

### 3. Qué cambios deben recrear la escena

- Requieren reinicialización: texto, tamaño del texto, profundidad, geometría distinta.
- Se actualizan en sitio: colores, intensidad de luces, fondo, niebla, posición de cámara.

### 4. Cómo se desplegará

- Si se desplegará en GitHub Pages, replica el workflow con `actions/setup-node`, `dotnet publish`, ajuste de `base href`, `404.html` y `.nojekyll`.
- Si se ejecutará sólo localmente o en otro host, el ajuste de `base href` puede no ser necesario.

---

## Workflow

### Phase 1: Auditar el template Blazor destino

1. Confirma que el proyecto destino es Blazor WebAssembly y que el `.csproj` compila con la versión de .NET esperada.
2. Verifica si ya existe carpeta `wwwroot/js` y si el proyecto admite import dinámico de módulos JS desde Razor.
3. Verifica si el deploy será local, GitHub Pages u otro hosting con subpath.
4. Pregunta si el requisito offline es parcial o estricto.
5. Si el usuario no provee el repo original, asume modo standalone y reconstruye los artefactos desde esta skill.

### Phase 2: Migrar el vendoring de Three.js al `.csproj`

1. Copia las propiedades necesarias al `PropertyGroup`:
   - `ThreeJsVersion`
   - `ThreeJsWwwrootDir`
   - `ErrorOnMissingNpm`
2. Agrega un target `VendorThreeJs` con `BeforeTargets="Build;Publish"`.
3. Dentro del target:
   - valida que `npm` exista
   - crea un proyecto temporal bajo `obj/threejs`
   - instala `three` con versión fija
   - limpia `wwwroot/lib/three`
   - copia `three.module.js`
   - copia `three.core.js`
   - copia `examples/jsm/**` a `wwwroot/lib/three/addons`
4. No reemplaces este paso por copias manuales en el repo destino; la intención es que Build y Publish produzcan el mismo árbol de assets.

Plantilla mínima del target a generar si no existe implementación previa:

```xml
<PropertyGroup>
   <ThreeJsVersion>0.183.1</ThreeJsVersion>
   <ThreeJsWwwrootDir>$(MSBuildProjectDirectory)\wwwroot\lib\three</ThreeJsWwwrootDir>
   <ErrorOnMissingNpm>true</ErrorOnMissingNpm>
</PropertyGroup>

<Target Name="VendorThreeJs" BeforeTargets="Build;Publish">
   <PropertyGroup>
      <_ThreeObjDir>$(BaseIntermediateOutputPath)threejs</_ThreeObjDir>
   </PropertyGroup>

   <Exec Command="npm --version" ContinueOnError="true">
      <Output TaskParameter="ExitCode" PropertyName="_NpmExitCode" />
   </Exec>

   <Error Condition="'$(_NpmExitCode)' != '0' AND '$(ErrorOnMissingNpm)' == 'true'"
             Text="npm no está disponible. Instala Node.js o desactiva ErrorOnMissingNpm." />

   <MakeDir Directories="$(_ThreeObjDir)" />
   <Exec WorkingDirectory="$(_ThreeObjDir)" Command="npm init -y" />
   <Exec WorkingDirectory="$(_ThreeObjDir)" Command="npm i three@$(ThreeJsVersion)" />

   <RemoveDir Directories="$(ThreeJsWwwrootDir)" />
   <MakeDir Directories="$(ThreeJsWwwrootDir)\addons" />

   <Copy SourceFiles="$(_ThreeObjDir)\node_modules\three\build\three.module.js"
            DestinationFiles="$(ThreeJsWwwrootDir)\three.module.js" />

   <Copy SourceFiles="$(_ThreeObjDir)\node_modules\three\build\three.core.js"
            DestinationFiles="$(ThreeJsWwwrootDir)\three.core.js" />

   <ItemGroup>
      <_ThreeAddons Include="$(_ThreeObjDir)\node_modules\three\examples\jsm\**\*.*" />
   </ItemGroup>

   <Copy SourceFiles="@(_ThreeAddons)"
            DestinationFiles="@(_ThreeAddons->'$(ThreeJsWwwrootDir)\addons\%(RecursiveDir)%(Filename)%(Extension)')" />
</Target>
```

### Phase 3: Migrar el bridge JS

1. Crea `wwwroot/js/three-bridge.js`.
2. Importa desde rutas locales:
   - `../lib/three/three.module.js`
   - addons necesarios como `OrbitControls`, `FontLoader`, `TextGeometry`
3. Conserva estas responsabilidades mínimas en el bridge:
   - construir `renderer`, `scene`, `camera` y controles
   - reaccionar a `resize`
   - iniciar y detener el loop de animación
   - encapsular `initThree`, `updateConfig` y `disposeThree`
   - liberar recursos al desmontar
4. Si migras el modo interactivo, conserva la distinción entre:
   - reinicialización completa para cambios de geometría
   - actualización incremental para cambios de color/luz/cámara
5. Si el objetivo es offline total, cambia `fontUrl` a una ruta local en `wwwroot`, por ejemplo una fuente JSON vendorizada por el proyecto.

Plantilla mínima del bridge cuando hay que reconstruirlo desde cero:

```js
import * as THREE from "../lib/three/three.module.js";
import { OrbitControls } from "../lib/three/addons/controls/OrbitControls.js";

let current = null;

export function initThree(canvas, options = {}) {
   disposeThree();

   const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
   const width = Math.max(1, canvas.clientWidth || window.innerWidth || 800);
   const height = Math.max(1, canvas.clientHeight || window.innerHeight || 400);
   renderer.setSize(width, height, false);
   renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

   const scene = new THREE.Scene();
   const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 200);
   camera.position.set(0, 1, 3);

   scene.add(new THREE.AmbientLight(0xffffff, 0.5));

   const light = new THREE.DirectionalLight(0xffffff, 1);
   light.position.set(3, 4, 3);
   scene.add(light);

   const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x00bcd4 })
   );
   scene.add(mesh);

   const controls = new OrbitControls(camera, renderer.domElement);
   controls.enableDamping = true;

   const onResize = () => {
      const nextWidth = Math.max(1, canvas.clientWidth || window.innerWidth || 800);
      const nextHeight = Math.max(1, canvas.clientHeight || window.innerHeight || 400);
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight, false);
   };

   window.addEventListener("resize", onResize);

   let animationId = 0;

   function animate() {
      mesh.rotation.y += 0.01;
      controls.update();
      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
   }

   animate();

   current = { renderer, scene, camera, controls, mesh, onResize, animationId };
}

export function updateConfig(options = {}) {
   if (!current) return;
   if (typeof options.cameraZ === "number") current.camera.position.z = options.cameraZ;
   if (typeof options.cameraY === "number") current.camera.position.y = options.cameraY;
   if (typeof options.meshColor === "number") current.mesh.material.color.setHex(options.meshColor);
}

export function disposeThree() {
   if (!current) return;

   cancelAnimationFrame(current.animationId);
   window.removeEventListener("resize", current.onResize);
   current.controls.dispose();

   current.scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
         if (Array.isArray(obj.material)) {
            obj.material.forEach((mat) => mat.dispose());
         } else {
            obj.material.dispose();
         }
      }
   });

   current.renderer.dispose();
   current = null;
}
```

### Phase 4: Crear la página Razor

1. Crea una nueva página, por ejemplo `Pages/ThreeDemo.razor`.
2. Define un `<canvas>` con `ElementReference`.
3. En `OnAfterRenderAsync(firstRender)`:
   - resuelve la URL del módulo con `Navigation.BaseUri`
   - importa `js/three-bridge.js`
   - invoca `initThree`
4. Implementa `IAsyncDisposable` y en `DisposeAsync`:
   - llama `disposeThree`
   - libera el módulo JS
5. Si el usuario necesita edición en vivo:
   - añade panel de configuración en Razor
   - usa `DotNetObjectReference`
   - expón métodos `[JSInvokable]` sólo para sincronización necesaria, por ejemplo cámara

Plantilla mínima de página Razor en modo standalone:

```razor
@page "/three-demo"
@implements IAsyncDisposable
@inject IJSRuntime JS
@inject NavigationManager Navigation

<PageTitle>Three Demo</PageTitle>

<canvas @ref="canvasRef" style="width:100%; height:60vh; display:block;"></canvas>

@code {
   private ElementReference canvasRef;
   private IJSObjectReference? module;

   protected override async Task OnAfterRenderAsync(bool firstRender)
   {
      if (!firstRender)
      {
         return;
      }

      var moduleUrl = new Uri(new Uri(Navigation.BaseUri), "js/three-bridge.js").ToString();
      module = await JS.InvokeAsync<IJSObjectReference>("import", moduleUrl);
      await module.InvokeVoidAsync("initThree", canvasRef);
   }

   public async ValueTask DisposeAsync()
   {
      if (module is not null)
      {
         await module.InvokeVoidAsync("disposeThree");
         await module.DisposeAsync();
      }
   }
}
```

### Phase 5: Replicar el workflow de GitHub Pages

1. Agrega `actions/setup-node@v4` antes de `dotnet publish`.
2. Publica el proyecto con `dotnet publish`.
3. Si el sitio vive bajo `/repo-name/`, reescribe `index.html` para usar el `base href` correcto.
4. Copia `index.html` a `404.html` para soportar rutas SPA.
5. Crea `.nojekyll`.
6. Sube `release/wwwroot` como artifact de Pages.

Plantilla mínima del job de build para Pages:

```yaml
jobs:
   build:
      runs-on: ubuntu-latest
      steps:
         - uses: actions/checkout@v4

         - name: Setup .NET
            uses: actions/setup-dotnet@v4
            with:
               dotnet-version: '10.0.x'

         - name: Setup Node
            uses: actions/setup-node@v4
            with:
               node-version: '20'

         - name: Publish
            run: dotnet publish MyApp.csproj -c Release -o release
```

### Phase 6: Validación obligatoria

1. Ejecuta `dotnet build` en el proyecto destino.
2. Verifica que existan estos archivos:
   - `wwwroot/lib/three/three.module.js`
   - `wwwroot/lib/three/three.core.js`
   - `wwwroot/lib/three/addons/controls/OrbitControls.js`
   - `wwwroot/lib/three/addons/loaders/FontLoader.js`
   - `wwwroot/lib/three/addons/geometries/TextGeometry.js`
3. Si se usa GitHub Pages, valida que el workflow incluya Node 20 antes del publish.
4. Si se prometió modo offline estricto, verifica que no queden URLs remotas activas para fuentes u otros assets del bridge.
5. Haz una prueba funcional mínima:
   - la página monta el canvas
   - no falla el import del módulo
   - al navegar fuera de la página no quedan errores por listeners o animación activa
6. Si la migración se hizo sin repo origen, valida además que los archivos generados por la propia skill son suficientes y no contienen referencias a rutas o clases que no existen en el proyecto destino.

---

## Completion Criteria

La migración queda lista sólo si se cumplen todos estos puntos:

- El proyecto destino compila con `dotnet build`.
- El target de vendoring corre en Build/Publish y materializa el árbol de Three.js en `wwwroot/lib/three`.
- La página Razor importa el módulo mediante `Navigation.BaseUri` y no depende de rutas frágiles.
- El bridge expone al menos `initThree` y `disposeThree`; si hay configuración viva, también `updateConfig`.
- La limpieza libera animación, listeners, controles y recursos WebGL.
- El deploy a GitHub Pages, si aplica, incluye setup de Node y ajustes de SPA.
- Si el requisito era offline estricto, no quedan referencias de runtime a `threejs.org`, CDN ni assets remotos equivalentes.

---

## Anti-Patterns

Evita estas decisiones:

- Copiar manualmente archivos de `node_modules` al repo destino sin automatizarlo en MSBuild
- Importar Three.js desde CDN mientras el resto del flujo se describe como offline
- Dejar la lógica de escena embebida en el `.razor` en lugar de un módulo JS reutilizable
- Omitir `disposeThree` o liberar sólo el módulo JS sin limpiar la escena y el renderer
- Rehacer toda la escena en cada cambio de color o cámara
- Publicar a GitHub Pages sin corregir `base href`

---

## Outputs

Esta skill normalmente produce:

- Un `.csproj` con vendoring automático de Three.js
- Un módulo `wwwroot/js/three-bridge.js`
- Una o más páginas Razor que consumen el bridge
- Un workflow de GitHub Pages compatible con Node + .NET
- Opcionalmente, assets locales adicionales como fuentes JSON para modo offline total
- En modo standalone, el contenido base necesario para generar esos archivos sin depender del repo original

---

## Suggested Prompts

- Migra la página 3D de este repo a un Blazor WebAssembly nuevo, manteniendo Three.js offline y deploy en GitHub Pages.
- Porta sólo la versión mínima tipo Love3d a un template vacío de .NET 10.
- Reproduce el bridge Three.js y el panel interactivo de configuración en otro proyecto Blazor.
- Convierte esta integración para que sea realmente offline, incluyendo la fuente del texto 3D.
- Crea desde cero en otro repo la misma base técnica de Three.js para Blazor, sin asumir acceso al proyecto fuente.

---

## Optional Provenance Notes

Si el repo original está disponible, estos datos te ayudan a alinear la migración. Si no está disponible, ignora esta sección y trabaja con las plantillas anteriores.

Detalles confirmados en el repo de origen usado para derivar esta skill:

- El vendoring de Three.js está definido en `Profile.csproj` con versión fija `0.183.1`.
- El workflow de GitHub Pages instala Node 20 antes del publish.
- La página mínima es `Pages/Love3d.razor`.
- La página avanzada es `Pages/3D.razor`.
- El bridge actual ya implementa `initThree`, `updateConfig` y `disposeThree`.
- El bridge actual **no es 100% offline** porque `DEFAULT_CONFIG.fontUrl` apunta a `https://threejs.org/examples/fonts/helvetiker_regular.typeface.json`.

Usa este último punto como check obligatorio si alguien pide una migración completamente offline.