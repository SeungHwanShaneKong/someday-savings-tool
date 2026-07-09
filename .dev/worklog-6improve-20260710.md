# 6대 개선 작업 로그 (2026-07-09 23:12 ~ 2026-07-10)

태그 `pre-6improve-20260709` 기준. 6개 워크스트림(A 콘텐츠 최대보강 / B 브랜드 자산 / C 로그인 필수화 / D 체크리스트 UX / E 관리자 접속자 차트+MA / F 콕찌르기)을 병렬 에이전트+Workflow(집필 7에이전트)로 수행.

## 결과 스냅샷
- 테스트 1617 → **1805 green**(219파일, +188), tsc -b 0, build:ssg **36라우트** 전부 verify(마커+canonical+JSON-LD+**og:image**) 통과, dist grep(/demo 0·구도메인 0), OG 28장.
- 아티클 15→**28편**(전편 ≥4,000자·FAQ≥5·category 4분류·CTA — 골든 AC.6/7/8 기계 강제), 감수: 치명 0·필수 3건 반영.
- 마이그레이션 신규 0. Edge 재배포(notify-partner)만 사용자 액션(degrade-safe).

## 이슈 리포트 [발생원인 — 기술내용 — 해결책]

### 1. OG 템플릿 주석 오염(하트 중복·주석 텍스트 노출)
- **원인**: og-template.html 헤더 주석에 `{{MARK_SVG}}` 등 플레이스홀더 토큰을 그대로 적음 → replaceAll이 주석 내부까지 치환 → 주입된 mark.svg의 자체 주석 `-->`가 바깥 주석을 조기 종료.
- **기술**: 시각검증(생성→Read→평가)에서 즉시 발견. 레이아웃 붕괴+제목 클리핑 동반.
- **해결**: 템플릿 주석에서 중괄호 토큰 금지(문서화) + 생성기에서 주입 SVG의 HTML 주석 스트립(`stripComments`) + 텍스트 값 escapeHtml.

### 2. Article.tsx `image` 전달 편집이 병렬 작업 중 소실
- **원인 미상(재현 불가)**: PM이 useSEO에 `image: article?.image`를 추가했으나 이후 작업트리에서 해당 편집만 HEAD로 되돌아감(병렬 에이전트 다수가 같은 시기 활동). [메모리의 'git checkout이 미커밋 날림' 함정과 동류 가능성]
- **기술**: **prerender verify의 og:image 단언이 빌드를 즉시 실패시켜 적발** — 오라클을 선행 구축한 가치가 실증됨. 진단은 dist 서빙+Puppeteer 메타 덤프로 확정(title/canonical 갱신·og:image 미갱신 → image 파라미터 소실).
- **해결**: 재적용 + "삭제 금지" 경고 주석. 교훈: 병렬 라운드 종료 후 PM 자신의 선행 편집도 재검증 대상.

### 3. 반복 `setContent`의 networkidle0 고착 + png-to-ico 입력 타입
- **원인**: ① Puppeteer 반복 setContent에서 networkidle0가 잔여 요청으로 미충족(1장 성공 후 타임아웃) ② png-to-ico가 Uint8Array를 파일 경로로 오인(Buffer만 인식).
- **해결**: ① `waitUntil:'load'`+`document.fonts.ready`로 대체 ② `Buffer.from()` 래핑.

### 4. 테스트 계약 변경 2건(회귀 아님 — 의도된 소멸)
- Article.test A3(공통 CTA 고정 라벨)·Article.enhancements E4(무CTA 아티클 앵커)는 **전편 contextualCta 필수화(AC.8)**로 전제가 소멸 — E4는 설계된 "명시 실패로 알림"이 정확히 작동. 레지스트리 파생 단언으로 재작성.

## 사용자 액션 대기
- `supabase functions deploy notify-partner`(poke 전용 템플릿·독립 슬롯 — 미배포 시 구템플릿으로 발송되는 degrade).
- push(명시 시) → Search Console sitemap 재제출+신규 라우트 색인 → 재크롤 1~2주 → **AdSense 재심사 요청** + CMP(EEA) 설정 확인.
- Playwright visual 베이스라인 재생성(`--update-snapshots`), 관리자 대시보드(접속자 차트·MA) 관리자 계정 육안 1회.
