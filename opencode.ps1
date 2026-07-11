# setup-opencode.ps1
 $ErrorActionPreference = "Stop"

 $cfgFile = "./opencode.json"
 $apiUrl = "https://opencode.ai/zen/go/v1/models"

# รายการ Fallback หาก API ใช้งานไม่ได้
 $fallbackModels = @(
    "opencode-go/glm-5.1"
    "opencode-go/glm-5"
    "opencode-go/kimi-k2.6"
    "opencode-go/kimi-k2.5"
    "opencode-go/deepseek-v4-pro"
    "opencode-go/deepseek-v4-flash"
    "opencode-go/mimo-v2.5"
    "opencode-go/mimo-v2.5-pro"
    "opencode-go/minimax-m2.7"
    "opencode-go/minimax-m2.5"
    "opencode-go/qwen3.6-plus"
    "opencode-go/qwen3.5-plus"
)

# 1. ดึงรายชื่อโมเดล
Write-Host "Fetching OpenCode Go models from API..." -ForegroundColor Cyan
 $models = @()

try {
    $response = Invoke-RestMethod -Uri $apiUrl -Method Get -TimeoutSec 10
    # สกัดชื่อโมเดลจาก JSON Response (ปรับแกว่างตามโครงสร้าง JSON จริงของ API)
    # สมมติว่า API ส่งกลับมาเป็น { data: [ { id: "xxx" }, ... ] } หรือ array ตรงๆ
    if ($response.data) {
        $models = $response.data | ForEach-Object { 
            if ($_.id) { "opencode-go/$($_.id)" } 
            elseif ($_.name) { "opencode-go/$($_.name)" } 
        } | Where-Object { $_ -match '^opencode-go/[A-Za-z0-9._-]+$' } | Sort-Object -Unique
    } elseif ($response -is [array]) {
        $models = $response | ForEach-Object { 
            if ($_ -is [string]) { "opencode-go/$_" }
            elseif ($_.id) { "opencode-go/$($_.id)" }
        } | Where-Object { $_ -match '^opencode-go/[A-Za-z0-9._-]+$' } | Sort-Object -Unique
    }

    if (-not $models) {
        Write-Host "API response format unknown or empty. Using fallback list." -ForegroundColor Yellow
        $models = $fallbackModels
    } else {
        Write-Host "Successfully fetched $($models.Count) models." -ForegroundColor Green
    }
} catch {
    Write-Host "Cannot fetch models from API: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Using fallback list." -ForegroundColor Yellow
    $models = $fallbackModels
}

# ฟังก์ชันเลือกโมเดล
function Choose-Model {
    param ([string]$Title)

    Write-Host ""
    Write-Host $Title -ForegroundColor Cyan
    Write-Host "--------------------------------" -ForegroundColor DarkGray

    for ($i = 0; $i -lt $models.Count; $i++) {
        Write-Host "$($i + 1). $($models[$i])"
    }

    while ($true) {
        $choice = Read-Host "Choose number"
        
        # ตรวจสอบว่าเป็นตัวเลขและอยู่ในช่วงที่ถูกต้อง
        if ($choice -match '^\d+$' -and [int]$choice -ge 1 -and [int]$choice -le $models.Count) {
            $selectedIndex = [int]$choice - 1
            return $models[$selectedIndex]
        }
        
        Write-Host "Invalid choice. Please enter a number between 1 and $($models.Count)." -ForegroundColor Red
    }
}

# 2. เลือกโมเดล
 $mainModel = Choose-Model -Title "Select main model"
 $smallModel = Choose-Model -Title "Select small/lightweight model"

# 3. เลือก Permission Mode
Write-Host ""
Write-Host "Permission mode:" -ForegroundColor Cyan
Write-Host "1. YOLO allow everything"
Write-Host "2. Safer YOLO"

 $permissionConfig = $null

while ($true) {
    $permChoice = Read-Host "Choose number"

    if ($permChoice -eq "1") {
        $permissionConfig = "allow"
        break
    }

    if ($permChoice -eq "2") {
        $permissionConfig = @{
            "*"                  = "allow"
            "external_directory" = "ask"
            "doom_loop"          = "ask"
            "read"               = @{
                "*"              = "allow"
                "*.env"          = "deny"
                "*.env.*"        = "deny"
                "*.env.example"  = "allow"
            }
            "bash"               = @{
                "*"      = "allow"
                "rm *"   = "ask"
                "sudo *" = "ask"
                "git push *" = "ask"
            }
        }
        break
    }

    Write-Host "Invalid choice. Please enter 1 or 2." -ForegroundColor Red
}

# 4. สำรองไฟล์เดิม (ถ้ามี)
if (Test-Path $cfgFile) {
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupFile = "./opencode.backup.$timestamp.json"
    Copy-Item $cfgFile $backupFile -Force
    Write-Host "Backed up existing config to $backupFile" -ForegroundColor Yellow
}

# 5. สร้างและเขียนไฟล์ Config
 $config = [ordered]@{
    "`$schema"    = "https://opencode.ai/config.json"
    "model"       = $mainModel
    "small_model" = $smallModel
    "permission"  = $permissionConfig
}

# แปลงเป็น JSON ที่มี Indentation สวยงาม
 $jsonOutput = $config | ConvertTo-Json -Depth 10

# แก้ไขปัญหา PowerShell ที่มัก Escape ตัว $ ออกมาเป็น \u0027 หรือลำดับไม่ถูกต้องในบางเวอร์ชัน
 $jsonOutput = $jsonOutput -replace '\\u0027', "'"

Set-Content -Path $cfgFile -Value $jsonOutput -Encoding UTF8

Write-Host ""
Write-Host "Done. Created $cfgFile" -ForegroundColor Green
Write-Host "Main model:  $mainModel"
Write-Host "Small model: $smallModel"
Write-Host "Run: opencode" -ForegroundColor Magenta