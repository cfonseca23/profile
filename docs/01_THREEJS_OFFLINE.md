# Plan de Trabajo: Three.js Offline + Build Consistente (Local & GitHub Pages)

## Objetivo

Integrar **Three.js como dependencia local (vendored)** dentro de `wwwroot/lib/three/`, eliminando la dependencia de CDN. El `.csproj` automatiza la descarga vía npm en **Build y Publish**, garantizando el mismo resultado en desarrollo local y en GitHub Actions.

---

## Requisitos Previos

| Requisito | Detalle |
|-----------|---------|
| **Node.js 20+** | Incluye npm. Necesario local y en CI. |
| **npm** | Se usa para descargar `three@0.183.1` (versión exacta, corresponde a r183). |
| **.NET 10 SDK** | Ya configurado en el proyecto. |

---

## Estructura Final Esperada

Después del build/publish, `wwwroot/` contendrá:

```
wwwroot/
├── lib/
│   └── three/
│       ├── three.module.js              ← Core ESM
│       └── addons/
│           ├── controls/
│           │   └── OrbitControls.js
│           ├── loaders/
│           │   └── GLTFLoader.js
│           └── ... (más addons según necesidad)
├── js/
│   └── three-bridge.js                  ← Bridge JS para Blazor
├── css/
│   └── app.css
├── data/
│   └── cv.json
├── images/
└── index.html
```

---

## Fases del Plan

### Fase 1: Modificar `Profile.csproj` — Target de Vendoring

**Archivo:** `Profile.csproj`

- [ ] **1.1** Agregar propiedades de Three.js al `<PropertyGroup>` existente
  ```xml
  <!-- Three.js vendoring -->
  <ThreeJsVersion>0.183.1</ThreeJsVersion>
  <ThreeJsWwwrootDir>$(MSBuildProjectDirectory)\wwwroot\lib\three</ThreeJsWwwrootDir>
  <ErrorOnMissingNpm>true</ErrorOnMissingNpm>
  ```

- [ ] **1.2** Agregar el Target `VendorThreeJs` con `BeforeTargets="Build;Publish"`
  - Verifica que npm esté disponible
  - Crea carpeta temporal en `obj/threejs`
  - Ejecuta `npm init -y` + `npm i three@<version>`
  - Limpia y recrea `wwwroot/lib/three/`
  - Copia `three.module.js` (core ESM)
  - Copia `three.core.js` (requerido en r183)
  - Copia `examples/jsm/` completo a `wwwroot/lib/three/addons/`

- [ ] **1.3** Verificar que `dotnet build` descarga y copia Three.js correctamente
  ```powershell
  dotnet build
  # Verificar:
  # - wwwroot/lib/three/three.module.js existe
  # - wwwroot/lib/three/three.core.js existe
  # - wwwroot/lib/three/addons/controls/OrbitControls.js existe
  ```

**Contenido completo del `.csproj` modificado:**

```xml
<Project Sdk="Microsoft.NET.Sdk.BlazorWebAssembly">

  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <OverrideHtmlAssetPlaceholders>true</OverrideHtmlAssetPlaceholders>

    <!-- Three.js vendoring (r183) -->
    <ThreeJsVersion>0.183.1</ThreeJsVersion>
    <ThreeJsWwwrootDir>$(MSBuildProjectDirectory)\wwwroot\lib\three</ThreeJsWwwrootDir>
    <ErrorOnMissingNpm>true</ErrorOnMissingNpm>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.Components.WebAssembly" Version="10.0.2" />
    <PackageReference Include="Microsoft.AspNetCore.Components.WebAssembly.DevServer" Version="10.0.2" PrivateAssets="all" />
  </ItemGroup>

  <!-- Vendoring: corre en Build y Publish para consistencia local + CI -->
  <Target Name="VendorThreeJs" BeforeTargets="Build;Publish">
    <PropertyGroup>
      <_ThreeObjDir>$(BaseIntermediateOutputPath)threejs</_ThreeObjDir>
    </PropertyGroup>

    <!-- Verifica npm -->
    <Exec Command="npm --version" ContinueOnError="true">
      <Output TaskParameter="ExitCode" PropertyName="_NpmExitCode" />
    </Exec>
    <Error Condition="'$(_NpmExitCode)' != '0' AND '$(ErrorOnMissingNpm)' == 'true'"
           Text="npm no está disponible. Instala Node.js (incluye npm) o desactiva ErrorOnMissingNpm." />

    <!-- Prepara temp -->
    <MakeDir Directories="$(_ThreeObjDir)" />

    <!-- Inicializa proyecto npm temporal y fija versión exacta -->
    <Exec WorkingDirectory="$(_ThreeObjDir)" Command="npm init -y" />
    <Exec WorkingDirectory="$(_ThreeObjDir)" Command="npm i three@$(ThreeJsVersion)" />

    <!-- Limpia destino -->
    <RemoveDir Directories="$(ThreeJsWwwrootDir)" />
    <MakeDir Directories="$(ThreeJsWwwrootDir)\addons" />

    <!-- Copia core ESM -->
    <Copy SourceFiles="$(_ThreeObjDir)\node_modules\three\build\three.module.js"
          DestinationFiles="$(ThreeJsWwwrootDir)\three.module.js" />

        <!-- Copia core interno requerido por three.module.js en r183 -->
        <Copy SourceFiles="$(_ThreeObjDir)\node_modules\three\build\three.core.js"
          DestinationFiles="$(ThreeJsWwwrootDir)\three.core.js" />

        <!-- Copia addons (examples/jsm) a wwwroot/lib/three/addons con MSBuild -->
        <ItemGroup>
      <_ThreeAddons Include="$(_ThreeObjDir)\node_modules\three\examples\jsm\**\*.*" />
        </ItemGroup>

        <Copy SourceFiles="@(_ThreeAddons)"
          DestinationFiles="@(_ThreeAddons->'$(ThreeJsWwwrootDir)\addons\%(RecursiveDir)%(Filename)%(Extension)')" />
  </Target>

</Project>
```

