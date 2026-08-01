import assert from "node:assert/strict";
import test from "node:test";
import { mapFollowRowToEntity, matchesFollowCriteria } from "../src/api/followRowMapping.js";

test("follow row mapping supports both schema variants", () => {
  const modern = mapFollowRowToEntity({
    id: "f1",
    created_by_id: "user-a",
    following_id: "user-b",
    following_username: "bob",
  });

  const legacy = mapFollowRowToEntity({
    id: "f2",
    user_id: "user-a",
    following_user_id: "user-c",
    following_username: "carol",
  });

  assert.equal(modern.created_by_id, "user-a");
  assert.equal(modern.following_id, "user-b");
  assert.equal(legacy.created_by_id, "user-a");
  assert.equal(legacy.following_id, "user-c");
});

test("follow criteria matching accepts legacy and modern filter keys", () => {
  const row = mapFollowRowToEntity({
    id: "f3",
    user_id: "user-a",
    following_user_id: "user-b",
    following_username: "bob",
  });

  assert.equal(matchesFollowCriteria(row, { created_by_id: "user-a" }), true);
  assert.equal(matchesFollowCriteria(row, { user_id: "user-a" }), true);
  assert.equal(matchesFollowCriteria(row, { following_id: "user-b" }), true);
  assert.equal(matchesFollowCriteria(row, { following_user_id: "user-b" }), true);
  assert.equal(matchesFollowCriteria(row, { following_username: "bob" }), true);
  assert.equal(matchesFollowCriteria(row, { following_id: "user-z" }), false);
});
