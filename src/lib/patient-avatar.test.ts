import { describe, expect, it } from 'vitest';
import { patientAvatarTint, patientInitials } from './patient-avatar';

describe('patientInitials', () => {
  it('uses the first letter of the first two words, not first+last', () => {
    // Nombre compuesto hispano típico — el mockup usa "KR", no "KM".
    expect(patientInitials('Kenia Renata Tello Mejía')).toBe('KR');
  });

  it('doubles the first two letters for a single-word name', () => {
    expect(patientInitials('Madonna')).toBe('MA');
  });

  it('returns a placeholder for an empty/blank name', () => {
    expect(patientInitials('   ')).toBe('—');
  });
});

describe('patientAvatarTint', () => {
  it('is deterministic — the same name always gets the same tint', () => {
    expect(patientAvatarTint('Ana Laura Salas Deloya')).toBe(
      patientAvatarTint('Ana Laura Salas Deloya'),
    );
  });

  it('returns one of the known tint classes', () => {
    const tint = patientAvatarTint('Isaac García Sanchez');
    expect(tint).toMatch(/^bg-\S+ text-\S+/);
  });
});