---

### Fase 2: Crear Bridge JS (ESM offline)

**Archivo:** `wwwroot/js/three-bridge.js`

- [ ] **2.1** Crear directorio `wwwroot/js/` si no existe
- [ ] **2.2** Crear `three-bridge.js` con imports desde rutas locales (`../lib/three/...`)
- [ ] **2.3** Implementar función `initThree(canvas)` exportada:
  - `WebGLRenderer` con antialias y alpha
  - `PerspectiveCamera` con posición inicial
  - `AmbientLight` + `DirectionalLight`
  - `BoxGeometry` + `MeshStandardMaterial` (cubo demo)
  - `OrbitControls` con damping
  - Loop de animación con `requestAnimationFrame`

**Contenido:**

```js
import * as THREE from "../lib/three/three.module.js";
import { OrbitControls } from "../lib/three/addons/controls/OrbitControls.js";

export function initThree(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  const width = canvas.clientWidth || 800;
  const height = canvas.clientHeight || 400;
  renderer.setSize(width, height, false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  camera.position.set(0, 1, 3);

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(3, 3, 3);
  scene.add(dir);

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial()
  );
  scene.add(cube);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  function animate() {
    cube.rotation.y += 0.01;
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();
}
```

---

### Fase 3: Componente Blazor para Three.js

**Archivo:** `Pages/ThreeDemo.razor`

- [ ] **3.1** Crear componente Razor con `<canvas>` referenciado por `ElementReference`
- [ ] **3.2** Importar el módulo JS en `OnAfterRenderAsync(firstRender)`
- [ ] **3.3** Invocar `initThree(canvasRef)` desde el módulo importado
- [ ] **3.4** Implementar `IAsyncDisposable` para limpiar el módulo JS

**Contenido:**

```razor
@inject IJSRuntime JS
@inject NavigationManager Navigation

<canvas @ref="canvasRef" style="width:100%; height:420px; display:block;"></canvas>

@code {
  private ElementReference canvasRef;
  private IJSObjectReference? module;

  protected override async Task OnAfterRenderAsync(bool firstRender)
  {
    if (!firstRender) return;

    var moduleUrl = new Uri(new Uri(Navigation.BaseUri), "js/three-bridge.js").ToString();
    module = await JS.InvokeAsync<IJSObjectReference>("import", moduleUrl);
    await module.InvokeVoidAsync("initThree", canvasRef);
  }

  public async ValueTask DisposeAsync()
  {
    if (module is not null)
      await module.DisposeAsync();
  }
}
```

---

### Fase 4: Actualizar Workflow de GitHub Actions

**Archivo:** `.github/workflows/deploy.yml`

- [ ] **4.1** Agregar step `Setup Node` (actions/setup-node@v4, node 20) **antes** del publish
- [ ] **4.2** Verificar que `dotnet publish` ejecuta el target `VendorThreeJs` automáticamente
- [ ] **4.3** Confirmar que `sed` ajusta `base href` a `/profile/`

