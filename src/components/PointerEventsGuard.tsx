// [CL-MODAL-COORD-20260703-140000] body pointer-events 자가 치유 가드.
//
// 발생원인: Radix 계열 모달(Dialog/AlertDialog)은 열릴 때 `document.body.style.pointerEvents='none'`
//   으로 배경을 inert 하게 만든다. 그러나 애니메이션 중단·빠른 open/close·백그라운드 탭에서 종료
//   애니메이션이 동결되는 경우, 닫힌 뒤에도 이 잠금을 정리하지 못해(알려진 라이브러리 버그) 페이지
//   전체가 클릭 불가가 되는 사고가 발생한다(실기기: 모달 닫은 뒤 아무 버튼도 눌리지 않음).
// 기술내용: 잠금 해제는 "닫히는 모달의 언마운트" 시점에 일어나야 하는데, 그 mutation 이 누락되면
//   body 는 `pointer-events:none` 로 영구 고정된다.
// 해결책(증상 무마 아님·불변식 강제): "열린 모달이 하나도 없으면 body 는 상호작용 가능해야 한다"는
//   불변식을 관측(MutationObserver)+이벤트(focus/visibility) 기반으로 지속 강제한다. 열린 모달이
//   있을 때는 절대 건드리지 않아 모달 inert 동작을 보존한다.
import { useEffect } from 'react';

const OPEN_MODAL_SELECTOR =
  '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]';

export function PointerEventsGuard() {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const body = document.body;

    const reconcile = () => {
      // body 가 잠겨 있는데(열림 없음) 열린 모달이 하나도 없으면 잠금을 해제한다.
      if (body.style.pointerEvents !== 'none') return;
      if (document.querySelector(OPEN_MODAL_SELECTOR)) return; // 정당한 모달 잠금 — 보존
      body.style.pointerEvents = '';
    };

    // body 의 style 변화(잠금 설정) + 직속 자식 추가/제거(모달 포털 언마운트) 모두 관찰
    const observer = new MutationObserver(reconcile);
    observer.observe(body, { attributes: true, attributeFilter: ['style'], childList: true });

    // 관측이 놓친 프레임(백그라운드 탭 동결 등)을 위한 안전망 — 탭 복귀·포커스 시 재점검
    window.addEventListener('focus', reconcile);
    document.addEventListener('visibilitychange', reconcile);

    // 최종 안전망: 어떤 트리거도 놓친 극단 상황에서도 최대 1초 내 잠금이 해제되도록 저빈도 폴링
    //   (쿼리 1회/초 — 무시 가능한 비용. 활성 탭에서만 정상 발화, 백그라운드에선 복귀 시 위 이벤트가 처리).
    const poll = window.setInterval(reconcile, 1000);

    reconcile(); // 마운트 시 1회

    return () => {
      observer.disconnect();
      window.removeEventListener('focus', reconcile);
      document.removeEventListener('visibilitychange', reconcile);
      window.clearInterval(poll);
    };
  }, []);

  return null;
}
