import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import fs from 'fs';
import path from 'path';

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

// Preload core schemas (synchronous on startup; small set OK)
const schemaDir = path.join(process.cwd(), 'schemas');
let validators: Record<string, ValidateFunction> = {};

if (fs.existsSync(schemaDir)) {
  for (const file of fs.readdirSync(schemaDir)) {
    if (file.endsWith('.schema.json')) {
      const raw = fs.readFileSync(path.join(schemaDir, file), 'utf8');
      const schema = JSON.parse(raw);
      const id = schema.$id || file;
      validators[id] = ajv.compile(schema);
    }
  }
}

export function validateSchema(id: string, data: unknown) {
  const v = validators[id];
  if (!v) throw new Error(`Schema validator not found: ${id}`);
  const ok = v(data);
  if (!ok) {
    const detail = v.errors?.map(e => `${e.instancePath} ${e.message}`).join('; ');
    throw new Error(`Schema validation failed (${id}): ${detail}`);
  }
  return true;
}

export function listSchemas() { return Object.keys(validators); }
