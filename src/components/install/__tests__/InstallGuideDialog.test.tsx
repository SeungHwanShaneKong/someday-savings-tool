// [CL-PWA-A2HS-20260706-202820] 안내 모달 — 플랫폼별 단계 렌더 + 바탕화면 파일 폴백 노출.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, cleanup } from '@/test/test-utils';
import { InstallGuideDialog } from '../InstallGuideDialog';
import type { InstallResolution } from '@/lib/pwa/install-platform';
import * as shortcut from '@/lib/pwa/desktop-shortcut';

const res = (over: Partial<InstallResolution>): InstallResolution => ({
  platform: 'ios',
  os: 'ios',
  canOneTap: false,
  canDownloadShortcut: false,
  ...over,
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('InstallGuideDialog', () => {
  it('iOS: 제목·단계 렌더, 파일 폴백 버튼 없음', () => {
    renderWithProviders(
      <InstallGuideDialog open onOpenChange={() => {}} resolution={res({ platform: 'ios', os: 'ios' })} />,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // ios 안내 단계는 '공유' 단어를 포함
    expect(screen.getByText(/버튼을 누르세요/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /바로가기 파일 내려받기/ })).toBeNull();
  });

  it('macOS Safari: 파일 폴백 버튼 노출 + 클릭 시 다운로드 트리거', () => {
    const spy = vi.spyOn(shortcut, 'downloadDesktopShortcut').mockReturnValue({
      filename: '웨딩셈.webloc',
      mime: 'application/x-webloc',
      content: '',
    });
    renderWithProviders(
      <InstallGuideDialog
        open
        onOpenChange={() => {}}
        resolution={res({ platform: 'macos-safari', os: 'macos', canDownloadShortcut: true })}
      />,
    );
    const dl = screen.getByRole('button', { name: /바로가기 파일 내려받기/ });
    expect(dl).toBeInTheDocument();
    fireEvent.click(dl);
    expect(spy).toHaveBeenCalledWith('macos');
  });

  it('installable: 다이얼로그 렌더 안 함(원터치 대상)', () => {
    renderWithProviders(
      <InstallGuideDialog
        open
        onOpenChange={() => {}}
        resolution={res({ platform: 'installable', os: 'windows', canOneTap: true })}
      />,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  // [CL-AUDIT-PWA-EDGE-20260706-222500] Linux/기타 Firefox(os='other'): 파일 안내와 버튼 부재가 일치해야 한다.
  it('firefox/other(canDownloadShortcut=false): "바로가기 파일" 약속·다운로드 버튼 모두 없음(카피↔액션 일치)', () => {
    renderWithProviders(
      <InstallGuideDialog
        open
        onOpenChange={() => {}}
        resolution={res({ platform: 'firefox', os: 'other', canDownloadShortcut: false })}
      />,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByText(/바로가기 파일/)).toBeNull(); // 존재하지 않는 파일을 약속하지 않음
    expect(screen.queryByRole('button', { name: /바로가기 파일 내려받기/ })).toBeNull();
  });

  it('firefox/windows(canDownloadShortcut=true): 다운로드 버튼 제공(불일치 없음)', () => {
    renderWithProviders(
      <InstallGuideDialog
        open
        onOpenChange={() => {}}
        resolution={res({ platform: 'firefox', os: 'windows', canDownloadShortcut: true })}
      />,
    );
    expect(screen.getByRole('button', { name: /바로가기 파일 내려받기/ })).toBeInTheDocument();
  });
});