**Workflow completo:**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

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
        run: dotnet publish Profile.csproj -c Release -o release

      - name: Set base href for GitHub Pages
        run: sed -i 's|<base href="/" />|<base href="/profile/" />|g' release/wwwroot/index.html

      - name: Create 404.html
        run: cp release/wwwroot/index.html release/wwwroot/404.html

      - name: Create .nojekyll
        run: touch release/wwwroot/.nojekyll

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: release/wwwroot

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

---

### Fase 5: Verificación Local

- [ ] **5.1** Ejecutar `dotnet build` y confirmar que se crea `wwwroot/lib/three/`
  ```powershell
  dotnet build
  Test-Path wwwroot/lib/three/three.module.js   # True
  Test-Path wwwroot/lib/three/three.core.js     # True
  Test-Path wwwroot/lib/three/addons/controls/OrbitControls.js  # True
  ```

- [ ] **5.2** Ejecutar `dotnet run` y abrir la página con el canvas
- [ ] **5.3** En DevTools → Network: verificar que carga `lib/three/three.module.js` desde localhost (no CDN)
- [ ] **5.4** Verificar que el cubo 3D se renderiza y OrbitControls funciona (click + drag para rotar)

---

### Fase 6: Verificación en GitHub Pages

- [ ] **6.1** Push a `main` y esperar que el workflow termine
- [ ] **6.2** Verificar que `https://cfonseca23.github.io/profile/lib/three/three.module.js` responde 200 (no 404)
- [ ] **6.3** Abrir la página y confirmar que el canvas Three.js funciona igual que en local

---

## Notas Importantes

### Ajustes reales aplicados (delta sobre el plan inicial)

Durante la implementación en este repo se aplicaron estos ajustes adicionales:

1. **Se reemplazó `node -e` por copiado recursivo nativo de MSBuild**
  - Motivo: en Windows el comando embebido de Node falló por escape/quoting (`MSB3073`, exit code 255).
  - Solución aplicada: `ItemGroup` + `Copy` recursivo para `examples/jsm`.

2. **Se agregó copia de `three.core.js`**
  - Motivo: en Three r183, `three.module.js` importa `./three.core.js`.
  - Síntoma resuelto: `three.core.js 404` en runtime.

3. **Se agregó import map en `wwwroot/index.html`**
  - Motivo: `OrbitControls.js` usa `from 'three'` (bare specifier).
  - Solución aplicada: mapear `three` a `./lib/three/three.module.js`.

4. **Se ajustó el import dinámico en `ThreeDemo.razor` para usar `Navigation.BaseUri`**
  - Construye la URL final con `new Uri(new Uri(Navigation.BaseUri), "js/three-bridge.js")`.
  - Motivo: funciona tanto en local (`/`) como en GitHub Pages (`/profile/`) sin 404.

5. **Se agregó `wwwroot/lib/three/` a `.gitignore`**
  - Motivo: carpeta generada automáticamente en Build/Publish.

6. **Se agregó Setup Node en GitHub Actions**
  - Motivo: el target de vendoring usa npm también en CI.

### Instancia única de Three.js
Si vas a usar varios módulos que dependen de Three, **mantén un solo bridge** (o un solo "entry module") para evitar el warning `"multiple instances of three"`. No importes Three.js desde varios archivos independientes.

### Carpeta `wwwroot/lib/three/` en `.gitignore`
Considera agregar `wwwroot/lib/three/` al `.gitignore` ya que se regenera en cada build. Esto mantiene el repo limpio:
```gitignore
# Three.js vendored (se regenera en build)
wwwroot/lib/three/
```

### Carpeta temporal `obj/threejs/`
Ya está dentro de `obj/` que usualmente está en `.gitignore`. No requiere acción.

### Cambiar versión de Three.js
Solo modifica `<ThreeJsVersion>0.183.1</ThreeJsVersion>` en el `.csproj` y reconstruye. npm descargará la nueva versión.

### Rutas en GitHub Pages
El `base href` se ajusta a `/profile/` en el workflow. Las rutas relativas en el bridge JS (`../lib/three/...`) funcionan correctamente tanto en local como en producción porque son relativas al propio archivo JS.
Además, el import dinámico del módulo en Blazor usa `Navigation.BaseUri` para respetar automáticamente el subpath de GitHub Pages.

---

## Resumen de Archivos a Crear/Modificar

