import { 
  parseISO8601Duration, 
  formatDateTime, 
  isPastDate, 
  isFutureDate 
} from '../../../../src/shared/utils/dates';

describe('Date Utilities', () => {
  describe('parseISO8601Duration', () => {
    test('should parse years correctly', () => {
      expect(parseISO8601Duration('P1Y')).toBe(365 * 24 * 60 * 60 * 1000);
      expect(parseISO8601Duration('P2Y')).toBe(2 * 365 * 24 * 60 * 60 * 1000);
    });

    test('should parse months correctly', () => {
      expect(parseISO8601Duration('P1M')).toBe(30 * 24 * 60 * 60 * 1000);
      expect(parseISO8601Duration('P3M')).toBe(3 * 30 * 24 * 60 * 60 * 1000);
    });

    test('should parse weeks correctly', () => {
      expect(parseISO8601Duration('P1W')).toBe(7 * 24 * 60 * 60 * 1000);
      expect(parseISO8601Duration('P2W')).toBe(2 * 7 * 24 * 60 * 60 * 1000);
    });

    test('should parse days correctly', () => {
      expect(parseISO8601Duration('P1D')).toBe(24 * 60 * 60 * 1000);
      expect(parseISO8601Duration('P7D')).toBe(7 * 24 * 60 * 60 * 1000);
    });

    test('should parse hours correctly', () => {
      expect(parseISO8601Duration('PT1H')).toBe(60 * 60 * 1000);
      expect(parseISO8601Duration('PT12H')).toBe(12 * 60 * 60 * 1000);
    });

    test('should parse minutes correctly', () => {
      expect(parseISO8601Duration('PT1M')).toBe(60 * 1000);
      expect(parseISO8601Duration('PT30M')).toBe(30 * 60 * 1000);
    });

    test('should parse seconds correctly', () => {
      expect(parseISO8601Duration('PT1S')).toBe(1000);
      expect(parseISO8601Duration('PT30S')).toBe(30 * 1000);
    });

    test('should parse combined durations', () => {
      // 1 day 12 hours
      expect(parseISO8601Duration('P1DT12H')).toBe((24 + 12) * 60 * 60 * 1000);
      
      // 2 weeks 3 days 4 hours 30 minutes
      const expected = (2 * 7 * 24 + 3 * 24 + 4) * 60 * 60 * 1000 + 30 * 60 * 1000;
      expect(parseISO8601Duration('P2W3DT4H30M')).toBe(expected);
    });

    test('should throw error for invalid duration format', () => {
      expect(() => parseISO8601Duration('invalid')).toThrow('Invalid ISO 8601 duration');
      expect(() => parseISO8601Duration('P')).toThrow('Invalid ISO 8601 duration');
      expect(() => parseISO8601Duration('')).toThrow('Invalid ISO 8601 duration');
    });

    test('should handle edge cases', () => {
      // Zero duration
      expect(parseISO8601Duration('PT0S')).toBe(0);
      
      // Maximum practical duration
      expect(parseISO8601Duration('P10Y')).toBe(10 * 365 * 24 * 60 * 60 * 1000);
    });
  });

  describe('formatDateTime', () => {
    test('should format date correctly', () => {
      const date = new Date(2024, 0, 15, 14, 30); // Jan 15, 2024, 2:30 PM
      const formatted = formatDateTime(date);
      
      // Format: "January 15, 2024, 2:30 PM" (locale dependent)
      expect(formatted).toContain('2024');
      expect(formatted).toContain(':30');
    });

    test('should handle different dates', () => {
      const dates = [
        new Date(2024, 0, 1, 0, 0),
        new Date(2024, 11, 31, 23, 59),
        new Date(),
      ];
      
      dates.forEach(date => {
        const formatted = formatDateTime(date);
        expect(typeof formatted).toBe('string');
        expect(formatted.length).toBeGreaterThan(0);
      });
    });
  });

  describe('isPastDate', () => {
    test('should return true for past dates', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      expect(isPastDate(yesterday)).toBe(true);
    });

    test('should return false for future dates', () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      expect(isPastDate(tomorrow)).toBe(false);
    });

    test('should return false for current date (not past)', () => {
      const now = new Date();
      expect(isPastDate(now)).toBe(false);
    });

    test('should handle edge cases', () => {
      const oneSecondAgo = new Date(Date.now() - 1000);
      expect(isPastDate(oneSecondAgo)).toBe(true);
      
      const oneMillisecondAgo = new Date(Date.now() - 1);
      expect(isPastDate(oneMillisecondAgo)).toBe(true);
    });
  });

  describe('isFutureDate', () => {
    test('should return true for future dates', () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      expect(isFutureDate(tomorrow)).toBe(true);
    });

    test('should return false for past dates', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      expect(isFutureDate(yesterday)).toBe(false);
    });

    test('should return false for current date (not future)', () => {
      const now = new Date();
      expect(isFutureDate(now)).toBe(false);
    });

    test('should handle edge cases', () => {
      const oneSecondLater = new Date(Date.now() + 1000);
      expect(isFutureDate(oneSecondLater)).toBe(true);
      
      const oneMillisecondLater = new Date(Date.now() + 1);
      expect(isFutureDate(oneMillisecondLater)).toBe(true);
    });
  });

  describe('Integration: Date utilities work together', () => {
    test('should correctly identify event timing', () => {
      const duration = 'P1D'; // 1 day
      const ms = parseISO8601Duration(duration);
      
      const pastEvent = new Date(Date.now() - ms);
      const futureEvent = new Date(Date.now() + ms);
      
      expect(isPastDate(pastEvent)).toBe(true);
      expect(isFutureDate(pastEvent)).toBe(false);
      
      expect(isPastDate(futureEvent)).toBe(false);
      expect(isFutureDate(futureEvent)).toBe(true);
    });

    test('should format parsed duration dates correctly', () => {
      const duration = 'P7D'; // 1 week
      const ms = parseISO8601Duration(duration);
      const eventDate = new Date(Date.now() + ms);
      
      const formatted = formatDateTime(eventDate);
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(10);
    });
  });
});