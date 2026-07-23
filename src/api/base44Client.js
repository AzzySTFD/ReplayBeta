const STORAGE_KEY = 'track-by-track-local-store-v1';
let memoryStore = {};

const readStore = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return memoryStore;
    }
  }

  return memoryStore;
};

const writeStore = (store) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    return;
  }

  memoryStore = store;
};

const migrateLegacyDevUserData = (currentUserId) => {
  if (!currentUserId) return;

  const store = readStore();
  const entityNames = ['Profile', 'Review', 'Folder', 'Follow'];
  let changed = false;

  for (const entityName of entityNames) {
    const rows = Array.isArray(store[entityName]) ? store[entityName] : [];
    const hasCurrentRows = rows.some((row) => row.created_by_id === currentUserId);

    // Only migrate when legacy rows exist and current-user rows do not, to avoid accidental merges.
    if (!hasCurrentRows) {
      const migrated = rows.map((row) => {
        if (row.created_by_id === 'dev-user') {
          changed = true;
          return { ...row, created_by_id: currentUserId };
        }
        return row;
      });
      store[entityName] = migrated;
    }
  }

  if (changed) {
    writeStore(store);
  }
};

const createEntityCollection = (entityName) => ({
  list: async () => {
    const store = readStore();
    return (store[entityName] || []).slice().sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  },
  filter: async (criteria = {}) => {
    const store = readStore();
    const rows = (store[entityName] || []).filter((item) => Object.entries(criteria).every(([key, value]) => item[key] === value));
    return rows.slice().sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  },
  get: async (id) => {
    const store = readStore();
    return (store[entityName] || []).find((item) => item.id === id) || null;
  },
  create: async (payload = {}) => {
    const store = readStore();
    const rows = Array.isArray(store[entityName]) ? store[entityName] : [];
    const created = {
      id: payload.id || `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      created_at: new Date().toISOString(),
      ...payload,
    };
    rows.push(created);
    store[entityName] = rows;
    writeStore(store);
    return created;
  },
  update: async (_id, payload = {}) => {
    const store = readStore();
    const rows = Array.isArray(store[entityName]) ? store[entityName] : [];
    const index = rows.findIndex((item) => item.id === _id);
    if (index === -1) {
      return null;
    }

    rows[index] = { ...rows[index], ...payload, id: _id };
    store[entityName] = rows;
    writeStore(store);
    return rows[index];
  },
  delete: async (_id) => {
    const store = readStore();
    const rows = Array.isArray(store[entityName]) ? store[entityName] : [];
    const filtered = rows.filter((item) => item.id !== _id);
    store[entityName] = filtered;
    writeStore(store);
    return { id: _id };
  },
});

const getStoredUsers = () => {
  if (typeof window === 'undefined' || !window.localStorage) return [];

  try {
    return JSON.parse(window.localStorage.getItem('track-by-track-users') || '[]');
  } catch {
    return [];
  }
};

const setStoredUsers = (users) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem('track-by-track-users', JSON.stringify(users));
  }
};

const getStoredTheme = () => {
  if (typeof window === 'undefined' || !window.localStorage) return null;

  try {
    return JSON.parse(window.localStorage.getItem('track-by-track-theme') || 'null');
  } catch {
    return null;
  }
};

const setStoredTheme = (theme) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem('track-by-track-theme', JSON.stringify(theme));
  }
};

const createAuthHandlers = () => ({
  isAuthenticated: async () => {
    if (typeof window === 'undefined') return false;
    return Boolean(window.localStorage.getItem('track-by-track-session'));
  },
  me: async () => {
    if (typeof window === 'undefined') return null;
    const session = window.localStorage.getItem('track-by-track-session');
    if (!session) return null;

    const users = getStoredUsers();
    const currentUser = users.find((user) => user.id === session) || null;
    if (currentUser) {
      migrateLegacyDevUserData(currentUser.id);
    }
    return currentUser;
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('track-by-track-session');
    }
  },
  redirectToLogin: () => undefined,
  loginViaEmailPassword: async (email, password) => {
    const users = getStoredUsers();
    const user = users.find((item) => item.email.toLowerCase() === String(email).toLowerCase());
    if (!user || user.password !== password) {
      throw new Error('Invalid email or password');
    }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('track-by-track-session', user.id);
    }

    return { ok: true, user };
  },
  loginWithProvider: (_provider, _redirect) => undefined,
  register: async (payload) => {
    const users = getStoredUsers();
    const normalizedEmail = String(payload.email || '').toLowerCase();
    const normalizedUsername = String(payload.username || '').trim().toLowerCase();

    if (!normalizedEmail || !payload.password) {
      throw new Error('Email and password are required');
    }

    if (users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
      throw new Error('An account with that email already exists');
    }

    if (users.some((user) => String(user.username || '').trim().toLowerCase() === normalizedUsername)) {
      throw new Error('That username is already taken');
    }

    const user = {
      id: `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      email: normalizedEmail,
      password: payload.password,
      username: String(payload.username || '').trim(),
      created_at: new Date().toISOString(),
    };

    users.push(user);
    setStoredUsers(users);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('track-by-track-session', user.id);
    }

    return { ok: true, user };
  },
  verifyOtp: async () => ({ access_token: 'local-token' }),
  resendOtp: async () => ({ ok: true }),
  resetPasswordRequest: async (email) => {
    const users = getStoredUsers();
    const user = users.find((item) => item.email.toLowerCase() === String(email).toLowerCase());
    if (!user) {
      return { ok: true };
    }

    const token = `reset-${user.id}-${Date.now()}`;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('track-by-track-reset-token', token);
      window.localStorage.setItem('track-by-track-reset-email', user.email);
    }

    return { ok: true, token };
  },
  resetPassword: async ({ resetToken, newPassword }) => {
    if (typeof window === 'undefined') {
      throw new Error('Reset unavailable');
    }

    const storedToken = window.localStorage.getItem('track-by-track-reset-token');
    const storedEmail = window.localStorage.getItem('track-by-track-reset-email');
    if (!storedToken || !storedEmail || storedToken !== resetToken) {
      throw new Error('Invalid reset link');
    }

    const users = getStoredUsers();
    const userIndex = users.findIndex((user) => user.email.toLowerCase() === storedEmail.toLowerCase());
    if (userIndex === -1) {
      throw new Error('User not found');
    }

    users[userIndex].password = newPassword;
    setStoredUsers(users);
    window.localStorage.removeItem('track-by-track-reset-token');
    window.localStorage.removeItem('track-by-track-reset-email');
    return { ok: true };
  },
  setToken: () => undefined,
});

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && typeof window.location !== 'undefined') {
    return '';
  }

  return 'http://127.0.0.1:3001';
};

