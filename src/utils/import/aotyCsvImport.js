const normalizeText = (value) => String(value || "")
  .normalize("NFKD")
  .replace(/[^a-z0-9]+/gi, "")
  .toLowerCase();

const safeLower = (value) => String(value || "").trim().toLowerCase();

const normalizeAlbumType = (value) => {
  const raw = safeLower(value);
  if (!raw) return "";
  if (["album", "lp"].includes(raw)) return "album";
  if (["ep"].includes(raw)) return "ep";
  if (["single"].includes(raw)) return "single";
  if (["compilation", "comp"].includes(raw)) return "compilation";
  return raw;
};

const toYearString = (value) => {
  const match = String(value || "").match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : "";
};

const parseDelimitedRating = (value) => {
  const match = String(value || "").match(/(-?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  if (!match) return null;

  const numerator = Number(match[1]);
  const denominator = Number(match[2]);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return null;
  }

  return (numerator / denominator) * 100;
};

export const parseImportRating = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const delimited = parseDelimitedRating(raw);
  if (Number.isFinite(delimited)) {
    return Math.max(0, Math.min(100, delimited));
  }

  if (raw.endsWith("%")) {
    const percentValue = Number(raw.slice(0, -1));
    if (Number.isFinite(percentValue)) {
      return Math.max(0, Math.min(100, percentValue));
    }
    return null;
  }

  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return null;

  if (numeric <= 5) return Math.max(0, Math.min(100, numeric * 20));
  if (numeric <= 10) return Math.max(0, Math.min(100, numeric * 10));
  return Math.max(0, Math.min(100, numeric));
};

const splitCsvLine = (line) => {
  const columns = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      columns.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  columns.push(current);
  return columns;
};

// Parse CSV while preserving commas/newlines inside quoted cells.
const parseCsvRows = (csvText) => {
  const rows = [];
  let currentLine = "";
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentLine += '""';
        index += 1;
      } else {
        inQuotes = !inQuotes;
        currentLine += char;
      }
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      if (currentLine.length > 0) {
        rows.push(splitCsvLine(currentLine));
      }
      currentLine = "";
      continue;
    }

    currentLine += char;
  }

  if (currentLine.length > 0) {
    rows.push(splitCsvLine(currentLine));
  }

  return rows;
};

const resolveColumnIndex = (headerMap, aliases) => {
  for (const alias of aliases) {
    if (headerMap.has(alias)) {
      return headerMap.get(alias);
    }
  }
  return -1;
};

export const parseAotyCsv = (csvText) => {
  const rows = parseCsvRows(String(csvText || ""));
  if (rows.length === 0) {
    return { entries: [], missingColumns: ["artist", "album_title"] };
  }

  const header = rows[0].map((cell) => safeLower(cell));
  const headerMap = new Map(header.map((name, index) => [name, index]));

  const artistIndex = resolveColumnIndex(headerMap, ["artist", "artists", "artist name"]);
  const albumIndex = resolveColumnIndex(headerMap, ["album", "album title", "title", "release"]);
  const ratingIndex = resolveColumnIndex(headerMap, ["rating", "score", "album rating"]);
  const reviewIndex = resolveColumnIndex(headerMap, ["review", "review text", "notes", "comment"]);
  const dateIndex = resolveColumnIndex(headerMap, ["date reviewed", "review date", "date"]);
  const albumTypeIndex = resolveColumnIndex(headerMap, ["album type", "type", "release type"]);
  const yearIndex = resolveColumnIndex(headerMap, ["year", "release year"]);

  const missingColumns = [];
  if (artistIndex === -1) missingColumns.push("artist");
  if (albumIndex === -1) missingColumns.push("album_title");

  if (missingColumns.length > 0) {
    return { entries: [], missingColumns };
  }

  const entries = rows.slice(1).map((cells, rowOffset) => {
    const artist = String(cells[artistIndex] || "").trim();
    const albumTitle = String(cells[albumIndex] || "").trim();
    const ratingRaw = ratingIndex >= 0 ? String(cells[ratingIndex] || "").trim() : "";
    const reviewText = reviewIndex >= 0 ? String(cells[reviewIndex] || "").trim() : "";
    const dateReviewed = dateIndex >= 0 ? String(cells[dateIndex] || "").trim() : "";
    const albumType = albumTypeIndex >= 0 ? normalizeAlbumType(cells[albumTypeIndex]) : "";
    const year = yearIndex >= 0 ? toYearString(cells[yearIndex]) : "";

    return {
      rowNumber: rowOffset + 2,
      artist,
      albumTitle,
      ratingRaw,
      rating: parseImportRating(ratingRaw),
      reviewText,
      dateReviewed,
      albumType,
      year,
    };
  }).filter((entry) => entry.artist && entry.albumTitle);

  return { entries, missingColumns: [] };
};

const artistMatches = (rowArtist, candidateArtist) => {
  const left = normalizeText(rowArtist);
  const right = normalizeText(candidateArtist);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
};

const titleMatches = (rowTitle, candidateTitle) => {
  const left = normalizeText(rowTitle);
  const right = normalizeText(candidateTitle);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
};

const scoreCandidate = (entry, candidate) => {
  const normalizedArtist = normalizeText(entry.artist);
  const normalizedCandidateArtist = normalizeText(candidate.artist);
  const normalizedTitle = normalizeText(entry.albumTitle);
  const normalizedCandidateTitle = normalizeText(candidate.title);

  if (!artistMatches(entry.artist, candidate.artist) || !titleMatches(entry.albumTitle, candidate.title)) {
    return -1;
  }

  let score = 0;

  if (normalizedArtist === normalizedCandidateArtist) {
    score += 100;
  } else {
    score += 80;
  }

  if (normalizedTitle === normalizedCandidateTitle) {
    score += 90;
  } else {
    score += 70;
  }

  if (entry.year && String(candidate.release_year || "") === entry.year) {
    score += 20;
  }

  if (entry.albumType && normalizeAlbumType(candidate.album_type) === entry.albumType) {
    score += 10;
  }

  return score;
};

export const findBestAlbumMatchForImport = (entry, candidates = []) => {
  if (!entry?.artist || !entry?.albumTitle) {
    return { status: "needs_review", reason: "missing_artist_or_title" };
  }

  const scoredCandidates = candidates
    .map((candidate) => ({ candidate, score: scoreCandidate(entry, candidate) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score);

  if (scoredCandidates.length === 0) {
    return { status: "needs_review", reason: "no_match" };
  }

  const [best] = scoredCandidates;
  const contenders = scoredCandidates.filter((item) => best.score - item.score <= 5);

  if (contenders.length > 1) {
    return {
      status: "needs_review",
      reason: "ambiguous_match",
      candidates: contenders.slice(0, 3).map((item) => item.candidate),
    };
  }

  return { status: "matched", album: best.candidate };
};

export const getNeedsReviewReasonLabel = (reason) => {
  if (reason === "missing_artist_or_title") return "Missing artist/title";
  if (reason === "ambiguous_match") return "Multiple close matches";
  if (reason === "search_failed") return "Metadata search failed";
  if (reason === "metadata_load_failed") return "Album metadata failed";
  if (reason === "create_review_failed") return "Review save failed";
  return "No reliable metadata match";
};