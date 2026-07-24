import { describe, it, expect } from 'vitest';
import { isValidZip, reasonToUiState } from '../serviceArea.js';

// ---------------------------------------------------------------------------
// isValidZip
// ---------------------------------------------------------------------------

describe('isValidZip', () => {
  it('accepts a five-digit string', () => expect(isValidZip('30301')).toBe(true));
  it('rejects fewer than 5 digits', () => expect(isValidZip('3030')).toBe(false));
  it('rejects more than 5 digits', () => expect(isValidZip('303011')).toBe(false));
  it('rejects letters', () => expect(isValidZip('3030A')).toBe(false));
  it('rejects empty string', () => expect(isValidZip('')).toBe(false));
  it('rejects null', () => expect(isValidZip(null)).toBe(false));
  it('rejects undefined', () => expect(isValidZip(undefined)).toBe(false));
  it('trims before checking', () => expect(isValidZip(' 30301 ')).toBe(true));
  it('rejects a number (non-string)', () => expect(isValidZip(30301)).toBe(false));
});

// ---------------------------------------------------------------------------
// reasonToUiState
// ---------------------------------------------------------------------------

describe('reasonToUiState', () => {
  it('maps "serviceable" to serviceable', () => {
    expect(reasonToUiState('serviceable')).toBe('serviceable');
  });

  it('maps "unconfigured" to serviceable (fail-open)', () => {
    expect(reasonToUiState('unconfigured')).toBe('serviceable');
  });

  it('maps "error" to serviceable (fail-open)', () => {
    expect(reasonToUiState('error')).toBe('serviceable');
  });

  it('maps null/undefined to serviceable (fail-open)', () => {
    expect(reasonToUiState(null)).toBe('serviceable');
    expect(reasonToUiState(undefined)).toBe('serviceable');
  });

  it('maps "invalid_zip" to invalid', () => {
    expect(reasonToUiState('invalid_zip')).toBe('invalid');
  });

  it('maps "unavailable" to unavailable', () => {
    expect(reasonToUiState('unavailable')).toBe('unavailable');
  });

  it('maps "outside" to outside', () => {
    expect(reasonToUiState('outside')).toBe('outside');
  });

  it('maps "excluded" to outside', () => {
    expect(reasonToUiState('excluded')).toBe('outside');
  });
});
