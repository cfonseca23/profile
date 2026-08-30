---
description: "Use when configuring launch settings, debugging Blazor/ASP.NET Core devserver, handling AddressInUseException port lockups (5181/7181), or maintaining cleanup scripts."
applyTo: ["Properties/launchSettings.json", "cleanup-dotnet.*", "Profile.csproj"]
---

# .NET & Blazor Port Management Guidelines

## Application Ports
The application is configured in `Properties/launchSettings.json` with the following endpoints:
- **HTTP**: `http://localhost:5181`
- **HTTPS**: `https://localhost:7181`

## Handling AddressInUseException (Port in Use)
When encountering:
`System.IO.IOException: Failed to bind to address ... Address already in use` or `AddressInUseException` on port 5181 or 7181:

1. **Do not alter port configuration** immediately in `launchSettings.json`.
2. **Terminate lingering dev server processes**:
   - On macOS/Linux: Run `./cleanup-dotnet.sh` or check with `lsof -ti :5181 -ti :7181`.
   - On Windows: Run `.\cleanup-dotnet.ps1` or query `Get-NetTCPConnection -LocalPort 5181, 7181`.
3. **Synchronize scripts**: Ensure any change to ports in `launchSettings.json` is mirrored across both [cleanup-dotnet.sh](cleanup-dotnet.sh) and [cleanup-dotnet.ps1](cleanup-dotnet.ps1).
