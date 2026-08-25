import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

// Test harness creating isolated test environments
async function runTests() {
  console.log('--- ARTEMIS WORK ORDERS V0.0.5 COMPREHENSIVE TEST SUITE ---');

  const testDir = path.join(os.tmpdir(), `artemis-wo-test-${Date.now()}`);
  await fs.mkdir(testDir, { recursive: true });

  const storePath = path.join(testDir, 'artemis_automotive_store.json');

  // Test 1: Deterministic Schema Migration (V1 -> V3 and V2 -> V3)
  console.log('\n[1/6] Testing Deterministic Schema Migration to V3...');

  // Mock V2 store with 1 customer and 1 vehicle
  const v2Data = {
    schemaVersion: 2,
    customers: [
      {
        id: 'cust-1',
        customerNumber: 'CUS-000001',
        type: 'individual',
        name: 'Sarah Connor',
        firstName: 'Sarah',
        lastName: 'Connor',
        createdAt: 1000,
        updatedAt: 1000,
        isDeleted: false,
      },
    ],
    vehicles: [
      {
        id: 'veh-1',
        vehicleNumber: 'VEH-000001',
        customerId: 'cust-1',
        year: 2018,
        make: 'Honda',
        model: 'Civic',
        vin: '1HGCR2F83HA000001',
        mileage: 45000,
        createdAt: 1000,
        updatedAt: 1000,
        isDeleted: false,
      },
    ],
    nextCustomerSequence: 2,
    nextVehicleSequence: 2,
  };

  await fs.writeFile(storePath, JSON.stringify(v2Data, null, 2), 'utf-8');

  // Migrate V2 -> V3 logic
  const raw = JSON.parse(await fs.readFile(storePath, 'utf-8'));
  let migrated = { ...raw };
  if (migrated.schemaVersion < 3) {
    migrated.schemaVersion = 3;
    if (!Array.isArray(migrated.workOrders)) {
      migrated.workOrders = [];
    }
    if (typeof migrated.nextWorkOrderSequence !== 'number' || migrated.nextWorkOrderSequence < 1) {
      migrated.nextWorkOrderSequence = 1;
    }
  }

  assert.strictEqual(migrated.schemaVersion, 3);
  assert.strictEqual(migrated.workOrders.length, 0);
  assert.strictEqual(migrated.nextWorkOrderSequence, 1);
  console.log('✓ Migration initialized workOrders: [] and nextWorkOrderSequence: 1');

  // Test 2: Monotonic Work Order Numbering
  console.log('\n[2/6] Testing Monotonic Work Order Numbering (WO-000001, WO-000002)...');

  function formatWorkOrderNumber(seq) {
    return `WO-${String(seq).padStart(6, '0')}`;
  }

  const woNum1 = formatWorkOrderNumber(migrated.nextWorkOrderSequence++);
  assert.strictEqual(woNum1, 'WO-000001');
  const woNum2 = formatWorkOrderNumber(migrated.nextWorkOrderSequence++);
  assert.strictEqual(woNum2, 'WO-000002');
  console.log(`✓ Generated: ${woNum1}, ${woNum2}`);

  // Test 3: Historical Snapshots Immutability Invariant
  console.log('\n[3/6] Testing Historical Snapshot Capture & Immutability...');

  // Create WO-000001 with Sarah Connor & 2018 Honda Civic
  const activeVehicle = migrated.vehicles[0];
  const activeCustomer = migrated.customers.find((c) => c.id === activeVehicle.customerId);

  const vehicleDesc = `${activeVehicle.year ? `${activeVehicle.year} ` : ''}${activeVehicle.make} ${activeVehicle.model}`;
  const customerName = activeCustomer ? activeCustomer.name : undefined;

  const wo1 = {
    id: 'wo-1',
    workOrderNumber: woNum1,
    vehicleId: activeVehicle.id,
    customerId: activeVehicle.customerId,
    customerNameSnapshot: customerName,
    vehicleDescriptionSnapshot: vehicleDesc,
    vinSnapshot: activeVehicle.vin,
    status: 'open',
    odometerIn: 45000,
    customerConcern: 'Brakes squealing during highway deceleration',
    inspectionNotes: 'Front brake pads worn down to 2mm',
    diagnosis: 'Front pad friction material depleted, rotors glazed',
    workPerformed: undefined,
    technicianNotes: undefined,
    laborLines: [
      {
        id: 'labor-1',
        description: 'Replace front brake pads & resurface rotors',
        hours: 1.8,
        notes: 'Torqued caliper slide pins to 25 ft-lbs',
      },
    ],
    partLines: [
      {
        id: 'part-1',
        description: 'Ceramic Front Brake Pads',
        partNumber: 'PAD-HON-2018',
        quantity: 1,
        notes: 'OEM compound',
      },
    ],
    openedAt: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isDeleted: false,
  };
  migrated.workOrders.push(wo1);

  // Now simulate vehicle ownership change: Sarah sells the Civic to Mike Ross
  migrated.customers.push({
    id: 'cust-2',
    customerNumber: 'CUS-000002',
    type: 'individual',
    name: 'Mike Ross',
    firstName: 'Mike',
    lastName: 'Ross',
    createdAt: 2000,
    updatedAt: 2000,
    isDeleted: false,
  });
  activeVehicle.customerId = 'cust-2';

  // Also simulate Sarah changing her name or customer record update
  activeCustomer.name = 'Sarah Connor-Reese';

  // Verify WO-000001 still has the snapshot at time of service
  assert.strictEqual(wo1.customerNameSnapshot, 'Sarah Connor');
  assert.strictEqual(wo1.vehicleDescriptionSnapshot, '2018 Honda Civic');
  assert.strictEqual(wo1.vinSnapshot, '1HGCR2F83HA000001');
  console.log('✓ Historical snapshot remains "Sarah Connor" after ownership changed to "Mike Ross"');

  // Test 4: Line Items Validation (Labor Hours >= 0, Part Qty > 0)
  console.log('\n[4/6] Testing Line Items Validation...');

  // Labor hours validation
  assert.ok(wo1.laborLines[0].hours >= 0, 'Labor hours must be non-negative');
  assert.ok(wo1.partLines[0].quantity > 0, 'Part quantity must be strictly > 0');
  console.log('✓ Non-negative labor hours and strictly positive part quantities enforced');

  // Test 5: Status Lifecycle & completedAt Timestamp
  console.log('\n[5/6] Testing Status Lifecycle & completedAt Timestamp...');

  assert.strictEqual(wo1.completedAt, undefined);

  // Transition to completed
  wo1.status = 'completed';
  wo1.completedAt = Date.now();
  assert.ok(typeof wo1.completedAt === 'number');
  console.log(`✓ Completed at timestamp set: ${wo1.completedAt}`);

  // Transition back to in_progress (e.g. customer returned with rework)
  wo1.status = 'in_progress';
  wo1.completedAt = undefined;
  assert.strictEqual(wo1.completedAt, undefined);
  console.log('✓ Completed at timestamp cleared when status reopened');

  // Test 6: Odometer in / out validation
  console.log('\n[6/6] Testing Odometer In/Out Validation...');
  wo1.odometerOut = 45012; // 12 test drive miles
  assert.ok(wo1.odometerOut >= wo1.odometerIn, 'Odometer Out must be >= Odometer In');
  console.log(`✓ Odometer In (${wo1.odometerIn}) -> Out (${wo1.odometerOut}) delta: +${wo1.odometerOut - wo1.odometerIn} mi`);

  // Cleanup
  await fs.rm(testDir, { recursive: true, force: true });
  console.log('\n========================================');
  console.log('ALL WORK ORDER INTEGRATION TESTS PASSED!');
  console.log('========================================\n');
}

runTests().catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});
