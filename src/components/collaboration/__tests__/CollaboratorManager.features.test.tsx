// [CL-COEDIT-COPY-20260620 / CL-COEDIT-PARTICIPANTS-20260620] CollaboratorManager — 복사하여 공동편집(F2) + 참여자 이름 표시(F5).
//
// 계약: (F5) 본인 제외한 참여자만 표시 · display_name 우선('파트너' 폴백) · 오너 row 는 👑+해제불가 · 협업자는 오너만 해제 X.
//       (F2) showCopyToCoedit(개인소유) → "복사하여 공동편집(원본 보존)" 1순위 버튼 + 초대버튼 라벨 변경 · 클릭 시 onCopyToCoedit.
// 격리: useCollaboration 을 hoisted 홀더로 모킹(목록/콜백 직접 제어 — 기존 .test.tsx 는 supabase 모킹이라 별도 파일).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { CollaboratorManager } from '@/components/collaboration/CollaboratorManager';
import type { Collaborator } from '@/hooks/useCollaboration';

const h = vi.hoisted(() => ({
  collaborators: [] as Collaborator[],
  inviteUrl: null as string | null,
  busy: false,
  createInvite: vi.fn(async () => 'https://wedsem.example.com/invite/tok'),
  removeCollaborator: vi.fn(async () => true),
  refresh: vi.fn(async () => {}),
}));
vi.mock('@/hooks/useCollaboration', () => ({ useCollaboration: () => h }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

beforeEach(() => {
  h.collaborators = [];
  h.inviteUrl = null;
  h.busy = false;
  h.createInvite.mockClear();
  h.removeCollaborator.mockClear();
});

describe('CollaboratorManager — F5 참여자 이름 표시', () => {
  it('CMF.1 본인(isMe) 제외하고 상대 이름만 표시', () => {
    h.collaborators = [
      { user_id: 'owner-1', role: 'owner', display_name: '신랑 민준', isMe: true },
      { user_id: 'p9', role: 'editor', display_name: '신부 서연', isMe: false },
    ];
    renderWithProviders(<CollaboratorManager budgetId="b1" isOwner={true} />);

    expect(screen.getAllByText(/신부 서연/).length).toBeGreaterThan(0); // 상대 표시
    expect(screen.queryByText(/신랑 민준/)).toBeNull(); // 본인 제외
  });

  it('CMF.2 display_name 없으면 "파트너" 폴백 표기', () => {
    h.collaborators = [{ user_id: 'p9', role: 'editor', isMe: false }];
    renderWithProviders(<CollaboratorManager budgetId="b1" isOwner={true} />);
    expect(screen.getAllByText(/파트너/).length).toBeGreaterThan(0);
  });

  // [CL-BTNPERFECT-20260629] 파괴적 액션 → 확인 다이얼로그 도입. 트리거만으론 호출 0, 확인(해제) 시에만 호출.
  it('CMF.3 오너는 협업자(editor) 해제 X 노출 → 확인 다이얼로그 거쳐 removeCollaborator(user_id)', async () => {
    h.collaborators = [{ user_id: 'p9', role: 'editor', display_name: '서연', isMe: false }];
    renderWithProviders(<CollaboratorManager budgetId="b1" isOwner={true} />);

    fireEvent.click(screen.getByLabelText(/공동관리 해제/));
    expect(h.removeCollaborator).not.toHaveBeenCalled(); // 확인 전엔 호출 안 됨(실수 제거 방지)

    fireEvent.click(await screen.findByText('해제'));
    expect(h.removeCollaborator).toHaveBeenCalledWith('p9');
  });

  it('CMF.4 협업자 시점(isOwner=false): 오너 row 는 표시하되 해제 X 없음', () => {
    h.collaborators = [
      { user_id: 'owner-1', role: 'owner', display_name: '민준', isMe: false }, // 상대=오너
      { user_id: 'me', role: 'editor', display_name: '나', isMe: true }, // 본인=제외
    ];
    renderWithProviders(<CollaboratorManager budgetId="b1" isOwner={false} />);

    expect(screen.getAllByText(/민준/).length).toBeGreaterThan(0);
    expect(screen.queryByLabelText(/공동관리 해제/)).toBeNull(); // 비오너 → 해제 불가
  });

  it('CMF.5 상대가 없으면(본인만) 빈 상태 안내', () => {
    h.collaborators = [{ user_id: 'owner-1', role: 'owner', display_name: '민준', isMe: true }];
    renderWithProviders(<CollaboratorManager budgetId="b1" isOwner={true} />);
    expect(screen.getByText(/아직 함께하는 파트너가 없어요/)).toBeInTheDocument();
  });
});

describe('CollaboratorManager — F2 복사하여 공동편집', () => {
  it('CMF.6 showCopyToCoedit(개인소유) → 복사 버튼 노출 + 초대 라벨 변경', () => {
    renderWithProviders(
      <CollaboratorManager budgetId="b1" isOwner={true} showCopyToCoedit onCopyToCoedit={vi.fn()} />,
    );
    expect(screen.getByText('복사하여 공동편집 (원본 보존)')).toBeInTheDocument();
    // 복사 모드에선 in-place 초대 버튼 라벨이 "이 예산 그대로 공유" 로 명확화
    expect(screen.getByText('이 예산 그대로 공유')).toBeInTheDocument();
  });

  it('CMF.7 복사 버튼 클릭 → onCopyToCoedit 호출', () => {
    const onCopy = vi.fn();
    renderWithProviders(
      <CollaboratorManager budgetId="b1" isOwner={true} showCopyToCoedit onCopyToCoedit={onCopy} />,
    );
    fireEvent.click(screen.getByText('복사하여 공동편집 (원본 보존)'));
    expect(onCopy).toHaveBeenCalledTimes(1);
  });

  it('CMF.8 showCopyToCoedit 미설정(공유 예산) → 복사 버튼 없음 + 기본 초대 라벨', () => {
    renderWithProviders(<CollaboratorManager budgetId="b1" isOwner={true} />);
    expect(screen.queryByText('복사하여 공동편집 (원본 보존)')).toBeNull();
    expect(screen.getByText('파트너 초대 링크 만들기')).toBeInTheDocument();
  });

  it('CMF.9 비오너 → 복사/초대 버튼 모두 없음(권한 가드)', () => {
    renderWithProviders(
      <CollaboratorManager budgetId="b1" isOwner={false} showCopyToCoedit onCopyToCoedit={vi.fn()} />,
    );
    expect(screen.queryByText('복사하여 공동편집 (원본 보존)')).toBeNull();
    expect(screen.queryByText('파트너 초대 링크 만들기')).toBeNull();
  });

  // [CL-BTNAUDIT3-20260704 | copy-double-submit] 진행 중(Promise pending) 이중 클릭 → onCopyToCoedit 1회만.
  //   AsyncButton 이 Promise 반환을 감지해 busy(disabled) 로 잠그므로 두 번째 클릭은 무시되어야 한다.
  it('CMF.10 복사 진행 중 이중 클릭 → onCopyToCoedit 1회만 호출(공동편집본 중복 생성 차단)', async () => {
    let resolveCopy: () => void = () => {};
    const onCopy = vi.fn(
      () =>
        new Promise<void>((res) => {
          resolveCopy = res;
        }),
    );
    renderWithProviders(
      <CollaboratorManager budgetId="b1" isOwner={true} showCopyToCoedit onCopyToCoedit={onCopy} />,
    );

    const btn = screen.getByText('복사하여 공동편집 (원본 보존)').closest('button')!;
    // 1차 클릭 → Promise pending → 버튼 busy(disabled)
    fireEvent.click(btn);
    await waitFor(() => expect(btn).toBeDisabled());
    // 2차 클릭(연타) → disabled + 내부 busyRef 동기 게이트라 무시
    fireEvent.click(btn);
    expect(onCopy).toHaveBeenCalledTimes(1);

    // 완료 후 잠금 해제(회복 검증)
    resolveCopy();
    await waitFor(() => expect(btn).not.toBeDisabled());
  });
});
