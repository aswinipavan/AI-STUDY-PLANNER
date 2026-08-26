/**
 * Finds animations that will never run.
 *
 * CSS Modules scope `@keyframes` names, and Turbopack rewrites every
 * `animation` / `animation-name` identifier in a `*.module.css` file to the
 * scoped form — whether or not a matching local `@keyframes` exists. So a module
 * that says `animation: fadeIn 0.2s` while `fadeIn` only lives in globals.css
 * compiles to `<hash>__fadeIn`, which is declared nowhere and silently does
 * nothing.
 *
 * Run with: node scripts/audit-keyframes.cjs
 */
const fs = require('fs');
const path = require('path');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name.endsWith('.module.css')) out.push(p);
  }
  return out;
}

/** Keyframes a module might expect to inherit — and which it cannot. */
const globalKeyframes = new Set(
  [...fs.readFileSync('src/app/globals.css', 'utf8').matchAll(/@keyframes\s+([\w-]+)/g)].map(
    (m) => m[1]
  )
);

const SHORTHAND_KEYWORDS =
  /^(none|infinite|normal|reverse|alternate|alternate-reverse|both|forwards|backwards|paused|running|linear|ease|ease-in|ease-out|ease-in-out|step-start|step-end|!important)$/;

let dead = 0;

for (const file of walk('src')) {
  const css = fs.readFileSync(file, 'utf8');
  const declared = new Set([...css.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]));

  const referenced = new Set();
  for (const match of css.matchAll(/animation(?:-name)?\s*:\s*([^;}]+)/g)) {
    for (const token of match[1].split(/[\s,]+/)) {
      if (!token || /^[\d.]/.test(token) || token.includes('(') || token.includes(')')) continue;
      if (SHORTHAND_KEYWORDS.test(token)) continue;
      referenced.add(token);
    }
  }

  const missing = [...referenced].filter((name) => !declared.has(name));
  if (missing.length === 0) continue;

  dead += missing.length;
  console.log(file.split(path.sep).join('/'));
  for (const name of missing) {
    const note = globalKeyframes.has(name)
      ? 'in globals.css only — scoped away, so DEAD'
      : 'not defined anywhere';
    console.log(`    ${name}  (${note})`);
  }
}

console.log(`\n${dead} dead animation reference(s)`);
process.exitCode = dead > 0 ? 1 : 0;
