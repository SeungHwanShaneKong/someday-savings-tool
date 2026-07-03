// [CL-TOP20-P4-AICHAT-20260703-040000] 스타터 프롬프트 골든 가드 —
// 모든 칩 질문은 지식베이스(searchKnowledge)로 답변 가능해야 한다(빈손 답변 방지).
import { describe, it, expect } from 'vitest';
import { STARTER_PROMPTS } from '@/lib/chat-prompts';
import { searchKnowledge } from '@/lib/wedding-knowledge-base';

describe('chat-prompts — 스타터 프롬프트 큐레이션', () => {
  it('SP-KB.1: 정확히 4개의 프롬프트가 있고 id 는 고유하다', () => {
    expect(STARTER_PROMPTS).toHaveLength(4);
    const ids = STARTER_PROMPTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(4);
  });

  it('SP-KB.2: 모든 프롬프트는 라벨·질문이 비어있지 않다', () => {
    for (const p of STARTER_PROMPTS) {
      expect(p.label.trim().length).toBeGreaterThan(0);
      expect(p.question.trim().length).toBeGreaterThan(0);
    }
  });

  it('SP-KB.3: 모든 질문은 지식베이스 검색에 최소 1건 이상 매칭된다(지식기반 답변 가능)', () => {
    for (const p of STARTER_PROMPTS) {
      const hits = searchKnowledge(p.question, 3);
      expect(hits.length, `"${p.question}" 이(가) 지식베이스에 매칭되지 않음`).toBeGreaterThan(0);
    }
  });
});
