# Full local pipeline: model script -> model.json -> Blender glb -> validate -> preview render.
# Usage: .\tools\build_local.ps1 [-NoRender] [-Blend] [-CrossCheck]
#   -CrossCheck also runs tools/xlsx_to_json.py on the companion workbook and
#   diffs it against tools/model_script_to_json.py's output (the section-2
#   fields must agree; see tests/test_model_script_to_json.py for the same
#   check run automatically by `python -m pytest tests`).
param(
    [switch]$NoRender,
    [switch]$Blend,
    [switch]$CrossCheck
)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$Blender  = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
$Groovy   = Get-ChildItem "data\source\*.groovy" | Select-Object -First 1 -ExpandProperty FullName
$Workbook = Get-ChildItem "data\source\*.xlsx" | Select-Object -First 1 -ExpandProperty FullName

Write-Host "== 1/4 Convert model script -> data/model.json" -ForegroundColor Cyan
python tools\model_script_to_json.py $Groovy data\blocks.json $Workbook data\model.json
if ($LASTEXITCODE -ne 0) { throw "converter failed" }

if ($CrossCheck) {
    Write-Host "== Cross-check: tools/xlsx_to_json.py vs tools/model_script_to_json.py" -ForegroundColor Cyan
    $xlsxOut = Join-Path $env:TEMP "model.xlsx-cross-check.json"
    python tools\xlsx_to_json.py $Workbook data\blocks.json $xlsxOut
    if ($LASTEXITCODE -ne 0) { throw "xlsx converter failed" }
    Write-Host "  (companion workbook conversion written to $xlsxOut for manual inspection)"
    python -m pytest tests\test_model_script_to_json.py -q -k cross_check
    if ($LASTEXITCODE -ne 0) { throw "cross-check failed" }
}

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
