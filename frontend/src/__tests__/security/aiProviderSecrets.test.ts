/**
 * Security test: neither AI provider key may ever reach a client.
 *
 * Both `AGENTROUTER_API_KEY` and `GROQ_API_KEY` are backend-only. Anything the
 * frontend or the mobile app can read is shipped to the user's device — a
 * `NEXT_PUBLIC_*` variable is inlined into the JS bundle at build time, and an
 * Expo `.env` is bundled into the APK. Neither can be revoked after the fact.
 *
 * Why this is a *test* and not a review note: nothing in `tsc`, ESLint or the
 * build fails if someone adds `NEXT_PUBLIC_GROQ_API_KEY` to `.env.local` to
 * "debug the AI quickly". It would just work, and the leak would ship.
 *
 * This scans real files on disk rather than mocking, and asserts the positive
 * control too (the backend really does read these variables), so it cannot pass
 * by scanning nothing.
 */
import fs from 'node:fs';
import path from 'node:path';

const REPO = path.join(__dirname, '../../../..');
const FRONTEND = path.join(REPO, 'frontend');
const MOBILE = path.join(REPO, 'mobile');
const BACKEND = path.join(REPO, 'backend');

/** This file necessarily contains the forbidden strings, so it excludes itself. */
const SELF = path.resolve(__filename);

const SCANNED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.css'];
const SKIPPED_DIRS = new Set(['node_modules', '.next', '.expo', 'build', 'dist', 'coverage', 'android', 'ios', '.git']);

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRS.has(entry.name)) walk(full, out);
    } else if (path.resolve(full) !== SELF) {
      const isEnvFile = entry.name === '.env' || entry.name.startsWith('.env.');
      if (isEnvFile || SCANNED_EXTENSIONS.includes(path.extname(entry.name))) out.push(full);
    }
  }
  return out;
}

/** Every client-side file that could carry a secret to a user's device. */
function clientFiles(): string[] {
  const files = [
    ...walk(path.join(FRONTEND, 'src')),
    ...walk(path.join(MOBILE, 'src')),
  ];
  // Config and env files sit at each package root, not under src/.
  for (const root of [FRONTEND, MOBILE]) {
    if (!fs.existsSync(root)) continue;
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const isEnvFile = entry.name === '.env' || entry.name.startsWith('.env.');
      if (isEnvFile || SCANNED_EXTENSIONS.includes(path.extname(entry.name))) {
        files.push(path.join(root, entry.name));
      }
    }
  }
  return files;
}

function offendersMatching(pattern: RegExp): string[] {
  return clientFiles()
    .filter(file => pattern.test(fs.readFileSync(file, 'utf8')))
    .map(file => path.relative(REPO, file));
}

describe('AI provider secrets stay backend-only', () => {
  it('scans a non-trivial number of client files', () => {
    // Guards against the vacuous pass: a broken walk would make every
    // assertion below succeed by examining nothing.
    const files = clientFiles();
    expect(files.length).toBeGreaterThan(50);
    expect(files.some(f => f.includes(`${path.sep}frontend${path.sep}`))).toBe(true);
    expect(files.some(f => f.includes(`${path.sep}mobile${path.sep}`))).toBe(true);
  });

  it('never exposes an AI key through a build-time public variable', () => {
    // NEXT_PUBLIC_* is inlined into the browser bundle; EXPO_PUBLIC_* into the app binary.
    expect(offendersMatching(/(NEXT_PUBLIC|EXPO_PUBLIC)_[A-Z0-9_]*(AGENTROUTER|GROQ|ANTHROPIC|CLAUDE)/i)).toEqual([]);
  });

  it('never names a provider API key variable in client code at all', () => {
    // Not even reading it — a client that references the name is a client that
    // expects the value to be there.
    expect(offendersMatching(/\b(AGENTROUTER_API_KEY|GROQ_API_KEY|ANTHROPIC_API_KEY)\b/)).toEqual([]);
  });

  it('contains no literal provider key material', () => {
    // Key shapes: Groq `gsk_…`, Anthropic/AgentRouter `sk-…`. Length bounds keep
    // this from matching ordinary words.
    expect(offendersMatching(/\bgsk_[A-Za-z0-9]{20,}/)).toEqual([]);
    expect(offendersMatching(/\bsk-(ant-)?[A-Za-z0-9_-]{24,}/)).toEqual([]);
  });

  it('does not stash a provider key in localStorage, sessionStorage or a cookie', () => {
    expect(
      offendersMatching(
        /(localStorage|sessionStorage|document\.cookie|Cookies\.set|AsyncStorage)[^\n;]{0,120}(agentrouter|groq_?api|anthropic_?api)/i,
      ),
    ).toEqual([]);
  });

  it('talks to AI only through our own backend endpoints', () => {
    // A direct call to a provider host from a client can only be authenticated
    // with a key the client holds.
    expect(offendersMatching(/https?:\/\/(api\.groq\.com|api\.anthropic\.com|agentrouter\.org)/i)).toEqual([]);
  });

  it('positive control: the backend is the side that reads both keys', () => {
    // If this ever fails the scans above have stopped meaning anything, because
    // the variables they police would no longer be in use.
    const properties = fs.readFileSync(
      path.join(BACKEND, 'src/main/resources/application.properties'),
      'utf8',
    );
    expect(properties).toMatch(/agentrouter\.api-key=\$\{AGENTROUTER_API_KEY:/);
    expect(properties).toMatch(/groq\.api-key=\$\{GROQ_API_KEY:/);
  });
});
