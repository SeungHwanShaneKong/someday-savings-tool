import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// [CL-SEC-CLICKJACK-20260621] 클릭재킹 방어(프레임버스터). 정적 호스트(GitHub Pages)는 X-Frame-Options
// 응답헤더를 못 주므로 프로덕션에서만 JS 로 top 프레임 탈출. dev/preview(iframe 렌더)와 AdSense 자식 iframe
// 에는 영향 없음(우리가 top 일 때만 통과 — self!==top 일 때만 동작).
if (import.meta.env.PROD && window.self !== window.top) {
  try {
    window.top!.location.href = window.location.href;
  } catch {
    document.documentElement.style.display = 'none';
  }
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
