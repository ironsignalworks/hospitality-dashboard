import { detectConflict } from './conflicts';
import { describe, it, expect } from 'vitest';

describe('detectConflict', () => {
  it('detects overlapping reservations in same room', () => {
    const existing = [
      { room: 'Quarto 1', check_in: '2026-09-05', check_out: '2026-09-10', status: 'confirmed' }
    ];
    const newRes = { room: 'Quarto 1', check_in: '2026-09-08', check_out: '2026-09-12' };
    expect(detectConflict(newRes, existing)).toHaveLength(1);
  });

  it('allows non-overlapping dates', () => {
    const existing = [
      { room: 'Quarto 1', check_in: '2026-09-05', check_out: '2026-09-10', status: 'confirmed' }
    ];
    const newRes = { room: 'Quarto 1', check_in: '2026-09-10', check_out: '2026-09-15' };
    expect(detectConflict(newRes, existing)).toHaveLength(0);
  });

  it('treats padded room names as the same room', () => {
    const existing = [
      { room: 'Quarto 1', check_in: '2026-09-05', check_out: '2026-09-10', status: 'confirmed' },
    ];
    const newRes = { room: '  Quarto 1  ', check_in: '2026-09-08', check_out: '2026-09-12' };
    expect(detectConflict(newRes, existing)).toHaveLength(1);
  });
});
