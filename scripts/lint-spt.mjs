/**
 * Zero-dependency static check for SPT modules (syntax, unused declarations, identical ternary branches).
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const modulesDir = join(__dirname, '..', 'content', 'modules');

const files = readdirSync(modulesDir)
  .filter((f) => /^spt.*\.js$|^xtToggle\.js$/.test(f))
  .sort()
  .map((f) => join(modulesDir, f));

/**
 * Replaces comments and string/template literals with whitespace so identifier
 * scanning does not produce false positives or miss real occurrences.
 */
function stripLiteralsAndComments(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  while (i < n) {
    const ch = src[i];
    const next = src[i + 1];
    if (ch === '/' && next === '/') {
      out += '  ';
      i += 2;
      while (i < n && src[i] !== '\n') {
        out += ' ';
        i += 1;
      }
      continue;
    }
    if (ch === '/' && next === '*') {
      out += '  ';
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) {
        out += src[i] === '\n' ? '\n' : ' ';
        i += 1;
      }
      if (i < n) {
        out += '  ';
        i += 2;
      }
      continue;
    }
    if (ch === '/' && next !== '/' && next !== '*') {
      // Heuristic: regex literal if preceded by an operator/delimiter token
      const prevNonSpace = out.replace(/\s+$/, '').slice(-1);
      if (!prevNonSpace || '(=,:!&|?;{[+-*/%~^<>'.includes(prevNonSpace)) {
        out += ' ';
        i += 1;
        let inClass = false;
        while (i < n && (inClass || src[i] !== '/') && src[i] !== '\n') {
          if (src[i] === '\\') {
            out += '  ';
            i += 2;
            continue;
          }
          if (src[i] === '[') inClass = true;
          else if (src[i] === ']') inClass = false;
          out += ' ';
          i += 1;
        }
        if (i < n && src[i] === '/') {
          out += ' ';
          i += 1;
        }
        continue;
      }
    }
    if (ch === '"' || ch === "'") {
      const quote = ch;
      out += ' ';
      i += 1;
      while (i < n && src[i] !== quote) {
        if (src[i] === '\\') {
          out += '  ';
          i += 2;
        } else {
          out += src[i] === '\n' ? '\n' : ' ';
          i += 1;
        }
      }
      if (i < n) {
        out += ' ';
        i += 1;
      }
      continue;
    }
    if (ch === '`') {
      out += ' ';
      i += 1;
      let depth = 0;
      while (i < n) {
        if (src[i] === '\\') {
          out += '  ';
          i += 2;
        } else if (depth === 0 && src[i] === '`') {
          out += ' ';
          i += 1;
          break;
        } else if (src[i] === '$' && src[i + 1] === '{') {
          out += '  ';
          depth += 1;
          i += 2;
        } else if (depth > 0 && src[i] === '}') {
          out += ' ';
          depth -= 1;
          i += 1;
        } else if (depth > 0) {
          out += src[i];
          i += 1;
        } else {
          out += src[i] === '\n' ? '\n' : ' ';
          i += 1;
        }
      }
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

const findings = [];

for (const filePath of files) {
  const raw = readFileSync(filePath, 'utf8');
  const fileName = filePath.split(/[\\/]/).pop();

  // 1. Syntax check
  new vm.Script(raw, { filename: fileName });

  const stripped = stripLiteralsAndComments(raw);
  const lines = stripped.split(/\r?\n/);

  // 2. Identical ternary branch check (same-line simple ternary)
  lines.forEach((line, idx) => {
    const m = line.match(/\?\s*([A-Za-z_$][A-Za-z0-9_$.]*)\s*:\s*([A-Za-z_$][A-Za-z0-9_$.]*)\s*[;,)]/);
    if (m && m[1] === m[2]) {
      findings.push(`${fileName}:${idx + 1}: identical ternary branches "${m[1]}"`);
    }
  });

  // 3. Unused simple variable / function declarations (single occurrence across file)
  const wordCounts = new Map();
  const wordRe = /\b([A-Za-z_$][A-Za-z0-9_$]*)\b/g;
  let wm;
  while ((wm = wordRe.exec(stripped)) !== null) {
    wordCounts.set(wm[1], (wordCounts.get(wm[1]) || 0) + 1);
  }

  lines.forEach((line, idx) => {
    const fnMatch = line.match(/^\s*(?:async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/);
    if (fnMatch) {
      const name = fnMatch[1];
      if ((wordCounts.get(name) || 0) <= 1) {
        findings.push(`${fileName}:${idx + 1}: unused function "${name}"`);
      }
    }
    const varMatch = line.match(/^\s*(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=/);
    if (varMatch) {
      const name = varMatch[1];
      if ((wordCounts.get(name) || 0) <= 1) {
        findings.push(`${fileName}:${idx + 1}: unused variable "${name}"`);
      }
    }
  });
}

if (findings.length > 0) {
  console.error('Lint findings:\n' + findings.join('\n'));
  process.exit(1);
}

console.log(`Lint OK (${files.length} arquivos verificados, 0 achados).`);
