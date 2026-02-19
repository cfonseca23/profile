# Profile

CV/Portfolio personal usando Blazor WebAssembly.

**Live:** https://cfonseca23.github.io/profile/

## Arquitectura

- **Models/** - Entidades C# (CvData, Experience, Education, Skill)
- **Services/** - CvService para cargar datos
- **Components/** - Componentes Razor reutilizables
- **wwwroot/data/cv.json** - Datos del CV editables sin recompilar

## Development

```powershell
dotnet run
```

## Deploy

Push a `main` ejecuta automáticamente GitHub Actions y publica a GitHub Pages.

