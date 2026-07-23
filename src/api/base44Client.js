import { createClient } from '@supabase/supabase-js';

const STORAGE_KEY = 'track-by-track-local-store-v1';
let memoryStore = {};
const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

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

const getLegacyMigrationFlag = (currentUserId) => `track-by-track-legacy-supabase-migrated:${currentUserId}`;

const hasMigratedLegacyStore = (currentUserId) => {
  if (typeof window === 'undefined' || !window.localStorage || !currentUserId) return false;
  return window.localStorage.getItem(getLegacyMigrationFlag(currentUserId)) === 'true';
};

const markLegacyStoreMigrated = (currentUserId) => {
  if (typeof window === 'undefined' || !window.localStorage || !currentUserId) return;
  window.localStorage.setItem(getLegacyMigrationFlag(currentUserId), 'true');
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

const migrateLegacyStoreToSupabase = async (currentUserId) => {
  if (!currentUserId || hasMigratedLegacyStore(currentUserId)) {
    return;
  }

  const store = readStore();
  const legacyProfileRows = Array.isArray(store.Profile) ? store.Profile : [];
  const legacyReviewRows = Array.isArray(store.Review) ? store.Review : [];
  const legacyFolderRows = Array.isArray(store.Folder) ? store.Folder : [];
  const legacyFollowRows = Array.isArray(store.Follow) ? store.Follow : [];

  try {
    for (const row of legacyProfileRows) {
      if (row.created_by_id !== currentUserId && row.created_by_id !== 'dev-user') continue;

      const profileRow = {
        id: row.id,
        user_id: currentUserId,
        username: row.username || '',
        display_name: row.display_name || '',
        bio: row.bio || '',
        avatar_url: row.avatar_url || '',
        social_links: row.social_links || {},
        discord_channel_id: row.discord_channel_id || '',
        discord_channel_name: row.discord_channel_name || '',
        is_public: row.is_public ?? true,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };

      const { error } = await supabase.from('profiles').upsert(profileRow, { onConflict: 'user_id' });
      if (error) {
        throw error;
      }
    }

    for (const row of legacyFolderRows) {
      if (row.created_by_id !== currentUserId && row.created_by_id !== 'dev-user') continue;

      const folderRow = {
        id: row.id,
        user_id: currentUserId,
        name: row.name || '',
        created_at: row.created_at,
        updated_at: row.updated_at,
      };

      const { error } = await supabase.from('folders').upsert(folderRow, { onConflict: 'id' });
      if (error) {
        throw error;
      }
    }

    for (const row of legacyFollowRows) {
      if (row.created_by_id !== currentUserId && row.created_by_id !== 'dev-user') continue;

      const followRow = {
        id: row.id,
        user_id: currentUserId,
        following_user_id: row.following_id || row.following_user_id || null,
        following_username: row.following_username || '',
        created_at: row.created_at,
      };

      const { error } = await supabase.from('follows').upsert(followRow, { onConflict: 'id' });
      if (error) {
        throw error;
      }
    }

    for (const row of legacyReviewRows) {
      if (row.created_by_id !== currentUserId && row.created_by_id !== 'dev-user') continue;

      const reviewRow = {
        id: row.id,
        user_id: currentUserId,
        username: row.username || '',
        spotify_album_id: row.spotify_album_id || '',
        spotify_artist_id: row.spotify_artist_id || '',
        album_title: row.album_title || '',
        artist: row.artist || '',
        album_art_url: row.album_art_url || '',
        release_year: row.release_year || '',
        tracks: row.tracks || [],
        album_rating: row.album_rating ?? 0,
        use_manual_rating: row.use_manual_rating ?? false,
        manual_rating: row.manual_rating ?? 0,
        notes: row.notes || '',
        reactions: row.reactions || [],
        comments: row.comments || [],
        folder_id: row.folder_id || null,
        folder_name: row.folder_name || '',
        created_at: row.created_at,
        updated_at: row.updated_at,
      };

      const { error } = await supabase.from('reviews').upsert(reviewRow, { onConflict: 'id' });
      if (error) {
        throw error;
      }
    }

    markLegacyStoreMigrated(currentUserId);
  } catch (error) {
    console.error('Legacy data migration to Supabase failed', error);
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

const mapProfileRowToEntity = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    created_by_id: row.user_id || row.created_by_id,
    username: row.username || '',
    display_name: row.display_name || '',
    bio: row.bio || '',
    avatar_url: row.avatar_url || '',
    social_links: row.social_links || {},
    discord_channel_id: row.discord_channel_id || '',
    discord_channel_name: row.discord_channel_name || '',
    is_public: row.is_public ?? true,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

const getCurrentAuthUserId = async () => {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || null;
  } catch {
    return null;
  }
};

const createProfileCollection = () => ({
  list: async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []).map(mapProfileRowToEntity);
  },
  filter: async (criteria = {}) => {
    let query = supabase.from('profiles').select('*');

    for (const [key, value] of Object.entries(criteria)) {
      if (key === 'created_by_id' || key === 'user_id') {
        query = query.eq('user_id', value);
      } else {
        query = query.eq(key, value);
      }
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []).map(mapProfileRowToEntity);
  },
  get: async (id) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return mapProfileRowToEntity(data);
  },
  create: async (payload = {}) => {
    const userId = payload.created_by_id || payload.user_id || await getCurrentAuthUserId();
    if (!userId) {
      throw new Error('Authenticated user is required to create a profile');
    }

    const profileRow = {
      user_id: userId,
      username: String(payload.username || '').trim(),
      display_name: String(payload.display_name || '').trim(),
      bio: String(payload.bio || ''),
      avatar_url: String(payload.avatar_url || ''),
      social_links: payload.social_links || {},
      discord_channel_id: String(payload.discord_channel_id || ''),
      discord_channel_name: String(payload.discord_channel_name || ''),
      is_public: payload.is_public ?? true,
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(profileRow, { onConflict: 'user_id' })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return mapProfileRowToEntity(data);
  },
  update: async (id, payload = {}) => {
    const profileRow = {
      username: payload.username !== undefined ? String(payload.username || '').trim() : undefined,
      display_name: payload.display_name !== undefined ? String(payload.display_name || '').trim() : undefined,
      bio: payload.bio !== undefined ? String(payload.bio || '') : undefined,
      avatar_url: payload.avatar_url !== undefined ? String(payload.avatar_url || '') : undefined,
      social_links: payload.social_links !== undefined ? payload.social_links || {} : undefined,
      discord_channel_id: payload.discord_channel_id !== undefined ? String(payload.discord_channel_id || '') : undefined,
      discord_channel_name: payload.discord_channel_name !== undefined ? String(payload.discord_channel_name || '') : undefined,
      is_public: payload.is_public !== undefined ? payload.is_public : undefined,
    };

    Object.keys(profileRow).forEach((key) => profileRow[key] === undefined && delete profileRow[key]);

    const { data, error } = await supabase
      .from('profiles')
      .update(profileRow)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return mapProfileRowToEntity(data);
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return { id };
  },
});

