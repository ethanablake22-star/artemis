import type {
  EstimateDiscountType,
} from './estimateTypes';

/**
 * Deterministically parses a currency string (e.g. "125.50", "$1,234.56", "0") into integer cents.
 * Disallows more than 2 decimal places. Throws on invalid input.
 */
export function parseCurrencyStringToCents(input: string): number {
  if (typeof input !== 'string') {
    throw new Error('Currency input must be a string');
  }

  const sanitized = input.replace(/[$,\s]/g, '').trim();
  if (!sanitized) return 0;

  const match = sanitized.match(/^-?(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) {
    throw new Error(`Invalid currency amount "${input}". Maximum 2 decimal places supported.`);
  }

  const isNegative = sanitized.startsWith('-');
  const wholePart = parseInt(match[1], 10);
  const fractionalPart = parseInt((match[2] || '').padEnd(2, '0'), 10);

  const totalCents = wholePart * 100 + fractionalPart;
  return isNegative ? -totalCents : totalCents;
}

/**
 * Formats integer cents into a standard currency string (e.g. 12550 -> "$125.50").
 */
export function formatCents(cents: number): string {
  const isNegative = cents < 0;
  const absCents = Math.abs(Math.round(cents));
  const dollars = Math.floor(absCents / 100);
  const remainingCents = absCents % 100;

  const formattedDollars = dollars.toLocaleString('en-US');
  const formattedCents = String(remainingCents).padStart(2, '0');

  return `${isNegative ? '-' : ''}$${formattedDollars}.${formattedCents}`;
}

/**
 * Parses a decimal quantity string or number into scaled integer milli-units (e.g. "2.5" -> 2500, "1" -> 1000).
 * Supports up to 3 decimal places.
 */
export function parseQuantityToMilli(input: string | number): number {
  if (typeof input === 'number') {
    if (isNaN(input) || input < 0) throw new Error('Quantity must be non-negative');
    return Math.round(input * 1000);
  }

  if (typeof input !== 'string') {
    throw new Error('Quantity input must be a string or number');
  }

  const sanitized = input.trim();
  if (!sanitized) return 0;

  const match = sanitized.match(/^(\d+)(?:\.(\d{1,3}))?$/);
  if (!match) {
    throw new Error(`Invalid quantity "${input}". Maximum 3 decimal places supported.`);
  }

  const wholePart = parseInt(match[1], 10);
  const fracPart = parseInt((match[2] || '').padEnd(3, '0'), 10);

  return wholePart * 1000 + fracPart;
}

/**
 * Formats scaled integer milli-units into a clean human decimal (e.g. 2500 -> "2.5", 1000 -> "1", 2250 -> "2.25").
 */
export function formatMilliQuantity(milli: number): string {
  const whole = Math.floor(milli / 1000);
  const remainder = milli % 1000;

  if (remainder === 0) return String(whole);

  const fracStr = String(remainder).padStart(3, '0').replace(/0+$/, '');
  return `${whole}.${fracStr}`;
}

/**
 * Parses percentage string or number into basis points (e.g. "7" -> 700, "7.25" -> 725, "100" -> 10000).
 * Maximum 2 decimal places of percentage (10000 bps = 100%).
 */
export function parsePercentToBps(input: string | number): number {
  if (typeof input === 'number') {
    if (isNaN(input) || input < 0) throw new Error('Percentage must be non-negative');
    return Math.round(input * 100);
  }

  const sanitized = input.replace(/[%\s]/g, '').trim();
  if (!sanitized) return 0;

  const match = sanitized.match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) {
    throw new Error(`Invalid percentage "${input}". Maximum 2 decimal places supported.`);
  }

  const whole = parseInt(match[1], 10);
  const frac = parseInt((match[2] || '').padEnd(2, '0'), 10);

  return whole * 100 + frac;
}

/**
 * Formats basis points into clean percentage string (e.g. 700 -> "7%", 725 -> "7.25%", 0 -> "0%").
 */
