# Profile

CV/Portfolio personal usando Blazor WebAssembly.

## Objetivo

Página web de currículum con datos dinámicos cargados desde JSON. Los años de experiencia se calculan automáticamente.

## Arquitectura

- **Models/** - Entidades C# (CvData, Experience, Education, Skill)
- **Services/** - CvService para cargar datos
- **Components/** - Componentes Razor reutilizables
- **wwwroot/data/cv.json** - Datos del CV editables sin recompilar

## Development

```powershell
dotnet run
```

## Release

```powershell
dotnet publish Profile.csproj -c Release -o release; Copy-Item "release\wwwroot\index.html" "release\wwwroot\404.html"
```

Output: `release/wwwroot/`

