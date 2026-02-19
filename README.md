# Profile

Blazor WebAssembly profile page.

## Development

```powershell
dotnet run
```

## Release

```powershell
dotnet publish Profile.csproj -c Release -o release; Copy-Item "release\wwwroot\index.html" "release\wwwroot\404.html"
```

Output: `release/wwwroot/`

