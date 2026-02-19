# Plan de Trabajo: Profile Page

## 📋 Información del Proyecto

| Campo | Valor |
|-------|-------|
| **Repo** | `cfonseca23.github.io` |
| **URL Final** | https://cfonseca23.github.io/ |
| **Tech** | Blazor WebAssembly (.NET 10) |
| **Tipo** | GitHub Pages - Profile Page |

---

## 🚀 Fases del Proyecto

### Fase 1: Setup Inicial

- [ ] **1.1** Crear proyecto Blazor WASM
  ```powershell
  dotnet new blazorwasm -n Profile --framework net10.0
  cd Profile
  ```

- [ ] **1.2** Verificar que funciona en local
  ```powershell
  dotnet run
  ```
  > Abrir URL mostrada (https://localhost:xxxx)

---

### Fase 2: Configuración Crítica

- [ ] **2.1** Ajustar `<base href>` en `wwwroot/index.html`
  ```html
  <base href="/" />
  ```
  > ⚠️ NO usar `/profile/` ni `/repo/` — debe ser exactamente `/`

---

### Fase 3: Build de Release

- [ ] **3.1** Publicar en modo Release
  ```powershell
  dotnet publish -c Release
  ```
  > Output: `bin/Release/net10.0/publish/wwwroot`

- [ ] **3.2** Crear `404.html` para SPA routing
  ```powershell
  cd bin/Release/net10.0/publish/wwwroot
  copy index.html 404.html
  ```

---

### Fase 4: Deploy a GitHub Pages

#### Opción A: Publicar directo (Simple)

- [ ] **4A.1** Copiar contenido al root del repo
  ```powershell
  # Desde el root del repo
  Copy-Item -Path "bin/Release/net10.0/publish/wwwroot/*" -Destination "." -Recurse -Force
  ```

- [ ] **4A.2** Commit y push
  ```powershell
  git add .
  git commit -m "Publish Blazor profile"
  git push
  ```

#### Opción B: GitHub Actions (Recomendado)

- [ ] **4B.1** Crear workflow en `.github/workflows/deploy.yml`
- [ ] **4B.2** Configurar GitHub Pages para usar Actions
- [ ] **4B.3** Push del código fuente (sin build)

---

### Fase 5: Verificación

- [ ] **5.1** Confirmar que el repo se llama `cfonseca23.github.io`
- [ ] **5.2** Verificar `<base href="/">`
- [ ] **5.3** Confirmar Blazor WASM standalone
- [ ] **5.4** Verificar que existe `404.html`
- [ ] **5.5** Confirmar publicación desde root
- [ ] **5.6** Probar URL final: https://cfonseca23.github.io/

---

## 📁 Estructura Esperada del Repo

```
/
├── index.html
├── 404.html
├── _framework/
├── css/
└── ...
```

---

## 🔮 Próximos Pasos (Opcionales)

- [ ] Estructura del profile (About, Projects, Contact)
- [ ] Mostrar AlphaCore sin backend
- [ ] Optimizar WASM (AOT light)
- [ ] GitHub Actions automático

---

## 📝 Notas

- El nombre del proyecto (`Profile`) no afecta la URL — el nombre del repo sí
- Para profile pages, el repo debe llamarse exactamente `{username}.github.io`
- El `404.html` es obligatorio para que funcione el routing SPA al refrescar

---

## 🧭 Resumen de Comandos

```powershell
# Setup
dotnet new blazorwasm -n Profile --framework net10.0
cd Profile
dotnet run

# Build
dotnet publish -c Release

# Post-build
cd bin/Release/net10.0/publish/wwwroot
copy index.html 404.html

# Deploy
git add .
git commit -m "Publish Blazor profile"
git push
```
