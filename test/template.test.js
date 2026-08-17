import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGitHubConfig } from '../server/config.js';

const root = fileURLToPath(new URL('..', import.meta.url));

test('the public database contains synthetic demo cards only', () => {
  const cards = JSON.parse(readFileSync(join(root, 'cards.json'), 'utf8'));
  assert.equal(cards.length, 3);
  assert.equal(cards.every((card) => card.id.startsWith('demo-') && card.source === 'SRS demo'), true);
});

test('the public UI identifies itself as a demo and links to the template', () => {
  const app = readFileSync(join(root, 'app-v2.js'), 'utf8');
  const readme = readFileSync(join(root, 'README.md'), 'utf8');
  assert.match(app, /Local demo/);
  assert.match(app, /Get the template/);
  assert.match(readme, /Create your own copy/);
  assert.match(readme, /codex plugin add srs@srs/);
});

test('a shared config file selects a non-default personal repository', () => {
  const directory = mkdtempSync(join(tmpdir(), 'srs-config-'));
  const path = join(directory, 'config.json');
  writeFileSync(path, JSON.stringify({ repository: 'michelgrolet/srs-personal', branch: 'main' }));
  try {
    assert.deepEqual(loadGitHubConfig({
      SRS_CONFIG_PATH: path,
      SRS_GITHUB_TOKEN: 'test-token',
    }), {
      owner: 'michelgrolet',
      repo: 'srs-personal',
      branch: 'main',
      token: 'test-token',
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
