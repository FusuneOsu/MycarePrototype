import { rateCentsToRm } from '../../shared/pricing.js';

const ALLOWED_VARIABLES = new Set([
  'rate',
  'duration_mins',
  'duration_hrs',
  'branch_facility_fee',
  'subtotal',
]);

const MAX_ITEMS = 100;
const MAX_EXPRESSION_LENGTH = 256;
const MAX_TOKENS = 128;
const MAX_NESTING = 32;

export class FormulaError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FormulaError';
  }
}

function tokenize(expression) {
  if (typeof expression !== 'string' || !expression.trim()) {
    throw new FormulaError('Enter a number or formula.');
  }
  if (expression.length > MAX_EXPRESSION_LENGTH) {
    throw new FormulaError(`Formula must be ${MAX_EXPRESSION_LENGTH} characters or fewer.`);
  }

  const tokens = [];
  const pattern = /\s*([0-9]+(?:\.[0-9]*)?|\.[0-9]+|[A-Za-z_][A-Za-z0-9_]*|[()+\-*/])/y;
  let position = 0;
  while (position < expression.length) {
    pattern.lastIndex = position;
    const match = pattern.exec(expression);
    if (!match) throw new FormulaError(`Unexpected character at position ${position + 1}.`);
    tokens.push(match[1]);
    position = pattern.lastIndex;
    if (tokens.length > MAX_TOKENS) throw new FormulaError('Formula is too complex.');
  }
  return tokens;
}

export function compilePriceFormula(expression) {
  const tokens = tokenize(expression);
  let cursor = 0;
  let nesting = 0;

  const peek = () => tokens[cursor];
  const take = () => tokens[cursor++];

  function parseExpression() {
    let node = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const operator = take();
      node = { type: 'binary', operator, left: node, right: parseTerm() };
    }
    return node;
  }

  function parseTerm() {
    let node = parseUnary();
    while (peek() === '*' || peek() === '/') {
      const operator = take();
      node = { type: 'binary', operator, left: node, right: parseUnary() };
    }
    return node;
  }

  function parseUnary() {
    if (peek() === '+' || peek() === '-') {
      const operator = take();
      nesting += 1;
      if (nesting > MAX_NESTING) throw new FormulaError('Formula is nested too deeply.');
      const argument = parseUnary();
      nesting -= 1;
      return { type: 'unary', operator, argument };
    }
    return parsePrimary();
  }

  function parsePrimary() {
    const token = take();
    if (token === undefined) throw new FormulaError('Formula ends unexpectedly.');

    if (token === '(') {
      nesting += 1;
      if (nesting > MAX_NESTING) throw new FormulaError('Formula is nested too deeply.');
      const node = parseExpression();
      nesting -= 1;
      if (take() !== ')') throw new FormulaError('Add a closing parenthesis.');
      return node;
    }
    if (token === ')') throw new FormulaError('Unexpected closing parenthesis.');
    if (/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) {
      const value = Number(token);
      if (!Number.isFinite(value)) throw new FormulaError('Numbers must be finite.');
      return { type: 'number', value };
    }
    if (/^[A-Za-z_]/.test(token)) {
      if (!ALLOWED_VARIABLES.has(token)) throw new FormulaError(`Unknown variable "${token}".`);
      return { type: 'variable', name: token };
    }
    throw new FormulaError(`Unexpected token "${token}".`);
  }

  const ast = parseExpression();
  if (cursor !== tokens.length) throw new FormulaError(`Unexpected token "${peek()}".`);
  return ast;
}

function evaluateNode(node, variables) {
  if (node.type === 'number') return node.value;
  if (node.type === 'variable') {
    const value = Number(variables[node.name] ?? 0);
    if (!Number.isFinite(value)) throw new FormulaError(`Variable "${node.name}" is not a finite number.`);
    return value;
  }
  if (node.type === 'unary') {
    const value = evaluateNode(node.argument, variables);
    return node.operator === '-' ? -value : value;
  }

  const left = evaluateNode(node.left, variables);
  const right = evaluateNode(node.right, variables);
  let result;
  switch (node.operator) {
    case '+': result = left + right; break;
    case '-': result = left - right; break;
    case '*': result = left * right; break;
    case '/':
      if (right === 0) throw new FormulaError('Cannot divide by zero.');
      result = left / right;
      break;
    default: throw new FormulaError('Unsupported operator.');
  }
  if (!Number.isFinite(result)) throw new FormulaError('Formula result is not finite.');
  return result;
}

