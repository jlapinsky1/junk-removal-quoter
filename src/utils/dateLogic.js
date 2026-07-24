/**
 * Pure date-logic utilities for the booking flow.
 * No React dependencies. All functions accept an explicit referenceDate
 * so they are deterministically testable without time-mocking.
 */

/**
 * Formats a Date object as a YYYY-MM-DD string using local calendar values.
 * @param {Date} d
 * @returns {string}
 */
export function localDateString(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns available booking dates within a rolling window.
 *
 * @param {object} options
 * @param {Date|string} [options.referenceDate=new Date()] - The "today" date. Accepts a Date or YYYY-MM-DD string.
 * @param {number} [options.daysAhead=21] - Calendar days to look ahead starting from the day after referenceDate.
 * @param {string[]} [options.unavailableDates=[]] - ISO date strings (YYYY-MM-DD) that are blocked.
 * @param {number[]} [options.businessDays=[1,2,3,4,5,6]] - Days of week to include (0=Sun, 6=Sat). Sundays excluded by default.
 * @returns {string[]} Array of YYYY-MM-DD strings.
 */
export function getAvailableBookingDates({
  referenceDate = new Date(),
  daysAhead = 21,
  unavailableDates = [],
  businessDays = [1, 2, 3, 4, 5, 6],
} = {}) {
  const ref = typeof referenceDate === 'string'
    ? new Date(referenceDate + 'T00:00:00')
    : new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);

  const tomorrow = new Date(ref);
  tomorrow.setDate(ref.getDate() + 1);

  const blocked = new Set(unavailableDates);
  const result = [];

  for (let i = 0; i < daysAhead; i++) {
    const d = new Date(tomorrow);
    d.setDate(tomorrow.getDate() + i);
    const str = localDateString(d);
    if (businessDays.includes(d.getDay()) && !blocked.has(str)) {
      result.push(str);
    }
  }

  return result;
}