const localFunctions = {
  invoke: async (name, payload = {}) => {
    if (name === 'spotifySearch') {
      const response = await fetch(`${getApiBaseUrl()}/api/spotify/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Spotify search failed', errorBody);
        if (response.status === 404) {
          throw new Error('Search API route is missing in this deployment.');
        }
        if (response.status === 500 || response.status === 503) {
          throw new Error('Spotify search is unavailable. Check SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET on the server.');
        }
        throw new Error('Spotify search failed. Please try again.');
      }

      const body = await response.json();
      return { data: { albums: body.albums || [] } };
    }

    if (name === 'getFeaturedAlbums') {
      return { data: { featured: [] } };
    }

    if (name === 'spotifyAlbumTracks') {
      const response = await fetch(`${getApiBaseUrl()}/api/spotify/albums/${encodeURIComponent(payload.albumId || '')}/tracks`);
      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Spotify album tracks failed', errorBody);
        if (response.status === 404) {
          throw new Error('Album tracks API route is missing in this deployment.');
        }
        if (response.status === 500 || response.status === 503) {
          throw new Error('Album track lookup is unavailable. Check SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET on the server.');
        }
        throw new Error('Failed to load album tracks.');
      }

      const body = await response.json();
      return { data: { tracks: body.tracks || [] } };
    }

    if (name === 'getNotableReleases') {
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/spotify/notable-releases`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error('Notable releases failed', errorBody);
          return { data: { genres: [], children: [], months: [], albums: [] } };
        }

        const body = await response.json();
        return { data: body };
      } catch (error) {
        console.error('Notable releases request failed', error);
        return { data: { genres: [], children: [], months: [], albums: [] } };
      }
    }

    if (name === 'importProfile') {
      const response = await fetch(`${getApiBaseUrl()}/api/import/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Profile import failed', errorBody);
        return { data: { ok: false, preview: [] } };
      }

      const body = await response.json();
      return { data: body };
    }

    return { data: {} };
  },
};

const entityCollections = {
  Profile: createEntityCollection('Profile'),
  Review: createEntityCollection('Review'),
  Follow: createEntityCollection('Follow'),
  Folder: createEntityCollection('Folder'),
};

export const db = {
  auth: createAuthHandlers(),
  entities: new Proxy(entityCollections, {
    get: (target, prop) => target[prop] || createEntityCollection(prop),
  }),
  functions: localFunctions,
  theme: {
    get: () => getStoredTheme(),
    set: (theme) => {
      setStoredTheme(theme);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('theme:updated', { detail: theme }));
      }
    },
  },
  connectors: {
    connectAppUser: async () => ({ success: true }),
    disconnectAppUser: async () => ({ success: true }),
  },
  integrations: {
    Core: {
      UploadFile: async () => ({ file_url: '' }),
    },
  },
};

export const base44 = db;
export default db;