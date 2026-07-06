// [CL-SCROLLTOP-20260706-220936] 라우트 변경 시 상단 스크롤 복원 — SPA 네비게이션 표준.
//  문제: /guide/:slug 등 동일 라우트의 파라미터 변경은 언마운트가 없어 스크롤 위치가 이전 페이지 하단에
//        그대로 머문다(관련글 클릭 시 새 글을 2/3 지점에서 보게 됨). 앱 전체에 스크롤 복원 로직이 전무했다.
//  해결: PUSH/REPLACE(신규 이동)에는 즉시 상단으로, POP(뒤로/앞으로·초기 진입)은 브라우저 스크롤 복원에
//        위임, 해시(#앵커)는 해당 요소로 스크롤. Router 컨텍스트 내부(AppRoutes)에 1회 마운트.
import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

export function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navType = useNavigationType(); // 'PUSH' | 'POP' | 'REPLACE'

  useEffect(() => {
    // 뒤로/앞으로·최초 진입(POP)은 브라우저 스크롤 복원에 맡겨 UX(이전 위치 복원)를 보존한다.
    if (navType === 'POP') return;

    // 해시 앵커 이동(#섹션)은 맨 위로 강제하지 않고 해당 요소로 스크롤한다.
    if (hash) {
      try {
        const el = document.getElementById(decodeURIComponent(hash.slice(1)));
        if (el) {
          el.scrollIntoView();
          return;
        }
      } catch {
        // 잘못된 해시 인코딩 등은 무시하고 상단 폴백
      }
    }

    // 신규 이동(PUSH/REPLACE)은 즉시(instant) 상단으로 → 새 페이지 내용이 바로 보인다.
    window.scrollTo(0, 0);
  }, [pathname, hash, navType]);

  return null;
}
