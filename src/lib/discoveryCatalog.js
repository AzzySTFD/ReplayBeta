const buildPlaceholderEntries = (genreKey, count = 3) =>
  Array.from({ length: count }, (_, index) => ({
    title: `${genreKey.charAt(0).toUpperCase()}${genreKey.slice(1)} Spotlight ${index + 1}`,
    artist: 'Upcoming release',
    release_date: '2026-09-01',
    release_status: 'Upcoming',
    artwork_url: '',
  }));

const rawDiscoveryCatalog = {
  rock: {
    label: 'Rock',
    subgenres: ['alt-rock', 'indie rock', 'post-punk', 'garage rock'],
    featured: buildPlaceholderEntries('rock', 3),
    albums: {
      'alt-rock': buildPlaceholderEntries('alt-rock', 2),
      'indie rock': buildPlaceholderEntries('indie rock', 2),
      'post-punk': buildPlaceholderEntries('post-punk', 2),
      'garage rock': buildPlaceholderEntries('garage rock', 2),
    },
  },
  metal: {
    label: 'Metal',
    subgenres: ['metalcore', 'death metal', 'black metal', 'thrash metal'],
    featured: buildPlaceholderEntries('metal', 3),
    albums: {
      metalcore: buildPlaceholderEntries('metalcore', 2),
      'death metal': buildPlaceholderEntries('death metal', 2),
      'black metal': buildPlaceholderEntries('black metal', 2),
      'thrash metal': buildPlaceholderEntries('thrash metal', 2),
    },
  },
  country: {
    label: 'Country',
    subgenres: ['outlaw country', 'americana', 'bluegrass', 'alt-country'],
    featured: buildPlaceholderEntries('country', 3),
    albums: {
      'outlaw country': buildPlaceholderEntries('outlaw country', 2),
      americana: buildPlaceholderEntries('americana', 2),
      bluegrass: buildPlaceholderEntries('bluegrass', 2),
      'alt-country': buildPlaceholderEntries('alt-country', 2),
    },
  },
  rap: {
    label: 'Rap',
    subgenres: ['trap', 'boom bap', 'conscious rap', 'hip hop'],
    featured: buildPlaceholderEntries('rap', 3),
    albums: {
      trap: buildPlaceholderEntries('trap', 2),
      'boom bap': buildPlaceholderEntries('boom bap', 2),
      'conscious rap': buildPlaceholderEntries('conscious rap', 2),
      'hip hop': buildPlaceholderEntries('hip hop', 2),
    },
  },
  punk: {
    label: 'Punk',
    subgenres: ['hardcore punk', 'pop punk', 'emo', 'ska punk'],
    featured: buildPlaceholderEntries('punk', 3),
    albums: {
      'hardcore punk': buildPlaceholderEntries('hardcore punk', 2),
      'pop punk': buildPlaceholderEntries('pop punk', 2),
      emo: buildPlaceholderEntries('emo', 2),
      'ska punk': buildPlaceholderEntries('ska punk', 2),
    },
  },
  'k-pop': {
    label: 'K-pop',
    subgenres: ['4th gen k-pop', 'k-pop girl group', 'k-pop boy group', 'j-pop'],
    featured: buildPlaceholderEntries('k-pop', 3),
    albums: {
      '4th gen k-pop': buildPlaceholderEntries('4th gen k-pop', 2),
      'k-pop girl group': buildPlaceholderEntries('k-pop girl group', 2),
      'k-pop boy group': buildPlaceholderEntries('k-pop boy group', 2),
      'j-pop': buildPlaceholderEntries('j-pop', 2),
    },
  },
  jazz: {
    label: 'Jazz',
    subgenres: ['bebop', 'fusion', 'acid jazz', 'smooth jazz'],
    featured: buildPlaceholderEntries('jazz', 3),
    albums: {
      bebop: buildPlaceholderEntries('bebop', 2),
      fusion: buildPlaceholderEntries('fusion', 2),
      'acid jazz': buildPlaceholderEntries('acid jazz', 2),
      'smooth jazz': buildPlaceholderEntries('smooth jazz', 2),
    },
  },
  electronic: {
    label: 'Electronic',
    subgenres: ['house', 'techno', 'ambient', 'drum and bass'],
    featured: buildPlaceholderEntries('electronic', 3),
    albums: {
      house: buildPlaceholderEntries('house', 2),
      techno: buildPlaceholderEntries('techno', 2),
      ambient: buildPlaceholderEntries('ambient', 2),
      'drum and bass': buildPlaceholderEntries('drum and bass', 2),
    },
  },
  folk: {
    label: 'Folk',
    subgenres: ['indie folk', 'folk rock', 'americana'],
    featured: buildPlaceholderEntries('folk', 3),
    albums: {
      'indie folk': buildPlaceholderEntries('indie folk', 2),
      'folk rock': buildPlaceholderEntries('folk rock', 2),
      americana: buildPlaceholderEntries('americana', 2),
    },
  },
  indie: {
    label: 'Indie',
    subgenres: ['indie pop', 'indie folk', 'indie rock'],
    featured: buildPlaceholderEntries('indie', 3),
    albums: {
      'indie pop': buildPlaceholderEntries('indie pop', 2),
      'indie folk': buildPlaceholderEntries('indie folk', 2),
      'indie rock': buildPlaceholderEntries('indie rock', 2),
    },
  },
};

export const discoveryCatalog = Object.fromEntries(
  Object.entries(rawDiscoveryCatalog).map(([genreKey, genreEntry]) => [
    genreKey,
    {
      ...genreEntry,
      featured: genreEntry.featured.map((album) => ({
        ...album,
        release_status: album.release_status || 'Upcoming',
      })),
      albums: Object.fromEntries(
        Object.entries(genreEntry.albums).map(([subgenreKey, albumList]) => [
          subgenreKey,
          albumList.map((album) => ({
            ...album,
            release_status: album.release_status || 'Upcoming',
          })),
        ])
      ),
    },
  ])
);

export function getDiscoveryData(genrePath = []) {
  const rootGenres = Object.keys(discoveryCatalog);
  if (genrePath.length === 0) {
    return {
      parentGenre: null,
      genres: rootGenres,
      children: [],
      months: ['This month', 'Next month'],
      albums: [],
    };
  }

  const rootGenre = genrePath[0];
  const subGenre = genrePath[1];
  const entry = discoveryCatalog[rootGenre];

  if (!entry) {
    return {
      parentGenre: rootGenre,
      genres: rootGenres,
      children: [],
      months: ['This month', 'Next month'],
      albums: [],
    };
  }

  if (!subGenre) {
    return {
      parentGenre: rootGenre,
      genres: rootGenres,
      children: entry.subgenres,
      months: ['This month', 'Next month'],
      albums: entry.featured,
    };
  }

  return {
    parentGenre: rootGenre,
    genres: rootGenres,
    children: [],
    months: ['This month', 'Next month'],
    albums: entry.albums[subGenre] || [],
  };
}
