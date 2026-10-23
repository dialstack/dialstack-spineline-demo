import { describe, it, expect } from 'vitest';
import { splitCallerName } from '../../lib/patientName';

describe('splitCallerName', () => {
  it('takes the last word as the last name', () => {
    expect(splitCallerName('Jake Bascom')).toEqual({ first_name: 'Jake', last_name: 'Bascom' });
    expect(splitCallerName('  Mary  Ann Lee ')).toEqual({
      first_name: 'Mary Ann',
      last_name: 'Lee',
    });
  });

  it('title-cases an all-caps caller ID', () => {
    expect(splitCallerName('JAKE BASCOM')).toEqual({ first_name: 'Jake', last_name: 'Bascom' });
  });

  it('keeps mixed case as given', () => {
    expect(splitCallerName('Ian McDonald')).toEqual({ first_name: 'Ian', last_name: 'McDonald' });
  });

  it('needs two words', () => {
    expect(splitCallerName('Jake')).toBeNull();
    expect(splitCallerName('')).toBeNull();
    expect(splitCallerName(null)).toBeNull();
  });
});
