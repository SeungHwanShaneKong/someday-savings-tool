// [CL-SCROLLTOP-20260706-220936] 전역 스크롤 복원 — PUSH 상단·POP 미개입·해시 요소 스크롤.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@/test/test-utils';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { ScrollToTop } from '../ScrollToTop';

/** 마운트 직후 to 로 PUSH 이동(navigate) */
function Nav({ to }: { to: string }) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(to);
  }, [navigate, to]);
  return null;
}

beforeEach(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  (Element.prototype as unknown as { scrollIntoView: () => void }).scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ScrollToTop', () => {
  it('PUSH 이동(/guide/a→/guide/b) → window.scrollTo(0,0) 호출', async () => {
    render(
      <MemoryRouter initialEntries={['/guide/a']}>
        <ScrollToTop />
        <Nav to="/guide/b" />
        <Routes>
          <Route path="/guide/:s" element={<div>글</div>} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith(0, 0));
  });

  it('초기 로드(navType POP) → scrollTo 미호출(초기 위치 미개입)', () => {
    render(
      <MemoryRouter initialEntries={['/guide/a']}>
        <ScrollToTop />
        <Routes>
          <Route path="/guide/:s" element={<div>글</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('해시 이동(요소 존재) → 요소 scrollIntoView, scrollTo 미호출', async () => {
    const el = document.createElement('div');
    el.id = 'q1';
    document.body.appendChild(el);
    render(
      <MemoryRouter initialEntries={['/faq']}>
        <ScrollToTop />
        <Nav to="/faq#q1" />
        <Routes>
          <Route path="/faq" element={<div>faq</div>} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(
        (el as unknown as { scrollIntoView: ReturnType<typeof vi.fn> }).scrollIntoView,
      ).toHaveBeenCalled(),
    );
    expect(window.scrollTo).not.toHaveBeenCalled();
    el.remove();
  });

  it('해시인데 요소 부재 → scrollTo(0,0) 폴백', async () => {
    render(
      <MemoryRouter initialEntries={['/faq']}>
        <ScrollToTop />
        <Nav to="/faq#nope" />
        <Routes>
          <Route path="/faq" element={<div>faq</div>} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith(0, 0));
  });
});
