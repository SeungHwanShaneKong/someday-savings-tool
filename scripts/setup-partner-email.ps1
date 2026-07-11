# [CL-EMAIL-SETUP-20260711-211500] 파트너 이메일 알림(콕찌르기) 원샷 설정 마법사 — Windows PowerShell 5.1 호환
#
# 사용법:
#   진단만:  powershell -ExecutionPolicy Bypass -File scripts\setup-partner-email.ps1 -Check
#   전체 설정: powershell -ExecutionPolicy Bypass -File scripts\setup-partner-email.ps1
#
# 하는 일: [1]사전진단(DNS/도구) → [2]Supabase 로그인 → [3]DB 준비 SQL 안내(클립보드 복사)
#          → [4]시크릿 2개 등록(키는 화면에 안 보이게 입력) → [5]notify-partner 배포 → [6]최종 검증
# 안하는 일: Resend 가입/도메인 인증/API 키 발급(사용자가 resend.com 에서 — docs\partner-email-setup.md 참고)
param(
  [switch]$Check
)

$ProjectRef = 'pnfjwsugsdyzyahrants'
$Domain     = 'moderninsightspot.com'
$NotifyFrom = 'noreply@' + $Domain
$RepoRoot   = Split-Path -Parent $PSScriptRoot
$SqlPath    = Join-Path $RepoRoot 'scripts\partner-email-setup.sql'

function Write-Title([string]$t) { Write-Host ""; Write-Host ("=== " + $t + " ===") -ForegroundColor Cyan }
function Write-Ok([string]$m)    { Write-Host ("  [OK] " + $m) -ForegroundColor Green }
function Write-Bad([string]$m)   { Write-Host ("  [X ] " + $m) -ForegroundColor Yellow }

# TXT/MX/CNAME 레코드 존재 확인(값 프리뷰 포함) — 실패해도 스크립트는 계속(정보성)
# [검증 교정] 레코드 값 속성은 타입별로 다르다: TXT=Strings, MX=NameExchange, CNAME=NameHost.
function Test-DnsRecord([string]$name, [string]$type) {
  try {
    $r = Resolve-DnsName -Name $name -Type $type -ErrorAction Stop
    if ($type -eq 'TXT') {
      $v = ($r | Where-Object { $_.Strings } | ForEach-Object { $_.Strings }) -join ' '
    } elseif ($type -eq 'MX') {
      $v = ($r | Where-Object { $_.NameExchange } | ForEach-Object { $_.NameExchange }) -join ' '
    } else {
      $v = ($r | Where-Object { $_.NameHost } | ForEach-Object { $_.NameHost }) -join ' '
    }
    if ($v) {
      $preview = $v; if ($preview.Length -gt 60) { $preview = $preview.Substring(0, 60) + "..." }
      Write-Ok ($type + " " + $name + "  ->  " + $preview); return $true
    }
    Write-Bad ($type + " " + $name + " : 레코드 없음"); return $false
  } catch {
    Write-Bad ($type + " " + $name + " : 레코드 없음"); return $false
  }
}

# ── [1/6] 사전 진단 ─────────────────────────────────────────────────────────
Write-Title "[1/6] 사전 진단"

$nodeOk = $false
try { $v = node -v 2>$null; if ($v) { Write-Ok ("Node.js " + $v); $nodeOk = $true } } catch {}
if (-not $nodeOk) { Write-Bad "Node.js 없음 — https://nodejs.org 에서 LTS 설치 후 다시 실행"; if (-not $Check) { exit 1 } }

# [검증 교정] 토큰 파일 휴리스틱은 false-negative(CLI 가 다른 저장소를 쓸 수 있음) → CLI 실측이 권위.
#  로그인뿐 아니라 '이 프로젝트에 접근 가능한 계정인지'까지 확인한다(다른 계정 로그인 상태 적발).
Write-Host "  Supabase CLI 로그인/프로젝트 접근 확인 중(수 초)..."
$projOut = ""
try { $projOut = (npx --yes supabase projects list 2>$null | Out-String) } catch {}
$loggedIn = ($LASTEXITCODE -eq 0)
$hasAccess = $loggedIn -and ($projOut -match $ProjectRef)
if ($hasAccess) { Write-Ok "Supabase CLI 로그인 + 프로젝트(pnfjwsu...) 접근 확인" }
elseif ($loggedIn) { Write-Bad "CLI 로그인은 됐지만 이 프로젝트가 계정에 없음 — [2/6]에서 소유 계정으로 재로그인" }
else { Write-Bad "Supabase CLI 미로그인 — [2/6]에서 브라우저 로그인 진행" }

