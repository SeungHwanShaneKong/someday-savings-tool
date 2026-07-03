/** [CL-TOP20-P4-AICHAT-20260703-040000] 스타터 프롬프트 칩 — 렌더·클릭 전송·숨김 조건 */
import { describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import { renderWithProviders, screen, fireEvent, within } from '@/test/test-utils';
import { ChatContainer } from '../ChatContainer';
import { STARTER_PROMPTS } from '@/lib/chat-prompts';
import type { ChatMessage } from '@/hooks/useAIChat';

function baseProps() {
  return {
    messages: [] as ChatMessage[],
    isLoading: false,
    onSend: vi.fn(),
    messagesEndRef: createRef<HTMLDivElement>(),
    starterPrompts: STARTER_PROMPTS,
  };
}

describe('ChatContainer — 스타터 프롬프트 칩', () => {
  it('SP.1: 빈 대화(messages=[]) → 추천 질문 그룹에 칩 4개 렌더', () => {
    renderWithProviders(<ChatContainer {...baseProps()} />);
    const group = screen.getByRole('group', { name: '추천 질문' });
    const chips = within(group).getAllByRole('button');
    expect(chips).toHaveLength(4);
    expect(chips[0]).toHaveTextContent(STARTER_PROMPTS[0].label);
  });

  it('SP.2: 칩 클릭 → 해당 질문 전문으로 onSend 즉시 호출', () => {
    const props = baseProps();
    renderWithProviders(<ChatContainer {...props} />);
    const group = screen.getByRole('group', { name: '추천 질문' });
    const chips = within(group).getAllByRole('button');
    fireEvent.click(chips[1]);
    expect(props.onSend).toHaveBeenCalledTimes(1);
    expect(props.onSend).toHaveBeenCalledWith(STARTER_PROMPTS[1].question);
  });

  it('SP.3: 대화가 있으면(messages.length>0) 칩 미표시', () => {
    const props = baseProps();
    props.messages = [
      { role: 'user', content: '안녕하세요', timestamp: new Date().toISOString() },
    ];
    renderWithProviders(<ChatContainer {...props} />);
    expect(screen.queryByRole('group', { name: '추천 질문' })).toBeNull();
  });

  it('SP.4: limitReached → 칩 disabled(클릭해도 전송 안 됨)', () => {
    const props = baseProps();
    renderWithProviders(<ChatContainer {...props} limitReached={true} showLimitCounter={true} />);
    const group = screen.getByRole('group', { name: '추천 질문' });
    const chips = within(group).getAllByRole('button');
    expect(chips[0]).toBeDisabled();
    fireEvent.click(chips[0]);
    expect(props.onSend).not.toHaveBeenCalled();
  });

  it('SP.5: starterPrompts 미전달 → 그룹 자체가 없다(기존 표면 회귀 0)', () => {
    const props = baseProps();
    renderWithProviders(
      <ChatContainer
        messages={props.messages}
        isLoading={props.isLoading}
        onSend={props.onSend}
        messagesEndRef={props.messagesEndRef}
      />
    );
    expect(screen.queryByRole('group', { name: '추천 질문' })).toBeNull();
  });
});
