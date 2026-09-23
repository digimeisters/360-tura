// Pravi types/supabase.ts iz ŽIVE baze koju sajt koristi (NEXT_PUBLIC_SUPABASE_URL
// iz .env.local), u istom obliku kao `supabase gen types typescript`.
//
// Zašto ne Supabase CLI: CLI na ovom računaru je prijavljen na drugi nalog
// (stari projekat "360-tura"), pa je generisao tipove bez tabela i kolona
// iz migracija 003-016. Ovde se struktura čita iz PostgREST OpenAPI opisa
// baze sajta, service-role ključem, SAMO ČITANJEM - ništa se ne menja.
//
// Pokretanje (posle svake nove migracije):  npm run db:types
//
// PostgREST u OpenAPI opisu kao "required" navodi kolone koje su NOT NULL;
// kolone sa podrazumevanom vrednošću (default) su u Insert-u opcione.

import fs from 'fs';
import path from 'path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const envFile = path.join(root, '.env.local');
const env = Object.fromEntries(
  fs
    .readFileSync(envFile, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')];
    })
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Nedostaje NEXT_PUBLIC_SUPABASE_URL ili SUPABASE_SERVICE_ROLE_KEY u .env.local');
  process.exit(1);
}

const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/`, {
  headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/openapi+json' }
});
if (!res.ok) {
  console.error(`Čitanje strukture baze nije uspelo: HTTP ${res.status}`);
  process.exit(1);
}
const spec = await res.json();
const definitions = spec.definitions ?? {};

const STRING_FORMATS = /^(text|uuid|character varying|character|varchar|citext|date|time.*|timestamp.*|interval|inet|bytea)/;
const NUMBER_FORMATS = /^(integer|bigint|smallint|numeric|real|double precision|decimal)/;

function tsType(prop) {
  const format = String(prop.format ?? '');
  if (Array.isArray(prop.enum)) return prop.enum.map((v) => JSON.stringify(v)).join(' | ');
  if (format.endsWith('[]')) return `${tsType({ format: format.slice(0, -2) })}[]`;
  if (format === 'json' || format === 'jsonb') return 'Json';
  if (format === 'boolean') return 'boolean';
  if (NUMBER_FORMATS.test(format)) return 'number';
  if (STRING_FORMATS.test(format)) return 'string';
  if (prop.type === 'number' || prop.type === 'integer') return 'number';
  if (prop.type === 'boolean') return 'boolean';
  if (prop.type === 'string') return 'string';
  return 'Json';
}

function foreignKey(prop) {
  const match = String(prop.description ?? '').match(/<fk table='([^']+)' column='([^']+)'\/>/);
  return match ? { table: match[1], column: match[2] } : null;
}

const pad = (n) => ' '.repeat(n);
const tableNames = Object.keys(definitions).sort();

let tablesOut = '';
for (const table of tableNames) {
  const def = definitions[table];
  const required = new Set(def.required ?? []);
  const columns = Object.entries(def.properties ?? {}).sort(([a], [b]) => a.localeCompare(b));

  const row = columns.map(([name, prop]) => `${pad(10)}${name}: ${tsType(prop)}${required.has(name) ? '' : ' | null'}`);
  const insert = columns.map(([name, prop]) => {
    const optional = !required.has(name) || prop.default !== undefined;
    return `${pad(10)}${name}${optional ? '?' : ''}: ${tsType(prop)}${required.has(name) ? '' : ' | null'}`;
  });
  const update = columns.map(([name, prop]) => `${pad(10)}${name}?: ${tsType(prop)}${required.has(name) ? '' : ' | null'}`);
  const relationships = columns
    .map(([name, prop]) => [name, foreignKey(prop)])
    .filter(([, fk]) => fk)
    .map(
      ([name, fk]) =>
        `${pad(10)}{\n${pad(12)}foreignKeyName: "${table}_${name}_fkey"\n${pad(12)}columns: ["${name}"]\n${pad(12)}isOneToOne: false\n${pad(12)}referencedRelation: "${fk.table}"\n${pad(12)}referencedColumns: ["${fk.column}"]\n${pad(10)}},`
    );

  tablesOut += `${pad(6)}${table}: {
${pad(8)}Row: {
${row.join('\n')}
${pad(8)}}
${pad(8)}Insert: {
${insert.join('\n')}
${pad(8)}}
${pad(8)}Update: {
${update.join('\n')}
${pad(8)}}
${pad(8)}Relationships: [${relationships.length ? `\n${relationships.join('\n')}\n${pad(8)}` : ''}]
${pad(6)}}
`;
}

const out = `// GENERISANO skriptom scripts/gen-db-types.mjs (npm run db:types) - ne menjati ručno.
// Izvor: živa baza sajta (${new URL(url).hostname.split('.')[0]}), ${new Date().toISOString().slice(0, 10)}.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "${String(spec.info?.version ?? "12").split(" ")[0].split(".").slice(0, 2).join(".")}"
  }
  public: {
    Tables: {
${tablesOut}    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
`;

fs.writeFileSync(path.join(root, 'types', 'supabase.ts'), out);
console.log(`types/supabase.ts: ${tableNames.length} tabela (${tableNames.join(', ')})`);
