# Solución para Procesos Dotnet Pegados

## Problema
Cuando detienes la aplicación Blazor desde VS Code, los procesos `dotnet` (especialmente `blazor-devserver`) a veces no se terminan correctamente, dejando los puertos ocupados.

## Soluciones Implementadas (Multiplataforma ✅)

### 1. Limpieza Automática al Detener Debug
Se ha configurado VS Code para que ejecute automáticamente una tarea de limpieza cuando detengas la aplicación desde el debugger. **Funciona en Windows, macOS y Linux.**

**Archivos modificados:**
- [.vscode/launch.json](.vscode/launch.json) - Agregado `postDebugTask`
- [.vscode/tasks.json](.vscode/tasks.json) - Nueva tarea `cleanup-dotnet` con comandos específicos por plataforma

### 2. Scripts Manuales de Limpieza
Si necesitas limpiar procesos manualmente:

**macOS/Linux:**
```bash
./cleanup-dotnet.sh
```

**Windows (PowerShell):**
```powershell
.\cleanup-dotnet.ps1
```

Estos scripts:
- 🔍 Buscan procesos `blazor-devserver`, `Profile.dll` y procesos usando el puerto 7181
- 📋 Muestran los procesos encontrados
- 🛑 Terminan todos los procesos relacionados
- ✅ Confirman la limpieza

### 3. Limpieza Rápida por Puerto

**macOS/Linux:**
```bash
# Puerto HTTPS (7181)
lsof -ti :7181 | xargs kill -9

# O todos los procesos blazor-devserver
pkill -9 -f blazor-devserver
```

**Windows (PowerShell):**
```powershell
# Puerto HTTPS (7181)
Get-NetTCPConnection -LocalPort 7181 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# O todos los procesos blazor-devserver
Get-Process -Name dotnet | Where-Object { $_.CommandLine -like '*blazor-devserver*' } | Stop-Process -Force
```

## Uso Normal

1. **Iniciar la aplicación:** Usa el debugger de VS Code (F5) o `dotnet run`
2. **Detener la aplicación:** Usa el botón "Stop" en VS Code - la limpieza se ejecutará automáticamente
3. **Si hay problemas:** Ejecuta el script manual correspondiente a tu sistema operativo

## Verificar Estado

**macOS/Linux:**
```bash
# Ver todos los procesos dotnet
ps aux | grep dotnet | grep -v grep

# Ver qué está usando el puerto 7181
lsof -i :7181
```

**Windows (PowerShell):**
```powershell
# Ver todos los procesos dotnet
Get-Process -Name dotnet

# Ver qué está usando el puerto 7181
Get-NetTCPConnection -LocalPort 7181
```

## Compatibilidad

| Sistema Operativo | Limpieza Automática | Script Manual | Estado |
|-------------------|---------------------|---------------|--------|
| Windows           | ✅ Sí               | ✅ `.ps1`     | ✅ Funciona |
| macOS             | ✅ Sí               | ✅ `.sh`      | ✅ Funciona |
| Linux             | ✅ Sí               | ✅ `.sh`      | ✅ Funciona |
