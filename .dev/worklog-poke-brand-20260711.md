# 콕찌르기 가시성+넛지 · 브랜드 마크 v2 작업 로그 (2026-07-11)

태그 `pre-poke-brand-20260710` 기준. 병렬 2트랙(T1=에이전트, T2=PM 직접).

## 결과 스냅샷
- 테스트 1814 → **1864 green**(225파일, +50), tsc 0, build:ssg 36라우트, 골든 BA 확장 16.
- T1: usePoke 추출(pub-sub 쿨다운 동기)·compact 버튼(/budget 헤더·/summary 헤더)·PokeNudgeCard(비모달·KST 일1회·30일 억제·InstallPrompt 배타)·**get_my_partner 이중발사 근본수정**(trackPartner opts). PK 6건 무수정 green = 추출 정합 오라클.
- T2: 마크 v2 '링 홀 2개+젬 하트'(마스터/스몰/타일 동일 지오메트리 패밀리), favicon.svg/48/96 신규(구글 48배수+SVG+**신규 URL 캐시버스트**), index.html 링크 세트 재구성, --brand-pink 토큰 3종, WeddingMark 재작성(러버블풍 링 폐기).

## 이슈 리포트 [원인 — 기술 — 해결]
1. **마크 v2 1차 시안(티어드롭 링 2개) 실패**: 두 루프의 내부 레그 4개가 중앙에서 교차해 하트로 안 읽힘 + 위빙 패치가 부유물처럼 렌더 — 시각 루프(Puppeteer Read)에서 즉시 적발 → '링 홀 2개 하트' 컨셉으로 피벗(단일 compound path, 마스터/스몰/타일 일관).
2. **플랫 타일의 '얼굴' 인상**: 상반부 대칭 원 2개는 눈으로 읽힐 위험 → 링 상단 젬(다이아) 디테일로 '반지'를 확정(마스터=화이트 젬, 타일=핑크 젬).
3. **배경 tail 캡처 함정**: `Select-Object -Last 3`이 vitest 요약(passed 라인)을 잘라 2·3회차 수치 증거 소실 — exit 0만으로 단정하지 않고 검증 가능 캡처로 재실행(1864 확정). 교훈: 백그라운드 오라클은 요약 라인이 포함되게 tail ≥6.
4. **프리뷰 스크린샷 타임아웃**: Browser 패널 렌더러 고착 — 로컬 Puppeteer 스크립트로 대체(다이얼로그 백드롭이 색 판정을 왜곡 → Escape 후 재캡처).

## 사용자 확인 항목
- 콕찌르기 compact 버튼·넛지 카드 라이브 확인(파트너 연결 계정 필요 — jsdom 15건이 대체 검증).
- 배포+Search Console 재크롤 후 SERP 파비콘 반영 대기(수일~수주).
- `npx playwright test e2e/visual.spec.ts --update-snapshots`(WeddingMark 픽셀 변경).
