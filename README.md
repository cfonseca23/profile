# Profile

CV/Portfolio personal usando Blazor WebAssembly y .NET 10.

**Live:** https://cfonseca23.github.io/profile/

## Características

- 📄 **Datos dinámicos** - CV cargado desde JSON, editable sin recompilar
- 📊 **Años de experiencia** - Calculados automáticamente
- 🎨 **Bootstrap 5** - Diseño responsive y profesional
- 🚀 **GitHub Actions** - Deploy automático a GitHub Pages
- 📥 **Descargar CV** - Botón para ver/descargar PDF

## Arquitectura

```
Models/
├── CvData.cs           # Entidad principal + cálculos dinámicos
├── PersonalInfo.cs     # Datos de contacto
├── Experience.cs       # Experiencia laboral
├── Education.cs        # Formación académica
└── Skill.cs            # Habilidades por categoría
Services/
└── CvService.cs        # Carga JSON y expone datos
Components/
├── Header.razor        # Foto, nombre, título, links
├── About.razor         # Extracto con años calculados
├── Skills.razor        # Stack técnico en cards
├── ExperienceSection.razor
├── EducationSection.razor
└── Certifications.razor
wwwroot/
├── data/cv.json        # Datos del CV
├── docs/Profile.pdf    # CV descargable
└── images/profile.jpg  # Foto de perfil
```

## Desarrollo

```powershell
dotnet run
```

Navegar a `https://localhost:5001`

## Editar CV

Modificar `wwwroot/data/cv.json` - no requiere recompilar.

El placeholder `{years}` en el summary se reemplaza automáticamente con los años de experiencia calculados.

## Deploy

Push a `main` ejecuta automáticamente GitHub Actions y publica a GitHub Pages.

El workflow:
1. Compila con `dotnet publish`
2. Reemplaza base href a `/profile/`
3. Crea `404.html` para SPA routing
4. Publica a GitHub Pages

## Documentación

Ver [docs/00.md](docs/00.md) para el plan de trabajo detallado.

