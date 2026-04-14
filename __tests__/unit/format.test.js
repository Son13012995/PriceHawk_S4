import { describe, it, expect } from 'vitest';
import { formatPrice } from '../../app/utils/format';

describe('formatPrice', () => {
  it('should format a positive price with Vietnamese currency', () => {
    const result = formatPrice(1000000);
    expect(result).toContain('₫');
    expect(result).toMatch(/\d/); // Contains numbers
  });

  it('should handle price 0', () => {
    const result = formatPrice(0);
    expect(result).toBe('0 ₫');
  });

  it('should handle null price', () => {
    const result = formatPrice(null);
    expect(result).toBe('0 ₫');
  });

  it('should handle undefined price', () => {
    const result = formatPrice(undefined);
    expect(result).toBe('0 ₫');
  });

  it('should format decimal prices', () => {
    const result = formatPrice(99.99);
    expect(result).toContain('₫');
  });

  it('should format large prices with thousand separators', () => {
    const result = formatPrice(1999999);
    expect(result).toContain('₫');
    // Vietnamese formatting uses . as thousand separator
    expect(result.length).toBeGreaterThan('1999999 ₫'.length);
  });

  it('should handle negative prices', () => {
    const result = formatPrice(-100);
    expect(result).toContain('₫');
    expect(result).toContain('-');
  });
});
