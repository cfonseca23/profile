# Script para limpiar procesos dotnet de desarrollo pegados (Windows)
# Uso: .\cleanup-dotnet.ps1

Write-Host "🔍 Buscando procesos dotnet relacionados con la aplicación Profile..." -ForegroundColor Cyan

# Encontrar procesos blazor-devserver
$blazorProcesses = Get-Process -Name "dotnet" -ErrorAction SilentlyContinue | 
    Where-Object { $_.CommandLine -like "*blazor-devserver*" }

# Encontrar procesos usando los puertos 7181 y 5181
$portProcesses = Get-NetTCPConnection -LocalPort 7181, 5181 -ErrorAction SilentlyContinue | 
    Select-Object -ExpandProperty OwningProcess | 
    ForEach-Object { Get-Process -Id $_ -ErrorAction SilentlyContinue }

# Encontrar procesos dotnet que estén ejecutando Profile.dll
$profileProcesses = Get-Process -Name "dotnet" -ErrorAction SilentlyContinue | 
    Where-Object { $_.CommandLine -like "*Profile.dll*" }

# Combinar todos los procesos únicos
$allProcesses = @($blazorProcesses) + @($portProcesses) + @($profileProcesses) | 
    Where-Object { $_ -ne $null } | 
    Select-Object -Unique

if ($allProcesses.Count -eq 0) {
    Write-Host "✅ No se encontraron procesos de desarrollo activos." -ForegroundColor Green
    exit 0
}

Write-Host "📋 Procesos encontrados:" -ForegroundColor Yellow
foreach ($process in $allProcesses) {
    Write-Host "  - PID $($process.Id): $($process.ProcessName)" -ForegroundColor White
}

Write-Host ""
Write-Host "🛑 Terminando procesos..." -ForegroundColor Red
foreach ($process in $allProcesses) {
    try {
        Stop-Process -Id $process.Id -Force -ErrorAction Stop
        Write-Host "  ✓ Terminado PID $($process.Id)" -ForegroundColor Green
    }
    catch {
        Write-Host "  ✗ Error al terminar PID $($process.Id): $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "✅ Limpieza completada. Ahora puedes ejecutar la aplicación nuevamente." -ForegroundColor Green
