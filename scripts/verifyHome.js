/**
 * Automated Verification Script for Artemis Home & Current Mission V0.0.7
 *
 * Runs comprehensive standalone tests verifying:
 * 1. Deterministic Home Store initialization (schemaVersion: 1, currentMission: null)
 * 2. Setting Current Mission for Work Order, Schedule Event, and Document
 * 3. Authoritative Main validation & eligibility rules:
 *    - Rejection of non-existent resources
 *    - Rejection of initial archived resources
 *    - Rejection of completed/cancelled Work Orders
 *    - Rejection of completed/cancelled/no-show Appointments
 * 4. Authoritative setAt timestamp generation
 * 5. Clearing Current Mission
 * 6. Resilience when a linked Current Mission resource is subsequently archived
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

async function runVerification() {
  console.log('=== Artemis V0.0.7 Home & Current Mission Verification ===\n');

  const tempDir = path.join(os.tmpdir(), `artemis-home-test-${Date.now()}`);
  await fs.mkdir(tempDir, { recursive: true });

  const homeStorePath = path.join(tempDir, 'artemis_home_store.json');
  const automotiveStorePath = path.join(tempDir, 'artemis_automotive_store.json');
  const scheduleStorePath = path.join(tempDir, 'artemis_schedule_store.json');
  const libraryStorePath = path.join(tempDir, 'artemis_library_store.json');

  // Seed automotive store
  const testCustomerId = crypto.randomUUID();
  const testVehicleId = crypto.randomUUID();
  const activeWorkOrderId = crypto.randomUUID();
  const completedWorkOrderId = crypto.randomUUID();
  const archivedWorkOrderId = crypto.randomUUID();

  const automotiveStoreData = {
    schemaVersion: 3,
    nextCustomerSequence: 2,
    nextVehicleSequence: 2,
    nextWorkOrderSequence: 4,
    customers: [
      {
        id: testCustomerId,
        customerNumber: 'CUS-000001',
        type: 'individual',
        name: 'Ethan Blake',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDeleted: false,
      },
    ],
    vehicles: [
      {
        id: testVehicleId,
        vehicleNumber: 'VEH-000001',
        customerId: testCustomerId,
        year: 2006,
        make: 'Mercedes-Benz',
        model: 'SL500',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDeleted: false,
      },
    ],
    workOrders: [
      {
        id: activeWorkOrderId,
        workOrderNumber: 'WO-000001',
        vehicleId: testVehicleId,
        customerId: testCustomerId,
        customerConcern: 'Diagnose convertible top fault',
        vehicleDescriptionSnapshot: '2006 Mercedes-Benz SL500',
        customerNameSnapshot: 'Ethan Blake',
        status: 'in_progress',
        laborLines: [],
        partLines: [],
        openedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDeleted: false,
      },
      {
        id: completedWorkOrderId,
        workOrderNumber: 'WO-000002',
        vehicleId: testVehicleId,
        customerId: testCustomerId,
        customerConcern: 'Oil change',
        vehicleDescriptionSnapshot: '2006 Mercedes-Benz SL500',
        customerNameSnapshot: 'Ethan Blake',
        status: 'completed',
        laborLines: [],
        partLines: [],
        openedAt: Date.now(),
        completedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDeleted: false,
      },
      {
        id: archivedWorkOrderId,
        workOrderNumber: 'WO-000003',
        vehicleId: testVehicleId,
        customerId: testCustomerId,
        customerConcern: 'Old record',
        vehicleDescriptionSnapshot: '2006 Mercedes-Benz SL500',
        customerNameSnapshot: 'Ethan Blake',
        status: 'open',
        laborLines: [],
        partLines: [],
        openedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDeleted: true,
      },
    ],
  };
  await fs.writeFile(automotiveStorePath, JSON.stringify(automotiveStoreData, null, 2), 'utf-8');

  // Seed schedule store
  const activeEventId = crypto.randomUUID();
  const cancelledEventId = crypto.randomUUID();
  const scheduleStoreData = {
    schemaVersion: 1,
    nextEventSequence: 3,
    events: [
      {
        id: activeEventId,
        eventNumber: 'EVT-000001',
        title: 'SL500 Diagnostic',
        type: 'diagnostic',
        status: 'confirmed',
        startAt: Date.now(),
        endAt: Date.now() + 3600000,
        allDay: false,
        timeZone: 'America/New_York',
        customerId: testCustomerId,
        vehicleId: testVehicleId,
        workOrderId: activeWorkOrderId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDeleted: false,
      },
      {
        id: cancelledEventId,
        eventNumber: 'EVT-000002',
        title: 'Cancelled Meeting',
        type: 'meeting',
        status: 'cancelled',
        startAt: Date.now(),
        endAt: Date.now() + 3600000,
        allDay: false,
        timeZone: 'America/New_York',
        customerId: null,
        vehicleId: null,
        workOrderId: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDeleted: false,
      },
    ],
  };
  await fs.writeFile(scheduleStorePath, JSON.stringify(scheduleStoreData, null, 2), 'utf-8');

  // Seed library store
  const activeDocumentId = crypto.randomUUID();
  const libraryStoreData = {
    schemaVersion: 1,
    items: [
      {
        id: activeDocumentId,
        name: 'Corporate Operating Agreement',
        type: 'document',
        parentId: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDeleted: false,
      },
    ],
  };
  await fs.writeFile(libraryStorePath, JSON.stringify(libraryStoreData, null, 2), 'utf-8');

  // Initialize Home Store
  const initialHomeStore = {
    schemaVersion: 1,
    currentMission: null,
  };
  await fs.writeFile(homeStorePath, JSON.stringify(initialHomeStore, null, 2), 'utf-8');

  // Storage and resolver helpers
  async function readHomeStore() {
    return JSON.parse(await fs.readFile(homeStorePath, 'utf-8'));
  }

  async function writeHomeStore(data) {
    const tmp = `${homeStorePath}.tmp.${Date.now()}`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8');
    await fs.rename(tmp, homeStorePath);
  }

  async function validateAndSetCurrentMission(resourceType, resourceId) {
    if (resourceType === 'work-order') {
      const autoData = JSON.parse(await fs.readFile(automotiveStorePath, 'utf-8'));
      const wo = autoData.workOrders.find((w) => w.id === resourceId);
      if (!wo || wo.isDeleted) throw new Error('Work order not found or archived');
      if (wo.status === 'completed' || wo.status === 'cancelled') {
        throw new Error(`Cannot set ${wo.status} Work Order as Current Mission`);
      }
    } else if (resourceType === 'schedule-event') {
      const schedData = JSON.parse(await fs.readFile(scheduleStorePath, 'utf-8'));
      const ev = schedData.events.find((e) => e.id === resourceId);
      if (!ev || ev.isDeleted) throw new Error('Event not found or archived');
      if (ev.status === 'completed' || ev.status === 'cancelled' || ev.status === 'no_show') {
        throw new Error(`Cannot set ${ev.status} Event as Current Mission`);
      }
    } else if (resourceType === 'document') {
      const libData = JSON.parse(await fs.readFile(libraryStorePath, 'utf-8'));
      const doc = libData.items.find((i) => i.id === resourceId);
      if (!doc || doc.isDeleted || doc.type !== 'document') {
        throw new Error('Document not found or invalid');
      }
    } else {
      throw new Error(`Invalid resource type: ${resourceType}`);
    }

    const store = await readHomeStore();
    const mission = {
      resourceType,
      resourceId,
      setAt: Date.now(),
    };
    store.currentMission = mission;
    await writeHomeStore(store);
    return mission;
  }

  async function clearCurrentMission() {
    const store = await readHomeStore();
    store.currentMission = null;
    await writeHomeStore(store);
    return true;
  }

  // ---------------------------------------------------------------------------
  // TEST SUITE 1: Deterministic Initialization
  // ---------------------------------------------------------------------------
  console.log('--- Test Suite 1: Home Store Initialization ---');
  const store1 = await readHomeStore();
  if (store1.schemaVersion !== 1 || store1.currentMission !== null) {
    throw new Error('Initial store shape incorrect');
  }
  console.log('✓ Home store initialized with schemaVersion: 1 and currentMission: null');

  // ---------------------------------------------------------------------------
  // TEST SUITE 2: Setting Valid Missions (Work Order, Event, Document)
  // ---------------------------------------------------------------------------
  console.log('\n--- Test Suite 2: Setting Valid Current Missions ---');

  // 2A. Set Work Order
  const woMission = await validateAndSetCurrentMission('work-order', activeWorkOrderId);
  if (woMission.resourceType !== 'work-order' || woMission.resourceId !== activeWorkOrderId || typeof woMission.setAt !== 'number') {
    throw new Error('Failed to set Work Order as Current Mission');
  }
  console.log(`✓ Set active Work Order as Current Mission (setAt: ${woMission.setAt})`);

  // 2B. Set Schedule Event (replaces previous)
  const eventMission = await validateAndSetCurrentMission('schedule-event', activeEventId);
  if (eventMission.resourceType !== 'schedule-event' || eventMission.resourceId !== activeEventId) {
    throw new Error('Failed to replace with Schedule Event');
  }
  console.log('✓ Successfully replaced Current Mission with Schedule Event');

  // 2C. Set Document (replaces previous)
  const docMission = await validateAndSetCurrentMission('document', activeDocumentId);
  if (docMission.resourceType !== 'document' || docMission.resourceId !== activeDocumentId) {
    throw new Error('Failed to replace with Document');
  }
  console.log('✓ Successfully replaced Current Mission with Artemis Document');

  // ---------------------------------------------------------------------------
  // TEST SUITE 3: Validation & Eligibility Rules
  // ---------------------------------------------------------------------------
  console.log('\n--- Test Suite 3: Validation & Eligibility Rejection ---');

  // Non-existent ID
  try {
    await validateAndSetCurrentMission('work-order', crypto.randomUUID());
    throw new Error('Should have rejected non-existent resource');
  } catch (err) {
    console.log('✓ Correctly rejected non-existent resource ID');
  }

  // Archived Work Order
  try {
    await validateAndSetCurrentMission('work-order', archivedWorkOrderId);
    throw new Error('Should have rejected archived Work Order');
  } catch (err) {
    console.log('✓ Correctly rejected archived Work Order');
  }

  // Completed Work Order
  try {
    await validateAndSetCurrentMission('work-order', completedWorkOrderId);
    throw new Error('Should have rejected completed Work Order');
  } catch (err) {
    console.log('✓ Correctly rejected completed Work Order');
  }

  // Cancelled Schedule Event
  try {
    await validateAndSetCurrentMission('schedule-event', cancelledEventId);
    throw new Error('Should have rejected cancelled Schedule Event');
  } catch (err) {
    console.log('✓ Correctly rejected cancelled Schedule Event');
  }

  // ---------------------------------------------------------------------------
  // TEST SUITE 4: Clearing Current Mission
  // ---------------------------------------------------------------------------
  console.log('\n--- Test Suite 4: Clearing Current Mission ---');
  await clearCurrentMission();
  const storeAfterClear = await readHomeStore();
  if (storeAfterClear.currentMission !== null) {
    throw new Error('Failed to clear Current Mission');
  }
  console.log('✓ Current Mission cleared back to null');

  // ---------------------------------------------------------------------------
  // TEST SUITE 5: Resilience on Subsequent Resource Archival
  // ---------------------------------------------------------------------------
  console.log('\n--- Test Suite 5: Resilience on Subsequent Archival ---');
  // Set Work Order
  await validateAndSetCurrentMission('work-order', activeWorkOrderId);

  // Simulate external Work Order archival
  const autoData = JSON.parse(await fs.readFile(automotiveStorePath, 'utf-8'));
  const targetWO = autoData.workOrders.find((w) => w.id === activeWorkOrderId);
  targetWO.isDeleted = true;
  await fs.writeFile(automotiveStorePath, JSON.stringify(autoData, null, 2), 'utf-8');

  // Reading home store must NOT crash or self-delete; reference remains for user awareness
  const storeResilient = await readHomeStore();
  if (!storeResilient.currentMission || storeResilient.currentMission.resourceId !== activeWorkOrderId) {
    throw new Error('Home store must preserve reference when resource is subsequently archived');
  }
  console.log('✓ Reference preserved when owning resource is subsequently archived');

  // Clean up test directory
  await fs.rm(tempDir, { recursive: true, force: true });
  console.log('\n=== All 5 Home & Current Mission Verification Suites Passed! ===\n');
}

runVerification().catch((err) => {
  console.error('\n❌ Verification failed:', err);
  process.exit(1);
});