const toSupabaseOrder = (orderBy, defaultColumn = 'created_at') => {
  if (!orderBy) {
    return { column: defaultColumn, ascending: false };
  }

  if (typeof orderBy === 'string') {
    const descending = orderBy.startsWith('-');
    const rawColumn = descending ? orderBy.slice(1) : orderBy;
    const column = rawColumn === 'updated_date' ? 'updated_at' : rawColumn;
    return { column, ascending: !descending };
  }

  return { column: defaultColumn, ascending: false };
};

const stripUndefined = (value) => {
  return Object.fromEntries(Object.entries(value).filter(([, currentValue]) => currentValue !== undefined));
};

const mapFolderRowToEntity = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    created_by_id: row.user_id,
    name: row.name || '',
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

const createFolderCollection = () => ({
  list: async (orderBy, limit) => {
    const { column, ascending } = toSupabaseOrder(orderBy);
    let query = supabase.from('folders').select('*').order(column, { ascending });

    if (Number.isFinite(limit)) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (data || []).map(mapFolderRowToEntity);
  },
  filter: async (criteria = {}, orderBy, limit) => {
    const { column, ascending } = toSupabaseOrder(orderBy);
    let query = supabase.from('folders').select('*');

    for (const [key, value] of Object.entries(criteria)) {
      if (key === 'created_by_id' || key === 'user_id') {
        query = query.eq('user_id', value);
      } else {
        query = query.eq(key, value);
      }
    }

    query = query.order(column, { ascending });

    if (Number.isFinite(limit)) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (data || []).map(mapFolderRowToEntity);
  },
  get: async (id) => {
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return mapFolderRowToEntity(data);
  },
  create: async (payload = {}) => {
    const userId = payload.created_by_id || payload.user_id || await getCurrentAuthUserId();
    if (!userId) {
      throw new Error('Authenticated user is required to create a folder');
    }

    const folderRow = {
      user_id: userId,
      name: String(payload.name || '').trim(),
    };

    const { data, error } = await supabase
      .from('folders')
      .insert(folderRow)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return mapFolderRowToEntity(data);
  },
  update: async (id, payload = {}) => {
    const folderRow = stripUndefined({
      name: payload.name !== undefined ? String(payload.name || '').trim() : undefined,
    });

    const { data, error } = await supabase
      .from('folders')
      .update(folderRow)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return mapFolderRowToEntity(data);
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return { id };
  },
});

