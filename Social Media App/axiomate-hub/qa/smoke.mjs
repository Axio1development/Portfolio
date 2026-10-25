import assert from "node:assert/strict";
const base = process.env.HUB_TEST_URL || "http://localhost:8787";
function client() {
  let cookie = "",
    csrf = "";
  return async (action, data, params = {}, expected = 200) => {
    const res = await fetch(
      base + "/api.php?" + new URLSearchParams({ action, ...params }),
      {
        method: data ? "POST" : "GET",
        headers: {
          cookie,
          ...(data
            ? { "Content-Type": "application/json", "X-CSRF-Token": csrf }
            : {}),
        },
        body: data ? JSON.stringify(data) : undefined,
      },
    );
    const set = res.headers.getSetCookie();
    if (set.length) cookie = set.at(-1).split(";")[0];
    const result = await res.json();
    assert.equal(res.status, expected, JSON.stringify(result));
    if (result.csrf) csrf = result.csrf;
    return result;
  };
}
const a = client(),
  b = client(),
  anon = client(),
  tag = Date.now().toString(36);
await anon("session");
await anon("feed", undefined, {}, 401);
await a("session");
await b("session");
const password = "Temporary-test-" + crypto.randomUUID();
await a("register", {
  name: "Test Shadow",
  username: "qa_" + tag,
  email: `qa_${tag}@example.com`,
  password,
});
const { user: alice } = await a("session");
assert.ok(alice.id);
await b("register", {
  name: "Test Hunter",
  username: "qb_" + tag,
  email: `qb_${tag}@example.com`,
  password,
});
await b("session");
await a("post", {
  body: "A shadow rises #AxiomateGames <script>alert(1)</script>",
});
const [post] = await a("feed");
assert.equal(post.user_id, alice.id);
await b("like", { id: post.id });
await b("bookmark", { id: post.id });
let [saved] = await b("feed", undefined, { view: "bookmarks" });
assert.equal(saved.id, post.id);
assert.equal(saved.likes, 1);
assert.equal(saved.bookmarked, 1);
await b("follow", { id: alice.id });
assert.equal(
  (await b("feed", undefined, { view: "following" }))[0].id,
  post.id,
);
await b("post", { body: "Arise together!", parent_id: post.id });
assert.equal((await a("feed", undefined, { parent: post.id })).length, 1);
await b("delete", { id: post.id });
assert.equal(
  (await a("feed"))[0].id,
  post.id,
  "Other members cannot delete posts",
);
await a("profile", { name: "Updated Shadow", bio: "Building worlds." });
assert.equal((await a("member")).name, "Updated Shadow");
assert.ok((await a("feed", undefined, { q: "#AxiomateGames" })).length);
await a("post", { body: "x".repeat(501) }, {}, 400);
await a("delete", { id: post.id });
assert.equal((await b("feed", undefined, { view: "bookmarks" })).length, 0);
await a("logout", {});
await a("feed", undefined, {}, 401);
await a("session");
await a("login", { login: "qa_" + tag, password });
await a("session");
assert.ok((await a("member")).id);
const rejected = await fetch(base + "/api.php?action=post", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: '{"body":"blocked"}',
});
assert.equal(rejected.status, 403);
console.log(
  "PASS: accounts, login, access control, posts, replies, likes, bookmarks, follows, profiles, search, validation, deletion, and CSRF.",
);
