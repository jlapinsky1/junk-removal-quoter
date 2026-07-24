#!/usr/bin/env node
/**
 * Thin CLI adapter for getAvailableBookingDates.
 * Accepts a JSON argument via argv[2] and prints a JSON result to stdout.
 *
 * Usage:
 *   node tests/node-adapter/date-logic.js '{"referenceDate":"2025-01-01","daysAhead":21}'
 *
 * The referenceDate field is required (no fallback to new Date()) so that
 * Python tests can exercise the algorithm deterministically without relying
 * on freezegun affecting a Node subprocess.
 */

import { getAvailableBookingDates } from '../../src/utils/dateLogic.js';

let args = {};
try {
  args = JSON.parse(process.argv[2] || '{}');
} catch (e) {
  process.stderr.write('Invalid JSON argument\n');
  process.exit(1);
}

if (!args.referenceDate) {
  process.stderr.write('referenceDate is required\n');
  process.exit(1);
}

const result = getAvailableBookingDates({
  referenceDate: args.referenceDate,
  daysAhead: args.daysAhead ?? 21,
  unavailableDates: args.unavailableDates ?? [],
  businessDays: args.businessDays ?? [1, 2, 3, 4, 5, 6],
});

process.stdout.write(JSON.stringify(result) + '\n');