export function evaluatePriceFormula(expression, variables = {}) {
  return evaluateNode(compilePriceFormula(expression), variables);
}

function roundToCents(amount) {
  const rounded = Math.sign(amount) * Math.round((Math.abs(amount) + Number.EPSILON) * 100);
  if (!Number.isSafeInteger(rounded)) throw new FormulaError('Formula result is too large.');
  return rounded;
}

function normalizeRow(row, index, errors, { validateFormula = true } = {}) {
  const fieldPrefix = `items.${index}`;
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    errors[fieldPrefix] = 'Each line item must be an object.';
    return null;
  }

  const label = typeof row.label === 'string' ? row.label.trim() : '';
  const note = typeof row.note === 'string' ? row.note.trim() : '';
  const expression = typeof row.expression === 'string' || typeof row.expression === 'number'
    ? String(row.expression).trim()
    : '';

  if (!label) errors[`${fieldPrefix}.label`] = 'A line-item label is required.';
  else if (label.length > 120) errors[`${fieldPrefix}.label`] = 'Label must be 120 characters or fewer.';
  if (note.length > 500) errors[`${fieldPrefix}.note`] = 'Note must be 500 characters or fewer.';
  if (!expression) errors[`${fieldPrefix}.expression`] = 'Enter a number or formula.';
  else if (validateFormula) {
    try { compilePriceFormula(expression); }
    catch (error) { errors[`${fieldPrefix}.expression`] = error.message; }
  }

  if (errors[`${fieldPrefix}.label`] || errors[`${fieldPrefix}.note`] || errors[`${fieldPrefix}.expression`]) return null;
  const id = typeof row.id === 'string' && row.id.trim() ? row.id.trim().slice(0, 100) : `PSI-${crypto.randomUUID()}`;
  return { id, label, note, expression };
}

export function normalizePriceTemplateItems(input) {
  if (!Array.isArray(input)) return { ok: false, error: 'items must be an array.', fields: { items: 'Items must be an array.' } };
  if (input.length > MAX_ITEMS) return { ok: false, error: `A slate may contain at most ${MAX_ITEMS} line items.`, fields: { items: `Use ${MAX_ITEMS} or fewer line items.` } };

  const fields = {};
  const items = input.map((row, index) => normalizeRow(row, index, fields));
  if (Object.keys(fields).length) return { ok: false, error: 'Validation failed.', fields };
  return { ok: true, items };
}

export function calculatePriceSlate(input, booking = {}) {
  const normalized = normalizePriceTemplateItems(input);
  if (!normalized.ok) return normalized;

  const variables = {
    rate: rateCentsToRm(booking.rate_cents),
    duration_mins: Number(booking.duration_mins || 0),
    duration_hrs: Number(booking.duration_mins || 0) / 60,
    branch_facility_fee: Number(booking.branch_facility_fee_cents || 0) / 100,
    subtotal: 0,
  };

  const fields = {};
  let totalCents = 0;
  const items = normalized.items.map((item, index) => {
    try {
      variables.subtotal = totalCents / 100;
      const amount = evaluatePriceFormula(item.expression, variables);
      const amountCents = roundToCents(amount);
      totalCents += amountCents;
      if (!Number.isSafeInteger(totalCents)) throw new FormulaError('Slate total is too large.');
      return { ...item, amount_cents: amountCents, amount: amountCents / 100 };
    } catch (error) {
      fields[`items.${index}.expression`] = error.message;
      return { ...item, amount_cents: null, amount: null };
    }
  });

  if (Object.keys(fields).length) return { ok: false, error: 'One or more formulas could not be calculated.', fields };
  if (totalCents < 0) {
    return { ok: false, error: 'The final price cannot be less than RM 0.00.', fields: { total: 'The final price cannot be negative.' } };
  }
  return { ok: true, items, total_cents: totalCents, total: totalCents / 100 };
}

export function parsePriceSlateItems(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }
  return [];
}

export function priceSlateResponse(row) {
  if (!row) return null;
  const totalCents = Number(row.total_cents || 0);
  return {
    booking_id: row.booking_id,
    items: parsePriceSlateItems(row.items),
    total_cents: totalCents,
    total: totalCents / 100,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
