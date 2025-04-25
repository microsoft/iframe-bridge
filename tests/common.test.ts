import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { uuid, delayExecute } from '@/common';


describe('common utils tests', () => {
  it('uuid should return diff string', () => {
    expect(uuid()).not.toBe(uuid());
  });

  describe('delayExecute', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should execute function after specified delay', () => {
      const mockFn = vi.fn();
      const delayedFn = delayExecute(mockFn);

      delayedFn(1000);
      expect(mockFn).not.toBeCalled();

      vi.advanceTimersByTime(500);
      expect(mockFn).not.toBeCalled();

      vi.advanceTimersByTime(500);
      expect(mockFn).toBeCalledTimes(1);
    });

    it('should clear previous timer when called again', () => {
      const mockFn = vi.fn();
      const delayedFn = delayExecute(mockFn);

      delayedFn(1000);
      vi.advanceTimersByTime(500);

      delayedFn(1000);
      vi.advanceTimersByTime(500);
      expect(mockFn).not.toBeCalled();

      vi.advanceTimersByTime(500);
      expect(mockFn).toBeCalledTimes(1);
    });
  });
});

