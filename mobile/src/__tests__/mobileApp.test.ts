import { formatDate, formatTime, formatTimeRange, getDayLabel, getDayShort } from '../utils/dateUtils';
import { getErrorMessage, isNetworkError, isTimeoutError } from '../utils/errorHandler';

describe('Mobile App Unit & Utilities Test Suite', () => {
  describe('dateUtils', () => {
    it('formats ISO date strings correctly', () => {
      expect(formatDate('2026-08-28')).toBe('Aug 28, 2026');
      expect(formatDate('2026-12-25')).toBe('Dec 25, 2026');
    });

    it('formats HH:mm:ss strings to 12-hour AM/PM format', () => {
      expect(formatTime('09:00:00')).toBe('9:00 AM');
      expect(formatTime('17:00:00')).toBe('5:00 PM');
      expect(formatTime('18:30:00')).toBe('6:30 PM');
    });

    it('formats slot start and end time ranges correctly', () => {
      expect(formatTimeRange('17:00:00', '18:00:00')).toBe('5:00 PM \u2013 6:00 PM');
      expect(formatTimeRange('06:00:00', '07:30:00')).toBe('6:00 AM \u2013 7:30 AM');
    });

    it('maps dayOfWeek numbers to day labels correctly', () => {
      expect(getDayLabel(0)).toBe('Monday');
      expect(getDayLabel(4)).toBe('Friday');
      expect(getDayLabel(6)).toBe('Sunday');
      expect(getDayShort(0)).toBe('Mon');
      expect(getDayShort(4)).toBe('Fri');
    });
  });

  describe('errorHandler', () => {
    it('extracts backend ApiError message if present', () => {
      const apiError = {
        status: 404,
        message: 'Subject not found for student',
        isNetworkError: false,
        isTimeout: false,
      };
      expect(getErrorMessage(apiError)).toBe('Subject not found for student');
    });

    it('falls back to Error.message if standard Error', () => {
      const errorObj = new Error('Network connection timeout');
      expect(getErrorMessage(errorObj)).toBe('Network connection timeout');
    });

    it('provides generic fallback string when error is unknown or null', () => {
      expect(getErrorMessage(null)).toBe('An unexpected error occurred.');
    });

    it('correctly identifies network and timeout errors', () => {
      expect(isNetworkError({ isNetworkError: true })).toBe(true);
      expect(isNetworkError({ isNetworkError: false })).toBe(false);
      expect(isTimeoutError({ isTimeout: true })).toBe(true);
      expect(isTimeoutError({ isTimeout: false })).toBe(false);
    });
  });
});