Write-Host "  --- Resend 도메인 인증 DNS(가비아에 추가했는지, 참고용) ---"
# DKIM 은 계정에 따라 단일 TXT(resend._domainkey) 또는 CNAME 3개(<selector>._domainkey, 이름 예측 불가)
# 로 나뉜다 → TXT/CNAME 순차 시도하되 '참고'로만 표시. 인증의 권위는 Resend 대시보드 Verified.
$dkim = Test-DnsRecord ("resend._domainkey." + $Domain) 'TXT'
if (-not $dkim) { $dkim = Test-DnsRecord ("resend._domainkey." + $Domain) 'CNAME' }
$spf  = Test-DnsRecord ("send." + $Domain) 'TXT'
$mx   = Test-DnsRecord ("send." + $Domain) 'MX'
$dnsReady = $spf -and $mx
if ($dnsReady) {
  Write-Ok "Resend 필수 DNS(send SPF/MX) 확인됨 — resend.com 대시보드에서 Verified 인지 최종 확인하세요"
  if (-not $dkim) { Write-Host "  (i) DKIM 이 CNAME 방식 계정이면 위 DKIM [X]는 무시해도 됩니다 — Verified 가 기준" }
} else {
  Write-Bad "Resend DNS 미완 — docs\partner-email-setup.md 의 STEP 1(Resend 가입-도메인-가비아 DNS)을 먼저 진행하세요"
}

if ($Check) {
  Write-Title "진단 요약"
  Write-Host ("  Node.js: " + $(if ($nodeOk) { 'OK' } else { '설치 필요' }))
  Write-Host ("  Supabase 로그인+프로젝트 접근: " + $(if ($hasAccess) { 'OK' } else { '필요([2/6])' }))
  Write-Host ("  Resend DNS: " + $(if ($dnsReady) { 'OK' } else { '필요(STEP 1)' }))
  Write-Host "  전체 설정을 진행하려면 -Check 없이 다시 실행하세요."
  exit 0
}

# 인증의 권위 게이트 = Resend 대시보드 Verified (DNS 실측은 참고용 — DKIM 형태가 계정마다 달라서)
Write-Host ""
$go = Read-Host "resend.com > Domains 에서 도메인 상태가 Verified(초록)인가요? (y/N)"
if ($go -ne 'y' -and $go -ne 'Y') {
  Write-Host "  먼저 docs\partner-email-setup.md 의 STEP 1을 완료하세요(도메인 추가 -> 가비아 DNS -> Verified 대기)."
  Write-Host "  Verified 전에 발송하면 Resend 가 403 으로 거부합니다(슬롯은 자동 회수 — 무해)."
  $force = Read-Host "  그래도 나머지 설정(로그인/SQL/시크릿/배포)만 미리 해둘까요? (y/N)"
  if ($force -ne 'y' -and $force -ne 'Y') { Write-Host "중단합니다. STEP 1 완료 후 다시 실행하세요."; exit 0 }
}

# ── [2/6] Supabase 로그인 ───────────────────────────────────────────────────
Write-Title "[2/6] Supabase 로그인"
if ($hasAccess) {
  Write-Ok "이미 프로젝트 접근 가능한 계정으로 로그인됨 — 건너뜀"
} else {
  if ($loggedIn) { Write-Host "  (현재 로그인된 계정에 이 프로젝트가 없어 재로그인합니다 — 프로젝트 소유 계정으로!)" }
  Write-Host "  브라우저가 열리면 Supabase 계정으로 로그인 후 Authorize(승인)를 누르세요."
  npx --yes supabase login
  if ($LASTEXITCODE -ne 0) { Write-Bad "로그인 실패 — 다시 실행해 주세요"; exit 1 }
  Write-Ok "로그인 완료"
}

# ── [3/6] DB 준비(멱등 SQL — 이미 적용돼 있어도 무해) ───────────────────────
Write-Title "[3/6] DB 준비 (SQL 1회 실행)"
$sqlUrl = "https://supabase.com/dashboard/project/$ProjectRef/sql/new"
try {
  Get-Content -Path $SqlPath -Raw -Encoding UTF8 | Set-Clipboard
  Write-Ok "SQL 을 클립보드에 복사했습니다 — SQL Editor 에 Ctrl+V 후 Run"
} catch {
  Write-Bad ("클립보드 복사 실패 — 파일을 직접 열어 복사하세요: " + $SqlPath)
}
Write-Host ("  SQL Editor: " + $sqlUrl)
try { Start-Process $sqlUrl } catch {}
Read-Host "  SQL Editor 에서 Run 실행('Success' 확인) 후 Enter"

