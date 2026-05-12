/**
 * AUDITORIA COMPLETA DE ES MODULES — Entrega Pro
 * Mapeia todos os exports vs imports e detecta:
 * - imports de nomes inexistentes
 * - exports faltando
 * - módulos com path errado
 * - re-exports e exports default
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = __dirname;

// ── Todos os arquivos JS do projeto (exceto node_modules e test) ──────────────
const FILES = [
  'src/app.js',
  'src/calculations.js',
  'src/state.js',
  'src/storage.js',
  'src/validators.js',
  'src/alerts.js',
  'src/realtime.js',
  'src/config.js',
  'src/services/ocr.js',
  'src/services/clipboard.js',
  'src/services/parser-endereco.js',
  'src/services/importacao-flex.js',
  'src/services/debug-ocr.js',
  'src/services/exportacao-circuit.js',
  'src/services/api.js',
  'src/services/auth.js',
  'src/services/sync.js',
  'src/services/supabaseClient.js',
  'src/ui/importacao-flex.js',
  'src/ui/dashboard.js',
  'src/ui/dom.js',
  'src/ui/historico.js',
  'src/ui/trabalho-ativo.js',
];

// ── Parser de exports ─────────────────────────────────────────────────────────
function extractExports(src) {
  const exports = new Set();
  // export const/function/class name
  for (const m of src.matchAll(/^export\s+(?:const|function|class|async\s+function)\s+([\w$]+)/gm))
    exports.add(m[1]);
  // export { a, b, c }
  for (const m of src.matchAll(/^export\s*\{([^}]+)\}/gm))
    m[1].split(',').map(s => s.trim().replace(/\s+as\s+\w+/, '').trim()).filter(Boolean).forEach(n => exports.add(n));
  // export default
  if (/^export\s+default\b/m.test(src)) exports.add('default');
  return exports;
}

// ── Parser de imports ─────────────────────────────────────────────────────────
function extractImports(src, filePath) {
  const imports = [];
  // import { a, b } from './path.js'
  for (const m of src.matchAll(/^import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/gm)) {
    const names = m[1].split(',').map(s => {
      const parts = s.trim().split(/\s+as\s+/);
      return parts[0].trim();
    }).filter(Boolean);
    imports.push({ names, from: m[2], line: src.slice(0, m.index).split('\n').length });
  }
  // import defaultExport from './path.js'
  for (const m of src.matchAll(/^import\s+(\w+)\s+from\s*['"]([^'"]+)['"]/gm)) {
    if (m[1] !== '{') {
      imports.push({ names: ['default'], from: m[2], line: src.slice(0, m.index).split('\n').length });
    }
  }
  return imports;
}

// ── Resolver caminho relativo ─────────────────────────────────────────────────
function resolveFrom(from, importPath) {
  if (!importPath.startsWith('.')) return null; // external CDN/npm — skip
  const base = resolve(BASE, dirname(from));
  let candidate = resolve(base, importPath);
  if (existsSync(candidate)) return relative(BASE, candidate).replace(/\\/g, '/');
  if (existsSync(candidate + '.js')) return relative(BASE, candidate + '.js').replace(/\\/g, '/');
  return null; // não encontrado
}

// ── Construir mapa de exports ─────────────────────────────────────────────────
const exportMap = {}; // filePath -> Set<string>
for (const file of FILES) {
  const abs = resolve(BASE, file);
  if (!existsSync(abs)) {
    exportMap[file] = new Set(['__FILE_NOT_FOUND__']);
    continue;
  }
  const src = readFileSync(abs, 'utf8');
  exportMap[file] = extractExports(src);
}

// ── Verificar imports ─────────────────────────────────────────────────────────
const ERRORS   = [];
const WARNINGS = [];
const OK       = [];

for (const file of FILES) {
  const abs = resolve(BASE, file);
  if (!existsSync(abs)) {
    ERRORS.push({ file, error: 'ARQUIVO NÃO ENCONTRADO' });
    continue;
  }
  const src = readFileSync(abs, 'utf8');
  const imports = extractImports(src, file);

  for (const imp of imports) {
    if (!imp.from.startsWith('.')) {
      // externo — só logar
      OK.push({ file, msg: `[EXTERNO] import { ${imp.names.join(', ')} } from '${imp.from}'` });
      continue;
    }

    const resolvedFile = resolveFrom(file, imp.from);

    if (!resolvedFile) {
      ERRORS.push({
        file,
        line: imp.line,
        error: `MÓDULO NÃO ENCONTRADO: '${imp.from}'`,
        names: imp.names,
      });
      continue;
    }

    const availableExports = exportMap[resolvedFile];
    if (!availableExports) {
      WARNINGS.push({ file, line: imp.line, msg: `Módulo '${resolvedFile}' não está no mapa de auditoria (pode ser externo/dinâmico)` });
      continue;
    }

    if (availableExports.has('__FILE_NOT_FOUND__')) {
      ERRORS.push({ file, line: imp.line, error: `ARQUIVO ALVO NÃO EXISTE: '${resolvedFile}'`, names: imp.names });
      continue;
    }

    for (const name of imp.names) {
      if (availableExports.has(name)) {
        OK.push({ file, msg: `✓ '${name}' de '${resolvedFile}'` });
      } else {
        ERRORS.push({
          file,
          line: imp.line,
          error: `EXPORT INVÁLIDO: '${name}' NÃO EXISTE em '${resolvedFile}'`,
          available: [...availableExports].join(', '),
        });
      }
    }
  }
}

// ── Detectar dependências circulares (DFS simples) ────────────────────────────
function buildDepGraph() {
  const graph = {};
  for (const file of FILES) {
    graph[file] = [];
    const abs = resolve(BASE, file);
    if (!existsSync(abs)) continue;
    const src = readFileSync(abs, 'utf8');
    for (const imp of extractImports(src, file)) {
      if (!imp.from.startsWith('.')) continue;
      const resolved = resolveFrom(file, imp.from);
      if (resolved && FILES.includes(resolved)) graph[file].push(resolved);
    }
  }
  return graph;
}

function findCycles(graph) {
  const cycles = [];
  const visited = new Set();
  const stack = [];

  function dfs(node) {
    if (stack.includes(node)) {
      const cycleStart = stack.indexOf(node);
      cycles.push([...stack.slice(cycleStart), node]);
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    stack.push(node);
    for (const dep of (graph[node] || [])) dfs(dep);
    stack.pop();
  }

  for (const node of Object.keys(graph)) dfs(node);
  return cycles;
}

const depGraph = buildDepGraph();
const cycles = findCycles(depGraph);

// ── Relatório Final ───────────────────────────────────────────────────────────
const SEP = '═'.repeat(72);

console.log(`\n${SEP}`);
console.log('  AUDITORIA ES MODULES — Entrega Pro');
console.log(SEP);

if (ERRORS.length === 0) {
  console.log('\n✅  ZERO ERROS ENCONTRADOS — Todos os imports/exports são válidos!\n');
} else {
  console.log(`\n🔴  ${ERRORS.length} ERRO(S) ENCONTRADO(S):\n`);
  for (const e of ERRORS) {
    console.log(`  [ERRO] ${e.file}:${e.line || '?'}`);
    console.log(`         ${e.error}`);
    if (e.names)     console.log(`         Nomes importados: ${e.names.join(', ')}`);
    if (e.available) console.log(`         Exports disponíveis: ${e.available}`);
    console.log('');
  }
}

if (WARNINGS.length > 0) {
  console.log(`⚠️   ${WARNINGS.length} AVISO(S):\n`);
  for (const w of WARNINGS) {
    console.log(`  [AVISO] ${w.file}: ${w.msg}`);
  }
  console.log('');
}

if (cycles.length === 0) {
  console.log('✅  ZERO dependências circulares detectadas.\n');
} else {
  console.log(`⚠️   ${cycles.length} DEPENDÊNCIA(S) CIRCULAR(ES):\n`);
  for (const cycle of cycles) {
    console.log(`  ${cycle.join(' → ')}`);
  }
  console.log('');
}

// ── Mapa completo de exports por módulo ───────────────────────────────────────
console.log(`${SEP}`);
console.log('  EXPORTS DISPONÍVEIS POR MÓDULO');
console.log(SEP);
for (const [file, exps] of Object.entries(exportMap)) {
  const list = [...exps].filter(e => e !== '__FILE_NOT_FOUND__');
  console.log(`\n  📄 ${file}`);
  if (list.length === 0) {
    console.log('     (nenhum export nomeado)');
  } else {
    list.forEach(e => console.log(`     • ${e}`));
  }
}

console.log(`\n${SEP}`);
console.log(`  RESUMO: ${OK.length} imports OK | ${ERRORS.length} erros | ${WARNINGS.length} avisos | ${cycles.length} ciclos`);
console.log(SEP);
console.log('');
