import { fireCelebrationConfetti, fireBadgeConfetti } from '@/lib/confetti';
import confetti from 'canvas-confetti';

jest.mock('canvas-confetti', () => jest.fn());

describe('Confetti Celebration Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('triggers fireCelebrationConfetti burst sequences without errors', () => {
    fireCelebrationConfetti();
    expect(confetti).toHaveBeenCalled();
    expect((confetti as unknown as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it('triggers fireBadgeConfetti with custom coordinates', () => {
    fireBadgeConfetti(0.3, 0.4);
    expect(confetti).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: { x: 0.3, y: 0.4 },
        particleCount: 50,
      })
    );
  });
});
