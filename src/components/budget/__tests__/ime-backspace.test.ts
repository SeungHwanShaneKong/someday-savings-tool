import { describe, it, expect } from 'vitest';
import { sanitizeWonText } from '@/lib/smart-won';

describe('sanitizeWonText — IME backspace scenarios', () => {
  it('handles incomplete hangul from backspace (마)', () => {
    expect(sanitizeWonText('500마')).toBe('500');
  });

  it('handles highly incomplete hangul (ㅁ)', () => {
    expect(sanitizeWonText('500ㅁ')).toBe('500');
  });

  it('handles multiple partial consonants', () => {
    expect(sanitizeWonText('500ㅂㅂㅈ')).toBe('500');
  });

  it('handles empty after full deletion', () => {
    expect(sanitizeWonText('ㅂㅂㅈ')).toBe('');
  });

  it('preserves valid completed hangul (완성된 한글)', () => {
    expect(sanitizeWonText('500만')).toBe('500만');
    expect(sanitizeWonText('1억2000만')).toBe('1억2000만');
  });

  it('handles mixed complete and incomplete', () => {
    expect(sanitizeWonText('500만ㅁ')).toBe('500만');
  });
});
