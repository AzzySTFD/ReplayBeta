import { URL } from 'node:url';

const cleanText = (value) => value?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || '';

const detectAlbumTitleFromText = (text, source) => {
  if (!text) return '';
  const cleaned = cleanText(text).replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';

  if (source === 'rateyourmusic') {
    const withoutMeta = cleaned.replace(/\s*\(.*?\)\s*$/i, '').trim();
    return withoutMeta;
  }

  return cleaned;
};

export const classifyImportSource = (input) => {
  try {
    const { hostname } = new URL(input);
    if (hostname.includes('rateyourmusic')) return 'rateyourmusic';
    if (hostname.includes('albumoftheyear')) return 'albumoftheyear';
    if (hostname.includes('letterboxd')) return 'letterboxd';
    if (hostname.includes('discogs')) return 'discogs';
  } catch (e) {
    // ignore
  }

  return 'generic';
};

export const extractAlbumCandidatesFromHtml = (html, source) => {
  if (!html) return [];

  const candidates = [];
  const seen = new Set();

  const addCandidate = (title, href, extra = {}) => {
    const normalizedTitle = detectAlbumTitleFromText(title, source);
    if (!normalizedTitle || seen.has(normalizedTitle.toLowerCase())) return;
    seen.add(normalizedTitle.toLowerCase());
    candidates.push({ title: normalizedTitle, href, ...extra });
  };

  const anchorRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
  let match;
  while ((match = anchorRegex.exec(html)) !== null) {
    const href = match[1];
    const title = cleanText(match[2]);
    if (!href || !title) continue;

    if (source === 'rateyourmusic') {
      const lowerHref = href.toLowerCase();
      if (lowerHref.includes('/album/') || lowerHref.includes('/release/')) {
        addCandidate(title, href);
      }
    } else if (source === 'albumoftheyear') {
      const lowerHref = href.toLowerCase();
      if (lowerHref.includes('/album/')) {
        addCandidate(title, href);
      }
    } else {
      addCandidate(title, href);
    }
  }

  const ratingRegex = /([0-9](?:[.,][0-9])?)(?:\s*(?:\/|out of)\s*10)?/gi;
  const noteRegex = /<p[^>]*>(.*?)<\/p>/gi;
  const paragraphMatches = [];
  while ((match = noteRegex.exec(html)) !== null) {
    const text = cleanText(match[1]);
    if (text) paragraphMatches.push(text);
  }

  const noteText = paragraphMatches.find((paragraph) => paragraph.length > 12) || paragraphMatches[0] || '';
  const ratingMatch = html.match(ratingRegex);
  const ratingValue = ratingMatch?.[0] ? Number(ratingMatch[0].replace(',', '.')) : null;

  if (candidates.length === 0) {
    const titleCandidates = html.match(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/gi) || [];
    titleCandidates.forEach((block) => {
      const title = cleanText(block);
      if (title) addCandidate(title, '');
    });
  }

  return candidates.map((candidate) => ({
    ...candidate,
    rating: Number.isFinite(ratingValue) ? Math.min(10, Math.max(0, ratingValue)) : undefined,
    notes: noteText || undefined,
  }));
};

export const normalizeImportUrl = (input) => {
  try {
    const url = new URL(input);
    return url.toString();
  } catch (e) {
    return input.trim();
  }
};