const mapFollowRowToEntity = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    created_by_id: row.user_id,
    following_id: row.following_user_id,
    following_username: row.following_username || '',
    created_at: row.created_at,
  };
};

const createFollowCollection = () => ({
  list: async (orderBy, limit) => {
    const { column, ascending } = toSupabaseOrder(orderBy);
    let query = supabase.from('follows').select('*').order(column, { ascending });

    if (Number.isFinite(limit)) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (data || []).map(mapFollowRowToEntity);
  },
  filter: async (criteria = {}, orderBy, limit) => {
    const { column, ascending } = toSupabaseOrder(orderBy);
    let query = supabase.from('follows').select('*');

    for (const [key, value] of Object.entries(criteria)) {
      if (key === 'created_by_id' || key === 'user_id') {
        query = query.eq('user_id', value);
      } else if (key === 'following_id' || key === 'following_user_id') {
        query = query.eq('following_user_id', value);
      } else {
        query = query.eq(key, value);
      }
    }

    query = query.order(column, { ascending });

    if (Number.isFinite(limit)) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (data || []).map(mapFollowRowToEntity);
  },
  get: async (id) => {
    const { data, error } = await supabase
      .from('follows')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return mapFollowRowToEntity(data);
  },
  create: async (payload = {}) => {
    const userId = payload.created_by_id || payload.user_id || await getCurrentAuthUserId();
    if (!userId) {
      throw new Error('Authenticated user is required to follow someone');
    }

    const followRow = {
      user_id: userId,
      following_user_id: payload.following_id || payload.following_user_id,
      following_username: String(payload.following_username || ''),
    };

    const { data, error } = await supabase
      .from('follows')
      .insert(followRow)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return mapFollowRowToEntity(data);
  },
  update: async (id, payload = {}) => {
    const followRow = stripUndefined({
      following_username: payload.following_username !== undefined ? String(payload.following_username || '') : undefined,
      following_user_id: payload.following_id !== undefined ? payload.following_id : payload.following_user_id,
    });

    const { data, error } = await supabase
      .from('follows')
      .update(followRow)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return mapFollowRowToEntity(data);
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return { id };
  },
});

const mapReviewRowToEntity = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    created_by_id: row.user_id,
    username: row.username || '',
    spotify_album_id: row.spotify_album_id || '',
    spotify_artist_id: row.spotify_artist_id || '',
    album_title: row.album_title || '',
    artist: row.artist || '',
    album_art_url: row.album_art_url || '',
    release_year: row.release_year || '',
    tracks: row.tracks || [],
    album_rating: row.album_rating ?? 0,
    use_manual_rating: row.use_manual_rating ?? false,
    manual_rating: row.manual_rating ?? 0,
    notes: row.notes || '',
    reactions: row.reactions || [],
    comments: row.comments || [],
    folder_id: row.folder_id || null,
    folder_name: row.folder_name || '',
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

const sanitizeReviewPayload = (payload = {}, userId) => stripUndefined({
  user_id: userId,
  username: payload.username !== undefined ? String(payload.username || '') : undefined,
  spotify_album_id: payload.spotify_album_id !== undefined ? String(payload.spotify_album_id || '') : undefined,
  spotify_artist_id: payload.spotify_artist_id !== undefined ? String(payload.spotify_artist_id || '') : undefined,
  album_title: payload.album_title !== undefined ? String(payload.album_title || '') : undefined,
  artist: payload.artist !== undefined ? String(payload.artist || '') : undefined,
  album_art_url: payload.album_art_url !== undefined ? String(payload.album_art_url || '') : undefined,
  release_year: payload.release_year !== undefined ? String(payload.release_year || '') : undefined,
  tracks: payload.tracks !== undefined ? payload.tracks : undefined,
  album_rating: payload.album_rating !== undefined ? payload.album_rating : undefined,
  use_manual_rating: payload.use_manual_rating !== undefined ? payload.use_manual_rating : undefined,
  manual_rating: payload.manual_rating !== undefined ? payload.manual_rating : undefined,
  notes: payload.notes !== undefined ? String(payload.notes || '') : undefined,
  reactions: payload.reactions !== undefined ? payload.reactions : undefined,
  comments: payload.comments !== undefined ? payload.comments : undefined,
  folder_id: payload.folder_id !== undefined ? payload.folder_id : undefined,
  folder_name: payload.folder_name !== undefined ? String(payload.folder_name || '') : undefined,
});

