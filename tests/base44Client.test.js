import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/api/base44Client.js';

test('base44 adapter exposes a portable functions.invoke API', async () => {
  const result = await db.functions.invoke('spotifySearch', { query: 'daft punk' });
  assert.ok(result && Array.isArray(result.data.albums));
});

test('spotifySearch uses the same-origin proxy route in the browser', async () => {
  const originalFetch = global.fetch;
  const originalWindow = global.window;
  const calls = [];

  global.window = { location: { hostname: 'localhost' } };
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      json: async () => ({ albums: [{ id: 'album-1' }] }),
    };
  };

  try {
    const result = await db.functions.invoke('spotifySearch', { query: 'daft punk' });
    assert.equal(calls[0].url, '/api/spotify/search');
    assert.equal(calls[0].options.method, 'POST');
    assert.deepEqual(result.data.albums, [{ id: 'album-1' }]);
  } finally {
    global.fetch = originalFetch;
    global.window = originalWindow;
  }
});
