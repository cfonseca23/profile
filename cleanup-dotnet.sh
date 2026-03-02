#!/bin/bash

# Script para limpiar procesos dotnet de desarrollo pegados (macOS/Linux)
# Uso: ./cleanup-dotnet.sh

echo "🔍 Buscando procesos dotnet relacionados con la aplicación Profile..."

# Encontrar procesos blazor-devserver
BLAZOR_PIDS=$(ps aux | grep "blazor-devserver" | grep -v grep | awk '{print $2}')

# Encontrar procesos dotnet run en el puerto 7181
PORT_PIDS=$(lsof -ti :7181 2>/dev/null)

# Encontrar procesos dotnet que estén ejecutando Profile.dll
PROFILE_PIDS=$(ps aux | grep "Profile.dll" | grep -v grep | awk '{print $2}')

# Combinar todos los PIDs únicos
ALL_PIDS=$(echo "$BLAZOR_PIDS $PORT_PIDS $PROFILE_PIDS" | tr ' ' '\n' | sort -u | grep -v '^$')

if [ -z "$ALL_PIDS" ]; then
    echo "✅ No se encontraron procesos de desarrollo activos."
    exit 0
fi

echo "📋 Procesos encontrados:"
for PID in $ALL_PIDS; do
    echo "  - PID $PID: $(ps -p $PID -o command= 2>/dev/null | head -c 100)"
done

echo ""
echo "🛑 Terminando procesos..."
for PID in $ALL_PIDS; do
    kill -9 $PID 2>/dev/null && echo "  ✓ Terminado PID $PID"
done

echo ""
echo "✅ Limpieza completada. Ahora puedes ejecutar la aplicación nuevamente."