export function formatBpsToPercent(bps: number): string {
  const whole = Math.floor(bps / 100);
  const frac = bps % 100;

  if (frac === 0) return `${whole}%`;
  const fracStr = String(frac).padStart(2, '0').replace(/0+$/, '');
  return `${whole}.${fracStr}%`;
}

/**
 * Computes individual line total in integer cents: round(quantityMilli * unitPriceCents / 1000).
 */
export function calculateLineTotalCents(quantityMilli: number, unitPriceCents: number): number {
  if (quantityMilli <= 0 || unitPriceCents <= 0) return 0;
  return Math.round((quantityMilli * unitPriceCents) / 1000);
}

export interface CalculatedEstimateTotals {
  subtotalCents: number;
  discountTotalCents: number;
  taxableGrossCents: number;
  taxableDiscountCents: number;
  taxableSubtotalCents: number;
  taxTotalCents: number;
  totalCents: number;
}

export type CalculatedFinancialTotals = CalculatedEstimateTotals;

/**
 * Authoritative/Preview financial arithmetic calculation engine using 100% integer cent arithmetic.
 * Shared across Estimates and Invoices.
 *
 * Rules:
 * 1. subtotalCents = sum(line totals)
 * 2. discountTotalCents = if percent: round(subtotal * discountPercentBps / 10000) capped at subtotal; if fixed: fixedDiscountCents capped at subtotal.
 * 3. taxableGrossCents = sum(line totals where taxable is true).
 * 4. taxableDiscountCents = subtotalCents > 0 ? round(discountTotalCents * taxableGrossCents / subtotalCents) : 0.
 * 5. taxableSubtotalCents = max(0, taxableGrossCents - taxableDiscountCents).
 * 6. taxTotalCents = round(taxableSubtotalCents * taxRateBps / 10000).
 * 7. totalCents = subtotalCents - discountTotalCents + taxTotalCents.
 */
export function calculateEstimateTotals(
  lineItems: Array<{ quantityMilli: number; unitPriceCents: number; taxable: boolean }>,
  taxRateBps: number = 0,
  discountType?: EstimateDiscountType,
  fixedDiscountCents?: number,
  discountPercentBps?: number
): CalculatedEstimateTotals {
  let subtotalCents = 0;
  let taxableGrossCents = 0;

  for (const item of lineItems) {
    const lineTotal = calculateLineTotalCents(item.quantityMilli, item.unitPriceCents);
    subtotalCents += lineTotal;
    if (item.taxable) {
      taxableGrossCents += lineTotal;
    }
  }

  let discountTotalCents = 0;
  if (discountType === 'percent' && discountPercentBps && discountPercentBps > 0) {
    const clampedBps = Math.min(10000, discountPercentBps);
    discountTotalCents = Math.round((subtotalCents * clampedBps) / 10000);
  } else if (discountType === 'fixed' && fixedDiscountCents && fixedDiscountCents > 0) {
    discountTotalCents = Math.min(subtotalCents, fixedDiscountCents);
  }

  // Deterministic proportional discount allocation to taxable subtotal
  const taxableDiscountCents =
    subtotalCents > 0
      ? Math.round((discountTotalCents * taxableGrossCents) / subtotalCents)
      : 0;

  const taxableSubtotalCents = Math.max(0, taxableGrossCents - taxableDiscountCents);

  const safeTaxRateBps = Math.max(0, taxRateBps || 0);
  const taxTotalCents = Math.round((taxableSubtotalCents * safeTaxRateBps) / 10000);

  const totalCents = subtotalCents - discountTotalCents + taxTotalCents;

  return {
    subtotalCents,
    discountTotalCents,
    taxableGrossCents,
    taxableDiscountCents,
    taxableSubtotalCents,
    taxTotalCents,
    totalCents,
  };
}

export const calculateFinancialTotals = calculateEstimateTotals;
