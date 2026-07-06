// [CL-READ-UX-20260706-211360] 공유 편집자 배지 — 캡·상호배타·텍스트 노드 계약 검증.
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@/test/test-utils';
import { EditorChangeBadge, capNickname } from '../EditorChangeBadge';

afterEach(() => cleanup());

describe('capNickname', () => {
  it('8자 이하 짧은 라벨은 무영향(나·파트너·짧은 닉네임)', () => {
    expect(capNickname('나')).toBe('나');
    expect(capNickname('파트너')).toBe('파트너');
    expect(capNickname('지윤')).toBe('지윤');
    expect(capNickname('공찌곰돌맹쿠')).toBe('공찌곰돌맹쿠'); // 6자
  });
  it('8자 초과 → 앞 8자 + …', () => {
    expect(capNickname('공찌곰돌맹쿠천하무적')).toBe('공찌곰돌맹쿠천하…'); // 10자 → 8+…
  });
  it('앞뒤 공백 trim', () => {
    expect(capNickname('  김철수  ')).toBe('김철수');
  });
  it('사용자 지정 max', () => {
    expect(capNickname('가나다라마', 3)).toBe('가나다…');
  });
});

describe('EditorChangeBadge — 변경(transient·amber)', () => {
  it('changed + partnerName → "{닉네임} 변경" 직계 텍스트(기존 getByText 계약)', () => {
    render(<EditorChangeBadge changed partnerName="지윤" />);
    expect(screen.getByText('지윤 변경')).toBeInTheDocument();
  });

  it('changed + 긴 닉네임 → 캡된 "…변경" 표시(폭 잠식 방지)', () => {
    render(<EditorChangeBadge changed partnerName="공찌곰돌맹쿠천하무적" />);
    expect(screen.getByText('공찌곰돌맹쿠천하… 변경')).toBeInTheDocument();
  });

  it('changed + 공백전용 partnerName → "파트너 변경" 폴백(공백 누출 금지)', () => {
    render(<EditorChangeBadge changed partnerName="   " />);
    expect(screen.getByText('파트너 변경')).toBeInTheDocument();
  });

  it('changed + changedAgo → "지윤 변경"(계약 불변) + "· 5분 전" 병기', () => {
    render(<EditorChangeBadge changed partnerName="지윤" changedAgo="5분 전" />);
    expect(screen.getByText('지윤 변경')).toBeInTheDocument(); // 직계 텍스트 노드 불변
    expect(screen.getByText('· 5분 전')).toBeInTheDocument();
  });
});

describe('EditorChangeBadge — 최근(정적·muted)', () => {
  it('내 편집 → "최근: 나"', () => {
    render(<EditorChangeBadge changed={false} showEditorLabels lastEditedBy="me" myUserId="me" partnerName="지윤" />);
    expect(screen.getByText('최근: 나')).toBeInTheDocument();
  });

  it('파트너 편집 → "최근: 지윤"', () => {
    render(<EditorChangeBadge changed={false} showEditorLabels lastEditedBy="partner" myUserId="me" partnerName="지윤" />);
    expect(screen.getByText('최근: 지윤')).toBeInTheDocument();
  });

  it('긴 파트너 닉네임 → 시각은 캡, aria 는 전체명', () => {
    render(<EditorChangeBadge changed={false} showEditorLabels lastEditedBy="partner" myUserId="me" partnerName="공찌곰돌맹쿠천하무적" />);
    expect(screen.getByText('최근: 공찌곰돌맹쿠천하…')).toBeInTheDocument();
    expect(screen.getByLabelText('최근 편집: 공찌곰돌맹쿠천하무적')).toBeInTheDocument();
  });

  it('showEditorLabels=false → null(렌더 없음)', () => {
    const { container } = render(
      <EditorChangeBadge changed={false} showEditorLabels={false} lastEditedBy="partner" myUserId="me" partnerName="지윤" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('lastEditedBy null → null(오표시 0)', () => {
    const { container } = render(
      <EditorChangeBadge changed={false} showEditorLabels lastEditedBy={null} myUserId="me" partnerName="지윤" />,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe('EditorChangeBadge — 상호배타', () => {
  it('changed=true 는 showEditorLabels 여부와 무관하게 amber "변경"만(최근: 미동시)', () => {
    render(<EditorChangeBadge changed showEditorLabels lastEditedBy="partner" myUserId="me" partnerName="지윤" />);
    expect(screen.getByText('지윤 변경')).toBeInTheDocument();
    expect(screen.queryByText(/^최근:/)).toBeNull();
  });
});
