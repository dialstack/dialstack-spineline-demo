import { describe, it, expect } from 'vitest';
import { isExtension, normalizePatientPhone } from '../../lib/phone';

describe('isExtension', () => {
  it('accepts 2 to 6 digits', () => {
    expect(isExtension('10')).toBe(true);
    expect(isExtension('1003')).toBe(true);
    expect(isExtension(' 123456 ')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isExtension('1')).toBe(false);
    expect(isExtension('1234567')).toBe(false);
    expect(isExtension('*97')).toBe(false);
    expect(isExtension('555-1234')).toBe(false);
  });
});

describe('normalizePatientPhone', () => {
  it('formats a phone number as E.164', () => {
    expect(normalizePatientPhone('(555) 123-4567')).toBe('+15551234567');
  });

  it('keeps an extension as its digits', () => {
    expect(normalizePatientPhone(' 1003 ')).toBe('1003');
  });

  it('returns null for neither', () => {
    expect(normalizePatientPhone('*97')).toBeNull();
  });
});
