import { describe, it, expect } from 'vitest';
import { computeCountdownState } from '../src/time-utils.js';

// === computeCountdownState ===

describe('computeCountdownState', () => {
  describe('no target scenarios', () => {
    it('shows "Fuori Orario Lavorativo" when not clocked in and no target', () => {
      const result = computeCountdownState(null, false, 0);
      expect(result.text).toBe('Fuori Orario Lavorativo');
      expect(result.className).toBe('countdown');
    });

    it('shows "Uscita Serale — SCADUTO!" when clocked in and no target', () => {
      const result = computeCountdownState(null, true, 0);
      expect(result.text).toBe('Uscita Serale — SCADUTO!');
      expect(result.className).toBe('countdown urgent');
    });

    it('returns empty text when isTimbrato is null and no target', () => {
      const result = computeCountdownState(null, null, 0);
      expect(result.text).toBe('');
      expect(result.className).toBe('countdown');
    });
  });

  describe('expired target (diffMs <= 0)', () => {
    const target = { label: 'Entrata Mattina', targetMinutes: 540, isUrgent: false };

    it('shows SCADUTO when diffMs is 0', () => {
      const result = computeCountdownState(target, false, 0);
      expect(result.text).toBe('Entrata Mattina - SCADUTO!');
      expect(result.className).toBe('countdown urgent');
    });

    it('shows SCADUTO when diffMs is negative', () => {
      const result = computeCountdownState(target, false, -60000);
      expect(result.text).toBe('Entrata Mattina - SCADUTO!');
      expect(result.className).toBe('countdown urgent');
    });
  });

  describe('time formatting', () => {
    const target = { label: 'Uscita Pranzo', targetMinutes: 780, isUrgent: false };

    it('formats hours + minutes + seconds when > 1 hour remaining', () => {
      const diffMs = 2 * 60 * 60 * 1000 + 30 * 60 * 1000 + 15 * 1000; // 2h 30m 15s
      const result = computeCountdownState(target, true, diffMs);
      expect(result.text).toBe('Uscita Pranzo: 2h 30m 15s');
    });

    it('formats only minutes + seconds when < 1 hour remaining', () => {
      const diffMs = 45 * 60 * 1000 + 10 * 1000; // 45m 10s
      const result = computeCountdownState(target, true, diffMs);
      expect(result.text).toBe('Uscita Pranzo: 45m 10s');
    });

    it('formats 0m Ns when less than 1 minute remaining', () => {
      const diffMs = 30 * 1000; // 30s
      const result = computeCountdownState(target, true, diffMs);
      expect(result.text).toBe('Uscita Pranzo: 0m 30s');
    });
  });

  describe('CSS class assignment', () => {
    it('applies "urgent" class when target.isUrgent is true', () => {
      const target = { label: 'Entrata Mattina (scadenza)', targetMinutes: 780, isUrgent: true };
      const diffMs = 60 * 60 * 1000; // 1 hour — would be normal, but isUrgent overrides
      const result = computeCountdownState(target, false, diffMs);
      expect(result.className).toBe('countdown urgent');
    });

    it('applies "urgent" class when less than 5 minutes remaining', () => {
      const target = { label: 'Uscita Pranzo', targetMinutes: 780, isUrgent: false };
      const diffMs = 4 * 60 * 1000 + 30 * 1000; // 4m 30s
      const result = computeCountdownState(target, true, diffMs);
      expect(result.className).toBe('countdown urgent');
    });

    it('applies "warning" class when 5-14 minutes remaining', () => {
      const target = { label: 'Uscita Pranzo', targetMinutes: 780, isUrgent: false };
      const diffMs = 10 * 60 * 1000; // 10m
      const result = computeCountdownState(target, true, diffMs);
      expect(result.className).toBe('countdown warning');
    });

    it('applies normal class when >= 15 minutes remaining', () => {
      const target = { label: 'Uscita Pranzo', targetMinutes: 780, isUrgent: false };
      const diffMs = 30 * 60 * 1000; // 30m
      const result = computeCountdownState(target, true, diffMs);
      expect(result.className).toBe('countdown');
    });

    it('applies "urgent" at exactly 5 minute boundary (minutesLeft = 4)', () => {
      const target = { label: 'Uscita Serale', targetMinutes: 1080, isUrgent: false };
      const diffMs = 4 * 60 * 1000 + 59 * 1000; // 4m 59s → minutesLeft = 4
      const result = computeCountdownState(target, true, diffMs);
      expect(result.className).toBe('countdown urgent');
    });

    it('applies "warning" at exactly 15 minute boundary (minutesLeft = 14)', () => {
      const target = { label: 'Uscita Serale', targetMinutes: 1080, isUrgent: false };
      const diffMs = 14 * 60 * 1000 + 59 * 1000; // 14m 59s → minutesLeft = 14
      const result = computeCountdownState(target, true, diffMs);
      expect(result.className).toBe('countdown warning');
    });

    it('applies normal at minutesLeft = 15', () => {
      const target = { label: 'Uscita Serale', targetMinutes: 1080, isUrgent: false };
      const diffMs = 15 * 60 * 1000; // exactly 15m
      const result = computeCountdownState(target, true, diffMs);
      expect(result.className).toBe('countdown');
    });
  });
});
