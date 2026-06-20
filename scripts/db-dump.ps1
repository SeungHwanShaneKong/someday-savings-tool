# [CL-COEDIT-DBMOVE-20260620] 소스 Supabase(tnboeqtdimyxpjzsraro) 덤프
# ──────────────────────────────────────────────────────────────────────
# 사용법:
#  1) Lovable → 웨딩셈 → Cloud/Database → tnboeqtdimyxpjzsraro Supabase 대시보드
#     → Settings → Database → "Connection string" → **Session pooler**(IPv4, 포트 5432) 탭의 URI 복사
#     (Direct 가 IPv6라 연결 안 되면 Session pooler 사용)
#  2) 아래 $SRC 의 [붙여넣기] 를 그 문자열로 교체하고 [PW] 자리에 DB 비번 입력
#  3) 프로젝트 폴더에서 실행:
#       powershell -ExecutionPolicy Bypass -File scripts/db-dump.ps1
#  ※ 연결문자열은 비밀입니다 — 이 파일을 채운 채로 공유/커밋하지 마세요(.gitignore 처리됨).
# ──────────────────────────────────────────────────────────────────────

$SRC = "[붙여넣기: postgresql://postgres.tnboeqtdimyxpjzsraro:[PW]@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres]"

if ($SRC -like "*붙여넣기*") { Write-Error "먼저 `$SRC 를 실제 연결문자열로 교체하세요."; exit 1 }

$out = Join-Path $PSScriptRoot "..\supabase_dump"
New-Item -ItemType Directory -Force $out | Out-Null

Write-Host "[1/3] public 스키마(테이블·함수·RLS·enum) 덤프..." -ForegroundColor Cyan
npx supabase db dump --db-url $SRC -f "$out\01_schema.sql"
if ($LASTEXITCODE -ne 0) { Write-Error "스키마 덤프 실패 — 위 에러를 그대로 공유하세요."; exit 1 }

Write-Host "[2/3] public 데이터 덤프..." -ForegroundColor Cyan
npx supabase db dump --db-url $SRC --data-only --use-copy -f "$out\02_data.sql"
if ($LASTEXITCODE -ne 0) { Write-Error "데이터 덤프 실패 — 위 에러를 공유하세요."; exit 1 }

Write-Host "[3/3] auth(users·identities 등) 데이터 덤프..." -ForegroundColor Cyan
npx supabase db dump --db-url $SRC --data-only --schema auth -f "$out\03_auth.sql"
if ($LASTEXITCODE -ne 0) { Write-Error "auth 덤프 실패 — 위 에러를 공유하세요."; exit 1 }

Write-Host ""
Write-Host "✅ 완료! 생성된 파일:" -ForegroundColor Green
Get-ChildItem $out | Select-Object Name, @{N='KB';E={[math]::Round($_.Length/1KB,1)}} | Format-Table
Write-Host "다음: 위 3개 파일(01_schema, 02_data, 03_auth)이 보이는지 확인하고 저에게 알려주세요." -ForegroundColor Yellow
