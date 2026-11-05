import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { registerPriceSlateApi } from './price-slate-api.mjs';
import { hourlyRateToCents, rateCentsToCents, rateCentsToRm } from '../shared/pricing.js';
import {
  calculatePriceSlate, compilePriceFormula, evaluatePriceFormula, normalizePriceTemplateItems,
} from '../functions/_shared/priceSlateUtils.js';

assert.equal(evaluatePriceFormula('2 + 3 * 4'), 14);
assert.equal(evaluatePriceFormula('(rate * duration_hrs) - 5', { rate: 40, duration_hrs: 2 }), 75);
assert.equal(evaluatePriceFormula('subtotal * 0.06', { subtotal: 80 }), 4.8);
assert.throws(() => evaluatePriceFormula('1 / 0'), /divide by zero/i);
assert.throws(() => compilePriceFormula('process.exit()'), /Unexpected character|Unknown variable/i);
assert.throws(() => compilePriceFormula('rate + unknown_value'), /Unknown variable/i);
assert.equal(rateCentsToRm(45), 45);
assert.equal(rateCentsToRm(6000), 60);
assert.equal(rateCentsToCents(45), 4500);
assert.equal(hourlyRateToCents(45), 4500);

const booking = { rate_cents: 4000, duration_mins: 120, branch_facility_fee_cents: 1000 };
const calculated = calculatePriceSlate([
  { id: 'service', label: 'Service', note: 'Two hours', expression: 'rate * duration_hrs' },
  { id: 'facility', label: 'Facility', expression: 'branch_facility_fee' },
  { id: 'tax', label: 'Admin fee', expression: 'subtotal * 0.05' },
  { id: 'discount', label: 'Discount', expression: '-2.50' },
], booking);
assert.equal(calculated.ok, true);
assert.deepEqual(calculated.items.map((item) => item.amount_cents), [8000, 1000, 450, -250]);
assert.equal(calculated.total_cents, 9200);
assert.equal(calculated.total, 92);
assert.equal(calculatePriceSlate([{ label: 'Hourly', expression: 'rate' }], {
  rate_cents: 45, duration_mins: 60,
}).total_cents, 4500);

const badFormula = calculatePriceSlate([{ label: 'Bad row', expression: 'rate / 0' }], booking);
assert.equal(badFormula.ok, false);
assert.match(badFormula.fields['items.0.expression'], /divide by zero/i);

const negativeTotal = calculatePriceSlate([{ label: 'Discount', expression: '-1' }], booking);
assert.equal(negativeTotal.ok, false);
assert.ok(negativeTotal.fields.total);

const template = normalizePriceTemplateItems([{ label: 'Base', expression: 'rate * duration_hrs' }]);
assert.equal(template.ok, true);
assert.equal(template.items[0].expression, 'rate * duration_hrs');

const schemaDb = new DatabaseSync(':memory:');
schemaDb.exec(readFileSync(new URL('../adminPage/db/schema.sql', import.meta.url), 'utf8'));
schemaDb.exec(readFileSync(new URL('../adminPage/db/seed.sql', import.meta.url), 'utf8'));
assert.equal(schemaDb.prepare("SELECT COUNT(*) AS count FROM booking_price_slates").get().count, 0);
assert.equal(schemaDb.prepare("SELECT COUNT(*) AS count FROM price_slate_templates").get().count, 0);

const middleware = new Map();
registerPriceSlateApi({ middlewares: { use: (path, handler) => middleware.set(path, handler) } }, {
  getDb: async () => schemaDb,
  hasPgConfig: () => false,
  getPool: () => { throw new Error('PostgreSQL is not expected in this test.'); },
  readJsonBody: async (request) => request.body,
  sendJson: (response, status, payload) => {
    response.statusCode = status;
    response.payload = payload;
  },
});

async function callApi(path, route, method, body) {
  const handler = middleware.get(path);
  const response = {};
  await handler({ method, url: route, body }, response, () => { throw new Error('Unexpected middleware fallthrough.'); });
  return response;
}

const saved = await callApi('/api/bookings', '/BK-5001/price-slate', 'PUT', {
  items: [
    { label: 'Service', note: 'One hour', expression: 'rate * duration_hrs' },
    { label: 'Admin fee', expression: 'subtotal * 0.05' },
  ],
});
assert.equal(saved.statusCode, 200);
assert.equal(saved.payload.slate.total_cents, 6300);
assert.equal(saved.payload.slate.items[1].amount_cents, 300);
const loaded = await callApi('/api/bookings', '/BK-5001/price-slate', 'GET');
assert.equal(loaded.statusCode, 200);
assert.equal(loaded.payload.slate.total, 63);
const snapshot = JSON.parse(schemaDb.prepare('SELECT cost_breakdown FROM bookings WHERE id = ?').get('BK-5001').cost_breakdown);
assert.equal(snapshot.version, 'slate-v1');
assert.equal(snapshot.total_cents, 6300);

const invalidSave = await callApi('/api/bookings', '/BK-5001/price-slate', 'PUT', {
  items: [{ label: 'Invalid', expression: 'rate / 0' }],
});
assert.equal(invalidSave.statusCode, 400);
assert.equal(schemaDb.prepare('SELECT total_cents FROM booking_price_slates WHERE booking_id = ?').get('BK-5001').total_cents, 6300);
assert.equal(schemaDb.prepare("SELECT COUNT(*) AS count FROM audit_logs WHERE action = 'booking.price_slate.saved'").get().count, 1);

const templateCreated = await callApi('/api/price-templates', '/', 'POST', {
  name: 'Standard one-hour service',
  items: [{ label: 'Service', expression: 'rate * duration_hrs' }],
});
assert.equal(templateCreated.statusCode, 201);
assert.equal(templateCreated.payload.template.name, 'Standard one-hour service');
const listedTemplates = await callApi('/api/price-templates', '/', 'GET');
assert.equal(listedTemplates.payload.length, 1);
const duplicateTemplate = await callApi('/api/price-templates', '/', 'POST', {
  name: 'standard one-hour service',
  items: [{ label: 'Service', expression: 'rate * duration_hrs' }],
});
assert.equal(duplicateTemplate.statusCode, 409);
const deletedTemplate = await callApi('/api/price-templates', `/${templateCreated.payload.template.id}`, 'DELETE');
assert.equal(deletedTemplate.statusCode, 200);
assert.equal(schemaDb.prepare("SELECT COUNT(*) AS count FROM audit_logs WHERE record_type = 'Price Slate Template'").get().count, 2);
schemaDb.close();

const migrationDb = new DatabaseSync(':memory:');
migrationDb.exec('CREATE TABLE bookings (id TEXT PRIMARY KEY, cost_breakdown TEXT);');
migrationDb.exec(readFileSync(new URL('../adminPage/db/migrations/0002_price_slates.sql', import.meta.url), 'utf8'));
assert.ok(migrationDb.prepare("SELECT name FROM sqlite_master WHERE name = 'booking_price_slates'").get());
assert.ok(migrationDb.prepare("SELECT name FROM sqlite_master WHERE name = 'price_slate_templates'").get());
migrationDb.close();

console.log('Price slate formulas, SQLite API routes, schema, and migration checks passed.');
