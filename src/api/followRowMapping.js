export const mapFollowRowToEntity = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    created_by_id: row.created_by_id || row.user_id,
    following_id: row.following_id || row.following_user_id,
    following_username: row.following_username || "",
    created_at: row.created_at,
  };
};

export const matchesFollowCriteria = (row, criteria = {}) => {
  const entries = Object.entries(criteria);
  if (entries.length === 0) return true;

  return entries.every(([key, value]) => {
    if (key === "created_by_id" || key === "user_id") {
      return row.created_by_id === value;
    }
    if (key === "following_id" || key === "following_user_id") {
      return row.following_id === value;
    }
    return row[key] === value;
  });
};