# ── [4/6] 시크릿 등록 (키는 화면에 표시되지 않음) ───────────────────────────
Write-Title "[4/6] Resend 시크릿 등록"
Write-Host "  resend.com -> API Keys -> Create API key 로 만든 키(re_ 로 시작)를 붙여넣으세요."
$sec = Read-Host "  RESEND_API_KEY (입력 숨김)" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
$apiKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
if ([string]::IsNullOrWhiteSpace($apiKey)) { Write-Bad "키가 비어 있습니다 — 중단"; exit 1 }
if (-not $apiKey.StartsWith('re_')) { Write-Bad "주의: Resend 키는 보통 re_ 로 시작합니다(계속 진행은 함)" }

# 명령행 노출을 피하려고 임시 env 파일로 전달(UTF-8 no BOM) 후 즉시 삭제
$envFile = Join-Path $env:TEMP ("wedsem-secrets-" + [guid]::NewGuid().ToString('N') + ".env")
$envBody = "# temp secrets file - auto-deleted`nRESEND_API_KEY=$apiKey`nNOTIFY_FROM=`"웨딩셈 <$NotifyFrom>`"`n"
[System.IO.File]::WriteAllText($envFile, $envBody, (New-Object System.Text.UTF8Encoding($false)))
$apiKey = $null
try {
  npx --yes supabase secrets set --env-file $envFile --project-ref $ProjectRef
  $setOk = ($LASTEXITCODE -eq 0)
} finally {
  # 내용 덮어쓰기 후 삭제(임시파일 위생)
  [System.IO.File]::WriteAllText($envFile, "X", (New-Object System.Text.UTF8Encoding($false)))
  Remove-Item -Path $envFile -Force -ErrorAction SilentlyContinue
}
if (-not $setOk) { Write-Bad "시크릿 등록 실패 — 위 오류 메시지를 확인하세요"; exit 1 }
Write-Ok ("시크릿 등록 완료: RESEND_API_KEY, NOTIFY_FROM=웨딩셈 <" + $NotifyFrom + ">")

# ── [5/6] notify-partner 함수 배포 ──────────────────────────────────────────
Write-Title "[5/6] notify-partner 배포"
npx --yes supabase functions deploy notify-partner --project-ref $ProjectRef
if ($LASTEXITCODE -ne 0) {
  Write-Bad "기본 배포 실패 — API 번들링(--use-api)으로 재시도"
  npx --yes supabase functions deploy notify-partner --use-api --project-ref $ProjectRef
  if ($LASTEXITCODE -ne 0) { Write-Bad "배포 실패 — 위 오류 메시지를 확인하세요"; exit 1 }
}
Write-Ok "배포 완료"

# ── [6/6] 최종 검증 ─────────────────────────────────────────────────────────
Write-Title "[6/6] 최종 검증"
$secretsOut = npx --yes supabase secrets list --project-ref $ProjectRef 2>$null | Out-String
if ($secretsOut -match 'RESEND_API_KEY') { Write-Ok "시크릿 RESEND_API_KEY 확인" } else { Write-Bad "RESEND_API_KEY 미확인" }
if ($secretsOut -match 'NOTIFY_FROM')    { Write-Ok "시크릿 NOTIFY_FROM 확인" }    else { Write-Bad "NOTIFY_FROM 미확인" }
$fnOut = npx --yes supabase functions list --project-ref $ProjectRef 2>$null | Out-String
if ($fnOut -match 'notify-partner') { Write-Ok "함수 notify-partner 배포 확인" } else { Write-Bad "notify-partner 미확인" }

Write-Title "설정 끝 — 실제 발송 테스트"
Write-Host "  1) 앱( https://$Domain/budget ) 새로고침 -> '콕 찌르기' 버튼이 다시 활성화됩니다."
Write-Host "  2) 콕 찌르기 클릭 -> '콕! 찔렀어요' 토스트가 뜨면 파트너 메일함(스팸함 포함)을 확인하세요."
Write-Host "  3) 발송 기록: https://resend.com/emails  |  서버 로그: https://supabase.com/dashboard/project/$ProjectRef/functions/notify-partner/logs"
Write-Host "  * '지금은 알림을 보낼 수 없어요'가 계속 나오면 -> 시크릿/SQL 미반영([3/6]·[4/6] 재확인, 반영까지 수십 초 걸릴 수 있음)."
Write-Host "  * '콕 찌르기에 실패했어요'가 나오면 -> Resend 도메인이 Verified 인지 확인(미인증=403 거부, 오늘 슬롯은 자동 회수되어 재시도 가능)."