const createReviewCollection = () => ({
  list: async (orderBy, limit) => {
    const { column, ascending } = toSupabaseOrder(orderBy, 'updated_at');
    let query = supabase.from('reviews').select('*').order(column, { ascending });

    if (Number.isFinite(limit)) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (data || []).map(mapReviewRowToEntity);
  },
  filter: async (criteria = {}, orderBy, limit) => {
    const { column, ascending } = toSupabaseOrder(orderBy, 'updated_at');
    let query = supabase.from('reviews').select('*');

    for (const [key, value] of Object.entries(criteria)) {
      if (key === 'created_by_id' || key === 'user_id') {
        query = query.eq('user_id', value);
      } else {
        query = query.eq(key, value);
      }
    }

    query = query.order(column, { ascending });

    if (Number.isFinite(limit)) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (data || []).map(mapReviewRowToEntity);
  },
  get: async (id) => {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return mapReviewRowToEntity(data);
  },
  create: async (payload = {}) => {
    const userId = payload.created_by_id || payload.user_id || await getCurrentAuthUserId();
    if (!userId) {
      throw new Error('Authenticated user is required to create a review');
    }

    const reviewRow = sanitizeReviewPayload(payload, userId);
    const { data, error } = await supabase
      .from('reviews')
      .insert(reviewRow)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return mapReviewRowToEntity(data);
  },
  update: async (id, payload = {}) => {
    const reviewRow = sanitizeReviewPayload(payload, payload.created_by_id || payload.user_id);
    delete reviewRow.user_id;

    const { data, error } = await supabase
      .from('reviews')
      .update(reviewRow)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return mapReviewRowToEntity(data);
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return { id };
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
      await migrateLegacyStoreToSupabase(currentUser.id);
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
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error || !data?.user) {
      throw new Error(error?.message || 'Invalid email or password');
    }

    const existingUsers = getStoredUsers();
    const user = {
      id: data.user.id,
      email: data.user.email || normalizedEmail,
      username: data.user.user_metadata?.username || data.user.user_metadata?.user_name || '',
      full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.display_name || '',
      created_at: data.user.created_at || new Date().toISOString(),
    };

    const nextUsers = existingUsers.some((item) => item.id === user.id)
      ? existingUsers.map((item) => (item.id === user.id ? { ...item, ...user } : item))
      : [...existingUsers, user];

    setStoredUsers(nextUsers);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('track-by-track-session', user.id);
    }

    await migrateLegacyStoreToSupabase(user.id);

    return { ok: true, user };
  },
  loginWithProvider: async (_provider, _redirect) => {
    if (typeof window === 'undefined') {
      return;
    }

    const redirectTo = _redirect
      ? new URL(_redirect, window.location.origin).toString()
      : window.location.origin;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: _provider,
      options: { redirectTo },
    });

    if (error) {
      throw new Error(error.message || 'Provider login failed');
    }
  },
  register: async (payload) => {
    const normalizedEmail = String(payload.email || '').toLowerCase();

    if (!normalizedEmail || !payload.password) {
      throw new Error('Email and password are required');
    }

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: payload.password,
    });

    if (error || !data?.user) {
      throw new Error(error?.message || 'Registration failed');
    }

    const existingUsers = getStoredUsers();
    const user = {
      id: data.user.id,
      email: data.user.email || normalizedEmail,
      username: String(payload.username || '').trim(),
      created_at: data.user.created_at || new Date().toISOString(),
    };

    const nextUsers = existingUsers.some((item) => item.id === user.id)
      ? existingUsers.map((item) => (item.id === user.id ? { ...item, ...user } : item))
      : [...existingUsers, user];

    setStoredUsers(nextUsers);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('track-by-track-session', user.id);
    }

    await migrateLegacyStoreToSupabase(user.id);

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
      const albumId = encodeURIComponent(payload.albumId || '');
      let response = await fetch(`${getApiBaseUrl()}/api/spotify/albums/tracks?albumId=${albumId}`);

      // Compatibility fallback for environments still using the original dynamic route.
      if (response.status === 404) {
        response = await fetch(`${getApiBaseUrl()}/api/spotify/albums/${albumId}/tracks`);
      }

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
  Profile: createProfileCollection(),
  Review: createReviewCollection(),
  Follow: createFollowCollection(),
  Folder: createFolderCollection(),
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