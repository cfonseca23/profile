# Scripts de Limpieza - Multiplataforma

Estos scripts limpian procesos dotnet que quedan activos después de detener la aplicación.

## 🪟 Windows
```powershell
.\cleanup-dotnet.ps1
```

## 🍎 macOS / 🐧 Linux
```bash
./cleanup-dotnet.sh
```

## Limpieza Automática
VS Code ejecuta automáticamente la limpieza al detener el debug (F5). Si falla, usa los scripts manuales.

Más información: [docs/CLEANUP_DOTNET.md](docs/CLEANUP_DOTNET.md)
