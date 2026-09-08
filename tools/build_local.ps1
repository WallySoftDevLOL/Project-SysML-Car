# Full local pipeline: workbook -> model.json -> Blender glb -> validate -> preview render.
# Usage: .\tools\build_local.ps1 [-NoRender] [-Blend]
param(
    [switch]$NoRender,
    [switch]$Blend
)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$Blender  = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
$Workbook = Get-ChildItem "data\source\*.xlsx" | Select-Object -First 1 -ExpandProperty FullName

Write-Host "== 1/4 Convert workbook -> data/model.json" -ForegroundColor Cyan
python tools\xlsx_to_json.py $Workbook data\blocks.json data\model.json
if ($LASTEXITCODE -ne 0) { throw "converter failed" }

Write-Host "== 2/4 Build car in Blender (headless)" -ForegroundColor Cyan
$args = @("--background", "--factory-startup", "--python-exit-code", "1",
          "--python", "model\build_car.py", "--",
          "--data", "data\model.json", "--blocks", "data\blocks.json",
          "--out", "dist\car.glb", "--report", "dist\build-report.json")
if ($Blend)      { $args += @("--blend", "dist\car.blend") }
if (-not $NoRender) { $args += @("--render", "docs\preview.png", "--engine", "eevee") }
& $Blender @args
if ($LASTEXITCODE -ne 0) { throw "blender build failed" }

Write-Host "== 3/4 Validate glb against contract" -ForegroundColor Cyan
python tools\validate_glb.py dist\car.glb data\model.json data\blocks.json
if ($LASTEXITCODE -ne 0) { throw "glb validation failed" }

Write-Host "== 4/4 Done" -ForegroundColor Green
Get-Item dist\car.glb | Select-Object Name, Length, LastWriteTime
if (-not $NoRender) { Write-Host "Preview: docs\preview.png" }
