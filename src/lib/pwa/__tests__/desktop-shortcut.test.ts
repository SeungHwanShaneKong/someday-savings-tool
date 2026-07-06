// [CL-PWA-A2HS-20260706-202440] 바탕화면 바로가기 파일 폴백 — 콘텐츠·MIME·파일명·다운로드 안전성.
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  buildWindowsUrlShortcut,
  buildMacWeblocShortcut,
  buildDesktopShortcut,
  downloadDesktopShortcut,
} from '../desktop-shortcut';
import { SITE_ORIGIN } from '@/config/site';

describe('바탕화면 바로가기 파일 생성', () => {
  it('Windows .url: 파일명·MIME·INI 헤더·SITE_ORIGIN URL', () => {
    const f = buildWindowsUrlShortcut();
    expect(f.filename).toBe('웨딩셈.url');
    expect(f.mime).toBe('application/internet-shortcut');
    expect(f.content.startsWith('[InternetShortcut]')).toBe(true);
    expect(f.content).toContain(`URL=${SITE_ORIGIN}/`);
    // 오픈 리다이렉트 방지 — 외부 도메인 없음
    expect(f.content).not.toContain('wedsem');
  });

  it('macOS .webloc: 파일명·plist·SITE_ORIGIN URL', () => {
    const f = buildMacWeblocShortcut();
    expect(f.filename).toBe('웨딩셈.webloc');
    expect(f.content).toContain('<plist');
    expect(f.content).toContain(`<string>${SITE_ORIGIN}/</string>`);
  });

  it('buildDesktopShortcut(os) 분기', () => {
    expect(buildDesktopShortcut('windows').filename).toBe('웨딩셈.url');
    expect(buildDesktopShortcut('macos').filename).toBe('웨딩셈.webloc');
  });
});

describe('downloadDesktopShortcut — 다운로드 트리거 안전성', () => {
  afterEach(() => vi.restoreAllMocks());

  it('createObjectURL 가용 시 anchor.download 로 클릭 트리거', () => {
    const created: HTMLAnchorElement[] = [];
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = origCreate(tag) as HTMLElement;
      if (tag === 'a') created.push(el as HTMLAnchorElement);
      return el;
    });
    // jsdom 은 createObjectURL 미구현 → 스텁
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = vi.fn(() => 'blob:mock');
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = vi.fn();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const f = downloadDesktopShortcut('windows');
    expect(f.filename).toBe('웨딩셈.url');
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(created[0]?.download).toBe('웨딩셈.url');
    delete (URL as unknown as { createObjectURL?: unknown }).createObjectURL;
    delete (URL as unknown as { revokeObjectURL?: unknown }).revokeObjectURL;
  });

  it('createObjectURL 미가용(구형/테스트) → throw 없이 파일 스펙 반환', () => {
    // createObjectURL 없음 보장
    delete (URL as unknown as { createObjectURL?: unknown }).createObjectURL;
    expect(() => downloadDesktopShortcut('macos')).not.toThrow();
    expect(downloadDesktopShortcut('macos').filename).toBe('웨딩셈.webloc');
  });
});
