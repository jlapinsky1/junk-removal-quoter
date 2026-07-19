import { describe, it, expect } from 'vitest';
import {
  validatePhone, validateEmail, validatePhotos, validateImageFile,
  validateMonetary, validateExpirationDate, validateCompletionData,
  validateSlotAvailability,
} from '../validation';

describe('validatePhone', () => {
  it('rejects empty', () => expect(validatePhone('')).toBeTruthy());
  it('rejects short', () => expect(validatePhone('123')).toBeTruthy());
  it('accepts valid', () => expect(validatePhone('(555) 555-5555')).toBeNull());
  it('accepts international', () => expect(validatePhone('+1 555 555 5555')).toBeNull());
});

describe('validateEmail', () => {
  it('allows empty (optional)', () => expect(validateEmail('')).toBeNull());
  it('rejects invalid', () => expect(validateEmail('notanemail')).toBeTruthy());
  it('accepts valid', () => expect(validateEmail('test@example.com')).toBeNull());
});

describe('validatePhotos', () => {
  it('rejects fewer than 3', () => expect(validatePhotos([1, 2])).toBeTruthy());
  it('rejects more than 10', () => expect(validatePhotos(new Array(11))).toBeTruthy());
  it('accepts 3-10', () => expect(validatePhotos([1, 2, 3])).toBeNull());
});

describe('validateImageFile', () => {
  it('rejects null', () => expect(validateImageFile(null)).toBeTruthy());
  it('rejects wrong type', () => {
    expect(validateImageFile({ type: 'application/pdf', name: 'x.pdf', size: 1000 })).toBeTruthy();
  });
  it('rejects too large', () => {
    expect(validateImageFile({ type: 'image/jpeg', name: 'x.jpg', size: 20 * 1024 * 1024 })).toBeTruthy();
  });
  it('accepts valid JPEG', () => {
    expect(validateImageFile({ type: 'image/jpeg', name: 'x.jpg', size: 1000 })).toBeNull();
  });
});

describe('validateMonetary', () => {
  it('rejects empty', () => expect(validateMonetary('', 'Price')).toBeTruthy());
  it('rejects negative', () => expect(validateMonetary(-5, 'Price')).toBeTruthy());
  it('rejects NaN', () => expect(validateMonetary('abc', 'Price')).toBeTruthy());
  it('accepts zero', () => expect(validateMonetary(0, 'Price')).toBeNull());
  it('accepts positive', () => expect(validateMonetary(100, 'Price')).toBeNull());
});

describe('validateExpirationDate', () => {
  it('rejects empty', () => expect(validateExpirationDate('')).toBeTruthy());
  it('rejects past date', () => expect(validateExpirationDate('2020-01-01T00:00:00Z')).toBeTruthy());
  it('accepts future date', () => expect(validateExpirationDate('2099-01-01T00:00:00Z')).toBeNull());
});

describe('validateCompletionData', () => {
  it('rejects missing final amount', () => {
    const errors = validateCompletionData({ finalAmount: '' });
    expect(errors).toBeTruthy();
    expect(errors.finalAmount).toBeTruthy();
  });
  it('rejects negative final amount', () => {
    const errors = validateCompletionData({ finalAmount: -5 });
    expect(errors).toBeTruthy();
  });
  it('accepts valid data', () => {
    const errors = validateCompletionData({ finalAmount: 300, actualTravelTime: '', actualOnSiteTime: '' });
    expect(errors).toBeNull();
  });
});

describe('validateSlotAvailability', () => {
  it('rejects empty slot', () => expect(validateSlotAvailability('', [])).toBeTruthy());
  it('rejects booked slot', () => expect(validateSlotAvailability('A', ['A', 'B'])).toBeTruthy());
  it('accepts available slot', () => expect(validateSlotAvailability('A', ['B'])).toBeNull());
});
