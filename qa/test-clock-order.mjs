import test from 'node:test';
import assert from 'node:assert/strict';
import {CLOCK_ORDER_STORAGE_KEY,cleanClockOrder,shiftClock,positionClock} from '../clock-order.mjs';
test('stored clock order is sanitized against current visible locations',()=>{
 const active=['Africa/Lagos','Asia/Kolkata','Europe/London'];
 assert.deepEqual(cleanClockOrder(['Asia/Kolkata','Asia/Kolkata','<bad>','Africa/Lagos'],active),
 ['Asia/Kolkata','Africa/Lagos','Europe/London']);
 assert.deepEqual(cleanClockOrder('invalid',active),active);
 assert.deepEqual(cleanClockOrder([],[]),[]);
});
test('clock arrows never move past beginning or end of movable list',()=>{
 const original=['Africa/Lagos','Asia/Kolkata','Europe/London'];
 assert.deepEqual(shiftClock(original,'Asia/Kolkata',-1),['Asia/Kolkata','Africa/Lagos','Europe/London']);
 assert.deepEqual(shiftClock(original,'Africa/Lagos',-1),original);
 assert.deepEqual(shiftClock(original,'Europe/London',1),original);
 assert.deepEqual(shiftClock(original,'missing',1),original);
 assert.deepEqual(original,['Africa/Lagos','Asia/Kolkata','Europe/London']);
});
test('drag placement changes order across fixed and newly-added cities',()=>{
 const original=['Africa/Lagos','Asia/Kolkata','Europe/London','America/Chicago'];
 assert.deepEqual(positionClock(original,'America/Chicago','Asia/Kolkata'),
 ['Africa/Lagos','America/Chicago','Asia/Kolkata','Europe/London']);
 assert.deepEqual(positionClock(original,'Africa/Lagos','America/Chicago'),
 ['Asia/Kolkata','Europe/London','Africa/Lagos','America/Chicago']);
 assert.deepEqual(positionClock(original,'bogus','Africa/Lagos'),original);
});
test('device zone is deliberately not part of persisted movable order',()=>{
 const active=['Africa/Lagos','Asia/Kolkata'];
 assert.deepEqual(cleanClockOrder(['America/New_York','Asia/Kolkata'],active),
 ['Asia/Kolkata','Africa/Lagos']);
 assert.equal(CLOCK_ORDER_STORAGE_KEY,'timebridge-clock-order-v1');
});
