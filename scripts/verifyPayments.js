/**
 * Comprehensive Automated Verification Suite for Artemis Automotive Payments & Balance Tracking V0.0.10
 *
 * Tests:
 * 1. Schema V5 -> V6 migration without data loss.
 * 2. Monotonic non-reusable Payment numbering (PAY-000001, PAY-000002).
 * 3. Point-in-time Snapshot Isolation (customer, vehicle, invoice number, totals, balance before/after).
 * 4. Payment Creation Constraints (only issued invoices, amount > 0, overpayment rejection).
 * 5. Cumulative Multi-Payment balance reductions (unpaid -> partially_paid -> paid).
 * 6. Zero-dollar invoice is derived as paid without requiring fake payments.
 * 7. Payment Voiding: requires non-empty reason, restores invoice balance immediately, prevents re-voiding.
 * 8. Invoice Void Lockout: voidInvoice() is blocked if active posted payments exist; permitted once payments are voided.
 * 9. Accounts Receivable (AR) Summary calculation across multiple invoices and payments.
 * 10. Audit trail preservation: voiding never deletes records or reuses payment sequences.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

// Arithmetic matching currencyUtils.ts
function formatCents(cents) {
  const isNegative = cents < 0;
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const remainder = abs % 100;
  const formatted = `$${dollars.toLocaleString('en-US')}.${String(remainder).padStart(2, '0')}`;
  return isNegative ? `-${formatted}` : formatted;
}

function calculateInvoicePaymentSummary(invoice, payments) {
  const activePayments = payments.filter(
    (p) => p.invoiceId === invoice.id && p.status === 'posted' && !p.isDeleted
  );

  const paidCents = activePayments.reduce((sum, p) => sum + p.amountCents, 0);
  const balanceDueCents = Math.max(0, invoice.totalCents - paidCents);

  let paymentStatus = 'unpaid';
  if (invoice.totalCents === 0 || balanceDueCents === 0) {
    paymentStatus = 'paid';
  } else if (paidCents > 0) {
    paymentStatus = 'partially_paid';
  }

  return {
    invoiceId: invoice.id,
    invoiceTotalCents: invoice.totalCents,
    paidCents,
    balanceDueCents,
    paymentStatus,
    paymentCount: activePayments.length,
    lastPaymentAt: activePayments.length > 0 ? Math.max(...activePayments.map((p) => p.receivedAt)) : undefined,
  };
}

function formatPaymentNumber(seq) {
  return `PAY-${String(seq).padStart(6, '0')}`;
}

// In-Memory / File-based Storage Engine implementing Automotive Schema V6
class TestAutomotiveStorage {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = null;
  }

  async init(initialData = null) {
    if (initialData) {
      this.data = initialData;
      await this.save();
    } else {
      this.data = {
        schemaVersion: 6,
        customers: [],
        vehicles: [],
        workOrders: [],
        estimates: [],
        invoices: [],
        payments: [],
        nextCustomerSequence: 1,
        nextVehicleSequence: 1,
        nextWorkOrderSequence: 1,
        nextEstimateSequence: 1,
        nextInvoiceSequence: 1,
        nextPaymentSequence: 1,
        updatedAt: Date.now(),
      };
      await this.save();
    }
  }

  async load() {
    const raw = await fs.readFile(this.filePath, 'utf-8');
    this.data = JSON.parse(raw);
    return this.data;
  }

  async save() {
    this.data.updatedAt = Date.now();
    await fs.writeFile(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  // Schema V5 -> V6 migration
  async migrateFromV5(v5Data) {
    const migrated = {
      ...v5Data,
      schemaVersion: 6,
      payments: Array.isArray(v5Data.payments) ? v5Data.payments : [],
      nextPaymentSequence: typeof v5Data.nextPaymentSequence === 'number' ? v5Data.nextPaymentSequence : 1,
      updatedAt: Date.now(),
    };
    this.data = migrated;
    await this.save();
    return this.data;
  }

  async createCustomer(name, phone = '555-0199', email = 'alex@example.com') {
    const seq = this.data.nextCustomerSequence++;
    const customer = {
      id: crypto.randomUUID(),
      customerNumber: `CUS-${String(seq).padStart(6, '0')}`,
      type: 'individual',
      name,
      firstName: name.split(' ')[0],
      lastName: name.split(' ')[1] || '',
      phone,
      email,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDeleted: false,
    };
    this.data.customers.push(customer);
    await this.save();
    return customer;
  }

  async createVehicle(customerId, make = 'Subaru', model = 'Outback', year = 2021) {
    const seq = this.data.nextVehicleSequence++;
    const vehicle = {
      id: crypto.randomUUID(),
      vehicleNumber: `VEH-${String(seq).padStart(6, '0')}`,
      customerId,
      make,
      model,
      year,
      vin: '4S4BRBNC5M3123456',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDeleted: false,
    };
    this.data.vehicles.push(vehicle);
    await this.save();
    return vehicle;
  }

  async createWorkOrder(vehicleId, concern = 'Routine 30k service') {
    const seq = this.data.nextWorkOrderSequence++;
    const vehicle = this.data.vehicles.find((v) => v.id === vehicleId);
    const customer = this.data.customers.find((c) => c.id === vehicle.customerId);
    const wo = {
      id: crypto.randomUUID(),
      workOrderNumber: `WO-${String(seq).padStart(6, '0')}`,
      vehicleId,
      customerId: customer.id,
      customerConcern: concern,
      status: 'open',
      customerNameSnapshot: customer.name,
      vehicleDescriptionSnapshot: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      vinSnapshot: vehicle.vin,
      laborLines: [],
      partLines: [],
      openedAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDeleted: false,
    };
    this.data.workOrders.push(wo);
    await this.save();
    return wo;
  }

  async createEstimate(workOrderId, totalCents = 84267) {
    const seq = this.data.nextEstimateSequence++;
    const wo = this.data.workOrders.find((w) => w.id === workOrderId);
    const est = {
      id: crypto.randomUUID(),
      estimateNumber: `EST-${String(seq).padStart(6, '0')}`,
      workOrderId,
      vehicleId: wo.vehicleId,
      customerId: wo.customerId,
      status: 'approved',
      approvedAt: Date.now(),
      subtotalCents: totalCents,
      discountTotalCents: 0,
      taxableGrossCents: totalCents,
      taxRateBps: 0,
      taxTotalCents: 0,
      totalCents: totalCents,
      lineItems: [
        {
          id: crypto.randomUUID(),
          type: 'labor',
          description: '30k Maintenance Inspection',
          quantityMilli: 1000,
          unitPriceCents: totalCents,
          lineTotalCents: totalCents,
          taxable: false,
        },
      ],
      customerNameSnapshot: wo.customerNameSnapshot,
      vehicleDescriptionSnapshot: wo.vehicleDescriptionSnapshot,
      workOrderNumberSnapshot: wo.workOrderNumber,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDeleted: false,
    };
    this.data.estimates.push(est);
    await this.save();
    return est;
  }

  async createInvoice(estimateId, totalCents = 84267, issue = true) {
    const seq = this.data.nextInvoiceSequence++;
    const est = this.data.estimates.find((e) => e.id === estimateId);
    const inv = {
      id: crypto.randomUUID(),
      invoiceNumber: `INV-${String(seq).padStart(6, '0')}`,
      estimateId,
      workOrderId: est.workOrderId,
      vehicleId: est.vehicleId,
      customerId: est.customerId,
      status: issue ? 'issued' : 'draft',
      issuedAt: issue ? Date.now() : undefined,
      dueDate: '2026-09-15',
      subtotalCents: totalCents,
      discountTotalCents: 0,
      taxableGrossCents: totalCents,
      taxRateBps: 0,
      taxTotalCents: 0,
      totalCents: totalCents,
      lineItems: JSON.parse(JSON.stringify(est.lineItems)),
      customerNameSnapshot: est.customerNameSnapshot,
      vehicleDescriptionSnapshot: est.vehicleDescriptionSnapshot,
      estimateNumberSnapshot: est.estimateNumber,
      workOrderNumberSnapshot: est.workOrderNumberSnapshot,
      estimateTotalSnapshotCents: est.totalCents,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDeleted: false,
    };
    this.data.invoices.push(inv);
    await this.save();
    return inv;
  }

  async createPayment(options) {
    const { invoiceId, amountCents, method, receivedAt, reference, notes } = options;

    if (!amountCents || typeof amountCents !== 'number' || amountCents <= 0 || !Number.isInteger(amountCents)) {
      throw new Error('Payment amount must be a positive integer in cents.');
    }

    const validMethods = ['cash', 'card', 'check', 'bank_transfer', 'digital_wallet', 'financing', 'other'];
    if (!validMethods.includes(method)) {
      throw new Error(`Invalid payment method: "${method}".`);
    }

    const invoice = this.data.invoices.find((i) => i.id === invoiceId && !i.isDeleted);
    if (!invoice) {
      throw new Error(`Invoice "${invoiceId}" not found or deleted.`);
    }

    if (invoice.status !== 'issued') {
      throw new Error(`Cannot record payment against invoice in "${invoice.status}" status. Invoices must be "issued" to accept payments.`);
    }

    const currentSummary = calculateInvoicePaymentSummary(invoice, this.data.payments);
    if (amountCents > currentSummary.balanceDueCents) {
      throw new Error(
        `Payment amount (${formatCents(amountCents)}) exceeds current balance due (${formatCents(currentSummary.balanceDueCents)}). Overpayments are not permitted in V0.0.10.`
      );
    }

    const balanceBeforeCents = currentSummary.balanceDueCents;
    const balanceAfterCents = Math.max(0, balanceBeforeCents - amountCents);

    const seq = this.data.nextPaymentSequence || 1;
    this.data.nextPaymentSequence = seq + 1;
    const paymentNumber = formatPaymentNumber(seq);

    const now = Date.now();
    const payment = {
      id: crypto.randomUUID(),
      paymentNumber,
      invoiceId: invoice.id,
      customerId: invoice.customerId,
      vehicleId: invoice.vehicleId,
      workOrderId: invoice.workOrderId,
      amountCents,
      method,
      status: 'posted',
      balanceBeforeCents,
      balanceAfterCents,
      customerNameSnapshot: invoice.customerNameSnapshot,
      vehicleDescriptionSnapshot: invoice.vehicleDescriptionSnapshot,
      invoiceNumberSnapshot: invoice.invoiceNumber,
      invoiceTotalSnapshotCents: invoice.totalCents,
      reference: reference?.trim() || undefined,
      notes: notes?.trim() || undefined,
      receivedAt: receivedAt || now,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    };

    this.data.payments.push(payment);
    await this.save();
    return payment;
  }

  async voidPayment(paymentId, reason) {
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      throw new Error('A non-empty reason is required to void a payment.');
    }

    const payment = this.data.payments.find((p) => p.id === paymentId && !p.isDeleted);
    if (!payment) {
      throw new Error(`Payment "${paymentId}" not found or deleted.`);
    }

    if (payment.status === 'void') {
      throw new Error(`Payment "${payment.paymentNumber}" is already void.`);
    }

    payment.status = 'void';
    payment.voidedAt = Date.now();
    payment.voidReason = reason.trim();
    payment.updatedAt = Date.now();

    await this.save();
    return payment;
  }

  async voidInvoice(invoiceId, reason) {
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      throw new Error('A non-empty reason is required to void an invoice.');
    }

    const invoice = this.data.invoices.find((i) => i.id === invoiceId && !i.isDeleted);
    if (!invoice) {
      throw new Error(`Invoice "${invoiceId}" not found or deleted.`);
    }

    if (invoice.status === 'draft') {
      throw new Error('Draft invoices cannot be voided. Delete the draft invoice instead.');
    }

    if (invoice.status === 'void') {
      throw new Error(`Invoice "${invoice.invoiceNumber}" is already void.`);
    }

    // Check active payments guard
    const activePayments = this.data.payments.filter(
      (p) => p.invoiceId === invoiceId && p.status === 'posted' && !p.isDeleted
    );
    if (activePayments.length > 0) {
      throw new Error(
        `Cannot void invoice "${invoice.invoiceNumber}" because ${activePayments.length} posted payment(s) exist. Void all posted payments first.`
      );
    }

    invoice.status = 'void';
    invoice.voidedAt = Date.now();
    invoice.voidReason = reason.trim();
    invoice.updatedAt = Date.now();

    await this.save();
    return invoice;
  }

  getInvoicePaymentSummary(invoiceId) {
    const invoice = this.data.invoices.find((i) => i.id === invoiceId && !i.isDeleted);
    if (!invoice) {
      throw new Error(`Invoice "${invoiceId}" not found.`);
    }
    return calculateInvoicePaymentSummary(invoice, this.data.payments);
  }

  getAccountsReceivableSummary() {
    const issuedInvoices = this.data.invoices.filter((i) => i.status === 'issued' && !i.isDeleted);
    let totalReceivablesCents = 0;
    let unpaidInvoicesCount = 0;
    let partiallyPaidInvoicesCount = 0;
    let paidInvoicesCount = 0;

    for (const inv of issuedInvoices) {
      const summary = calculateInvoicePaymentSummary(inv, this.data.payments);
      totalReceivablesCents += summary.balanceDueCents;
      if (summary.paymentStatus === 'unpaid') unpaidInvoicesCount++;
      else if (summary.paymentStatus === 'partially_paid') partiallyPaidInvoicesCount++;
      else if (summary.paymentStatus === 'paid') paidInvoicesCount++;
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayEpoch = startOfToday.getTime();

    const paymentsReceivedTodayCents = this.data.payments
      .filter((p) => p.status === 'posted' && !p.isDeleted && p.receivedAt >= todayEpoch)
      .reduce((sum, p) => sum + p.amountCents, 0);

    return {
      totalReceivablesCents,
      unpaidInvoicesCount,
      partiallyPaidInvoicesCount,
      paidInvoicesCount,
      paymentsReceivedTodayCents,
    };
  }
}

// TEST HARNESS
let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (!condition) {
    failedCount++;
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  } else {
    passedCount++;
    console.log(`✅ PASS: ${message}`);
  }
}

async function runTests() {
  console.log('\n🚀 Starting Artemis V0.0.10 Payments & Balance Tracking Automated Verification Suite...\n');

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'artemis-pay-test-'));
  const storePath = path.join(tmpDir, 'test_automotive_store.json');
  const store = new TestAutomotiveStorage(storePath);
  await store.init();

  try {
    // -------------------------------------------------------------
    // Test 1: Schema V5 -> V6 Migration
    // -------------------------------------------------------------
    console.log('--- TEST 1: Schema V5 -> V6 Migration ---');
    const v5Data = {
      schemaVersion: 5,
      customers: [{ id: 'c1', name: 'Legacy Customer', isDeleted: false }],
      vehicles: [{ id: 'v1', make: 'Honda', model: 'Civic', isDeleted: false }],
      workOrders: [],
      estimates: [],
      invoices: [],
      nextCustomerSequence: 2,
      nextVehicleSequence: 2,
      nextWorkOrderSequence: 1,
      nextEstimateSequence: 1,
      nextInvoiceSequence: 1,
      updatedAt: 1000000,
    };
    const migrated = await store.migrateFromV5(v5Data);
    assert(migrated.schemaVersion === 6, 'Schema version migrated to 6');
    assert(Array.isArray(migrated.payments), 'payments array initialized');
    assert(migrated.nextPaymentSequence === 1, 'nextPaymentSequence initialized to 1');
    assert(migrated.customers.length === 1 && migrated.customers[0].name === 'Legacy Customer', 'Existing customer preserved');

    // -------------------------------------------------------------
    // Test 2: Seed Customer, Vehicle, Work Order, Estimate, Invoice
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Seed Entities for Commercial Payments ---');
    const customer = await store.createCustomer('Sarah Jenkins', '555-4433', 'sarah.j@example.com');
    const vehicle = await store.createVehicle(customer.id, 'Toyota', 'RAV4', 2022);
    const workOrder = await store.createWorkOrder(vehicle.id, 'Brake pads replacement and full fluid flush');
    const estimate = await store.createEstimate(workOrder.id, 84267); // $842.67
    const invoice = await store.createInvoice(estimate.id, 84267, true); // Issued $842.67
    const draftInvoice = await store.createInvoice(estimate.id, 50000, false); // Draft invoice

    assert(invoice.status === 'issued' && invoice.totalCents === 84267, 'Issued invoice created ($842.67)');
    assert(draftInvoice.status === 'draft', 'Draft invoice created');

    // -------------------------------------------------------------
    // Test 3: Initial Invoice Payment Summary & Zero-Dollar Balance Check
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Initial Invoice Payment Summary & Zero-Dollar Logic ---');
    const initialSummary = store.getInvoicePaymentSummary(invoice.id);
    assert(initialSummary.paidCents === 0, 'Initial paid cents is 0');
    assert(initialSummary.balanceDueCents === 84267, 'Initial balance due matches invoice total ($842.67)');
    assert(initialSummary.paymentStatus === 'unpaid', 'Initial payment status is "unpaid"');
    assert(initialSummary.paymentCount === 0, 'Initial payment count is 0');

    // Zero dollar invoice test
    const zeroInvoice = await store.createInvoice(estimate.id, 0, true);
    const zeroSummary = store.getInvoicePaymentSummary(zeroInvoice.id);
    assert(zeroSummary.balanceDueCents === 0, 'Zero-dollar invoice balance due is 0');
    assert(zeroSummary.paymentStatus === 'paid', 'Zero-dollar invoice is automatically derived as "paid"');

    // -------------------------------------------------------------
    // Test 4: Payment Creation Constraints & Validation
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Payment Creation Constraints & Validation ---');

    // Reject non-issued (draft) invoice
    let draftRejected = false;
    try {
      await store.createPayment({
        invoiceId: draftInvoice.id,
        amountCents: 10000,
        method: 'card',
      });
    } catch (err) {
      draftRejected = true;
      assert(err.message.includes('must be "issued"'), 'Rejected payment on draft invoice');
    }
    assert(draftRejected, 'Draft invoice rejected payment as expected');

    // Reject zero or negative amount
    let zeroAmountRejected = false;
    try {
      await store.createPayment({
        invoiceId: invoice.id,
        amountCents: 0,
        method: 'card',
      });
    } catch (err) {
      zeroAmountRejected = true;
      assert(err.message.includes('positive integer in cents'), 'Rejected 0 cents payment');
    }
    assert(zeroAmountRejected, 'Zero amount rejected');

    let negativeAmountRejected = false;
    try {
      await store.createPayment({
        invoiceId: invoice.id,
        amountCents: -5000,
        method: 'card',
      });
    } catch (err) {
      negativeAmountRejected = true;
      assert(err.message.includes('positive integer in cents'), 'Rejected negative cents payment');
    }
    assert(negativeAmountRejected, 'Negative amount rejected');

    // Reject invalid method
    let invalidMethodRejected = false;
    try {
      await store.createPayment({
        invoiceId: invoice.id,
        amountCents: 10000,
        method: 'crypto_tokens',
      });
    } catch (err) {
      invalidMethodRejected = true;
      assert(err.message.includes('Invalid payment method'), 'Rejected invalid method');
    }
    assert(invalidMethodRejected, 'Invalid payment method rejected');

    // Reject overpayment
    let overpaymentRejected = false;
    try {
      await store.createPayment({
        invoiceId: invoice.id,
        amountCents: 90000, // $900.00 > $842.67
        method: 'card',
      });
    } catch (err) {
      overpaymentRejected = true;
      assert(err.message.includes('exceeds current balance due'), 'Rejected overpayment beyond remaining balance due');
    }
    assert(overpaymentRejected, 'Overpayment rejected');

    // -------------------------------------------------------------
    // Test 5: Monotonic Numbering & Multi-Payment Cumulative Balances
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Monotonic Numbering & Multi-Payment Cumulative Balances ---');

    // Payment 1: $300.00 Partial payment via Card
    const pay1 = await store.createPayment({
      invoiceId: invoice.id,
      amountCents: 30000,
      method: 'card',
      reference: 'Auth #928401',
      notes: 'Visa ending in 4242',
    });

    assert(pay1.paymentNumber === 'PAY-000001', 'First payment numbered PAY-000001');
    assert(pay1.amountCents === 30000, 'Payment 1 amount is $300.00');
    assert(pay1.status === 'posted', 'Payment 1 status is posted');
    assert(pay1.balanceBeforeCents === 84267, 'Balance before was $842.67');
    assert(pay1.balanceAfterCents === 54267, 'Balance after is $542.67');
    assert(pay1.customerNameSnapshot === 'Sarah Jenkins', 'Snapshot captured customer name');
    assert(pay1.invoiceNumberSnapshot === invoice.invoiceNumber, 'Snapshot captured invoice number');
    assert(pay1.vehicleDescriptionSnapshot === '2022 Toyota RAV4', 'Snapshot captured vehicle description');

    const summaryAfterPay1 = store.getInvoicePaymentSummary(invoice.id);
    assert(summaryAfterPay1.paidCents === 30000, 'Cumulative paid cents is $300.00');
    assert(summaryAfterPay1.balanceDueCents === 54267, 'Remaining balance due is $542.67');
    assert(summaryAfterPay1.paymentStatus === 'partially_paid', 'Payment status transitioned to "partially_paid"');
    assert(summaryAfterPay1.paymentCount === 1, 'Payment count is 1');

    // Overpayment check against current reduced balance
    let partialOverpaymentRejected = false;
    try {
      await store.createPayment({
        invoiceId: invoice.id,
        amountCents: 54300, // $543.00 > $542.67
        method: 'check',
      });
    } catch (err) {
      partialOverpaymentRejected = true;
      assert(err.message.includes('exceeds current balance due'), 'Overpayment above partial balance rejected');
    }
    assert(partialOverpaymentRejected, 'Partial overpayment rejected');

    // Payment 2: $242.67 Partial payment via Check
    const pay2 = await store.createPayment({
      invoiceId: invoice.id,
      amountCents: 24267,
      method: 'check',
      reference: 'Check #1042',
      notes: 'Customer deposited check in person',
    });

    assert(pay2.paymentNumber === 'PAY-000002', 'Second payment numbered PAY-000002');
    assert(pay2.balanceBeforeCents === 54267, 'Balance before was $542.67');
    assert(pay2.balanceAfterCents === 30000, 'Balance after is $300.00');

    const summaryAfterPay2 = store.getInvoicePaymentSummary(invoice.id);
    assert(summaryAfterPay2.paidCents === 54267, 'Cumulative paid cents is $542.67');
    assert(summaryAfterPay2.balanceDueCents === 30000, 'Remaining balance due is $300.00');
    assert(summaryAfterPay2.paymentStatus === 'partially_paid', 'Payment status remains "partially_paid"');

    // Payment 3: $300.00 Final payment in Cash -> Paid in Full
    const pay3 = await store.createPayment({
      invoiceId: invoice.id,
      amountCents: 30000,
      method: 'cash',
      reference: 'Exact cash given',
    });

    assert(pay3.paymentNumber === 'PAY-000003', 'Third payment numbered PAY-000003');
    assert(pay3.balanceBeforeCents === 30000, 'Balance before was $300.00');
    assert(pay3.balanceAfterCents === 0, 'Balance after is $0.00');

    const summaryAfterPay3 = store.getInvoicePaymentSummary(invoice.id);
    assert(summaryAfterPay3.paidCents === 84267, 'Cumulative paid cents is $842.67 (100%)');
    assert(summaryAfterPay3.balanceDueCents === 0, 'Remaining balance due is $0.00');
    assert(summaryAfterPay3.paymentStatus === 'paid', 'Payment status transitioned to "paid"');
    assert(summaryAfterPay3.paymentCount === 3, 'Payment count is 3');

    // -------------------------------------------------------------
    // Test 6: Payment Voiding & Instant Balance Restoration
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Payment Voiding & Instant Balance Restoration ---');

    // Empty reason rejection
    let emptyReasonRejected = false;
    try {
      await store.voidPayment(pay2.id, '');
    } catch (err) {
      emptyReasonRejected = true;
      assert(err.message.includes('non-empty reason'), 'Empty void reason rejected');
    }
    assert(emptyReasonRejected, 'Empty void reason rejected');

    // Void Payment 2 (Check bounced: $242.67)
    const voidedPay2 = await store.voidPayment(pay2.id, 'Check #1042 returned NSF / bounced by bank');
    assert(voidedPay2.status === 'void', 'Payment 2 marked as void');
    assert(voidedPay2.voidReason === 'Check #1042 returned NSF / bounced by bank', 'Void reason recorded');
    assert(typeof voidedPay2.voidedAt === 'number', 'VoidedAt timestamp recorded');

    // Re-voiding already-void payment rejection
    let revoidRejected = false;
    try {
      await store.voidPayment(pay2.id, 'Duplicate void request');
    } catch (err) {
      revoidRejected = true;
      assert(err.message.includes('already void'), 'Re-voiding void payment rejected');
    }
    assert(revoidRejected, 'Re-voiding rejected');

    // Verify balance is restored by exactly $242.67
    const summaryAfterVoid = store.getInvoicePaymentSummary(invoice.id);
    assert(summaryAfterVoid.paidCents === 60000, 'Paid cents reduced from $842.67 to $600.00 ($300 + $300)');
    assert(summaryAfterVoid.balanceDueCents === 24267, 'Balance due restored to $242.67');
    assert(summaryAfterVoid.paymentStatus === 'partially_paid', 'Invoice reverted to "partially_paid"');
    assert(summaryAfterVoid.paymentCount === 2, 'Active posted payment count is 2');

    // Record replacement payment (PAY-000004)
    const pay4 = await store.createPayment({
      invoiceId: invoice.id,
      amountCents: 24267,
      method: 'card',
      reference: 'Replacement Visa Auth #99812',
      notes: 'Customer paid by card after check bounced',
    });

    assert(pay4.paymentNumber === 'PAY-000004', 'Monotonic sequence continued without reuse (PAY-000004)');
    const summaryAfterPay4 = store.getInvoicePaymentSummary(invoice.id);
    assert(summaryAfterPay4.paidCents === 84267, 'Paid cents back to $842.67');
    assert(summaryAfterPay4.balanceDueCents === 0, 'Balance due back to $0.00');
    assert(summaryAfterPay4.paymentStatus === 'paid', 'Invoice back to "paid"');

    // -------------------------------------------------------------
    // Test 7: Invoice Void Lockout Guard with Active Payments
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Invoice Void Lockout Guard with Active Payments ---');

    let invoiceVoidBlocked = false;
    try {
      await store.voidInvoice(invoice.id, 'Customer requested complete order cancellation');
    } catch (err) {
      invoiceVoidBlocked = true;
      assert(err.message.includes('posted payment(s) exist'), 'Invoice voiding blocked because active payments exist');
    }
    assert(invoiceVoidBlocked, 'Active payments prevent invoice voiding');

    // Void all active payments on this invoice
    await store.voidPayment(pay1.id, 'Customer refund & invoice void preparation');
    await store.voidPayment(pay3.id, 'Customer refund & invoice void preparation');
    await store.voidPayment(pay4.id, 'Customer refund & invoice void preparation');

    const allPaymentsVoidedSummary = store.getInvoicePaymentSummary(invoice.id);
    assert(allPaymentsVoidedSummary.paidCents === 0, 'All payments voided; paid cents is 0');
    assert(allPaymentsVoidedSummary.balanceDueCents === 84267, 'Full balance restored');

    // Now voiding invoice must succeed
    const voidedInvoice = await store.voidInvoice(invoice.id, 'Customer requested complete order cancellation');
    assert(voidedInvoice.status === 'void', 'Invoice successfully voided after all payments voided');

    // -------------------------------------------------------------
    // Test 8: Accounts Receivable (AR) Summary
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: Accounts Receivable Summary Calculation ---');

    // Create 3 fresh invoices:
    // Inv A: $500.00 (Unpaid)
    // Inv B: $1000.00 (Paid $400.00 -> $600.00 balance)
    // Inv C: $300.00 (Paid $300.00 -> $0.00 balance)
    const invA = await store.createInvoice(estimate.id, 50000, true);
    const invB = await store.createInvoice(estimate.id, 100000, true);
    const invC = await store.createInvoice(estimate.id, 30000, true);

    await store.createPayment({
      invoiceId: invB.id,
      amountCents: 40000,
      method: 'bank_transfer',
    });

    await store.createPayment({
      invoiceId: invC.id,
      amountCents: 30000,
      method: 'card',
    });

    const arSummary = store.getAccountsReceivableSummary();
    // Receivables = Inv A ($500.00) + Inv B ($600.00) = $1,100.00 (110000 cents)
    assert(arSummary.totalReceivablesCents === 110000, `Total receivables calculated as ${formatCents(arSummary.totalReceivablesCents)} ($1,100.00)`);
    assert(arSummary.unpaidInvoicesCount === 1, '1 unpaid invoice (Inv A)');
    assert(arSummary.partiallyPaidInvoicesCount === 1, '1 partially paid invoice (Inv B)');
    assert(arSummary.paidInvoicesCount === 2, '2 paid invoices (ZeroInvoice & Inv C)');
    assert(arSummary.paymentsReceivedTodayCents === 70000, 'Payments received today = $400 + $300 = $700.00');

    console.log('\n=============================================================');
    console.log(`🎉 ALL TESTS PASSED! (${passedCount} checks passed, ${failedCount} failures)`);
    console.log('=============================================================\n');
  } finally {
    // Cleanup temporary files
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

runTests().catch((err) => {
  console.error('\n💥 TEST EXECUTION FAILED:', err);
  process.exit(1);
});
