import test from 'node:test';
import assert from 'node:assert/strict';

import { classifyImportSource, extractAlbumCandidatesFromHtml } from './importHelpers.js';

test('classifies common profile hosts', () => {
  assert.equal(classifyImportSource('https://rateyourmusic.com/~demo'), 'rateyourmusic');
  assert.equal(classifyImportSource('https://albumoftheyear.org/user/demo/'), 'albumoftheyear');
});

test('extracts album candidates from profile html', () => {
  const html = `
    <html>
      <body>
        <a href="/album/ok-computer/">OK Computer</a>
        <span class="rating">4.5</span>
        <a href="/album/nevermind/">Nevermind</a>
        <a href="/profile/settings">Settings</a>
      </body>
    </html>
  `;

  const candidates = extractAlbumCandidatesFromHtml(html, 'rateyourmusic');
  assert.equal(candidates.length, 2);
  assert.equal(candidates[0].title, 'OK Computer');
  assert.equal(candidates[1].title, 'Nevermind');
});
