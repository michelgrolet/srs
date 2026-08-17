import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const root = fileURLToPath(new URL('..', import.meta.url));

test('the stdio server starts and exposes the complete small tool surface', async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['server/index.js'],
    cwd: root,
    stderr: 'pipe',
  });
  const client = new Client({ name: 'srs-test', version: '1.0.0' });
  try {
    await client.connect(transport);
    const response = await client.listTools();
    assert.deepEqual(response.tools.map((tool) => tool.name).sort(), [
      'create_card',
      'create_cards',
      'delete_card',
      'get_card',
      'get_review_card',
      'list_cards',
      'list_tags',
      'rate_card',
      'reveal_card',
      'update_card',
    ]);
    const create = response.tools.find((tool) => tool.name === 'create_card');
    assert.equal(create.inputSchema.required.includes('question'), true);
    assert.equal(create.inputSchema.required.includes('answer'), true);
  } finally {
    await client.close();
  }
});