| Acción | Archivo | Descripción |
|--------|---------|-------------|
| **Modificar** | `Profile.csproj` | Agregar propiedades + Target VendorThreeJs |
| **Crear** | `wwwroot/js/three-bridge.js` | Bridge ESM para Blazor |
| **Crear** | `Pages/ThreeDemo.razor` | Componente Blazor con canvas |
| **Modificar** | `wwwroot/index.html` | Import map para resolver `three` |
| **Modificar** | `.github/workflows/deploy.yml` | Agregar Setup Node |
| **Modificar** | `.gitignore` | Agregar `wwwroot/lib/three/` (opcional) |

---

## Estado de implementación en este repo

- [x] Vendoring de Three.js en Build y Publish
- [x] Version pinning en `three@0.183.1`
- [x] Copia de `three.module.js` y `three.core.js`
- [x] Copia recursiva de addons con MSBuild
- [x] Bridge ESM en `wwwroot/js/three-bridge.js`
- [x] Página `/three-demo` en `Pages/ThreeDemo.razor`
- [x] Import dinámico del módulo usando `Navigation.BaseUri`
- [x] Import map en `wwwroot/index.html` para `three`
- [x] Setup Node 20 en workflow de GitHub Pages
- [x] `wwwroot/lib/three/` agregado en `.gitignore`
- [x] Validación local ejecutada con `dotnet build` OK

---

## Comandos Rápidos

```powershell
# Build local (descarga Three.js + compila)
dotnet build

# Run local
dotnet run

# Publish (igual que CI)
dotnet publish -c Release -o release

# Verificar archivos Three.js
Get-ChildItem wwwroot/lib/three/ -Recurse | Select-Object FullName -First 10

# Limpiar Three.js vendored
Remove-Item wwwroot/lib/three/ -Recurse -Force
```

---

## Replicación Express (10 minutos)

Usa este bloque como receta rápida para otro proyecto Blazor WASM:

1. **`.csproj`**
  - Copiar propiedades `ThreeJsVersion`, `ThreeJsWwwrootDir`, `ErrorOnMissingNpm`.
  - Copiar target `VendorThreeJs` (incluyendo copia de `three.module.js`, `three.core.js` y addons con `ItemGroup + Copy`).

2. **`wwwroot/js/three-bridge.js`**
  - Crear bridge con imports locales:
  - `../lib/three/three.module.js`
  - `../lib/three/addons/controls/OrbitControls.js`

3. **`Pages/ThreeDemo.razor` (o componente equivalente)**
  - Inyectar `IJSRuntime` y `NavigationManager`.
  - Importar el módulo con `Navigation.BaseUri`:
  - `new Uri(new Uri(Navigation.BaseUri), "js/three-bridge.js")`

4. **`wwwroot/index.html`**
  - Agregar import map para bare specifier:
  - `"three": "./lib/three/three.module.js"`

5. **`deploy.yml` de GitHub Pages**
  - Agregar `actions/setup-node@v4` con Node 20 antes de `dotnet publish`.
  - Mantener el reemplazo de `<base href="/" />` por el subpath del repo (ej: `/profile/`).

6. **`.gitignore`**
  - Agregar `wwwroot/lib/three/`.

7. **Validar**
  - `dotnet build`
  - `dotnet run`
  - Verificar que no haya 404 en:
    - `/js/three-bridge.js` (resuelto por BaseUri)
    - `/lib/three/three.module.js`
    - `/lib/three/three.core.js`

---

## Troubleshooting Rápido

| Error | Causa probable | Solución |
|------|-----------------|----------|
| `three.core.js 404` | No se copió `three.core.js` en vendoring | Agregar `Copy` de `build/three.core.js` en el target |
| `Failed to fetch dynamically imported module ... /js/three-bridge.js` en Pages | Import absoluto no respeta subpath del repo | Construir URL con `Navigation.BaseUri` |
| `Failed to resolve module specifier 'three'` | Falta import map | Agregar `"three": "./lib/three/three.module.js"` en `index.html` |
| `MSB3073` en `node -e` (Windows) | Escape/quoting en comando embebido | Reemplazar por `ItemGroup + Copy` recursivo de MSBuild |
| Funciona local, falla en CI | No hay Node/npm en workflow | Agregar `actions/setup-node@v4` antes de publish |

---

## Variables a cambiar al replicar

- `ThreeJsVersion`: fijar versión objetivo (`0.183.1`, etc.).
- `base href` en deploy: reemplazar por el nombre real del repo (`/tu-repo/`).
- Ruta de página demo: `/three-demo` o la ruta que definas en el nuevo proyecto.
