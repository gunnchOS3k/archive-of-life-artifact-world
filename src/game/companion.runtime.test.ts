import { describe, expect, it } from 'vitest';
import { Lifeling } from '@/game/companion';

describe('Lifeling runtime mode', () => {
  it('reports idle, follow, and emote without claiming science', () => {
    const l = new Lifeling();
    l.x = 0;
    l.y = 0;
    expect(l.runtimeMode(0, 0)).toBe('idle');
    expect(l.runtimeMode(400, 0)).toBe('follow');
    l.triggerReaction('celebrate');
    expect(l.runtimeMode(0, 0)).toBe('emote');
  });
});
